import { test, expect, type Page } from '@playwright/test';

/**
 * `nav-glitch.ts` 只在「兩端都是門面路由」且沒有「減少動態效果」時才觸發
 * datamosh 轉場：換頁瞬間會在 `#fx-layers` 底下插入 `.fx-layer` 分層元素，
 * 約 420ms 後自己清掉。這裡不看 URL 有沒有變（那只證明換頁發生了），而是
 * 直接觀察轉場真正留下的痕跡——`.fx-layer` 元素本身。
 *
 * 分層元素活著的時間很短（幾百毫秒），事後才去 `toHaveCount(0)`
 * 沒辦法區分「本來就沒發生」跟「發生過，但已經自動清掉了」——兩者最終都是
 * 0。所以「不該觸發」的斷言改用 MutationObserver：換頁前先掛上去監看
 * `#fx-layers`，換頁後不管有沒有清掉，只要曾經新增過節點就記下來。
 * `#fx-layers` 的父節點 `#fx` 有 `transition:persist`，跨頁不會被整個
 * 重建，所以換頁前掛的 observer 換頁後還在監看同一個節點。
 */
async function watchForFxLayer(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = document.getElementById('fx-layers');
    (window as unknown as { __sawFxLayer: boolean }).__sawFxLayer = false;
    if (!host) return;
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.addedNodes.length > 0)) {
        (window as unknown as { __sawFxLayer: boolean }).__sawFxLayer = true;
      }
    });
    observer.observe(host, { childList: true });
  });
}

async function sawFxLayer(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { __sawFxLayer?: boolean }).__sawFxLayer ?? false,
  );
}

test('門面路由之間換頁會觸發故障轉場', async ({ page }) => {
  await page.goto('/');
  await watchForFxLayer(page);
  await page.getByRole('link', { name: 'WRITING' }).click();

  // 轉場全長只有 420ms：給它一個保守但不會拖太久的觀察窗。
  await page.waitForTimeout(800);

  expect(await sawFxLayer(page), '換頁時應該出現過 .fx-layer').toBe(true);
  await expect(page).toHaveURL(/\/writing\/?$/);
});

test('離開文章內頁換頁不會觸發故障轉場', async ({ page }) => {
  await page.goto('/writing/approval-orchestrator/');
  await watchForFxLayer(page);
  await page.locator('a.brand').click();

  await page.waitForTimeout(800);

  expect(await sawFxLayer(page), '離開文章內頁不該出現 .fx-layer').toBe(false);
  await expect(page).toHaveURL(/\/$/);
});

test('減少動態效果時換頁不會觸發故障轉場', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await watchForFxLayer(page);
  await page.getByRole('link', { name: 'WRITING' }).click();

  await page.waitForTimeout(800);

  expect(await sawFxLayer(page), '減少動態效果時不該出現 .fx-layer').toBe(false);
  await expect(page).toHaveURL(/\/writing\/?$/);
});
