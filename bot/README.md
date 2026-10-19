# pepe-bot

LinKing FC 的 Discord 斜線指令。只讀這個倉庫的公開 JSON，不爬 EA，不連 Firebase。

指令：

| 指令 | 作用 |
| --- | --- |
| `/status` | 檔頭狀態、視窗戰績、上次抓取回報 |
| `/board` | 榜。`sort` 可選 `attack` `defense` `rating` `pass` |
| `/player name:` | 單一球員 |
| `/matches count:` | 最近比分，預設 6，最多 15 |
| `/form` | 近 5 場 |

資料是最近一個抓取視窗（大約各 10 場），不是生涯。xG / xA 是同步腳本的估算。`lastStatus = 保留舊檔` 只代表那一次抓到 0 場，舊比賽還在。

## 不要掛在 marin-bot 同一個 Application

`marin-bot` 已經用 Gateway 收 `/chat`。同一個 Application 如果改成 Interactions Endpoint URL，Discord 會把斜線指令改送去 Worker，海夢那個 `/chat` 會收不到。請開一個新的 Discord Application。

## 部署（Cloudflare，免費額度）

1. Discord Developer Portal 開新 Application，Bot 頁加入伺服器，打開 `applications.commands`。
2. General Information 複製 Public Key。
3. 在本目錄：

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler deploy
```

4. 把 Worker 的 `https://…workers.dev` 填進 Interactions Endpoint URL。Discord 會發 PING，Worker 回 type 1 才算通過。
5. 用 Bot Token 註冊指令一次（Token 只留在你自己的機器，不要 commit）：

```bash
curl -X PUT "https://discord.com/api/v10/applications/APPLICATION_ID/commands" \
  -H "Authorization: Bot BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @commands.json
```

指令定義在 `commands.json`。
