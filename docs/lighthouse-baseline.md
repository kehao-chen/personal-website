# Lighthouse 基準

目標：四個類別皆綠（≥ 0.90）。不追滿分。

設定：Lighthouse 預設的行動裝置模擬 + 網路節流，三次取中位數。
執行：`npm run test:lighthouse`

## 實測（2026-08-25）

| 路由 | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 97 | 100 | 96 | 100 | 1214 ms | 0.000 | 193 ms |
| `/about/` | 97 | 100 | 96 | 100 | 1205 ms | 0.000 | 183 ms |
| `/writing/` | 98 | 100 | 93 | 100 | 1204 ms | 0.000 | 187 ms |
| `/writing/approval-orchestrator/` | 100 | 100 | 96 | 100 | 903 ms | 0.000 | 0 ms |
| `/zh/` | 97 | 100 | 96 | 100 | 1205 ms | 0.000 | 194 ms |
| `/zh/writing/aks-lun-exhaustion/` | 100 | 100 | 96 | 100 | 903 ms | 0.000 | 0 ms |

六個 URL 的四個類別中位數皆 ≥ 0.90，`npm run test:lighthouse` 第一次以正確設定執行就全部通過，未使用補救 A/B/C（詳見下方「執行紀錄」）。

## 執行紀錄

- `/`、`/zh/` 載入 three.js 播放入侵序列，但 LCP（1214 ms / 1205 ms）與 TBT（193 ms / 194 ms）皆遠低於 2500 ms / 300 ms 門檻，未觸發補救 A（延遲載入 three.js）或補救 B（檢查 `seq-pending`）。
- 文章內頁（`/writing/approval-orchestrator/`、`/zh/writing/aks-lun-exhaustion/`）零 JavaScript，TBT 為 0 ms，如預期般是分數最高的路由。
- 第一輪實測曾發現 `/about/`、`/zh/about/` 的 `color-contrast` 稽核以 0 分未通過（`.win-deco` 使用 `--dim`，對比僅 3.85:1，未達 4.5:1）。這不是效能問題，不屬於補救 A/B/C 的範圍：`READ-ONLY` 是承載資訊的文字（告知讀者此頁唯讀），依 `TerminalWindow.astro` 既有的 `meta`（承載資訊，用 `--muted`）/`deco`（純裝飾，用 `--dim`）分工，應該用 `meta` 而非 `deco`。修正 `src/pages/about.astro`、`src/pages/zh/about.astro`，把 `deco="READ-ONLY"` 改成 `meta="READ-ONLY"` 後重跑，`color-contrast` 轉為滿分，其餘分數不受影響。

## 刻意關閉的稽核

| 稽核 | 原因 |
|---|---|
| `unused-javascript` | three.js 在首次繪製時尚未使用是刻意的載入策略 |
| `legacy-javascript` | 同上 |
| `uses-responsive-images` / `modern-image-formats` | v1 沒有圖片 |
| `csp-xss` | CSP 由 Cloudflare Pages 的 `public/_headers` 提供，不在建置產物內 |
| `uses-http2` | 本機 preview 無 HTTP/2，正式環境由 Cloudflare 提供 |

關閉一項稽核就要在這裡寫下原因。沒有原因的關閉，下次就會變成沒有人記得的技術債。
