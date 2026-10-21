import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { loadClubData } from "./api/loadData";
import { FormDots, RecordStrip } from "./components/RecordStrip";
import { PlayerTable } from "./components/PlayerTable";
import { MatchList } from "./components/MatchList";
import { CompareBar, ComparePanel } from "./components/ComparePanel";
import { PlayerCardModal } from "./components/PlayerCardModal";
import type { BoardPlayer } from "./types";

type Tab = "overview" | "all" | "matches";

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [compareOpen, setCompareOpen] = useState(false);
  const [cardPlayer, setCardPlayer] = useState<BoardPlayer | null>(null);
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
    <div className="min-h-[100dvh] overflow-x-clip pb-24 safe-pb">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-pl-purple text-white shadow-[0_8px_24px_rgba(55,0,60,0.25)] safe-pt">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-3 sm:h-16 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-pl-magenta to-pl-violet text-[11px] font-extrabold shadow-md sm:h-9 sm:w-9 sm:text-[12px]">
              LK
            </div>
            <div className="min-w-0">
              <h1 className="m-0 truncate text-[14px] font-extrabold tracking-tight sm:text-[15px]">
                LinKing FC
              </h1>
              <p className="m-0 truncate text-[10px] font-semibold text-white/70 sm:text-[11px]">
                {board
                  ? `${board.totalMatches} 場 · 戰報 ${matches.length}`
                  : "Pro Clubs · Stats"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["club"] })}
            className="h-9 shrink-0 rounded-full bg-white/10 px-3 text-[12px] font-bold active:bg-white/20"
          >
            {isFetching ? "…" : "更新"}
          </button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-pl-magenta via-pl-violet to-pl-magenta sm:h-1" />
      </header>

      <main className="mx-auto max-w-[1280px] px-3 py-3 sm:px-4 sm:py-5">
        <div className="mb-3 flex gap-1 rounded-[12px] border border-line bg-white p-1 shadow-sm sm:mb-5 sm:rounded-[14px]">
          {(
            [
              ["overview", "總覽"],
              ["all", "累計"],
              ["matches", "戰報"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-[44px] flex-1 rounded-[10px] px-2 text-[13px] font-bold transition active:scale-[0.98] sm:px-3 ${
                tab === id ? "bg-ink text-white shadow-sm" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 rounded-[12px] border border-pl-magenta/20 bg-pink-soft px-3 py-3 text-[13px] font-semibold text-pl-magenta">
            {(error as Error).message}
          </div>
        )}
        {isLoading && <p className="text-[13px] text-muted">載入中…</p>}

        {board && tab === "overview" && (
          <section className="space-y-3 sm:space-y-4">
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.4fr_0.95fr]">
              <div className="card">
                <div className="flex items-center justify-between border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                    <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">球員表現</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-muted">點名開卡</span>
                </div>
                <PlayerTable data={players} limit={8} onOpenCard={setCardPlayer} />
              </div>
              <div className="card">
                <div className="flex items-center justify-between border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                    <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">最近比賽</h2>
                  </div>
                </div>
                <MatchList matches={matches.slice(0, 6)} />
              </div>
            </div>
          </section>
        )}

        {board && tab === "all" && (
          <section className="space-y-3 sm:space-y-4">
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                  <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">全部累計</h2>
                </div>
                <span className="text-[11px] font-semibold text-muted">點名開卡 · 勾選對比</span>
              </div>
              <PlayerTable
                data={players}
                enableSelect
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                maxSelect={3}
                onOpenCard={setCardPlayer}
              />
            </div>
          </section>
        )}

        {tab === "matches" && (
          <section className="space-y-3 sm:space-y-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 px-3 py-3.5 sm:p-5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">戰報</h2>
                <span className="rounded-full border border-line bg-bg px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {matches.length} 場
                </span>
              </div>
              <FormDots form={board?.record?.form || matches.slice(0, 10).map((m) => m.code)} compact />
            </div>
            <MatchList matches={matches} asCards />
          </section>
        )}

        <footer className="mt-8 border-t border-line py-5 text-[10px] leading-relaxed text-muted sm:mt-12 sm:text-[11px]">
          <div>LinKing FC Stats · GitHub Pages</div>
          {board?.lastUpdatedDisplay ? <div className="mt-1">更新 {board.lastUpdatedDisplay}</div> : null}
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
      {cardPlayer && (
        <PlayerCardModal
          player={cardPlayer}
          squad={players}
          clubMatches={board?.totalMatches}
          matches={matches}
          onClose={() => setCardPlayer(null)}
        />
      )}
    </div>
  );
}
