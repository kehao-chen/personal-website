import { test, expect } from '@playwright/test';
/**
 * `tokens.test.ts` 只讀 tokens.css，證明不了「出貨的顏色來自這些 token」。
 * Shiki 預設主題是把 GitHub 的顏色寫成 inline style（含 #24292e 背景），
 * specificity 壓過 `.prose pre`——擋得住這件事的只有對輸出的斷言。
 */
test('程式碼區塊用站上的配色，而不是 Shiki 預設主題', async ({ page }) => {
  await page.goto('/writing/approval-orchestrator/');
  const pre = page.locator('.prose pre').first();
  await expect(pre).toBeVisible();

  const styles = await pre.evaluate((el) => {
    const own = getComputedStyle(el);
    const token = el.querySelector('span[style*="--astro-code-token"]');
    return {
      background: own.backgroundColor,
      hasTokenVars: Boolean(token),
      tokenColor: token ? getComputedStyle(token).color : null,
    };
  });

  expect(styles.background, '--panel').toBe('rgb(27, 26, 35)');
  expect(styles.hasTokenVars, '語法 token 應該走 --astro-code-* 變數').toBe(true);
  // 解析得出顏色，代表 --astro-code-token-* 真的接上了 --syntax-*
  expect(styles.tokenColor).toMatch(/^rgb/);
});
