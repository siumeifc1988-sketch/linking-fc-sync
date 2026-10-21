import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardPlayer, ShapedMatch } from "../types";
import {
  cardNameLines,
  coachTip,
  deriveSix,
  initials,
  nameTag,
  overallFromPlayer,
  passAccuracyLabel,
  passStyleLabel,
  playerImpact,
  posShort,
} from "../lib/cardStats";
import { GK_RADAR_NOTE, buildRadarProfile, type RadarProfile } from "../lib/radarAxes";
import { RadarBars, RadarChart } from "./PlayerRadar";

function FutCard({ p, profile, ovr }: { p: BoardPlayer; profile: RadarProfile; ovr: number }) {
  const pos = posShort(p.posCN);
  const ini = initials(p.name);
  const lines = cardNameLines(p.name);
  const bigClass = lines.big.length > 9 ? "text-[15px]" : lines.big.length > 6 ? "text-[18px]" : "text-[22px]";
  return (
    <div className="relative mx-auto flex h-full w-full max-w-[248px] flex-col overflow-hidden rounded-[22px] bg-gradient-to-b from-[#4d74ff] via-[#2c4de0] to-[#17256f] p-4 text-white shadow-[0_18px_40px_rgba(28,52,170,0.45)] lg:max-w-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(255,255,255,0.28),transparent_52%)]" />
      <div className="absolute right-3 top-3 rounded-md bg-[#101a4d]/75 px-1.5 py-0.5 text-[9px] font-black tracking-wide">
        推算
      </div>
      <div
        className="absolute right-3 top-[38px] grid h-7 w-7 place-items-center rounded-full bg-[#3d63ff] text-white shadow-md ring-2 ring-white/80"
        aria-hidden
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M10 1.7 12.2 6.4l5.1.6-3.8 3.5.9 5.1L10 13.1 5.6 15.6l.9-5.1L2.7 7l5.1-.6L10 1.7z" />
        </svg>
      </div>
      <div
        className="relative text-[52px] font-black leading-none tracking-tight"
        title="總評＝賽季均分 55% ＋ 推算六維平均 45%。卡片總評，不是雷達的隊內百分位。"
      >
        {ovr}
      </div>
      <div className="relative text-[13px] font-extrabold tracking-[0.22em]">{pos}</div>
      <div className="relative mt-3 flex justify-center">
        <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white/15 text-[30px] font-black tracking-tight shadow-[inset_0_0_0_6px_rgba(255,255,255,0.08)] ring-2 ring-white/30">
          {ini}
        </div>
      </div>
      <div className={`relative mt-3 text-center font-black tracking-wide ${bigClass}`}>{lines.big}</div>
      <div className="relative text-center text-[10px] font-semibold tracking-[0.16em] text-white/60">
        {lines.small || p.posCN || "PRO CLUBS"}
      </div>
      {profile.isGk ? (
        <p className="relative mb-0 mt-auto border-t border-white/20 pt-3 text-center text-[12px] font-bold leading-relaxed text-white/80">
          {GK_RADAR_NOTE}
        </p>
      ) : (
        <>
          <div className="relative mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/20 pt-3 text-[13px] font-bold">
            {profile.axes.map((a) => (
              <div key={a.id} className="flex items-baseline justify-between gap-1">
                <span className="text-[11px] font-extrabold tracking-wide text-white/70">{a.label}</span>
                <span className="tabular text-[13px] font-black">{a.rawLabel}</span>
              </div>
            ))}
          </div>
          <p className="relative mb-0 mt-2 text-center text-[9px] font-semibold tracking-wide text-white/55">
            真實率 · 雷達係隊內百分位
          </p>
        </>
      )}
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

function copyPayload(
  p: BoardPlayer,
  profile: RadarProfile,
  ovr: number,
  impact: ReturnType<typeof playerImpact>,
): string {
  const g = Math.max(1, p.games);
  const gpg = (p.goalsPerGame ?? p.goals / g).toFixed(2);
  const apg = (p.assistsPerGame ?? p.assists / g).toFixed(2);
  const style = passStyleLabel(p);
  const win =
    impact.winPct == null
      ? "勝率 —"
      : `勝率 ${impact.winPct}%（${impact.wins}勝 ${impact.draws}和 ${impact.losses}負）`;
  const axes = profile.isGk
    ? GK_RADAR_NOTE
    : profile.axes
        .map((a) => {
          const pct = a.percentile == null ? "—" : `P${Math.round(a.percentile)}`;
          return `${a.label} ${a.sub} ${a.rawLabel}（${pct}）`;
        })
        .join("\n");
  return [
    `${p.name} · ${posShort(p.posCN)} · ${p.games} 場 · 均分 ${Number(p.avgRating).toFixed(2)}`,
    `進球 ${p.goals}（${gpg}/場） · 助攻 ${p.assists}（${apg}/場） · G+A ${p.gA}`,
    `傳球 ${passAccuracyLabel(p)}${style ? ` · ${style}` : ""}`,
    `${win} · 全場最佳 ${impact.appearances ? impact.mom : "—"}`,
    `卡片總評 ${ovr} · 雷達＝隊內百分位 · 非 FUT`,
    profile.isGk ? "" : `樣本 ${profile.sampleSize} 人（滿 5 場外場）${profile.lowSample ? " · 此球員未滿 5 場" : ""}`,
    axes,
    `教練建議：${coachTip(p, deriveSix(p))}`,
  ]
    .filter(Boolean)
    .join("\n");
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
  squad,
  clubMatches,
  matches,
  onClose,
}: {
  player: BoardPlayer;
  squad: BoardPlayer[];
  clubMatches?: number;
  matches?: ShapedMatch[];
  onClose: () => void;
}) {
  const profile = useMemo(
    () => buildRadarProfile(player, squad, clubMatches),
    [player, squad, clubMatches],
  );
  const ovr = overallFromPlayer(player);
  const tip = coachTip(player, deriveSix(player));
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
    const ok = await writeClipboard(copyPayload(player, profile, ovr, impact));
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
            <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] bg-[#2f62ff] text-[20px] font-black leading-none shadow-[0_8px_22px_rgba(47,98,255,0.4)]">
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
              <p className="m-0 text-[11px] font-semibold text-white/35">雷達用真實率的隊內百分位，不是 FUT 六維</p>
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
          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-[236px_minmax(0,1fr)_minmax(0,1.08fr)]">
            <div className="order-2 md:order-none md:col-span-2 lg:col-span-1">
              <FutCard p={player} profile={profile} ovr={ovr} />
            </div>

            <div className="order-1 flex flex-col rounded-[18px] border border-white/[0.06] bg-[#121826] px-2 py-3 sm:px-3 md:order-none">
              <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
                <div className="text-[12px] font-bold tracking-wide text-white/70">真實率雷達</div>
                <div className="text-[11px] font-semibold text-white/40">
                  {posShort(player.posCN)} · 隊內百分位
                  {profile.lowSample ? " · 未滿5場" : ""}
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center py-1">
                <RadarChart profile={profile} />
              </div>
            </div>

            <div className="order-3 flex flex-col rounded-[18px] border border-white/[0.06] bg-[#171b24] px-3 py-3 sm:px-4 md:order-none">
              <div className="mb-1 text-[12px] font-bold tracking-wide text-white/45">
                {profile.isGk ? "門將" : "六項百分位"}
              </div>
              {!profile.isGk && (
                <p className="mb-3 mt-0 text-[10px] leading-snug text-white/35">
                  右方數字同條長係隊內百分位，左邊係真實率。
                </p>
              )}
              <RadarBars profile={profile} />
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
