import { test, expect } from '@playwright/test';

type Page = import('@playwright/test').Page;

const scrollState = (page: Page) =>
  page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    maxScrollY: (() => {
      window.scrollTo(0, 999_999);
      const y = window.scrollY;
      window.scrollTo(0, 0);
      return y;
    })(),
  }));

/**
 * 首頁是滿版 hero，不該出現捲軸——但「鎖住捲動」的規則只能認 `.layout-front`
 * 這個版面訊號。曾經它是從導覽高亮的 `current === 'home'` 推導的，404 也是
 * current="home"，於是一個真的需要捲動的閱讀版面被一起鎖死。
 */
test.describe('首頁不出捲軸', () => {
  for (const [w, h] of [[1440, 900], [1280, 720], [1024, 640]] as const) {
    test(`桌面 ${w}×${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/');
      await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

      const closed = await scrollState(page);
      expect(closed.scrollH, '收起狀態就撐出了捲動空間').toBeLessThanOrEqual(closed.clientH);

      // 展開 .profile 之後也不該長出捲軸
      await page.locator('.desktop-icon').click();
      await expect(page.locator('#profile-window')).toBeVisible();
      const opened = await scrollState(page);
      expect(opened.scrollH, '展開視窗後撐出了捲動空間').toBeLessThanOrEqual(opened.clientH);
    });
  }
});

/**
 * 反面：閱讀版面必須捲得到底。用 320×400（橫放的手機，也等同小筆電放大 200%）
 * ——這正是當初被鎖死時內容讀不完的尺寸。
 */
test.describe('閱讀版面捲得到底', () => {
  test.use({ viewport: { width: 320, height: 400 } });

  for (const [name, path] of [['404', '/404'], ['關於', '/about/'], ['文章', '/writing/approval-orchestrator/']] as const) {
    test(`${name} 的內容全部讀得到`, async ({ page }) => {
      await page.goto(path);
      const { maxScrollY } = await scrollState(page);
      const bottom = await page.locator('.win').evaluate(
        (el) => el.getBoundingClientRect().bottom + window.scrollY,
      );
      const viewport = await page.evaluate(() => window.innerHeight);
      const unreachable = Math.round(bottom - viewport - maxScrollY);
      expect(unreachable, `${name} 有 ${unreachable}px 捲不到`).toBeLessThanOrEqual(0);
    });
  }
});
