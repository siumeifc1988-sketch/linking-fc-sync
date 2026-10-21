import { useMemo } from "react";
import type { BoardPlayer } from "../types";
import portraitSlot from "../assets/portrait-slot.svg";
import { CARD_DISCLAIMER, cardFaceFromPlayer, PlayerCardFace } from "./PlayerCardFace";
import { overallFromPlayer } from "../lib/cardStats";

/**
 * Two standalone faces on the overview.
 * The second card passes a portrait so the image slot is visible;
 * the chip marks it as a stand-in until real character art is supplied.
 */
export function PlayerCardStrip({
  players,
  onOpen,
}: {
  players: BoardPlayer[];
  onOpen?: (player: BoardPlayer) => void;
}) {
  const top = useMemo(() => {
    return [...players]
      .sort((a, b) => overallFromPlayer(b) - overallFromPlayer(a) || a.name.localeCompare(b.name))
      .slice(0, 2);
  }, [players]);

  if (!top.length) return null;

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-3.5 w-1 shrink-0 rounded-full bg-pl-magenta" />
          <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">球員卡</h2>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-muted">{CARD_DISCLAIMER}</span>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 pt-4 sm:justify-center sm:gap-8 sm:px-5">
        {top.map((player, index) => {
          const preview = index === 1;
          return (
            <button
              key={player.name}
              type="button"
              className="lk-card-hit w-[min(70vw,220px)] shrink-0 snap-center"
              onClick={() => onOpen?.(player)}
              aria-label={`開啟 ${player.name} 球員卡`}
            >
              <PlayerCardFace
                {...cardFaceFromPlayer(player, {
                  portraitSrc: preview ? portraitSlot : undefined,
                  portraitNote: preview ? "示意" : undefined,
                })}
                fill
              />
            </button>
          );
        })}
      </div>
      <p className="px-3 pb-3.5 pt-2 text-center text-[11px] leading-relaxed text-muted sm:px-5">
        點卡查看雷達與實戰明細。未提供角色圖時顯示縮寫；「示意」人像只是版位預覽，之後可換成角色圖。
      </p>
    </section>
  );
}
