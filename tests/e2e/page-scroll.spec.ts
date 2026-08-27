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

  /**
   * 文件裡不是只有本站的內容。瀏覽器擴充功能會往 <html> 底下、<body> 之後掛
   * 東西（實測某個擴充掛了一塊 188px 的工具列），那塊東西撐高的是 html 而不是
   * body——`.layout-front` 自己夾住高度管不到它，只有鎖 html 的 overflow 才管
   * 得到。這裡照那個機制放一塊一樣的兄弟節點，決定性地重現同一種文件狀態。
   *
   * 斷言用真的滾輪事件而不是 scrollHeight：擴充的那塊東西還在，scrollHeight
   * 本來就會超過視窗，重點是使用者滑不動——`.profile` 不會被滑走。
   */
  test('<html> 底下被塞了東西，首頁照樣滑不動', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
    await page.locator('.desktop-icon').click();
    await expect(page.locator('#profile-window')).toBeVisible();

    const profileTop = async () =>
      page.locator('#profile-window').evaluate((el) => Math.round(el.getBoundingClientRect().top));
    const before = await profileTop();

    await page.evaluate(() => {
      const intruder = document.createElement('div');
      intruder.id = 'intruder';
      intruder.style.height = '400px';
      document.documentElement.appendChild(intruder);
    });

    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200);

    expect(await page.evaluate(() => window.scrollY), '首頁被滑動了').toBe(0);
    expect(await profileTop(), '.profile 被滑走了').toBe(before);
  });
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
