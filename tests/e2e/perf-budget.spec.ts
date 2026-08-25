import { test, expect, type Page } from '@playwright/test';

/**
 * 這個 build 沒有設定 manualChunks 做 vendor 拆分：`../lib/dither` 動態 import
 * 進來的模組跟它直接依賴的 three.js 會被打包進同一個雜湊檔名的 chunk（例如
 * `index.HtVPQqrP.js`），檔名本身不含 "three"。單純比對請求 URL（brief 原本
 * 的寫法）在這個 build 設定下永遠比對不到，連首頁都會誤判成沒載入——這不是
 * 網站的問題，是偵測方式的問題。改成檢查回應內容裡 three.js 才有的字串
 * （它自己印出的 banner，以及散落在原始碼裡的 `WebGLRenderer` 錯誤前綴），
 * 這樣才是真的在驗證「有沒有載入 three.js」，而不是「檔名裡有沒有 three」。
 */
const THREE_MARKER = /WebGLRenderer|three\.js r\d+/;

async function loadedThreeJs(page: Page, path: string): Promise<boolean> {
  let found = false;
  const pending: Promise<void>[] = [];

  page.on('response', (response) => {
    const contentType = response.headers()['content-type'] ?? '';
    if (!contentType.includes('javascript')) return;
    pending.push(
      response
        .text()
        .then((body) => {
          if (THREE_MARKER.test(body)) found = true;
        })
        .catch(() => {
          /* 回應可能在讀取前就被捨棄（例如被取消的請求），忽略即可 */
        }),
    );
  });

  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);

  return found;
}

/** 這條護欄防止未來的自己在文章頁加進 WebGL。 */
test('文章內頁不得載入 three.js', async ({ page }) => {
  const found = await loadedThreeJs(page, '/writing/approval-orchestrator/');
  expect(found, '不應載入含 three.js 的 chunk').toBe(false);
});

test('中文文章內頁同樣不得載入 three.js', async ({ page }) => {
  const found = await loadedThreeJs(page, '/zh/writing/aks-lun-exhaustion/');
  expect(found, '不應載入含 three.js 的 chunk').toBe(false);
});

test('首頁確實載入 three.js', async ({ page }) => {
  const found = await loadedThreeJs(page, '/');
  expect(found, '首頁應該載入含 three.js 的 chunk').toBe(true);
});
