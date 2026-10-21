import { num } from "./config.js";

const CACHE_MS = 60_000;

let cache = { key: "", at: 0, data: null };

export function clearStatsCache() {
  cache = { key: "", at: 0, data: null };
}

async function getJson(fetchImpl, url) {
  let res;
  try {
    res = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": "linking-fc-discord-worker" },
      cache: "no-store",
    });
  } catch (error) {
    const path = safePath(url);
    throw new Error(`讀取 ${path} 失敗（網絡）`);
  }
  if (!res.ok) {
    throw new Error(`讀取 ${safePath(url)} 失敗 (${res.status})`);
  }
  return res.json();
}

function safePath(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.slice(-2).join("/") || "json";
  } catch {
    return "json";
  }
}

export async function loadStats(config, { force = false, fetchImpl = fetch } = {}) {
  const key = config.statsJsonBase;
  const now = Date.now();
  if (!force && cache.data && cache.key === key && now - cache.at < CACHE_MS) {
    return { ...cache.data, cached: true, cacheAgeMs: now - cache.at };
  }
  const base = key;
  const bust = force ? `?t=${now}` : "";
  const [board, last10, matches, meta] = await Promise.all([
    getJson(fetchImpl, `${base}/aggregated/board.json${bust}`),
    getJson(fetchImpl, `${base}/aggregated/board_last10.json${bust}`),
    getJson(fetchImpl, `${base}/matches.json${bust}`),
    getJson(fetchImpl, `${base}/meta.json${bust}`),
  ]);
  const data = {
    board: board && typeof board === "object" ? board : { players: [] },
    last10: last10 && typeof last10 === "object" ? last10 : { players: [] },
    matches: Array.isArray(matches) ? matches : [],
    meta: meta && typeof meta === "object" ? meta : {},
    fetchedAt: new Date(now).toISOString(),
  };
  cache = { key, at: now, data };
  return { ...data, cached: false, cacheAgeMs: 0 };
}

export function findPlayer(players, query) {
  const q = String(query || "").trim().toLowerCase();
  const list = Array.isArray(players) ? players : [];
  if (!q) return { status: "empty", player: null, names: [] };
  const exact = list.find((player) => String(player.name || "").toLowerCase() === q);
  if (exact) return { status: "one", player: exact, names: [exact.name] };
  const hits = list.filter((player) => String(player.name || "").toLowerCase().includes(q));
  if (hits.length === 1) return { status: "one", player: hits[0], names: [hits[0].name] };
  if (hits.length === 0) return { status: "none", player: null, names: [] };
  return { status: "many", player: null, names: hits.map((player) => player.name) };
}

export function guessPlayerName(query, players) {
  const lower = String(query || "").toLowerCase();
  let best = "";
  for (const player of players || []) {
    const name = String(player.name || "");
    if (name.length > best.length && lower.includes(name.toLowerCase())) best = name;
  }
  return best;
}

export function playerChoices(players, query) {
  const q = String(query || "").trim().toLowerCase();
  const names = (players || []).map((player) => player.name).filter(Boolean);
  const filtered = q ? names.filter((name) => name.toLowerCase().includes(q)) : names;
  return filtered.slice(0, 25).map((name) => ({ name, value: name }));
}

function decodeEvents(player) {
  const out = {};
  for (let i = 0; i < 4; i += 1) {
    const raw = player[`match_event_aggregate_${i}`] || "";
    if (!raw) continue;
    for (const part of String(raw).split(",")) {
      const [keyText, valueText] = part.split(":");
      const key = Number(keyText);
      const value = Number(valueText);
      if (Number.isFinite(key) && Number.isFinite(value)) out[key] = value;
    }
  }
  return out;
}

/** Same ids as scripts/sync.py. Used for xG there; here they also split shots by box. */
const SHOT_ON_IN = 13;
const SHOT_OFF_IN = 14;
const SHOT_ON_OUT = 18;
const SHOT_OFF_OUT = 19;

function rosterOf(rawPlayers) {
  if (!rawPlayers || typeof rawPlayers !== "object") return [];
  return Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
}

/**
 * Sum in-box and out-of-box shots for one player from matches.json.
 * `onIn`/`offIn` are 禁區內 中靶/偏出 (events 13/14). `onOut`/`offOut` are 禁區外 (18/19).
 * When `clubId` is set, only that club is counted.
 */
export function aggregateShotZones(matches, playerName, clubId) {
  const target = String(playerName || "").trim().toLowerCase();
  const zones = { onIn: 0, offIn: 0, onOut: 0, offOut: 0 };
  if (!target) return zones;
  const club = clubId == null || clubId === "" ? "" : String(clubId);
  for (const match of matches || []) {
    const groups = club ? [match?.players?.[club]] : Object.values(match?.players || {});
    for (const raw of groups) {
      for (const player of rosterOf(raw)) {
        const name = String(player?.playername || player?.name || "").trim().toLowerCase();
        if (name !== target) continue;
        const events = decodeEvents(player);
        zones.onIn += events[SHOT_ON_IN] || 0;
        zones.offIn += events[SHOT_OFF_IN] || 0;
        zones.onOut += events[SHOT_ON_OUT] || 0;
        zones.offOut += events[SHOT_OFF_OUT] || 0;
      }
    }
  }
  return zones;
}

/** Same shot model as scripts/sync.py — estimated, not official EA xG. */
function estimatedXg(player, events) {
  const onIn = events[SHOT_ON_IN] || 0;
  const onOut = events[SHOT_ON_OUT] || 0;
  const offIn = events[SHOT_OFF_IN] || 0;
  const offOut = events[SHOT_OFF_OUT] || 0;
  const shotOn = events[217] || 0;
  const shots = num(player.shots) || shotOn + (events[218] || 0);
  if (onIn || onOut || offIn || offOut) return onIn * 0.35 + onOut * 0.12 + offIn * 0.1 + offOut * 0.04;
  if (shots) return shotOn * 0.32 + Math.max(0, shots - shotOn) * 0.06;
  return 0;
}

function unixSeconds(timestamp) {
  let value = num(timestamp);
  if (value > 1e12) value = Math.floor(value / 1000);
  return value;
}

export function summarizeMatches(matches, clubId) {
  const rows = [];
  const club = String(clubId);
  for (const match of matches || []) {
    const clubs = match.clubs || {};
    const us = clubs[club];
    if (!us) continue;
    const oppId = Object.keys(clubs).find((id) => id !== club);
    const opp = oppId ? clubs[oppId] : null;
    const gf = num(us.goals);
    const ga = num(us.goalsAgainst);
    const res = gf > ga ? "W" : gf < ga ? "L" : "D";
    const rawPlayers = (match.players || {})[club] || {};
    const myList = (Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers))
      .map((player) => {
        const events = decodeEvents(player);
        const name = String(player.playername || player.name || "").trim();
        if (!name || name === "Unknown") return null;
        return {
          name,
          goals: num(player.goals),
          assists: num(player.assists),
          rating: num(player.rating),
          xg: estimatedXg(player, events),
          def: (events[6] || 0) + (events[0] || 0) + (events[156] || 0) + (events[266] || 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating);
    rows.push({
      ts: unixSeconds(match.timestamp),
      opp: (opp && opp.details && opp.details.name) || "對手",
      gf,
      ga,
      res,
      type: match._matchType || "",
      myList,
    });
  }
  rows.sort((a, b) => b.ts - a.ts);
  return rows;
}

export function formatHk(tsSeconds) {
  if (!tsSeconds) return "—";
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(tsSeconds * 1000));
}
