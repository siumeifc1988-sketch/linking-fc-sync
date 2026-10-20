import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { loadClubData } from "./api/loadData";
import { FormDots, RecordStrip } from "./components/RecordStrip";
import { PlayerTable } from "./components/PlayerTable";
import { MatchList } from "./components/MatchList";
import { CompareBar, ComparePanel } from "./components/ComparePanel";
import type { BoardPlayer } from "./types";

type Tab = "overview" | "all" | "matches";

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [compareOpen, setCompareOpen] = useState(false);
  const qc = useQueryClient();

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ["club"],
    queryFn: loadClubData,
    staleTime: 60_000,
  });

  const board = data?.board;
  const matches = data?.matches || [];
  const players = board?.players || [];

  const selectedPlayers: BoardPlayer[] = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((name) => players.find((p) => p.name === name))
      .filter(Boolean) as BoardPlayer[];
  }, [rowSelection, players]);

  return (
    <div className="min-h-screen overflow-x-clip pb-28">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-pl-purple text-white shadow-[0_8px_24px_rgba(55,0,60,0.25)]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-pl-magenta to-pl-violet text-[12px] font-extrabold shadow-md">
              LK
            </div>
            <div>
              <h1 className="m-0 text-[15px] font-extrabold tracking-tight">LinKing FC</h1>
              <p className="m-0 text-[11px] font-semibold text-white/70">
                {board
                  ? `歷史 ${board.totalMatches} 場 · 戰報 ${matches.length} 場`
                  : "Pro Clubs · Stats Centre"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["club"] })}
            className="h-8 rounded-full bg-white/10 px-3 text-[12px] font-bold hover:bg-white/18"
          >
            {isFetching ? "讀取中…" : "重新讀取"}
          </button>
        </div>
        <div className="h-1 bg-gradient-to-r from-pl-magenta via-pl-violet to-pl-magenta" />
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-5">
        <div className="mb-5 flex gap-1 rounded-[14px] border border-line bg-white p-1 shadow-sm">
          {(
            [
              ["overview", "總覽"],
              ["all", "全部累計"],
              ["matches", "戰報"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-[10px] px-3 py-2.5 text-[13px] font-bold transition ${
                tab === id
                  ? "bg-ink text-white shadow-sm"
                  : "text-muted hover:bg-bg hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-[12px] border border-pl-magenta/20 bg-pink-soft px-4 py-3 text-[13px] font-semibold text-pl-magenta">
            {(error as Error).message}
          </div>
        )}
        {isLoading && <p className="text-[13px] text-muted">載入中…</p>}

        {board && tab === "overview" && (
          <section className="space-y-4">
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.95fr]">
              <div className="card">
                <div className="flex items-center justify-between border-b border-line bg-tint px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 rounded-full bg-pl-magenta" />
                    <h2 className="m-0 text-[14px] font-extrabold">球員表現</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-muted">點欄位排序 · 點列展開</span>
                </div>
                <PlayerTable data={players} limit={8} />
              </div>
              <div className="card">
                <div className="flex items-center justify-between border-b border-line bg-tint px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-1 rounded-full bg-pl-magenta" />
                    <h2 className="m-0 text-[14px] font-extrabold">最近比賽</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-muted">點擊展開</span>
                </div>
                <MatchList matches={matches.slice(0, 6)} />
              </div>
            </div>
          </section>
        )}

        {board && tab === "all" && (
          <section className="space-y-4">
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-tint px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 rounded-full bg-pl-magenta" />
                  <h2 className="m-0 text-[14px] font-extrabold">全部累計球員榜</h2>
                </div>
                <span className="rounded-full border border-line bg-bg px-2 py-0.5 text-[11px] font-semibold text-muted">
                  勾選最多 3 人對比 · 點列展開
                </span>
              </div>
              <PlayerTable
                data={players}
                enableSelect
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                maxSelect={3}
              />
            </div>
          </section>
        )}

        {tab === "matches" && (
          <section className="space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="h-4 w-1 rounded-full bg-pl-magenta" />
                <h2 className="m-0 text-[14px] font-extrabold">戰報 · 全部比賽</h2>
                <span className="rounded-full border border-line bg-bg px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {matches.length} 場
                </span>
              </div>
              <FormDots form={(board?.record?.form || matches.slice(0, 10).map((m) => m.code))} compact />
            </div>
            <MatchList matches={matches} asCards />
          </section>
        )}

        <footer className="mt-12 flex flex-wrap justify-between gap-4 border-t border-line py-6 text-[11px] text-muted">
          <span>LinKing FC Stats Centre · React + TanStack Table / Query · GitHub Pages</span>
          <span>
            <a className="font-semibold text-pl-purple" href="https://github.com/siumeifc1988-sketch/linking-fc-sync">
              GitHub
            </a>
            {board?.lastUpdatedDisplay ? ` · 更新 ${board.lastUpdatedDisplay}` : null}
          </span>
        </footer>
      </main>

      <CompareBar
        selected={selectedPlayers}
        onClear={() => {
          setRowSelection({});
          setCompareOpen(false);
        }}
        onOpen={() => setCompareOpen(true)}
      />
      {compareOpen && selectedPlayers.length >= 2 && (
        <ComparePanel players={selectedPlayers} onClose={() => setCompareOpen(false)} />
      )}
    </div>
  );
}
