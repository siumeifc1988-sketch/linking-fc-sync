import type { BoardPlayer } from "../types";
import { coachTip, deriveSix, overallFromPlayer, posShort, type SixAttr } from "../lib/cardStats";
import { CARD_DISCLAIMER, PlayerCardFace } from "./PlayerCardFace";

const ATTR_ORDER: (keyof SixAttr)[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const ATTR_CN: Record<keyof SixAttr, string> = {
  PAC: "活動",
  SHO: "射門",
  PAS: "傳球",
  DRI: "盤帶",
  DEF: "防守",
  PHY: "體能",
};

function Radar({ six }: { six: SixAttr }) {
  const cx = 100;
  const cy = 100;
  const r = 72;
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

  const labels = ATTR_ORDER.map((k, i) => {
    const a = angle(i);
    const lx = cx + Math.cos(a) * (r + 16);
    const ly = cy + Math.sin(a) * (r + 16);
    return (
      <text
        key={k}
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white/70"
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        {k}
      </text>
    );
  });

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-44 w-44 sm:h-52 sm:w-52">
      {[0.33, 0.66, 1].map((s) => (
        <polygon key={s} points={poly(s)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
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
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />
        );
      })}
      <polygon points={data} fill="rgba(34,211,238,0.35)" stroke="#22d3ee" strokeWidth="2" />
      {labels}
    </svg>
  );
}

function StatBar({ label, cn, value }: { label: string; cn: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-[11px] font-bold text-white/50">{label}</span>
      <span className="w-8 text-[11px] font-semibold text-white/80">{cn}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="tabular w-7 text-right text-[13px] font-extrabold text-white">{value}</span>
    </div>
  );
}

export function PlayerCardModal({
  player,
  onClose,
  portraitSrc,
  imageUrl,
}: {
  player: BoardPlayer;
  onClose: () => void;
  portraitSrc?: string | null;
  imageUrl?: string | null;
}) {
  const six = deriveSix(player);
  const ovr = overallFromPlayer(player);
  const tip = coachTip(player, six);
  const g = Math.max(1, player.games);
  const gpg = (player.goalsPerGame ?? player.goals / g).toFixed(2);
  const apg = (player.assistsPerGame ?? player.assists / g).toFixed(2);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-[920px] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0f1117] text-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-pl-magenta to-pl-violet text-[15px] font-black">
              {ovr}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 truncate text-[16px] font-extrabold">{player.name}</h3>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{posShort(player.posCN)}</span>
              </div>
              <p className="m-0 text-[11px] text-white/50">
                賽季實戰推算 · {player.games} 場 · 均分 {Number(player.avgRating).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid items-center gap-4 lg:grid-cols-[240px_1fr_1fr]">
            <PlayerCardFace
              name={player.name}
              overall={ovr}
              position={posShort(player.posCN)}
              stats={six}
              portraitSrc={portraitSrc}
              imageUrl={imageUrl}
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                六維雷達 RADAR
              </div>
              <Radar six={six} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                能力條（實戰推算）
              </div>
              <div className="space-y-2.5">
                {ATTR_ORDER.map((k) => (
                  <StatBar key={k} label={k} cn={ATTR_CN[k]} value={six[k]} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">傳球成功率</div>
                  <div className="mt-1 text-[15px] font-extrabold">
                    {player.passPct != null ? `${player.passPct}%` : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">平均評分</div>
                  <div className="mt-1 text-[15px] font-extrabold">{Number(player.avgRating).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Goals</div>
              <div className="mt-1 tabular text-[22px] font-black">{player.goals}</div>
              <div className="text-[10px] text-white/45">{gpg}/場</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Assists</div>
              <div className="mt-1 tabular text-[22px] font-black">{player.assists}</div>
              <div className="text-[10px] text-white/45">{apg}/場</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/80">G+A</div>
              <div className="mt-1 tabular text-[22px] font-black text-emerald-400">{player.gA}</div>
              <div className="text-[10px] text-emerald-400/70">{player.games} 場</div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[12px] leading-relaxed text-cyan-300/90">
            <span className="font-bold text-cyan-400">教練建議 → </span>
            {tip}
          </div>

          <p className="mt-2 text-center text-[9px] leading-relaxed text-white/30">
            <span className="mb-0.5 block font-semibold tracking-wide text-white/45">{CARD_DISCLAIMER}</span>
            PAC=每90分鐘動作量 · SHO=場均進球+射正 · PAS=傳球%+直塞/助攻 · DRI=場均盤帶 · DEF=防守動作+搶截成功率 ·
            PHY=場均分鐘+頭錘 · 總評=均分55%+六維45%
          </p>
        </div>

        <div
          className="flex gap-2 border-t border-white/10 bg-[#0c0e13] px-4 py-3 sm:px-5"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-full bg-white text-[14px] font-extrabold text-ink"
          >
            關閉 CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
