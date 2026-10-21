import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardPlayer, ShapedMatch } from "../types";
import {
  coachTip,
  deriveSix,
  nameTag,
  overallFromPlayer,
  passAccuracyLabel,
  passStyleLabel,
  playerImpact,
  posShort,
  type SixAttr,
} from "../lib/cardStats";
import { cardFaceFromPlayer, PlayerCardFace } from "./PlayerCardFace";

const ATTR_ORDER: (keyof SixAttr)[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const ATTR_CN: Record<keyof SixAttr, string> = {
  PAC: "速度",
  SHO: "射門",
  PAS: "傳球",
  DRI: "盤帶",
  DEF: "防守",
  PHY: "身體",
};

function Radar({ six }: { six: SixAttr }) {
  const cx = 110;
  const cy = 110;
  const r = 68;
  const n = 6;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const poly = (scale: number) =>
    ATTR_ORDER.map((_, i) => {
      const a = angle(i);
      return `${cx + Math.cos(a) * r * scale},${cy + Math.sin(a) * r * scale}`;
    }).join(" ");

  const data = ATTR_ORDER.map((k, i) => {
    const a = angle(i);
    const v = six[k] / 99;
    return `${cx + Math.cos(a) * r * v},${cy + Math.sin(a) * r * v}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-auto w-full max-w-[280px]" role="img" aria-label="六維雷達">
      <defs>
        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#radarGlow)" />
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={poly(s)}
          fill={s === 1 ? "rgba(255,255,255,0.02)" : "none"}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1"
        />
      ))}
      {ATTR_ORDER.map((_, i) => {
        const a = angle(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />
        );
      })}
      <polygon points={data} fill="rgba(45,212,191,0.38)" stroke="#2dd4bf" strokeWidth="2.25" />
      {ATTR_ORDER.map((k, i) => {
        const a = angle(i);
        const v = six[k] / 99;
        return (
          <circle
            key={`${k}-dot`}
            cx={cx + Math.cos(a) * r * v}
            cy={cy + Math.sin(a) * r * v}
            r="2.6"
            fill="#ccfbf1"
            stroke="#2dd4bf"
            strokeWidth="1"
          />
        );
      })}
      {ATTR_ORDER.map((k, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (r + 18);
        const ly = cy + Math.sin(a) * (r + 18);
        return (
          <text
            key={k}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.78)"
            style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}
          >
            {k}
          </text>
        );
      })}
    </svg>
  );
}

function StatBar({ label, cn, value }: { label: string; cn: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] font-extrabold tracking-wide text-white/45">{label}</span>
      <span className="w-8 shrink-0 text-[12px] font-bold text-white/90">{cn}</span>
      <div className="h-[9px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-500"
          style={{ width: `${Math.max(6, Math.min(100, value))}%` }}
        />
      </div>
      <span className="tabular w-7 shrink-0 text-right text-[15px] font-black text-white">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "win";
}) {
  const win = tone === "win";
  return (
    <div
      className={`rounded-2xl px-2 py-3 text-center ${
        win
          ? "border border-emerald-400/35 bg-emerald-500/10"
          : "border border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className={`text-[10px] font-extrabold tracking-[0.14em] ${win ? "text-emerald-300/80" : "text-white/40"}`}>
        {label}
      </div>
      <div className={`tabular mt-1 text-[26px] font-black leading-none ${win ? "text-emerald-300" : "text-white"}`}>
        {value}
      </div>
      <div className={`mt-1 text-[11px] font-semibold ${win ? "text-emerald-300/75" : "text-white/45"}`}>{sub}</div>
    </div>
  );
}

function RealTotals({
  goals,
  gpg,
  assists,
  apg,
  winPct,
  mom,
  appearances,
}: {
  goals: number;
  gpg: string;
  assists: number;
  apg: string;
  winPct: number | null;
  mom: number;
  appearances: number;
}) {
  return (
    <>
      <MiniStat label="GOALS" value={String(goals)} sub={`${gpg}/場`} />
      <MiniStat label="ASSISTS" value={String(assists)} sub={`${apg}/場`} />
      <MiniStat
        label="WIN%"
        tone="win"
        value={winPct == null ? "—" : `${winPct}%`}
        sub={appearances ? `${mom} MOM` : "無出場樣本"}
      />
    </>
  );
}

function ActionButtons({
  onClose,
  onCopy,
  copied,
}: {
  onClose: () => void;
  onCopy: () => void;
  copied: "idle" | "ok" | "fail";
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="h-12 min-h-12 flex-1 rounded-full bg-white text-[14px] font-extrabold tracking-wide text-ink"
      >
        關閉 CLOSE
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="h-12 min-h-12 rounded-full border border-white/15 bg-white/[0.04] px-4 text-[13px] font-extrabold tracking-wide text-white/85 sm:min-w-[148px] sm:shrink-0"
      >
        {copied === "ok" ? "已複製 COPIED" : copied === "fail" ? "複製失敗" : "複製數據 COPY"}
      </button>
    </>
  );
}

function copyPayload(p: BoardPlayer, six: SixAttr, ovr: number, impact: ReturnType<typeof playerImpact>): string {
  const g = Math.max(1, p.games);
  const gpg = (p.goalsPerGame ?? p.goals / g).toFixed(2);
  const apg = (p.assistsPerGame ?? p.assists / g).toFixed(2);
  const style = passStyleLabel(p);
  const win =
    impact.winPct == null
      ? "勝率 —"
      : `勝率 ${impact.winPct}%（${impact.wins}勝 ${impact.draws}和 ${impact.losses}負）`;
  const axes = ATTR_ORDER.map((k) => `${k} ${ATTR_CN[k]} ${six[k]}`).join(" · ");
  return [
    `${p.name} · ${posShort(p.posCN)} · ${p.games} 場 · 均分 ${Number(p.avgRating).toFixed(2)}`,
    `進球 ${p.goals}（${gpg}/場） · 助攻 ${p.assists}（${apg}/場） · G+A ${p.gA}`,
    `傳球 ${passAccuracyLabel(p)}${style ? ` · ${style}` : ""}`,
    `${win} · 全場最佳 ${impact.appearances ? impact.mom : "—"}`,
    `實戰推算 · 非官方屬性 · 總評 ${ovr}`,
    axes,
    `教練建議：${coachTip(p, six)}`,
  ].join("\n");
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function PlayerCardModal({
  player,
  matches,
  onClose,
}: {
  player: BoardPlayer;
  matches?: ShapedMatch[];
  onClose: () => void;
}) {
  const six = deriveSix(player);
  const ovr = overallFromPlayer(player);
  const tip = coachTip(player, six);
  const impact = useMemo(() => playerImpact(player.name, matches), [player.name, matches]);
  const g = Math.max(1, player.games);
  const gpg = (player.goalsPerGame ?? player.goals / g).toFixed(2);
  const apg = (player.assistsPerGame ?? player.assists / g).toFixed(2);
  const passLabel = passAccuracyLabel(player);
  const passStyle = passStyleLabel(player);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (copied === "idle") return;
    const t = window.setTimeout(() => setCopied("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = async () => {
    const ok = await writeClipboard(copyPayload(player, six, ovr, impact));
    setCopied(ok ? "ok" : "fail");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-card-title"
        className="relative flex max-h-[94dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-[24px] border border-white/10 bg-[#10131a] text-white shadow-2xl sm:rounded-[24px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-gradient-to-b from-card-gold to-card-gold-deep text-[20px] font-black leading-none text-card-ink shadow-gold-badge">
              {ovr}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 id="player-card-title" className="m-0 truncate text-[18px] font-extrabold tracking-tight">
                  {player.name}
                </h3>
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-extrabold">
                  {posShort(player.posCN)}
                </span>
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide">
                  {nameTag(player.name)}
                </span>
              </div>
              <p className="m-0 mt-0.5 text-[12px] text-white/55">
                詳細賽季數據 · Season Detail · {player.games} 場 · 均分 {Number(player.avgRating).toFixed(2)}
              </p>
              <p className="m-0 text-[11px] font-semibold text-white/35">實戰推算 · 非官方屬性</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-[16px] text-white/70"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-auto overflow-y-auto px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-[268px_minmax(0,1fr)_minmax(0,1.02fr)]">
            <div className="mx-auto w-full max-w-[268px] md:col-span-2 lg:col-span-1 lg:mx-0 lg:max-w-none">
              <PlayerCardFace {...cardFaceFromPlayer(player)} />
            </div>

            <div className="flex flex-col rounded-[18px] border border-white/[0.06] bg-[#171b24] px-3 py-3 sm:px-4">
              <div className="text-center text-[12px] font-bold tracking-wide text-white/45">
                六維雷達 <span className="tracking-[0.12em]">RADAR</span>
              </div>
              <div className="flex flex-1 items-center justify-center py-1">
                <Radar six={six} />
              </div>
            </div>

            <div className="flex flex-col rounded-[18px] border border-white/[0.06] bg-[#171b24] px-3 py-3 sm:px-4">
              <div className="mb-3 text-[12px] font-bold tracking-wide text-white/45">
                能力條 <span className="tracking-[0.12em]">STAT BARS</span>
              </div>
              <div className="space-y-3">
                {ATTR_ORDER.map((k) => (
                  <StatBar key={k} label={k} cn={ATTR_CN[k]} value={six[k]} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] font-bold text-white/40">傳球成功率</div>
                  <div className="mt-1 text-[15px] font-extrabold leading-snug">
                    {passLabel}
                    {passStyle ? <span className="text-[13px] font-bold"> · {passStyle}</span> : null}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] font-bold text-white/40">比賽影響</div>
                  <div className="mt-1 text-[15px] font-extrabold leading-snug">
                    {impact.appearances ? `${impact.mom} 次全場最佳` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/[0.08] px-3.5 py-2.5 text-[13px] leading-relaxed text-emerald-300">
            <span className="font-extrabold text-emerald-300">教練建議 COACH TIP → </span>
            {tip}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 lg:hidden">
            <RealTotals
              goals={player.goals}
              gpg={gpg}
              assists={player.assists}
              apg={apg}
              winPct={impact.winPct}
              mom={impact.mom}
              appearances={impact.appearances}
            />
          </div>

          <div className="mt-3 hidden items-stretch gap-3 lg:flex">
            <div className="grid w-[360px] shrink-0 grid-cols-3 gap-2">
              <RealTotals
                goals={player.goals}
                gpg={gpg}
                assists={player.assists}
                apg={apg}
                winPct={impact.winPct}
                mom={impact.mom}
                appearances={impact.appearances}
              />
            </div>
            <div className="flex min-w-0 flex-1 items-stretch gap-2">
              <ActionButtons onClose={onClose} onCopy={onCopy} copied={copied} />
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 gap-2 border-t border-white/10 bg-[#0e1118] px-4 py-3 lg:hidden"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <ActionButtons onClose={onClose} onCopy={onCopy} copied={copied} />
        </div>
      </div>
    </div>
  );
}
