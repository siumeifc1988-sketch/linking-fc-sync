import { RANK_CHOICES, SLOT_LABELS } from "./config.js";
import { COMMANDS } from "./commands.js";
import {
  editOriginal,
  focusedOption,
  getDiscordIdentity,
  jsonResponse,
  optionValue,
  publicError,
  verifyDiscordRequest,
} from "./discord.js";
import {
  buildCallEmbed,
  buildBalancedTeams,
  formatList,
  formatTeamsEmbed,
  getSignupDoc,
  hkDate,
  normalizeSlot,
  placeSignup,
  removeSignup,
  saveSignupDoc,
  signupRoster,
  slotChoices,
} from "./signup.js";
import { loadStats, playerChoices } from "./stats.js";
import {
  buildChatEmbed,
  buildHelpEmbed,
  buildMatchesEmbed,
  buildPlayerEmbed,
  buildRankEmbed,
  buildSyncMessage,
} from "./views.js";

export async function handlePost(request, config, ctx) {
  const raw = await request.text();
  const ok = await verifyDiscordRequest(request, raw, config.discordPublicKey);
  if (!ok) return new Response("Bad signature", { status: 401 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (body.type === 1) return jsonResponse({ type: 1 });
  if (body.type === 4) return jsonResponse(await autocomplete(body, config));
  if (body.type === 2) return dispatch(body, config, ctx);
  return jsonResponse({ type: 4, data: { content: "不支援這種互動。" } });
}

async function autocomplete(body, config) {
  const focused = focusedOption(body.data);
  const command = body.data?.name;
  if (!focused) return { type: 8, data: { choices: [] } };
  if (focused.name === "time" || focused.name === "slot") {
    return { type: 8, data: { choices: slotChoices(focused.value) } };
  }
  if (focused.name === "類型" && command === "rank") {
    const q = String(focused.value || "").trim().toLowerCase();
    const choices = RANK_CHOICES.filter((choice) => {
      if (!q) return true;
      return choice.name.toLowerCase().includes(q) || choice.value.includes(q);
    });
    return { type: 8, data: { choices } };
  }
  if (focused.name === "球員" && (command === "player" || command === "chat")) {
    try {
      const stats = await loadStats(config);
      return { type: 8, data: { choices: playerChoices(stats.board?.players, focused.value) } };
    } catch {
      return { type: 8, data: { choices: [] } };
    }
  }
  return { type: 8, data: { choices: [] } };
}

function dispatch(body, config, ctx) {
  const task = runCommand(body, config)
    .catch((error) => ({ content: `失敗：${publicError(error)}` }))
    .then((payload) => editOriginal(body, payload))
    .catch(() => {});
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(task);
  return jsonResponse({ type: 5 });
}

async function runCommand(body, config) {
  const name = body.data?.name;
  const known = COMMANDS.some((command) => command.name === name);
  if (!known) return { content: "冇呢條指令。用 /help。" };
  if (name === "help") return { embeds: [buildHelpEmbed()] };
  if (name === "list" || name === "signup" || name === "cancel" || name === "call" || name === "teams") {
    return signupCommand(name, body, config);
  }
  const force = name === "sync";
  const stats = await loadStats(config, { force });
  if (name === "sync") return { content: buildSyncMessage(stats, config) };
  if (name === "player") {
    return { embeds: [buildPlayerEmbed(stats, optionValue(body.data, "球員"), config.siteUrl, config.clubId)] };
  }
  if (name === "rank") return { embeds: [buildRankEmbed(stats, optionValue(body.data, "類型") || "goals", config.siteUrl)] };
  if (name === "matches") return { embeds: [buildMatchesEmbed(stats, config)] };
  if (name === "chat") {
    const embed = await buildChatEmbed({
      query: optionValue(body.data, "問題") || "",
      playerName: optionValue(body.data, "球員") || "",
      stats,
      tavilyApiKey: config.tavilyApiKey,
      siteUrl: config.siteUrl,
    });
    return { embeds: [embed] };
  }
  return { content: "冇呢條指令。用 /help。" };
}

async function signupCommand(name, body, config) {
  const dateStr = hkDate();
  const doc = await getSignupDoc(config, dateStr);
  if (name === "list") return { content: formatList(dateStr, doc.slots) };
  if (name === "signup") {
    const slot = normalizeSlot(optionValue(body.data, "time"));
    if (!slot) return { content: "時段要係 2130 / 2200 / 2230 / 2300 / Unsure。" };
    const identity = getDiscordIdentity(body);
    const slots = placeSignup(doc.slots, slot, identity);
    await saveSignupDoc(config, dateStr, slots);
    const label = SLOT_LABELS[slot] || slot;
    return { content: `✅ <@${identity.id}> 已報名 **${label}**\n\n${formatList(dateStr, slots)}` };
  }
  if (name === "cancel") {
    const identity = getDiscordIdentity(body);
    const removed = removeSignup(doc.slots, identity);
    if (removed.found) await saveSignupDoc(config, dateStr, removed.slots);
    return {
      content: removed.found
        ? `✅ 已取消 <@${identity.id}>\n\n${formatList(dateStr, removed.slots)}`
        : "⚠ 搵唔到報名",
    };
  }
  if (name === "call") {
    const total = signupRoster(doc.slots).length;
    const embed = buildCallEmbed(dateStr, doc.slots);
    const content = config.discordRoleId
      ? `<@&${config.discordRoleId}> 夠鐘開波！`
      : "@everyone ⚽ LinKing FC 夠鐘開波！";
    return { content, embeds: [embed], total };
  }
  const roster = signupRoster(doc.slots);
  if (!roster.length) return { content: `❌ ${dateStr} 暫無報名，先用 /signup` };
  const stats = await loadStats(config);
  const teams = buildBalancedTeams(roster, stats.board?.players);
  return { embeds: [formatTeamsEmbed(dateStr, "今日", teams)] };
}
