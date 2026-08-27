import { test, expect } from '@playwright/test';

const caret = '.site-nav .brand .brand-caret';

test('每一頁的品牌後面都跟著一個會閃的游標', async ({ page }) => {
  for (const path of ['/', '/writing/', '/zh/about/']) {
    await page.goto(path);
    const box = await page.locator(caret).boundingBox();
    expect(box, `${path} 的游標應該有版面盒`).not.toBeNull();
    // 實心方塊，不是塌成零寬的空 span
    expect(box!.width).toBeGreaterThan(2);
    expect(box!.height).toBeGreaterThan(6);

    const name = await page.locator(caret).evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(name, `${path} 的游標沒有套到閃爍動畫`).toBe('brand-caret');
  }
});

test('游標不進無障礙樹，品牌連結的名稱維持乾淨', async ({ page }) => {
  await page.goto('/');
  const brand = page.locator('.site-nav .brand');
  // 空的 aria-hidden span 不該替連結加上任何可讀內容
  await expect(brand).toHaveText('HAPPYHACKING.NINJA');
  await expect(page.locator(caret)).toHaveAttribute('aria-hidden', 'true');
});

test.describe('prefers-reduced-motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  /**
   * 動畫只負責「把游標按掉」，基準狀態是亮著的——所以關掉動畫之後游標不會
   * 剛好停在隱形的那一格，而是常亮。這正是想要的退化行為：不閃，但看得見。
   */
  test('關掉動態效果後游標不閃，但仍然看得見', async ({ page }) => {
    await page.goto('/');
    const opacity = await page.locator(caret).evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(opacity).toBe('1');
  });
});
