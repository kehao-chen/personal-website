# 個人網站設計文件

- **日期**：2026-08-24
- **網域**：happyhacking.ninja
- **狀態**：設計定案，待撰寫實作計畫

---

## 1. 定位與範圍

一個兼具**門面**與**技術部落格**的個人網站。兩者刻意分開設計：門面負責留下印象，文章區負責被讀完。這兩件事在體驗上互斥，硬要合併會兩邊都做不好。

- **介面語言**：英文
- **文章語言**：中文為主，偶爾英文
- **公開性**：網站原始碼公開；寫作草稿工作區（`blog-drafts`）維持私有

### v1 範圍

**做**：首頁入侵序列、文章索引、文章頁、About、雙語路由、RSS、404。

**不做**（明確排除，避免範圍蔓延）：站內搜尋、留言系統、標籤索引頁（`tags` 欄位先存著但不產生頁面）、淺色主題（此站只有一種模式）。

---

## 2. 視覺方向

### 2.1 核心概念

視覺語彙取自 Watch Dogs 2 的過場動畫，但**以 1-bit 抖色（dither）為主體**——純雙色調，沒有灰階，所有中間調由 Bayer 網點密度構成。

首頁不是一張靜態海報，而是一段**入侵序列**：連線 → 掃描 → 突破 → 進入 → 揭露。Datamosh 故障不是裝飾，它是「突破」那一格的實質內容。

網域本身已經內建了梗（Happy Hacking + `.ninja`），所以門面不需要再解釋自己在做什麼。中二是刻意的、自覺的，不是失手。

### 2.2 配色 token

值來自使用者持有授權的 Dracula PRO。**在本 repo 中只定義語意化 token，不以主題檔形式散布。**

| Token | 值 | 用途 |
|---|---|---|
| `--ground` | `#22212C` | 底色 |
| `--ink` | `#F8F8F2` | 內文、抖色網點 |
| `--accent` | `#80FFEA` | 強調（Cyan） |
| `--line` | `#454158` | 邊框、分隔線 |
| `--panel` | `#1B1A23` | 視窗標題列、程式碼區塊底 |
| `--dim` | `#7970A9` | **僅限裝飾性視窗 chrome** |
| `--muted` | `rgba(248,248,242,.62)` | 有意義的次要文字（日期、字數） |
| `--syntax-*` | Dracula PRO 七色相 | **僅限程式碼區塊** |

**用色紀律**：全站雙色 + 一個強調色。多色相只出現在程式碼語法高亮——因為在那裡顏色在傳遞語法結構的資訊，不是裝飾。強調色只用於：狀態指示、視窗角標、連結、`ACCESS GRANTED` 那一格。

#### 對比度（已驗算）

| 組合 | 比值 | 判定 |
|---|---|---|
| `--ink` / `--ground` | 14.96:1 | AAA |
| `--accent` / `--ground` | 13.17:1 | AAA |
| `--muted` / `--ground` | 6.58:1 | AA |
| `--dim` / `--ground` | 3.56:1 | 僅 AA Large |

`--dim` 因為只有 3.56:1，**內文一律不得使用**。它僅供視窗標題列那類「看不到也不影響理解」的裝飾性標記。任何承載實際資訊的次要文字（日期、閱讀時間、語言標示）必須用 `--muted`。

### 2.3 抖色渲染規格

| 參數 | 值 | 說明 |
|---|---|---|
| 抖動圖樣 | Bayer 4×4 | |
| 像素大小 | 2 | 虛擬解析度 = 螢幕解析度 / 2 |
| 顆粒 `grain` | 0.02 | 每格隨機亮度擾動；**不是抖色本身的密度** |
| 脈衝環 | 0.26 | 同心圓，僅作用於暗部 |
| 降取樣 | 每格 5 tap 盒狀平均 | 讓細線框在降取樣後不消失 |

管線順序固定為 **glitch → 降取樣 → 抖色量化**。故障必須發生在量化之前，否則會出現「乾淨的故障疊在粗糙畫面上」的破綻。

強調色透過**紅色通道遮罩**傳遞：場景中以紅色繪製的物件（如 `ACCESS GRANTED` 字板）在 post shader 中被判定為 accent，其餘維持 ink 色。場景本身始終是雙色的。

### 2.4 字標

`KEHAO` 為主，`// HAPPY HACKING` 為副標。

**低頻閃動**：每 4.2 秒（±40% 隨機）抽動一次，持續 70–160ms，期間不透明度與 glitch 短暫跳動。持續抖動是雜訊，偶爾抽動才是角色。

### 2.5 入侵序列

總長 3050ms @ 1.0×。可跳過（任意鍵／點擊）。

| 格 | 區間 | 畫面 |
|---|---|---|
| ① BOOT | 0–900ms | 全螢幕抖色雜訊；左上終端機逐字打字 |
| ② SCAN | 900–1500ms | 脈衝環急速外擴；線框結構自雜訊浮現 |
| ③ BREACH | 1500–1820ms | Datamosh 全力爆發 + 白閃 |
| ④ GRANTED | 1820–2500ms | `ACCESS GRANTED` 砸入，**全片唯一彩色時刻** |
| ⑤ SETTLE | 2500–3050ms | 故障衰減；字標自抖色浮現；導覽淡入 |

序列結束後，hero 終端機視窗執行收尾：`$ cat ~/.profile` 逐字打出，打完吐出自我介紹。

開場終端機文案：
```
> ESTABLISHING LINK
> HANDSHAKE 0x4F2A ······ OK
> BYPASSING EDGE/ctOS ···· OK
> PRIVILEGE  ninja
> TARGET  happyhacking.ninja
```

**播放規則**：每個 session 只播一次（`sessionStorage`）；`prefers-reduced-motion` 時完全略過。不做這兩件事，回訪者第二次就會離開。

### 2.6 終端機視窗

**所有文字內容都住在終端機視窗裡。** 這同時解決了可讀性與風格：視窗底是實心 `--ground`，背景抖色永遠碰不到文字；而「你剛駭進一台機器，正在讀上面的檔案」讓黑底成為劇情的一部分，不是補丁。

視窗結構：

| 部位 | 內容 | Token |
|---|---|---|
| 標題列 · 狀態點 | ● | `--accent` |
| 標題列 · 路徑 | `~/writing/<slug>.md` | `--muted` |
| 標題列 · 右側 | `UTF-8 · ZH-HANT · 14 MIN` | `--muted`（承載資訊） |
| 標題列 · 裝飾標記 | `SSH · 80×24` 之類 | `--dim`（純裝飾） |
| 本體 | 內容 | `--ink` |
| 狀態列 | `● EOF` / 日期 / 標籤 | `● ` 用 `--accent`，其餘 `--muted` |
| 角標 | 左上、右下直角記號 | `--accent` |

文章的 metadata 全部由視窗 chrome 承載——日期、字數、語言、標籤原本是無聊的資訊，變成視窗的一部分後同時具備功能與風格，且不需另外設計元件。

**視窗底不透明度固定為 1.00，不做成可調參數。** 經並排驗證：在 `grain = 0.02` 的設定下，降低不透明度不產生可見效果，卻讓每一頁的可讀性多一個出錯點。

### 2.7 換頁轉場

Datamosh 故障，420ms：

- 0–10%：起爆
- 10–55%：維持峰值
- **42%：內容交換**（在故障最高點交換，避免軟性淡入淡出）
- 55–100%：衰減

WebGL 背景吃 shader 故障；DOM 文字另外複製兩層做橫向區塊位移，`mix-blend-mode: difference` 維持雙色。兩者同時發作，讀起來是一件事。

**適用範圍**：僅限門面路由之間（`/` ⇄ `/writing` ⇄ `/about` 及其 `/zh/` 對應）。
進入或離開文章內頁（`/writing/<slug>`）為一般導覽，無轉場。門面耍帥，文章負責被讀完。

---

## 3. 技術架構

### 3.1 選型

- **Astro 5**，靜態輸出，TypeScript
- **不使用任何 UI 框架**——本站無一處需要框架的狀態管理
- **three.js** 以原生 TS 撰寫成 island
- **部署**：Cloudflare Pages

### 3.2 效能架構（關鍵約束）

**只有 `/` 與 `/zh/` 載入 three.js。其餘所有路由完全不含 WebGL bundle。**

| 路由 | WebGL | 入侵序列 |
|---|---|---|
| `/`、`/zh/` | 載入 | 每 session 一次 |
| `/writing`、`/about` 及 `/zh/` 對應 | 不載入 | 無 |
| `/writing/<slug>` | 不載入 | 無 |

多數讀者從搜尋引擎直接進入文章頁，不該為看不到的動畫付下載成本。直接深連結到非首頁的路由時，不播放序列——序列是「進入這個網站」的儀式，不是每個頁面的開場。

WebGL 一律是**裝飾層**：所有內容存在於 DOM，關閉 JS 時網站照常運作與被索引。

### 3.3 字體

| 用途 | 字體 |
|---|---|
| 介面、終端機 chrome、程式碼 | JetBrains Mono → PingFang TC 後備 |
| **文章內文** | Noto Sans TC（無襯線） |

中文等寬字在長文閱讀是酷刑，此處不妥協。

### 3.4 模組邊界

```
src/lib/dither/         抖色渲染器。不知道網站的存在。
                        API: createDither(canvas, opts) → { setPhase, burst, destroy }
src/lib/sequence/       入侵序列的純函式：phaseAt(ms) → { grain, ring, glitch, wordmark, ... }
                        無 DOM、無 WebGL，可直接單元測試
src/components/         TerminalWindow.astro（純呈現、零 JS）
                        HeroSequence.astro（island）
src/lib/i18n/           語言字串與路由輔助
src/content.config.ts   zod schema
```

把序列時間軸抽成純函式是刻意的設計：動畫最難測的是時序，而時序不需要瀏覽器才能測。「給定 1620ms 應回傳 BREACH 階段、glitch = 1.0」是可斷言的。

---

## 4. 內容管線

### 4.1 單向發佈

私有的 `blog-drafts` 是**草稿過程**的真相來源；公開的網站 repo 是**已發佈內容**的真相來源。已發佈的文章本來就要公開，藏在私有 repo 沒有意義，還會讓公開 repo clone 下來建不起來。

```
blog-drafts (私有)                    personal-website (公開)
├── posts/<slug>/
│   ├── source.md    ← 永不外流（逐字稿）
│   ├── brief.md     ← 永不外流
│   ├── review.md    ← 永不外流
│   ├── social.md    ← 永不外流
│   ├── index.md     ──── publish ───→  src/content/posts/<lang>/<slug>.md
│   └── assets/      ──── publish ───→  src/assets/posts/<slug>/
```

### 4.2 `tools/publish.py`（位於私有 repo）

職責刻意極窄：讀 frontmatter → 確認 `status: published` → 轉換欄位 → 複製 `index.md` 與 `assets/` → 回寫 `published_at`。

- **預設 dry-run**，需 `--apply` 才實際寫入
- 不做轉檔、不做最佳化、不做任何「順便」的事——每多一件順便的事，就多一個它會在半夜壞掉的理由
- 絕不觸碰 `source.md` / `brief.md` / `review.md` / `social.md`

### 4.3 Frontmatter schema

| 欄位 | 型別 | 說明 |
|---|---|---|
| `title` | string | |
| `description` | string | |
| `date` | date | |
| `lang` | `'en' \| 'zh'` | |
| `tags` | string[] | v1 不產生頁面，僅儲存 |
| `translationKey` | string? | 中英版共同識別碼 |
| `readingTime` | number | 分鐘。由發佈腳本計算後寫入，作者不手填 |

`translationKey` 存在且找得到對應時，視窗標題列右側出現 `EN ⇄ ZH` 切換。

schema 由 zod 驗證，**不合則 build 失敗**——格式錯誤在發佈時被擋下，不等到上線才發現。

---

## 5. 路由與 i18n

英文無前綴為預設，中文加 `/zh/` 前綴（Astro 慣用作法，與「介面英文為主」的定位一致）。

```
/                      英文首頁（入侵序列）
/writing               英文文章索引
/writing/<slug>        英文文章
/about
/zh/                   中文首頁
/zh/writing            中文文章索引
/zh/writing/<slug>     中文文章
/zh/about
/rss.xml  /zh/rss.xml
/404
```

`hreflang` 依 `translationKey` 產生。

**只有單語版本的文章不會 404 到另一個語言**——顯示該文章並標示「此篇僅有中文版」。對讀者而言，看到一篇讀不懂的文章仍然比撞牆好。

---

## 6. 錯誤處理與退化

| 情況 | 行為 |
|---|---|
| 無 WebGL / context lost | 跳過序列，靜態底色 + 純文字字標 |
| `prefers-reduced-motion` | 整段序列略過，無任何動畫 |
| 關閉 JS | 全站可讀、可導覽，僅少了動畫 |
| 序列已看過（sessionStorage） | 直接進站 |
| 缺少翻譯版本 | 顯示原語言並標示，不 404 |
| frontmatter 不合 schema | **build 失敗** |
| 發佈腳本遇 `status != published` | 略過並記錄，不視為錯誤 |

---

## 7. 測試

**Vitest（單元）**
- 序列時間軸純函式：各時間點回傳的階段與參數
- i18n 路由輔助：locale 前綴、翻譯配對
- frontmatter schema：合法與非法案例

**Playwright（冒煙）**
- 關閉 JS 時文章可讀、導覽可用
- `prefers-reduced-motion` 下無動畫
- **文章頁的 bundle 不含 three.js** — 這條是防止效能架構被未來的自己破壞的護欄

**pytest（私有 repo）**
- 發佈腳本：dry-run 不寫檔、status 過濾、私有檔案不外流

---

## 8. 待確認事項

- Dracula PRO 的實際 hex 值以使用者持有的版本為準。本文件採用基礎版（`#22212C` / `#F8F8F2` / 七色相）；若使用者所持版本或 variant 數值不同，以實際值覆蓋本文件第 2.2 節。
- Dracula PRO 授權對「在公開 repo 中定義語意 token」的解釋，由使用者自行確認。本設計已採取不以主題檔形式散布的作法以降低風險。
