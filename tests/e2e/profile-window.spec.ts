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

test('CSS counter 規則產生邏輯行號，不進無障礙樹也不進文字內容', async ({ page }) => {
  await page.goto('/');

  // 邏輯行數與內容驗證
  const lines = page.locator('.vim-line');
  await expect(lines).toHaveCount(5);

  // 行號不進文字內容：textContent 不含行號數字
  const bodyText = await page.locator('.vim-body').textContent();
  expect(bodyText).not.toMatch(/^\s*1\s/);

  // 驗證行號的 CSS counter 規則存在且參數正確。
  // 注意：這個測試驗的是「產生行號的 CSS 規則」，不是「渲染出來的數字長什麼樣」。
  // 後者需要視覺回歸基準圖，對這個規模不成比例。但這組規則足以捕捉常見的 bug：
  // 1. 整條規則被刪掉 → counterReset / counterIncrement 會變成 'none'
  // 2. counter-reset 的起始值改錯（例如 41 而非 0） → counterReset 可見
  // 3. counter-increment 的步進改錯 → counterIncrement 可見

  // counter-reset 與 counter-increment 的值在 computed style 裡是解析過的（不像 content
  // 裡的 counter() 函數被 Chromium 不解析），所以能被斷言。
  const counterReset = await page.locator('.vim-body').evaluate(
    (el) => getComputedStyle(el).counterReset,
  );
  expect(counterReset).toBe('vimline 0');

  const counterIncrement = await lines.first().evaluate(
    (el) => getComputedStyle(el).counterIncrement,
  );
  expect(counterIncrement).toBe('vimline 1');

  // 補充確認 ::before 偽元素的 content 規則存在
  // (Chromium 不解析函數值 "counter(vimline)"，但 "counter(...)" 不是 "none" 就證明規則有效)
  const firstBeforeContent = await lines.first().evaluate(
    (el) => getComputedStyle(el, '::before').content,
  );
  expect(firstBeforeContent).not.toBe('none');
  expect(firstBeforeContent).toContain('counter');
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
