import type { Page } from '@playwright/test';

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

/**
 * 導覽到 `path`，回傳這次導覽有沒有載入含 three.js 的 chunk。
 *
 * `response.text()` 在極少數情況下會因為請求被取消而 reject（例如頁面在讀取
 * 回應內容前就跳轉了）。這裡選擇吞掉那個例外而不是讓它整個測試爆炸，因為
 * 這通常代表「這個回應本來就跟這次導覽沒關係」；代價是——如果真正載入
 * three.js 的那個回應恰好是被取消的那個，這裡會誤判成「沒載入」。在對著
 * 靜態 preview server 的場景下機率很低，記在這裡供未來排查用。
 */
export async function loadedThreeJs(page: Page, path: string): Promise<boolean> {
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
          /* 見上方註解：回應被取消時忽略，不讓測試因為無關的請求而爆炸 */
        }),
    );
  });

  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);

  return found;
}
