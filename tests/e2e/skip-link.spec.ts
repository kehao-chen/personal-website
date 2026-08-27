import { test, expect } from '@playwright/test';

/**
 * 跳至主要內容：鍵盤使用者的第一個 Tab。它平常停在畫面外（top: -120px），
 * 拿到焦點才滑進來，所以斷言要等轉場跑完再量位置。
 */
test('第一個 Tab 就是跳至主要內容，按下去焦點落在 main', async ({ page }) => {
  await page.goto('/writing/');

  await page.keyboard.press('Tab');
  const link = page.locator('.skip-link');
  await expect(link).toBeFocused();

  // 進到畫面內（轉場 150ms）
  await expect.poll(async () => {
    const box = await link.boundingBox();
    return box ? box.y : -1;
  }).toBeGreaterThan(0);

  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main-content');
});

test('每一種版面都有可跳轉的目標', async ({ page }) => {
  // 首頁（layout-front）、索引（layout-list）、文章（layout-reading）、404 各一
  for (const path of ['/', '/writing/', '/writing/approval-orchestrator/', '/zh/about/', '/404']) {
    await page.goto(path);
    const target = page.locator('#main-content');
    await expect(target, `${path} 少了跳轉目標`).toHaveCount(1);
    // tabindex="-1" 才能讓焦點真的停在容器上，而不是被瀏覽器略過
    await expect(target).toHaveAttribute('tabindex', '-1');
  }
});

test('沒拿到焦點時不佔畫面，也不擋住導覽列', async ({ page }) => {
  await page.goto('/writing/');
  const box = await page.locator('.skip-link').boundingBox();
  expect(box, '跳轉連結應該還在版面上（只是被推到畫面外），才聚焦得到').not.toBeNull();
  expect(box!.y + box!.height, '跳轉連結沒被推出畫面').toBeLessThan(0);
});
