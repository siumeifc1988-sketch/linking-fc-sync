/** Slash commands registered with Discord. Option names match the live bot. */

export const COMMANDS = [
  {
    name: "list",
    description: "睇今日名單",
  },
  {
    name: "signup",
    description: "報名",
    options: [
      {
        name: "time",
        description: "時段",
        type: 3,
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: "cancel",
    description: "取消報名",
  },
  {
    name: "call",
    description: "夠鐘",
  },
  {
    name: "teams",
    description: "分隊 - 自動平衡今日所有報名人",
  },
  {
    name: "player",
    description: "查球員",
    options: [
      {
        name: "球員",
        description: "球員名",
        type: 3,
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: "rank",
    description: "排行榜",
    options: [
      {
        name: "類型",
        description: "類型",
        type: 3,
        required: false,
        autocomplete: true,
      },
    ],
  },
  {
    name: "chat",
    description: "問林Sir - Pro教練分析",
    options: [
      { name: "問題", description: "你想問咩", type: 3, required: true },
      {
        name: "球員",
        description: "選擇球員 (可選)",
        type: 3,
        required: false,
        autocomplete: true,
      },
    ],
  },
  {
    name: "matches",
    description: "近10場",
  },
  {
    name: "sync",
    description: "重新讀取網站 JSON",
  },
  {
    name: "help",
    description: "說明",
  },
];
