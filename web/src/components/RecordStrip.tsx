import type { ClubRecord, FormCode } from "../types";
import { Card } from "@/components/ui/card";

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
    <Card className="mb-3 grid grid-cols-4 gap-0 py-0 sm:grid-cols-7">
      {items.map((it) => (
        <div
          key={it.l}
          className="border-r border-line px-1 py-3 text-center last:border-r-0 max-sm:[&:nth-child(n+5)]:border-t"
        >
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground@@FG@@">
            {it.l}
          </span>
          <span className={`tabular text-[22px] font-extrabold tracking-tight ${it.cls || "text-ink"}`}>
            {it.v}
          </span>
        </div>
      ))}
    </Card>
  );
}

export function FormDots({ form, compact }: { form?: FormCode[]; compact?: boolean }) {
  if (!form?.length) return null;
  const color: Record<FormCode, string> = {
    W: "bg-pl-green",
    D: "bg-pl-gray",
    L: "bg-pl-magenta",
  };
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "mb-4 px-0.5"}`}>
      {!compact && (
        <span className="mr-1 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground@@FG@@">
          近況
        </span>
      )}
      {form.map((c, i) => (
        <div
          key={i}
          className={`grid place-items-center rounded-full text-[10px] font-extrabold text-white ${
            compact ? "h-5 w-5" : "h-6 w-6"
          } ${color[c]}`}
        >
          {c}
        </div>
      ))}
    </div>
  );
}
