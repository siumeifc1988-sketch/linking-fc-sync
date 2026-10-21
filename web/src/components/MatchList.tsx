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
            <span
              className={`inline-flex min-w-[2.4rem] justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${ratingClass(r)}`}
            >
              {r.toFixed(2)}
            </span>
          );
        },
      },
      {
        id: "goals",
        accessorFn: (r) => num(r.goals),
        header: "G",
        cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span>,
      },
      {
        id: "assists",
        accessorFn: (r) => num(r.assists),
        header: "A",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span>,
      },
      {
        id: "shots",
        accessorFn: (r) => num(r.shots),
        header: "射",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span>,
      },
      {
        id: "pass",
        accessorFn: (r) => passPct(r),
        header: "傳%",
        cell: ({ getValue }) => (
          <span className="tabular font-semibold">{Math.round(Number(getValue()))}%</span>
        ),
      },
      {
        id: "tk",
        accessorFn: (r) => num(r.tacklesmade ?? r.tacklesMade),
        header: "搶截",
        cell: ({ row }) => {
          const m = num(row.original.tacklesmade ?? row.original.tacklesMade);
          const a = num(row.original.tackleattempts);
          return (
            <span className="tabular font-semibold">
              {m}
              {a ? `/${a}` : ""}
            </span>
          );
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

  const sorted = table.getRowModel().rows;

  return (
    <>
      {/* 手機卡片 */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2 border-b border-line bg-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
          <span className="flex-1">球員</span>
          <span className="w-12 text-center">評分</span>
          <span className="w-8 text-center">G</span>
          <span className="w-8 text-center">A</span>
        </div>
        {sorted.map((row) => {
          const p = row.original;
          const open = row.getIsExpanded();
          const name = p.playername || p.name || "?";
          return (
            <div key={row.id} className="border-b border-line-soft">
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-3 text-left active:bg-tint ${open ? "bg-tint" : ""}`}
                onClick={() => row.toggleExpanded()}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{name}</div>
                  <div className="text-[10px] text-muted">{posLabel(p)}</div>
                </div>
                <span
                  className={`inline-flex w-12 shrink-0 justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${ratingClass(num(p.rating))}`}
                >
                  {num(p.rating).toFixed(2)}
                </span>
                <span className="tabular w-8 shrink-0 text-center text-[13px] font-bold">{num(p.goals)}</span>
                <span className="tabular w-8 shrink-0 text-center text-[13px] font-semibold">
                  {num(p.assists)}
                </span>
              </button>
              {open && (
                <div className="bg-bg px-3 pb-3">
                  <MatchPlayerExpand p={p} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 桌面表格 */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={`cursor-pointer select-none whitespace-nowrap bg-ink px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-white ${h.column.getIsSorted() ? "bg-pl-purple" : ""}`}
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
            {sorted.map((row) => (
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
                    <td colSpan={columns.length} className="p-3">
                      <MatchPlayerExpand p={row.original} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
    <div className="w-full space-y-3 p-0.5 sm:space-y-4">
      <div className="grid gap-2 border-b border-line pb-3 sm:grid-cols-[auto_1fr] sm:gap-3">
        <div className="rounded-[14px] bg-gradient-to-br from-pl-purple to-[#4a1450] px-4 py-3 text-center text-white shadow sm:px-5 sm:py-4">
          <div className="tabular text-[26px] font-black tracking-tight sm:text-[28px]">
            {match.us}:{match.them}
          </div>
          <div className="mt-1 truncate text-[11px] opacity-85">vs {match.opp}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[12px] border border-line bg-bg px-2 py-2 sm:px-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted sm:text-[10px]">結果</div>
            <div className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
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
          <div className="rounded-[12px] border border-line bg-bg px-2 py-2 sm:px-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted sm:text-[10px]">MOTM</div>
            <div className="mt-1 truncate text-[12px] font-bold sm:text-[13px]">
              {(mom && (mom.playername || mom.name)) || "-"}
            </div>
          </div>
          <div className="rounded-[12px] border border-line bg-bg px-2 py-2 sm:px-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted sm:text-[10px]">均分</div>
            <div className="mt-1 tabular text-[12px] font-bold sm:text-[13px]">{avg}</div>
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
          <span className="truncate">{match.opp}</span>{" "}
          <span className="shrink-0 rounded-full border border-line bg-white px-2 text-[11px] font-semibold text-muted">
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
    <div className={asCards ? "grid gap-2.5 sm:gap-3" : ""}>
      {matches.slice(0, 25).map((m) => {
        const open = expandedId === m.id;
        const codeBg =
          m.code === "W" ? "bg-pl-green" : m.code === "L" ? "bg-pl-magenta" : "bg-pl-gray";

        const body = (
          <>
            <button
              type="button"
              onClick={() => setExpandedId(open ? null : m.id)}
              className={`flex min-h-[56px] w-full items-center gap-2.5 px-3 py-3 text-left active:bg-tint sm:gap-4 sm:px-5 sm:py-3.5 ${
                open ? "bg-tint" : ""
              }`}
            >
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white sm:h-9 sm:w-9 ${codeBg}`}
              >
                {m.code}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-bg px-2.5 py-1">
                    <span className="tabular text-[16px] font-black sm:text-[18px]">{m.us}</span>
                    <span className="text-muted">:</span>
                    <span className="tabular text-[16px] font-black sm:text-[18px]">{m.them}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-extrabold">{m.opp}</div>
                    <div className="truncate text-[10px] text-muted sm:text-[11px]">
                      {m.type} · {m.when}
                      {m.dnf ? " · 離線" : ""}
                    </div>
                  </div>
                </div>
              </div>
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
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
              <div className="border-t border-line bg-bg px-2.5 py-3 sm:px-5 sm:py-4">
                <MatchDetailBody match={m} />
              </div>
            )}
          </>
        );

        if (asCards) {
          return (
            <div key={m.id} className="card">
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
