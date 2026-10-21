import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => qc.invalidateQueries({ queryKey: ["club"] })}
            className="h-9 shrink-0 rounded-full border-0 bg-white/10 px-3 text-[12px] font-bold text-white hover:bg-white/20 hover:text-white"
          >
            {isFetching ? "…" : "更新"}
          </Button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-pl-magenta via-pl-violet to-pl-magenta sm:h-1" />
      </header>

      <main className="mx-auto max-w-[1280px] px-3 py-3 sm:px-4 sm:py-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-3 sm:gap-5">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-[12px] border border-line bg-card p-1 shadow-sm sm:rounded-[14px]">
            {(
              [
                ["overview", "總覽"],
                ["all", "累計"],
                ["matches", "戰報"],
              ] as const
            ).map(([id, label]) => (
              <TabsTrigger
                key={id}
                value={id}
                className="min-h-[44px] rounded-[10px] text-[13px] font-bold data-active:bg-ink data-active:text-white"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

        {error && (
          <div className="mb-3 rounded-[12px] border border-pl-magenta/20 bg-pink-soft px-3 py-3 text-[13px] font-semibold text-pl-magenta">
            {(error as Error).message}
          </div>
        )}
        {isLoading && <p className="text-[13px] text-muted-foreground@@FG@@">載入中…</p>}

        {board && (
          <TabsContent value="overview" className="space-y-3 sm:space-y-4">
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.4fr_0.95fr]">
              <Card className="gap-0 py-0">
                <CardHeader className="border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
                  <CardTitle className="flex items-center gap-2 text-[13px] font-extrabold sm:text-[14px]">
                    <span className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                    球員表現
                  </CardTitle>
                  <CardAction className="text-[11px] font-semibold text-muted-foreground@@FG@@">點名開卡</CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  <PlayerTable data={players} limit={8} onOpenCard={setCardPlayer} />
                </CardContent>
              </Card>
              <Card className="gap-0 py-0">
                <CardHeader className="border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
                  <CardTitle className="flex items-center gap-2 text-[13px] font-extrabold sm:text-[14px]">
                    <span className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                    最近比賽
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <MatchList matches={matches.slice(0, 6)} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {board && (
          <TabsContent value="all" className="space-y-3 sm:space-y-4">
            <RecordStrip record={board.record} />
            <FormDots form={board.record?.form} />
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-line bg-tint px-3 py-3 sm:px-5 sm:py-3.5">
                <CardTitle className="flex items-center gap-2 text-[13px] font-extrabold sm:text-[14px]">
                  <span className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                  全部累計
                </CardTitle>
                <CardAction className="text-[11px] font-semibold text-muted-foreground@@FG@@">點名開卡 · 勾選對比</CardAction>
              </CardHeader>
              <CardContent className="px-0">
              <PlayerTable
                data={players}
                enableSelect
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                maxSelect={3}
                onOpenCard={setCardPlayer}
              />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="matches" className="space-y-3 sm:space-y-4">
            <Card className="flex flex-row flex-wrap items-center justify-between gap-3 px-3 py-3.5 sm:p-5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-1 rounded-full bg-pl-magenta" />
                <h2 className="m-0 text-[13px] font-extrabold sm:text-[14px]">戰報</h2>
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground@@FG@@">
                  {matches.length} 場
                </span>
              </div>
              <FormDots form={board?.record?.form || matches.slice(0, 10).map((m) => m.code)} compact />
            </Card>
            <MatchList matches={matches} asCards />
        </TabsContent>
        </Tabs>

        <footer className="mt-8 border-t border-border py-5 text-[10px] leading-relaxed text-muted-foreground@@FG@@ sm:mt-12 sm:text-[11px]">
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
        <PlayerCardModal player={cardPlayer} matches={matches} onClose={() => setCardPlayer(null)} />
      )}
    </div>
  );
}
