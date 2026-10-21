import type { BoardPlayer } from "../types";

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

/** 由 Pro Clubs 累計數據推算 0–99 視覺能力（非官方 FUT 屬性） */
export function deriveSix(p: BoardPlayer): SixAttr {
  const g = Math.max(1, p.games || 1);
  const gpg = p.goalsPerGame ?? p.goals / g;
  const apg = p.assistsPerGame ?? p.assists / g;
  const shotAcc = p.shots ? (p.shotsOn || 0) / p.shots : 0;
  const dpg = (p.dribbles || 0) / g;
  const defPg = (p.totalDef || 0) / g;
  const tkPg = (p.tk || 0) / g;
  const intPg = (p.interceptions || 0) / g;
  const kpPg = (p.keyPass || 0) / g;
  const minPg = (p.minutes || 0) / g;
  const aerialPg = (p.aerialDef || 0) / g;
  const pass = p.passPct ?? 65;

  return {
    PAC: clamp(48 + Math.min(40, dpg * 2.2 + tkPg * 1.5)),
    SHO: clamp(45 + gpg * 28 + shotAcc * 18 + Math.min(12, (p.xg || 0) / g * 10)),
    PAS: clamp(pass * 0.72 + Math.min(28, kpPg * 6 + apg * 8)),
    DRI: clamp(48 + Math.min(42, dpg * 2.8)),
    DEF: clamp(38 + Math.min(52, defPg * 7 + intPg * 4 + tkPg * 3)),
    PHY: clamp(50 + Math.min(28, minPg / 2.8) + Math.min(16, aerialPg * 6)),
  };
}

export function overallFromPlayer(p: BoardPlayer): number {
  return clamp((p.avgRating || 6) * 10, 50, 99);
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

export function coachTip(p: BoardPlayer, six: SixAttr): string {
  const entries = Object.entries(six) as [keyof SixAttr, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0][0];
  const tips: Record<keyof SixAttr, string> = {
    PAC: "活動量大，適合邊路或前插節奏，保持高位壓迫。",
    SHO: "射門效率突出，建議多給禁區機會與射門選擇。",
    PAS: "傳球組織出色，適合當組織核心，專注最後一傳。",
    DRI: "盤帶推進強，可擔任自由人或邊路破局點。",
    DEF: "防守貢獻高，適合後腰／中衛，鞏固中場屏障。",
    PHY: "體能與對抗穩定，適合全場高強度角色。",
  };
  if ((p.goalsPerGame || 0) >= 0.6) return "進球效率極高，建議主打前場終結點。";
  if ((p.passPct || 0) >= 80) return "傳球成功率極高，適合控場與節奏掌控。";
  return tips[top];
}
