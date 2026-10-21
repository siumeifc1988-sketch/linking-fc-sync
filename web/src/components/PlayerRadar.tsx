import type { RadarProfile } from "../lib/radarAxes";
import { GK_RADAR_NOTE, radarPoint } from "../lib/radarAxes";

const CX = 200;
const CY = 168;
const R = 102;

const LABEL_FONT = '"Noto Sans TC", "Noto Sans CJK TC", "PingFang HK", "Microsoft JhengHei", sans-serif';

function poly(values: readonly (number | null)[]): string {
  return values
    .map((v, i) => {
      const [x, y] = radarPoint(i, v ?? 0, CX, CY, R);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ring(scale: number): string {
  return poly(Array.from({ length: 6 }, () => scale * 100));
}

const LABELS: { i: number; anchor: "middle" | "start" | "end"; x: number; y: number }[] = [
  { i: 0, anchor: "middle", x: 200, y: 28 },
  { i: 1, anchor: "start", x: 308, y: 96 },
  { i: 2, anchor: "start", x: 308, y: 236 },
  { i: 3, anchor: "middle", x: 200, y: 312 },
  { i: 4, anchor: "end", x: 92, y: 236 },
  { i: 5, anchor: "end", x: 92, y: 96 },
];

export function RadarChart({ profile }: { profile: RadarProfile }) {
  if (profile.isGk) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-[13px] leading-relaxed text-white/65">
        {GK_RADAR_NOTE}
      </div>
    );
  }

  const playerPct = profile.axes.map((a) => a.percentile);
  const teamPct = profile.axes.map((a) => a.teamPercentile);
  const showTeam = profile.sampleSize > 0 && teamPct.some((v) => v != null);
  const aria = profile.axes
    .map((a) => `${a.label} ${a.percentile == null ? "—" : `P${Math.round(a.percentile)}`}`)
    .join("，");

  const hasPlayer = playerPct.some((v) => v != null);
  const playerFill = profile.lowSample ? "rgba(213,220,236,0.55)" : "rgba(91,140,255,0.28)";
  const playerStroke = profile.lowSample ? "#d5dcec" : "#5b8cff";

  return (
    <div className="w-full max-w-[420px]">
      <svg viewBox="0 0 400 348" role="img" aria-label={`六軸雷達：${aria}`} className="mx-auto block h-auto w-full">
        <g fill="none" stroke="rgba(232,238,252,0.14)" strokeWidth="1">
          {[1, 0.75, 0.5, 0.25].map((s) => (
            <polygon key={s} points={ring(s)} />
          ))}
          {LABELS.map(({ i }) => {
            const [x, y] = radarPoint(i, 100, CX, CY, R);
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />;
          })}
        </g>
        {showTeam && (
          <polygon
            points={poly(teamPct)}
            fill="rgba(212,175,55,0.08)"
            stroke="#d4af37"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
        )}
        {hasPlayer && (
          <polygon
            points={poly(playerPct)}
            fill={playerFill}
            stroke={playerStroke}
            strokeWidth={profile.lowSample ? 3.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {profile.lowSample &&
          hasPlayer &&
          profile.axes.map((axis, i) => {
            const [x, y] = radarPoint(i, axis.percentile ?? 0, CX, CY, R);
            return <circle key={`${axis.id}-dot`} cx={x} cy={y} r="5" fill="#eef2fb" stroke="#9aa6bd" strokeWidth="1.5" />;
          })}
        {LABELS.map(({ i, anchor, x, y }) => {
          const axis = profile.axes[i];
          if (!axis) return null;
          return (
            <g key={axis.id} fontFamily={LABEL_FONT}>
              <text x={x} y={y} textAnchor={anchor} fill="#e8eefc" fontSize="13" fontWeight="700">
                {axis.label}
              </text>
              <text x={x} y={y + 14} textAnchor={anchor} fill="rgba(232,238,252,0.55)" fontSize="10" fontWeight="500">
                {axis.sub}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1.5">
          <i
            className="inline-block h-[3px] w-4 rounded-sm"
            style={{ background: profile.lowSample ? "#d5dcec" : "#5b8cff" }}
          />
          球員（隊內百分位）
        </span>
        {showTeam && (
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-0 w-4 border-t-2 border-dashed border-[#d4af37]" />
            隊平均
          </span>
        )}
      </div>
      <p className="mb-0 mt-2 text-center text-[11px] leading-relaxed text-white/45">
        刻度是本隊百分位（外框＝100），不是 40–99 能力值。樣本是出場滿 5 場的外場球員（{profile.sampleSize} 人）。
        {profile.lowSample ? " 這名球員未滿 5 場，形狀以灰色顯示，不計入樣本。" : ""}
        {profile.thinMinutes ? " 上場時間不足 90 分鐘，計數軸改用每場次數。" : ""}
      </p>
    </div>
  );
}

export function RadarBars({ profile }: { profile: RadarProfile }) {
  if (profile.isGk) {
    return <p className="mb-3 text-[13px] leading-relaxed text-white/60">{GK_RADAR_NOTE}</p>;
  }
  return (
    <div className="space-y-3">
      {profile.axes.map((a) => {
        const pct = a.percentile;
        return (
          <div key={a.id} className="flex items-center gap-2">
            <div className="w-[4.6rem] shrink-0 leading-tight">
              <div className="text-[13px] font-extrabold text-white/90">{a.label}</div>
              <div className="text-[9px] font-semibold text-white/40">{a.sub}</div>
            </div>
            <span className="tabular w-[3.4rem] shrink-0 text-right text-[11px] font-bold text-white/75">
              {a.rawLabel}
            </span>
            <div className="h-[9px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct == null ? 0 : Math.max(0, Math.min(100, pct))}%`,
                  background: profile.lowSample ? "#d5dcec" : "#5b8cff",
                }}
              />
            </div>
            <span className="tabular w-7 shrink-0 text-right text-[15px] font-black text-white">
              {pct == null ? "—" : Math.round(pct)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
