import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import worker from "../src/index.js";
import { clearStatsCache } from "../src/stats.js";
import { buildBalancedTeams, decodeSignupDocument, encodeSignupBody, placeSignup, removeSignup } from "../src/signup.js";
import { buildPlayerEmbed, buildRankEmbed } from "../src/views.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function ed25519() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const der = publicKey.export({ format: "der", type: "spki" });
  return {
    publicHex: Buffer.from(der.subarray(-32)).toString("hex"),
    signBody(timestamp, body) {
      return sign(null, Buffer.from(String(timestamp) + body), privateKey).toString("hex");
    },
  };
}

const keys = ed25519();

const meta = {
  totalMatches: 2,
  last10Matches: 2,
  lastUpdated: "2026-10-21T12:03:26+08:00",
  lastUpdatedDisplay: "2026-10-21 12:03 HKT",
  lastStatus: "已更新",
  version: "curl_cffi-accumulate",
  recordAll: { wins: 1, draws: 0, losses: 1, goalsFor: 3, goalsAgainst: 2 },
};

const players = [
  {
    name: "SHOHOKU14",
    posCN: "中場",
    games: 2,
    goals: 1,
    assists: 2,
    goalsPerGame: 0.5,
    assistsPerGame: 1,
    xg: 1.2,
    xa: 0.4,
    pm: 20,
    pa: 28,
    passPct: 71,
    keyPass: 4,
    interceptions: 3,
    tk: 2,
    tacklesLost: 1,
    blocks: 0,
    aerialDef: 1,
    dribbles: 5,
    shots: 3,
    shotsOn: 2,
    passFwd: 8,
    passBack: 4,
    passSide: 8,
    minutes: 90,
    totalDef: 6,
    avgRating: 7.4,
  },
  {
    name: "DearKinsey",
    posCN: "前鋒",
    games: 2,
    goals: 3,
    assists: 0,
    goalsPerGame: 1.5,
    assistsPerGame: 0,
    xg: 2.1,
    xa: 0.1,
    pm: 8,
    pa: 10,
    passPct: 80,
    keyPass: 1,
    interceptions: 0,
    tk: 0,
    tacklesLost: 2,
    blocks: 0,
    aerialDef: 0,
    dribbles: 2,
    shots: 6,
    shotsOn: 4,
    passFwd: 3,
    passBack: 2,
    passSide: 3,
    minutes: 80,
    totalDef: 0,
    avgRating: 8.1,
  },
];

const board = {
  label: "全部累計",
  players,
  totalMatches: 2,
  source: "已更新 全部累計 2場",
  version: "curl_cffi-accumulate",
};

const match = {
  matchId: "1",
  timestamp: 1792257554,
  _matchType: "leagueMatch",
  clubs: {
    41026: { goals: "2", goalsAgainst: "1", details: { name: "LinKing FC" } },
    9: { goals: "1", goalsAgainst: "2", details: { name: "Nam Wah Club" } },
  },
  players: {
    41026: {
      1: {
        playername: "DearKinsey",
        goals: "2",
        assists: "0",
        rating: "8.2",
        shots: "4",
        match_event_aggregate_0: "13:2,217:3,218:1,6:1",
      },
      2: {
        playername: "SHOHOKU14",
        goals: "0",
        assists: "1",
        rating: "7.1",
        shots: "1",
        match_event_aggregate_0: "217:1,0:2,6:3",
      },
    },
  },
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetch(extra = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    calls.push({ href, method: init.method || "GET", body: init.body || "" });
    if (href.includes("api.tavily.com")) return extra.tavily || jsonResponse({ results: [] });
    if (href.includes("discord.com/api/v10/webhooks")) return jsonResponse({ ok: true });
    if (href.includes("firestore.googleapis.com")) return extra.firestore ? extra.firestore(href, init) : jsonResponse({}, 404);
    if (href.includes("discord.com/api/v10/applications")) return extra.discordCommands || jsonResponse([{ name: "help" }]);
    if (href.includes("/meta.json")) return jsonResponse(meta);
    if (href.includes("/aggregated/board_last10.json")) return jsonResponse({ ...board, label: "近10場" });
    if (href.includes("/aggregated/board.json")) return jsonResponse(board);
    if (href.includes("/matches.json")) return jsonResponse([match]);
    return jsonResponse({ error: "unexpected" }, 500);
  };
  return calls;
}

function env(overrides = {}) {
  return {
    DISCORD_PUBLIC_KEY: keys.publicHex,
    CLUB_ID: "41026",
    STATS_JSON_BASE: "https://example.test/data",
    FIREBASE_API_KEY: "test-firebase-key",
    FIREBASE_PROJECT_ID: "football-signup-64bd9",
    ...overrides,
  };
}

async function post(body, ctx, overrides) {
  const raw = JSON.stringify(body);
  const timestamp = "1710000000";
  const request = new Request("https://worker.test/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": keys.signBody(timestamp, raw),
      "x-signature-timestamp": timestamp,
    },
    body: raw,
  });
  const response = await worker.fetch(request, env(overrides), ctx);
  if (ctx?.jobs?.length) await Promise.all(ctx.jobs);
  return response;
}

function collector() {
  const jobs = [];
  return { jobs, waitUntil(job) { jobs.push(job); } };
}

function interaction(name, options = [], extra = {}) {
  return {
    type: 2,
    application_id: "app",
    token: "token",
    member: { nick: "SHOHOKU14", user: { id: "42", username: "sho", global_name: "Sho" } },
    data: { name, options },
    ...extra,
  };
}

test("GET /health reports club and stats base", async () => {
  const response = await worker.fetch(new Request("https://worker.test/health"), env({ STATS_JSON_BASE: "https://cdn.example/data/" }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.version, "1.0.3");
  assert.equal(body.clubId, "41026");
  assert.equal(body.platform, "common-gen5");
  assert.equal(body.statsJsonBase, "https://cdn.example/data");
  assert.equal(body.firebaseProjectId, "football-signup-64bd9");
});

test("GET /stats-check reads JSON freshness", async () => {
  clearStatsCache();
  const calls = installFetch();
  const response = await worker.fetch(new Request("https://worker.test/stats-check"), env());
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.lastStatus, "已更新");
  assert.equal(body.totalMatches, 2);
  assert.equal(body.players, 2);
  assert.equal(body.clubId, "41026");
  assert.ok(calls.some((call) => call.href.includes("/meta.json")));
  assert.equal(calls.some((call) => call.href.includes("firestore.googleapis.com")), false);
});

test("GET /firebase-check is signup-only and hides the key", async () => {
  const missing = await worker.fetch(new Request("https://worker.test/firebase-check"), env({ FIREBASE_API_KEY: "" }));
  assert.equal(missing.status, 503);
  const missingBody = await missing.json();
  assert.equal(missingBody.configured, false);
  assert.equal(missingBody.collection, "signups");

  installFetch();
  const response = await worker.fetch(new Request("https://worker.test/firebase-check"), env());
  const body = await response.json();
  const text = JSON.stringify(body);
  assert.equal(body.ok, true);
  assert.equal(body.exists, false);
  assert.equal(body.collection, "signups");
  assert.equal(text.includes("test-firebase-key"), false);
  assert.equal(text.includes("matches"), false);
});

test("GET /register refuses a wrong secret and does not echo the bot token", async () => {
  installFetch();
  const denied = await worker.fetch(new Request("https://worker.test/register"), env({ REGISTER_SECRET: "s3cret", DISCORD_BOT_TOKEN: "bot-token", DISCORD_APPLICATION_ID: "123" }));
  assert.equal(denied.status, 401);
  const ok = await worker.fetch(new Request("https://worker.test/register", { headers: { authorization: "Bearer s3cret" } }), env({
    REGISTER_SECRET: "s3cret",
    DISCORD_BOT_TOKEN: "bot-token",
    DISCORD_APPLICATION_ID: "123",
  }));
  assert.equal(ok.status, 200);
  assert.equal(JSON.stringify(await ok.json()).includes("bot-token"), false);
});

test("PING and bad signature", async () => {
  const pong = await post({ type: 1 });
  assert.deepEqual(await pong.json(), { type: 1 });
  const request = new Request("https://worker.test/interactions", {
    method: "POST",
    headers: { "x-signature-ed25519": "aa", "x-signature-timestamp": "1" },
    body: "{}",
  });
  const denied = await worker.fetch(request, env(), collector());
  assert.equal(denied.status, 401);
});

test("autocomplete offers signup slots and rank types", async () => {
  clearStatsCache();
  installFetch();
  const slots = await post({
    type: 4,
    data: { name: "signup", options: [{ name: "time", value: "22", focused: true }] },
  });
  const slotBody = await slots.json();
  assert.deepEqual(slotBody.data.choices.map((choice) => choice.value), ["2200", "2230"]);
  const ranks = await post({
    type: 4,
    data: { name: "rank", options: [{ name: "類型", value: "", focused: true }] },
  });
  const rankBody = await ranks.json();
  assert.equal(rankBody.data.choices.length, 5);
  assert.equal(rankBody.data.choices[0].value, "goals");
});

test("/sync refreshes JSON and does not write Firebase", async () => {
  clearStatsCache();
  const calls = installFetch();
  const ctx = collector();
  const response = await post(interaction("sync"), ctx);
  assert.equal((await response.json()).type, 5);
  const webhook = calls.find((call) => call.href.includes("/webhooks/"));
  assert.ok(webhook);
  const payload = JSON.parse(webhook.body);
  assert.match(payload.content, /已重新讀取 JSON/);
  assert.match(payload.content, /已更新/);
  assert.equal(calls.some((call) => call.href.includes("firestore.googleapis.com")), false);
  assert.equal(calls.some((call) => call.href.includes("proclubs.ea.com")), false);
});

test("/matches embed reads matches.json in Hong Kong time", async () => {
  clearStatsCache();
  const calls = installFetch();
  await post(interaction("matches"), collector());
  const webhook = calls.find((call) => call.href.includes("/webhooks/"));
  const payload = JSON.parse(webhook.body);
  assert.match(payload.embeds[0].title, /近1場/);
  assert.match(payload.embeds[0].description, /Nam Wah Club/);
  assert.match(payload.embeds[0].description, /DearKinsey⚽2/);
  assert.equal(payload.embeds[0].description.includes("proclubs.ea.com"), false);
});

test("/player embed uses board JSON", async () => {
  clearStatsCache();
  const calls = installFetch();
  await post(interaction("player", [{ name: "球員", value: "sho" }]), collector());
  const webhook = calls.find((call) => call.href.includes("/webhooks/"));
  const payload = JSON.parse(webhook.body);
  const embed = payload.embeds[0];
  const site = "https://siumeifc1988-sketch.github.io/linking-fc-sync/";
  assert.match(embed.title, /SHOHOKU14/);
  assert.match(embed.fields[0].value, /評分 ███████░░░ 7\.40\/10/);
  assert.match(embed.fields[1].value, /xG 1.20/);
  assert.match(embed.fields[1].value, /中靶率 ███████░░░ 67%/);
  assert.match(embed.fields[1].value, /轉化率 ███░░░░░░░ 33%/);
  assert.match(embed.fields[2].value, /傳球 ███████░░░ 71%/);
  assert.match(embed.fields[3].value, /搶斷成功率 ███████░░░ 67%/);
  assert.equal(embed.description.includes("全部累計"), true);
  assert.equal(embed.url, site);
  const link = embed.fields.find((field) => field.name === "🔗 戰績網");
  assert.ok(link);
  assert.equal(link.value, `戰績網\n${site}`);
  assert.equal(link.value.includes("]("), false);
  assert.equal(embed.image, undefined);
  assert.equal(embed.thumbnail, undefined);
});

test("/player bars skip rates that have no attempts", () => {
  const quiet = {
    ...players[0],
    name: "Quiet",
    shots: 0,
    shotsOn: 0,
    goals: 0,
    tk: 0,
    tacklesLost: 0,
  };
  const embed = buildPlayerEmbed(
    { board: { ...board, players: [quiet] }, meta, last10: { players: [] } },
    "Quiet",
    "https://siumeifc1988-sketch.github.io/linking-fc-sync/",
  );
  assert.match(embed.fields[0].value, /評分 /);
  assert.match(embed.fields[2].value, /傳球 /);
  assert.equal(embed.fields[1].value.includes("中靶率"), false);
  assert.equal(embed.fields[1].value.includes("轉化率"), false);
  assert.equal(embed.fields[3].value.includes("搶斷成功率"), false);
});

test("/player miss and ambiguous embeds still link the stats site", () => {
  const site = "https://siumeifc1988-sketch.github.io/linking-fc-sync/";
  const stats = { board, meta, last10: { players: [] } };
  for (const embed of [
    buildPlayerEmbed(stats, "", site),
    buildPlayerEmbed(stats, "nobody", site),
    buildPlayerEmbed(stats, "k", site),
  ]) {
    assert.equal(embed.url, site);
    const link = embed.fields.find((field) => field.name === "🔗 戰績網");
    assert.equal(link.value, `戰績網\n${site}`);
    assert.equal(link.value.includes("]("), false);
    assert.equal(embed.image, undefined);
    assert.equal(embed.thumbnail, undefined);
  }
});

test("/signup writes only the signup document and moves slots", async () => {
  const stored = {};
  const calls = installFetch({
    firestore(href, init) {
      if ((init.method || "GET") === "GET") {
        const doc = stored.doc;
        return doc ? jsonResponse(doc) : jsonResponse({}, 404);
      }
      stored.doc = JSON.parse(init.body);
      stored.href = href;
      return jsonResponse({ ok: true });
    },
  });
  await post(interaction("signup", [{ name: "time", value: "2130" }]), collector());
  await post(interaction("signup", [{ name: "time", value: "2300" }]), collector());
  const decoded = decodeSignupDocument(stored.doc);
  assert.equal(decoded.slots["2130"].length, 0);
  assert.equal(decoded.slots["2300"].length, 1);
  assert.equal(decoded.slots["2300"][0].discordId, "42");
  assert.match(stored.href, /\/signups\//);
  assert.equal(stored.href.includes("/matches"), false);
  const webhook = calls.filter((call) => call.href.includes("/webhooks/")).pop();
  assert.match(JSON.parse(webhook.body).content, /23:00/);
});

test("invalid signup slot does not PATCH", async () => {
  const calls = installFetch({
    firestore() {
      return jsonResponse({}, 404);
    },
  });
  await post(interaction("signup", [{ name: "time", value: "noon" }]), collector());
  assert.equal(calls.some((call) => call.method === "PATCH" && call.href.includes("firestore.googleapis.com")), false);
  const webhook = calls.find((call) => call.href.includes("/webhooks/"));
  assert.match(JSON.parse(webhook.body).content, /時段/);
});

test("chat grounds on the selected player and can attach Tavily without leaking the key", async () => {
  clearStatsCache();
  const calls = installFetch({
    tavily: jsonResponse({ results: [{ title: "Pro Clubs press", url: "https://example.test/tip" }] }),
  });
  await post(interaction("chat", [
    { name: "問題", value: "點樣傳波" },
    { name: "球員", value: "DearKinsey" },
  ]), collector(), { TAVILY_API_KEY: "tvly-test-secret" });
  const tavily = calls.find((call) => call.href.includes("api.tavily.com"));
  assert.ok(tavily);
  assert.match(tavily.body, /tvly-test-secret/);
  const webhook = calls.find((call) => call.href.includes("/webhooks/"));
  const payload = JSON.parse(webhook.body);
  assert.match(payload.embeds[0].title, /DearKinsey/);
  assert.match(payload.embeds[0].description, /3球/);
  assert.match(payload.embeds[0].description, /Pro Clubs press/);
  assert.equal(payload.embeds[0].description.includes("tvly-test-secret"), false);
});

test("signup slot move and team balance", () => {
  const identity = { id: "7", name: "Ada" };
  let slots = placeSignup({ "2130": [], "2200": [], "2230": [], "2300": [], Unsure: [] }, "2200", identity, 10);
  slots = placeSignup(slots, "Unsure", identity, 20);
  assert.equal(slots["2200"].length, 0);
  assert.equal(slots.Unsure[0].name, "Ada");
  const removed = removeSignup(slots, identity);
  assert.equal(removed.found, true);
  assert.equal(removed.slots.Unsure.length, 0);
  const teams = buildBalancedTeams(
    [{ name: "DearKinsey" }, { name: "SHOHOKU14" }],
    players,
  );
  assert.equal(teams.teamA.length, 1);
  assert.equal(teams.teamB.length, 1);
  assert.notEqual(teams.teamA[0].name, teams.teamB[0].name);
  const encoded = encodeSignupBody("2026-10-21", slots);
  assert.equal(encoded.fields.date.stringValue, "2026-10-21");
  const rank = buildRankEmbed({ board, meta }, "goals", "https://example.test/");
  assert.match(rank.description, /DearKinsey/);
  assert.ok(rank.description.indexOf("DearKinsey") < rank.description.indexOf("SHOHOKU14"));
});

test("worker source contains no reference secrets", async () => {
  const forbidden = [["AIza", "Sy"].join(""), ["BEGIN PRIVATE", " KEY"].join(""), ["firebase-", "adminsdk"].join("")];
  const files = await walk(root);
  const hits = [];
  for (const file of files) {
    if (file.includes(`${path.sep}test${path.sep}`)) continue;
    const text = await readFile(file, "utf8");
    for (const token of forbidden) {
      if (text.includes(token)) hits.push(`${path.relative(root, file)}:${token}`);
    }
  }
  assert.deepEqual(hits, []);
});

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".wrangler") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}
