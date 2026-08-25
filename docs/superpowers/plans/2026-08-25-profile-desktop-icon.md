# 首頁 .profile 桌面圖示與 TUI 編輯器 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首頁 hero 的 `$ cat ~/.profile` 靜態輸出，換成桌面上一個可點開的 `.profile` 檔案圖示與 vim 風格編輯器視窗。

**Architecture:** 兩個純呈現的 `.astro` 元件（`DesktopIcon`、`VimWindow`）＋一個負責開關的 DOM 模組（`profile-window.ts`）。狀態是 wrapper 上的一個 `data-open` 屬性，元件本身不持有狀態。開關的「彈出時機」不新增時序，直接掛在既有的 `html.seq-pending` 機制上。

**Tech Stack:** Astro 6（`output: 'static'`）、零 UI 框架、原生 CSS、TypeScript、Playwright。

## Global Constraints

以下每一條都隱含屬於每一個 task 的需求。

- **Astro 6，`output: 'static'`，零 UI 框架。** 不得引入 React/Vue/Svelte 或任何前端框架。
- **文章內頁不得載入任何額外 JavaScript。** 本計畫只碰首頁，不得讓 `profile-window.ts` 進入文章頁的 bundle。
- **背景完全不動。** 抖色渲染、入侵序列時序、KEHAO 字標、WebGL 取景（`src/lib/dither/`、`src/lib/sequence/`、`src/lib/site-dither.ts`）一律不修改。
- **配色只用語意 token。** 新增的小字一律 `--muted`，**不得使用 `--dim`**——它在 `--panel` 上只有 4.91:1，是剛修正到 AA 的邊緣值。
- **不得出現 `dracula` 字樣**（授權限制，`tokens.test.ts` 有守門）。
- **窄畫面斷點一律 `@media (max-width: 640px)`**，與 `base.css` 既有的那一個共用，不另開斷點。
- **漸進退化：無 JS 時內容必須完整可見。** 任何「預設隱藏、靠 JS 顯示」的寫法都不接受。
- **點擊目標 ≥ 24px**（WCAG 2.5.8），導覽列既有的做法是覆蓋式 `::after` 熱區。
- **既有測試不得變紅**：92 個單元測試、38 個 e2e、`astro check` 0 錯、Lighthouse 四類別 ≥ 0.90 且 `color-contrast` 必須滿分。

## 與 spec 的差異（已決定，不需再確認）

spec §6 列了 `j` / `k` / `↑` / `↓` / `gg` / `G` 捲動鍵位。**本計畫不實作這些鍵。**

理由：profile 內容只有 5 個邏輯行，視窗高度足以完整容納，`.vim-body` 永遠不會溢出。沒有可捲動的範圍，這些鍵按下去不會有任何可觀察的效果——那是死程式碼，不是彩蛋。Task 3 只做 `ESC` 與 `:q`，這兩個在「關閉視窗」這件事上是真的有作用的。

如果日後 profile 長到會溢出，再回頭補捲動鍵位。

---

## 檔案結構

| 檔案 | 責任 |
|---|---|
| `src/components/VimWindow.astro`（新增） | 編輯器 chrome：標題列（含 `[x]`）、行號欄、`~` 填充、底部檔名列。純呈現，不知道 `.profile` 存在 |
| `src/components/DesktopIcon.astro`（新增） | 桌面圖示按鈕。純呈現，`aria-expanded` 的值由頁面初始狀態決定，執行期由 JS 同步 |
| `src/lib/profile-window.ts`（新增） | 開關互動。切換 wrapper 的 `data-open`、同步 `aria-expanded`、綁鍵盤 |
| `src/styles/base.css`（修改） | 新增 `.desktop` / `.desktop-icon` / `.vim*` 區塊，與窄畫面斷點內的對應規則 |
| `src/lib/i18n/ui.ts`（修改） | 新增 `profile.open` / `profile.close` 兩個 key |
| `src/pages/index.astro`（修改） | 換掉 `TerminalWindow`，改用 `DesktopIcon` + `VimWindow` |
| `src/pages/zh/index.astro`（修改） | 同上 |
| `tests/e2e/profile-window.spec.ts`（新增） | 開關、退化、無障礙、鍵盤 |
| `tests/e2e/mobile-layout.spec.ts`（修改） | 第 91 行的 `.layout-front .win` 選擇器要跟著換 |

**單元測試：無。** 這次沒有可抽出的純函式（見 spec §2）；`profile-window.ts` 與 `site-dither.ts`、`nav-glitch.ts` 同層，行為由 e2e 涵蓋。

---

## Task 1: VimWindow 元件與內容搬遷

把兩個首頁的 `TerminalWindow` 換成 `VimWindow`。這個 task 結束時視窗是**永遠開著**的靜態元件——沒有圖示、沒有開關，那是 Task 2。

**Files:**
- Create: `src/components/VimWindow.astro`
- Modify: `src/styles/base.css`（在「終端機視窗」區塊之後新增「編輯器視窗」區塊；窄畫面斷點內新增對應規則）
- Modify: `src/pages/index.astro`
- Modify: `src/pages/zh/index.astro`
- Modify: `tests/e2e/mobile-layout.spec.ts:91`
- Test: `tests/e2e/profile-window.spec.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `VimWindow.astro`，props `{ path: string; id?: string; closeLabel: string }`，預設 slot 放內容
  - 內容行的慣例：每個邏輯行是一個 `<p class="vim-line">`，空行也要有元素
  - CSS class：`.vim`、`.vim-bar`、`.vim-path`、`.vim-close`、`.vim-body`、`.vim-line`、`.vim-foot`

- [ ] **Step 1: 先寫會失敗的 e2e**

建立 `tests/e2e/profile-window.spec.ts`：

```ts
import { test, expect } from '@playwright/test';

test('英文首頁的 profile 內容住在 vim 視窗裡', async ({ page }) => {
  await page.goto('/');
  const win = page.locator('.vim');
  await expect(win).toBeVisible();
  await expect(win).toContainText('Cloud-native & AI infrastructure');
  // 標題列與底部檔名列都顯示路徑
  await expect(win.locator('.vim-path')).toHaveText('~/.profile');
  await expect(win.locator('.vim-foot')).toContainText('~/.profile');
});

test('中文首頁同樣使用 vim 視窗', async ({ page }) => {
  await page.goto('/zh/');
  const win = page.locator('.vim');
  await expect(win).toBeVisible();
  await expect(win).toContainText('我做雲端基礎建設');
});

test('行號由 CSS 生成，不進無障礙樹也不進文字內容', async ({ page }) => {
  await page.goto('/');
  // textContent 不含行號：行號是 ::before 的 content
  const bodyText = await page.locator('.vim-body').textContent();
  expect(bodyText).not.toMatch(/^\s*1\s/);

  // 但視覺上要看得到，且與邏輯行數一致
  const lines = page.locator('.vim-line');
  await expect(lines).toHaveCount(5);
  const firstNumber = await lines.first().evaluate(
    (el) => getComputedStyle(el, '::before').content,
  );
  expect(firstNumber).toContain('1');
});

test('首頁不再有舊的終端機視窗', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.layout-front .win')).toHaveCount(0);
});

test('[x] 的點擊區達到 WCAG 2.5.8 的 24px', async ({ page }) => {
  await page.goto('/');
  // 視覺盒刻意維持小尺寸（標題列高度由字級決定），熱區靠覆蓋式 ::after 撐開，
  // 所以量 boundingBox 量不到——要從中心往上下打點，看命中的是不是同一個按鈕。
  const height = await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>('.vim-close');
    if (!btn) return 0;
    const box = btn.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hits = (dy: number) => {
      const el = document.elementFromPoint(cx, cy + dy);
      return el === btn || btn.contains(el);
    };
    let up = 0;
    let down = 0;
    while (up < 40 && hits(-(up + 1))) up++;
    while (down < 40 && hits(down + 1)) down++;
    return up + down + 1;
  });
  expect(height).toBeGreaterThanOrEqual(24);
});
```

- [ ] **Step 2: 跑測試，確認它失敗**

```bash
npx playwright test tests/e2e/profile-window.spec.ts
```

預期：四個都 FAIL，`.vim` 找不到。

- [ ] **Step 3: 建立 VimWindow 元件**

**注意**：這個 task 只畫出 `[x]`，不接行為——開關互動整組在 Task 2。`data-profile-close`
這個 hook 屬性是留給 Task 2 的委派 listener 用的，本 task 不加任何 JavaScript。
按鈕在此刻沒有作用是預期中的中間狀態，不是遺漏。

`src/components/VimWindow.astro`：

```astro
---
interface Props {
  /** 標題列與底部列顯示的檔案路徑，例如 ~/.profile */
  path: string;
  /** 給 aria-controls 用；有桌面圖示要控制這個視窗時才需要 */
  id?: string;
  /** [x] 的無障礙名稱。窄畫面不顯示按鈕，但名稱仍要正確 */
  closeLabel: string;
}

const { path, id, closeLabel } = Astro.props;
---

<section class="vim" id={id} aria-label={path}>
  <header class="vim-bar">
    <span class="vim-path">{path}</span>
    <button type="button" class="vim-close" data-profile-close aria-label={closeLabel}>[x]</button>
  </header>

  <div class="vim-body">
    <slot />
  </div>

  <footer class="vim-foot"><span>{path}</span></footer>
</section>
```

- [ ] **Step 4: 新增 i18n 字串**

`src/lib/i18n/ui.ts`，兩個語言各加兩個 key（`UiKey` 由 `en` 推導，兩邊都加才不會型別錯誤）：

en 區塊加：
```ts
    'profile.open': 'Open ~/.profile',
    'profile.close': 'Close ~/.profile',
```

zh 區塊加：
```ts
    'profile.open': '開啟 ~/.profile',
    'profile.close': '關閉 ~/.profile',
```

- [ ] **Step 5: 加入 CSS**

`src/styles/base.css`，在「內文排版」區塊之前插入：

```css
/* ============================ 編輯器視窗 ============================
   vim 的視覺語彙：行號欄、~ 填充行、上下兩條檔名列。與 .win 一樣，底是實心
   ground，背景抖色永遠碰不到文字。 */
.vim {
  position: relative;
  background: var(--ground);
  border: 1px solid var(--line);
  font-family: var(--font-mono);
}
.vim::before, .vim::after {
  content: '';
  position: absolute;
  width: 10px; height: 10px;
  border: 1px solid var(--accent);
}
.vim::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.vim::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }

.vim-bar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  font-size: 0.63rem;
  letter-spacing: 0.13em;
}
.vim-path { color: var(--muted); }

.vim-close {
  position: relative;
  margin-left: auto;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  color: var(--muted);
  cursor: pointer;
}
.vim-close:hover, .vim-close:focus-visible { color: var(--accent); }

/* 熱區補到 24px（WCAG 2.5.8）。與導覽列同一個手法：用覆蓋式 ::after 放大可點
   範圍，不加 min-height——標題列的高度是由字級決定的，撐開會破壞 chrome 比例。 */
.vim-close::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: max(100%, 24px);
  height: 24px;
  transform: translate(-50%, -50%);
}

/* 行號欄寬度：兩位數 + 間距。行號用 ::before 絕對定位，所以換行的續行不會
   再拿到一個號碼——這正是 vim 開了 `set number` 之後的行為。 */
.vim-body {
  --gutter: 2.6rem;
  position: relative;
  counter-reset: vimline;
  padding: 1.1rem 1.3rem 1.1rem calc(1.3rem + var(--gutter));
  font-size: 0.83rem;
  line-height: 1.95;
  overflow: hidden;
}
.vim-line {
  position: relative;
  counter-increment: vimline;
  margin: 0;
  /* 空行也要佔一行高，否則行號會擠在一起 */
  min-height: 1.95em;
}
.vim-line::before {
  content: counter(vimline);
  position: absolute;
  left: calc(-1 * var(--gutter));
  width: calc(var(--gutter) - 0.8rem);
  text-align: right;
  color: var(--muted);
}

/* ~ 填充行：CSS 生成，不寫進 HTML——它是「檔案結束後的空白」這個 vim 慣例的
   視覺表現，不是內容。父層 overflow: hidden 負責裁掉多出來的。 */
.vim-body::after {
  content: '~\A~\A~\A~';
  display: block;
  white-space: pre;
  margin-left: calc(-1 * var(--gutter));
  color: var(--muted);
}

.vim-foot {
  display: flex;
  padding: 0.45rem 0.85rem;
  border-top: 1px solid var(--line);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}
```

- [ ] **Step 6: 換掉英文首頁**

`src/pages/index.astro` 全檔改為：

```astro
---
import FrontLayout from '../layouts/FrontLayout.astro';
import VimWindow from '../components/VimWindow.astro';
import Wordmark from '../components/Wordmark.astro';
import HeroSequence from '../components/HeroSequence.astro';
import { t } from '../lib/i18n/ui';
---
<FrontLayout
  locale="en"
  title="KEHAO — happyhacking.ninja"
  description="Cloud-native and AI infrastructure. Notes mostly in 中文, occasionally English."
  path="/"
  current="home"
  sequence={true}
>
  <Wordmark />
  <HeroSequence locale="en" />
  <main class="page layout-front">
    <VimWindow path="~/.profile" closeLabel={t('en', 'profile.close')}>
      <p class="vim-line">Cloud-native &amp; AI infrastructure. I build the boring parts that let the interesting parts stay up.</p>
      <p class="vim-line"></p>
      <p class="vim-line soft">Notes mostly in 中文, occasionally English.</p>
      <p class="vim-line"></p>
      <p class="vim-line soft">STATUS <span class="hot">ONLINE</span> · TAIPEI · AZURE / KUBERNETES / LLM AGENTS</p>
    </VimWindow>
  </main>
</FrontLayout>
```

**注意**：內容不要硬斷行。每個 `<p class="vim-line">` 是一個**邏輯行**，視覺上會依寬度自然換行——行號只出現在該邏輯行的第一列，與 vim 的續行行為一致，也才不會在窄畫面錯位。

- [ ] **Step 7: 換掉中文首頁**

`src/pages/zh/index.astro` 全檔改為：

```astro
---
import FrontLayout from '../../layouts/FrontLayout.astro';
import VimWindow from '../../components/VimWindow.astro';
import Wordmark from '../../components/Wordmark.astro';
import HeroSequence from '../../components/HeroSequence.astro';
import { t } from '../../lib/i18n/ui';
---
<FrontLayout
  locale="zh"
  title="KEHAO — happyhacking.ninja"
  description="雲端原生與 AI 基礎建設的筆記。"
  path="/"
  current="home"
  sequence={true}
>
  <Wordmark />
  <HeroSequence locale="zh" />
  <main class="page layout-front">
    <VimWindow path="~/.profile" closeLabel={t('zh', 'profile.close')}>
      <p class="vim-line">我做雲端基礎建設，主要在 Azure 與 Kubernetes 上。</p>
      <p class="vim-line"></p>
      <p class="vim-line soft">近幾年花很多時間在 LLM agent 的工程化。</p>
      <p class="vim-line"></p>
      <p class="vim-line soft">STATUS <span class="hot">ONLINE</span> · TAIPEI · AZURE / KUBERNETES / LLM AGENTS</p>
    </VimWindow>
  </main>
</FrontLayout>
```

- [ ] **Step 8: 修正既有的窄畫面測試選擇器**

`tests/e2e/mobile-layout.spec.ts` 第 91 行附近：

```ts
  const win = await page.locator('.layout-front .vim').boundingBox();
```

（原本是 `.layout-front .win`。錯誤訊息裡的「終端機視窗」字樣一併改成「編輯器視窗」。）

- [ ] **Step 9: `.layout-front` 的寬度規則要跟著改**

`src/styles/base.css` 的「版面」區塊，把兩條 `.win` 規則換成 `.vim`：

```css
.layout-front { display: flex; align-items: flex-end; min-height: calc(100vh - 8rem); }
.layout-front .vim { width: min(580px, 54vw); }
```

（原本的 `.layout-front .win-body { padding: 1.1rem 1.3rem; ... }` 整條刪掉——`.vim-body` 自己已經帶了對應的內距與字級。）

窄畫面斷點內，把 `.layout-front .win` 相關兩條換成：

```css
  .layout-front .vim { width: 100%; }
  .vim-body { padding: 0.9rem 1rem 0.9rem calc(1rem + var(--gutter)); font-size: 0.8rem; }
```

- [ ] **Step 10: 跑測試，確認全部通過**

```bash
npm run check
npx playwright test tests/e2e/profile-window.spec.ts tests/e2e/mobile-layout.spec.ts
```

預期：全 PASS。若行號位置或 `~` 對齊看起來不對，調整 `--gutter` 與 `.vim-body::after` 的 `margin-left`，讓 `~` 落在行號欄的位置。

- [ ] **Step 11: 跑完整套**

```bash
npm test && npm run build && npm run test:e2e
```

預期：92 單元、15 頁、e2e 全綠。

- [ ] **Step 12: Commit**

```bash
git add src/components/VimWindow.astro src/styles/base.css src/lib/i18n/ui.ts \
        src/pages/index.astro src/pages/zh/index.astro \
        tests/e2e/profile-window.spec.ts tests/e2e/mobile-layout.spec.ts
git commit -m "feat: 首頁 profile 改用 vim 風格編輯器視窗"
```

---

## Task 2: 桌面圖示與開關

加上桌面圖示、`[x]` 關閉、再點圖示開啟。窄畫面沒有圖示且視窗恆開。

**Files:**
- Create: `src/components/DesktopIcon.astro`
- Create: `src/lib/profile-window.ts`
- Modify: `src/styles/base.css`
- Modify: `src/pages/index.astro`、`src/pages/zh/index.astro`
- Test: `tests/e2e/profile-window.spec.ts`（追加）

**Interfaces:**
- Consumes: Task 1 的 `VimWindow`（props `{ path, id, closeLabel }`）、`.vim-close` 上的 `data-profile-close`
- Produces:
  - `DesktopIcon.astro`，props `{ label: string; action: string; controls: string }`
  - `profile-window.ts` 匯出 `initProfileWindow(): void`
  - wrapper：`<div class="desktop" data-open>`，`data-open` 存在即為開啟
  - 視窗 id 固定為 `profile-window`

- [ ] **Step 1: 先寫會失敗的 e2e**

追加到 `tests/e2e/profile-window.spec.ts`：

```ts
test('點 [x] 關閉視窗，點圖示重新開啟', async ({ page }) => {
  await page.goto('/');
  const desktop = page.locator('.desktop');
  const win = page.locator('#profile-window');
  const icon = page.locator('.desktop-icon');

  await expect(win).toBeVisible();
  await expect(icon).toHaveAttribute('aria-expanded', 'true');

  await page.locator('.vim-close').click();
  await expect(win).toBeHidden();
  await expect(desktop).not.toHaveAttribute('data-open', /.*/);
  await expect(icon).toHaveAttribute('aria-expanded', 'false');

  await icon.click();
  await expect(win).toBeVisible();
  await expect(icon).toHaveAttribute('aria-expanded', 'true');
});

test('停用 JavaScript 時視窗是開的，內容完整可見', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#profile-window')).toBeVisible();
  await expect(page.locator('#profile-window')).toContainText('Cloud-native & AI infrastructure');
  await ctx.close();
});

test('序列播放期間視窗收起，chrome 長出來後才露出', async ({ page }) => {
  await page.goto('/');

  // 序列剛開始：<head> 的 inline script 已經設了 seq-pending，視窗應該是收起的
  await expect(page.locator('html')).toHaveClass(/seq-pending/);
  await expect(page.locator('#profile-window')).toBeHidden();

  // 序列跑到 chrome > 0 時 site-dither 會移除 seq-pending，內容硬切露出
  await expect(page.locator('html')).not.toHaveClass(/seq-pending/, { timeout: 10_000 });
  await expect(page.locator('#profile-window')).toBeVisible();

  // wrapper 的 data-open 從頭到尾沒被動過——收起是 seq-pending 造成的，不是關閉狀態
  await expect(page.locator('.desktop')).toHaveAttribute('data-open', '');
});

test('同一 session 第二次進首頁不播序列，視窗立刻是開的', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  // 同一個 context 重新進入：head script 讀到 hh.sequence.played 就不會設 seq-pending
  await page.goto('/writing/');
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/seq-pending/);
  await expect(page.locator('#profile-window')).toBeVisible();
});

test('換頁離開再回來，視窗重置為開啟', async ({ page }) => {
  await page.goto('/');
  await page.locator('.vim-close').click();
  await expect(page.locator('#profile-window')).toBeHidden();

  await page.locator('.site-nav a[href="/writing/"]').click();
  await expect(page).toHaveURL(/\/writing\/$/);
  await page.locator('.site-nav a[href="/"]').click();
  await expect(page).toHaveURL(/localhost:4321\/$/);

  await expect(page.locator('#profile-window')).toBeVisible();
});
```

再建立 `tests/e2e/profile-window-mobile.spec.ts`（窄畫面另開檔，因為 `test.use` 是整檔生效）：

```ts
import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 320, height: 568 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

test('窄畫面沒有桌面圖示，也沒有可見的關閉鈕', async ({ page }) => {
  await page.goto('/');
  // 仍在 DOM 中，但不可見——斷言用不可見而非不存在
  await expect(page.locator('.desktop-icon')).toBeHidden();
  await expect(page.locator('.vim-close')).toBeHidden();
});

test('窄畫面視窗恆開，沒有任何可見控制項能關掉它', async ({ page }) => {
  await page.goto('/');
  const win = page.locator('#profile-window');
  await expect(win).toBeVisible();

  // 序列播完之後仍然開著
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(win).toBeVisible();
});
```

- [ ] **Step 2: 跑測試，確認它失敗**

```bash
npx playwright test tests/e2e/profile-window.spec.ts tests/e2e/profile-window-mobile.spec.ts
```

預期：新加的都 FAIL，`.desktop-icon` 找不到。

- [ ] **Step 3: 建立 DesktopIcon 元件**

`src/components/DesktopIcon.astro`：

```astro
---
interface Props {
  /** 圖示下方的檔名，同時是無障礙名稱的一部分 */
  label: string;
  /** aria-label：完整的動作描述，例如「開啟 ~/.profile」 */
  action: string;
  /** 被控制的視窗 id */
  controls: string;
}

const { label, action, controls } = Astro.props;
---

<button
  type="button"
  class="desktop-icon"
  data-profile-toggle
  aria-controls={controls}
  aria-expanded="true"
  aria-label={action}
>
  <span class="desktop-icon-glyph" aria-hidden="true"></span>
  <span class="desktop-icon-label">{label}</span>
</button>
```

- [ ] **Step 4: 建立開關模組**

`src/lib/profile-window.ts`：

```ts
/**
 * 首頁 .profile 視窗的開關。
 *
 * 狀態是 wrapper 上的 `data-open`，HTML 預設就帶著它——所以沒有 JS 時視窗
 * 是開的，這個模組只負責「收起來」與「再打開」。任何「預設隱藏、靠 JS 顯示」
 * 的寫法都會讓無 JS 訪客看不到首頁唯一的自我介紹。
 *
 * 不存 sessionStorage：視窗活在 `main.page` 裡（換頁會被 swap），每次回到
 * 首頁都是全新的 DOM，重置為開啟是自然結果也是想要的行為。
 */

const OPEN_ATTR = 'data-open';

function desktop(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.desktop');
}

function setOpen(open: boolean): void {
  const root = desktop();
  if (!root) return;

  if (open) root.setAttribute(OPEN_ATTR, '');
  else root.removeAttribute(OPEN_ATTR);

  for (const toggle of document.querySelectorAll<HTMLElement>('[data-profile-toggle]')) {
    toggle.setAttribute('aria-expanded', String(open));
  }
}

function isOpen(): boolean {
  return desktop()?.hasAttribute(OPEN_ATTR) ?? false;
}

function onClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('[data-profile-close]')) {
    setOpen(false);
    return;
  }
  if (target.closest('[data-profile-toggle]')) {
    setOpen(!isOpen());
  }
}

export function initProfileWindow(): void {
  // 委派到 document：換頁後 DOM 會被換掉，綁在元素上的 listener 會跟著消失。
  // 委派讓這個模組只需要初始化一次。
  document.addEventListener('click', onClick);
}
```

- [ ] **Step 5: 加入 CSS**

`src/styles/base.css`，在「編輯器視窗」區塊之前插入：

```css
/* ============================== 桌面 ==============================
   抖色背景是桌布，.profile 是桌面上唯一一個圖示。 */
.desktop {
  position: relative;
  display: flex;
  align-items: flex-end;
  width: 100%;
  min-height: calc(100vh - 8rem);
}

.desktop-icon {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem;
  border: 1px solid transparent;
  background: none;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  color: var(--muted);
  cursor: pointer;
}
.desktop-icon:hover, .desktop-icon:focus-visible {
  border-color: var(--line);
  color: var(--ink);
}

/* 檔案圖示：一個帶折角的方框，純 CSS，不引入圖檔 */
.desktop-icon-glyph {
  width: 26px;
  height: 32px;
  border: 1px solid currentColor;
  /* 右上角折角 */
  clip-path: polygon(0 0, 68% 0, 100% 26%, 100% 100%, 0 100%);
}

/* 關閉狀態：視窗收起。用 visibility 而非 display，才能有開關動畫。 */
.desktop:not([data-open]) .vim {
  opacity: 0;
  visibility: hidden;
  transform: scale(0.97);
}
.vim {
  transition: opacity 120ms linear, transform 120ms ease-out;
}

/* 序列進行中一律收起，與其他內容一起在 chrome 長出來時硬切露出。
   這一條同時是「無 JS 也正確」的關鍵：seq-pending 由 <head> 的 inline script
   設定，沒有 JS 就不會有這個 class，視窗自然是開的。 */
html.seq-pending .vim {
  opacity: 0;
  visibility: hidden;
}
```

- [ ] **Step 6: 窄畫面規則**

`src/styles/base.css` 的 `@media (max-width: 640px)` 區塊內加入：

```css
  /* 窄畫面不做桌面隱喻：沒有圖示、沒有關閉鈕、視窗恆開。
     桌面隱喻需要「圖示與視窗是兩個東西」的空間關係，320px 放不下；
     而把自我介紹藏在一次點擊後面，在手機上是實質的內容損失。 */
  .desktop-icon, .vim-close { display: none; }
  .desktop {
    display: block;
    min-height: 0;
    padding-top: 46vh;
  }
  .desktop:not([data-open]) .vim {
    opacity: 1;
    visibility: visible;
    transform: none;
  }
```

同時把窄畫面斷點裡**既有**的那一組 `.layout-front` 規則移除——它是上一次手機版修正留下的，職責現在由 `.desktop` 承擔，兩層都設會疊加兩次 46vh：

```css
  /* 刪掉這一整組 */
  .layout-front {
    display: block;
    min-height: 0;
    padding-top: 46vh;
  }
```

- [ ] **Step 7: 頁面接上圖示與 wrapper**

`src/pages/index.astro` 的 `<main>` 改為：

```astro
  <main class="page layout-front">
    <div class="desktop" data-open>
      <DesktopIcon label=".profile" action={t('en', 'profile.open')} controls="profile-window" />
      <VimWindow path="~/.profile" id="profile-window" closeLabel={t('en', 'profile.close')}>
        <p class="vim-line">Cloud-native &amp; AI infrastructure. I build the boring parts that let the interesting parts stay up.</p>
        <p class="vim-line"></p>
        <p class="vim-line soft">Notes mostly in 中文, occasionally English.</p>
        <p class="vim-line"></p>
        <p class="vim-line soft">STATUS <span class="hot">ONLINE</span> · TAIPEI · AZURE / KUBERNETES / LLM AGENTS</p>
      </VimWindow>
    </div>
  </main>

  <script>
    import { initProfileWindow } from '../lib/profile-window';
    initProfileWindow();
  </script>
```

並在 frontmatter 加 `import DesktopIcon from '../components/DesktopIcon.astro';`。

`src/pages/zh/index.astro` 的 `<main>` 改為：

```astro
  <main class="page layout-front">
    <div class="desktop" data-open>
      <DesktopIcon label=".profile" action={t('zh', 'profile.open')} controls="profile-window" />
      <VimWindow path="~/.profile" id="profile-window" closeLabel={t('zh', 'profile.close')}>
        <p class="vim-line">我做雲端基礎建設，主要在 Azure 與 Kubernetes 上。</p>
        <p class="vim-line"></p>
        <p class="vim-line soft">近幾年花很多時間在 LLM agent 的工程化。</p>
        <p class="vim-line"></p>
        <p class="vim-line soft">STATUS <span class="hot">ONLINE</span> · TAIPEI · AZURE / KUBERNETES / LLM AGENTS</p>
      </VimWindow>
    </div>
  </main>

  <script>
    import { initProfileWindow } from '../../lib/profile-window';
    initProfileWindow();
  </script>
```

並在 frontmatter 加 `import DesktopIcon from '../../components/DesktopIcon.astro';`。

- [ ] **Step 8: `.layout-front` 的職責移交**

`.desktop` 現在承擔了版面（flex、min-height），`.layout-front` 上重複的規則要拿掉，避免兩層都在做同一件事：

```css
.layout-front { position: relative; }
.layout-front .vim { width: min(580px, 54vw); }
```

（原本的 `display: flex; align-items: flex-end; min-height: ...` 移到 `.desktop`。）

- [ ] **Step 9: 跑測試**

```bash
npx playwright test tests/e2e/profile-window.spec.ts tests/e2e/profile-window-mobile.spec.ts tests/e2e/mobile-layout.spec.ts
```

預期：全 PASS。

- [ ] **Step 10: 驗證護欄真的會咬人**

把 `src/pages/index.astro` 的 `data-open` 暫時拿掉，重跑：

```bash
npx playwright test tests/e2e/profile-window.spec.ts -g "停用 JavaScript"
```

預期：FAIL。確認之後把 `data-open` 加回去。這一步是要證明「無 JS 視窗是開的」不是空過的測試。

- [ ] **Step 11: 跑完整套與 Lighthouse**

```bash
npm test && npm run check && npm run build && npm run test:e2e
npx lhci autorun
```

預期：全綠。特別注意 `color-contrast` 必須滿分——新增的 `.desktop-icon-label` 與行號都用 `--muted`。

若 Lighthouse 起不來且 FCP/LCP 異常高，先確認 4321 埠沒有被 `npm run dev` 佔住（`lsof -ti:4321`）：被佔住時 `npm run preview` 起不來，量到的會是未打包的 dev 輸出。

- [ ] **Step 12: Commit**

```bash
git add src/components/DesktopIcon.astro src/lib/profile-window.ts src/styles/base.css \
        src/pages/index.astro src/pages/zh/index.astro \
        tests/e2e/profile-window.spec.ts tests/e2e/profile-window-mobile.spec.ts
git commit -m "feat: 首頁桌面圖示與 .profile 視窗開關"
```

---

## Task 3: ESC 與 :q 關閉

只做這兩個鍵。捲動鍵位不做，理由見開頭的「與 spec 的差異」。

**Files:**
- Modify: `src/lib/profile-window.ts`
- Test: `tests/e2e/profile-window.spec.ts`（追加）

**Interfaces:**
- Consumes: Task 2 的 `initProfileWindow()`、`.desktop[data-open]`
- Produces: 無新匯出

- [ ] **Step 1: 先寫會失敗的 e2e**

追加到 `tests/e2e/profile-window.spec.ts`：

```ts
test('序列播完後，ESC 關閉視窗', async ({ page }) => {
  await page.goto('/');
  // 序列進行中會攔截所有按鍵當作「跳過」，必須等它結束
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(page.locator('#profile-window')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('序列播完後，:q 關閉視窗', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  await page.keyboard.press(':');
  await page.keyboard.press('q');
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('序列進行中按 ESC 是跳過序列，不是關視窗', async ({ page }) => {
  await page.goto('/');
  // 序列剛開始就按：這一下應該被序列的 skip 吃掉
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  // 視窗仍然開著
  await expect(page.locator('#profile-window')).toBeVisible();
});

test('視窗已關閉時，ESC 不會把它打開', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await page.locator('.vim-close').click();
  await expect(page.locator('#profile-window')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.locator('#profile-window')).toBeHidden();
});
```

- [ ] **Step 2: 跑測試，確認它失敗**

```bash
npx playwright test tests/e2e/profile-window.spec.ts -g "ESC|:q"
```

預期：前兩個 FAIL（視窗沒關掉），後兩個可能已經 PASS——那是對的，它們驗的是「不該發生的事沒發生」。

- [ ] **Step 3: 加入鍵盤處理**

`src/lib/profile-window.ts`，在 `onClick` 之後加入：

```ts
/**
 * `:q` 需要記住前一個鍵。只保留一個字元的記憶，而且任何非預期的鍵都會清掉它
 * ——不做完整的 vim 命令列解析，那不是這個彩蛋的重點。
 */
let pendingColon = false;

function onKeydown(event: KeyboardEvent): void {
  // 序列進行中，所有按鍵屬於「跳過序列」，不搶
  if (document.documentElement.classList.contains('seq-pending')) return;
  // 修飾鍵組合是瀏覽器捷徑，不搶
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  // 只在視窗開著時作用：關掉的視窗不該被鍵盤打開
  if (!isOpen()) { pendingColon = false; return; }

  if (event.key === 'Escape') {
    setOpen(false);
    pendingColon = false;
    return;
  }

  if (pendingColon && event.key === 'q') {
    setOpen(false);
    pendingColon = false;
    return;
  }

  pendingColon = event.key === ':';
}
```

並在 `initProfileWindow()` 裡加上：

```ts
  document.addEventListener('keydown', onKeydown);
```

- [ ] **Step 4: 跑測試，確認通過**

```bash
npx playwright test tests/e2e/profile-window.spec.ts
```

預期：全 PASS。

- [ ] **Step 5: 跑完整套**

```bash
npm test && npm run check && npm run build && npm run test:e2e
```

預期：全綠。

- [ ] **Step 6: Commit**

```bash
git add src/lib/profile-window.ts tests/e2e/profile-window.spec.ts
git commit -m "feat: .profile 視窗支援 ESC 與 :q 關閉"
```
