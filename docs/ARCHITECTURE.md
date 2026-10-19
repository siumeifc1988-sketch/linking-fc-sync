# linking-fc-sync 架構整理

對過 `main`，2026-10-19。俱樂部 `41026` LinKing FC，平台 `common-gen5`。

你寫的四層方向是對的：定時抓、用 Git 當資料庫、靜態頁、再加一個 Bot。下面是倉庫裡實際在跑的東西，和那份說明不一樣的地方。

## 現在真正的資料流

```text
EA Pro Clubs API
    │  curl_cffi 模擬瀏覽器；失敗就留舊檔
    ▼
GitHub Actions（兩條，都會 push）
    │  data/matches.json
    │  data/aggregated/board.json
    │  data/meta.json
    ├─ GitHub Pages 重新發佈（有靜態 JSON，可給 Bot 讀）
    │
    └─ index.html 不讀這些 JSON
           它讀 Firebase：football-signup-64bd9 / clubs/41026
```

Bot 應該讀 GitHub JSON。不要讀網頁，也不要自己再爬 EA。

## 1. 抓取

| 檔案 | 排程 | 備註 |
| --- | --- | --- |
| `.github/workflows/ea-sync-curl_cffi.yml` | `0 */6 * * *`（UTC） | Session + 三種瀏覽器指紋。10 月 18 日起在跑。 |
| `.github/workflows/ea-sync.yml` | `0 19 * * *`（UTC，約 03:00 HKT，GitHub 會延遲） | 直連失敗才走 proxy。邏輯和上面幾乎一樣。 |

兩邊都是把整支 Python 寫進 YAML，沒有獨立腳本。`requirements.txt` 沒被 install。裡面的 pandas、fc-clubs-api、firebase-admin、requests 都不參與同步。

俱樂部、三種比賽、各抓 10 場：`leagueMatch`、`friendlyMatch`、`playoffMatch`。抓到 0 場就保留 `matches.json`，但仍重寫 `board.json` / `meta.json` 的時間和 `lastStatus`。作者名是 `pepe-bot`，這只是 commit 名稱。

`[skip ci]` 不是防迴圈的原因。這兩條不聽 `push`，只聽排程和手動，所以自己 push 不會再觸發。

### 10 月 19 日實際發生的事

- 04:22 HKT，`ea-sync-curl_cffi`：`已更新`，聯賽 10 + 季後 10 + 友誼 0。
- 05:16 HKT，`ea-sync.yml`（排程從 03:00 延到這時）：抓到 0 場，狀態改成 `保留舊檔`，比賽內容沒蓋掉。

所以現在檔頭不可信，內容還是 04:22 那 20 場。

### 兩個實錯

1. **6 小時那條的 `EA_PROXY_URL` 放錯步驟。** 密鑰在「寫出 fetch.py」那步，`python /tmp/fetch.py` 那步沒有。直連被封時 proxy 不會生效。每日那條才把密鑰放在執行步。
2. **兩條一起寫同一組檔。** 後跑的那個會改狀態標籤，甚至在抓成功時整份換掉比賽。

抓成功時不是累加歷史，是用這次的視窗覆蓋 `matches.json`。榜只根據這個視窗重算。長期紀錄只在 git history。xG / xA 是公式估算（射門位置加權），不是 EA 官方數字。

## 2. 資料

| 檔 | 角色 |
| --- | --- |
| `data/matches.json` | EA 原賽 JSON 陣列，大約 20 場，外加 `_matchType`。 |
| `data/aggregated/board.json` | 球員累計、`totalMatches`、`lastStatus`、`lastFetchCounts`、`version`。 |
| `data/meta.json` | 給人看的短狀態，不含球員。 |

公開讀取：

`https://raw.githubusercontent.com/siumeifc1988-sketch/linking-fc-sync/main/data/aggregated/board.json`

`board.players` 欄位：`name` `posCN` `games` `goals` `assists` `xg` `xa` `pm` `pa` `passPct` `keyPass` `interceptions` `clearances` `blocks` `tk` `totalDef` `avgRating`。

## 3. 網頁

`index.html` 約 200KB，單一 React 包，部署在 GitHub Pages。畫面標題是 LinKing FC 41026。它向 Firebase 專案 `football-signup-64bd9` 讀 `clubs/41026/members_stats` 等路徑，**沒有** `fetch ./data/board.json`。

所以「打開網頁就讀相對路徑 JSON」這句，目前不是事實。JSON 是給 Pages 靜態檔和之後的 Bot 用的。

## 4. Bot

這個倉庫裡沒有 Worker，也沒有 Discord。`marin-bot` 是另一個倉庫：discord.js 長連線、`/chat`、人設走 `marin-bot.siumeifc1988.workers.dev`。它不讀這份榜。

$0 的接法是：新的 Discord Application + Cloudflare Worker Interactions（見 `bot/`）。只在有人下指令時讀上面的 raw JSON。不要和 marin-bot 共用 Application。

## 建議的整理順序

1. 停掉其中一條 workflow，只留 `ea-sync-curl_cffi`。
2. Python 抽成 `scripts/sync.py`，兩份邏輯不要再複製。
3. `EA_PROXY_URL` 放到真正執行 Python 的步驟。
4. 抓到 0 場時不要改 `lastStatus` 以外的榜；或另外寫 `lastAttempt`，成功的 `lastSuccess` 留著。
5. 決定網頁繼續用 Firebase，還是改讀 `data/`。不要兩邊都當正式來源。
6. `requirements.txt` 刪掉用不到的套件，或改成 workflow 真的去 install 它。
