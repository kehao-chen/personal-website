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
npm run test:lighthouse   # 效能 / a11y / SEO 預算（本機為 4× CPU 節流）
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

## CI/CD

[![CI](https://github.com/kehao-chen/personal-website/actions/workflows/ci.yml/badge.svg)](https://github.com/kehao-chen/personal-website/actions/workflows/ci.yml)

定義在 `.github/workflows/ci.yml`。

| Job | 內容 |
|---|---|
| 型別 / 單元 / E2E | `astro check`、`vitest`、`playwright`（只裝 chromium） |
| Lighthouse | `lhci autorun`，6 個 URL × 3 runs |
| 部署 Cloudflare Pages | 前兩者全綠才跑 |

- push `main` → production
- 同一個 repo 的 PR → 以分支名進 preview 環境，網址回貼到 PR（同一則留言就地更新）
- fork 來的 PR 拿不到 secrets，deploy job 會安靜跳過

需要兩個 repo secret：`CLOUDFLARE_API_TOKEN`（權限只需 Account → Cloudflare
Pages → Edit）與 `CLOUDFLARE_ACCOUNT_ID`。

> 用 `gh secret set` 設定時要在**真正的終端機**裡跑。沒有 TTY 的環境（例如某些
> 工具的內嵌 shell）它會直接讀 stdin，讀到 EOF 就寫入空字串，Actions 那邊看起來
> 是 secret 存在、實際拿到空值，deploy 會以「CLOUDFLARE_API_TOKEN not set」失敗。

Lighthouse 在 CI 上不節流 CPU，門檻的意義與本機不同——原因與代價見
`lighthouserc.cjs` 的註解與 `docs/lighthouse-baseline.md`。**CI 綠不等於效能沒退**，
動到 three.js 或首頁序列之後請在本機跑一次 `npm run test:lighthouse`。

## 部署

Cloudflare Pages 專案 `happyhacking-ninja`，以 direct upload 建立。Cloudflare
不支援把既有的 direct-upload 專案改接 Git 整合，所以是由 Actions 建置後用
wrangler 上傳，而不是 Pages 自己拉 repo。

- Production branch：`main`
- Build output directory：`dist`
- Node version：見 `.nvmrc`
- 對外網址：https://happyhacking.ninja（`www` 以 301 導到 apex）

需要手動出手時：

```bash
npm run build
npx wrangler pages deploy dist --project-name=happyhacking-ninja --branch=main
```

舊 Hugo 站的 `/categories/`、`/tags/`、`/authors/`、`/series/` 不做轉導，直接
404——刻意的 breaking change。
