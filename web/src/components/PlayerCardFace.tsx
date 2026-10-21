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

const LEFT: (keyof SixAttr)[] = ["PAC", "SHO", "PAS"];
const RIGHT: (keyof SixAttr)[] = ["DRI", "DEF", "PHY"];

const PORTRAITS: Record<string, string> = {
  gn00925443: cutoutGn,
};

/**
 * Faceted special-card shield. Top shoulders are folded planes;
 * the bottom eases into a point. Four concentric paths build the metal edge.
 */
const P0 =
  "M200 8 L256 20 L308 44 L346 78 L372 118 L386 166 L382 418 C378 478 332 528 200 552 C68 528 22 478 18 418 L14 166 L28 118 L54 78 L92 44 L144 20 Z";
const P1 =
  "M200 20 L248 32 L296 54 L330 86 L354 124 L366 170 L362 412 C358 466 318 510 200 532 C82 510 42 466 38 412 L34 170 L46 124 L70 86 L104 54 L152 32 Z";
const P2 =
  "M200 30 L242 40 L286 60 L316 90 L338 126 L348 172 L344 406 C340 454 308 494 200 514 C92 494 60 454 56 406 L52 172 L62 126 L84 90 L114 60 L158 40 Z";
const P3 =
  "M200 40 L236 50 L276 68 L304 98 L324 132 L332 174 L328 400 C324 444 298 480 200 498 C102 480 76 444 72 400 L68 174 L76 132 L96 98 L124 68 L164 50 Z";

const SHIELD_MASK = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560"><path fill="white" d="${P0}"/></svg>`,
)}")`;

export function portraitFor(name: string): string | undefined {
  return PORTRAITS[name.trim().toLowerCase()];
}

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

function nameSize(name: string): string {
  const n = name.trim().length;
  if (n > 12) return "6.2cqw";
  if (n > 9) return "7.4cqw";
  return "8.8cqw";
}

function ring(outer: string, inner: string) {
  return `${outer} ${inner}`;
}

function CardPlate({ id }: { id: string }) {
  return (
    <svg className="lk-plate" viewBox="0 0 400 560" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-silver`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lk-metal-0)" />
          <stop offset="28%" stopColor="var(--lk-metal-1)" />
          <stop offset="55%" stopColor="var(--lk-metal-2)" />
          <stop offset="100%" stopColor="var(--lk-metal-3)" />
        </linearGradient>
        <linearGradient id={`${id}-iri`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--lk-iri-0)" />
          <stop offset="14%" stopColor="var(--lk-iri-1)" />
          <stop offset="30%" stopColor="var(--lk-iri-2)" />
          <stop offset="46%" stopColor="var(--lk-iri-3)" />
          <stop offset="58%" stopColor="var(--lk-iri-4)" />
          <stop offset="72%" stopColor="var(--lk-iri-5)" />
          <stop offset="86%" stopColor="var(--lk-iri-1)" />
          <stop offset="100%" stopColor="var(--lk-iri-0)" />
        </linearGradient>
        <linearGradient id={`${id}-lip`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#d5e2f6" />
          <stop offset="100%" stopColor="#8eaae4" />
        </linearGradient>
        <radialGradient id={`${id}-plate`} cx="46%" cy="16%" r="78%">
          <stop offset="0%" stopColor="#4d78e6" />
          <stop offset="22%" stopColor="#3266d8" />
          <stop offset="48%" stopColor="#4124ad" />
          <stop offset="70%" stopColor="#2d0c33" />
          <stop offset="100%" stopColor="#120b26" />
        </radialGradient>
        <linearGradient id={`${id}-shard`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="28%" stopColor="#bfcee9" stopOpacity="0.55" />
          <stop offset="62%" stopColor="#3266d8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1f0f3a" stopOpacity="0.05" />
        </linearGradient>
        <mask id={`${id}-r0`} maskUnits="userSpaceOnUse">
          <rect width="400" height="560" fill="black" />
          <path fill="white" fillRule="evenodd" d={ring(P0, P1)} />
        </mask>
        <mask id={`${id}-r1`} maskUnits="userSpaceOnUse">
          <rect width="400" height="560" fill="black" />
          <path fill="white" fillRule="evenodd" d={ring(P1, P2)} />
        </mask>
        <mask id={`${id}-r2`} maskUnits="userSpaceOnUse">
          <rect width="400" height="560" fill="black" />
          <path fill="white" fillRule="evenodd" d={ring(P2, P3)} />
        </mask>
        <clipPath id={`${id}-plate-clip`}>
          <path d={P3} />
        </clipPath>
      </defs>

      <g mask={`url(#${id}-r0)`}>
        <rect width="400" height="560" fill={`url(#${id}-silver)`} />
        <ellipse cx="118" cy="48" rx="78" ry="22" fill="#ffffff" opacity="0.85" />
        <ellipse cx="300" cy="500" rx="70" ry="18" fill="#9eb6e8" opacity="0.55" />
      </g>
      <g mask={`url(#${id}-r1)`}>
        <rect width="400" height="560" fill={`url(#${id}-iri)`} />
        <ellipse cx="150" cy="36" rx="90" ry="16" fill="#ffffff" opacity="0.8" />
        <ellipse cx="332" cy="210" rx="18" ry="70" fill="#7eb6ff" opacity="0.7" />
        <ellipse cx="70" cy="340" rx="16" ry="54" fill="#d9ccff" opacity="0.55" />
        <ellipse cx="210" cy="530" rx="60" ry="14" fill="#ffffff" opacity="0.35" />
      </g>
      <g mask={`url(#${id}-r2)`}>
        <rect width="400" height="560" fill={`url(#${id}-lip)`} />
        <ellipse cx="160" cy="56" rx="70" ry="12" fill="#ffffff" opacity="0.9" />
      </g>

      <path d={P1} fill="none" stroke="#120b26" strokeWidth="1.15" opacity="0.55" />
      <path d={P2} fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.55" />

      <g clipPath={`url(#${id}-plate-clip)`}>
        <path d={P3} fill={`url(#${id}-plate)`} />
        <polygon points="70,90 150,48 130,150" fill="#3266d8" opacity="0.38" />
        <polygon points="140,46 250,40 210,140 110,110" fill="#bfcee9" opacity="0.16" />
        <polygon points="210,44 330,86 280,160" fill="#4124ad" opacity="0.34" />
        <polygon points="248,58 360,112 338,248 214,168" fill={`url(#${id}-shard)`} />
        <polygon points="268,78 346,124 322,196 252,146" fill="#ffffff" opacity="0.2" />
        <polygon points="252,62 318,96 286,140" fill="#ffffff" opacity="0.55" />
        <polygon points="292,150 352,188 330,250" fill="#7eb6ff" opacity="0.28" />
        <polygon points="64,170 120,150 100,230" fill="#bfcee9" opacity="0.14" />
        <polygon points="48,240 130,220 100,320" fill="#1f0f3a" opacity="0.35" />
        <polygon points="40,360 200,330 360,380 300,470 90,450" fill="#120b26" opacity="0.28" />
        <ellipse cx="168" cy="90" rx="120" ry="36" fill="#ffffff" opacity="0.07" />
      </g>
      <path d={P3} fill="none" stroke="#f4f8ff" strokeWidth="1.6" opacity="0.8" />
      <path d={P3} fill="none" stroke="#3266d8" strokeWidth="3.2" opacity="0.35" />

      {/* Folded top corners — two planes each, so the shoulder reads as bent metal. */}
      <polygon points="144,20 200,8 176,30 128,34" fill="var(--lk-fold-lite)" />
      <polygon points="92,44 144,20 128,34 86,52" fill="var(--lk-fold-mid)" opacity="0.9" />
      <polygon points="54,78 92,44 86,52 62,84" fill="var(--lk-fold-deep)" opacity="0.55" />
      <polygon points="256,20 200,8 224,30 272,34" fill="var(--lk-fold-lite)" />
      <polygon points="308,44 256,20 272,34 314,52" fill="var(--lk-fold-mid)" opacity="0.72" />
      <polygon points="346,78 308,44 314,52 338,84" fill="#7eb6ff" opacity="0.45" />
    </svg>
  );
}

function StatCol({ keys, stats }: { keys: (keyof SixAttr)[]; stats: SixAttr }) {
  return (
    <div className="lk-col">
      {keys.map((key) => (
        <div key={key} className="lk-stat">
          <span>{key}</span>
          <b>{stats[key]}</b>
        </div>
      ))}
    </div>
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
      <div className="lk-nameband" aria-hidden="true" />
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
        <div className="lk-ovr">{ovr}</div>
        <div className="lk-pos">{pos}</div>
      </div>
      <div className="lk-name" style={{ fontSize: nameSize(nameLabel) }} title={nameLabel}>
        {nameLabel}
      </div>
      <div className="lk-stats">
        <StatCol keys={LEFT} stats={stats} />
        <StatCol keys={RIGHT} stats={stats} />
      </div>
      <div className="lk-badges">
        <img className="lk-flag" src={hkFlag} alt="" draggable={false} />
        <img className="lk-league" src={hkpl} alt="" draggable={false} />
        <img className="lk-club" src={crest} alt="" draggable={false} />
      </div>
    </div>
  );
}
