import { Fragment, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type SortingState,
} from "@tanstack/react-table";
import type { MatchPlayerRaw, ShapedMatch } from "../types";
import { CLUB, num, posLabel, ratingClass } from "../lib/format";
import { passPct } from "../lib/events";
import { MatchPlayerExpand } from "./StatExpand";

function playersOf(raw: ShapedMatch["raw"], clubId: string): MatchPlayerRaw[] {
  const map = (raw.players && raw.players[clubId]) || {};
  const list = Array.isArray(map)
    ? map.slice()
    : Object.keys(map).map((k) => (map as Record<string, MatchPlayerRaw>)[k]);
  list.sort((a, b) => num(b.rating) - num(a.rating));
  return list;
}

function oppClubId(raw: ShapedMatch["raw"]): string | null {
  const clubs = raw.clubs || {};
  return Object.keys(clubs).find((id) => id !== CLUB) || null;
}

function MatchPlayerTable({ list, side }: { list: MatchPlayerRaw[]; side: string }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "rating", desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<MatchPlayerRaw>[]>(
    () => [
      {
        id: "idx",
        header: "#",
        cell: ({ row }) => <span className="font-extrabold text-muted">{row.index + 1}</span>,
      },
      {
        id: "pos",
        header: "位置",
        cell: ({ row }) => (
          <span className="inline-block rounded-full bg-bg px-1.5 py-0.5 text-[11px] font-bold text-muted">
            {posLabel(row.original)}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (r) => r.playername || r.name || "?",
        header: "球員",
        cell: ({ getValue }) => <strong className="text-[13px] font-bold">{String(getValue())}</strong>,
      },
      {
        id: "rating",
        accessorFn: (r) => num(r.rating),
        header: "評分",
        cell: ({ getValue }) => {
          const r = Number(getValue());
          return (
            <span className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-bold ${ratingClass(r)}`}>
              {r.toFixed(2)}
            </span>
          );
        },
      },
      { id: "goals", accessorFn: (r) => num(r.goals), header: "G", cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span> },
      { id: "assists", accessorFn: (r) => num(r.assists), header: "A", cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span> },
      { id: "shots", accessorFn: (r) => num(r.shots), header: "射", cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span> },
      {
        id: "pass",
        accessorFn: (r) => passPct(r),
        header: "傳%",
        cell: ({ getValue }) => <span className="tabular font-semibold">{Math.round(Number(getValue()))}%</span>,
      },
      {
        id: "tk",
        accessorFn: (r) => num(r.tacklesmade ?? r.tacklesMade),
        header: "搶截",
        cell: ({ row }) => {
          const m = num(row.original.tacklesmade ?? row.original.tacklesMade);
          const a = num(row.original.tackleattempts);
          return <span className="tabular font-semibold">{m}{a ? `/${a}` : ""}</span>;
        },
      },
      {
        id: "mins",
        accessorFn: (r) => Math.round(num(r.secondsPlayed ?? r.gameTime) / 60),
        header: "分",
        cell: ({ getValue }) => <span className="tabular text-muted">{String(getValue() || "-")}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: list,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (r, i) => `${side}|${r.playername || r.name || i}`,
  });

  if (!list.length) {
    return <p className="py-2 text-[13px] text-muted">沒有球員細項</p>;
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[480px] border-collapse text-[13px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className={`cursor-pointer select-none whitespace-nowrap bg-ink px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-white ${
                    h.column.getIsSorted() ? "bg-pl-purple" : ""
                  }`}
                  onClick={h.column.getToggleSortingHandler()}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                className={`cursor-pointer border-b border-line-soft hover:bg-row-hover ${row.getIsExpanded() ? "bg-tint" : ""}`}
                onClick={() => row.toggleExpanded()}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr className="border-b border-line bg-bg">
                  <td colSpan={columns.length} className="p-2 sm:p-3">
                    <MatchPlayerExpand p={row.original} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchDetailBody({ match }: { match: ShapedMatch }) {
  const usList = playersOf(match.raw, CLUB);
  const oid = oppClubId(match.raw);
  const themList = oid ? playersOf(match.raw, oid) : [];

  let mom: MatchPlayerRaw | null = null;
  let sumR = 0;
  usList.forEach((p) => {
    sumR += num(p.rating);
    if (num(p.mom) > 0) mom = p;
  });
  if (!mom && usList.length) mom = usList[0];
  const avg = usList.length ? (sumR / usList.length).toFixed(2) : "-";

  return (
    <div className="space-y-4 p-1">
      <div className="grid gap-3 border-b border-line pb-3 sm:grid-cols-[auto_1fr]">
        <div className="rounded-[14px] bg-gradient-to-br from-pl-purple to-[#4a1450] px-5 py-4 text-center text-white shadow">
          <div className="tabular text-[28px] font-black tracking-tight">
            {match.us}:{match.them}
          </div>
          <div className="mt-1 text-[11px] opacity-85">vs {match.opp}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-[12px] border border-line bg-bg px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">結果</div>
            <div className="mt-1 font-bold">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  match.code === "W"
                    ? "bg-pl-green/10 text-pl-green"
                    : match.code === "L"
                      ? "bg-pl-magenta/10 text-pl-magenta"
                      : "bg-line text-muted"
                }`}
              >
                {match.outcome}
              </span>
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-bg px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">MOTM</div>
            <div className="mt-1 truncate text-[13px] font-bold">
              {(mom && (mom.playername || mom.name)) || "-"}
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-bg px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">我方均分</div>
            <div className="mt-1 tabular text-[13px] font-bold">{avg}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 rounded-[10px] border-l-[3px] border-pl-purple bg-tint px-3 py-2 text-[13px] font-extrabold text-pl-purple">
          LinKing FC{" "}
          <span className="rounded-full border border-line bg-white px-2 text-[11px] font-semibold text-muted">
            {usList.length} 人
          </span>
        </h3>
        <MatchPlayerTable list={usList} side="us" />
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-2 rounded-[10px] border-l-[3px] border-pl-gray bg-bg px-3 py-2 text-[13px] font-extrabold text-ink">
          {match.opp}{" "}
          <span className="rounded-full border border-line bg-white px-2 text-[11px] font-semibold text-muted">
            {themList.length} 人
          </span>
        </h3>
        <MatchPlayerTable list={themList} side="them" />
      </div>
    </div>
  );
}

export function MatchList({
  matches,
  asCards = false,
}: {
  matches: ShapedMatch[];
  asCards?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={asCards ? "grid gap-3" : ""}>
      {matches.slice(0, 25).map((m) => {
        const open = expandedId === m.id;
        const codeBg =
          m.code === "W" ? "bg-pl-green" : m.code === "L" ? "bg-pl-magenta" : "bg-pl-gray";

        const body = (
          <>
            <button
              type="button"
              onClick={() => setExpandedId(open ? null : m.id)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-row-hover sm:gap-4 sm:px-5 ${
                open ? "bg-tint" : ""
              }`}
            >
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white ${codeBg}`}
              >
                {m.code}
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 md:flex md:gap-6">
                <div className="text-right md:text-left">
                  <div className="text-[13px] font-extrabold">LinKing FC</div>
                  <div className="hidden text-[11px] text-muted md:block">
                    {m.type} · {m.when}
                    {m.dnf ? " · 離線" : ""}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 rounded-full border border-line bg-bg px-3 py-1.5 sm:px-4">
                  <span className="tabular text-[18px] font-black">{m.us}</span>
                  <span className="text-muted">:</span>
                  <span className="tabular text-[18px] font-black">{m.them}</span>
                </div>
                <div>
                  <div className="truncate text-[13px] font-extrabold">{m.opp}</div>
                  <div className="text-[11px] text-muted md:hidden">{m.when}</div>
                </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                    m.code === "W"
                      ? "bg-pl-green/10 text-pl-green"
                      : m.code === "L"
                        ? "bg-pl-magenta/10 text-pl-magenta"
                        : "bg-line text-muted"
                  }`}
                >
                  {m.outcome}
                </span>
              </div>
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                  open ? "border-ink bg-ink text-white" : "border-line text-muted"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition ${open ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </button>
            {open && (
              <div className="border-t border-line bg-bg px-3 py-4 sm:px-5">
                <MatchDetailBody match={m} />
              </div>
            )}
          </>
        );

        if (asCards) {
          return (
            <div key={m.id} className="card shadow-[0_4px_20px_rgba(55,0,60,0.04)]">
              {body}
            </div>
          );
        }

        return (
          <div key={m.id} className="border-b border-line last:border-0">
            {body}
          </div>
        );
      })}
      {!matches.length && <p className="p-4 text-[13px] text-muted">沒有比賽</p>}
    </div>
  );
}
