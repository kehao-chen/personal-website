import { test, expect, type Page } from '@playwright/test';

/**
 * 球體的角度活在 WebGL 裡，DOM 上看不到。`DitherHandle` 因此把目前的角度掛在
 * `window.__dither.spin` 上，這些測試就是靠它觀察。
 */
async function spinY(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as {
    __dither?: { spin: { x: number; y: number } };
  }).__dither?.spin.y ?? Number.NaN);
}

async function spinX(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as {
    __dither?: { spin: { x: number; y: number } };
  }).__dither?.spin.x ?? Number.NaN);
}

/** 角度與頁面內的時間戳一起取，量速度時才不會把 evaluate 的往返算進去 */
async function sample(page: Page): Promise<{ y: number; t: number }> {
  return page.evaluate(() => ({
    y: (window as unknown as { __dither?: { spin: { y: number } } }).__dither?.spin.y ?? Number.NaN,
    t: performance.now(),
  }));
}

/** 量一段時間內 y 軸的平均角速度（rad/s），分母用頁面內量到的真實經過時間 */
async function angularSpeedY(page: Page, windowMs = 400): Promise<number> {
  const before = await sample(page);
  await page.waitForTimeout(windowMs);
  const after = await sample(page);
  return (after.y - before.y) / ((after.t - before.t) / 1000);
}

/** 等抖色算繪器就緒、開場序列播完，畫面進入穩定狀態 */
async function ready(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(
    () => (window as unknown as { __dither?: { active: boolean } }).__dither?.active === true,
    undefined,
    { timeout: 15_000 },
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('seq-pending')), {
      timeout: 15_000,
    })
    .toBe(false);
}

/**
 * BASE_SPIN.vy：沒人碰的時候 y 軸每秒轉多少弧度。
 *
 * 只用在「這段時間最多漂多少」的寬鬆上限。判斷快慢一律改用同一個 page 上
 * 現場量到的基準值：測試平行跑的時候幀率會被餓，而 advance() 的 MAX_STEP
 * 會丟掉每幀多出來的真實時間，連基礎轉速都會一起變慢。拿絕對值當門檻的話
 * 量到的是那台機器有多忙，不是這段程式對不對。
 */
const BASE_VY = 0.14;

/**
 * 從背景空白處往右拖 `distance` 像素。
 *
 * 必須用 `{ steps }` 讓 Playwright 一次送出整串移動事件：一步一次 `mouse.move`
 * 是一次 CDP 往返（每步上百毫秒），最後一次移動到放手會超過 FLICK_WINDOW_MS，
 * 被正確地判定成「停住才放手」而沒有慣性——那是測試的輸入不像人，不是實作壞了。
 */
async function dragRight(page: Page, distance = 220): Promise<void> {
  const box = page.viewportSize();
  if (!box) throw new Error('沒有 viewport 尺寸');
  const y = box.height - 90;
  const x = 120;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + distance, y, { steps: 12 });
  await page.mouse.up();
}

/**
 * 在頁面內直接派送一整串 PointerEvent，模擬一次快速甩動。
 *
 * 為什麼不用 `page.mouse`：那條路每個事件都是一次 CDP 往返，機器一忙就被拉到
 * 每步上百毫秒，最後一次移動到放手會超過 FLICK_WINDOW_MS，於是被正確地判定成
 * 「停住才放手」而沒有慣性。那量到的是 Playwright 的事件時序，不是這段程式。
 *
 * 這裡派送的是真的 PointerEvent，跑的是真的 window 監聽器與真的 flick()，
 * 只有時序由測試決定——所以在任何負載下結果都一樣。
 */
async function flickRight(page: Page, dxPx: number, steps = 8): Promise<void> {
  await page.evaluate(
    ({ dxPx, steps }) => {
      const y = window.innerHeight - 90;
      const x0 = 120;
      const el = document.elementFromPoint(x0, y) ?? document.body;
      const fire = (type: string, x: number): void => {
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            composed: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: y,
          }),
        );
      };
      fire('pointerdown', x0);
      for (let i = 1; i <= steps; i += 1) fire('pointermove', x0 + (dxPx * i) / steps);
      fire('pointerup', x0 + dxPx);
    },
    { dxPx, steps },
  );
}

/** 這段時間內光靠基礎轉速最多會漂多少弧度，加一點量測誤差的餘裕 */
function driftAllowance(elapsedMs: number): number {
  return BASE_VY * (elapsedMs / 1000) + 0.15;
}

test.describe('首頁：撥動線框球', () => {
  test('往右拖會把球轉過去，幅度遠大於自然漂移', async ({ page }) => {
    await ready(page, '/');
    const before = await spinY(page);
    await dragRight(page, 220);
    const after = await spinY(page);

    // PX_PER_RAD = 220，所以拖 220px 就是一整弧度
    expect(after - before, '往右拖沒有把球轉過去').toBeGreaterThan(0.7);

    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(selected, '撥球的時候順手把頁面文字選起來了').toBe('');
  });

  test('垂直拖轉的是另一個軸', async ({ page }) => {
    await ready(page, '/');
    const beforeX = await spinX(page);
    const box = page.viewportSize()!;
    await page.mouse.move(120, box.height - 90);
    await page.mouse.down();
    await page.mouse.move(120, box.height - 250, { steps: 12 });
    await page.mouse.up();

    expect(await spinX(page) - beforeX, '垂直拖沒有轉 x 軸').toBeLessThan(-0.5);
  });

  test('放手之後角速度逐漸回到原本的轉速', async ({ page }) => {
    await ready(page, '/');

    // 這一頁此刻的基礎轉速：後面所有快慢都跟它比
    const base = await angularSpeedY(page, 600);

    await flickRight(page, 320);

    const justAfter = await angularSpeedY(page, 300);
    expect(justAfter, `放手之後球沒有帶著慣性繼續轉（基準 ${base.toFixed(3)}）`)
      .toBeGreaterThan(base * 3);

    // RELAX_TAU = 1.6s，安靜的機器上五個時間常數就夠。但 advance() 的 MAX_STEP
    // 會在幀被餓的時候丟掉時間，牆鐘八秒不保證走完八秒的模擬時間——所以不寫死
    // 等待，改成等它收斂，逾時就是真的沒有回歸。
    await expect
      .poll(() => angularSpeedY(page, 400), { timeout: 30_000, intervals: [400] })
      .toBeLessThan(base * 2);

    // 上面那條只證明「慢下來了」。poll 一達標就結束，量到的還在下降途中——
    // 衰減到零的版本也會通過（實測過，那是條不承重的測試）。真正要驗的是
    // 「停在基礎轉速」，所以再等一段時間，讓任何持續衰減都掉到容許範圍以外。
    await page.waitForTimeout(10_000);
    const settled = await angularSpeedY(page, 1000);

    // 上界放寬：base 與 settled 之間隔了數十秒，其他 worker 的負載變化會讓
    // 兩次量測的幀率條件不同。真正承重的是下界——衰減到零的版本會卡在那裡。
    const detail = `基準 ${base.toFixed(3)} / 收斂後 ${settled.toFixed(3)}`;
    expect(settled, `球慢慢停下來了，應該回到原本的轉速而不是零（${detail}）`)
      .toBeGreaterThan(base * 0.5);
    expect(settled, `球沒有回到原本的轉速，還在超速（${detail}）`).toBeLessThan(base * 2.5);
  });

  test('從 .profile 視窗上開始的拖拽不會撥到球', async ({ page }) => {
    await ready(page, '/');
    await page.getByRole('button', { name: /profile/i }).click();
    const win = page.locator('#profile-window');
    await expect(win).toBeVisible();

    const box = (await win.boundingBox())!;
    const before = await spinY(page);
    const started = Date.now();
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    const delta = await spinY(page) - before;

    // 只有基礎轉速造成的漂移；真的撥到的話會多出整整一弧度
    expect(delta, '從視窗上拖拽把球撥走了').toBeLessThan(driftAllowance(Date.now() - started));
  });
});

test.describe('非首頁：球只是背景', () => {
  test('/about/ 上拖拽不會撥動球', async ({ page }) => {
    await ready(page, '/about/');
    const before = await spinY(page);
    const started = Date.now();
    await dragRight(page, 220);
    const delta = await spinY(page) - before;
    expect(delta, '背景頁的球被拖動了').toBeLessThan(driftAllowance(Date.now() - started));
  });
});
