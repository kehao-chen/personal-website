import { test, expect } from '@playwright/test';

type Page = import('@playwright/test').Page;

const lang = (page: Page) => page.locator('.nav-lang');

/**
 * 比對完整 pathname，不用正則尾比對——`/writing/` 的正則同時也吃得下
 * `/zh/writing/`，那樣的斷言在「根本沒換語系」的情況下也會過。
 */
const pathnameOf = (page: Page) => new URL(page.url()).pathname;

/**
 * 換語系要留在同一頁。這條規則的實作分兩層——routing.ts 的純函式算出目標
 * URL，BaseLayout 把 path/availableLocales 餵給 SiteNav——單元測試只蓋得到
 * 前者，所以這裡驗證的是「串起來之後，點下去真的會到那一頁」。
 */
const SAME_PAGE: Array<[string, string, string]> = [
  ['/about/', '中文', '/zh/about/'],
  ['/zh/about/', 'EN', '/about/'],
  ['/writing/', '中文', '/zh/writing/'],
  ['/zh/writing/', 'EN', '/writing/'],
  ['/', '中文', '/zh/'],
  ['/zh/', 'EN', '/'],
];

for (const [from, label, to] of SAME_PAGE) {
  test(`在 ${from} 換語系會到 ${to}，不是首頁`, async ({ page }) => {
    await page.goto(from);
    await expect(lang(page)).toHaveText(label);
    await lang(page).click();
    await expect.poll(() => pathnameOf(page)).toBe(to);
  });
}

/**
 * 手足 URL 不存在時的退路。英文文章沒有中文版，硬套同一條路徑會 404，
 * 所以退到中文的 /writing/——比丟回首頁更接近使用者原本在看的東西。
 */
test('沒有中文版的英文文章，換語系退到中文的 /writing/', async ({ page }) => {
  await page.goto('/writing/approval-orchestrator/');
  await lang(page).click();
  await expect.poll(() => pathnameOf(page)).toBe('/zh/writing/');
});

test('沒有英文版的中文文章，換語系退到英文的 /writing/', async ({ page }) => {
  await page.goto('/zh/writing/aks-lun-exhaustion/');
  await lang(page).click();
  await expect.poll(() => pathnameOf(page)).toBe('/writing/');
});

test('換語系的連結不會落在 404', async ({ page }) => {
  for (const from of ['/about/', '/writing/', '/writing/approval-orchestrator/',
    '/writing/tag/architecture/', '/zh/writing/aks-lun-exhaustion/', '/zh/about/']) {
    await page.goto(from);
    const href = await lang(page).getAttribute('href');
    const res = await page.request.get(href!);
    expect(res.status(), `${from} 的換語系連結指向 ${href}`).toBe(200);
  }
});
