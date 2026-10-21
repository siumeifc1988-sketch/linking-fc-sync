/** Public defaults for LinKing FC. Secrets stay in Wrangler env. */

export const DEFAULTS = {
  clubId: "41026",
  platform: "common-gen5",
  siteUrl: "https://siumeifc1988-sketch.github.io/linking-fc-sync/",
  statsJsonBase: "https://raw.githubusercontent.com/siumeifc1988-sketch/linking-fc-sync/main/data",
  firebaseProjectId: "football-signup-64bd9",
  version: "1.0.0",
};

export const SLOT_IDS = ["2130", "2200", "2230", "2300", "Unsure"];

export const SLOT_LABELS = {
  "2130": "21:30",
  "2200": "22:00",
  "2230": "22:30",
  "2300": "23:00",
  Unsure: "未確定",
};

export const RANK_CHOICES = [
  { name: "金靴榜", value: "goals" },
  { name: "助攻榜", value: "assists" },
  { name: "防守榜", value: "defense" },
  { name: "評分榜", value: "rating" },
  { name: "出勤榜", value: "games" },
];

function pick(value, fallback) {
  const text = value == null ? "" : String(value).trim();
  return text || fallback;
}

export function readConfig(env = {}) {
  return {
    clubId: pick(env.CLUB_ID, DEFAULTS.clubId),
    platform: pick(env.PLATFORM, DEFAULTS.platform),
    siteUrl: pick(env.SITE_URL, DEFAULTS.siteUrl).replace(/\/+$/, "") + "/",
    statsJsonBase: pick(env.STATS_JSON_BASE, DEFAULTS.statsJsonBase).replace(/\/+$/, ""),
    firebaseProjectId: pick(env.FIREBASE_PROJECT_ID, DEFAULTS.firebaseProjectId),
    firebaseApiKey: pick(env.FIREBASE_API_KEY, ""),
    discordPublicKey: pick(env.DISCORD_PUBLIC_KEY, ""),
    discordBotToken: pick(env.DISCORD_BOT_TOKEN, ""),
    discordApplicationId: pick(env.DISCORD_APPLICATION_ID, ""),
    discordRoleId: pick(env.DISCORD_ROLE_ID, ""),
    tavilyApiKey: pick(env.TAVILY_API_KEY, ""),
    registerSecret: pick(env.REGISTER_SECRET, ""),
    version: pick(env.WORKER_VERSION, DEFAULTS.version),
  };
}

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
