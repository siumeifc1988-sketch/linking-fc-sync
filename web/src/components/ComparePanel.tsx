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
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-16px)] max-w-[720px] -translate-x-1/2">
      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-white/90 px-4 py-3 shadow-[0_16px_48px_rgba(55,0,60,0.18)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">對比</div>
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
          <div className="hidden gap-1.5 sm:flex">
            {selected.map((p) => (
              <span
                key={p.name}
                className="rounded-full border border-line bg-bg px-2 py-1 text-[11px] font-semibold"
              >
                {p.name}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-muted">{selected.length}/3</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="h-8 rounded-full border border-line bg-bg px-3 text-[12px] font-semibold text-muted hover:text-ink"
          >
            清除
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={selected.length < 2}
            className="h-8 rounded-full bg-ink px-4 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(19,16,26,0.25)] transition hover:bg-pl-purple disabled:opacity-40"
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_24px_64px_rgba(19,16,26,0.3)]">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="m-0 text-[15px] font-extrabold tracking-tight">球員對比</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-bg text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto p-5">
          <div
            className="grid"
            style={{ gridTemplateColumns: `140px repeat(${players.length}, 1fr)` }}
          >
            <div className="py-2 text-[11px] font-bold uppercase tracking-widest text-muted">指標</div>
            {players.map((p) => (
              <div key={p.name} className="py-2 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink text-[13px] font-extrabold text-white">
                  {p.name.slice(0, 1)}
                </div>
                <div className="mt-2 text-[13px] font-bold">{p.name}</div>
                <div className="text-[11px] text-muted">{p.posCN || ""}</div>
              </div>
            ))}
            {METRICS.map((m) => {
              const nums = players.map((p) => val(p, m));
              const max = Math.max(...nums);
              return (
                <>
                  <div
                    key={`${m.label}-l`}
                    className="border-t border-[#F5F0F8] py-3 text-[12px] font-semibold text-muted"
                  >
                    {m.label}
                  </div>
                  {players.map((p, i) => {
                    const n = nums[i];
                    const display = m.fmt ? m.fmt(p) : String(p[m.key as keyof BoardPlayer] ?? "-");
                    const best = nums.length > 1 && n === max;
                    return (
                      <div
                        key={p.name + m.label}
                        className={`border-t border-[#F5F0F8] py-3 text-center tabular text-[13px] ${
                          best
                            ? "rounded-[8px] bg-pink-soft font-extrabold text-pl-magenta"
                            : "font-semibold text-ink"
                        }`}
                      >
                        {display}
                      </div>
                    );
                  })}
                </>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end border-t border-line bg-bg px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-full bg-ink px-4 text-[13px] font-bold text-white"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
