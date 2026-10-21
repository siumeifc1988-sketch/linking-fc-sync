import type { BoardPlayer } from "../types";

export function initials(name: string): string {
  const s = (name || "?").replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "");
  if (!s) return "?";
  if (/[\u4e00-\u9fff]/.test(s)) return s.slice(0, 2);
  return s.slice(0, 2).toUpperCase();
}

/** One-line highlight from real Pro Clubs totals. Not an attribute score. */
export function seasonHighlight(p: BoardPlayer): string {
  const games = p.games || 0;
  const rating = Number.isFinite(p.avgRating) ? p.avgRating.toFixed(2) : "-";
  if (!games) return `平均評分 ${rating}，尚未有上場場次。`;

  const gpg = p.goalsPerGame ?? p.goals / games;
  const apg = p.assistsPerGame ?? p.assists / games;
  const kpPg = (p.keyPass ?? 0) / games;
  const defPg = (p.totalDef ?? 0) / games;

  if (gpg >= 0.7) return `場均入球 ${gpg.toFixed(2)}（${p.goals} 球 / ${games} 場）。`;
  if (apg >= 0.45 || kpPg >= 3) {
    return `場均助攻 ${apg.toFixed(2)}，直塞 ${p.keyPass ?? 0} 次（${kpPg.toFixed(2)}/場）。`;
  }
  if ((p.passPct ?? 0) >= 80) return `傳球成功率 ${p.passPct}%。`;
  if (defPg >= 5) return `場均防守動作 ${defPg.toFixed(2)}（合計 ${p.totalDef ?? 0}）。`;
  return `平均評分 ${rating}，${games} 場，入球 ${p.goals}、助攻 ${p.assists}。`;
}
