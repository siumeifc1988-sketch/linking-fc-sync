import { aggregateShotZones, findPlayer, formatHk, guessPlayerName, summarizeMatches } from "./stats.js";

const TYPE_LABEL = {
  leagueMatch: "聯賽",
  playoffMatch: "季後",
  friendlyMatch: "友誼",
};

function posEmoji(posCN) {
  if (posCN === "門將") return "🧤";
  if (posCN === "後衛") return "🛡";
  if (posCN === "中場") return "🎯";
  return "⚽";
}

function posColor(posCN) {
  if (posCN === "門將") return 0xffd700;
  if (posCN === "後衛") return 0x2ecc71;
  if (posCN === "中場") return 0x3498db;
  return 0xe74c3c;
}

function bar(percent, suffix) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const filled = Math.round(clamped / 10);
  const note = suffix == null ? `${clamped}%` : suffix;
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${note}`;
}

/** Discord's monospace treats CJK as two columns. Pad labels so the bars share a column. */
function displayWidth(text) {
  let width = 0;
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    width += code > 0xff ? 2 : 1;
  }
  return width;
}

function pctLabel(percent) {
  return `${Math.round(Number(percent) || 0)}%`;
}

/** One fenced block. A row is left out when its denominator is 0. Suffixes stay short. */
function overviewBlock(player) {
  const rating = Number(player.avgRating || 0);
  const rows = [{ label: "評分", percent: rating * 10, suffix: `${rating.toFixed(2)}/10` }];
  const passAttempts = Number(player.pa) || 0;
  if (passAttempts > 0) {
    const passPct = Number(player.passPct || 0);
    rows.push({ label: "傳球%", percent: passPct, suffix: pctLabel(passPct) });
  }
  const shots = Number(player.shots) || 0;
  if (shots > 0) {
    const onTarget = ((Number(player.shotsOn) || 0) / shots) * 100;
    rows.push({ label: "中靶率", percent: onTarget, suffix: pctLabel(onTarget) });
  }
  const tacklesWon = Number(player.tk) || 0;
  const tackleAttempts = tacklesWon + (Number(player.tacklesLost) || 0);
  if (tackleAttempts > 0) {
    const tacklePct = (tacklesWon / tackleAttempts) * 100;
    rows.push({ label: "搶斷成功率", percent: tacklePct, suffix: pctLabel(tacklePct) });
  }
  const labelWidth = rows.reduce((max, row) => Math.max(max, displayWidth(row.label)), 0);
  const lines = rows.map((row) => {
    const pad = " ".repeat(labelWidth - displayWidth(row.label) + 1);
    return `${row.label}${pad}${bar(row.percent, row.suffix)}`;
  });
  return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
}

function attackLines(player, zones) {
  const goals = Number(player.goals) || 0;
  const shots = Number(player.shots) || 0;
  const shotsOn = Number(player.shotsOn) || 0;
  const lines = [
    `${goals}球 (${player.goalsPerGame ?? 0}/場) · ${player.assists || 0}助 (${player.assistsPerGame ?? 0}/場)`,
    shots > 0 ? `射門 ${shots} · 中靶 ${shotsOn} · 轉化 ${goals}/${shots}` : `射門 ${shots} · 中靶 ${shotsOn}`,
    `xG ${Number(player.xg || 0).toFixed(2)} · xA ${Number(player.xa || 0).toFixed(2)}`,
  ];
  if (zones.onIn || zones.offIn) lines.push(`禁區內 中靶 ${zones.onIn} · 偏出 ${zones.offIn}`);
  if (zones.onOut || zones.offOut) lines.push(`禁區外 中靶 ${zones.onOut} · 偏出 ${zones.offOut}`);
  return lines.join("\n");
}

function passLines(player) {
  return [
    `完成 ${player.pm || 0}/${player.pa || 0}`,
    `向前 ${player.passFwd || 0} · 向後 ${player.passBack || 0} · 橫 ${player.passSide || 0}`,
    `關鍵傳球 ${player.keyPass || 0}`,
  ].join("\n");
}

function defenseLines(player) {
  return [
    `攔截 ${player.interceptions || 0}`,
    `搶斷成功 ${player.tk || 0} · 失敗 ${player.tacklesLost || 0}`,
    `封堵 ${player.blocks || 0} · 頭槌防守 ${player.aerialDef || 0} · 盤帶成功 ${player.dribbles || 0}`,
    `上場 ${player.minutes || 0} 分鐘`,
  ].join("\n");
}

function lineOf(player) {
  if (!player) return "—";
  return `${player.games}場 ${player.goals}球 ${player.assists}助 ⭐${Number(player.avgRating || 0).toFixed(2)} xG ${Number(player.xg || 0).toFixed(2)}`;
}

/**
 * Visible body link. Title `url` stays set separately so the embed title is still clickable.
 * The field name is the label. The value is the bare URL, which Discord linkifies.
 * Markdown `[text](url)` in a field value is printed as literal text on mobile.
 */
function statsSiteField(siteUrl) {
  const url = String(siteUrl || "").trim();
  if (!url) return null;
  return {
    name: "🔗 戰績網",
    value: url,
    inline: false,
  };
}

function withStatsSite(embed, siteUrl) {
  const field = statsSiteField(siteUrl);
  if (!field) return embed;
  return { ...embed, fields: [...(embed.fields || []), field] };
}

export function buildPlayerEmbed(stats, query, siteUrl, clubId) {
  const found = findPlayer(stats.board?.players, query);
  if (found.status === "empty") {
    return withStatsSite(
      { title: "❌ 要帶球員名", description: "用 `/player 球員:`", color: 0xffa500, url: siteUrl },
      siteUrl,
    );
  }
  if (found.status === "none") {
    const names = (stats.board?.players || []).map((player) => `• ${player.name}`).join("\n");
    return withStatsSite({
      title: `❌ 搵唔到 ${query}`,
      description: (names || "榜上暫時無人").slice(0, 4000),
      color: 0xffa500,
      url: siteUrl,
    }, siteUrl);
  }
  if (found.status === "many") {
    return withStatsSite({
      title: "多過一個人",
      description: found.names.map((name) => `• ${name}`).join("\n"),
      color: 0xffa500,
      url: siteUrl,
    }, siteUrl);
  }
  const player = found.player;
  const recent = findPlayer(stats.last10?.players, player.name);
  const recentLine = recent.status === "one" ? lineOf(recent.player) : "近10無出場";
  const zones = aggregateShotZones(stats.matches, player.name, clubId);
  const fields = [
    {
      name: "👤 球員",
      value: [
        `**${player.name}** | ${player.posCN || "未知"} | **${player.games}場** | ${player.minutes || 0} 分鐘`,
        `近10：${recentLine}`,
      ].join("\n"),
      inline: false,
    },
    {
      name: "📊 大方向",
      value: overviewBlock(player),
      inline: false,
    },
    {
      name: "⚽ 進攻明細",
      value: attackLines(player, zones),
      inline: false,
    },
    {
      name: "🎯 傳球明細",
      value: passLines(player),
      inline: false,
    },
    {
      name: "🛡 防守明細",
      value: defenseLines(player),
      inline: false,
    },
  ];
  const siteField = statsSiteField(siteUrl);
  if (siteField) fields.push(siteField);
  return {
    title: `${posEmoji(player.posCN)} ${player.name} | ${player.posCN || "未知"}`,
    description: `${stats.board?.label || "全部累計"} · ${stats.board?.totalMatches ?? "?"}場 · ${stats.meta?.lastUpdatedDisplay || ""}`.trim(),
    color: posColor(player.posCN),
    fields,
    footer: { text: stats.board?.source || "數據來自 repo JSON" },
    url: siteUrl,
  };
}

function rankKey(typeVal) {
  const raw = String(typeVal || "goals").trim().toLowerCase();
  if (raw.includes("金靴") || raw === "goals") return "goals";
  if (raw.includes("助攻") || raw === "assists") return "assists";
  if (raw.includes("防守") || raw === "defense") return "defense";
  if (raw.includes("評分") || raw === "rating") return "rating";
  if (raw.includes("出勤") || raw === "games" || raw === "matches") return "games";
  return "goals";
}

export function buildRankEmbed(stats, typeVal, siteUrl) {
  const players = stats.board?.players || [];
  if (!players.length) {
    return { title: "排行榜 - 暫無數據", description: "board.json 未有球員", color: 0xffa500, url: siteUrl };
  }
  const kind = rankKey(typeVal);
  const title = {
    goals: "金靴榜 Top10 - 入球",
    assists: "助攻榜 Top10 - 助攻",
    defense: "防守榜 Top10",
    rating: "評分榜 Top10",
    games: "出勤榜 Top10",
  }[kind];
  const sorted = players.slice().sort((a, b) => {
    if (kind === "goals") return b.goals - a.goals || b.assists - a.assists;
    if (kind === "assists") return b.assists - a.assists || b.goals - a.goals;
    if (kind === "defense") return (b.totalDef || 0) - (a.totalDef || 0);
    if (kind === "rating") return (b.avgRating || 0) - (a.avgRating || 0);
    return (b.games || 0) - (a.games || 0);
  });
  const lines = sorted.slice(0, 10).map((player, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
    if (kind === "goals") return `${medal} **${player.name}** - ${player.goals}球 (${player.games}場)`;
    if (kind === "assists") return `${medal} **${player.name}** - ${player.assists}助 (${player.games}場)`;
    if (kind === "defense") return `${medal} **${player.name}** - 防 ${player.totalDef || 0} (${player.games}場)`;
    if (kind === "rating") return `${medal} **${player.name}** - ⭐${Number(player.avgRating || 0).toFixed(2)} (${player.games}場)`;
    return `${medal} **${player.name}** - ${player.games}場 ${player.goals}G ${player.assists}A`;
  });
  return {
    title,
    description: lines.join("\n"),
    color: 0x22c55e,
    footer: { text: `共${players.length}人 · ${stats.board?.label || "JSON"} ${stats.meta?.lastUpdatedDisplay || ""}`.trim() },
    url: siteUrl,
  };
}

export function buildMatchesEmbed(stats, config) {
  const all = summarizeMatches(stats.matches, config.clubId);
  if (!all.length) {
    return {
      title: "⚽ 近10場 - 暫無數據",
      description: "matches.json 暫時冇這間球會的比賽",
      color: 0xffa500,
      footer: { text: "共0場" },
      url: config.siteUrl,
    };
  }
  const slice = all.slice(0, 10);
  const wins = slice.filter((match) => match.res === "W").length;
  const draws = slice.filter((match) => match.res === "D").length;
  const losses = slice.filter((match) => match.res === "L").length;
  const gf = slice.reduce((sum, match) => sum + match.gf, 0);
  const ga = slice.reduce((sum, match) => sum + match.ga, 0);
  const xgTotal = slice.reduce((sum, match) => sum + match.myList.reduce((acc, player) => acc + player.xg, 0), 0);
  const lines = [];
  slice.forEach((match, index) => {
    const icon = match.res === "W" ? "✅" : match.res === "L" ? "❌" : "➖";
    const xg = match.myList.reduce((sum, player) => sum + player.xg, 0);
    const def = match.myList.reduce((sum, player) => sum + player.def, 0);
    const scorers = match.myList.filter((player) => player.goals > 0).map((player) => `${player.name}⚽${player.goals}`).join(" · ");
    const assists = match.myList.filter((player) => player.assists > 0).map((player) => `${player.name}🅰️${player.assists}`).join(" · ");
    const top = match.myList.slice(0, 3).map((player) => `${player.name}⭐${player.rating.toFixed(1)}`).join(" · ");
    const kind = TYPE_LABEL[match.type] || "比賽";
    lines.push(`**${formatHk(match.ts)}** ${kind} vs **${match.opp}** **${match.gf}-${match.ga}** ${icon}`);
    let sub = `└ xG ${xg.toFixed(1)} · 防 ${def}`;
    if (scorers) sub += ` · ${scorers}`;
    if (assists) sub += ` · ${assists}`;
    lines.push(sub);
    if (top) lines.push(`  └ ${top}`);
    if (index < slice.length - 1) lines.push("");
  });
  return {
    title: `⚽ 近${slice.length}場 ${wins}W${draws}D${losses}L ${gf}-${ga}`,
    description: lines.join("\n").slice(0, 4000),
    color: wins >= draws + losses ? 0x22c55e : 0xe74c3c,
    footer: { text: `共${all.length}場 | 估算 xG ${xgTotal.toFixed(1)} | ${stats.meta?.lastUpdatedDisplay || "JSON"}` },
    url: config.siteUrl,
  };
}

export function buildHelpEmbed() {
  return {
    title: "📖 LinKing FC 指令",
    description: [
      "**📅 報名**",
      "`/signup time:2130`（21:30 / 22:00 / 22:30 / 23:00 / 未確定）",
      "`/cancel` `/list` `/call` `/teams`",
      "",
      "**⚽ 數據**（讀 repo JSON，唔係 Firebase）",
      "`/player 球員:` `/rank 類型:` `/matches`",
      "`/sync` 重新讀取 JSON，唔會寫比賽去 Firebase",
      "",
      "**💬**",
      "`/chat 問題:` 可加 `球員:`",
      "`/help`",
    ].join("\n"),
    color: 0x5865f2,
  };
}

export function buildSyncMessage(stats, config) {
  const meta = stats.meta || {};
  const players = stats.board?.players?.length || 0;
  return [
    "✅ 已重新讀取 JSON",
    "EA 同步由 GitHub Actions 負責。這裡唔寫比賽去 Firebase。",
    `狀態：${meta.lastStatus || "未知"}`,
    `寫入：${meta.lastUpdatedDisplay || meta.lastUpdated || "未知"}`,
    `歷史 ${meta.totalMatches ?? stats.matches.length} 場 · 近10 ${meta.last10Matches ?? "?"} 場 · 球員 ${players} 人`,
    `club ${config.clubId} · ${config.platform}`,
    stats.cached ? "（60 秒快取）" : "（剛抓取）",
  ].join("\n");
}

function coachTips(player) {
  const tips = [];
  const pass = Number(player.passPct || 0);
  const rating = Number(player.avgRating || 0);
  const xg = Number(player.xg || 0);
  const goals = Number(player.goals || 0);
  if (rating >= 7.2) tips.push(`✅ 評分 ${rating.toFixed(2)}，狀態穩`);
  else tips.push(`✅ 出勤 ${player.games} 場，${player.posCN || "球員"}`);
  if (pass && pass < 75) tips.push(`⚠️ 傳球 ${pass}% → 練習一腳出球同向前傳（向前 ${player.passFwd || 0}）`);
  if (xg > goals + 1) tips.push(`⚠️ 估算 xG ${xg.toFixed(2)} 高過入球 ${goals} → 禁區內射門要更果斷`);
  if ((player.posCN === "後衛" || player.posCN === "中場") && player.games && (player.totalDef || 0) / player.games < 2) {
    tips.push("⚠️ 防守參與偏少 → 攔截同搶斷再貼身一點");
  }
  if (tips.length < 2 && (player.keyPass || 0) > 0) tips.push(`🎯 關鍵傳球 ${player.keyPass}，繼續製造`);
  return tips.slice(0, 3);
}

async function tavilySnippet(apiKey, query, fetchImpl) {
  if (!apiKey || !query) return null;
  try {
    const res = await fetchImpl("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `EA FC Pro Clubs ${query}`.slice(0, 300),
        max_results: 2,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const first = json.results && json.results[0];
    if (!first || !first.title) return null;
    return { title: String(first.title).slice(0, 80), url: first.url || "" };
  } catch {
    return null;
  }
}

export async function buildChatEmbed({ query, playerName, stats, tavilyApiKey, fetchImpl = fetch, siteUrl }) {
  const selected = String(playerName || "").trim() || guessPlayerName(query, stats.board?.players);
  const found = selected ? findPlayer(stats.board?.players, selected) : { status: "none" };
  const snippet = await tavilySnippet(tavilyApiKey, query, fetchImpl);
  const extra = snippet ? `\n\n🎥 ${snippet.title}${snippet.url ? `\n${snippet.url}` : ""}` : "";
  if (found.status === "one") {
    const player = found.player;
    const recent = findPlayer(stats.last10?.players, player.name);
    const tips = coachTips(player).join("\n");
    return {
      title: `💬 林Sir · ${player.name}`,
      description: [
        `問題：${query || "（空）"}`,
        "",
        `**數據（${stats.board?.label || "全部"}）**`,
        `${player.posCN || "未知"} · ${lineOf(player)}`,
        `傳球 ${player.passPct || 0}% · 關鍵 ${player.keyPass || 0} · 防守 ${player.totalDef || 0}`,
        `近10：${recent.status === "one" ? lineOf(recent.player) : "無出場"}`,
        "",
        "**建議**",
        tips,
        extra,
      ].join("\n").slice(0, 4000),
      color: 0x3498db,
      footer: { text: `JSON · ${stats.meta?.lastUpdatedDisplay || ""}`.trim() },
      url: siteUrl,
    };
  }
  const record = stats.meta?.recordAll;
  const form = record ? `${record.wins}勝 ${record.draws}和 ${record.losses}負，${record.goalsFor}:${record.goalsAgainst}` : "戰績未有";
  return {
    title: "💬 林Sir",
    description: [
      `收到：${query || "（空）"}`,
      `全隊 ${form}`,
      "想針對一個人，加 `球員:` 或者喺問題寫遊戲 ID。",
      `而家榜上有 ${(stats.board?.players || []).length} 人。`,
      extra,
    ].join("\n").slice(0, 4000),
    color: 0x00a8ff,
    footer: { text: `JSON · ${stats.meta?.lastUpdatedDisplay || ""}`.trim() },
    url: siteUrl,
  };
}
