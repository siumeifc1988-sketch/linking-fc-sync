import { useId } from "react";
import type { SixAttr } from "../../lib/cardStats";
import hkFlag from "../../assets/cards/hk-flag.png";
import hkpl from "../../assets/cards/hkpl.png";
import crest from "../../assets/cards/linking-fc-crest.png";
import "./goldRareCard.css";

const EDGE = "M18 1 H282 Q299 1 299 19 V394 L150 449 L1 394 V19 Q1 1 18 1 Z";
const DIAGONAL_CUT = "M0 0 H300 V295 L0 360 Z";
const PILL_ORDER: (keyof SixAttr)[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];

export type GoldRareCardProps = {
  name: string;
  overall: number;
  position: string;
  stats: SixAttr;
  className?: string;
};

/**
 * Gold Rare face. Layers follow the left card in linking-from-ref:
 * stroke, sheen, corner, clipped field, then the frosted footer.
 * Colors, radius, and type come from the Tailwind 4 theme (PLAYER_CARD.md).
 */
export function GoldRareCard({ name, overall, position, stats, className }: GoldRareCardProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `goldGrad-${uid}`;
  const noiseId = `noiseGold-${uid}`;
  const cutId = `diagCutGold-${uid}`;

  return (
    <div
      data-testid="player-card-face"
      data-card="gold-rare"
      className={`lk-gold relative aspect-[300/450] w-full select-none overflow-hidden rounded-card font-display text-white ${className || ""}`}
    >
      <GoldEdge gradId={gradId} noiseId={noiseId} cutId={cutId} />
      <div className="lk-gold-sheen pointer-events-none absolute inset-px rounded-[17px]" />
      <CardTop overall={overall} position={position} />
      <Silhouette cutId={cutId} />
      <CardFoot name={name} overall={overall} position={position} stats={stats} />
    </div>
  );
}

function GoldEdge({ gradId, noiseId, cutId }: { gradId: string; noiseId: string; cutId: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      viewBox="0 0 300 450"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-card-gold)" />
          <stop offset="25%" stopColor="var(--color-card-gold-light)" />
          <stop offset="50%" stopColor="var(--color-card-gold-deep)" />
          <stop offset="75%" stopColor="var(--color-card-gold-light)" />
          <stop offset="100%" stopColor="var(--color-card-gold)" />
        </linearGradient>
        <pattern id={noiseId} width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.6" fill="white" opacity="0.05" />
          <circle cx="60" cy="40" r="0.5" fill="white" opacity="0.04" />
          <circle cx="90" cy="90" r="0.7" fill="white" opacity="0.03" />
        </pattern>
        <clipPath id={cutId}>
          <path d={DIAGONAL_CUT} />
        </clipPath>
      </defs>
      <rect width="300" height="450" fill={`url(#${noiseId})`} opacity="0.8" />
      <path d={EDGE} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.6" strokeLinejoin="round" opacity="0.95" />
      <path d={EDGE} fill="none" stroke="white" strokeWidth="0.4" opacity="0.15" />
    </svg>
  );
}

function CardTop({ overall, position }: { overall: number; position: string }) {
  return (
    <div className="relative z-20 flex items-start justify-between p-[18px]">
      <div className="flex flex-col items-center">
        <div className="flex h-[68px] w-[56px] flex-col items-center justify-center rounded-[10px] bg-gradient-to-b from-card-gold to-card-gold-deep text-card-ink shadow-gold-badge">
          <span className="text-[24px] font-black leading-none">{overall}</span>
          <span className="mt-[2px] text-[11px] font-bold tracking-[0.2em]">{position}</span>
        </div>
        <div className="mt-2 text-[8px] font-bold tracking-[0.3em] text-card-gold/60">RARE · GOLD</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] font-bold tracking-[0.4em] text-white/30">FC26 EDITION</div>
        <div className="lk-gold-rule ml-auto mt-1 h-px w-8" />
      </div>
    </div>
  );
}

function Silhouette({ cutId }: { cutId: string }) {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 h-[81%] w-full"
      style={{ clipPath: `url(#${cutId})` }}
    >
      <div className="lk-gold-field absolute inset-0" />
      <div className="lk-gold-arch absolute bottom-0 left-1/2 h-[82%] w-[73%] -translate-x-1/2 rounded-t-[120px]" />
      <div className="absolute bottom-[4%] left-1/2 flex w-[66%] -translate-x-1/2 flex-col items-center">
        <div className="lk-gold-head aspect-square w-[60%] rounded-full border border-white/10" />
        <div className="lk-gold-shoulders -mt-[12%] h-[34cqw] w-[88%] rounded-t-[60px]" />
        <img src={crest} alt="" className="absolute top-[18%] w-[42%] opacity-20" />
      </div>
      <div className="lk-gold-hatch absolute inset-0" />
    </div>
  );
}

function CardFoot({
  name,
  overall,
  position,
  stats,
}: {
  name: string;
  overall: number;
  position: string;
  stats: SixAttr;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 px-[18px] pt-0 pb-[26px]">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-[0.35em] text-card-gold">LINKING</div>
          <div className="mt-1 truncate text-[clamp(16px,7.4cqw,28px)] font-black leading-[0.9] tracking-[-0.02em]">
            {name}
          </div>
        </div>
        <div className="shrink-0 pb-0.5 font-mono text-[10px] text-white/40">
          ID · {position}
          {overall}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-[6px]">
        {PILL_ORDER.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-card-pill border border-white/8 bg-white/6 px-2 py-1.5 backdrop-blur-sm"
          >
            <span className="text-[9px] font-bold tracking-[0.15em] text-white/50">{key}</span>
            <span className="text-[13px] font-black">{stats[key]}</span>
          </div>
        ))}
      </div>
      <ClubMarks />
    </div>
  );
}

function ClubMarks() {
  return (
    <div className="mt-2.5 flex items-center gap-2.5">
      <img src={hkFlag} alt="" className="h-4 w-6 rounded-none object-cover" />
      <img src={hkpl} alt="" className="h-5 w-auto rounded-none object-contain" />
      <img src={crest} alt="" className="h-5 w-5 rounded-none object-contain" />
    </div>
  );
}
