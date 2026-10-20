# LinKing FC Web（React + TanStack）

靜態 JSON 不變，前端改用 Vite + React + TanStack Table / Query。

## 功能

- **總覽 / 全部累計**：TanStack Table 排序、列展開分類明細
- **全部累計**：勾選最多 3 人 → 底部對比條 → 對比面板
- **戰報**：點列**展開**單場詳情（雙方球員表，可再展開個人明細）

## 本機開發

```bash
cd web
npm install
# 把 repo 根目錄 data 連到 public（只需一次）
ln -sfn ../../data public/data
npm run dev
```

開 http://localhost:5173/linking-fc-sync/

## 建置

```bash
cd web
npm run build
# 產物在 web/dist
# 部署時需同時提供 /linking-fc-sync/data/*（repo 根 data/）
```

## 與舊版並存

目前 repo 根仍是舊 `index.html` + `app.js`。  
要切換 GitHub Pages 到 React 版，可：

1. 建置 `web/dist`
2. 將 `dist/*` 部署到 Pages，並保留根目錄 `data/`
3. 或加 Actions：build → upload Pages artifact
