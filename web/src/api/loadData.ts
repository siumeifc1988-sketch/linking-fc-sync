import type { Board, RawMatch, ShapedMatch } from "../types";
import { CLUB, TYPE, num, whenHK, outcomeFromScore } from "../lib/format";

/** GitHub Pages base — 與 vite.config base 一致 */
const BASE = import.meta.env.BASE_URL; // e.g. /linking-fc-sync/

function dataUrl(path: string): string {
  // path 例如 data/aggregated/board.json
  return `${BASE}${path.replace(/^\//, "")}?t=${Date.now()}`;
}

export function shapeMatches(raw: RawMatch[]): ShapedMatch[] {
  return (raw || [])
    .map((m) => {
      const clubs = m.clubs || {};
      const us = clubs[CLUB];
      if (!us) return null;
      const oppId = Object.keys(clubs).find((id) => id !== CLUB);
      const opp = oppId ? clubs[oppId] : null;
      const gf = num(us.goals);
      const ga = num(us.goalsAgainst);
      const { outcome, code } = outcomeFromScore(gf, ga);
      return {
        id: String(m.matchId ?? m.timestamp),
        type: TYPE[m._matchType || ""] || "比賽",
        when: whenHK(num(m.timestamp)),
        ts: num(m.timestamp),
        us: gf,
        them: ga,
        opp: opp?.details?.name || "對手",
        outcome,
        code,
        dnf: num(us.winnerByDnf) > 0 || num(opp?.winnerByDnf) > 0,
        raw: m,
      } satisfies ShapedMatch;
    })
    .filter(Boolean)
    .sort((a, b) => b!.ts - a!.ts) as ShapedMatch[];
}

export async function loadClubData(): Promise<{ board: Board; matches: ShapedMatch[] }> {
  const [boardRes, matchesRes] = await Promise.all([
    fetch(dataUrl("data/aggregated/board.json"), { cache: "no-store" }),
    fetch(dataUrl("data/matches.json"), { cache: "no-store" }),
  ]);
  if (!boardRes.ok || !matchesRes.ok) {
    throw new Error("讀取資料失敗");
  }
  const board = (await boardRes.json()) as Board;
  const matches = shapeMatches((await matchesRes.json()) as RawMatch[]);
  return { board, matches };
}
