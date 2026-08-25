import { test, expect, type Page } from '@playwright/test';

/**
 * 這個檔案補的是整個測試套件原本的盲點：其他 spec 一律用 `page.goto()`
 * （完整文件載入）斷言，唯一會點連結的 `nav-glitch.spec.ts` 也只看
 * `.fx-layer` 有沒有出現。但 `#fx` 用了 `transition:persist`，它的狀態正是
 * 跨換頁活著的那一份——「點連結逛第二頁」是訪客真正的使用方式，卻沒有任何
 * 護欄。C1（同一張 canvas 上長出第二個算繪器）與 I1（換頁進文章後殘留凍住的
 * 一幀）都活在這裡。
 *
 * 兩個探針都用 `addInitScript` 從外部觀察，不需要在產品程式碼裡開測試後門：
 *  - `__ditherContexts`：`#dither-canvas` 上成功取得 WebGL context 的次數，
 *    等於這張 canvas 上被建構出來的算繪器數量。
 *  - `__lastGlOp`：最後一個 GL 動作是畫（draw）還是清（clear）。正常算繪的
 *    每一幀都以畫收尾，所以「停止算繪並清乾淨」的唯一可觀察證據，就是最後
 *    一個動作是 clear。
 */
async function instrumentGl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe = window as unknown as {
      __ditherContexts: number;
      __lastGlOp: string | null;
    };
    probe.__ditherContexts = 0;
    probe.__lastGlOp = null;

    // 原生 getContext 是多載簽章，這裡當成寬鬆的 unknown[] 函式攔截就夠了
    const canvasProto = HTMLCanvasElement.prototype as unknown as {
      getContext: (...args: unknown[]) => unknown;
    };
    const originalGetContext = canvasProto.getContext;
    canvasProto.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) {
      const result = originalGetContext.apply(this, args);
      const wantsWebGL = args[0] === 'webgl' || args[0] === 'webgl2';
      // 只算那張持久化的 canvas；能力探測用的是另外 new 出來的暫時 canvas
      if (wantsWebGL && result && this.id === 'dither-canvas') {
        probe.__ditherContexts += 1;
      }
      return result;
    };

    const ops: Array<[string, string]> = [
      ['drawArrays', 'draw'],
      ['drawElements', 'draw'],
      ['clear', 'clear'],
    ];
    for (const ctor of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const proto = ctor.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
      for (const [method, op] of ops) {
        const original = proto[method];
        proto[method] = function (this: unknown, ...args: unknown[]) {
          probe.__lastGlOp = op;
          return original.apply(this, args);
        };
      }
    }
  });
}

function ditherContexts(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __ditherContexts: number }).__ditherContexts,
  );
}

test('從文章索引點回首頁：持久化 canvas 上始終只有一個算繪器', async ({ page }) => {
  await instrumentGl(page);
  await page.goto('/writing/');
  await page.waitForFunction(
    () => (window as unknown as { __ditherContexts: number }).__ditherContexts === 1,
  );

  await page.getByRole('link', { name: 'HOME' }).click();
  // 字串形式是完整比對（baseURL + '/'）；`/\/$/` 這種正規表示式連 /writing/
  // 都會匹配，換頁還沒發生時斷言就先過了。
  await expect(page).toHaveURL('/');
  // 序列真的播完（不是被另一個算繪器蓋掉卻照樣把 sessionStorage 標記成播過）
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  expect(await ditherContexts(page), '換頁不該在同一張 canvas 上再建一個算繪器').toBe(1);
});

test('先逛過 about 再點回首頁，字標仍然由 WebGL 負責畫出來', async ({ page }) => {
  await instrumentGl(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/gl-active/, { timeout: 10_000 });

  await page.getByRole('link', { name: 'ABOUT' }).click();
  await expect(page).toHaveURL(/\/about\/$/);

  await page.getByRole('link', { name: 'HOME' }).click();
  await expect(page).toHaveURL('/');

  await expect(page.locator('.wordmark')).toHaveCount(1);
  // 換頁時 swapRootAttributes 會把 <html> 上所有執行期加的 class 清掉；
  // gl-active 沒有被加回來，就代表沒有人重新決定這條路由該長什麼樣——
  // 字標於是只剩下 DOM 那一層（或兩層都沒有）。
  await expect(page.locator('html')).toHaveClass(/gl-active/);
  expect(await ditherContexts(page)).toBe(1);
});

test('換頁進入文章內頁後，抖色畫布被清乾淨而不是凍在最後一幀', async ({ page }) => {
  await instrumentGl(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  await page.getByRole('link', { name: 'WRITING' }).click();
  await expect(page).toHaveURL(/\/writing\/$/);
  await page.locator('.post-row').first().click();
  await expect(page).toHaveURL(/\/writing\/[^/]+\/$/);

  // 正常算繪的每一幀都以 draw 收尾。進入閱讀模式後最後一個 GL 動作若還是
  // draw，就表示上一頁的最後一幀還留在畫布上，壓在文章底下。
  await page.waitForTimeout(500);
  const lastOp = await page.evaluate(
    () => (window as unknown as { __lastGlOp: string | null }).__lastGlOp,
  );
  expect(lastOp, '進入閱讀模式時必須主動清畫布').toBe('clear');
});
