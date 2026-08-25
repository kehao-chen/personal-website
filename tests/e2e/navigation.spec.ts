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

  for (const path of ['/zh/about/', '/zh/writing/', '/zh/writing/aks-lun-exhaustion/']) {
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
 * zh 目前只有一篇文章，篩不篩都是同一篇——`toBeLessThanOrEqual` 這種寬鬆比較
 * 對「篩選被改成 no-op」完全沒有防禦力（篩前篩後都是 1，恆成立）。改用英文
 * 語系斷言真正的數字：英文有兩篇文章、標籤不重疊（見
 * `src/content/posts/en/kubectl-debug-toolbox.md` 這篇只掛 KUBERNETES
 * 標籤），篩到只剩一篇才算篩選真的在動作。
 */
test('標籤篩選會縮小清單', async ({ page }) => {
  await page.goto('/writing/');
  const before = await page.locator('.post-row').count();
  expect(before, '英文文章總數').toBe(2);

  await page.goto('/writing/tag/kubernetes/');
  const after = await page.locator('.post-row').count();
  expect(after, '掛 KUBERNETES 標籤的文章數').toBe(1);
  expect(after).toBeLessThan(before);

  // 被篩掉的那篇（沒有 KUBERNETES 標籤）不該出現在篩選後的清單裡
  await expect(page.locator('.post-row')).not.toContainText(
    'Designing an Approval Orchestrator for LLM Agents',
  );
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
