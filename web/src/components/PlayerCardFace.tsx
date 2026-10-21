import { useId } from "react";
import type { BoardPlayer } from "../types";
import { deriveSix, initials, overallFromPlayer, posShort, type SixAttr } from "../lib/cardStats";
import hkFlag from "../assets/cards/hk-flag.png";
import hkpl from "../assets/cards/hkpl.png";
import crest from "../assets/cards/linking-fc-crest.png";

export const CARD_DISCLAIMER = "實戰推算 · 非官方屬性";

/** Gold Rare is the live face. Kept so older call sites can still pass a rarity. */
export type CardRarity = "common" | "rare" | "highlight";

const PILL_ORDER: (keyof SixAttr)[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];

const GOLD_EDGE =
  "M18 1 H282 Q299 1 299 19 V394 L150 449 L1 394 V19 Q1 1 18 1 Z";

export type PlayerCardFaceProps = {
  name: string;
  overall: number;
  position: string;
  stats: SixAttr;
  portraitSrc?: string | null;
  imageUrl?: string | null;
  monogram?: string;
  rarity?: CardRarity;
  className?: string;
};

export function cardFaceFromPlayer(
  player: BoardPlayer,
  overrides?: Partial<PlayerCardFaceProps>,
): PlayerCardFaceProps {
  return {
    name: player.name,
    overall: overallFromPlayer(player),
    position: posShort(player.posCN),
    stats: deriveSix(player),
    monogram: initials(player.name),
    rarity: "rare",
    ...overrides,
  };
}

/**
 * Gold Rare face. Structure follows the left card in linking-from-ref:
 * navy base, gold SVG stroke with a pointed bottom, OVR corner, geometric
 * middle, name, and frosted stat pills. No portrait.
 */
export function PlayerCardFace({
  name,
  overall,
  position,
  stats,
  className,
}: PlayerCardFaceProps) {
  const uid = useId().replace(/:/g, "");
  const grad = `goldGrad-${uid}`;
  const noise = `noiseGold-${uid}`;

  return (
    <div
      data-testid="player-card-face"
      className={`relative aspect-[300/450] w-full select-none overflow-hidden rounded-[18px] ${className || ""}`}
      style={{
        background: "linear-gradient(180deg, #0B1120 0%, #1E293B 100%)",
        boxShadow:
          "0 2px 0 rgba(255,215,0,0.15) inset, 0 -1px 0 rgba(255,215,0,0.2) inset, 0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,215,0,0.22)",
        fontFamily: '"Space Grotesk", "Plus Jakarta Sans", sans-serif',
        containerType: "inline-size",
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
        viewBox="0 0 300 450"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={grad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="25%" stopColor="#FFF8DC" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="75%" stopColor="#FFF4B0" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          <pattern id={noise} width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.6" fill="white" opacity="0.05" />
            <circle cx="60" cy="40" r="0.5" fill="white" opacity="0.04" />
            <circle cx="90" cy="90" r="0.7" fill="white" opacity="0.03" />
          </pattern>
        </defs>
        <rect width="300" height="450" fill={`url(#${noise})`} opacity="0.8" />
        <path
          d={GOLD_EDGE}
          fill="none"
          stroke={`url(#${grad})`}
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <path d={GOLD_EDGE} fill="none" stroke="white" strokeWidth="0.4" opacity="0.15" />
      </svg>

      <div
        className="pointer-events-none absolute inset-px rounded-[17px]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 18%)" }}
      />

      <div className="relative z-20 flex items-start justify-between p-[5.5%]">
        <div className="flex flex-col items-center">
          <div className="flex h-[68px] w-[56px] flex-col items-center justify-center rounded-[10px] bg-gradient-to-b from-[#FFD700] to-[#C9A227] shadow-[0_4px_12px_rgba(255,215,0,0.4)]">
            <span className="text-[24px] font-black leading-none text-[#0B1120]">{overall}</span>
            <span className="mt-[2px] text-[11px] font-bold tracking-[0.18em] text-[#0B1120]">{position}</span>
          </div>
          <div className="mt-2 text-[8px] font-bold tracking-[0.28em] text-[#FFD700]/70">RARE · GOLD</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold tracking-[0.38em] text-white/30">FC26 EDITION</div>
          <div className="ml-auto mt-1 h-px w-8 bg-gradient-to-r from-transparent to-[#FFD700]/60" />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-[13%] h-[48%]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 64%, 0 100%)" }}
      >
        <div
          className="absolute bottom-[-6%] left-1/2 h-[96%] w-[78%] -translate-x-1/2 rounded-t-[999px]"
          style={{ background: "radial-gradient(85% 68% at 50% 16%, #44597a 0%, #2a3c58 58%, #141c2e 100%)" }}
        />
        <div className="absolute bottom-[1%] left-1/2 flex w-[72%] -translate-x-1/2 flex-col items-center">
          <div className="aspect-square w-[48%] rounded-full border border-white/15 bg-gradient-to-b from-[#516688] to-[#172235] shadow-[0_12px_26px_rgba(0,0,0,0.45)]" />
          <div className="-mt-[16%] h-[22cqw] w-[90%] rounded-t-[999px] bg-gradient-to-b from-[#425675] to-[#141c2e]" />
        </div>
        <img
          src={crest}
          alt=""
          className="absolute left-1/2 top-[22%] w-[24%] -translate-x-1/2 opacity-[0.22]"
        />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{ background: "repeating-linear-gradient(105deg, transparent 0 16px, white 16px 17px)" }}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 px-[5%] pb-[7.5%] pt-0">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[0.35em] text-[#FFD700]">LINKING</div>
            <div className="mt-1 truncate text-[clamp(16px,7.4cqw,26px)] font-black leading-[0.92] tracking-[-0.03em] text-white">
              {name}
            </div>
          </div>
          <div className="shrink-0 pb-0.5 font-mono text-[10px] text-white/40">
            ID · {position}
            {overall}
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-[6px]">
          {PILL_ORDER.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-[8px] border border-white/[0.08] bg-white/[0.06] px-2 py-1.5 backdrop-blur-sm"
            >
              <span className="text-[9px] font-bold tracking-[0.12em] text-white/50">{key}</span>
              <span className="text-[13px] font-black text-white">{stats[key]}</span>
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <img src={hkFlag} alt="" className="h-4 w-6 rounded-none object-cover" />
          <img src={hkpl} alt="" className="h-5 w-auto object-contain" />
          <img src={crest} alt="" className="h-5 w-5 object-contain" />
        </div>
      </div>
    </div>
  );
}
