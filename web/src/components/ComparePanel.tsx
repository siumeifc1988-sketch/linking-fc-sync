import type { BoardPlayer } from "../types";
import { ratingClass } from "../lib/format";

const METRICS: { key: keyof BoardPlayer | "gA"; label: string; fmt?: (p: BoardPlayer) => string }[] = [
  { key: "avgRating", label: "評分", fmt: (p) => Number(p.avgRating).toFixed(2) },
  { key: "games", label: "場" },
  { key: "goals", label: "入球" },
  { key: "assists", label: "助攻" },
  { key: "gA", label: "G+A" },
  { key: "shots", label: "射門" },
  { key: "shotsOn", label: "射正" },
  { key: "passPct", label: "傳%", fmt: (p) => (p.passPct != null ? `${p.passPct}%` : "-") },
  { key: "keyPass", label: "直塞" },
  { key: "interceptions", label: "攔截" },
  { key: "tk", label: "搶截" },
  { key: "totalDef", label: "防守合計" },
  { key: "dribbles", label: "盤球" },
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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-pl-purple px-4 py-3 text-white shadow-lg">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">
          已選 <span className="text-pl-gold">{selected.length}</span> 人
          <span className="ml-2 text-white/70">
            {selected.map((p) => p.name).join(" · ")}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded border border-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
          >
            清除
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={selected.length < 2}
            className="rounded bg-pl-magenta px-4 py-1.5 text-sm font-bold disabled:opacity-40"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-surface shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-pl-purple px-4 py-3 text-white">
          <h3 className="m-0 text-base font-extrabold">球員對比</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-white/15 px-3 py-1 text-sm font-semibold hover:bg-white/25"
          >
            關閉
          </button>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-line px-2 py-2 text-left text-muted">指標</th>
                {players.map((p) => (
                  <th key={p.name} className="border-b border-line px-2 py-2 text-center">
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-muted">{p.posCN || ""}</div>
                    <span
                      className={`mt-1 inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-xs font-extrabold ${ratingClass(p.avgRating)}`}
                    >
                      {Number(p.avgRating).toFixed(2)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => {
                const nums = players.map((p) => val(p, m));
                const max = Math.max(...nums);
                const min = Math.min(...nums);
                return (
                  <tr key={m.label} className="hover:bg-row-hover">
                    <td className="border-b border-line px-2 py-2 font-semibold text-muted">{m.label}</td>
                    {players.map((p, i) => {
                      const n = nums[i];
                      const display = m.fmt ? m.fmt(p) : String(p[m.key as keyof BoardPlayer] ?? "-");
                      const best = nums.length > 1 && n === max && max !== min;
                      const worst = nums.length > 1 && n === min && max !== min;
                      return (
                        <td
                          key={p.name}
                          className={`tabular border-b border-line px-2 py-2 text-center font-bold ${
                            best ? "text-pl-green" : worst ? "text-pl-magenta" : ""
                          }`}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
