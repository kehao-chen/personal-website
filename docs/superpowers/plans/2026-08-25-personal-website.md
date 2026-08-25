# 個人網站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建一個雙語靜態個人網站：門面是 1-bit 抖色的入侵序列動畫，所有文字內容住在終端機視窗元件裡，文章內頁完全不載入 WebGL。

**Architecture:** Astro 靜態輸出，零 UI 框架。three.js 封裝成一個不知道網站存在的獨立模組，只在門面路由動態載入；入侵序列的時間軸抽成純函式以便單元測試。所有內容存在於 DOM，WebGL 純屬裝飾層，關閉 JS 或無 WebGL 時網站完整可用。

**Tech Stack:** Astro 6、TypeScript、three.js、Vitest、Playwright、Cloudflare Pages

## Global Constraints

這些是全域規則，**每一個 task 的要求都隱含包含本節**。

- **Astro 版本**：`astro@^6.3.1`。設計文件第 3.1 節寫「Astro 5」，該處已過時；v6 為現行版本，內容集合與 i18n API 兩版一致。
- **輸出**：`output: 'static'`。不安裝任何 SSR adapter。
- **UI 框架**：不得安裝 React / Vue / Svelte / Solid 等任何 UI 框架。
- **配色 token**：只使用語意化名稱。**不得**建立名為 `dracula*` 的檔案、class 或 token；不得在 repo 內加入任何標示為 Dracula PRO 主題包的檔案。值如下，逐字使用：
  - `--ground: #22212C`
  - `--ink: #F8F8F2`
  - `--accent: #80FFEA`
  - `--line: #454158`
  - `--panel: #1B1A23`
  - `--dim: #7970A9`
  - `--muted: rgba(248, 248, 242, 0.62)`
  - `--syntax-keyword: #FF80BF`、`--syntax-function: #8AFF80`、`--syntax-string: #FFFF80`、`--syntax-number: #9580FF`、`--syntax-comment: #7970A9`、`--syntax-param: #FFCA80`、`--syntax-class: #80FFEA`
- **用色紀律**：`--dim` 對比僅 3.56:1，**禁止用於內文或任何承載資訊的文字**，只能用於「看不到也不影響理解」的裝飾性 chrome。承載資訊的次要文字一律 `--muted`。多色相（`--syntax-*`）只准出現在程式碼區塊。
- **抖色渲染參數**（寫死，不做成使用者可調參數）：Bayer 4×4、pixel size `2`、grain `0.02`、rings `0.26`、ring speed `1.4`、每格 5 tap 盒狀平均降取樣。管線順序固定 **glitch → 降取樣 → 抖色量化**。
- **入侵序列時間軸** @1.0×：BOOT `0–900ms`、SCAN `900–1500ms`、BREACH `1500–1820ms`、GRANTED `1820–2500ms`、SETTLE `2500–3050ms`，之後 IDLE。
- **字標**：`KEHAO` 主、`// HAPPY HACKING` 副。**只在首頁出現**（`/` 與 `/zh/`），三種渲染模式（完整 / 無 WebGL / 無 JS）行為一致。
- **視窗底不透明度固定 1.00**，不得做成參數。
- **文章內頁**（`/writing/<slug>`、`/zh/writing/<slug>`）**新載入時不得載入 three.js**。
- **序列播放**：每 session 一次（`sessionStorage`），可跳過；`prefers-reduced-motion: reduce` 時完全略過。
- **語言**：`en` 為預設且無路徑前綴，`zh` 前綴 `/zh/`。
- **網域**：`happyhacking.ninja`。
- **提交訊息**：使用 Conventional Commits（`feat:` / `fix:` / `test:` / `chore:` / `docs:`）。

---

## File Structure

```
personal-website/
├── astro.config.mjs                  Astro 設定：static、i18n、integrations
├── package.json
├── tsconfig.json
├── vitest.config.ts                  單元測試（只跑純模組）
├── playwright.config.ts              端對端護欄
├── public/
│   └── _headers                      Cloudflare Pages 快取標頭
├── src/
│   ├── content.config.ts             posts 集合 + zod schema
│   ├── content/posts/{en,zh}/*.md    文章來源（唯一真相）
│   ├── styles/
│   │   ├── tokens.css                語意 token（全域約束的值）
│   │   ├── base.css                  reset、排版、終端機視窗、字標
│   │   └── tokens.test.ts            對比度守門測試
│   ├── lib/
│   │   ├── reading-time.ts           純函式：中英混排閱讀時間估算
│   │   ├── reading-time.test.ts
│   │   ├── posts.ts                  純函式：排序、篩選、翻譯配對 + loadPosts()
│   │   ├── posts.test.ts
│   │   ├── i18n/
│   │   │   ├── routing.ts            純函式：locale 前綴與偵測
│   │   │   ├── routing.test.ts
│   │   │   └── ui.ts                 介面字串（en / zh）
│   │   ├── sequence/
│   │   │   ├── timeline.ts           純函式 frameAt(ms) → Frame
│   │   │   └── timeline.test.ts
│   │   ├── dither/
│   │   │   ├── shader.ts             GLSL 原始碼與 uniform 名稱清單
│   │   │   ├── shader.test.ts        uniform 宣告與清單一致性
│   │   │   ├── wordmark.ts           canvas 材質產生器
│   │   │   ├── scene.ts              three.js 場景組裝
│   │   │   └── index.ts              createDither() 公開 API
│   │   └── nav-glitch.ts             ClientRouter 生命週期 + DOM 分層故障
│   ├── components/
│   │   ├── TerminalWindow.astro      純呈現，零 JS
│   │   ├── SiteNav.astro
│   │   ├── PostRow.astro
│   │   ├── TagFilter.astro
│   │   └── Wordmark.astro            DOM 字標（永遠在 DOM 裡）
│   ├── layouts/
│   │   ├── BaseLayout.astro          html/head/#fx/nav，所有頁面共用
│   │   ├── FrontLayout.astro         門面：啟動 dither
│   │   └── ReadingLayout.astro       閱讀：不啟動 dither
│   └── pages/
│       ├── index.astro               英文首頁
│       ├── about.astro
│       ├── writing/index.astro
│       ├── writing/[slug].astro
│       ├── rss.xml.ts
│       ├── 404.astro
│       └── zh/{index,about,writing/index,writing/[slug],rss.xml}.astro|ts
└── tests/e2e/
    ├── degradation.spec.ts           無 JS / 無 WebGL / reduced-motion
    ├── perf-budget.spec.ts           文章內頁不得載入 three.js
    └── navigation.spec.ts            換頁轉場與字標作用範圍
```

**責任邊界說明：**

- `src/lib/dither/` 完全不知道網站的存在——它收到一個 canvas 和一組數值，畫出畫面。可以整包搬到別的專案。
- `src/lib/sequence/timeline.ts` 是**純函式**，沒有 DOM、沒有 WebGL。動畫最難測的是時序，而時序不需要瀏覽器就能測。
- `src/lib/posts.ts` 拆成兩半：純函式（排序、篩選、配對）與一個薄薄的 `loadPosts()`（唯一碰 `astro:content` 的地方）。測試只針對純函式。
- `.astro` 元件一律不含業務邏輯，只負責呈現。

---

## Task 1: 專案骨架與配色守門

**Files:**
- Create: `package.json`、`tsconfig.json`、`astro.config.mjs`、`vitest.config.ts`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: 無（第一個 task）
- Produces: `src/styles/tokens.css` 中的 CSS 自訂屬性，後續所有樣式只透過 `var(--token)` 取用；`npm test` 指令；`npm run build` 指令。

- [ ] **Step 1: 建立 Astro 專案骨架**

在 `/Users/kehao/projects/personal-website` 執行（該目錄已有 `.git` 與 `docs/`，不要重新 init）：

```bash
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict --skip-houston
npm install
npm install -D vitest @vitest/coverage-v8
```

若 CLI 因目錄非空而中止，改為手動建立下列三個檔案後執行 `npm install`。

`package.json`：

```json
{
  "name": "personal-website",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^6.3.1"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json`：

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

`astro.config.mjs`：

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://happyhacking.ninja',
  output: 'static',
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
});
```

`vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 2: 寫失敗的對比度測試**

這個測試把設計文件的無障礙規則變成永久護欄：任何人改了配色而讓對比掉到門檻以下，`npm test` 就會紅。

`src/styles/tokens.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Rgb = [number, number, number];

const css = readFileSync(
  fileURLToPath(new URL('./tokens.css', import.meta.url)),
  'utf8',
);

function parseTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

/** 把 token 值解析成實際顯示的 RGB。rgba() 會與 ground 合成。 */
function resolve(value: string, ground: Rgb): Rgb {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return [
      r * a + ground[0] * (1 - a),
      g * a + ground[1] * (1 - a),
      b * a + ground[2] * (1 - a),
    ];
  }
  throw new Error(`無法解析的顏色值: ${value}`);
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('配色 token', () => {
  const tokens = parseTokens(css);
  const ground = resolve(tokens['--ground'], [0, 0, 0]);

  it('定義了所有必要的 token', () => {
    for (const name of [
      '--ground', '--ink', '--accent', '--line', '--panel', '--dim', '--muted',
      '--syntax-keyword', '--syntax-function', '--syntax-string',
      '--syntax-number', '--syntax-comment', '--syntax-param', '--syntax-class',
    ]) {
      expect(tokens[name], `缺少 ${name}`).toBeDefined();
    }
  });

  it('內文對比達 AAA（≥ 7:1）', () => {
    expect(contrast(resolve(tokens['--ink'], ground), ground)).toBeGreaterThanOrEqual(7);
  });

  it('強調色對比達 AAA（≥ 7:1）', () => {
    expect(contrast(resolve(tokens['--accent'], ground), ground)).toBeGreaterThanOrEqual(7);
  });

  it('次要資訊文字對比達 AA（≥ 4.5:1）', () => {
    expect(contrast(resolve(tokens['--muted'], ground), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it('裝飾性 chrome 至少達 AA Large（≥ 3:1）', () => {
    expect(contrast(resolve(tokens['--dim'], ground), ground)).toBeGreaterThanOrEqual(3);
  });

  it('不得出現任何被授權限制的主題名稱', () => {
    expect(css.toLowerCase()).not.toContain('dracula');
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，錯誤訊息為找不到 `tokens.css`（`ENOENT`）。

- [ ] **Step 4: 建立 tokens.css**

`src/styles/tokens.css`：

```css
:root {
  /* 底與墨 */
  --ground: #22212C;
  --ink: #F8F8F2;
  --panel: #1B1A23;
  --line: #454158;

  /* 強調：只用於狀態指示、視窗角標、連結、ACCESS GRANTED */
  --accent: #80FFEA;

  /* 次要文字。--dim 僅 3.56:1，只准用於裝飾性 chrome；
     任何承載資訊的文字一律用 --muted。 */
  --dim: #7970A9;
  --muted: rgba(248, 248, 242, 0.62);

  /* 語法高亮：唯一允許出現多色相的地方 */
  --syntax-keyword: #FF80BF;
  --syntax-function: #8AFF80;
  --syntax-string: #FFFF80;
  --syntax-number: #9580FF;
  --syntax-comment: #7970A9;
  --syntax-param: #FFCA80;
  --syntax-class: #80FFEA;

  /* 字體。中文等寬字在長文閱讀是酷刑，故內文用無襯線。 */
  --font-mono: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo,
               "PingFang TC", "Noto Sans TC", monospace;
  --font-sans: -apple-system, "Noto Sans TC", "PingFang TC", "SF Pro Text",
               system-ui, sans-serif;

  /* 動態常數 */
  --nav-duration: 420ms;
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npm test`
Expected: PASS，6 個測試全綠。

- [ ] **Step 6: 建立 base.css**

`src/styles/base.css`：

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-mono);
  min-height: 100vh;
}

a { color: var(--accent); }

/* 螢幕閱讀器專用 */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* 抖色 canvas 與故障分層的容器，跨頁保留 */
#fx {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
#fx canvas { display: block; width: 100%; height: 100%; }

/* 主要內容永遠疊在 canvas 之上 */
.page {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 5.2rem 2.6rem 3rem;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 7: 確認建置可通過**

Run: `npm run build`
Expected: 成功。若因 `src/pages/` 尚無任何頁面而失敗，建立最小的 `src/pages/index.astro`：

```astro
---
import '../styles/base.css';
---
<html lang="en">
  <head><meta charset="utf-8" /><title>happyhacking.ninja</title></head>
  <body><p>bootstrap</p></body>
</html>
```

再次執行 `npm run build`，Expected: 成功。

- [ ] **Step 8: 提交**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs vitest.config.ts src/
git commit -m "feat: 專案骨架與配色 token，含對比度守門測試"
```

---

## Task 2: 閱讀時間估算（純函式）

**Files:**
- Create: `src/lib/reading-time.ts`
- Test: `src/lib/reading-time.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `estimateReadingTime(markdown: string): number` — 回傳分鐘數，最小值 1。Task 3 的 `loadPosts()` 在 frontmatter 未提供 `readingTime` 時呼叫它。

- [ ] **Step 1: 寫失敗的測試**

中英混排必須分開計算：中文以「字」計（每分鐘約 300 字），英文以「詞」計（每分鐘約 200 詞）。用同一個速率會讓中文文章的估計嚴重偏高。

`src/lib/reading-time.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { estimateReadingTime } from './reading-time';

describe('estimateReadingTime', () => {
  it('空字串回傳最小值 1', () => {
    expect(estimateReadingTime('')).toBe(1);
  });

  it('600 個中文字約 2 分鐘', () => {
    expect(estimateReadingTime('字'.repeat(600))).toBe(2);
  });

  it('400 個英文詞約 2 分鐘', () => {
    expect(estimateReadingTime(Array(400).fill('word').join(' '))).toBe(2);
  });

  it('中英混排分開計算後相加', () => {
    // 300 中文字 (1 分) + 200 英文詞 (1 分) = 2 分
    const text = '字'.repeat(300) + ' ' + Array(200).fill('word').join(' ');
    expect(estimateReadingTime(text)).toBe(2);
  });

  it('忽略程式碼區塊內容', () => {
    const withCode = '字'.repeat(300) + '\n\n```\n' + '字'.repeat(3000) + '\n```\n';
    expect(estimateReadingTime(withCode)).toBe(1);
  });

  it('忽略 frontmatter', () => {
    const doc = '---\ntitle: ' + '字'.repeat(600) + '\n---\n\n' + '字'.repeat(300);
    expect(estimateReadingTime(doc)).toBe(1);
  });

  it('無條件進位，且永遠至少 1', () => {
    expect(estimateReadingTime('字')).toBe(1);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/reading-time.test.ts`
Expected: FAIL，`Failed to resolve import "./reading-time"`。

- [ ] **Step 3: 實作**

`src/lib/reading-time.ts`：

```ts
const CJK_PER_MINUTE = 300;
const WORDS_PER_MINUTE = 200;

/** 中日韓統一表意文字與常用標點，逐字計算 */
const CJK_PATTERN = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/g;

function stripNonProse(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')  // frontmatter
    .replace(/```[\s\S]*?```/g, '')                  // 圍籬式程式碼區塊
    .replace(/`[^`\n]*`/g, '')                       // 行內程式碼
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '');          // 連結與圖片
}

/**
 * 估算閱讀時間（分鐘）。中文以字計、英文以詞計，兩者分開換算後相加。
 * 永遠回傳 >= 1 的整數。
 */
export function estimateReadingTime(markdown: string): number {
  const prose = stripNonProse(markdown);

  const cjkCount = (prose.match(CJK_PATTERN) ?? []).length;
  const latinWords = prose
    .replace(CJK_PATTERN, ' ')
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;

  const minutes = cjkCount / CJK_PER_MINUTE + latinWords / WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(minutes));
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/reading-time.test.ts`
Expected: PASS，7 個測試全綠。

- [ ] **Step 5: 提交**

```bash
git add src/lib/reading-time.ts src/lib/reading-time.test.ts
git commit -m "feat: 中英混排閱讀時間估算"
```

---

## Task 3: 內容集合 schema 與文章查詢

**Files:**
- Create: `src/content.config.ts`
- Create: `src/lib/posts.ts`
- Create: `src/content/posts/zh/aks-lun-exhaustion.md`
- Create: `src/content/posts/en/approval-orchestrator.md`
- Test: `src/lib/posts.test.ts`

**Interfaces:**
- Consumes: `estimateReadingTime` from Task 2
- Produces:
  - `type Locale = 'en' | 'zh'`
  - `interface PostMeta { slug: string; locale: Locale; title: string; description: string; date: Date; tags: string[]; translationKey?: string; readingTime: number }`
  - `sortByDate(posts: PostMeta[]): PostMeta[]`
  - `filterByLocale(posts: PostMeta[], locale: Locale): PostMeta[]`
  - `filterByTag(posts: PostMeta[], tag: string | null): PostMeta[]`
  - `collectTags(posts: PostMeta[]): string[]`
  - `findTranslation(post: PostMeta, all: PostMeta[]): PostMeta | undefined`
  - `parseEntryId(id: string): { locale: Locale; slug: string }`
  - `loadPosts(): Promise<Array<PostMeta & { entry: CollectionEntry<'posts'> }>>`

- [ ] **Step 1: 寫失敗的測試**

只測純函式。`loadPosts()` 依賴 `astro:content`，由 Task 11 的 Playwright 端對端覆蓋。

`src/lib/posts.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import {
  sortByDate, filterByLocale, filterByTag, collectTags,
  findTranslation, parseEntryId, type PostMeta,
} from './posts';

function post(overrides: Partial<PostMeta> & Pick<PostMeta, 'slug'>): PostMeta {
  return {
    locale: 'zh',
    title: 'T',
    description: 'D',
    date: new Date('2026-01-01'),
    tags: [],
    readingTime: 5,
    ...overrides,
  };
}

describe('parseEntryId', () => {
  it('從 id 解析 locale 與 slug', () => {
    expect(parseEntryId('zh/aks-lun')).toEqual({ locale: 'zh', slug: 'aks-lun' });
    expect(parseEntryId('en/approval')).toEqual({ locale: 'en', slug: 'approval' });
  });

  it('目錄名不是合法 locale 時拋錯', () => {
    expect(() => parseEntryId('jp/foo')).toThrow(/locale/i);
  });

  it('沒有語言目錄時拋錯', () => {
    expect(() => parseEntryId('foo')).toThrow(/locale/i);
  });
});

describe('sortByDate', () => {
  it('由新到舊排序，不改動輸入陣列', () => {
    const input = [
      post({ slug: 'a', date: new Date('2026-01-01') }),
      post({ slug: 'b', date: new Date('2026-03-01') }),
      post({ slug: 'c', date: new Date('2026-02-01') }),
    ];
    expect(sortByDate(input).map((p) => p.slug)).toEqual(['b', 'c', 'a']);
    expect(input.map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterByLocale', () => {
  it('只留下指定語言', () => {
    const all = [post({ slug: 'a', locale: 'zh' }), post({ slug: 'b', locale: 'en' })];
    expect(filterByLocale(all, 'en').map((p) => p.slug)).toEqual(['b']);
  });
});

describe('filterByTag', () => {
  const all = [
    post({ slug: 'a', tags: ['AZURE', 'AKS'] }),
    post({ slug: 'b', tags: ['LLM'] }),
  ];

  it('tag 為 null 時回傳全部', () => {
    expect(filterByTag(all, null)).toHaveLength(2);
  });

  it('比對不分大小寫', () => {
    expect(filterByTag(all, 'azure').map((p) => p.slug)).toEqual(['a']);
  });

  it('沒有符合時回傳空陣列', () => {
    expect(filterByTag(all, 'KAFKA')).toEqual([]);
  });
});

describe('collectTags', () => {
  it('去重並依字母排序', () => {
    const all = [
      post({ slug: 'a', tags: ['LLM', 'AZURE'] }),
      post({ slug: 'b', tags: ['AZURE', 'AKS'] }),
    ];
    expect(collectTags(all)).toEqual(['AKS', 'AZURE', 'LLM']);
  });
});

describe('findTranslation', () => {
  it('用 translationKey 找到另一語言的版本', () => {
    const zh = post({ slug: 'a', locale: 'zh', translationKey: 'k1' });
    const en = post({ slug: 'a-en', locale: 'en', translationKey: 'k1' });
    expect(findTranslation(zh, [zh, en])?.slug).toBe('a-en');
  });

  it('沒有 translationKey 時回傳 undefined', () => {
    const zh = post({ slug: 'a', locale: 'zh' });
    expect(findTranslation(zh, [zh])).toBeUndefined();
  });

  it('只有自己有這個 key 時回傳 undefined', () => {
    const zh = post({ slug: 'a', locale: 'zh', translationKey: 'k1' });
    expect(findTranslation(zh, [zh])).toBeUndefined();
  });

  it('不會回傳同語言的文章', () => {
    const zh1 = post({ slug: 'a', locale: 'zh', translationKey: 'k1' });
    const zh2 = post({ slug: 'b', locale: 'zh', translationKey: 'k1' });
    expect(findTranslation(zh1, [zh1, zh2])).toBeUndefined();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/posts.test.ts`
Expected: FAIL，`Failed to resolve import "./posts"`。

- [ ] **Step 3: 建立內容集合 schema**

`src/content.config.ts`：

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  // 底線開頭的檔案視為草稿，不會被收錄
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    lang: z.enum(['en', 'zh']),
    tags: z.array(z.string()).default([]),
    translationKey: z.string().optional(),
    readingTime: z.number().int().positive().optional(),
  }),
});

export const collections = { posts };
```

- [ ] **Step 4: 實作 posts.ts**

`src/lib/posts.ts`：

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import { estimateReadingTime } from './reading-time';

export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export interface PostMeta {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  translationKey?: string;
  readingTime: number;
}

export type LoadedPost = PostMeta & { entry: CollectionEntry<'posts'> };

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** id 形如 "zh/aks-lun"。語言目錄是唯一真相，frontmatter 的 lang 必須一致。 */
export function parseEntryId(id: string): { locale: Locale; slug: string } {
  const [dir, ...rest] = id.split('/');
  if (rest.length === 0 || !isLocale(dir)) {
    throw new Error(
      `文章 id "${id}" 必須位於語言目錄下（${LOCALES.join(' / ')}），例如 zh/my-post`,
    );
  }
  return { locale: dir, slug: rest.join('/') };
}

export function sortByDate(posts: PostMeta[]): PostMeta[] {
  return [...posts].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function filterByLocale<T extends PostMeta>(posts: T[], locale: Locale): T[] {
  return posts.filter((post) => post.locale === locale);
}

export function filterByTag<T extends PostMeta>(posts: T[], tag: string | null): T[] {
  if (!tag) return posts;
  const needle = tag.toLowerCase();
  return posts.filter((post) => post.tags.some((t) => t.toLowerCase() === needle));
}

export function collectTags(posts: PostMeta[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags))].sort();
}

export function findTranslation<T extends PostMeta>(post: T, all: T[]): T | undefined {
  if (!post.translationKey) return undefined;
  return all.find(
    (other) => other.translationKey === post.translationKey && other.locale !== post.locale,
  );
}

/** 唯一碰 astro:content 的地方。其餘邏輯都是上面的純函式。 */
export async function loadPosts(): Promise<LoadedPost[]> {
  const entries = await getCollection('posts');
  return entries.map((entry) => {
    const { locale, slug } = parseEntryId(entry.id);
    if (entry.data.lang !== locale) {
      throw new Error(
        `${entry.id}: frontmatter lang="${entry.data.lang}" 與所在目錄 "${locale}" 不符`,
      );
    }
    return {
      slug,
      locale,
      title: entry.data.title,
      description: entry.data.description,
      date: entry.data.date,
      tags: entry.data.tags,
      translationKey: entry.data.translationKey,
      readingTime: entry.data.readingTime ?? estimateReadingTime(entry.body ?? ''),
      entry,
    };
  });
}
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/lib/posts.test.ts`
Expected: PASS，13 個測試全綠。

- [ ] **Step 6: 建立兩篇種子文章**

沒有內容就無法驗證後續的頁面。這兩篇是真實格式的樣本。

`src/content/posts/zh/aks-lun-exhaustion.md`：

```markdown
---
title: "AKS 節點 LUN 用盡：一次 PVC 掛載失敗的完整拆解"
description: "Pod 卡在 ContainerCreating 十二分鐘，儀表板一切正常。問題出在 VM SKU 的資料磁碟數上限。"
date: 2026-08-11
lang: zh
tags: ["AZURE", "AKS"]
---

事情從一個很不起眼的告警開始：某個 StatefulSet 的 Pod 卡在 `ContainerCreating`，已經十二分鐘。叢集其他工作負載一切正常，節點狀態 Ready，資源用量看起來也不緊張。如果只看儀表板，你會覺得什麼事都沒發生。

## 先確認故障域

我的習慣是先問一個問題：這是「這個 Pod 的問題」還是「這個節點的問題」。方法很粗暴但有效——把 Pod 刪掉，看它排到別的節點上會不會好。

```bash
kubectl get pods -o wide -n data
```

如果換節點就正常，答案已經縮小了一半。

## 每台 VM 能掛幾顆磁碟，是有上限的

Azure 的每個 VM SKU 都有「最大資料磁碟數」的限制，而這個數字往往比人們預期的小得多。這個限制不是軟性建議，是硬性的——LUN 位置用完就是用完了。

> 容易被忽略的細節：Pod 被驅逐之後，磁碟的卸載不是瞬間完成的。在卸載完成前，那個 LUN 位置仍然被佔著。

## 真正該修的是可觀測性

把 Pod 弄回 Running 不算解決問題。真正的問題是這個故障完全沒有預警。雲端平台的硬性限制幾乎都不會主動出現在你的監控裡；你得自己去把它們找出來、量化、然後接上告警。
```

`src/content/posts/en/approval-orchestrator.md`：

```markdown
---
title: "Designing an Approval Orchestrator for LLM Agents"
description: "What it takes to put a human in the loop without making the loop the bottleneck."
date: 2026-07-02
lang: en
tags: ["LLM", "ARCHITECTURE"]
---

Every agent that can take a consequential action eventually needs an approval step. The naive version blocks the agent on a synchronous prompt, which turns a ten-second task into a ten-hour one.

## Approvals are state, not a pause

The useful reframing is that an approval is a durable state transition, not a blocking call. The agent proposes an action, the proposal is persisted, and the agent yields.

```python
proposal = store.create(action=action, requested_by=agent.id)
return Yield(waiting_on=proposal.id)
```

When a human resolves the proposal, the orchestrator resumes the agent from where it left off.

## Auditability is the actual deliverable

The reason to build this is not safety theatre. It is that six months later someone will ask why the system did something, and you need an answer that is not a log line.
```

- [ ] **Step 7: 確認 schema 生效**

Run: `npm run build`
Expected: 成功，且輸出中出現 `Syncing content` 之類的訊息、無 schema 錯誤。

再驗證 schema 真的會擋錯誤資料——暫時把 `src/content/posts/zh/aks-lun-exhaustion.md` 的 `lang: zh` 改成 `lang: jp`：

Run: `npm run build`
Expected: FAIL，錯誤訊息提到 `lang` 不是合法的 enum 值。

改回 `lang: zh`，Run: `npm run build`，Expected: 成功。

- [ ] **Step 8: 提交**

```bash
git add src/content.config.ts src/lib/posts.ts src/lib/posts.test.ts src/content/
git commit -m "feat: 文章內容集合 schema 與查詢純函式"
```

---

## Task 4: i18n 路由輔助

**Files:**
- Create: `src/lib/i18n/routing.ts`
- Create: `src/lib/i18n/ui.ts`
- Test: `src/lib/i18n/routing.test.ts`

**Interfaces:**
- Consumes: `Locale`, `LOCALES` from `src/lib/posts.ts`（Task 3）
- Produces:
  - `DEFAULT_LOCALE: Locale`
  - `localizePath(locale: Locale, path: string): string`
  - `localeFromPath(pathname: string): Locale`
  - `stripLocale(pathname: string): string`
  - `alternateHreflang(path: string): Array<{ hreflang: string; href: string }>`
  - `t(locale: Locale, key: UiKey): string`

- [ ] **Step 1: 寫失敗的測試**

最關鍵的一條是 `/zhuangzi` 不能被誤判為 `zh` — 前綴比對必須有邊界。

`src/lib/i18n/routing.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE, localizePath, localeFromPath, stripLocale, alternateHreflang,
} from './routing';

describe('localizePath', () => {
  it('預設語言不加前綴', () => {
    expect(localizePath('en', '/writing')).toBe('/writing');
    expect(localizePath('en', '/')).toBe('/');
  });

  it('非預設語言加上前綴', () => {
    expect(localizePath('zh', '/writing')).toBe('/zh/writing');
    expect(localizePath('zh', '/about')).toBe('/zh/about');
  });

  it('非預設語言的首頁保留尾斜線', () => {
    expect(localizePath('zh', '/')).toBe('/zh/');
  });

  it('容忍缺少前導斜線的輸入', () => {
    expect(localizePath('zh', 'writing')).toBe('/zh/writing');
    expect(localizePath('en', 'writing')).toBe('/writing');
  });
});

describe('localeFromPath', () => {
  it('辨識 zh 前綴', () => {
    expect(localeFromPath('/zh/writing/foo')).toBe('zh');
    expect(localeFromPath('/zh/')).toBe('zh');
    expect(localeFromPath('/zh')).toBe('zh');
  });

  it('無前綴時回傳預設語言', () => {
    expect(localeFromPath('/writing/foo')).toBe('en');
    expect(localeFromPath('/')).toBe('en');
  });

  it('不把僅是開頭相同的路徑誤判為語言前綴', () => {
    expect(localeFromPath('/zhuangzi')).toBe('en');
    expect(localeFromPath('/zhuangzi/notes')).toBe('en');
  });
});

describe('stripLocale', () => {
  it('移除語言前綴', () => {
    expect(stripLocale('/zh/writing/foo')).toBe('/writing/foo');
    expect(stripLocale('/zh/')).toBe('/');
    expect(stripLocale('/zh')).toBe('/');
  });

  it('無前綴時原樣回傳', () => {
    expect(stripLocale('/writing/foo')).toBe('/writing/foo');
    expect(stripLocale('/zhuangzi')).toBe('/zhuangzi');
  });
});

describe('alternateHreflang', () => {
  it('為每個語言與 x-default 產生條目', () => {
    expect(alternateHreflang('/writing')).toEqual([
      { hreflang: 'en', href: '/writing' },
      { hreflang: 'zh-Hant', href: '/zh/writing' },
      { hreflang: 'x-default', href: '/writing' },
    ]);
  });

  it('接受已含前綴的路徑並正規化', () => {
    expect(alternateHreflang('/zh/about')).toEqual([
      { hreflang: 'en', href: '/about' },
      { hreflang: 'zh-Hant', href: '/zh/about' },
      { hreflang: 'x-default', href: '/about' },
    ]);
  });
});

describe('DEFAULT_LOCALE', () => {
  it('是 en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/i18n/routing.test.ts`
Expected: FAIL，`Failed to resolve import "./routing"`。

- [ ] **Step 3: 實作 routing.ts**

`src/lib/i18n/routing.ts`：

```ts
import { LOCALES, type Locale } from '../posts';

export const DEFAULT_LOCALE: Locale = 'en';

/** 給 hreflang 用的 BCP 47 標籤 */
const HREFLANG: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-Hant',
};

function normalise(path: string): string {
  return '/' + path.replace(/^\/+/, '');
}

export function localizePath(locale: Locale, path: string): string {
  const clean = normalise(path);
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}/` : `/${locale}${clean}`;
}

export function localeFromPath(pathname: string): Locale {
  const clean = normalise(pathname);
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    // 邊界很重要：/zhuangzi 不是中文頁
    if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return locale;
  }
  return DEFAULT_LOCALE;
}

export function stripLocale(pathname: string): string {
  const clean = normalise(pathname);
  const locale = localeFromPath(clean);
  if (locale === DEFAULT_LOCALE) return clean;
  const rest = clean.slice(`/${locale}`.length);
  return rest === '' || rest === '/' ? '/' : rest;
}

export function alternateHreflang(path: string): Array<{ hreflang: string; href: string }> {
  const base = stripLocale(path);
  const entries = LOCALES.map((locale) => ({
    hreflang: HREFLANG[locale],
    href: localizePath(locale, base),
  }));
  return [...entries, { hreflang: 'x-default', href: localizePath(DEFAULT_LOCALE, base) }];
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/i18n/routing.test.ts`
Expected: PASS，13 個測試全綠。

- [ ] **Step 5: 實作介面字串**

`src/lib/i18n/ui.ts`：

```ts
import type { Locale } from '../posts';

const STRINGS = {
  en: {
    'nav.home': 'HOME',
    'nav.writing': 'WRITING',
    'nav.about': 'ABOUT',
    'writing.heading': 'WRITING',
    'writing.count': 'POSTS',
    'writing.allTags': 'ALL',
    'writing.empty': 'No posts match this tag.',
    'post.readingTime': 'MIN',
    'post.translationAvailable': 'Also available in 中文',
    'post.onlyLanguage': 'This post is only available in its original language.',
    'window.eof': 'EOF',
    'window.linkOk': 'LINK OK',
    'skip.sequence': 'CLICK / ANY KEY TO SKIP',
    'error.404.title': 'SEGMENT NOT FOUND',
    'error.404.body': 'That path does not exist on this host.',
    'error.404.back': 'RETURN TO ROOT',
  },
  zh: {
    'nav.home': 'HOME',
    'nav.writing': 'WRITING',
    'nav.about': 'ABOUT',
    'writing.heading': 'WRITING',
    'writing.count': '篇',
    'writing.allTags': '全部',
    'writing.empty': '沒有符合這個標籤的文章。',
    'post.readingTime': '分鐘',
    'post.translationAvailable': '本篇另有 English 版本',
    'post.onlyLanguage': '本篇僅有原文版本。',
    'window.eof': 'EOF',
    'window.linkOk': 'LINK OK',
    'skip.sequence': '點擊或按任意鍵跳過',
    'error.404.title': 'SEGMENT NOT FOUND',
    'error.404.body': '這個路徑在這台主機上不存在。',
    'error.404.back': '回到根目錄',
  },
} as const;

export type UiKey = keyof (typeof STRINGS)['en'];

export function t(locale: Locale, key: UiKey): string {
  return STRINGS[locale][key];
}
```

- [ ] **Step 6: 確認型別檢查通過**

Run: `npm run check`
Expected: 0 errors。

- [ ] **Step 7: 提交**

```bash
git add src/lib/i18n/
git commit -m "feat: i18n 路由輔助與介面字串"
```

---

## Task 5: 終端機視窗元件與版面

**Files:**
- Create: `src/components/TerminalWindow.astro`
- Create: `src/components/Wordmark.astro`
- Create: `src/components/SiteNav.astro`
- Modify: `src/styles/base.css`（附加視窗與排版樣式）

**Interfaces:**
- Consumes: token from Task 1、`t()` / `localizePath()` from Task 4
- Produces:
  - `TerminalWindow.astro` props：`{ path: string; meta?: string; deco?: string; footLeft?: string; footItems?: string[]; variant?: 'prose' | 'plain' }`，內容由 default slot 提供
  - `Wordmark.astro`：無 props
  - `SiteNav.astro` props：`{ locale: Locale; current: 'home' | 'writing' | 'about' }`

- [ ] **Step 1: 建立 TerminalWindow 元件**

零 JS 的純呈現元件。所有文章 metadata 都由視窗 chrome 承載。

`src/components/TerminalWindow.astro`：

```astro
---
interface Props {
  /** 標題列顯示的路徑，例如 ~/writing/aks-lun.md */
  path: string;
  /** 標題列右側承載資訊的 metadata，例如 UTF-8 · ZH-HANT · 14 MIN */
  meta?: string;
  /** 標題列右側的純裝飾文字（用 --dim）。與 meta 擇一。 */
  deco?: string;
  /** 狀態列最左側，預設 EOF */
  footLeft?: string;
  /** 狀態列其餘項目 */
  footItems?: string[];
  /** prose 使用無襯線內文排版；plain 保持等寬 */
  variant?: 'prose' | 'plain';
}

const {
  path,
  meta,
  deco,
  footLeft = 'EOF',
  footItems = [],
  variant = 'plain',
} = Astro.props;
---

<section class="win">
  <header class="win-bar">
    <i class="win-dot" aria-hidden="true"></i>
    <span class="win-path">{path}</span>
    {meta && <span class="win-meta">{meta}</span>}
    {!meta && deco && <span class="win-deco">{deco}</span>}
  </header>

  <div class:list={['win-body', variant]}>
    <slot />
  </div>

  {(footLeft || footItems.length > 0) && (
    <footer class="win-foot">
      <span class="win-ok">● {footLeft}</span>
      {footItems.map((item) => <span>{item}</span>)}
    </footer>
  )}
</section>
```

- [ ] **Step 2: 建立 Wordmark 元件**

字標永遠存在於 DOM（SEO 與螢幕閱讀器都需要看到你的名字）。WebGL 啟動後只是把它的 `opacity` 降為 0——**不用 `display:none`，那會讓它從無障礙樹消失**。

`src/components/Wordmark.astro`：

```astro
---
// 只在首頁使用。字標是首頁專屬的主體，不是全站背景元素。
---
<h1 class="wordmark" data-wordmark>
  <span class="wordmark-main">KEHAO</span>
  <span class="wordmark-sub">// HAPPY HACKING</span>
</h1>
```

- [ ] **Step 3: 建立導覽列元件**

`src/components/SiteNav.astro`：

```astro
---
import type { Locale } from '../lib/posts';
import { localizePath } from '../lib/i18n/routing';
import { t } from '../lib/i18n/ui';

interface Props {
  locale: Locale;
  current: 'home' | 'writing' | 'about';
}

const { locale, current } = Astro.props;

const links = [
  { key: 'home' as const, href: localizePath(locale, '/'), label: t(locale, 'nav.home') },
  { key: 'writing' as const, href: localizePath(locale, '/writing'), label: t(locale, 'nav.writing') },
  { key: 'about' as const, href: localizePath(locale, '/about'), label: t(locale, 'nav.about') },
];

const otherLocale: Locale = locale === 'en' ? 'zh' : 'en';
---

<nav class="site-nav">
  <a class="brand" href={localizePath(locale, '/')}>HAPPYHACKING.NINJA</a>
  {links.map((link) => (
    <a
      href={link.href}
      class:list={['nav-link', { on: link.key === current }]}
      aria-current={link.key === current ? 'page' : undefined}
    >{link.label}</a>
  ))}
  <a class="nav-lang" href={localizePath(otherLocale, '/')}>
    {otherLocale === 'zh' ? '中文' : 'EN'}
  </a>
</nav>
```

- [ ] **Step 4: 附加樣式到 base.css**

把下列內容**附加**到 `src/styles/base.css` 末尾：

```css
/* ============================== 導覽 ============================== */
.site-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 7;
  display: flex;
  align-items: center;
  gap: 1.8rem;
  padding: 1.15rem 2.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  background: linear-gradient(var(--ground) 62%, transparent);
}
.site-nav .brand { margin-right: auto; color: var(--ink); text-decoration: none; }
.nav-link, .nav-lang {
  color: var(--muted);
  text-decoration: none;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid transparent;
}
.nav-link:hover, .nav-lang:hover { color: var(--ink); }
.nav-link.on { color: var(--ink); border-bottom-color: var(--accent); }

/* ============================ 終端機視窗 ============================ */
.win {
  position: relative;
  /* 不透明度固定 1.00：視窗底是實心 ground，背景抖色永遠碰不到文字 */
  background: var(--ground);
  border: 1px solid var(--line);
}
.win::before, .win::after {
  content: '';
  position: absolute;
  width: 10px; height: 10px;
  border: 1px solid var(--accent);
}
.win::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.win::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }

.win-bar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  font-size: 0.63rem;
  letter-spacing: 0.13em;
}
.win-dot {
  width: 7px; height: 7px;
  flex: none;
  border: 1px solid var(--accent);
  background: var(--accent);
}
.win-path { color: var(--muted); }
.win-meta { margin-left: auto; color: var(--muted); }   /* 承載資訊 */
.win-deco { margin-left: auto; color: var(--dim); }     /* 純裝飾 */

.win-body { padding: 1.4rem 1.6rem; }
.win-foot {
  display: flex;
  gap: 0.9rem;
  padding: 0.45rem 0.85rem;
  border-top: 1px solid var(--line);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.win-ok { color: var(--accent); }

/* ============================ 內文排版 ============================ */
.win-body.prose {
  padding: 2.4rem 2.6rem 2.8rem;
  font-family: var(--font-sans);
}
.prose h1 { font-size: 1.9rem; line-height: 1.42; margin: 0 0 1.5rem; letter-spacing: -0.01em; }
.prose h2 {
  font-size: 1.15rem;
  line-height: 1.55;
  margin: 2.6rem 0 0.9rem;
  padding-left: 0.72rem;
  border-left: 3px solid var(--accent);
}
.prose p, .prose li { font-size: 1rem; line-height: 2.02; margin: 0 0 1.35rem; }
.prose li { margin-bottom: 0.5rem; }
.prose blockquote {
  margin: 0 0 1.4rem;
  padding: 0.15rem 0 0.15rem 1.1rem;
  border-left: 2px solid var(--line);
  color: var(--muted);
}
.prose :not(pre) > code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 0.1em 0.35em;
}
.prose pre {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 1.05rem 1.25rem;
  overflow-x: auto;
  font: 0.83rem/1.85 var(--font-mono);
  margin: 0 0 1.4rem;
}
.prose pre > code { background: none; border: none; padding: 0; }

/* ============================== 字標 ============================== */
/* 只在首頁使用。WebGL 啟動時降為透明但保留在無障礙樹中。 */
.wordmark {
  position: fixed;
  z-index: 1;
  left: 0; right: 0;
  top: 30%;
  margin: 0;
  text-align: center;
  pointer-events: none;
  user-select: none;
  transition: opacity 200ms linear;
}
.wordmark-main {
  display: block;
  font-size: clamp(3rem, 11vw, 7.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 0.95;
}
.wordmark-sub {
  display: block;
  margin-top: 1rem;
  font-size: clamp(0.7rem, 1.5vw, 1rem);
  letter-spacing: 0.5em;
  color: var(--muted);
}
/* ============================== 版面 ============================== */
.layout-front { display: flex; align-items: flex-end; min-height: calc(100vh - 8rem); }
.layout-front .win { width: min(580px, 54vw); }
.layout-front .win-body { padding: 1.1rem 1.3rem; font-size: 0.83rem; line-height: 1.95; }
.layout-reading { max-width: 820px; margin: 0 auto; }
.layout-list { max-width: 860px; margin: 0 auto; }
```

- [ ] **Step 5: 用臨時頁面目視驗證**

把 `src/pages/index.astro` 暫時改成：

```astro
---
import '../styles/base.css';
import SiteNav from '../components/SiteNav.astro';
import TerminalWindow from '../components/TerminalWindow.astro';
import Wordmark from '../components/Wordmark.astro';
---
<html lang="en">
  <head><meta charset="utf-8" /><title>happyhacking.ninja</title></head>
  <body>
    <SiteNav locale="en" current="home" />
    <Wordmark />
    <main class="page layout-front">
      <TerminalWindow path="guest@happyhacking:~" deco="SSH · 80×24" footLeft="LINK OK" footItems={['LATENCY 12ms', 'UTF-8']}>
        <p>Cloud-native &amp; AI infrastructure.</p>
      </TerminalWindow>
    </main>
  </body>
</html>
```

Run: `npm run dev`，在瀏覽器開啟 `http://localhost:4321/`

Expected: 深紫黑底、左下角有帶青色角標的終端機視窗、大字標 `KEHAO` 置中偏上、頂端導覽列。文字清晰可讀。

- [ ] **Step 6: 提交**

```bash
git add src/components/ src/styles/base.css src/pages/index.astro
git commit -m "feat: 終端機視窗、字標與導覽元件"
```

---

## Task 6: 版面與所有頁面（尚無動畫）

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/FrontLayout.astro`
- Create: `src/layouts/ReadingLayout.astro`
- Create: `src/components/PostRow.astro`
- Create: `src/components/TagFilter.astro`
- Modify: `src/pages/index.astro`
- Create: `src/pages/about.astro`、`src/pages/writing/index.astro`、`src/pages/writing/[slug].astro`、`src/pages/404.astro`
- Create: `src/pages/zh/index.astro`、`src/pages/zh/about.astro`、`src/pages/zh/writing/index.astro`、`src/pages/zh/writing/[slug].astro`

**Interfaces:**
- Consumes: Task 3 的 `loadPosts` 與純函式、Task 4 的 `localizePath` / `alternateHreflang` / `t`、Task 5 的三個元件
- Produces:
  - `BaseLayout.astro` props：`{ locale: Locale; title: string; description: string; path: string; current: 'home' | 'writing' | 'about'; front?: boolean }`
  - `FrontLayout.astro` / `ReadingLayout.astro`：同上減去 `front`
  - `PostRow.astro` props：`{ post: PostMeta; href: string; locale: Locale }`
  - `TagFilter.astro` props：`{ tags: string[]; active: string | null; basePath: string; locale: Locale }`
  - `<div id="fx" transition:persist>` 這個容器，Task 9 與 Task 10 會往裡面放東西

- [ ] **Step 1: 建立 BaseLayout**

`#fx` 用 `transition:persist` 標記，讓 canvas 與故障分層在客戶端換頁時存活。`data-front` 讓後續 task 判斷是否啟動 WebGL。

`src/layouts/BaseLayout.astro`：

```astro
---
import '../styles/base.css';
import type { Locale } from '../lib/posts';
import SiteNav from '../components/SiteNav.astro';
import { alternateHreflang } from '../lib/i18n/routing';

interface Props {
  locale: Locale;
  title: string;
  description: string;
  /** 不含語言前綴的正規路徑，例如 /writing */
  path: string;
  current: 'home' | 'writing' | 'about';
  front?: boolean;
}

const { locale, title, description, path, current, front = false } = Astro.props;
const alternates = alternateHreflang(path);
const htmlLang = locale === 'zh' ? 'zh-Hant' : 'en';
---

<html lang={htmlLang} data-front={front ? 'true' : undefined}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />
    {alternates.map((alt) => (
      <link rel="alternate" hreflang={alt.hreflang} href={new URL(alt.href, Astro.site)} />
    ))}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <slot name="head" />
  </head>
  <body>
    <!-- 抖色 canvas 與故障分層的家。跨頁保留，避免換頁時被抽掉。 -->
    <div id="fx" transition:persist aria-hidden="true">
      <canvas id="dither-canvas"></canvas>
      <div id="fx-layers"></div>
    </div>

    <SiteNav locale={locale} current={current} />
    <slot />
  </body>
</html>
```

- [ ] **Step 2: 建立兩個版面**

`src/layouts/FrontLayout.astro`：

```astro
---
import BaseLayout from './BaseLayout.astro';
import type { Locale } from '../lib/posts';

interface Props {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  current: 'home' | 'writing' | 'about';
}
const props = Astro.props;
---
<BaseLayout {...props} front={true}>
  <slot name="head" slot="head" />
  <slot />
</BaseLayout>
```

`src/layouts/ReadingLayout.astro`：

```astro
---
import BaseLayout from './BaseLayout.astro';
import type { Locale } from '../lib/posts';

interface Props {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  current: 'home' | 'writing' | 'about';
}
const props = Astro.props;
---
<!-- front=false：這條路徑不會載入 three.js -->
<BaseLayout {...props} front={false}>
  <slot name="head" slot="head" />
  <slot />
</BaseLayout>
```

- [ ] **Step 3: 建立文章列與標籤篩選元件**

`src/components/PostRow.astro`：

```astro
---
import type { Locale, PostMeta } from '../lib/posts';
import { t } from '../lib/i18n/ui';

interface Props {
  post: PostMeta;
  href: string;
  locale: Locale;
}
const { post, href, locale } = Astro.props;
const langLabel = post.locale === 'zh' ? '中文' : 'EN';
const dateLabel = post.date.toISOString().slice(0, 10);
---
<a class="post-row" href={href}>
  <span class="post-title">{post.title}</span>
  <span class="post-meta">
    <span class="post-lang">{langLabel}</span>
    <span>{dateLabel}</span>
    <span>{post.readingTime} {t(locale, 'post.readingTime')}</span>
    {post.tags.length > 0 && <span>{post.tags.join(' · ')}</span>}
  </span>
</a>
```

`src/components/TagFilter.astro`：

```astro
---
import type { Locale } from '../lib/posts';
import { t } from '../lib/i18n/ui';

interface Props {
  tags: string[];
  active: string | null;
  /** 已含語言前綴的索引頁路徑，例如 /zh/writing */
  basePath: string;
  locale: Locale;
}
const { tags, active, basePath, locale } = Astro.props;
---
<div class="tag-filter">
  <a class:list={['tag', { on: active === null }]} href={basePath}>
    {t(locale, 'writing.allTags')}
  </a>
  {tags.map((tag) => (
    <a
      class:list={['tag', { on: active?.toLowerCase() === tag.toLowerCase() }]}
      href={`${basePath}/tag/${tag.toLowerCase()}`}
    >{tag}</a>
  ))}
</div>
```

- [ ] **Step 4: 附加對應樣式**

把下列內容附加到 `src/styles/base.css` 末尾：

```css
/* ============================ 文章列與標籤 ============================ */
.post-row {
  display: block;
  padding: 0.95rem 1.4rem;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  color: inherit;
}
.post-row:last-of-type { border-bottom: none; }
.post-row:hover { background: var(--panel); }
.post-title {
  display: block;
  margin-bottom: 0.3rem;
  font-family: var(--font-sans);
  font-size: 1rem;
}
.post-row:hover .post-title { color: var(--accent); }
.post-meta {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  font-size: 0.66rem;
  letter-spacing: 0.11em;
  color: var(--muted);
}
.post-lang { border: 1px solid var(--line); padding: 0.16rem 0.34rem; }

.tag-filter {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.9rem 1.4rem;
  border-bottom: 1px solid var(--line);
}
.tag {
  font-size: 0.63rem;
  letter-spacing: 0.12em;
  border: 1px solid var(--line);
  padding: 0.25rem 0.5rem;
  color: var(--muted);
  text-decoration: none;
}
.tag:hover, .tag.on { border-color: var(--accent); color: var(--accent); }

.notice {
  margin: 0 0 1.4rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--line);
  font: 0.68rem/1.7 var(--font-mono);
  letter-spacing: 0.1em;
  color: var(--muted);
}
.notice a { color: var(--accent); }
```

- [ ] **Step 5: 建立英文首頁**

`src/pages/index.astro`：

```astro
---
import FrontLayout from '../layouts/FrontLayout.astro';
import TerminalWindow from '../components/TerminalWindow.astro';
import Wordmark from '../components/Wordmark.astro';
---
<FrontLayout
  locale="en"
  title="KEHAO — happyhacking.ninja"
  description="Cloud-native and AI infrastructure. Notes mostly in 中文, occasionally English."
  path="/"
  current="home"
>
  <Wordmark />
  <main class="page layout-front">
    <TerminalWindow
      path="guest@happyhacking:~"
      deco="SSH · 80×24"
      footLeft="LINK OK"
      footItems={['LATENCY 12ms', 'UTF-8']}
    >
      <p class="cmd">$ <b>cat ~/.profile</b></p>
      <p>
        Cloud-native &amp; AI infrastructure. I build the boring parts that let
        the interesting parts stay up.<br />
        <span class="soft">Notes mostly in 中文, occasionally English.</span>
      </p>
      <p class="soft">STATUS <span class="hot">ONLINE</span> · TAIPEI · AZURE / KUBERNETES / LLM AGENTS</p>
    </TerminalWindow>
  </main>
</FrontLayout>
```

再附加樣式到 `src/styles/base.css`：

```css
.cmd { color: var(--muted); margin: 0 0 0.6rem; }
.cmd b { color: var(--accent); font-weight: 600; }
.soft { color: var(--muted); }
.hot { color: var(--accent); }
```

- [ ] **Step 6: 建立英文 About 頁**

`src/pages/about.astro`：

```astro
---
import FrontLayout from '../layouts/FrontLayout.astro';
import TerminalWindow from '../components/TerminalWindow.astro';
---
<FrontLayout
  locale="en"
  title="About — KEHAO"
  description="Who I am and what I work on."
  path="/about"
  current="about"
>
  <main class="page layout-reading">
    <TerminalWindow path="~/about.md" deco="READ-ONLY" footLeft="LINK OK" footItems={['GITHUB · LINKEDIN · RSS']} variant="prose">
      <h1>About</h1>
      <p>
        I work on cloud infrastructure, mostly on Azure and Kubernetes. Recently
        most of my time goes into making LLM agents production-grade — not demos,
        but systems that can be deployed, audited, and debugged when they break.
      </p>
      <p>
        This site is where I keep my notes. Most technical writing is in Traditional
        Chinese, because that is the language I think in. Some of it gets an English
        version.
      </p>
    </TerminalWindow>
  </main>
</FrontLayout>
```

- [ ] **Step 7: 建立英文文章索引（含標籤路由）**

`src/pages/writing/index.astro`：

```astro
---
import FrontLayout from '../../layouts/FrontLayout.astro';
import TerminalWindow from '../../components/TerminalWindow.astro';
import PostRow from '../../components/PostRow.astro';
import TagFilter from '../../components/TagFilter.astro';
import { loadPosts, sortByDate, filterByLocale, collectTags } from '../../lib/posts';
import { localizePath } from '../../lib/i18n/routing';
import { t } from '../../lib/i18n/ui';

const all = await loadPosts();
const posts = sortByDate(filterByLocale(all, 'en'));
const tags = collectTags(posts);
---
<FrontLayout
  locale="en"
  title="Writing — KEHAO"
  description="Notes on cloud-native infrastructure, Azure, and LLM agents."
  path="/writing"
  current="writing"
>
  <main class="page layout-list">
    <TerminalWindow
      path="~/writing"
      meta={`${posts.length} ${t('en', 'writing.count')}`}
      footLeft="EOF"
      footItems={['NO FILTER']}
    >
      <TagFilter tags={tags} active={null} basePath="/writing" locale="en" />
      {posts.length === 0 && <p class="soft">{t('en', 'writing.empty')}</p>}
      {posts.map((post) => (
        <PostRow post={post} href={localizePath('en', `/writing/${post.slug}`)} locale="en" />
      ))}
    </TerminalWindow>
  </main>
</FrontLayout>
```

再建立標籤篩選路由 `src/pages/writing/tag/[tag].astro`：

```astro
---
import FrontLayout from '../../../layouts/FrontLayout.astro';
import TerminalWindow from '../../../components/TerminalWindow.astro';
import PostRow from '../../../components/PostRow.astro';
import TagFilter from '../../../components/TagFilter.astro';
import { loadPosts, sortByDate, filterByLocale, filterByTag, collectTags } from '../../../lib/posts';
import { localizePath } from '../../../lib/i18n/routing';
import { t } from '../../../lib/i18n/ui';

export async function getStaticPaths() {
  const all = await loadPosts();
  const posts = filterByLocale(all, 'en');
  return collectTags(posts).map((tag) => ({
    params: { tag: tag.toLowerCase() },
    props: { tag },
  }));
}

const { tag } = Astro.props;
const all = await loadPosts();
const localePosts = filterByLocale(all, 'en');
const posts = sortByDate(filterByTag(localePosts, tag));
const tags = collectTags(localePosts);
---
<FrontLayout
  locale="en"
  title={`Writing · ${tag} — KEHAO`}
  description={`Posts tagged ${tag}.`}
  path={`/writing/tag/${tag.toLowerCase()}`}
  current="writing"
>
  <main class="page layout-list">
    <TerminalWindow
      path="~/writing"
      meta={`${posts.length} ${t('en', 'writing.count')}`}
      footLeft="EOF"
      footItems={[`FILTER: ${tag}`]}
    >
      <TagFilter tags={tags} active={tag} basePath="/writing" locale="en" />
      {posts.length === 0 && <p class="soft">{t('en', 'writing.empty')}</p>}
      {posts.map((post) => (
        <PostRow post={post} href={localizePath('en', `/writing/${post.slug}`)} locale="en" />
      ))}
    </TerminalWindow>
  </main>
</FrontLayout>
```

- [ ] **Step 8: 建立英文文章內頁**

使用 `ReadingLayout`——這是唯一不載入 WebGL 的路徑。

`src/pages/writing/[slug].astro`：

```astro
---
import { render } from 'astro:content';
import ReadingLayout from '../../layouts/ReadingLayout.astro';
import TerminalWindow from '../../components/TerminalWindow.astro';
import { loadPosts, filterByLocale, findTranslation } from '../../lib/posts';
import { localizePath } from '../../lib/i18n/routing';
import { t } from '../../lib/i18n/ui';

export async function getStaticPaths() {
  const all = await loadPosts();
  return filterByLocale(all, 'en').map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const all = await loadPosts();
const translation = findTranslation(post, all);
const { Content } = await render(post.entry);

const dateLabel = post.date.toISOString().slice(0, 10);
const meta = `UTF-8 · EN · ${post.readingTime} ${t('en', 'post.readingTime')}`;
---
<ReadingLayout
  locale="en"
  title={`${post.title} — KEHAO`}
  description={post.description}
  path={`/writing/${post.slug}`}
  current="writing"
>
  <main class="page layout-reading">
    <TerminalWindow
      path={`~/writing/${post.slug}.md`}
      meta={meta}
      footLeft="EOF"
      footItems={[dateLabel, ...(post.tags.length ? [post.tags.join(' · ')] : [])]}
      variant="prose"
    >
      {translation ? (
        <p class="notice">
          {t('en', 'post.translationAvailable')} →
          <a href={localizePath(translation.locale, `/writing/${translation.slug}`)}>
            {translation.title}
          </a>
        </p>
      ) : (
        <p class="notice">{t('en', 'post.onlyLanguage')}</p>
      )}
      <h1>{post.title}</h1>
      <Content />
    </TerminalWindow>
  </main>
</ReadingLayout>
```

- [ ] **Step 9: 建立中文四頁**

四個檔案與英文版結構相同，只有 `locale`、路徑與文案不同。逐字建立（不要用 import 共用，Astro 頁面需要各自的 `getStaticPaths`）。

`src/pages/zh/index.astro`：

```astro
---
import FrontLayout from '../../layouts/FrontLayout.astro';
import TerminalWindow from '../../components/TerminalWindow.astro';
import Wordmark from '../../components/Wordmark.astro';
---
<FrontLayout
  locale="zh"
  title="KEHAO — happyhacking.ninja"
  description="雲端原生與 AI 基礎建設的筆記。"
  path="/"
  current="home"
>
  <Wordmark />
  <main class="page layout-front">
    <TerminalWindow
      path="guest@happyhacking:~"
      deco="SSH · 80×24"
      footLeft="LINK OK"
      footItems={['LATENCY 12ms', 'UTF-8']}
    >
      <p class="cmd">$ <b>cat ~/.profile</b></p>
      <p>
        我做雲端基礎建設，主要在 Azure 與 Kubernetes 上。<br />
        <span class="soft">近幾年花很多時間在 LLM agent 的工程化。</span>
      </p>
      <p class="soft">STATUS <span class="hot">ONLINE</span> · TAIPEI · AZURE / KUBERNETES / LLM AGENTS</p>
    </TerminalWindow>
  </main>
</FrontLayout>
```

`src/pages/zh/about.astro`：

```astro
---
import FrontLayout from '../../layouts/FrontLayout.astro';
import TerminalWindow from '../../components/TerminalWindow.astro';
---
<FrontLayout
  locale="zh"
  title="關於 — KEHAO"
  description="我是誰，以及我在做什麼。"
  path="/about"
  current="about"
>
  <main class="page layout-reading">
    <TerminalWindow path="~/about.md" deco="READ-ONLY" footLeft="LINK OK" footItems={['GITHUB · LINKEDIN · RSS']} variant="prose">
      <h1>關於</h1>
      <p>
        我做雲端基礎建設，主要在 Azure 與 Kubernetes 上。近幾年花很多時間在 LLM agent
        的工程化——不是 demo，是要能上線、能被稽核、出事能查的那種。
      </p>
      <p>
        這個網站是我放筆記的地方。技術文章多半是中文，因為那是我思考的語言；少數會有英文版。
      </p>
    </TerminalWindow>
  </main>
</FrontLayout>
```

`src/pages/zh/writing/index.astro`：與 `src/pages/writing/index.astro` 相同，但把每一處 `'en'` 換成 `'zh'`、`basePath` 與 `localizePath` 的路徑改為 `/zh/writing`、import 路徑多一層 `../`：

```astro
---
import FrontLayout from '../../../layouts/FrontLayout.astro';
import TerminalWindow from '../../../components/TerminalWindow.astro';
import PostRow from '../../../components/PostRow.astro';
import TagFilter from '../../../components/TagFilter.astro';
import { loadPosts, sortByDate, filterByLocale, collectTags } from '../../../lib/posts';
import { localizePath } from '../../../lib/i18n/routing';
import { t } from '../../../lib/i18n/ui';

const all = await loadPosts();
const posts = sortByDate(filterByLocale(all, 'zh'));
const tags = collectTags(posts);
---
<FrontLayout
  locale="zh"
  title="文章 — KEHAO"
  description="雲端原生、Azure 與 LLM agent 的筆記。"
  path="/writing"
  current="writing"
>
  <main class="page layout-list">
    <TerminalWindow
      path="~/writing"
      meta={`${posts.length} ${t('zh', 'writing.count')}`}
      footLeft="EOF"
      footItems={['NO FILTER']}
    >
      <TagFilter tags={tags} active={null} basePath="/zh/writing" locale="zh" />
      {posts.length === 0 && <p class="soft">{t('zh', 'writing.empty')}</p>}
      {posts.map((post) => (
        <PostRow post={post} href={localizePath('zh', `/writing/${post.slug}`)} locale="zh" />
      ))}
    </TerminalWindow>
  </main>
</FrontLayout>
```

`src/pages/zh/writing/tag/[tag].astro`：把英文版的 `src/pages/writing/tag/[tag].astro` 複製過來，把所有 `'en'` 改成 `'zh'`、`basePath="/writing"` 改成 `basePath="/zh/writing"`、`path={...}` 改成 `/writing/tag/...`（BaseLayout 會自行加上前綴）、import 路徑改為 `../../../../`。

`src/pages/zh/writing/[slug].astro`：把英文版的 `src/pages/writing/[slug].astro` 複製過來，做這些替換：`filterByLocale(all, 'en')` → `'zh'`、`locale="en"` → `locale="zh"`、`t('en', ...)` → `t('zh', ...)`、meta 字串的 `UTF-8 · EN` → `UTF-8 · ZH-HANT`、import 路徑改為 `../../../`。

- [ ] **Step 10: 建立 404 頁**

`src/pages/404.astro`：

```astro
---
import ReadingLayout from '../layouts/ReadingLayout.astro';
import TerminalWindow from '../components/TerminalWindow.astro';
import { t } from '../lib/i18n/ui';
---
<ReadingLayout
  locale="en"
  title="404 — KEHAO"
  description="Not found."
  path="/404"
  current="home"
>
  <main class="page layout-reading">
    <TerminalWindow path="~/404" deco="EXIT 1" footLeft="ERROR" footItems={['HTTP 404']} variant="prose">
      <h1>{t('en', 'error.404.title')}</h1>
      <p>{t('en', 'error.404.body')}</p>
      <p><a href="/">{t('en', 'error.404.back')}</a></p>
    </TerminalWindow>
  </main>
</ReadingLayout>
```

- [ ] **Step 11: 建置並人工驗證**

Run: `npm run build`
Expected: 成功，且 `dist/` 內出現 `index.html`、`about/index.html`、`writing/index.html`、`writing/approval-orchestrator/index.html`、`writing/tag/llm/index.html`、`zh/index.html`、`zh/writing/aks-lun-exhaustion/index.html`、`404.html`。

Run: `npm run preview`，逐一開啟上列路徑。

Expected: 每頁的文字都在終端機視窗內、可讀；文章頁的標題列顯示語言與閱讀時間；點標籤會篩選；`/zh/writing/aks-lun-exhaustion` 顯示「本篇僅有原文版本」提示。

- [ ] **Step 12: 提交**

```bash
git add src/layouts/ src/components/ src/pages/ src/styles/base.css
git commit -m "feat: 雙語頁面、版面與標籤篩選路由"
```

---

## Task 7: RSS 與 sitemap

**Files:**
- Create: `src/pages/rss.xml.ts`
- Create: `src/pages/zh/rss.xml.ts`
- Modify: `astro.config.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 3 的 `loadPosts` / `sortByDate` / `filterByLocale`、Task 4 的 `localizePath`
- Produces: `/rss.xml`、`/zh/rss.xml`、`/sitemap-index.xml`

- [ ] **Step 1: 安裝套件**

```bash
npm install @astrojs/rss @astrojs/sitemap
```

- [ ] **Step 2: 掛上 sitemap**

修改 `astro.config.mjs`：

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://happyhacking.ninja',
  output: 'static',
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', zh: 'zh-Hant' },
      },
    }),
  ],
});
```

- [ ] **Step 3: 建立英文 RSS**

`src/pages/rss.xml.ts`：

```ts
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { loadPosts, sortByDate, filterByLocale } from '../lib/posts';
import { localizePath } from '../lib/i18n/routing';

export async function GET(context: APIContext) {
  const posts = sortByDate(filterByLocale(await loadPosts(), 'en'));
  return rss({
    title: 'KEHAO — happyhacking.ninja',
    description: 'Cloud-native and AI infrastructure notes.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.date,
      link: localizePath('en', `/writing/${post.slug}`),
      categories: post.tags,
    })),
  });
}
```

- [ ] **Step 4: 建立中文 RSS**

`src/pages/zh/rss.xml.ts`：

```ts
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { loadPosts, sortByDate, filterByLocale } from '../../lib/posts';
import { localizePath } from '../../lib/i18n/routing';

export async function GET(context: APIContext) {
  const posts = sortByDate(filterByLocale(await loadPosts(), 'zh'));
  return rss({
    title: 'KEHAO — happyhacking.ninja',
    description: '雲端原生與 AI 基礎建設的筆記。',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.date,
      link: localizePath('zh', `/writing/${post.slug}`),
      categories: post.tags,
    })),
  });
}
```

- [ ] **Step 5: 建置並驗證輸出**

Run: `npm run build`
Expected: 成功。

Run: `cat dist/rss.xml | head -20`
Expected: 合法的 RSS 2.0 XML，`<item>` 中含英文文章、`<link>` 為 `https://happyhacking.ninja/writing/approval-orchestrator/`。

Run: `cat dist/zh/rss.xml | head -20`
Expected: 含中文文章，`<link>` 帶 `/zh/` 前綴。

Run: `test -f dist/sitemap-index.xml && echo OK`
Expected: `OK`

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json astro.config.mjs src/pages/rss.xml.ts src/pages/zh/rss.xml.ts
git commit -m "feat: 雙語 RSS 與 sitemap"
```

---

## Task 8: 入侵序列時間軸（純函式）

**Files:**
- Create: `src/lib/sequence/timeline.ts`
- Test: `src/lib/sequence/timeline.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `type Phase = 'boot' | 'scan' | 'breach' | 'granted' | 'settle' | 'idle'`
  - `interface Frame { phase: Phase; grain: number; ring: number; ringSpeed: number; glitch: number; wordmark: number; granted: number; scene: number; chrome: number; flash: number }`
  - `const TIMELINE: { boot: 900; scan: 1500; breach: 1820; granted: 2500; settle: 3050 }`
  - `const IDLE_FRAME: Frame`
  - `frameAt(ms: number): Frame`
  - `bootLinesAt(ms: number): string[]`

- [ ] **Step 1: 寫失敗的測試**

動畫最難測的是時序，而時序不需要瀏覽器就能測。

`src/lib/sequence/timeline.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { frameAt, bootLinesAt, TIMELINE, IDLE_FRAME } from './timeline';

describe('TIMELINE 常數', () => {
  it('符合設計文件的區間', () => {
    expect(TIMELINE).toEqual({ boot: 900, scan: 1500, breach: 1820, granted: 2500, settle: 3050 });
  });
});

describe('frameAt 階段判定', () => {
  it.each([
    [0, 'boot'],
    [899, 'boot'],
    [900, 'scan'],
    [1499, 'scan'],
    [1500, 'breach'],
    [1620, 'breach'],
    [1819, 'breach'],
    [1820, 'granted'],
    [2499, 'granted'],
    [2500, 'settle'],
    [3049, 'settle'],
    [3050, 'idle'],
    [99999, 'idle'],
  ])('%ims 屬於 %s', (ms, phase) => {
    expect(frameAt(ms).phase).toBe(phase);
  });

  it('負數視為 0', () => {
    expect(frameAt(-500).phase).toBe('boot');
  });
});

describe('frameAt 參數', () => {
  it('BREACH 期間 glitch 為滿值', () => {
    expect(frameAt(1620).glitch).toBe(1);
  });

  it('BOOT 期間看不到字標與 ACCESS GRANTED', () => {
    const frame = frameAt(400);
    expect(frame.wordmark).toBe(0);
    expect(frame.granted).toBe(0);
  });

  it('GRANTED 期間 ACCESS GRANTED 可見，字標仍隱藏', () => {
    const frame = frameAt(2000);
    expect(frame.granted).toBeGreaterThan(0);
    expect(frame.wordmark).toBe(0);
  });

  it('SETTLE 期間字標由 0 漸增到 1', () => {
    expect(frameAt(2500).wordmark).toBeCloseTo(0, 2);
    expect(frameAt(3049).wordmark).toBeGreaterThan(0.99);
  });

  it('序列結束後等同 IDLE_FRAME', () => {
    expect(frameAt(4000)).toEqual(IDLE_FRAME);
  });

  it('IDLE 使用規格的固定值', () => {
    expect(IDLE_FRAME.grain).toBe(0.02);
    expect(IDLE_FRAME.ring).toBe(0.26);
    expect(IDLE_FRAME.ringSpeed).toBe(1.4);
    expect(IDLE_FRAME.chrome).toBe(1);
    expect(IDLE_FRAME.wordmark).toBe(1);
  });

  it('所有輸出值都在 0..1 之間（ringSpeed 除外）', () => {
    for (const ms of [0, 450, 900, 1200, 1500, 1700, 1820, 2100, 2500, 2800, 3050, 5000]) {
      const frame = frameAt(ms);
      for (const key of ['grain', 'ring', 'glitch', 'wordmark', 'granted', 'scene', 'chrome', 'flash'] as const) {
        expect(frame[key], `${key} @ ${ms}ms`).toBeGreaterThanOrEqual(0);
        expect(frame[key], `${key} @ ${ms}ms`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('導覽列在 BREACH 之前都不出現', () => {
    expect(frameAt(1700).chrome).toBe(0);
  });
});

describe('bootLinesAt', () => {
  it('一開始沒有任何行', () => {
    expect(bootLinesAt(0)).toEqual([]);
  });

  it('隨時間逐行出現', () => {
    expect(bootLinesAt(300).length).toBe(1);
    expect(bootLinesAt(900).length).toBeGreaterThan(1);
  });

  it('全部打完後共五行且無游標', () => {
    const lines = bootLinesAt(2000);
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe('> TARGET  happyhacking.ninja');
    expect(lines.join('')).not.toContain('_');
  });

  it('打字中的那一行帶游標', () => {
    expect(bootLinesAt(100).at(-1)).toMatch(/_$/);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/lib/sequence/timeline.test.ts`
Expected: FAIL，`Failed to resolve import "./timeline"`。

- [ ] **Step 3: 實作**

`src/lib/sequence/timeline.ts`：

```ts
export type Phase = 'boot' | 'scan' | 'breach' | 'granted' | 'settle' | 'idle';

export interface Frame {
  phase: Phase;
  /** 抖色顆粒（隨機亮度擾動），不是抖色本身的密度 */
  grain: number;
  /** 脈衝環強度 */
  ring: number;
  /** 脈衝環擴散速度（不受 0..1 限制） */
  ringSpeed: number;
  /** datamosh 故障強度 */
  glitch: number;
  /** 字標不透明度 */
  wordmark: number;
  /** ACCESS GRANTED 字板不透明度 */
  granted: number;
  /** 3D 場景整體不透明度 */
  scene: number;
  /** 導覽列與頁面內容不透明度 */
  chrome: number;
  /** 全螢幕白閃 */
  flash: number;
}

export const TIMELINE = {
  boot: 900,
  scan: 1500,
  breach: 1820,
  granted: 2500,
  settle: 3050,
} as const;

export const IDLE_FRAME: Frame = {
  phase: 'idle',
  grain: 0.02,
  ring: 0.26,
  ringSpeed: 1.4,
  glitch: 0.02,
  wordmark: 1,
  granted: 0,
  scene: 1,
  chrome: 1,
  flash: 0,
};

const BOOT_LINES: Array<[string, number]> = [
  ['> ESTABLISHING LINK', 260],
  ['> HANDSHAKE 0x4F2A ······ OK', 240],
  ['> BYPASSING EDGE/ctOS ···· OK', 240],
  ['> PRIVILEGE  ninja', 200],
  ['> TARGET  happyhacking.ninja', 200],
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * 純函式：給定序列開始後的毫秒數，回傳該格所有可視參數。
 * 沒有 DOM、沒有 WebGL、沒有隨機性——完全可測。
 */
export function frameAt(input: number): Frame {
  const ms = Math.max(0, input);

  if (ms < TIMELINE.boot) {
    const k = ms / TIMELINE.boot;
    return {
      phase: 'boot',
      grain: 0.55 * (1 - k * 0.35),
      ring: 0.1 + k * 0.15,
      ringSpeed: 0.8,
      glitch: 0.05,
      wordmark: 0,
      granted: 0,
      scene: k * 0.25,
      chrome: 0,
      flash: 0,
    };
  }

  if (ms < TIMELINE.scan) {
    const k = (ms - TIMELINE.boot) / (TIMELINE.scan - TIMELINE.boot);
    return {
      phase: 'scan',
      grain: 0.35 * (1 - k),
      ring: 0.25 + k * 0.55,
      ringSpeed: 0.8 + k * 6,
      glitch: 0.05 + k * 0.25,
      wordmark: 0,
      granted: 0,
      scene: 0.25 + k * 0.75,
      chrome: 0,
      flash: 0,
    };
  }

  if (ms < TIMELINE.breach) {
    const k = (ms - TIMELINE.scan) / (TIMELINE.breach - TIMELINE.scan);
    return {
      phase: 'breach',
      grain: 0.15 + k * 0.3,
      ring: 0.8 * (1 - k * 0.6),
      ringSpeed: 7,
      glitch: 1,
      wordmark: 0,
      granted: 0,
      scene: 1,
      chrome: 0,
      flash: clamp01(k ** 3 * 0.6),
    };
  }

  if (ms < TIMELINE.granted) {
    const k = (ms - TIMELINE.breach) / (TIMELINE.granted - TIMELINE.breach);
    // 尾段淡出，讓字標接手
    const fadeOut = k > 0.78 ? 1 - (k - 0.78) / 0.22 : 1;
    return {
      phase: 'granted',
      grain: 0.2 * (1 - k),
      ring: 0.3 + (1 - k) ** 2 * 0.4,
      ringSpeed: 2.4,
      glitch: Math.max(0.08, 0.75 * (1 - k) ** 1.6),
      wordmark: 0,
      granted: clamp01(Math.min(1, k * 4) * fadeOut),
      scene: 1,
      chrome: 0,
      flash: clamp01(0.6 - k * 2.6),
    };
  }

  if (ms < TIMELINE.settle) {
    const k = (ms - TIMELINE.granted) / (TIMELINE.settle - TIMELINE.granted);
    return {
      phase: 'settle',
      grain: 0.1 * (1 - k) + IDLE_FRAME.grain,
      ring: IDLE_FRAME.ring,
      ringSpeed: IDLE_FRAME.ringSpeed,
      glitch: 0.25 * (1 - k) + IDLE_FRAME.glitch,
      wordmark: clamp01(k),
      granted: 0,
      scene: 1,
      chrome: clamp01((k - 0.35) / 0.65),
      flash: 0,
    };
  }

  return { ...IDLE_FRAME };
}

/**
 * 開場終端機的逐字打字狀態。仍在打的那一行結尾帶底線游標。
 */
export function bootLinesAt(input: number): string[] {
  const ms = Math.max(0, input);
  const out: string[] = [];
  let elapsed = 0;

  for (const [text, duration] of BOOT_LINES) {
    if (ms <= elapsed) break;
    const k = Math.min(1, (ms - elapsed) / duration);
    const visible = text.slice(0, Math.ceil(text.length * k));
    out.push(k < 1 ? `${visible}_` : text);
    elapsed += duration;
  }

  return out;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/lib/sequence/timeline.test.ts`
Expected: PASS，全綠。

- [ ] **Step 5: 執行全部測試**

Run: `npm test`
Expected: PASS，Task 1–4 與本 task 的測試全綠。

- [ ] **Step 6: 提交**

```bash
git add src/lib/sequence/
git commit -m "feat: 入侵序列時間軸純函式與測試"
```

---

## Task 9: 抖色渲染器

**Files:**
- Create: `src/lib/dither/shader.ts`
- Create: `src/lib/dither/wordmark.ts`
- Create: `src/lib/dither/scene.ts`
- Create: `src/lib/dither/index.ts`
- Test: `src/lib/dither/shader.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `Frame` from Task 8
- Produces:
  - `createDither(canvas: HTMLCanvasElement, options?: DitherOptions): DitherHandle`
  - `interface DitherHandle { setFrame(frame: Frame): void; burst(): void; setReading(reading: boolean): void; destroy(): void }`
  - `interface DitherOptions { ground?: string; ink?: string; accent?: string }`
  - `FRAGMENT_SHADER`、`VERTEX_SHADER`、`UNIFORM_NAMES`

- [ ] **Step 1: 安裝 three.js**

```bash
npm install three
npm install -D @types/three
```

- [ ] **Step 2: 寫失敗的 shader 測試**

無法在 Node 裡跑 WebGL，但可以驗證 shader 宣告的 uniform 與程式碼傳入的名單一致——這是實務上最常見的錯誤來源（打錯一個字，畫面靜默地不動）。

`src/lib/dither/shader.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { FRAGMENT_SHADER, VERTEX_SHADER, UNIFORM_NAMES } from './shader';

function declaredUniforms(source: string): string[] {
  return [...source.matchAll(/uniform\s+\w+\s+([\w,\s]+);/g)]
    .flatMap((match) => match[1].split(',').map((name) => name.trim()))
    .filter(Boolean)
    .sort();
}

describe('抖色 shader', () => {
  it('fragment shader 宣告的 uniform 與 UNIFORM_NAMES 完全一致', () => {
    expect(declaredUniforms(FRAGMENT_SHADER)).toEqual([...UNIFORM_NAMES].sort());
  });

  it('vertex shader 傳遞 vUv', () => {
    expect(VERTEX_SHADER).toContain('varying vec2 vUv');
    expect(FRAGMENT_SHADER).toContain('varying vec2 vUv');
  });

  it('使用 Bayer 4×4 而非其他抖動圖樣', () => {
    expect(FRAGMENT_SHADER).toContain('bayer4');
  });

  it('像素大小固定為 2', () => {
    expect(FRAGMENT_SHADER).toMatch(/uRes\s*\/\s*2\.0/);
  });

  it('故障發生在抖色量化之前', () => {
    const glitchIndex = FRAGMENT_SHADER.indexOf('shift');
    const quantiseIndex = FRAGMENT_SHADER.indexOf('bayer4(cell)');
    expect(glitchIndex).toBeGreaterThan(-1);
    expect(quantiseIndex).toBeGreaterThan(glitchIndex);
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

Run: `npx vitest run src/lib/dither/shader.test.ts`
Expected: FAIL，`Failed to resolve import "./shader"`。

- [ ] **Step 4: 實作 shader.ts**

`src/lib/dither/shader.ts`：

```ts
export const UNIFORM_NAMES = [
  'tDiffuse', 'uTime', 'uRes', 'uAmt', 'uGrain', 'uRing', 'uRingSpeed',
  'uInk', 'uGround', 'uAccent',
] as const;

export const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * 管線順序固定：glitch → 降取樣 → 抖色量化。
 * 故障必須發生在量化之前，否則會出現「乾淨的故障疊在粗糙畫面上」的破綻。
 * 強調色透過紅色通道遮罩傳遞：場景中以紅色繪製的物件會被上強調色，其餘維持 ink。
 */
export const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uAmt;
  uniform float uGrain;
  uniform float uRing;
  uniform float uRingSpeed;
  uniform vec3 uInk;
  uniform vec3 uGround;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) {
    return bayer2(0.5 * a) * 0.25 + bayer2(a);
  }

  void main() {
    // pixel size = 2
    vec2 res  = max(uRes / 2.0, vec2(2.0));
    vec2 cell = floor(vUv * res);
    vec2 uvC  = (cell + 0.5) / res;

    // ---- datamosh：橫向區塊位移 ----
    float band  = floor(uvC.y * 16.0);
    float seed  = hash(vec2(band, floor(uTime * 13.0)));
    float shift = (seed - 0.5) * 0.32 * uAmt * step(0.56, seed);
    vec2  uvG   = vec2(fract(uvC.x + shift), uvC.y);

    // ---- 降取樣：每格 5 tap 盒狀平均，讓細線框不消失 ----
    vec2 half = 0.5 / res;
    vec3 c  = texture2D(tDiffuse, uvG).rgb;
    c += texture2D(tDiffuse, uvG + vec2( half.x,  half.y)).rgb;
    c += texture2D(tDiffuse, uvG + vec2(-half.x,  half.y)).rgb;
    c += texture2D(tDiffuse, uvG + vec2( half.x, -half.y)).rgb;
    c += texture2D(tDiffuse, uvG + vec2(-half.x, -half.y)).rgb;
    c /= 5.0;

    float accentMask = smoothstep(0.06, 0.30, c.r - max(c.g, c.b));
    float lum = max(max(c.r, c.g), c.b);

    // ---- 脈衝環：只作用於暗部 ----
    vec2 p = (uvC - vec2(0.5)) * vec2(uRes.x / uRes.y, 1.0);
    float d = length(p);
    float rings = 0.5 + 0.5 * sin(d * 26.0 - uTime * uRingSpeed);
    rings = pow(rings, 3.0) * uRing
          * smoothstep(0.05, 0.42, d) * smoothstep(1.15, 0.45, d);
    lum = lum + rings * (1.0 - lum);

    // ---- 顆粒 ----
    lum += (hash(cell + floor(uTime * 30.0)) - 0.5) * uGrain;

    // ---- 1-bit 量化 ----
    float bit = step(bayer4(cell), lum);

    // 故障期間偶爾整條反轉
    float invert = step(0.94, hash(vec2(floor(uTime * 9.0), band))) * step(0.5, uAmt);
    bit = mix(bit, 1.0 - bit, invert);

    gl_FragColor = vec4(mix(uGround, mix(uInk, uAccent, accentMask), bit), 1.0);
  }
`;
```

- [ ] **Step 5: 執行測試確認通過**

Run: `npx vitest run src/lib/dither/shader.test.ts`
Expected: PASS，5 個測試全綠。

- [ ] **Step 6: 實作字標材質產生器**

`src/lib/dither/wordmark.ts`：

```ts
import * as THREE from 'three';

interface TextPlaneOptions {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

function textPlane({ width, height, canvasWidth, canvasHeight, draw }: TextPlaneOptions): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  draw(ctx, canvasWidth, canvasHeight);

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0,
    }),
  );
}

/** 白色繪製 → post shader 視為 ink */
export function createWordmark(): THREE.Mesh {
  return textPlane({
    width: 9.0, height: 2.44, canvasWidth: 1400, canvasHeight: 380,
    draw: (ctx, w) => {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 200px ui-monospace, Menlo, monospace';
      ctx.fillText('KEHAO', w / 2, 150);
      ctx.font = '600 46px ui-monospace, Menlo, monospace';
      ctx.fillText('/ /  H A P P Y   H A C K I N G', w / 2, 300);
    },
  });
}

/** 紅色繪製 → post shader 的 accentMask 判定為強調色。全片唯一彩色時刻。 */
export function createGrantedPlate(): THREE.Mesh {
  return textPlane({
    width: 9.4, height: 2.4, canvasWidth: 1500, canvasHeight: 380,
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#f00';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 104px ui-monospace, Menlo, monospace';
      ctx.fillText('ACCESS  GRANTED', w / 2, h / 2 - 26);
      ctx.font = '600 34px ui-monospace, Menlo, monospace';
      ctx.fillText('/ /  H A P P Y   H A C K I N G', w / 2, h / 2 + 66);
    },
  });
}
```

- [ ] **Step 7: 實作場景組裝**

`src/lib/dither/scene.ts`：

```ts
import * as THREE from 'three';
import { createWordmark, createGrantedPlate } from './wordmark';

export interface DitherScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  wordmark: THREE.Mesh;
  granted: THREE.Mesh;
  shell: THREE.Mesh;
  dispose(): void;
}

export function createScene(): DitherScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 240);
  camera.position.set(0, 1.3, 8.6);

  const wordmark = createWordmark();
  wordmark.position.set(0, 1.3, 2.6);
  scene.add(wordmark);

  const granted = createGrantedPlate();
  granted.position.set(0, 1.3, 3.4);
  scene.add(granted);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.4, 2),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.7, wireframe: true, transparent: true, opacity: 0,
    }),
  );
  shell.position.y = 1.3;
  scene.add(shell);

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

  return {
    scene, camera, wordmark, granted, shell,
    dispose() {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material as THREE.Material & { map?: THREE.Texture };
          material.map?.dispose();
          material.dispose();
        }
      });
    },
  };
}
```

- [ ] **Step 8: 實作公開 API**

`src/lib/dither/index.ts`：

```ts
import * as THREE from 'three';
import type { Frame } from '../sequence/timeline';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';
import { createScene } from './scene';

export interface DitherOptions {
  ground?: string;
  ink?: string;
  accent?: string;
}

export interface DitherHandle {
  /** 每一幀餵進來的可視參數 */
  setFrame(frame: Frame): void;
  /** 觸發一次換頁用的 datamosh 爆發 */
  burst(): void;
  /** 閱讀模式：完全停止算繪，畫面留在純底色 */
  setReading(reading: boolean): void;
  destroy(): void;
}

const NAV_BURST_MS = 420;
const FLICKER_INTERVAL_MS = 4200;

function toVector(hex: string): THREE.Vector3 {
  const value = hex.replace('#', '');
  return new THREE.Vector3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

/**
 * 這個模組不知道網站的存在。給它一個 canvas 和一組數值，它畫出畫面。
 */
export function createDither(
  canvas: HTMLCanvasElement,
  options: DitherOptions = {},
): DitherHandle {
  const ground = options.ground ?? '#22212C';
  const ink = options.ink ?? '#F8F8F2';
  const accent = options.accent ?? '#80FFEA';

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(dpr);

  const world = createScene();
  const target = new THREE.WebGLRenderTarget(1, 1);

  const uniforms = {
    tDiffuse: { value: target.texture },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAmt: { value: 0 },
    uGrain: { value: 0 },
    uRing: { value: 0 },
    uRingSpeed: { value: 1.4 },
    uInk: { value: toVector(ink) },
    uGround: { value: toVector(ground) },
    uAccent: { value: toVector(accent) },
  };

  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
  postScene.add(postQuad);

  let frame: Frame | null = null;
  let reading = false;
  let running = true;
  let rafId = 0;

  let burstStart = -Infinity;
  let nextFlickerAt = performance.now() + FLICKER_INTERVAL_MS;
  let flickerUntil = 0;

  const start = performance.now();

  function burstAmount(now: number): number {
    const e = (now - burstStart) / NAV_BURST_MS;
    if (e < 0 || e >= 1) return 0;
    return e < 0.1 ? e / 0.1 : e < 0.55 ? 1 : 1 - (e - 0.55) / 0.45;
  }

  /** 低頻閃動：偶爾抽一下，不是持續抖 */
  function flickerAmount(now: number): number {
    if (now > nextFlickerAt) {
      flickerUntil = now + 70 + Math.random() * 90;
      nextFlickerAt = now + FLICKER_INTERVAL_MS * (0.6 + Math.random() * 0.8);
    }
    return now < flickerUntil ? 0.35 + Math.random() * 0.45 : 0;
  }

  function resize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    if (canvas.width !== Math.floor(width * dpr)) {
      renderer.setSize(width, height, false);
      world.camera.aspect = width / height;
      world.camera.updateProjectionMatrix();
    }
    target.setSize(Math.floor(width * dpr), Math.floor(height * dpr));
    uniforms.uRes.value.set(width * dpr, height * dpr);
  }

  function tick(): void {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    const now = performance.now();
    const burst = burstAmount(now);

    // 閱讀模式：沒有換頁故障要畫時，完全不算繪
    if (reading && burst === 0) return;
    if (!frame) return;

    resize();

    const seconds = (now - start) / 1000;
    const flicker = reading ? 0 : flickerAmount(now);

    uniforms.uTime.value = seconds;
    uniforms.uGrain.value = reading ? 0 : frame.grain;
    uniforms.uRing.value = reading ? 0 : frame.ring;
    uniforms.uRingSpeed.value = frame.ringSpeed;
    uniforms.uAmt.value = Math.max(reading ? 0 : frame.glitch, burst, flicker * 0.5);

    const wordmarkMaterial = world.wordmark.material as THREE.MeshBasicMaterial;
    const grantedMaterial = world.granted.material as THREE.MeshBasicMaterial;
    const shellMaterial = world.shell.material as THREE.MeshStandardMaterial;

    const flickerDip = flicker > 0 ? 0.25 + Math.random() * 0.75 : 1;
    wordmarkMaterial.opacity = reading ? 0 : frame.wordmark * flickerDip;
    grantedMaterial.opacity = reading ? 0 : frame.granted;
    shellMaterial.opacity = reading ? 0 : frame.scene * 0.5;

    world.shell.rotation.x = seconds * 0.09;
    world.shell.rotation.y = seconds * 0.14;
    world.camera.position.x = Math.sin(seconds * 0.22) * 0.9;
    world.camera.position.y = 1.6 + Math.sin(seconds * 0.3) * 0.2;
    world.camera.lookAt(0, 1.3, 0);

    renderer.setRenderTarget(target);
    renderer.render(world.scene, world.camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  }

  rafId = requestAnimationFrame(tick);

  return {
    setFrame(next) { frame = next; },
    burst() { burstStart = performance.now(); },
    setReading(next) { reading = next; },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      world.dispose();
      postQuad.geometry.dispose();
      postMaterial.dispose();
      target.dispose();
      renderer.dispose();
    },
  };
}
```

- [ ] **Step 9: 確認型別與建置**

Run: `npm run check`
Expected: 0 errors。

Run: `npm run build`
Expected: 成功。此時尚無任何頁面 import 這個模組，所以 `dist/` 內**不應該**出現 three.js。

Run: `grep -rl "three" dist/_astro/ 2>/dev/null | head`
Expected: 無輸出。

- [ ] **Step 10: 提交**

```bash
git add package.json package-lock.json src/lib/dither/
git commit -m "feat: 1-bit 抖色渲染器與 shader 一致性測試"
```

---

## Task 10: 首頁序列啟動與退化路徑

**Files:**
- Create: `src/components/HeroSequence.astro`
- Create: `src/components/SiteBackdrop.astro`
- Create: `src/env.d.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`、`src/pages/zh/index.astro`
- Modify: `src/pages/about.astro`、`src/pages/zh/about.astro`
- Modify: `src/pages/writing/index.astro`、`src/pages/zh/writing/index.astro`
- Modify: `src/styles/base.css`

**Interfaces:**
- Consumes: `frameAt` / `bootLinesAt` / `IDLE_FRAME` from Task 8、`createDither` from Task 9
- Produces:
  - `HeroSequence.astro` props：`{ locale: Locale }`（只用於首頁）
  - `SiteBackdrop.astro`：無 props（用於 About 與索引頁）
  - 全域旗標 `window.__dither: DitherHandle | undefined`（Task 11 的換頁故障需要）
  - `<html>` 上的 class：`seq-pending`（序列即將播放，由 head inline script 設定）、`gl-active`（WebGL 已啟動）、`seq-done`（序列已結束或不播放）

- [ ] **Step 1: 建立 HeroSequence 元件**

三件事必須做對：**只在首頁**、**每 session 一次**、**無 WebGL 時不下載 three.js**（用動態 import 達成）。

`src/components/HeroSequence.astro`：

```astro
---
import type { Locale } from '../lib/posts';
import { t } from '../lib/i18n/ui';

interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
---

<pre id="boot-log" aria-hidden="true"></pre>
<p id="skip-hint" aria-hidden="true">{t(locale, 'skip.sequence')}</p>

<script>
  import { frameAt, IDLE_FRAME, TIMELINE, bootLinesAt } from '../lib/sequence/timeline';
  import type { DitherHandle } from '../lib/dither';

  const SESSION_KEY = 'hh.sequence.played';

  const canvas = document.getElementById('dither-canvas') as HTMLCanvasElement | null;
  const bootLog = document.getElementById('boot-log');
  const skipHint = document.getElementById('skip-hint');

  function supportsWebGL(probe: HTMLCanvasElement): boolean {
    try {
      return Boolean(
        probe.getContext('webgl2') ?? probe.getContext('webgl'),
      );
    } catch {
      return false;
    }
  }

  async function boot(): Promise<void> {
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 無 WebGL：不下載 three.js，DOM 字標留在畫面上，網站照常運作
    if (!supportsWebGL(document.createElement('canvas'))) {
      document.documentElement.classList.remove('seq-pending');
      bootLog?.remove();
      skipHint?.remove();
      return;
    }

    // 動態 import：這一行是「無 WebGL 就不付下載成本」的實作
    const { createDither } = await import('../lib/dither');

    const styles = getComputedStyle(document.documentElement);
    const handle: DitherHandle = createDither(canvas, {
      ground: styles.getPropertyValue('--ground').trim(),
      ink: styles.getPropertyValue('--ink').trim(),
      accent: styles.getPropertyValue('--accent').trim(),
    });
    window.__dither = handle;
    document.documentElement.classList.add('gl-active');

    const alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === '1';
    const skipSequence = reduced || alreadyPlayed;

    if (skipSequence) {
      handle.setFrame(IDLE_FRAME);
      document.documentElement.classList.remove('seq-pending');
      document.documentElement.classList.add('seq-done');
      bootLog?.remove();
      skipHint?.remove();
      return;
    }

    let startedAt = performance.now();
    let finished = false;

    function skip(): void {
      if (finished) return;
      startedAt = performance.now() - TIMELINE.settle;
    }
    document.addEventListener('keydown', skip, { once: false });
    document.addEventListener('pointerdown', skip, { once: false });

    function step(): void {
      const ms = performance.now() - startedAt;
      const frame = frameAt(ms);
      handle.setFrame(frame);

      if (bootLog) {
        bootLog.textContent = frame.phase === 'boot' || frame.phase === 'scan'
          ? bootLinesAt(ms).join('\n')
          : '';
        bootLog.style.opacity = frame.phase === 'breach'
          ? String(1 - (ms - TIMELINE.scan) / (TIMELINE.breach - TIMELINE.scan))
          : frame.phase === 'boot' || frame.phase === 'scan' ? '1' : '0';
      }
      document.documentElement.style.setProperty('--seq-chrome', String(frame.chrome));
      document.documentElement.style.setProperty('--seq-flash', String(frame.flash));

      // SETTLE 一開始就把 #fx 沉回背景：內容硬切露出
      if (frame.chrome > 0) {
        document.documentElement.classList.remove('seq-pending');
      }

      if (frame.phase === 'idle') {
        finished = true;
        sessionStorage.setItem(SESSION_KEY, '1');
        document.documentElement.classList.add('seq-done');
        bootLog?.remove();
        skipHint?.remove();
        return;
      }
      requestAnimationFrame(step);
    }

    document.documentElement.style.setProperty('--seq-chrome', '0');
    requestAnimationFrame(step);
  }

  void boot();
</script>
```

- [ ] **Step 2: 在 BaseLayout 加入決定是否播放的同步 inline script**

這段必須是 `is:inline` 且位於 `<head>`，在首次繪製之前執行——否則會出現「內容出現 → 被蓋住 → 再出現」的閃爍。

修改 `src/layouts/BaseLayout.astro`，在 `<slot name="head" />` 之前加入：

```astro
{front && (
  <script is:inline>
    (function () {
      try {
        var played = sessionStorage.getItem('hh.sequence.played') === '1';
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!played && !reduced) {
          document.documentElement.classList.add('seq-pending');
        }
      } catch (e) {
        /* sessionStorage 可能被封鎖；封鎖時不播序列即可 */
      }
    })();
  </script>
)}
```

- [ ] **Step 3: 補上型別宣告**

建立 `src/env.d.ts`（若已存在則附加）：

```ts
/// <reference types="astro/client" />
import type { DitherHandle } from './lib/dither';

declare global {
  interface Window {
    __dither?: DitherHandle;
  }
}

export {};
```

- [ ] **Step 4: 附加序列相關樣式**

附加到 `src/styles/base.css` 末尾：

```css
/* ============================ 入侵序列 ============================ */
#boot-log {
  position: fixed;
  left: 2.6rem;
  top: 2.2rem;
  z-index: 5;
  margin: 0;
  font: 0.72rem/2.05 var(--font-mono);
  letter-spacing: 0.09em;
  color: var(--accent);
  white-space: pre;
  pointer-events: none;
}
#skip-hint {
  position: fixed;
  right: 2.6rem;
  bottom: 2.1rem;
  z-index: 5;
  margin: 0;
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  color: var(--dim);
  pointer-events: none;
}

/* 序列進行中「不藏內容，用不透明的 canvas 蓋住它」。
   內容照常繪製，所以 LCP 正常計時；視覺上被 #fx 蓋著。
   序列結束時 #fx 沉回背景，內容硬切露出——比淡入更貼合這個美學。 */
html { --seq-chrome: 1; --seq-flash: 0; }

/* seq-pending 由 <head> 的同步 inline script 決定，先於首次繪製，所以不會閃 */
html.seq-pending #fx {
  z-index: 8;
  /* three.js 還沒載入完時先用底色擋著，避免透出下方內容 */
  background: var(--ground);
}

/* 導覽列（不是 LCP 元素）仍然依 --seq-chrome 淡入 */
html.seq-pending .site-nav { opacity: var(--seq-chrome); }

/* WebGL 會自己畫字標，DOM 字標降為透明但保留在無障礙樹中 */
html.gl-active .wordmark { opacity: 0; }

/* 全螢幕白閃 */
html.seq-pending::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9;
  pointer-events: none;
  background: var(--ink);
  opacity: var(--seq-flash);
  mix-blend-mode: difference;
}

@media (prefers-reduced-motion: reduce) {
  #boot-log, #skip-hint { display: none; }
}
```

- [ ] **Step 5: 只在兩個首頁掛上序列**

修改 `src/pages/index.astro`：在 `import Wordmark` 之後加入

```astro
import HeroSequence from '../components/HeroSequence.astro';
```

並在 `<Wordmark />` 之後加入

```astro
<HeroSequence locale="en" />
```

修改 `src/pages/zh/index.astro`：同樣加入

```astro
import HeroSequence from '../../components/HeroSequence.astro';
```

與

```astro
<HeroSequence locale="zh" />
```

**不要**在 `about.astro`、`writing/index.astro`、`[slug].astro` 加入這個元件——字標與序列只屬於首頁。

- [ ] **Step 6: 建立降強度背景元件並掛到 About 與索引頁**

設計文件 §3.2 規定 `/about` 與 `/writing` 索引有「降低強度」的背景動畫：沒有序列、沒有字標，只有安靜的抖色底。

`src/components/SiteBackdrop.astro`：

```astro
---
// 門面路由（非首頁）的安靜背景。沒有序列、沒有字標。
---
<script>
  import { IDLE_FRAME } from '../lib/sequence/timeline';
  import type { DitherHandle } from '../lib/dither';

  async function boot(): Promise<void> {
    const canvas = document.getElementById('dither-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') ?? probe.getContext('webgl'))) return;
    } catch {
      return;
    }

    const { createDither } = await import('../lib/dither');
    const styles = getComputedStyle(document.documentElement);
    const handle: DitherHandle = createDither(canvas, {
      ground: styles.getPropertyValue('--ground').trim(),
      ink: styles.getPropertyValue('--ink').trim(),
      accent: styles.getPropertyValue('--accent').trim(),
    });
    window.__dither = handle;
    document.documentElement.classList.add('gl-active', 'seq-done');

    // 降強度：顆粒與脈衝環減半，場景更淡，字標為 0（字標只屬於首頁）
    handle.setFrame({
      ...IDLE_FRAME,
      grain: 0.01,
      ring: 0.13,
      scene: 0.5,
      wordmark: 0,
    });
  }

  void boot();
</script>
```

掛到四個頁面——`src/pages/about.astro`、`src/pages/writing/index.astro`、`src/pages/zh/about.astro`、`src/pages/zh/writing/index.astro`。以 `about.astro` 為例，在 frontmatter 加入

```astro
import SiteBackdrop from '../components/SiteBackdrop.astro';
```

並在 `<main>` 之前加入

```astro
<SiteBackdrop />
```

（`zh/` 底下的頁面 import 路徑多一層 `../`；`writing/index.astro` 同理。）

**不要**掛到 `writing/[slug].astro` 或 `zh/writing/[slug].astro`——那是唯一不載入 WebGL 的路徑。

- [ ] **Step 7: 建置並驗證 bundle 邊界**

Run: `npm run build`
Expected: 成功。

Run: `grep -l "three" dist/writing/approval-orchestrator/index.html`
Expected: 無輸出（文章頁的 HTML 不引用 three.js）。

Run: `grep -o 'src="[^"]*\.js"' dist/writing/approval-orchestrator/index.html`
Expected: 無輸出，或只有與 dither 無關的腳本。

- [ ] **Step 8: 人工驗證三種模式**

Run: `npm run preview`

1. 開啟 `http://localhost:4321/`
   Expected: 播放五格序列 — 雜訊 → 脈衝環擴散 → 故障爆發 + 白閃 → 青色 `ACCESS GRANTED` → 字標浮現、導覽淡入。左上角有終端機逐字打字。

2. 重新整理同一分頁
   Expected: **不再播放**（sessionStorage）。直接是 IDLE 狀態。

3. 開新的無痕視窗再進一次
   Expected: 重新播放。

4. 系統設定開啟「減少動態效果」後重新整理
   Expected: 完全不播放，直接進站，無任何動畫。

5. 在瀏覽器 DevTools 停用 JavaScript 後重新整理
   Expected: 深紫黑底、DOM 字標 `KEHAO / HAPPY HACKING` 可見、導覽與終端機視窗內容全部可讀。

- [ ] **Step 9: 提交**

```bash
git add src/components/ src/env.d.ts src/layouts/BaseLayout.astro src/pages/ src/styles/base.css
git commit -m "feat: 入侵序列、降強度背景與退化路徑"
```

---

## Task 11: 換頁故障轉場

**Files:**
- Create: `src/lib/nav-glitch.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/styles/base.css`

**Interfaces:**
- Consumes: `window.__dither` from Task 10
- Produces: `initNavGlitch(): void` — 掛上 ClientRouter 生命週期監聽

- [ ] **Step 1: 實作換頁故障模組**

用 `astro:before-preparation` 覆寫 `event.loader` 來延後交換時機，使內容在故障最高點（42%）才換掉——避免軟性淡入淡出。DOM 分層放在 `#fx-layers` 裡，因為 `#fx` 有 `transition:persist`，能在 body 被換掉時存活。

`src/lib/nav-glitch.ts`：

```ts
const DURATION_MS = 420;
const SWAP_AT = 0.42;
const LAYER_COUNT = 2;

/** 文章內頁不套用故障轉場：門面耍帥，文章負責被讀完。 */
function isFrontRoute(url: URL): boolean {
  return !/\/writing\/[^/]+\/?$/.test(url.pathname);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initNavGlitch(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let layers: HTMLElement[] = [];
  let rafId = 0;

  function clearLayers(): void {
    cancelAnimationFrame(rafId);
    layers.forEach((layer) => layer.remove());
    layers = [];
  }

  function buildLayers(): void {
    const host = document.getElementById('fx-layers');
    const source = document.querySelector('main.page');
    if (!host || !source) return;
    clearLayers();
    for (let i = 0; i < LAYER_COUNT; i += 1) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.classList.add('fx-layer');
      clone.dataset.layer = String(i);
      host.appendChild(clone);
      layers.push(clone);
    }
  }

  function animate(startedAt: number): void {
    const elapsed = (performance.now() - startedAt) / DURATION_MS;
    if (elapsed >= 1) {
      clearLayers();
      return;
    }
    const envelope =
      elapsed < 0.1 ? elapsed / 0.1
      : elapsed < 0.55 ? 1
      : 1 - (elapsed - 0.55) / 0.45;
    const amount = Math.max(0, envelope);

    layers.forEach((layer, index) => {
      const top = Math.random() * 70;
      const height = 6 + Math.random() * 26;
      const drift = (Math.random() - 0.5) * 90 * amount * (index ? 0.4 : 1);
      layer.style.opacity = String(0.9 * amount);
      layer.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
      layer.style.transform = `translate3d(${drift}px, 0, 0)`;
    });

    rafId = requestAnimationFrame(() => animate(startedAt));
  }

  document.addEventListener('astro:before-preparation', (event) => {
    const nav = event as unknown as {
      from: URL;
      to: URL;
      loader: () => Promise<void>;
    };

    if (reduced.matches || !isFrontRoute(nav.from) || !isFrontRoute(nav.to)) return;

    const originalLoader = nav.loader;
    nav.loader = async () => {
      window.__dither?.burst();
      buildLayers();
      animate(performance.now());
      // 讓交換發生在故障最高點
      await Promise.all([originalLoader(), wait(DURATION_MS * SWAP_AT)]);
    };
  });

  document.addEventListener('astro:after-swap', () => {
    // 換頁後停止抖色算繪：文章內頁的背景是靜止的純底色
    const reading = !isFrontRoute(new URL(window.location.href));
    window.__dither?.setReading(reading);
  });

  document.addEventListener('astro:page-load', () => {
    // 故障衰減完就清乾淨，避免殘影卡在畫面上
    setTimeout(clearLayers, DURATION_MS);
  });
}
```

- [ ] **Step 2: 在 BaseLayout 掛上 ClientRouter 與初始化**

修改 `src/layouts/BaseLayout.astro`。在 frontmatter 的 import 區加入：

```astro
import { ClientRouter } from 'astro:transitions';
```

在 `<head>` 的 `<slot name="head" />` 之前加入：

```astro
<ClientRouter fallback="swap" />
```

在 `</body>` 之前加入：

```astro
<script>
  import { initNavGlitch } from '../lib/nav-glitch';
  initNavGlitch();
</script>
```

- [ ] **Step 3: 附加分層樣式**

附加到 `src/styles/base.css` 末尾：

```css
/* ============================ 換頁故障分層 ============================ */
#fx-layers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.fx-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  /* difference 讓分層維持雙色，不會冒出彩色邊 */
  mix-blend-mode: difference;
  will-change: transform, clip-path, opacity;
}

/* ClientRouter 預設的淡入淡出會與故障打架，關掉。 */
@view-transition { navigation: auto; }
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

@media (prefers-reduced-motion: reduce) {
  .fx-layer { display: none; }
}
```

- [ ] **Step 4: 人工驗證轉場**

Run: `npm run preview`

1. 從 `/` 點 `WRITING`
   Expected: 420ms 的故障 — 畫面撕裂成橫向區塊、白閃、內容在最亂的瞬間換掉。

2. 從 `/writing` 點任一篇文章
   Expected: **沒有故障**，一般換頁。

3. 從文章頁點 `HOME`
   Expected: 沒有故障（來源是文章內頁）。

4. 從 `/` 點 `ABOUT`
   Expected: 有故障，且 About 頁仍有背景動畫。

5. 開啟「減少動態效果」後重複 1
   Expected: 沒有故障，一般換頁。

- [ ] **Step 5: 確認建置與型別**

Run: `npm run check && npm run build`
Expected: 兩者皆成功。

- [ ] **Step 6: 提交**

```bash
git add src/lib/nav-glitch.ts src/layouts/BaseLayout.astro src/styles/base.css
git commit -m "feat: 門面路由之間的 datamosh 換頁轉場"
```

---

## Task 12: 端對端護欄

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/degradation.spec.ts`
- Create: `tests/e2e/perf-budget.spec.ts`
- Create: `tests/e2e/navigation.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1–11 的完整網站
- Produces: `npm run test:e2e` 指令

這些測試的目的不是「證明它會動」，而是**防止未來的自己破壞已經決定好的約束**。

- [ ] **Step 1: 安裝 Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

在 `package.json` 的 `scripts` 加入：

```json
"test:e2e": "playwright test"
```

- [ ] **Step 2: 建立 Playwright 設定**

`playwright.config.ts`：

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: 寫效能預算護欄**

`tests/e2e/perf-budget.spec.ts`：

```ts
import { test, expect } from '@playwright/test';

/** 這條護欄防止未來的自己在文章頁加進 WebGL。 */
test('文章內頁不得載入 three.js', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/writing/approval-orchestrator/');
  await page.waitForLoadState('networkidle');

  const threeRequests = requested.filter((url) => /three/i.test(url));
  expect(threeRequests, `不應載入：${threeRequests.join(', ')}`).toHaveLength(0);
});

test('中文文章內頁同樣不得載入 three.js', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/zh/writing/aks-lun-exhaustion/');
  await page.waitForLoadState('networkidle');

  expect(requested.filter((url) => /three/i.test(url))).toHaveLength(0);
});

test('首頁確實載入 three.js', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(requested.filter((url) => /three/i.test(url)).length).toBeGreaterThan(0);
});
```

- [ ] **Step 4: 寫退化路徑護欄**

`tests/e2e/degradation.spec.ts`：

```ts
import { test, expect } from '@playwright/test';

test.describe('關閉 JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('文章內容完整可讀', async ({ page }) => {
    await page.goto('/zh/writing/aks-lun-exhaustion/');
    await expect(page.locator('h1')).toContainText('AKS 節點 LUN 用盡');
    await expect(page.locator('.prose')).toContainText('kubectl');
  });

  test('導覽可用且指向正確路徑', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-nav')).toBeVisible();
    await expect(page.locator('a.nav-link', { hasText: 'WRITING' }))
      .toHaveAttribute('href', '/writing');
  });

  test('首頁字標可見', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.wordmark')).toBeVisible();
    await expect(page.locator('.wordmark')).toContainText('KEHAO');
  });

  test('文章索引列出文章', async ({ page }) => {
    await page.goto('/writing/');
    await expect(page.locator('.post-row')).toHaveCount(1);
  });
});

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('不播放入侵序列，內容立即可見', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot-log')).toHaveCount(0);
    await expect(page.locator('main.page')).toBeVisible();
  });
});

test('序列每個 session 只播一次', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 8000 });

  await page.reload();
  // 重新整理後應立刻是完成狀態，不再有開場終端機
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 2000 });
  await expect(page.locator('#boot-log')).toHaveCount(0);
});
```

- [ ] **Step 5: 寫導覽與字標作用範圍護欄**

`tests/e2e/navigation.spec.ts`：

```ts
import { test, expect } from '@playwright/test';

test('字標只出現在首頁', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.wordmark')).toHaveCount(1);

  for (const path of ['/about/', '/writing/', '/writing/approval-orchestrator/']) {
    await page.goto(path);
    await expect(page.locator('.wordmark'), `${path} 不該有字標`).toHaveCount(0);
  }
});

test('中文首頁有字標，中文其他頁沒有', async ({ page }) => {
  await page.goto('/zh/');
  await expect(page.locator('.wordmark')).toHaveCount(1);

  await page.goto('/zh/about/');
  await expect(page.locator('.wordmark')).toHaveCount(0);
});

test('hreflang 三個條目齊備', async ({ page }) => {
  await page.goto('/writing/');
  const links = page.locator('link[rel="alternate"]');
  await expect(links).toHaveCount(3);
  await expect(page.locator('link[hreflang="zh-Hant"]'))
    .toHaveAttribute('href', /\/zh\/writing$/);
});

test('標籤篩選會縮小清單', async ({ page }) => {
  await page.goto('/zh/writing/');
  const before = await page.locator('.post-row').count();
  await page.goto('/zh/writing/tag/azure/');
  const after = await page.locator('.post-row').count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});

test('單語文章顯示提示而非 404', async ({ page }) => {
  const response = await page.goto('/zh/writing/aks-lun-exhaustion/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.notice')).toContainText('僅有原文');
});

test('RSS 可取得且為合法 XML', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('<rss');
  expect(body).toContain('<item>');
});
```

- [ ] **Step 6: 執行端對端測試**

Run: `npm run test:e2e`
Expected: 全部通過。

若「序列每個 session 只播一次」逾時，確認 `HeroSequence.astro` 在 `frame.phase === 'idle'` 時確實加上了 `seq-done` class 並寫入 `sessionStorage`。

- [ ] **Step 7: 執行完整測試套件**

Run: `npm test && npm run check && npm run build && npm run test:e2e`
Expected: 四者皆通過。

- [ ] **Step 8: 提交**

```bash
git add playwright.config.ts tests/ package.json package-lock.json
git commit -m "test: 效能預算、退化路徑與導覽的端對端護欄"
```

---

## Task 13: Lighthouse 分數基準

**Files:**
- Create: `lighthouserc.js`
- Create: `docs/lighthouse-baseline.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1–12 的完整網站
- Produces: `npm run test:lighthouse` 指令；`docs/lighthouse-baseline.md` 記錄實測分數

目標是**綠色（≥ 0.90），不是滿分**。追 100 會逼你砍掉真正想要的東西；90 是「這個網站沒有明顯毛病」的證明，那才是這條測試要守的東西。

Lighthouse 預設用**行動裝置模擬 + 網路節流**，是最嚴苛的設定。這裡不放寬，因為技術文章的讀者很多是在手機上點開的。

- [ ] **Step 1: 安裝 Lighthouse CI**

```bash
npm install -D @lhci/cli
```

在 `package.json` 的 `scripts` 加入：

```json
"test:lighthouse": "lhci autorun"
```

Lighthouse 需要 Chrome。若系統沒有安裝，用 Playwright 已下載的 chromium：

```bash
export CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")"
```

- [ ] **Step 2: 建立設定與斷言**

`lighthouserc.js`：

```js
/**
 * 目標是綠色（>= 0.90），不是滿分。
 * numberOfRuns: 3 —— Lighthouse 分數有雜訊，LHCI 取中位數。
 * 只跑一次會產生隨機失敗的測試，那比沒有測試更糟。
 */
const GREEN = 0.9;

/** 四個類別一律要綠 */
const categories = {
  'categories:performance': ['error', { minScore: GREEN }],
  'categories:accessibility': ['error', { minScore: GREEN }],
  'categories:best-practices': ['error', { minScore: GREEN }],
  'categories:seo': ['error', { minScore: GREEN }],
};

/**
 * 類別分數是加權合成的，可能藏住單一項爛掉的指標。
 * 這裡直接對 Core Web Vitals 的「良好」門檻設限。
 */
const vitals = {
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  'total-blocking-time': ['error', { maxNumericValue: 300 }],
  'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
};

/** 與本專案的設計紀律直接對應的個別稽核 */
const discipline = {
  // 配色紀律的第二道防線（第一道是 tokens.test.ts）
  'color-contrast': ['error', { minScore: 1 }],
  'html-has-lang': ['error', { minScore: 1 }],
  'document-title': ['error', { minScore: 1 }],
  'meta-description': ['error', { minScore: 1 }],
  'hreflang': ['error', { minScore: 1 }],
  'heading-order': ['error', { minScore: 1 }],
  // three.js 必然會被判定為「未使用的 JavaScript」——它是刻意的設計選擇，不是疏失
  'unused-javascript': 'off',
  'legacy-javascript': 'off',
  // v1 沒有圖片，這些稽核沒有意義
  'uses-responsive-images': 'off',
  'modern-image-formats': 'off',
  // 靜態站的 CSP 由 Cloudflare Pages 的 _headers 處理，不在建置產物內
  'csp-xss': 'off',
};

export default {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'localhost',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/about/',
        'http://localhost:4321/writing/',
        'http://localhost:4321/writing/approval-orchestrator/',
        'http://localhost:4321/zh/',
        'http://localhost:4321/zh/writing/aks-lun-exhaustion/',
      ],
      settings: {
        // 預設即為行動裝置模擬，明寫出來避免日後被誤改
        preset: 'desktop' === process.env.LHCI_PRESET ? 'desktop' : undefined,
        skipAudits: ['uses-http2'], // 本機 preview 沒有 HTTP/2，正式環境由 Cloudflare 提供
      },
    },
    assert: {
      assertMatrix: [
        {
          // 文章內頁：零 JavaScript，標準最嚴
          matchingUrlPattern: '.*/writing/[^/]+/$',
          assertions: { ...categories, ...vitals, ...discipline },
        },
        {
          // 其餘所有路由（首頁、About、索引）：載入 WebGL
          matchingUrlPattern: '.*',
          assertions: { ...categories, ...vitals, ...discipline },
        },
      ],
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
```

在 `.gitignore` 加入一行：

```
.lighthouseci/
```

- [ ] **Step 3: 執行並取得實測基準**

```bash
npm run build
npm run test:lighthouse
```

Expected: 六個 URL 的四個類別中位數皆 ≥ 0.90。

文章內頁（`/writing/approval-orchestrator/`、`/zh/writing/aks-lun-exhaustion/`）幾乎不可能不過——它們沒有任何 JavaScript。

**真正有風險的是 `/` 與 `/zh/`**，因為它們載入 three.js 並播放序列。若這兩個 URL 未達標，依序採取下列補救，每做一步就重跑一次：

**補救 A —— 把 three.js 的載入推遲到 LCP 之後。**
修改 `src/components/HeroSequence.astro`，把 `void boot();` 換成：

```js
  // 讓瀏覽器先完成首次內容繪製，再去下載 three.js
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => void boot(), { timeout: 600 });
  } else {
    setTimeout(() => void boot(), 120);
  }
```

`SiteBackdrop.astro` 做相同修改。

**補救 B —— 確認 `seq-pending` 沒有把 LCP 元素藏起來。**
執行 `npx lighthouse http://localhost:4321/ --view`，在報告的 "Largest Contentful Paint element" 區塊確認 LCP 元素是終端機視窗或字標，而不是空的。若 Lighthouse 回報 LCP 元素為 `#fx`，代表內容被判定為未繪製——回頭檢查 Task 10 Step 4 的 CSS 是否誤把 `.page` 設成 `opacity: 0`。

**補救 C —— 若 A 與 B 都做完仍未達 0.90**，把 `lighthouserc.js` 的第二個 matrix 區塊改成只針對首頁放寬，並在 `docs/lighthouse-baseline.md` 記下實測數字與原因：

```js
        {
          matchingUrlPattern: '.*localhost:4321/(zh/)?$',
          assertions: {
            ...categories,
            ...vitals,
            ...discipline,
            // 首頁刻意載入 three.js 播放入侵序列，這是設計決策而非疏失。
            // 實測中位數記錄於 docs/lighthouse-baseline.md。
            'categories:performance': ['warn', { minScore: GREEN }],
          },
        },
```

**只有在 A 與 B 都實際執行過之後才准用 C。** 先放寬門檻再去修，門檻就永遠不會被修回來。

- [ ] **Step 4: 記錄基準**

`docs/lighthouse-baseline.md`：

```markdown
# Lighthouse 基準

目標：四個類別皆綠（≥ 0.90）。不追滿分。

設定：Lighthouse 預設的行動裝置模擬 + 網路節流，三次取中位數。
執行：`npm run test:lighthouse`

## 實測（YYYY-MM-DD，填入實際執行日期與數字）

| 路由 | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | | | | | | | |
| `/about/` | | | | | | | |
| `/writing/` | | | | | | | |
| `/writing/approval-orchestrator/` | | | | | | | |
| `/zh/` | | | | | | | |
| `/zh/writing/aks-lun-exhaustion/` | | | | | | | |

## 刻意關閉的稽核

| 稽核 | 原因 |
|---|---|
| `unused-javascript` | three.js 在首次繪製時尚未使用是刻意的載入策略 |
| `legacy-javascript` | 同上 |
| `uses-responsive-images` / `modern-image-formats` | v1 沒有圖片 |
| `csp-xss` | CSP 由 Cloudflare Pages 的 `public/_headers` 提供，不在建置產物內 |
| `uses-http2` | 本機 preview 無 HTTP/2，正式環境由 Cloudflare 提供 |

關閉一項稽核就要在這裡寫下原因。沒有原因的關閉，下次就會變成沒有人記得的技術債。
```

把 Step 3 的實測數字填進表格。

- [ ] **Step 5: 執行完整測試套件**

Run: `npm test && npm run check && npm run build && npm run test:e2e && npm run test:lighthouse`
Expected: 五者皆通過。

註：`test:lighthouse` 約需 2–4 分鐘，**刻意不放進 `npm test`**。單元測試要能在兩秒內給出回饋，把它和 Lighthouse 綁在一起會讓你不想跑測試。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json lighthouserc.js .gitignore docs/lighthouse-baseline.md
git commit -m "test: Lighthouse 綠色分數基準與 Core Web Vitals 門檻"
```

---

## Task 14: 部署設定

**Files:**
- Create: `public/_headers`
- Create: `public/robots.txt`
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-08-24-personal-website-design.md`

**Interfaces:**
- Consumes: 完整網站
- Produces: 可部署到 Cloudflare Pages 的產出

- [ ] **Step 1: 建立快取標頭**

`public/_headers`：

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/rss.xml
  Content-Type: application/rss+xml; charset=utf-8

/zh/rss.xml
  Content-Type: application/rss+xml; charset=utf-8
```

- [ ] **Step 2: 建立 robots.txt**

`public/robots.txt`：

```
User-agent: *
Allow: /

Sitemap: https://happyhacking.ninja/sitemap-index.xml
```

- [ ] **Step 3: 建立 README**

`README.md`：

````markdown
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
````

- [ ] **Step 4: 修正設計文件的版本記述**

修改 `docs/superpowers/specs/2026-08-24-personal-website-design.md` 第 3.1 節，把

```
- **Astro 5**，靜態輸出，TypeScript
```

改為

```
- **Astro 6**，靜態輸出，TypeScript
```

- [ ] **Step 5: 建立 Cloudflare Pages 專案**

這一步需要在 Cloudflare 儀表板操作（無法由指令碼完成）：

1. Workers & Pages → Create → Pages → Connect to Git，選擇這個 repo
2. Build command：`npm run build`
3. Build output directory：`dist`
4. Node version 環境變數：`NODE_VERSION = 22`
5. Custom domains → 加入 `happyhacking.ninja` 與 `www.happyhacking.ninja`

- [ ] **Step 6: 驗證正式建置產出**

Run: `npm run build && npx serve dist -l 4321`（或 `npm run preview`）

逐一開啟並確認：`/`、`/about/`、`/writing/`、`/writing/tag/llm/`、`/writing/approval-orchestrator/`、`/zh/`、`/zh/writing/aks-lun-exhaustion/`、`/rss.xml`、`/zh/rss.xml`、`/sitemap-index.xml`、`/404.html`

Expected: 全部正常，無 console 錯誤。

- [ ] **Step 7: 提交**

```bash
git add public/ README.md docs/superpowers/specs/2026-08-24-personal-website-design.md
git commit -m "chore: 部署設定、README 與設計文件版本修正"
```

---

## Self-Review 紀錄

撰寫完成後對照設計文件逐節檢查：

| 設計文件章節 | 對應 Task |
|---|---|
| 1 定位與範圍（含 v1 標籤篩選） | Task 6（`TagFilter` 與 `/writing/tag/[tag]`） |
| 2.2 配色 token 與對比度 | Task 1（含永久守門測試） |
| 2.3 抖色渲染規格 | Task 9（shader 與一致性測試） |
| 2.4 字標與低頻閃動 | Task 9（`flickerAmount`）、Task 10（只在首頁）、Task 12（護欄） |
| 2.5 入侵序列五格 | Task 8（純函式）、Task 10（驅動） |
| 2.6 終端機視窗 | Task 5 |
| 2.7 換頁轉場與適用範圍 | Task 11（`isFrontRoute`） |
| 3.2 效能架構 | Task 10（動態 import）、Task 12（`perf-budget.spec.ts`） |
| 3.3 字體 | Task 1（`--font-mono` / `--font-sans`） |
| 3.4 模組邊界 | File Structure 與 Task 8/9 的拆分 |
| 4 內容來源與 schema | Task 3 |
| 5 路由與 i18n | Task 4、Task 6、Task 7 |
| 6 錯誤處理與退化 | Task 10（退化路徑）、Task 12（驗證） |
| 7 測試 | Task 1/2/3/4/8/9（Vitest）、Task 12（Playwright）、Task 13（Lighthouse） |

發現並已修正的問題：

1. **設計文件說 Astro 5，實際現行版本為 6** — 計畫改用 Astro 6，並在 Task 14 Step 4 一併修正設計文件。
2. **標籤篩選原本規劃用查詢參數 `?tag=`** — 靜態輸出無法為查詢參數預先產生頁面，改為 `/writing/tag/<tag>` 靜態路由；設計文件第 5 節該處描述已由此計畫取代。
3. **`--dim` 的使用範圍容易被誤用** — 已寫進 Global Constraints，且 `TerminalWindow.astro` 用 `meta`（`--muted`）與 `deco`（`--dim`）兩個不同 prop 從介面層強制區分。
4. **`readingTime` 在 schema 中為選填** — Task 3 的 `loadPosts()` 以 Task 2 的 `estimateReadingTime` 補齊，型別上對下游永遠是 `number`。
5. **`window.__dither` 的型別** — Task 10 補上 `src/env.d.ts` 的全域宣告，避免 Task 11 使用時型別錯誤。
6. **序列原本會造成「內容閃現後被藏起」** — 原設計以 `opacity: 0` 隱藏 `.page`，但該 class 要等 three.js 載入完才加上，中間會閃；且 Lighthouse 不把 `opacity: 0` 的元素計入 LCP。改為由 `<head>` 的同步 inline script 設定 `seq-pending`，用不透明的 `#fx` 覆蓋內容——內容始終被繪製（LCP 正常），視覺上被蓋住，SETTLE 時硬切露出。
7. **設計文件 §3.2 要求 `/about` 與 `/writing` 有降強度背景，原計畫漏做** — Task 10 補上 `SiteBackdrop.astro`，並明確排除文章內頁。
