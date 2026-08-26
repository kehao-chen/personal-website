import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 320, height: 568 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

/**
 * 桌面隱喻是桌面版專屬。窄畫面上圖示與視窗都不該出現——它們仍在 DOM 中，
 * 由 CSS 的 display:none 一起拿掉，所以斷言用「不可見」而不是「不存在」。
 */
test('窄畫面完全不出現 .profile 桌面', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.desktop')).toBeHidden();
  await expect(page.locator('.desktop-icon')).toBeHidden();
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('序列播完之後也不會冒出來', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(page.locator('#profile-window')).toBeHidden();
});

/**
 * 開關腳本在窄畫面照樣掛著監聽（斷點只寫在 CSS，不在 JS 裡重複一份），
 * 所以要確認鍵盤操作翻不出一個看得見的視窗來。
 */
test('ESC 與 :q 不會讓視窗在窄畫面現身', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  await page.keyboard.press('Escape');
  await page.keyboard.press(':');
  await page.keyboard.press('q');

  await expect(page.locator('#profile-window')).toBeHidden();
});
