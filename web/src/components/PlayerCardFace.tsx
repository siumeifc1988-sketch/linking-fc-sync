import { useId, useState } from "react";
import type { BoardPlayer } from "../types";
import { deriveSix, initials, overallFromPlayer, posShort, type SixAttr } from "../lib/cardStats";
import cutoutGn from "../assets/cards/gn00925443.png";
import hkFlag from "../assets/cards/hk-flag.png";
import hkpl from "../assets/cards/hkpl.png";
import crest from "../assets/cards/linking-fc-crest.png";
import "./playerCardFace.css";

export const CARD_DISCLAIMER = "實戰推算 · 非官方屬性";

/** Club Rare is the live default. Common and Highlight only swap the chrome. */
export type CardRarity = "common" | "rare" | "highlight";

const ATTRS: (keyof SixAttr)[] = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];

const PORTRAITS: Record<string, string> = {
  gn00925443: cutoutGn,
};

/**
 * Shield silhouette traced toward the special-card reference:
 * shallow top arch, long straight sides, short bottom point.
 */
const OUTER =
  "M 200 10 C 278 12 340 28 366 48 C 386 64 394 88 394 114 L 390 444 C 390 486 318 522 200 530 C 82 522 10 486 10 444 L 6 114 C 6 88 14 64 34 48 C 60 28 122 12 200 10 Z";
const INNER =
  "M 200 28 C 268 30 326 44 348 62 C 366 76 374 98 374 122 L 370 440 C 370 474 306 506 200 514 C 94 506 30 474 30 440 L 26 122 C 26 98 34 76 52 62 C 74 44 132 30 200 28 Z";

const SHIELD_MASK = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 536"><path fill="white" d="${OUTER}"/></svg>`,
)}")`;

export function portraitFor(name: string): string | undefined {
  const key = name.trim().toLowerCase();
  return PORTRAITS[key];
}

export type PlayerCardFaceProps = {
  name: string;
  overall: number;
  position: string;
  stats: SixAttr;
  /** Explicit portrait. Wins over the built-in demo cutout. */
  portraitSrc?: string | null;
  imageUrl?: string | null;
  monogram?: string;
  /** Defaults to Club Rare (purple special). */
  rarity?: CardRarity;
  showDisclaimer?: boolean;
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

function nameSize(name: string): string {
  const n = name.trim().length;
  if (n > 12) return "6cqw";
  if (n > 9) return "7.1cqw";
  return "8.4cqw";
}

function CardPlate({ id }: { id: string }) {
  return (
    <svg className="lk-plate" viewBox="0 0 400 536" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-rim`} x1="8%" y1="0%" x2="92%" y2="100%">
          <stop offset="0%" stopColor="var(--lk-rim-0)" />
          <stop offset="14%" stopColor="var(--lk-rim-1)" />
          <stop offset="30%" stopColor="var(--lk-rim-2)" />
          <stop offset="46%" stopColor="var(--lk-rim-4)" />
          <stop offset="58%" stopColor="var(--lk-rim-5)" />
          <stop offset="74%" stopColor="var(--lk-rim-6)" />
          <stop offset="88%" stopColor="var(--lk-rim-3)" />
          <stop offset="100%" stopColor="var(--lk-rim-7)" />
        </linearGradient>
        <radialGradient id={`${id}-plate`} cx="48%" cy="18%" r="82%">
          <stop offset="0%" stopColor="var(--lk-plate-0)" />
          <stop offset="26%" stopColor="var(--lk-plate-1)" />
          <stop offset="52%" stopColor="var(--lk-plate-2)" />
          <stop offset="76%" stopColor="var(--lk-plate-3)" />
          <stop offset="100%" stopColor="var(--lk-plate-4)" />
        </radialGradient>
        <linearGradient id={`${id}-shard`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.78" />
          <stop offset="36%" stopColor="var(--lk-crystal)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--lk-plate-1)" stopOpacity="0.02" />
        </linearGradient>
        <radialGradient id={`${id}-vig`} cx="50%" cy="16%" r="78%">
          <stop offset="0%" stopColor="var(--lk-vig)" stopOpacity="0" />
          <stop offset="55%" stopColor="var(--lk-vig)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--lk-vig)" stopOpacity="0.72" />
        </radialGradient>
        <clipPath id={`${id}-inner`}>
          <path d={INNER} />
        </clipPath>
        <mask id={`${id}-edge`} maskUnits="userSpaceOnUse">
          <path d={OUTER} fill="white" />
          <path d={INNER} fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${id}-edge)`}>
        <rect x="0" y="0" width="400" height="536" fill={`url(#${id}-rim)`} />
        <ellipse cx="108" cy="58" rx="96" ry="30" fill="#ffffff" opacity="0.55" />
        <ellipse cx="312" cy="468" rx="78" ry="24" fill="var(--lk-rim-3)" opacity="0.5" />
      </g>

      <g clipPath={`url(#${id}-inner)`}>
        <path d={INNER} fill={`url(#${id}-plate)`} />
        <polygon points="28,78 150,36 118,168" fill="var(--lk-facet)" opacity="0.22" />
        <polygon points="110,34 250,28 214,150 86,120" fill="var(--lk-crystal)" opacity="0.14" />
        <polygon points="188,32 348,78 300,168" fill="var(--lk-facet)" opacity="0.16" />
        <polygon points="236,46 374,108 346,262 204,178" fill={`url(#${id}-shard)`} />
        <polygon points="278,74 362,132 336,214 258,154" fill="#ffffff" opacity="0.16" />
        <polygon points="246,50 322,92 286,142" fill="#ffffff" opacity="0.32" />
        <polygon points="24,176 96,148 78,236" fill="var(--lk-crystal)" opacity="0.16" />
        <polygon points="36,248 118,228 92,328" fill="var(--lk-facet-deep)" opacity="0.28" />
        <polygon points="250,250 372,210 368,340 268,300" fill="var(--lk-crystal)" opacity="0.08" />
        <polygon points="40,340 200,300 360,360 300,460 80,440" fill="var(--lk-vig)" opacity="0.28" />
        <rect x="0" y="0" width="400" height="536" fill={`url(#${id}-vig)`} />
        <ellipse cx="168" cy="78" rx="130" ry="40" fill="#ffffff" opacity="0.07" />
      </g>
      <path d={INNER} fill="none" stroke="var(--lk-inner-line)" strokeWidth="1.7" />
      <path d={OUTER} fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.25" />
    </svg>
  );
}

export function PlayerCardFace({
  name,
  overall,
  position,
  stats,
  portraitSrc,
  imageUrl,
  monogram,
  rarity = "rare",
  showDisclaimer = true,
  className,
}: PlayerCardFaceProps) {
  const reactId = useId().replace(/:/g, "");
  const id = `lk${reactId}`;
  const explicit = (portraitSrc || imageUrl || "").trim();
  const requested = explicit || portraitFor(name) || "";
  const [failed, setFailed] = useState("");
  const showPhoto = requested.length > 0 && failed !== requested;
  const ovr = Number.isFinite(overall) ? Math.round(overall) : 0;
  const nameLabel = (name || "PLAYER").trim();
  const mark = (monogram || initials(nameLabel) || "?").slice(0, 2);
  const pos = (position || "—").toUpperCase();

  return (
    <div
      className={`lk-card${className ? ` ${className}` : ""}`}
      data-rarity={rarity}
      data-portrait={showPhoto ? "image" : "initials"}
      data-testid="player-card-face"
      style={{ ["--lk-mask" as string]: SHIELD_MASK }}
    >
      <CardPlate id={id} />
      <div className="lk-portrait">
        {showPhoto ? (
          <img
            src={requested}
            alt=""
            draggable={false}
            decoding="async"
            onError={() => setFailed(requested)}
          />
        ) : (
          <div className="lk-mono" aria-hidden="true">
            {mark}
          </div>
        )}
      </div>
      {rarity === "highlight" ? (
        <div className="lk-star">
          <span>★ STAR</span>
        </div>
      ) : null}
      <div className="lk-id">
        <div
          className="lk-ovr"
          title="總評＝賽季均分 55% ＋ 六維平均 45%。實戰推算，非官方屬性。"
        >
          {ovr}
        </div>
        <div className="lk-pos">{pos}</div>
      </div>
      <div className="lk-stack">
        <div className="lk-name" style={{ fontSize: nameSize(nameLabel) }} title={nameLabel}>
          {nameLabel}
        </div>
        <div className="lk-stats">
          {ATTRS.map((key, index) => (
            <div key={key} className={`lk-stat${index === 3 ? " lk-split" : ""}`}>
              <span>{key}</span>
              <b>{stats[key]}</b>
            </div>
          ))}
        </div>
        {showDisclaimer ? <div className="lk-disclaimer">{CARD_DISCLAIMER}</div> : null}
        <div className="lk-badges">
          <img className="lk-flag" src={hkFlag} alt="" draggable={false} />
          <img className="lk-league" src={hkpl} alt="" draggable={false} />
          <img className="lk-club" src={crest} alt="" draggable={false} />
        </div>
      </div>
    </div>
  );
}
