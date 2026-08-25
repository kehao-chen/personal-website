# happyhacking.ninja

個人網站。門面是 1-bit 抖色的入侵序列，文字內容住在終端機視窗裡。

## 開發

```bash
npm install
npm run dev        # http://localhost:4321
```

## 測試

```bash
npm test           # 單元測試（純函式與配色守門）
npm run check      # 型別檢查
npm run test:e2e   # 端對端護欄
```

## 寫文章

在 `src/content/posts/<lang>/<slug>.md` 建立檔案，`<lang>` 為 `en` 或 `zh`。
frontmatter 必須符合 `src/content.config.ts` 的 schema，不符會導致建置失敗。

```yaml
---
title: "標題"
description: "一句話摘要"
date: 2026-08-25
lang: zh
tags: ["AZURE"]
translationKey: "optional-shared-key"   # 有中英兩版時填相同的值
---
```

檔名以底線開頭（`_draft.md`）的檔案不會被收錄。

## 設計文件

`docs/superpowers/specs/2026-08-24-personal-website-design.md`

## 配色

配色 token 定義於 `src/styles/tokens.css`，值來自作者持有授權的商業配色方案；
此 repo 只定義語意化 token，不散布任何主題檔。

## 部署

Cloudflare Pages 專案 `happyhacking-ninja`。此 repo 目前沒有 remote，專案也
沒有接 Git 整合，所以是手動部署，每次要上線就手動跑一次：

```bash
npm run build
npx wrangler pages deploy dist --project-name=happyhacking-ninja
```

- Build command：`npm run build`
- Build output directory：`dist`
- Node version：22（`NODE_VERSION` 環境變數）
- Production branch：`main`
- 目前對外服務網址：https://happyhacking-ninja.pages.dev

**自訂網域尚未接上。** `happyhacking.ninja` 與 `www.happyhacking.ninja`
目前正在服務一個既有的 Hugo 網站，接上這個新專案會立刻蓋掉那個網站。
確認舊站已處理好之後，再執行：

```bash
npx wrangler pages domain add happyhacking-ninja happyhacking.ninja
npx wrangler pages domain add happyhacking-ninja www.happyhacking.ninja
```
