import type { BoardPlayer } from "../types";
import {
  coachTip,
  deriveSix,
  initials,
  overallFromPlayer,
  posShort,
  type SixAttr,
} from "../lib/cardStats";

const ATTR_ORDER: (keyof SixAttr)[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const ATTR_CN: Record<keyof SixAttr, string> = {
  PAC: "速度",
  SHO: "射門",
  PAS: "傳球",
  DRI: "盤帶",
  DEF: "防守",
  PHY: "身體",
};

/** 六維雷達（純 SVG） */
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
        <polygon
          key={s}
          points={poly(s)}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
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

/** FIFA 風格左卡 */
function FutCard({ p, six, ovr }: { p: BoardPlayer; six: SixAttr; ovr: number }) {
  const pos = posShort(p.posCN);
  const ini = initials(p.name);
  return (
    <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#1e3a8a] via-[#1d4ed8] to-[#0f172a] p-4 text-white shadow-xl shadow-blue-900/40">
      <div className="absolute right-3 top-3 rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
        FC27
      </div>
      <div className="text-[42px] font-black leading-none tracking-tight">{ovr}</div>
      <div className="text-[13px] font-extrabold tracking-widest opacity-90">{pos}</div>
      <div className="mt-3 flex justify-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-white/15 text-[28px] font-black tracking-tight ring-2 ring-white/25">
          {ini}
        </div>
      </div>
      <div className="mt-3 text-center text-[18px] font-black tracking-wide">{p.name.slice(0, 12).toUpperCase()}</div>
      <div className="text-center text-[10px] font-semibold tracking-widest text-white/50">
        {p.name.toUpperCase()}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/15 pt-3 text-[12px] font-bold">
        {ATTR_ORDER.map((k) => (
          <div key={k} className="flex justify-between">
            <span className="text-white/55">{k}</span>
            <span className="tabular">{six[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerCardModal({ player, onClose }: { player: BoardPlayer; onClose: () => void }) {
  const six = deriveSix(player);
  const ovr = overallFromPlayer(player);
  const tip = coachTip(player, six);
  const gpg = (player.goalsPerGame ?? player.goals / Math.max(1, player.games)).toFixed(2);
  const apg = (player.assistsPerGame ?? player.assists / Math.max(1, player.games)).toFixed(2);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-[920px] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0f1117] text-white shadow-2xl sm:rounded-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-[15px] font-black">
              {ovr}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="m-0 truncate text-[16px] font-extrabold">{player.name}</h3>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{posShort(player.posCN)}</span>
              </div>
              <p className="m-0 text-[11px] text-white/50">
                詳細賽季數據 · Season Detail · {player.games} 場
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

        {/* body */}
        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
            <FutCard p={player} six={six} ovr={ovr} />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                六維雷達 RADAR
              </div>
              <Radar six={six} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                能力條 STAT BARS
              </div>
              <div className="space-y-2.5">
                {ATTR_ORDER.map((k) => (
                  <StatBar key={k} label={k} cn={ATTR_CN[k]} value={six[k]} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">傳球成功率</div>
                  <div className="mt-1 text-[15px] font-extrabold">{player.passPct != null ? `${player.passPct}%` : "-"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">平均評分</div>
                  <div className="mt-1 text-[15px] font-extrabold">{Number(player.avgRating).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* bottom stats */}
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
            <span className="font-bold text-cyan-400">教練建議 COACH TIP → </span>
            {tip}
          </div>

          <p className="mt-2 text-center text-[9px] text-white/30">
            能力值由 Pro Clubs 賽季表現推算，僅供視覺參考（非官方 FUT 屬性）
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
