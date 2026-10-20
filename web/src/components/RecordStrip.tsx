import type { ClubRecord, FormCode } from "../types";

export function RecordStrip({ record }: { record?: ClubRecord | null }) {
  if (!record) return null;
  const gd = record.goalDiff;
  const gdTxt = gd > 0 ? `+${gd}` : String(gd);
  const items: { l: string; v: string | number; cls?: string }[] = [
    { l: "比賽", v: record.played },
    { l: "勝", v: record.wins, cls: "text-pl-green" },
    { l: "和", v: record.draws },
    { l: "負", v: record.losses, cls: "text-pl-magenta" },
    { l: "入球", v: record.goalsFor },
    { l: "失球", v: record.goalsAgainst },
    {
      l: "淨勝",
      v: gdTxt,
      cls: gd > 0 ? "text-pl-green" : gd < 0 ? "text-pl-magenta" : "",
    },
  ];
  return (
    <div className="mb-3 grid grid-cols-4 overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-7">
      {items.map((it) => (
        <div
          key={it.l}
          className="border-r border-line px-1 py-2.5 text-center last:border-r-0 max-sm:[&:nth-child(n+5)]:border-t"
        >
          <span className="mb-0.5 block text-[0.62rem] font-bold uppercase tracking-wider text-muted">
            {it.l}
          </span>
          <span className={`tabular text-xl font-extrabold tracking-tight ${it.cls || ""}`}>
            {it.v}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FormDots({ form }: { form?: FormCode[] }) {
  if (!form?.length) return null;
  const color: Record<FormCode, string> = {
    W: "bg-pl-green",
    D: "bg-[#8a8496]",
    L: "bg-pl-magenta",
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 px-0.5">
      <span className="mr-1 text-[0.72rem] font-bold uppercase tracking-wider text-muted">
        近況
      </span>
      {form.map((c, i) => (
        <div
          key={i}
          className={`grid h-6 w-6 place-items-center rounded-full text-[0.65rem] font-extrabold text-white ${color[c]}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}
