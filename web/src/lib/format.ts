import type { FormCode, MatchPlayerRaw } from "../types";

export const CLUB = "41026";

export const TYPE: Record<string, string> = {
  leagueMatch: "聯賽",
  playoffMatch: "季後賽",
  friendlyMatch: "友誼賽",
};

export const POS: Record<string, string> = {
  forward: "前鋒",
  midfielder: "中場",
  defender: "後衛",
  goalkeeper: "門將",
};

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function whenHK(ts: number): string {
  if (!ts) return "-";
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts * 1000));
}

export function ratingClass(r: number): string {
  if (r >= 8) return "bg-pl-green text-white";
  if (r >= 7) return "bg-pl-gold text-[#1a1200]";
  if (r >= 6) return "bg-[#8a8496] text-white";
  return "bg-pl-magenta text-white";
}

export function posKey(p: MatchPlayerRaw): string {
  const s = String(p.pos || "").toLowerCase();
  if (s.includes("goal") || s === "gk") return "goalkeeper";
  if (s.includes("def")) return "defender";
  if (s.includes("mid")) return "midfielder";
  if (s.includes("for") || s.includes("att") || s.includes("st")) return "forward";
  return s || "midfielder";
}

export function posLabel(p: MatchPlayerRaw): string {
  return POS[posKey(p)] || String(p.pos || "");
}

export function outcomeFromScore(gf: number, ga: number): { outcome: string; code: FormCode } {
  if (gf > ga) return { outcome: "勝", code: "W" };
  if (gf < ga) return { outcome: "負", code: "L" };
  return { outcome: "和", code: "D" };
}

export function fmtPct(n: number): string {
  return `${Math.round(Number.isFinite(n) ? n : 0)}%`;
}

export function fmtRatio(a: number, b: number): string {
  return `${num(a)} / ${num(b)}`;
}
