# linking-fc-sync 架構整理

對過 `main`，2026-10-19 更新。俱樂部 `41026` LinKing FC，平台 `common-gen5`。

## 資料流

```text
EA Pro Clubs API
    │  scripts/sync.py（curl_cffi；失敗保留舊 matches）
    ▼
GitHub Actions（ea-sync-curl_cffi，每 6 小時）
    │  data/matches.json
    │  data/aggregated/board.json
    │  data/meta.json
    ├─ GitHub Pages → index.html 讀相對路徑 JSON
    └─ Discord Bot（bot/）讀 raw.githubusercontent.com
```

## 抓取

- 工作流：`.github/workflows/ea-sync-curl_cffi.yml`
- 腳本：`scripts/sync.py`（唯一同步邏輯）
- 依賴：`requirements.txt` → `curl-cffi`
- `EA_PROXY_URL` 在「執行腳本」步驟注入；直連失敗才走 proxy
- 每種比賽各最多 10 場：聯賽 / 友誼 / 季後；成功則覆蓋 matches，失敗保留舊檔並標 `保留舊檔`
- 榜與 xG/xA 只根據當前視窗重算；xG 是估算，不是 EA 官方

## 網頁

`index.html` 純前端，打開後讀：

- `./data/aggregated/board.json`
- `./data/matches.json`

不再依賴 Firebase。

## Bot

見 `bot/README.md`。Cloudflare Worker 斜線指令，讀同一份公開 JSON。請用獨立 Discord Application，不要掛在 marin-bot。

## 建議

1. Secrets 確認有設 `EA_PROXY_URL`（可選，但 GitHub Runner 常被 EA 封）
2. 需要手動同步：Actions → ea-sync-curl_cffi → Run workflow
