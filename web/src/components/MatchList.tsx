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
          <span className="inline-block rounded bg-[#f0ebf5] px-1.5 py-0.5 text-[0.66rem] font-bold text-pl-purple">
            {posLabel(row.original)}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (r) => r.playername || r.name || "?",
        header: "球員",
        cell: ({ getValue }) => <strong>{String(getValue())}</strong>,
      },
      {
        id: "rating",
        accessorFn: (r) => num(r.rating),
        header: "評分",
        cell: ({ getValue }) => {
          const r = Number(getValue());
          return (
            <span className={`inline-flex min-w-[2.5rem] justify-center rounded px-1.5 py-0.5 text-[0.82rem] font-extrabold ${ratingClass(r)}`}>
              {r.toFixed(2)}
            </span>
          );
        },
      },
      { id: "goals", accessorFn: (r) => num(r.goals), header: "G", cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span> },
      { id: "assists", accessorFn: (r) => num(r.assists), header: "A", cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span> },
      { id: "shots", accessorFn: (r) => num(r.shots), header: "射", cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span> },
      {
        id: "pass",
        accessorFn: (r) => passPct(r),
        header: "傳%",
        cell: ({ getValue }) => <span className="tabular font-bold">{Math.round(Number(getValue()))}%</span>,
      },
      {
        id: "tk",
        accessorFn: (r) => num(r.tacklesmade ?? r.tacklesMade),
        header: "搶截",
        cell: ({ row }) => {
          const m = num(row.original.tacklesmade ?? row.original.tacklesMade);
          const a = num(row.original.tackleattempts);
          return <span className="tabular font-bold">{m}{a ? `/${a}` : ""}</span>;
        },
      },
      {
        id: "mins",
        accessorFn: (r) => Math.round(num(r.secondsPlayed ?? r.gameTime) / 60),
        header: "分",
        cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue() || "-")}</span>,
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
    return <p className="py-2 text-sm text-muted">沒有球員細項</p>;
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[480px] border-collapse text-[0.84rem] sm:min-w-[520px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className={`cursor-pointer select-none whitespace-nowrap bg-pl-purple px-1.5 py-2 text-left text-[0.6rem] font-bold uppercase tracking-wider text-white hover:bg-[#4a1550] ${
                    h.column.getIsSorted() ? "bg-[#5a1a62]" : ""
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
                className={`cursor-pointer border-b border-line hover:bg-row-hover ${row.getIsExpanded() ? "bg-[#f3eef8]" : ""}`}
                onClick={() => row.toggleExpanded()}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-1.5 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr className="border-b border-line bg-[#faf8fc]">
                  <td colSpan={columns.length} className="p-2 sm:px-3 sm:py-3">
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
        <div className="rounded-lg bg-gradient-to-br from-pl-purple to-[#4a1550] px-4 py-3 text-center text-white shadow">
          <div className="tabular text-3xl font-extrabold tracking-tight">
            {match.us}-{match.them}
          </div>
          <div className="mt-0.5 text-xs opacity-85">vs {match.opp}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-[#f7f4fa] px-2 py-2">
            <div className="text-[0.6rem] font-bold uppercase text-muted">結果</div>
            <div className="font-bold">
              <span
                className={`mr-1 inline-flex rounded px-1.5 text-xs font-extrabold text-white ${
                  match.code === "W" ? "bg-pl-green" : match.code === "L" ? "bg-pl-magenta" : "bg-[#8a8496]"
                }`}
              >
                {match.outcome}
              </span>
            </div>
          </div>
          <div className="rounded-md border border-line bg-[#f7f4fa] px-2 py-2">
            <div className="text-[0.6rem] font-bold uppercase text-muted">MOTM</div>
            <div className="truncate text-sm font-bold">
              {(mom && (mom.playername || mom.name)) || "-"}
            </div>
          </div>
          <div className="rounded-md border border-line bg-[#f7f4fa] px-2 py-2">
            <div className="text-[0.6rem] font-bold uppercase text-muted">我方均分</div>
            <div className="tabular font-bold">{avg}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 rounded-md border-l-[3px] border-pl-purple bg-[#f3eef8] px-2.5 py-2 text-sm font-extrabold text-pl-purple">
          LinKing FC <span className="rounded-full bg-white/70 px-2 text-xs font-semibold text-muted">{usList.length} 人</span>
        </h3>
        <MatchPlayerTable list={usList} side="us" />
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-2 rounded-md border-l-[3px] border-[#8a8496] bg-[#f2f2f4] px-2.5 py-2 text-sm font-extrabold text-[#4a4458]">
          {match.opp} <span className="rounded-full bg-white/70 px-2 text-xs font-semibold text-muted">{themList.length} 人</span>
        </h3>
        <MatchPlayerTable list={themList} side="them" />
      </div>
    </div>
  );
}

export function MatchList({ matches }: { matches: ShapedMatch[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {matches.slice(0, 25).map((m) => {
        const open = expandedId === m.id;
        const scoreCls =
          m.code === "W" ? "bg-pl-green" : m.code === "L" ? "bg-pl-magenta" : "bg-[#6b6578]";
        return (
          <div key={m.id} className="border-b border-line last:border-0">
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-row-hover ${open ? "bg-row-hover" : ""}`}
              onClick={() => setExpandedId(open ? null : m.id)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`min-w-[4.2rem] rounded-md px-2 py-1.5 text-center text-lg font-extrabold tabular text-white ${scoreCls}`}>
                  {m.us} <span className="opacity-75">-</span> {m.them}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-bold">
                    <span
                      className={`mr-1.5 inline-flex rounded px-1.5 text-[0.64rem] font-extrabold text-white ${
                        m.code === "W" ? "bg-pl-green" : m.code === "L" ? "bg-pl-magenta" : "bg-[#8a8496]"
                      }`}
                    >
                      {m.outcome}
                    </span>
                    {m.opp}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {m.type} · {m.when}
                    {m.dnf ? " · 離線" : ""}
                  </div>
                </div>
              </div>
              <span className={`text-xl font-light text-muted ${open ? "text-pl-purple" : ""}`}>
                {open ? "▾" : "›"}
              </span>
            </button>
            {open && (
              <div className="border-t border-line bg-[#faf8fc] px-2 py-3 sm:px-3 sm:py-4">
                <MatchDetailBody match={m} />
              </div>
            )}
          </div>
        );
      })}
      {!matches.length && <p className="p-4 text-sm text-muted">沒有比賽</p>}
    </div>
  );
}
