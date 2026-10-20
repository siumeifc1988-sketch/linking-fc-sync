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
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-50 bg-pl-purple text-white shadow-md">
        <div className="mx-auto flex h-[52px] max-w-[1180px] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md bg-gradient-to-br from-pl-magenta to-pl-violet text-xs font-extrabold">
              LK
            </div>
            <div>
              <h1 className="m-0 text-[1.05rem] font-extrabold">LinKing FC</h1>
              <p className="m-0 text-[0.68rem] font-medium opacity-70">
                {board
                  ? `歷史 ${board.totalMatches} 場 · 戰報 ${matches.length} 場`
                  : "Pro Clubs · Stats Centre"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["club"] })}
            className="rounded bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/18"
          >
            {isFetching ? "讀取中…" : "重新讀取"}
          </button>
        </div>
        <div className="h-1 bg-gradient-to-r from-pl-magenta via-pl-violet to-pl-magenta" />
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-3">
        <div className="mb-4 flex w-full border-b-2 border-line">
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
              className={`-mb-0.5 border-b-[3px] px-4 py-2.5 text-sm font-semibold ${
                tab === id
                  ? "border-pl-magenta text-pl-purple"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-[#ffc2d4] bg-[#fff0f5] px-4 py-3 font-semibold text-pl-magenta">
            {(error as Error).message}
          </div>
        )}
        {isLoading && <p className="text-muted">載入中…</p>}

        {board && tab === "overview" && (
          <section>
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.95fr]">
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="flex items-center justify-between border-b border-line bg-[#faf8fc] px-4 py-3">
                  <h2 className="m-0 text-sm font-extrabold uppercase text-pl-purple">球員表現</h2>
                  <span className="text-xs text-muted">點欄位排序 · 點列展開</span>
                </div>
                <PlayerTable data={players} limit={8} />
              </div>
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="flex items-center justify-between border-b border-line bg-[#faf8fc] px-4 py-3">
                  <h2 className="m-0 text-sm font-extrabold uppercase text-pl-purple">最近比賽</h2>
                  <span className="text-xs text-muted">點擊展開單場</span>
                </div>
                <MatchList matches={matches.slice(0, 6)} />
              </div>
            </div>
          </section>
        )}

        {board && tab === "all" && (
          <section>
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#faf8fc] px-4 py-3">
                <h2 className="m-0 text-sm font-extrabold uppercase text-pl-purple">全部累計球員榜</h2>
                <span className="text-xs text-muted">勾選最多 3 人對比 · 點列展開明細</span>
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
          <section>
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line bg-[#faf8fc] px-4 py-3">
                <h2 className="m-0 text-sm font-extrabold uppercase text-pl-purple">戰報</h2>
                <span className="text-xs text-muted">點擊列展開單場詳情</span>
              </div>
              <p className="m-0 px-4 pt-2 text-xs text-muted">
                具名欄位以 EA 為準 · 含對手數據 · 事件解碼依研究文件
              </p>
              <MatchList matches={matches} />
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
          React + TanStack Table / Query · 資料每日合併累積 ·{" "}
          <a className="font-semibold text-pl-purple" href="https://github.com/siumeifc1988-sketch/linking-fc-sync">
            GitHub
          </a>
          {board?.lastUpdatedDisplay ? ` · 更新 ${board.lastUpdatedDisplay}` : null}
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
