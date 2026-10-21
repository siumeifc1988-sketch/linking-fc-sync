import type { BoardPlayer, ShapedMatch } from "../types";
import { CLUB, num } from "./format";

export type SixAttr = {
  PAC: number;
  SHO: number;
  PAS: number;
  DRI: number;
  DEF: number;
  PHY: number;
};

function clamp(n: number, min = 40, max = 99): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** 把實戰數值線性映射到能力分（錨點依 Pro Clubs 常見區間） */
function mapRange(v: number, lo: number, hi: number, outLo = 48, outHi = 92): number {
  if (!Number.isFinite(v)) return outLo;
  const t = Math.max(0, Math.min(1, (v - lo) / Math.max(0.0001, hi - lo)));
  return clamp(outLo + t * (outHi - outLo));
}

/**
 * 由 Pro Clubs 累計數據推算 40–99 能力分。
 * 權重以「場均效率 + 成功率」為主，貼近實戰表現（非官方 FUT 屬性）。
 *
 * PAC 活動量｜SHO 射門效率｜PAS 傳球組織｜DRI 盤帶頻率｜DEF 防守動作｜PHY 體能出勤
 */
export function deriveSix(p: BoardPlayer): SixAttr {
  const g = Math.max(1, p.games || 1);
  const mins = Math.max(1, p.minutes || g * 60);
  const minPg = mins / g;

  const gpg = p.goalsPerGame ?? p.goals / g;
  const apg = p.assistsPerGame ?? p.assists / g;
  const shots = p.shots || 0;
  const shotsOn = p.shotsOn || 0;
  const shotAcc = shots > 0 ? shotsOn / shots : 0;
  const spg = shots / g;
  const xgPg = (p.xg || 0) / g;

  const passPct = p.passPct ?? 65;
  const kpPg = (p.keyPass || 0) / g;
  const dpg = (p.dribbles || 0) / g;
  const tk = p.tk || 0;
  const tkLost = p.tacklesLost || 0;
  const tkPg = tk / g;
  const intPg = (p.interceptions || 0) / g;
  const defPg = (p.totalDef || tk + (p.interceptions || 0)) / g;
  const tkSucc = tk + tkLost > 0 ? tk / (tk + tkLost) : 0.5;
  const aerialPg = (p.aerialDef || 0) / g;

  // 每 90 分鐘動作量（活動／推進代理，非真實速度）
  const actionsPer90 = ((p.dribbles || 0) + tk + (p.interceptions || 0) + (p.keyPass || 0)) / (mins / 90);

  // —— SHO：進球效率為主，射正率與 xG 為輔 ——
  // 場均 0 球≈50、0.4≈68、0.8≈82、1.2+≈92
  let SHO = mapRange(gpg, 0, 1.2, 50, 92);
  SHO = clamp(SHO + shotAcc * 8 + Math.min(6, xgPg * 5) + Math.min(4, spg));

  // —— PAS：傳球成功率為主，直塞／助攻加分 ——
  // 65%≈58、75%≈72、85%≈88
  let PAS = mapRange(passPct, 60, 88, 52, 90);
  PAS = clamp(PAS + Math.min(8, kpPg * 3) + Math.min(6, apg * 10));

  // —— DRI：場均盤帶次數 ——
  // 5≈55、12≈72、22≈90
  const DRI = mapRange(dpg, 3, 22, 50, 90);

  // —— DEF：場均防守動作 + 搶截成功率 ——
  // 2 次≈55、5 次≈72、9 次≈90
  let DEF = mapRange(defPg, 1.5, 9, 48, 90);
  DEF = clamp(DEF + (tkSucc - 0.45) * 18 + Math.min(4, intPg));

  // —— PHY：場均上場時間 + 頭錘防守（出勤／對抗代理）——
  // 50 分≈55、75 分≈72、90 分≈85
  let PHY = mapRange(minPg, 40, 95, 52, 88);
  PHY = clamp(PHY + Math.min(8, aerialPg * 4) + Math.min(4, g / 15));

  // —— PAC：每 90 分鐘有效動作量（活動節奏，非 sprint 速度）——
  // 15≈55、35≈72、55≈90
  const PAC = mapRange(actionsPer90, 12, 55, 50, 90);

  return { PAC, SHO, PAS, DRI, DEF, PHY };
}

/** 總評：賽季均分權重 55% + 六維平均 45% */
export function overallFromPlayer(p: BoardPlayer): number {
  const six = deriveSix(p);
  const sixAvg = (six.PAC + six.SHO + six.PAS + six.DRI + six.DEF + six.PHY) / 6;
  const fromRating = clamp((p.avgRating || 6.5) * 10, 50, 96);
  return clamp(fromRating * 0.55 + sixAvg * 0.45, 50, 96);
}

export function posShort(posCN?: string): string {
  if (!posCN) return "CM";
  if (posCN.includes("前")) return "ST";
  if (posCN.includes("後")) return "CB";
  if (posCN.includes("門")) return "GK";
  return "CAM";
}

export function initials(name: string): string {
  const s = (name || "?").replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "");
  if (!s) return "?";
  if (/[\u4e00-\u9fff]/.test(s)) return s.slice(0, 2);
  return s.slice(0, 2).toUpperCase();
}

export function nameTag(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const src = parts.length > 1 ? parts[parts.length - 1]! : parts[0] || "?";
  const latin = src.replace(/[^A-Za-z0-9]/g, "");
  if (latin.length >= 2) return latin.slice(0, 4).toUpperCase();
  return [...src].slice(0, 2).join("") || "?";
}

/** 卡面大字：有姓氏用姓，否則用玩家名稱 */
export function cardNameLines(name: string): { big: string; small: string } {
  const clean = (name || "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return { big: parts[parts.length - 1]!.toUpperCase(), small: clean.toUpperCase() };
  }
  return { big: clean.toUpperCase(), small: "" };
}

export type PlayerImpact = {
  appearances: number;
  wins: number;
  draws: number;
  losses: number;
  mom: number;
  /** 勝場 / 有出場紀錄的比賽。沒有樣本時為 null。 */
  winPct: number | null;
};

/** 從已載入的戰報彙總個人勝率和全場最佳，不改寫 data/*.json。 */
export function playerImpact(name: string, matches: ShapedMatch[] | undefined): PlayerImpact {
  const target = name.trim().toLowerCase();
  let appearances = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let mom = 0;
  for (const match of matches || []) {
    const bucket = match.raw.players?.[CLUB];
    const list = Array.isArray(bucket) ? bucket : bucket ? Object.values(bucket) : [];
    for (const raw of list) {
      const n = String(raw.playername || raw.name || "").trim().toLowerCase();
      if (n !== target) continue;
      appearances += 1;
      const w = num(raw.wins);
      const l = num(raw.losses);
      if (w > 0) wins += 1;
      else if (l > 0) losses += 1;
      else draws += 1;
      if (num(raw.mom) > 0) mom += 1;
      break;
    }
  }
  return {
    appearances,
    wins,
    draws,
    losses,
    mom,
    winPct: appearances > 0 ? Math.round((wins / appearances) * 100) : null,
  };
}

/** 傳球成功率：有成功/嘗試次數時顯示一位小數。 */
export function passAccuracyLabel(p: BoardPlayer): string {
  const pa = p.pa ?? 0;
  const pm = p.pm ?? 0;
  if (pa > 0) return `${((pm / pa) * 100).toFixed(1)}%`;
  if (p.passPct != null) return `${p.passPct}%`;
  return "—";
}

/** 由向前 / 向後 / 橫傳次數描述傾向。樣本太少則不標。 */
export function passStyleLabel(p: BoardPlayer): string | null {
  const fwd = p.passFwd || 0;
  const back = p.passBack || 0;
  const side = p.passSide || 0;
  const total = fwd + back + side;
  if (total < 8) return null;
  const f = fwd / total;
  const b = back / total;
  const s = side / total;
  if (f >= 0.48) return "向前為主";
  if (b >= 0.4) return "回傳為主";
  if (s >= 0.38) return "橫傳為主";
  if (f <= 0.4) return "短傳為主";
  return "均衡傳球";
}

export function coachTip(p: BoardPlayer, six: SixAttr): string {
  const g = Math.max(1, p.games || 1);
  const gpg = p.goalsPerGame ?? p.goals / g;
  const apg = p.assistsPerGame ?? p.assists / g;
  const kpPg = (p.keyPass || 0) / g;

  if (gpg >= 0.7) return "進球效率極高，建議主打禁區終結，減少過深回撤。";
  if (apg >= 0.45 || kpPg >= 2.5) {
    if (six.DEF < six.PAS && six.DEF < six.DRI) {
      return "高位自由人，建議減少回防，專注最後一傳。";
    }
    return "創造力突出，適合當組織核心，專注最後一傳與直塞。";
  }
  if ((p.passPct || 0) >= 80) return "傳球極穩，適合控場與節奏掌控，可多做安全轉移。";
  if ((p.totalDef || 0) / g >= 5) return "防守貢獻高，適合後腰／中衛屏障，鞏固中後場。";

  const entries = Object.entries(six) as [keyof SixAttr, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const tips: Record<keyof SixAttr, string> = {
    PAC: "活動節奏快，適合邊路或前插壓迫，保持高位參與。",
    SHO: "射門效率相對突出，建議多給禁區機會。",
    PAS: "傳球組織較穩，適合串連中場與前場。",
    DRI: "盤帶次數多，可擔任推進點或邊路破局。",
    DEF: "防守動作積極，適合回收保護與中場攔截。",
    PHY: "出勤與對抗穩定，適合全場高強度角色。",
  };
  return tips[entries[0][0]];
}
