import { Fragment } from "react";
import type { BoardPlayer } from "../types";

const METRICS: { key: keyof BoardPlayer | "gA"; label: string; fmt?: (p: BoardPlayer) => string }[] = [
  { key: "avgRating", label: "評分", fmt: (p) => Number(p.avgRating).toFixed(2) },
  { key: "games", label: "場次" },
  { key: "goals", label: "入球" },
  { key: "assists", label: "助攻" },
  { key: "gA", label: "G+A" },
  { key: "shots", label: "射門" },
  { key: "passPct", label: "傳%", fmt: (p) => (p.passPct != null ? `${p.passPct}%` : "-") },
  { key: "keyPass", label: "直塞" },
  { key: "interceptions", label: "攔截" },
  { key: "tk", label: "搶截" },
  { key: "minutes", label: "分鐘" },
];

function val(p: BoardPlayer, m: (typeof METRICS)[0]): number {
  const raw = p[m.key as keyof BoardPlayer];
  return typeof raw === "number" ? raw : 0;
}

export function CompareBar({
  selected,
  onClear,
  onOpen,
}: {
  selected: BoardPlayer[];
  onClear: () => void;
  onOpen: () => void;
}) {
  if (selected.length < 1) return null;
  return (
    <div
      className="fixed left-1/2 z-50 w-[calc(100%-16px)] max-w-[720px] -translate-x-1/2"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between gap-2 rounded-[18px] border border-line bg-white/95 px-3 py-2.5 shadow-[0_16px_48px_rgba(55,0,60,0.18)] backdrop-blur-xl sm:gap-3 sm:rounded-[20px] sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex -space-x-2">
            {selected.map((p) => (
              <div
                key={p.name}
                className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-ink text-[11px] font-extrabold text-white"
              >
                {p.name.slice(0, 1)}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-muted">{selected.length}/3</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="h-9 min-w-[52px] rounded-full border border-line bg-bg px-3 text-[12px] font-semibold text-muted active:text-ink"
          >
            清除
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={selected.length < 2}
            className="h-9 min-w-[64px] rounded-full bg-ink px-4 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(19,16,26,0.25)] disabled:opacity-40"
          >
            對比
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComparePanel({
  players,
  onClose,
}: {
  players: BoardPlayer[];
  onClose: () => void;
}) {
  if (players.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[20px] border border-line bg-white shadow-[0_24px_64px_rgba(19,16,26,0.3)] sm:rounded-[20px]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-6 sm:py-4">
          <h3 className="m-0 text-[15px] font-extrabold tracking-tight">球員對比</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-bg text-muted active:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto p-3 sm:p-5">
          <div
            className="grid min-w-[280px]"
            style={{
              gridTemplateColumns: `minmax(72px,100px) repeat(${players.length}, minmax(0,1fr))`,
            }}
          >
            <div className="py-2 text-[10px] font-bold uppercase tracking-widest text-muted sm:text-[11px]">
              指標
            </div>
            {players.map((p) => (
              <div key={p.name} className="py-2 text-center">
                <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-ink text-[12px] font-extrabold text-white sm:h-10 sm:w-10 sm:text-[13px]">
                  {p.name.slice(0, 1)}
                </div>
                <div className="mt-1.5 truncate px-0.5 text-[12px] font-bold sm:text-[13px]">{p.name}</div>
                <div className="text-[10px] text-muted sm:text-[11px]">{p.posCN || ""}</div>
              </div>
            ))}
            {METRICS.map((m) => {
              const nums = players.map((p) => val(p, m));
              const max = Math.max(...nums);
              return (
                <Fragment key={m.label}>
                  <div className="border-t border-[#F5F0F8] py-2.5 text-[11px] font-semibold text-muted sm:py-3 sm:text-[12px]">
                    {m.label}
                  </div>
                  {players.map((p, i) => {
                    const n = nums[i];
                    const display = m.fmt ? m.fmt(p) : String(p[m.key as keyof BoardPlayer] ?? "-");
                    const best = nums.length > 1 && n === max;
                    return (
                      <div
                        key={p.name + m.label}
                        className={`border-t border-[#F5F0F8] py-2.5 text-center tabular text-[12px] sm:py-3 sm:text-[13px] ${
                          best
                            ? "rounded-[8px] bg-pink-soft font-extrabold text-pl-magenta"
                            : "font-semibold text-ink"
                        }`}
                      >
                        {display}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
        <div
          className="flex justify-end border-t border-line bg-bg px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="h-10 min-w-[88px] rounded-full bg-ink px-4 text-[13px] font-bold text-white"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
