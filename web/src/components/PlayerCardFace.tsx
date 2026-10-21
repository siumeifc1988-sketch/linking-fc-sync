import { useState } from "react";
import type { BoardPlayer } from "../types";
import { deriveSix, initials, overallFromPlayer, posShort, type SixAttr } from "../lib/cardStats";
import "./playerCardFace.css";

export const CARD_DISCLAIMER = "實戰推算 · 非官方屬性";

export type CardTier = "bronze" | "silver" | "gold" | "special";

const LEFT: (keyof SixAttr)[] = ["PAC", "SHO", "PAS"];
const RIGHT: (keyof SixAttr)[] = ["DRI", "DEF", "PHY"];

const MAX_WIDTH: Record<"sm" | "md" | "lg", number> = {
  sm: 168,
  md: 220,
  lg: 280,
};

export type PlayerCardFaceProps = {
  name: string;
  overall: number;
  position: string;
  stats: SixAttr;
  /** Portrait image. `portraitSrc` wins when both are set. */
  imageUrl?: string | null;
  portraitSrc?: string | null;
  /** Empty-slot letters. Defaults to the name's initials. */
  monogram?: string;
  /** Small chip on a loaded portrait, e.g. a slot preview. */
  portraitNote?: string;
  clubMark?: string;
  seasonMark?: string;
  /** Metal tier. Defaults from the overall. */
  tier?: CardTier;
  showDisclaimer?: boolean;
  /** Fill the parent instead of using the size max-width. */
  fill?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function tierForOverall(overall: number): CardTier {
  if (overall >= 86) return "special";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

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
    ...overrides,
  };
}

function Crest({ mark }: { mark: string }) {
  return (
    <div className="lk-crest" aria-hidden="true">
      <svg viewBox="0 0 40 44">
        <path
          fill="currentColor"
          d="M20 1.4 36.6 7.1v12.6c0 9.2-7 15.6-16.6 20.9C10.4 35.3 3.4 28.9 3.4 19.7V7.1L20 1.4z"
        />
        <path
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="1.15"
          d="M20 4.4 33.4 9.1v9.6c0 7.6-5.7 12.9-13.4 17.2C12.3 31.6 6.6 26.3 6.6 18.7V9.1L20 4.4z"
        />
      </svg>
      <span className="lk-crest-mark">{mark}</span>
    </div>
  );
}

export function PlayerCardFace({
  name,
  overall,
  position,
  stats,
  imageUrl,
  portraitSrc,
  monogram,
  portraitNote,
  clubMark = "LK",
  seasonMark = "27",
  tier,
  showDisclaimer = true,
  fill = false,
  size = "md",
  className,
}: PlayerCardFaceProps) {
  const requested = (portraitSrc || imageUrl || "").trim();
  const [broken, setBroken] = useState("");
  const showPhoto = requested.length > 0 && broken !== requested;
  const ovr = Number.isFinite(overall) ? Math.round(overall) : 0;
  const digits = String(Math.abs(ovr)).length;
  const resolvedTier = tier ?? tierForOverall(ovr);
  const nameLabel = (name || "PLAYER").trim();
  const mark = (monogram || initials(nameLabel)).slice(0, 2);
  const club = (clubMark || "LK").trim().slice(0, 3).toUpperCase();
  const pos = (position || "—").toUpperCase();

  return (
    <div
      className={`lk-card${className ? ` ${className}` : ""}`}
      data-tier={resolvedTier}
      data-portrait={showPhoto ? "image" : "empty"}
      data-testid="player-card-face"
      style={fill ? undefined : { maxWidth: MAX_WIDTH[size] }}
    >
      <div className="lk-rim">
        <div className="lk-face">
          <div className="lk-pattern" />
          <div className="lk-id">
            <div className="lk-ovr" data-digits={digits}>
              {ovr}
            </div>
            <div className="lk-pos">{pos}</div>
            <div className="lk-badges">
              <Crest mark={club} />
              {seasonMark ? <div className="lk-season">{seasonMark}</div> : null}
            </div>
          </div>
          <div className={`lk-portrait${showPhoto ? " is-photo" : ""}`}>
            {showPhoto ? (
              <img
                src={requested}
                alt=""
                draggable={false}
                decoding="async"
                onError={() => setBroken(requested)}
              />
            ) : (
              <div className="lk-mono">
                <span className="sr-only">未提供角色圖</span>
                <span className="lk-mono-text">{mark}</span>
              </div>
            )}
            {showPhoto && portraitNote ? <span className="lk-note">{portraitNote}</span> : null}
          </div>
          <div className="lk-shine" aria-hidden="true" />
          <div className="lk-name" title={nameLabel}>
            <span>{nameLabel}</span>
          </div>
          <div className="lk-stats">
            <div className="lk-statcol">
              {LEFT.map((key) => (
                <div key={key} className="lk-stat">
                  <span>{key}</span>
                  <b>{stats[key]}</b>
                </div>
              ))}
            </div>
            <div className="lk-statcol">
              {RIGHT.map((key) => (
                <div key={key} className="lk-stat">
                  <span>{key}</span>
                  <b>{stats[key]}</b>
                </div>
              ))}
            </div>
          </div>
          {showDisclaimer ? <div className="lk-disclaimer">{CARD_DISCLAIMER}</div> : null}
        </div>
      </div>
    </div>
  );
}
