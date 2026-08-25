import { test, expect } from '@playwright/test';
import { loadedThreeJs } from './support/detect-three';

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
      .toHaveAttribute('href', '/writing/');
  });

  test('首頁字標可見', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.wordmark')).toBeVisible();
    await expect(page.locator('.wordmark')).toContainText('KEHAO');
  });

  test('文章索引列出文章', async ({ page }) => {
    await page.goto('/writing/');
    // 目前英文有兩篇文章（見 navigation.spec.ts 的標籤篩選測試，同樣依賴這個數字）
    await expect(page.locator('.post-row')).toHaveCount(2);
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

test.describe('沒有 WebGL', () => {
  test.beforeEach(async ({ page }) => {
    // 在任何頁面腳本執行之前就讓 WebGL context 探測失敗，模擬真的沒有 WebGL
    // 的裝置／瀏覽器（而不是依賴「跑測試的這台機器剛好沒有 WebGL」這種環境
    // 巧合——換到一台真的有 WebGL 的 CI runner 上，這條退化路徑一樣測得到）。
    await page.addInitScript(() => {
      // 原生 getContext 是多載簽章，這裡故意把它當成寬鬆的 unknown[] 函式看待，
      // 純粹是為了攔截 webgl/webgl2，不需要真的重現它完整的多載型別。
      const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (...args: unknown[]) => unknown;
      };
      const original = proto.getContext;
      proto.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
        if (args[0] === 'webgl' || args[0] === 'webgl2') return null;
        return original.apply(this, args);
      };
    });
  });

  /**
   * Ruling 3：`createDither` 不會丟例外；沒有 WebGL 時整個序列都不啟動，
   * `window.__dither` 維持 `undefined`，字標留在 DOM 上，內容照常可讀。
   */
  test('入侵序列整個略過，字標與內容照常可見，且不會偷跑 three.js', async ({ page }) => {
    const found = await loadedThreeJs(page, '/');
    expect(found, '沒有 WebGL 時不應該連 three.js 都下載').toBe(false);

    await expect(page.locator('.wordmark')).toBeVisible();
    await expect(page.locator('.wordmark')).toContainText('KEHAO');
    await expect(page.locator('main.page')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/gl-active/);
    await expect(page.locator('html')).not.toHaveClass(/seq-pending/);

    const ditherHandle = await page.evaluate(() => window.__dither);
    expect(ditherHandle, 'window.__dither 應該維持 undefined').toBeUndefined();
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
