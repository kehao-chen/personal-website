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
