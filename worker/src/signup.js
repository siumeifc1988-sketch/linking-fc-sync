import { SLOT_IDS, SLOT_LABELS } from "./config.js";

export function hkDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function emptySlots() {
  const slots = {};
  for (const id of SLOT_IDS) slots[id] = [];
  return slots;
}

export function normalizeSlot(value) {
  const raw = String(value || "").trim();
  if (SLOT_IDS.includes(raw)) return raw;
  const found = Object.entries(SLOT_LABELS).find(([, label]) => label === raw);
  return found ? found[0] : null;
}

export function decodeSignupDocument(data) {
  const fields = data?.fields?.slots?.mapValue?.fields || {};
  const slots = emptySlots();
  for (const id of SLOT_IDS) {
    const values = fields[id]?.arrayValue?.values || [];
    slots[id] = values.map((value) => {
      const map = value?.mapValue?.fields || {};
      return {
        name: map.name?.stringValue || "未知",
        ts: Number(map.ts?.integerValue || 0),
        id: map.id?.stringValue || "",
        discordId: map.discordId?.stringValue || null,
      };
    });
  }
  return { slots };
}

export function encodeSignupBody(dateStr, slots) {
  const slotFields = {};
  for (const id of SLOT_IDS) {
    const values = (slots[id] || []).map((person) => {
      const fields = {
        name: { stringValue: person.name },
        ts: { integerValue: String(person.ts || 0) },
        id: { stringValue: person.id || "" },
      };
      if (person.discordId) fields.discordId = { stringValue: person.discordId };
      return { mapValue: { fields } };
    });
    slotFields[id] = { arrayValue: { values } };
  }
  return {
    fields: {
      slots: { mapValue: { fields: slotFields } },
      date: { stringValue: dateStr },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
}

function keepOther(person, identity) {
  if (identity.id && person.discordId) return person.discordId !== identity.id;
  return person.name !== identity.name;
}

export function placeSignup(slots, slotId, identity, now = Date.now()) {
  const next = emptySlots();
  for (const id of SLOT_IDS) {
    next[id] = (slots[id] || []).filter((person) => keepOther(person, identity));
  }
  next[slotId].push({
    name: identity.name,
    ts: now,
    id: `${identity.name}_${now}`,
    discordId: identity.id,
  });
  return next;
}

export function removeSignup(slots, identity) {
  const next = emptySlots();
  let found = false;
  for (const id of SLOT_IDS) {
    const before = (slots[id] || []).length;
    next[id] = (slots[id] || []).filter((person) => keepOther(person, identity));
    if (next[id].length !== before) found = true;
  }
  return { slots: next, found };
}

function signupUrl(config, dateStr) {
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.firebaseProjectId)}/databases/(default)/documents/signups/${encodeURIComponent(dateStr)}`,
  );
  url.searchParams.set("key", config.firebaseApiKey);
  return url;
}

function assertKey(config) {
  if (!config.firebaseApiKey) {
    throw new Error("未設定 FIREBASE_API_KEY");
  }
}

export async function getSignupDoc(config, dateStr, fetchImpl = fetch) {
  assertKey(config);
  const url = signupUrl(config, dateStr);
  let res;
  try {
    res = await fetchImpl(url);
  } catch {
    throw new Error("讀取報名失敗（網絡）");
  }
  if (res.status === 404) return { slots: emptySlots(), exists: false };
  if (!res.ok) throw new Error(`讀取報名失敗 (${res.status})`);
  const data = await res.json();
  return { ...decodeSignupDocument(data), exists: true };
}

export async function saveSignupDoc(config, dateStr, slots, fetchImpl = fetch) {
  assertKey(config);
  const url = signupUrl(config, dateStr);
  url.searchParams.append("updateMask.fieldPaths", "slots");
  url.searchParams.append("updateMask.fieldPaths", "date");
  url.searchParams.append("updateMask.fieldPaths", "updatedAt");
  let res;
  try {
    res = await fetchImpl(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(encodeSignupBody(dateStr, slots)),
    });
  } catch {
    throw new Error("儲存報名失敗（網絡）");
  }
  if (!res.ok) throw new Error(`儲存報名失敗 (${res.status})`);
  return true;
}

function mention(person) {
  return person.discordId ? `<@${person.discordId}>` : person.name;
}

export function formatList(dateStr, slots) {
  const lines = [`📅 **${dateStr}**`, ""];
  let total = 0;
  for (const id of SLOT_IDS) total += (slots[id] || []).length;
  if (total === 0) {
    lines.push("暫無人報名");
  } else {
    for (const id of SLOT_IDS) {
      const people = (slots[id] || []).slice().sort((a, b) => a.ts - b.ts);
      if (!people.length) continue;
      lines.push(`**⏰ ${SLOT_LABELS[id]}** (${people.length})`);
      for (const person of people) lines.push(mention(person));
      lines.push("");
    }
  }
  lines.push(`總數 **${total}人** ${total >= 4 ? "✅" : `❌差${4 - total}`}`);
  return lines.join("\n");
}

export function buildCallEmbed(dateStr, slots) {
  let total = 0;
  const lines = [];
  for (const id of SLOT_IDS) total += (slots[id] || []).length;
  lines.push(`📅 **${dateStr}** | 總數 **${total}人** ${total >= 4 ? "✅" : `❌差${4 - total}`}`);
  lines.push("");
  for (const id of SLOT_IDS) {
    const list = slots[id] || [];
    if (!list.length) continue;
    lines.push(`**⏰ ${SLOT_LABELS[id]}** (${list.length})`);
    for (const person of list) lines.push(`• ${mention(person)}`);
    lines.push("");
  }
  return {
    title: "🔔 夠鐘開波！",
    description: lines.join("\n").slice(0, 4000),
    color: 0xff0000,
    footer: { text: `LinKing FC | ${dateStr}` },
  };
}

export function signupRoster(slots) {
  const all = [];
  for (const id of SLOT_IDS) all.push(...(slots[id] || []));
  return all;
}

export function buildBalancedTeams(signupList, players) {
  const board = Array.isArray(players) ? players : [];
  const rows = signupList.map((signup) => {
    const name = String(signup.name || "");
    const found =
      board.find((player) => String(player.name || "").toLowerCase() === name.toLowerCase()) ||
      board.find((player) => name && String(player.name || "").toLowerCase().includes(name.toLowerCase()));
    return {
      name,
      posCN: found?.posCN || "未知",
      rating: found ? numRating(found.avgRating) : 5,
    };
  });
  const posOrder = { 門將: 0, 後衛: 1, 中場: 2, 前鋒: 3, 未知: 4 };
  rows.sort((a, b) => (posOrder[a.posCN] ?? 4) - (posOrder[b.posCN] ?? 4) || b.rating - a.rating);
  const teamA = [];
  const teamB = [];
  let sumA = 0;
  let sumB = 0;
  for (const row of rows) {
    if (sumA <= sumB) {
      teamA.push(row);
      sumA += row.rating;
    } else {
      teamB.push(row);
      sumB += row.rating;
    }
  }
  const avg = (sum, team) => (team.length ? (sum / team.length).toFixed(2) : "0.00");
  return { teamA, teamB, avgA: avg(sumA, teamA), avgB: avg(sumB, teamB) };
}

function numRating(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function formatTeamsEmbed(dateStr, slotLabel, teams) {
  const line = (row, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
    return `${medal} **${row.name}** [${row.posCN}] ⭐${Number(row.rating).toFixed(2)}`;
  };
  const left = (teams.teamA || []).map(line);
  const right = (teams.teamB || []).map(line);
  return {
    title: `⚔️ 分隊 - ${dateStr} ${slotLabel}`,
    description: `**Team A** (平均 ⭐${teams.avgA})\n${left.join("\n") || "無"}\n\n**Team B** (平均 ⭐${teams.avgB})\n${right.join("\n") || "無"}`,
    color: 0xe74c3c,
    footer: { text: `共 ${(teams.teamA || []).length + (teams.teamB || []).length}人 | LinKing FC` },
  };
}

export function slotChoices(query) {
  const q = String(query || "").trim().toLowerCase();
  return SLOT_IDS.map((id) => ({ name: SLOT_LABELS[id], value: id })).filter((choice) => {
    if (!q) return true;
    return choice.name.toLowerCase().includes(q) || choice.value.toLowerCase().includes(q);
  });
}
