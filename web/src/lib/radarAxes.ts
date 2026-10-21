import type { BoardPlayer } from "../types";

/**
 * Real Pro Clubs rates for the player radar.
 *
 * The shape is a within-club percentile, not the 40–99 mapRange used by deriveSix.
 * deriveSix stays for the card overall only.
 *
 * Axes (fixed order):
 * 1. 終結  goals per 90. If minutes < 90, goals per game.
 * 2. 創造  assists per 90 + key passes per 90, summed before the percentile.
 * 3. 傳控  pass success % (pm ÷ pa when attempts exist, otherwise passPct).
 * 4. 推進  dribbles per 90 (per game if minutes are thin).
 * 5. 防守  (tackles + interceptions) per 90 (per game if minutes are thin).
 * 6. 出勤  minutes per game. If minutes are missing, appearance rate (games ÷ club matches).
 *
 * Percentile (midpoint rank, 0–100):
 *   (count strictly below + 0.5 × count tied) / sample size × 100
 * Outer ring = 100. With a small squad the unique leader lands near (n−0.5)/n,
 * so the rim is the top of the club rather than a fake 99.
 *
 * Sample: outfield players with at least 5 games. Goalkeepers and short samples
 * stay out of the pool so they cannot move anyone else's shape.
 * Team polygon: percentile of the sample mean on each axis.
 */

export const RADAR_MIN_GAMES = 5;
const MIN_MINUTES_FOR_PER90 = 90;

export const GK_RADAR_NOTE = "門將使用另一套軸，稍後再加。這裡不套用外場六軸。";

export type RadarAxisId = "finish" | "create" | "pass" | "carry" | "defend" | "attend";

export type RateBasis = "per90" | "perGame" | "percent" | "minutes" | "appearance" | "missing";

export type RadarAxisDef = {
  id: RadarAxisId;
  label: string;
  sub: string;
};

export const RADAR_AXES: readonly RadarAxisDef[] = [
  { id: "finish", label: "終結", sub: "入球／90" },
  { id: "create", label: "創造", sub: "助攻+KP／90" },
  { id: "pass", label: "傳控", sub: "傳球%" },
  { id: "carry", label: "推進", sub: "盤帶／90" },
  { id: "defend", label: "防守", sub: "搶+攔／90" },
  { id: "attend", label: "出勤", sub: "場均分鐘" },
];

export type AxisRate = {
  id: RadarAxisId;
  value: number | null;
  basis: RateBasis;
};

export type RadarAxisView = RadarAxisDef & {
  raw: number | null;
  rawLabel: string;
  basis: RateBasis;
  /** 0–100. Null when this axis has no comparable sample. */
  percentile: number | null;
  teamRaw: number | null;
  teamPercentile: number | null;
};

export type RadarProfile = {
  isGk: boolean;
  lowSample: boolean;
  thinMinutes: boolean;
  sampleSize: number;
  axes: RadarAxisView[];
};

export function isGoalkeeper(p: BoardPlayer): boolean {
  const pos = (p.posCN || "").trim().toLowerCase();
  return pos.includes("門") || pos === "gk" || pos === "goalkeeper";
}

export function isRadarSample(p: BoardPlayer): boolean {
  return (p.games || 0) >= RADAR_MIN_GAMES && !isGoalkeeper(p);
}

function minutesOf(p: BoardPlayer): number {
  if (p.minutes != null && p.minutes > 0) return p.minutes;
  if (p.seconds != null && p.seconds > 0) return p.seconds / 60;
  return 0;
}

function countingRate(
  count: number,
  p: BoardPlayer,
  perGame?: number,
): { value: number; basis: "per90" | "perGame" } {
  const mins = minutesOf(p);
  const games = Math.max(1, p.games || 1);
  if (mins >= MIN_MINUTES_FOR_PER90) {
    return { value: count / (mins / 90), basis: "per90" };
  }
  return { value: perGame ?? count / games, basis: "perGame" };
}

export function passSuccessPct(p: BoardPlayer): number | null {
  const pa = p.pa ?? 0;
  if (pa > 0 && p.pm != null) return (p.pm / pa) * 100;
  if (p.passPct != null && p.passPct > 0) return p.passPct;
  return null;
}

/** Raw rates only. Percentiles are applied later against a squad. */
export function deriveRadarAxes(p: BoardPlayer, clubMatches?: number): Record<RadarAxisId, AxisRate> {
  const games = Math.max(1, p.games || 1);
  const finish = countingRate(p.goals || 0, p, p.goalsPerGame);
  const assists = countingRate(p.assists || 0, p, p.assistsPerGame);
  const keyPasses = countingRate(p.keyPass || 0, p);
  const dribbles = countingRate(p.dribbles || 0, p);
  const defensive = countingRate((p.tk || 0) + (p.interceptions || 0), p);
  const pass = passSuccessPct(p);

  const played = p.games || 0;
  const mins = minutesOf(p);
  let attend: AxisRate;
  if (played > 0 && mins > 0) {
    attend = { id: "attend", value: mins / played, basis: "minutes" };
  } else if (played > 0 && clubMatches && clubMatches > 0) {
    attend = { id: "attend", value: (played / clubMatches) * 100, basis: "appearance" };
  } else {
    attend = { id: "attend", value: null, basis: "missing" };
  }

  return {
    finish: { id: "finish", value: finish.value, basis: finish.basis },
    create: { id: "create", value: assists.value + keyPasses.value, basis: assists.basis },
    pass: { id: "pass", value: pass, basis: pass == null ? "missing" : "percent" },
    carry: { id: "carry", value: dribbles.value, basis: dribbles.basis },
    defend: { id: "defend", value: defensive.value, basis: defensive.basis },
    attend,
  };
}

/** Midpoint percentile rank. Returns null when the sample is empty. */
export function percentileRank(value: number, sample: readonly number[]): number | null {
  const xs = sample.filter((n) => Number.isFinite(n));
  if (!Number.isFinite(value) || xs.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const v of xs) {
    if (v < value) below += 1;
    else if (v === value) equal += 1;
  }
  return ((below + 0.5 * equal) / xs.length) * 100;
}

function mean(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  let sum = 0;
  for (const n of xs) sum += n;
  return sum / xs.length;
}

function formatRaw(id: RadarAxisId, value: number | null, basis: RateBasis): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (basis === "perGame") {
    const n = id === "finish" || id === "create" ? value.toFixed(2) : value.toFixed(1);
    return `${n}/場`;
  }
  if (basis === "appearance") return `${Math.round(value)}%出場`;
  if (id === "pass") return `${value.toFixed(1)}%`;
  if (id === "attend") return value.toFixed(1);
  if (id === "finish" || id === "create") return value.toFixed(2);
  return value.toFixed(1);
}

function sampleValues(id: RadarAxisId, rates: Record<RadarAxisId, AxisRate>[]): number[] {
  if (id === "attend") {
    const byMinutes = rates.filter((r) => r.attend.basis === "minutes" && r.attend.value != null);
    const chosen = byMinutes.length
      ? byMinutes
      : rates.filter((r) => r.attend.basis === "appearance" && r.attend.value != null);
    return chosen.map((r) => r.attend.value as number);
  }
  return rates
    .map((r) => r[id].value)
    .filter((v): v is number => v != null && Number.isFinite(v));
}

function comparable(id: RadarAxisId, rate: AxisRate, sample: number[], rates: Record<RadarAxisId, AxisRate>[]): boolean {
  if (rate.value == null || !Number.isFinite(rate.value) || sample.length === 0) return false;
  if (id !== "attend") return true;
  const minutesSample = rates.some((r) => r.attend.basis === "minutes" && r.attend.value != null);
  if (minutesSample) return rate.basis === "minutes";
  return rate.basis === "appearance";
}

export function buildRadarProfile(
  player: BoardPlayer,
  squad: readonly BoardPlayer[],
  clubMatches?: number,
): RadarProfile {
  const pool = squad.some((p) => p.name === player.name) ? squad : [...squad, player];
  const eligible = pool.filter(isRadarSample);
  const eligibleRates = eligible.map((p) => deriveRadarAxes(p, clubMatches));
  const own = deriveRadarAxes(player, clubMatches);

  const axes: RadarAxisView[] = RADAR_AXES.map((def) => {
    const rate = own[def.id];
    const sample = sampleValues(def.id, eligibleRates);
    const teamRaw = mean(sample);
    const canRank = comparable(def.id, rate, sample, eligibleRates);
    return {
      ...def,
      raw: rate.value,
      rawLabel: formatRaw(def.id, rate.value, rate.basis),
      basis: rate.basis,
      percentile: canRank && rate.value != null ? percentileRank(rate.value, sample) : null,
      teamRaw,
      teamPercentile: teamRaw == null ? null : percentileRank(teamRaw, sample),
    };
  });

  return {
    isGk: isGoalkeeper(player),
    lowSample: (player.games || 0) < RADAR_MIN_GAMES,
    thinMinutes: minutesOf(player) < MIN_MINUTES_FOR_PER90,
    sampleSize: eligible.length,
    axes,
  };
}

/** Map a 0–100 percentile onto the radar radius. Outer ring is 100. */
export function radarPoint(
  index: number,
  percentile: number,
  cx: number,
  cy: number,
  radius: number,
): [number, number] {
  const a = ((-90 + index * 60) * Math.PI) / 180;
  const r = (Math.max(0, Math.min(100, percentile)) / 100) * radius;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}
