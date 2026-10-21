import { useMemo } from "react";
import type { BoardPlayer } from "../types";
import { overallFromPlayer } from "../lib/cardStats";
import { cardFaceFromPlayer, PlayerCardFace } from "./PlayerCardFace";

const DEMO_NAME = "gn00925443";

/**
 * Real card faces on the overview. Clicking one still opens the modal.
 * gn00925443 leads the strip and uses the cutout when that asset is present.
 */
export function PlayerCardStrip({
  players,
  onOpen,
}: {
  players: BoardPlayer[];
  onOpen?: (player: BoardPlayer) => void;
}) {
  const ordered = useMemo(() => {
    const demo = players.find((p) => p.name.trim().toLowerCase() === DEMO_NAME);
    const rest = players
      .filter((p) => p !== demo)
      .sort(
        (a, b) =>
          overallFromPlayer(b) - overallFromPlayer(a) ||
          b.gA - a.gA ||
          a.name.localeCompare(b.name),
      );
    return demo ? [demo, ...rest] : rest;
  }, [players]);

  if (!ordered.length) return null;

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-3.5 w-1 shrink-0 rounded-full bg-pl-magenta" />
          <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">球員卡</h2>
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-muted">點卡看詳細</span>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-4 pt-4 sm:gap-4 sm:px-5">
        {ordered.map((player) => (
          <button
            key={player.name}
            type="button"
            className="lk-card-hit w-[min(76vw,250px)] shrink-0 snap-center sm:w-[228px]"
            onClick={() => onOpen?.(player)}
            aria-label={`開啟 ${player.name} 球員卡`}
          >
            <PlayerCardFace {...cardFaceFromPlayer(player)} />
          </button>
        ))}
      </div>
      <p className="px-3 pb-3.5 pt-0 text-center text-[11px] leading-relaxed text-muted sm:px-5">
        點卡查看雷達、能力條同實戰總數。角色圖只有 gn00925443，其他人顯示縮寫。
      </p>
    </section>
  );
}
