import { Fragment, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import type { BoardPlayer } from "../types";
import { ratingClass } from "../lib/format";
import { CumExpand } from "./StatExpand";

type Props = {
  data: BoardPlayer[];
  enableSelect?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (s: RowSelectionState) => void;
  maxSelect?: number;
  limit?: number;
  onOpenCard?: (p: BoardPlayer) => void;
};

function CardBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="球員卡"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-bg text-[12px] font-extrabold text-pl-purple active:bg-tint"
    >
      卡
    </button>
  );
}

export function PlayerTable({
  data,
  enableSelect = false,
  rowSelection = {},
  onRowSelectionChange,
  maxSelect = 3,
  limit,
  onOpenCard,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "gA", desc: true }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const rows = useMemo(() => {
    const list = data || [];
    return limit ? list.slice(0, limit) : list;
  }, [data, limit]);

  const columns = useMemo<ColumnDef<BoardPlayer>[]>(() => {
    const cols: ColumnDef<BoardPlayer>[] = [];
    if (enableSelect) {
      cols.push({
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-line accent-pl-magenta"
            checked={row.getIsSelected()}
            disabled={!row.getIsSelected() && Object.keys(rowSelection).length >= maxSelect}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      });
    }
    cols.push(
      {
        id: "idx",
        header: "#",
        cell: ({ row }) => <span className="font-extrabold text-muted">{row.index + 1}</span>,
      },
      {
        accessorKey: "posCN",
        header: "位置",
        cell: ({ getValue }) => (
          <span className="inline-block rounded-full bg-bg px-1.5 py-0.5 text-[11px] font-bold text-muted">
            {String(getValue() || "-")}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "球員",
        cell: ({ row, getValue }) => (
          <button
            type="button"
            className="text-left text-[13px] font-bold text-pl-purple underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCard?.(row.original);
            }}
          >
            {String(getValue())}
          </button>
        ),
      },
      {
        accessorKey: "avgRating",
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
      { accessorKey: "games", header: "場", cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span> },
      { accessorKey: "goals", header: "G", cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span> },
      { accessorKey: "assists", header: "A", cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span> },
      {
        accessorKey: "gA",
        header: "G+A",
        cell: ({ getValue }) => (
          <span className="tabular font-bold text-pl-purple">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "shots",
        header: "射",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
      },
      {
        accessorKey: "passPct",
        header: "傳%",
        cell: ({ getValue }) => {
          const v = getValue() as number | undefined;
          return <span className="tabular font-semibold">{v != null ? `${v}%` : "-"}</span>;
        },
      },
      {
        accessorKey: "keyPass",
        header: "直塞",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
      },
      {
        accessorKey: "interceptions",
        header: "攔截",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
      },
      {
        accessorKey: "tk",
        header: "搶截",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
      },
      {
        accessorKey: "minutes",
        header: "分",
        cell: ({ getValue }) => <span className="tabular text-muted">{String(getValue() ?? "-")}</span>,
      },
    );
    if (onOpenCard) {
      cols.push({
        id: "card",
        header: "",
        cell: ({ row }) => <CardBtn onClick={() => onOpenCard(row.original)} />,
      });
    }
    return cols;
  }, [enableSelect, maxSelect, rowSelection, onOpenCard]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, expanded, rowSelection },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => {
          const next = typeof updater === "function" ? updater(rowSelection) : updater;
          const keys = Object.keys(next).filter((k) => next[k]);
          if (keys.length > maxSelect) return;
          onRowSelectionChange(next);
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    enableRowSelection: enableSelect,
    getRowId: (r) => r.name,
  });

  const sorted = table.getRowModel().rows;

  return (
    <>
      {/* 手機：卡片列 */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2 border-b border-line bg-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
          {enableSelect && <span className="w-5" />}
          <span className="flex-1">球員</span>
          <span className="w-12 text-center">評分</span>
          <span className="w-8 text-center">G</span>
          <span className="w-8 text-center">A</span>
          <span className="w-10 text-center">G+A</span>
          {onOpenCard && <span className="w-8" />}
        </div>
        {sorted.map((row) => {
          const p = row.original;
          const open = row.getIsExpanded();
          return (
            <div key={row.id} className="border-b border-line-soft">
              <div
                className={`flex w-full items-center gap-2 px-3 py-3 ${open ? "bg-tint" : ""}`}
              >
                {enableSelect && (
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-line accent-pl-magenta"
                    checked={row.getIsSelected()}
                    disabled={!row.getIsSelected() && Object.keys(rowSelection).length >= maxSelect}
                    onChange={row.getToggleSelectedHandler()}
                  />
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => row.toggleExpanded()}
                >
                  <div className="truncate text-[13px] font-bold text-pl-purple">{p.name}</div>
                  <div className="text-[10px] text-muted">{p.posCN || "-"}</div>
                </button>
                <span
                  className={`inline-flex w-12 shrink-0 justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${ratingClass(Number(p.avgRating))}`}
                >
                  {Number(p.avgRating).toFixed(2)}
                </span>
                <span className="tabular w-8 shrink-0 text-center text-[13px] font-bold">{p.goals}</span>
                <span className="tabular w-8 shrink-0 text-center text-[13px] font-semibold">{p.assists}</span>
                <span className="tabular w-10 shrink-0 text-center text-[13px] font-bold text-pl-purple">{p.gA}</span>
                {onOpenCard && <CardBtn onClick={() => onOpenCard(p)} />}
              </div>
              {open && (
                <div className="bg-bg px-3 pb-3">
                  <CumExpand p={p} />
                  {onOpenCard && (
                    <button
                      type="button"
                      onClick={() => onOpenCard(p)}
                      className="mt-2 h-10 w-full rounded-xl border border-pl-purple/20 bg-pl-purple/5 text-[13px] font-bold text-pl-purple"
                    >
                      打開球員卡
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!sorted.length && <p className="p-4 text-[13px] text-muted">沒有球員</p>}
      </div>

      {/* 桌面表格 */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={`whitespace-nowrap bg-ink px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white ${
                      h.column.getCanSort() ? "cursor-pointer select-none hover:bg-pl-purple" : ""
                    } ${h.column.getIsSorted() ? "bg-pl-purple" : ""}`}
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
                      <CumExpand p={row.original} />
                      {onOpenCard && (
                        <button
                          type="button"
                          onClick={() => onOpenCard(row.original)}
                          className="mt-2 h-10 rounded-xl border border-pl-purple/20 bg-pl-purple/5 px-4 text-[13px] font-bold text-pl-purple"
                        >
                          打開球員卡
                        </button>
                      )}
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
