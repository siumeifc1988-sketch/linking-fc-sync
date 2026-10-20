import type { MatchPlayerRaw } from "../types";
import { num } from "./format";

export const EV: Record<number, string> = {
  215: "成功傳球",
  216: "失敗傳球",
  30: "向前傳",
  32: "向後傳",
  34: "橫傳",
  36: "傳中成功",
  152: "直塞成功",
  143: "一腳出球",
  217: "射正",
  218: "射偏",
  13: "禁區內射正",
  18: "禁區外射正",
  174: "盤球成功",
  97: "帶球推進",
  0: "搶截成功",
  1: "搶截失敗",
  6: "攔截",
  156: "封堵傳中",
  265: "進攻頭錘勝",
  266: "防守頭錘勝",
  111: "站位好",
  219: "站位差",
  105: "後場失球權",
  106: "中場失球權",
  107: "前場失球權",
  108: "後場奪回",
  109: "中場奪回",
  110: "前場奪回",
};

export function decodeEvents(p: MatchPlayerRaw): Record<number, number> {
  const out: Record<number, number> = {};
  for (let i = 0; i < 4; i++) {
    const s = p[`match_event_aggregate_${i}`];
    if (!s || typeof s !== "string") continue;
    s.split(",").forEach((part) => {
      const [k, v] = part.split(":");
      const id = parseInt(k, 10);
      const c = parseFloat(v);
      if (!isNaN(id) && !isNaN(c)) out[id] = c;
    });
  }
  return out;
}

export function passPct(p: MatchPlayerRaw): number {
  const pm = num(p.passesmade ?? p.passesMade);
  const pa = num(p.passattempts ?? p.passAttempts);
  return pa > 0 ? (pm / pa) * 100 : 0;
}
