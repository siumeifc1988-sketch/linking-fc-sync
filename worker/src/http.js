import { COMMANDS } from "./commands.js";
import { jsonResponse } from "./discord.js";
import { hkDate, getSignupDoc } from "./signup.js";
import { clearStatsCache, loadStats } from "./stats.js";

export function healthBody(config) {
  return {
    ok: true,
    version: config.version,
    clubId: config.clubId,
    platform: config.platform,
    siteUrl: config.siteUrl,
    statsJsonBase: config.statsJsonBase,
    firebaseProjectId: config.firebaseProjectId,
    signup: "firebase",
    stats: "json",
  };
}

function authorized(request, config) {
  if (!config.registerSecret) return true;
  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  return bearer === config.registerSecret || token === config.registerSecret;
}

export async function handleGet(request, config) {
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/health") {
    return jsonResponse(healthBody(config));
  }
  if (url.pathname === "/stats-check") return statsCheck(config);
  if (url.pathname === "/firebase-check") return firebaseCheck(config);
  if (url.pathname === "/register") return registerCommands(request, config);
  return jsonResponse({ ok: false, error: "not found" }, 404);
}

async function statsCheck(config) {
  try {
    clearStatsCache();
    const stats = await loadStats(config, { force: true });
    const meta = stats.meta || {};
    return jsonResponse({
      ok: true,
      version: config.version,
      clubId: config.clubId,
      statsJsonBase: config.statsJsonBase,
      lastUpdated: meta.lastUpdated || null,
      lastUpdatedDisplay: meta.lastUpdatedDisplay || null,
      lastStatus: meta.lastStatus || null,
      totalMatches: meta.totalMatches ?? stats.matches.length,
      last10Matches: meta.last10Matches ?? null,
      players: stats.board?.players?.length || 0,
      dataVersion: meta.version || stats.board?.version || null,
      fetchedAt: stats.fetchedAt,
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "stats failed" }, 502);
  }
}

async function firebaseCheck(config) {
  const date = hkDate();
  if (!config.firebaseApiKey) {
    return jsonResponse(
      {
        ok: false,
        project: config.firebaseProjectId,
        collection: "signups",
        date,
        configured: false,
        error: "FIREBASE_API_KEY missing",
      },
      503,
    );
  }
  try {
    const doc = await getSignupDoc(config, date);
    const counts = {};
    let total = 0;
    for (const [slot, people] of Object.entries(doc.slots)) {
      counts[slot] = people.length;
      total += people.length;
    }
    return jsonResponse({
      ok: true,
      project: config.firebaseProjectId,
      collection: "signups",
      date,
      configured: true,
      exists: doc.exists,
      total,
      slots: counts,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        project: config.firebaseProjectId,
        collection: "signups",
        date,
        configured: true,
        error: error instanceof Error ? error.message : "firebase failed",
      },
      502,
    );
  }
}

async function registerCommands(request, config) {
  if (!authorized(request, config)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }
  if (!config.discordBotToken || !config.discordApplicationId) {
    return jsonResponse({ ok: false, error: "DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required" }, 500);
  }
  const endpoint = `https://discord.com/api/v10/applications/${config.discordApplicationId}/commands`;
  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      authorization: `Bot ${config.discordBotToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(COMMANDS),
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
