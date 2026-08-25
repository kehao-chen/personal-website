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
  // 這個版本的 @playwright/test 沒有把 `reducedMotion` 收進 test 層級可覆寫的
  // `PlaywrightTestOptions`（`test.use({ reducedMotion: 'reduce' })` 連型別都
  // 過不了）；真正能覆寫 context 建立參數的是 `contextOptions` fixture。
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  /**
   * 出貨行為與 brief 撰寫時不同：減少動態效果時序列完全不啟動，
   * 也不會加上 gl-active 或 seq-done——DOM 字標本來就在畫面上，
   * 不需要序列把它「顯示出來」。這裡只驗證退化路徑真的退化：
   * 不下載/啟動任何序列 UI，主要內容立即可見。
   */
  test('不播放入侵序列，內容立即可見', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot-log')).toHaveCount(0);
    await expect(page.locator('main.page')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/gl-active/);
    await expect(page.locator('html')).not.toHaveClass(/seq-pending/);
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
