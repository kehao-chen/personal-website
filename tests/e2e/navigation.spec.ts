import { test, expect } from '@playwright/test';

test('字標只出現在首頁', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.wordmark')).toHaveCount(1);

  for (const path of ['/about/', '/writing/', '/writing/typeless-hyprland-terminal-paste/']) {
    await page.goto(path);
    await expect(page.locator('.wordmark'), `${path} 不該有字標`).toHaveCount(0);
  }
});

test('中文首頁有字標，中文其他頁沒有', async ({ page }) => {
  await page.goto('/zh/');
  await expect(page.locator('.wordmark')).toHaveCount(1);

  for (const path of ['/zh/about/', '/zh/writing/', '/zh/writing/typeless-hyprland-terminal-paste/']) {
    await page.goto(path);
    await expect(page.locator('.wordmark'), `${path} 不該有字標`).toHaveCount(0);
  }
});

test('hreflang 三個條目齊備', async ({ page }) => {
  await page.goto('/writing/');
  const links = page.locator('link[rel="alternate"]');
  await expect(links).toHaveCount(3);
  // canonical 是 /writing/（目錄形式），自我指涉的 hreflang 必須一模一樣，
  // 否則整組 hreflang 會被搜尋引擎丟棄。
  await expect(page.locator('link[rel="canonical"]'))
    .toHaveAttribute('href', /\/writing\/$/);
  await expect(page.locator('link[hreflang="en"]'))
    .toHaveAttribute('href', /\/writing\/$/);
  await expect(page.locator('link[hreflang="zh-Hant"]'))
    .toHaveAttribute('href', /\/zh\/writing\/$/);
});

/**
 * 兩個語系目前各只有一篇文章（同一篇的中英版），篩前篩後都是 1，「篩選會縮小
 * 清單」這種斷言暫時立不起來；`filterByTag` 本身由 `src/lib/posts.test.ts` 蓋。
 * 這裡能驗的是接線：文章掛的標籤有頁、頁上列的是那篇；沒人掛的標籤不產頁。
 * 第二篇英文文章進站後，把「篩到剩一篇、被篩掉的那篇不在清單裡」補回來。
 */
test('標籤頁只替文章掛的標籤產生', async ({ page }) => {
  await page.goto('/writing/');
  expect(await page.locator('.post-row').count(), '英文文章總數').toBe(1);

  await page.goto('/writing/tag/hyprland/');
  await expect(page.locator('.post-row')).toHaveCount(1);
  await expect(page.locator('.post-row')).toContainText('Typeless');

  const missing = await page.goto('/writing/tag/kubernetes/');
  expect(missing?.status(), '沒有文章掛的標籤不該有頁').toBe(404);
});

/**
 * 「僅有原文」的提示目前站上沒有文章能觸發（唯一一篇是雙語的），這條改驗另一個
 * 分支：有翻譯時顯示翻譯連結，而且連結指向正確的手足 URL。
 */
test('有翻譯的文章顯示翻譯連結而非「僅有原文」', async ({ page }) => {
  const response = await page.goto('/zh/writing/typeless-hyprland-terminal-paste/');
  expect(response?.status()).toBe(200);
  const notice = page.locator('.notice');
  await expect(notice).toContainText('English');
  await expect(notice).not.toContainText('僅有原文');
  await expect(notice.locator('a')).toHaveAttribute('href', '/writing/typeless-hyprland-terminal-paste/');
});

test('RSS 可取得且為合法 XML', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('<rss');
  expect(body).toContain('<item>');
});
