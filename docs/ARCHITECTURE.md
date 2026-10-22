# linking-fc-sync 架構整理

對過 `main`，2026-10-19 更新。俱樂部 `41026` LinKing FC，平台 `common-gen5`。

## 資料流

```text
EA Pro Clubs API
    │  scripts/sync.py（curl_cffi；失敗保留舊 matches）
    ▼
GitHub Actions（ea-sync-curl_cffi，每日 03:00 HKT）
    │  data/matches.json
    │  data/aggregated/board.json + board_last10.json
    │  data/meta.json
    ├─ GitHub Pages → index.html 讀相對路徑 JSON
    ├─ bot/（舊 pepe-bot，只讀 JSON）
    └─ worker/ Discord Worker 讀同一份 JSON
Firebase football-signup-64bd9 只存報名時段，唔係數據來源
```

## 抓取

- 工作流：`.github/workflows/ea-sync-curl_cffi.yml`（每日 03:00 HKT）。`data/` 有變先 commit；push 用 `GITHUB_TOKEN` 唔會觸發 `on: push`，所以寫入 `main` 後會 `workflow_dispatch` Deploy Pages
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

`bot/` 係舊的只讀 pepe-bot。Discord 報名同數據指令見 `worker/README.md`。Worker 讀上面嘅 JSON；Firebase 只存當日報名。唔好再由 Worker 寫 EA 比賽。

## 建議

1. Secrets 確認有設 `EA_PROXY_URL`（可選，但 GitHub Runner 常被 EA 封）
2. 需要手動同步：Actions → ea-sync-curl_cffi → Run workflow
