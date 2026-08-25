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
