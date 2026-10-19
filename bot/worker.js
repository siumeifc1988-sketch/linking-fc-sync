/**
 * LinKing FC pepe-bot — Discord slash commands on Cloudflare Workers.
 * Reads public JSON from linking-fc-sync. Does not scrape EA.
 *
 * Use a NEW Discord application. Do not set this Interactions Endpoint
 * on marin-bot, or Discord will stop delivering /chat to that gateway bot.
 *
 * Secrets: DISCORD_PUBLIC_KEY
 */

const RAW = "https://raw.githubusercontent.com/siumeifc1988-sketch/linking-fc-sync/main";
const CLUB = "41026";

const TYPE_LABEL = {
  leagueMatch: "聯賽",
  playoffMatch: "季後賽",
  friendlyMatch: "友誼賽",
};

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("LinKing pepe-bot. Discord interactions only.", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (request.method !== "POST") return new Response("method", { status: 405 });

    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const body = await request.text();
    const ok = await verify(env.DISCORD_PUBLIC_KEY, signature, timestamp, body);
    if (!ok) return new Response("bad signature", { status: 401 });

    const interaction = JSON.parse(body);
    if (interaction.type === 1) return Response.json({ type: 1 });
    if (interaction.type !== 2) {
      return Response.json({ type: 4, data: { content: "不支援這種互動。" } });
    }

    try {
      const snap = await load();
      const content = answer(snap, interaction.data).slice(0, 1900);
      return Response.json({ type: 4, data: { content } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "讀取失敗";
      return Response.json({ type: 4, data: { content: message } });
    }
  },
};

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function verify(publicKey, signature, timestamp, body) {
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const key = await crypto.subtle.importKey("raw", hexToBytes(publicKey), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    );
  } catch {
    return false;
  }
}

async function load() {
  const headers = { Accept: "application/json", "User-Agent": "linking-pepe-bot" };
  const [boardRes, matchRes] = await Promise.all([
    fetch(`${RAW}/data/aggregated/board.json`, { headers }),
    fetch(`${RAW}/data/matches.json`, { headers }),
  ]);
  if (!boardRes.ok || !matchRes.ok) throw new Error("GitHub JSON 讀取失敗。");
  const board = await boardRes.json();
  const matches = await matchRes.json();
  return shape(board, matches);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function whenHK(ts) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ts * 1000));
}

function shape(board, matches) {
  const players = (board.players || []).map((p) => ({
    name: String(p.name || "Unknown"),
    posCN: String(p.posCN || "未知"),
    games: num(p.games),
    goals: num(p.goals),
    assists: num(p.assists),
    xg: num(p.xg),
    xa: num(p.xa),
    passPct: num(p.passPct),
    keyPass: num(p.keyPass),
    totalDef: num(p.totalDef),
    avgRating: num(p.avgRating),
  }));

  const rows = [];
  let clubName = "LinKing FC";
  for (const match of matches) {
    const clubs = match.clubs || {};
    const us = clubs[CLUB];
    if (!us) continue;
    const oppId = Object.keys(clubs).find((id) => id !== CLUB);
    const opp = oppId ? clubs[oppId] : undefined;
    if (us.details && us.details.name) clubName = us.details.name;
    const gf = num(us.goals);
    const ga = num(us.goalsAgainst);
    const outcome = gf > ga ? "勝" : gf < ga ? "負" : "和";
    rows.push({
      type: TYPE_LABEL[match._matchType] || "比賽",
      when: whenHK(num(match.timestamp)),
      ts: num(match.timestamp),
      us: gf,
      them: ga,
      opp: (opp && opp.details && opp.details.name) || "對手",
      outcome,
    });
  }
  rows.sort((a, b) => b.ts - a.ts);
  const record = rows.reduce(
    (acc, row) => {
      if (row.outcome === "勝") acc.w += 1;
      else if (row.outcome === "和") acc.d += 1;
      else acc.l += 1;
      acc.gf += row.us;
      acc.ga += row.them;
      return acc;
    },
    { w: 0, d: 0, l: 0, gf: 0, ga: 0 },
  );
  return {
    clubName,
    players,
    matches: rows,
    totalMatches: num(board.totalMatches) || rows.length,
    lastUpdatedDisplay: board.lastUpdatedDisplay || "未知",
    lastStatus: board.lastStatus || "未知",
    version: board.version || "—",
    counts: board.lastFetchCounts || {},
    record,
  };
}

function opt(data, name) {
  const found = (data.options || []).find((item) => item.name === name);
  return found ? found.value : undefined;
}

function answer(snap, data) {
  const name = data.name;
  if (name === "status") return statusText(snap);
  if (name === "board") return boardText(snap, opt(data, "sort") || "attack");
  if (name === "player") return playerText(snap, String(opt(data, "name") || ""));
  if (name === "matches") return matchesText(snap, Number(opt(data, "count") || 6));
  if (name === "form") return formText(snap);
  return "沒有這條指令。可用 /status /board /player /matches /form。";
}

function statusText(snap) {
  const c = snap.counts;
  return [
    `**${snap.clubName}** · ${snap.lastStatus}`,
    `寫入 ${snap.lastUpdatedDisplay} · ${snap.version}`,
    `視窗 ${snap.totalMatches} 場：${snap.record.w} 勝 ${snap.record.d} 和 ${snap.record.l} 負，${snap.record.gf}:${snap.record.ga}`,
    `上次抓取回報：聯賽 ${num(c.league)}、友誼 ${num(c.friendly)}、季後 ${num(c.playoff)}`,
    "「保留舊檔」代表那一次抓到 0 場，不代表場次被清掉。xG 是估算，不是生涯數據。",
  ].join("\n");
}

function boardText(snap, sort) {
  const rows = [...snap.players];
  let title = "進攻榜（入球+助攻）";
  if (sort === "defense") {
    rows.sort((a, b) => b.totalDef - a.totalDef);
    title = "防守榜";
  } else if (sort === "rating") {
    rows.sort((a, b) => b.avgRating - a.avgRating);
    title = "評分榜";
  } else if (sort === "pass") {
    rows.sort((a, b) => b.passPct - a.passPct || b.keyPass - a.keyPass);
    title = "傳球榜";
  } else {
    rows.sort((a, b) => b.goals + b.assists - (a.goals + a.assists));
  }
  const lines = rows.map((row, index) => {
    const stat =
      sort === "defense"
        ? `防 ${row.totalDef}`
        : sort === "rating"
          ? row.avgRating.toFixed(2)
          : sort === "pass"
            ? `${row.passPct}%`
            : `${row.goals}+${row.assists}`;
    return `${index + 1}. ${row.name}（${row.posCN} ${row.games}場） ${stat}`;
  });
  return `**${title}** · ${snap.totalMatches} 場視窗\n${lines.join("\n")}`;
}

function playerText(snap, query) {
  const q = query.trim().toLowerCase();
  if (!q) return "要帶名字。";
  const hits = snap.players.filter((row) => row.name.toLowerCase().includes(q));
  if (hits.length === 0) return `這 ${snap.totalMatches} 場裡沒有「${query}」。`;
  if (hits.length > 1 && !hits.some((row) => row.name.toLowerCase() === q)) {
    return `多過一個人：${hits.map((row) => row.name).join("、")}`;
  }
  const row = hits.find((item) => item.name.toLowerCase() === q) || hits[0];
  return [
    `**${row.name}** · ${row.posCN} · ${row.games} 場`,
    `入 ${row.goals}　助 ${row.assists}　評分 ${row.avgRating.toFixed(2)}`,
    `估算 xG ${row.xg.toFixed(2)}　xA ${row.xa.toFixed(2)}`,
    `傳球 ${row.passPct}%　關鍵傳球 ${row.keyPass}　防守 ${row.totalDef}`,
  ].join("\n");
}

function matchesText(snap, count) {
  const n = Math.min(15, Math.max(1, count || 6));
  const lines = snap.matches.slice(0, n).map((row) => `${row.outcome} ${row.us}-${row.them} ${row.opp} · ${row.type} ${row.when}`);
  return `**最近 ${n} 場**\n${lines.join("\n") || "沒有比賽"}`;
}

function formText(snap) {
  const line = snap.matches
    .slice(0, 5)
    .map((row) => row.outcome)
    .join(" ");
  const detail = snap.matches
    .slice(0, 5)
    .map((row) => `${row.outcome} ${row.us}-${row.them} ${row.opp}`)
    .join("\n");
  return `**近況** ${line}\n${detail}`;
}
