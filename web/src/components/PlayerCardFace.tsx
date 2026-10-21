import type { BoardPlayer } from "../types";
import { deriveSix, initials, overallFromPlayer, posShort, type SixAttr } from "../lib/cardStats";
import { GoldRareCard } from "./player-card/GoldRareCard";

export const CARD_DISCLAIMER = "實戰推算 · 非官方屬性";

/** Gold Rare is the live face. Kept so older call sites can still pass a rarity. */
export type CardRarity = "common" | "rare" | "highlight";

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

/** Roster click target. Stats stay on deriveSix / overallFromPlayer. No portrait. */
export function PlayerCardFace({ name, overall, position, stats, className }: PlayerCardFaceProps) {
  return <GoldRareCard name={name} overall={overall} position={position} stats={stats} className={className} />;
}
