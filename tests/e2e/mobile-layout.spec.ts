import { test, expect } from '@playwright/test';

/**
 * 這個站原本一個寬度斷點都沒有，導覽列在手機上整段被切掉、「關於」與語言切換
 * 點不到，而全部十四個 task 的測試沒有一個涵蓋窄畫面。這裡補的就是那個缺口。
 *
 * 用 iPhone SE 的 320px：目前還在流通的機型裡最窄的，過得了它就過得了其餘。
 */
// 不用 devices['iPhone SE'] 整組：那會把 browserType 換成 webkit，
// 而這個專案只裝了 chromium。要的只是視窗尺寸與觸控行為。
test.use({
  viewport: { width: 320, height: 568 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const PAGES = [
  ['首頁', '/'],
  ['文章索引', '/writing/'],
  ['文章內頁', '/writing/approval-orchestrator/'],
  ['中文首頁', '/zh/'],
  ['中文文章', '/zh/writing/aks-lun-exhaustion/'],
  ['關於', '/about/'],
] as const;

for (const [name, path] of PAGES) {
  test(`${name}在 320px 下沒有水平溢出`, async ({ page }) => {
    await page.goto(path);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test(`${name}的導覽列連結全部在視窗內`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator('.site-nav a');
    const count = await links.count();
    // 品牌 + HOME/WRITING/ABOUT + 語言切換
    expect(count).toBe(5);

    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      const label = (await links.nth(i).textContent())?.trim();
      expect(box, `${label} 應該有版面盒`).not.toBeNull();
      expect(box!.x, `${label} 不該被推出左緣`).toBeGreaterThanOrEqual(0);
      expect(
        box!.x + box!.width,
        `${label} 不該超出視窗右緣（原本 ABOUT 與語言切換就是這樣消失的）`,
      ).toBeLessThanOrEqual(clientWidth);
    }
  });
}

test('導覽列連結的點擊區高度達到 WCAG 2.5.8 的 24px', async ({ page }) => {
  await page.goto('/writing/');

  // 視覺盒刻意維持小尺寸（底線要貼著文字），熱區靠覆蓋式 ::after 撐開，
  // 所以量 boundingBox 量不到——要從中心往上下打點，看命中的是不是同一個連結。
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('.site-nav a')].map((a) => {
      const box = a.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const hits = (dy: number) => {
        const el = document.elementFromPoint(cx, cy + dy);
        return el === a || a.contains(el);
      };
      let up = 0;
      let down = 0;
      while (up < 40 && hits(-(up + 1))) up++;
      while (down < 40 && hits(down + 1)) down++;
      return { label: (a.textContent ?? '').trim(), height: up + down + 1 };
    }),
  );

  expect(heights).toHaveLength(5);
  for (const { label, height } of heights) {
    expect(height, `${label} 的點擊區只有 ${height}px`).toBeGreaterThanOrEqual(24);
  }
});

test('首頁的字標與終端機視窗不重疊', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  const wordmark = await page.locator('.wordmark').boundingBox();
  const win = await page.locator('.layout-front .win').boundingBox();
  expect(wordmark).not.toBeNull();
  expect(win).not.toBeNull();

  // 桌面版是 flex-end 疊在背景上；窄畫面必須改成上下堆疊，否則終端機視窗
  // 會蓋在 KEHAO 上，看起來像 render 壞掉。
  expect(
    wordmark!.y + wordmark!.height,
    '字標的底部應該在終端機視窗上緣之上',
  ).toBeLessThanOrEqual(win!.y);
});

test('程式碼區塊自己捲動，不撐破頁面', async ({ page }) => {
  await page.goto('/writing/approval-orchestrator/');

  const pre = page.locator('.prose pre').first();
  const box = await pre.boundingBox();
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(box!.x + box!.width).toBeLessThanOrEqual(clientWidth);

  // 內容確實比容器寬——否則這個測試在「程式碼剛好塞得下」時是空過的
  const overflows = await pre.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflows, '這段程式碼在 320px 下應該寬到需要橫捲，測試才有意義').toBe(true);
});
