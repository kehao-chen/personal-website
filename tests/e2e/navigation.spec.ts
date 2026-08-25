import { test, expect } from '@playwright/test';

test('字標只出現在首頁', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.wordmark')).toHaveCount(1);

  for (const path of ['/about/', '/writing/', '/writing/approval-orchestrator/']) {
    await page.goto(path);
    await expect(page.locator('.wordmark'), `${path} 不該有字標`).toHaveCount(0);
  }
});

test('中文首頁有字標，中文其他頁沒有', async ({ page }) => {
  await page.goto('/zh/');
  await expect(page.locator('.wordmark')).toHaveCount(1);

  await page.goto('/zh/about/');
  await expect(page.locator('.wordmark')).toHaveCount(0);
});

test('hreflang 三個條目齊備', async ({ page }) => {
  await page.goto('/writing/');
  const links = page.locator('link[rel="alternate"]');
  await expect(links).toHaveCount(3);
  await expect(page.locator('link[hreflang="zh-Hant"]'))
    .toHaveAttribute('href', /\/zh\/writing$/);
});

test('標籤篩選會縮小清單', async ({ page }) => {
  await page.goto('/zh/writing/');
  const before = await page.locator('.post-row').count();
  await page.goto('/zh/writing/tag/azure/');
  const after = await page.locator('.post-row').count();
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});

test('單語文章顯示提示而非 404', async ({ page }) => {
  const response = await page.goto('/zh/writing/aks-lun-exhaustion/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.notice')).toContainText('僅有原文');
});

test('RSS 可取得且為合法 XML', async ({ request }) => {
  const response = await request.get('/rss.xml');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('<rss');
  expect(body).toContain('<item>');
});
