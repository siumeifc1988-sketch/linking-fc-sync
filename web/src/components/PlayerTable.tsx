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
            className="h-4 w-4 rounded border-line accent-pl-magenta"
            checked={row.getIsSelected()}
            disabled={!row.getIsSelected() && Object.keys(rowSelection).length >= maxSelect}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 36,
      });
    }
    cols.push(
      {
        id: "idx",
        header: "#",
        cell: ({ row }) => <span className="font-extrabold text-muted">{row.index + 1}</span>,
        size: 40,
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
        cell: ({ getValue }) => <strong className="text-[13px] font-bold">{String(getValue())}</strong>,
      },
      {
        accessorKey: "avgRating",
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
      { accessorKey: "games", header: "場", cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span> },
      { accessorKey: "goals", header: "G", cell: ({ getValue }) => <span className="tabular font-bold">{String(getValue())}</span> },
      { accessorKey: "assists", header: "A", cell: ({ getValue }) => <span className="tabular font-semibold">{String(getValue())}</span> },
      { accessorKey: "gA", header: "G+A", cell: ({ getValue }) => <span className="tabular font-bold text-pl-purple">{String(getValue())}</span> },
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
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
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
