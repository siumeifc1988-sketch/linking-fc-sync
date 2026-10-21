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
};

const HIDE = "hide-sm";

export function PlayerTable({
  data,
  enableSelect = false,
  rowSelection = {},
  onRowSelectionChange,
  maxSelect = 3,
  limit,
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
        meta: { cellClass: "w-10" },
      });
    }
    cols.push(
      {
        id: "idx",
        header: "#",
        cell: ({ row }) => <span className="font-extrabold text-muted">{row.index + 1}</span>,
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "posCN",
        header: "位置",
        cell: ({ getValue }) => (
          <span className="inline-block rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-bold text-muted sm:text-[11px]">
            {String(getValue() || "-")}
          </span>
        ),
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "name",
        header: "球員",
        cell: ({ getValue }) => (
          <strong className="block max-w-[7.5rem] truncate text-[13px] font-bold sm:max-w-none">
            {String(getValue())}
          </strong>
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
      {
        accessorKey: "games",
        header: "場",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span>,
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "goals",
        header: "G",
        cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span>,
      },
      {
        accessorKey: "assists",
        header: "A",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span>,
      },
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
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "passPct",
        header: "傳%",
        cell: ({ getValue }) => {
          const v = getValue() as number | undefined;
          return <span className="tabular font-semibold">{v != null ? `${v}%` : "-"}</span>;
        },
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "keyPass",
        header: "直塞",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "interceptions",
        header: "攔截",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "tk",
        header: "搶截",
        cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue() ?? "-")}</span>,
        meta: { cellClass: HIDE },
      },
      {
        accessorKey: "minutes",
        header: "分",
        cell: ({ getValue }) => <span className="tabular text-muted">{String(getValue() ?? "-")}</span>,
        meta: { cellClass: HIDE },
      },
    );
    return cols;
  }, [enableSelect, maxSelect, rowSelection]);

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

  return (
    <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-0 border-collapse text-[13px] sm:min-w-[560px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const meta = h.column.columnDef.meta as { cellClass?: string } | undefined;
                return (
                  <th
                    key={h.id}
                    className={`whitespace-nowrap bg-ink px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white sm:px-3 ${
                      h.column.getCanSort() ? "cursor-pointer select-none active:bg-pl-purple" : ""
                    } ${h.column.getIsSorted() ? "bg-pl-purple" : ""} ${meta?.cellClass || ""}`}
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ▲", desc: " ▼" }[h.column.getIsSorted() as string] ?? null}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Fragment key={row.id}>
              <tr
                className={`min-h-[48px] cursor-pointer border-b border-line-soft active:bg-tint ${row.getIsExpanded() ? "bg-tint" : ""}`}
                onClick={() => row.toggleExpanded()}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as { cellClass?: string } | undefined;
                  return (
                    <td
                      key={cell.id}
                      className={`px-2 py-3 align-middle sm:px-3 sm:py-2.5 ${meta?.cellClass || ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
              {row.getIsExpanded() && (
                <tr className="border-b border-line bg-bg">
                  <td colSpan={columns.length} className="p-2 sm:p-3">
                    <CumExpand p={row.original} />
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
