import { test, expect } from '@playwright/test';

const caret = '.site-nav .brand .brand-caret';

test('每一頁的品牌後面都跟著一個會閃的游標', async ({ page }) => {
  for (const path of ['/', '/writing/', '/zh/about/']) {
    await page.goto(path);
    const box = await page.locator(caret).boundingBox();
    expect(box, `${path} 的游標應該有版面盒`).not.toBeNull();
    // 實心方塊，不是塌成零寬的空 span
    expect(box!.width).toBeGreaterThan(2);
    expect(box!.height).toBeGreaterThan(6);

    const name = await page.locator(caret).evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    expect(name, `${path} 的游標沒有套到閃爍動畫`).toBe('brand-caret');
  }
});

/**
 * 游標曾經是 1em 高再用負的 vertical-align 往下推，結果方塊上下各多出約 1.5px，
 * 看起來像浮在字旁邊而不是跟字站在同一條線上。這裡把「下緣坐在基線、上緣齊
 * cap height」釘死。
 *
 * 基線用一個臨時的空 inline-block 探針量：空的 inline-block 以下緣當基線，
 * 這是與游標本身的樣式無關的獨立參照。cap height 則從 canvas 的
 * actualBoundingBoxAscent 取——品牌是全大寫，那個值就是大寫字母的實際墨高。
 */
test('游標下緣坐在文字基線上，上緣齊大寫字高', async ({ page }) => {
  await page.goto('/');

  const m = await page.evaluate(() => {
    const brand = document.querySelector('.site-nav .brand') as HTMLElement;
    const caret = document.querySelector('.brand-caret') as HTMLElement;

    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:1px;height:10px';
    brand.appendChild(probe);
    const baseline = probe.getBoundingClientRect().bottom;
    probe.remove();

    const cs = getComputedStyle(brand);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const capHeight = ctx.measureText(brand.textContent ?? '').actualBoundingBoxAscent;

    const box = caret.getBoundingClientRect();
    return { baseline, capHeight, top: box.top, bottom: box.bottom, height: box.height };
  });

  // 半個 CSS 像素的容差：夠緊，抓得到 1px 以上的偏移；夠鬆，不會被次像素捨入誤傷
  expect(Math.abs(m.bottom - m.baseline), '游標下緣沒有坐在基線上').toBeLessThan(0.5);
  expect(Math.abs(m.height - m.capHeight), '游標高度不等於大寫字高').toBeLessThan(0.5);
});

test('游標不進無障礙樹，品牌連結的名稱維持乾淨', async ({ page }) => {
  await page.goto('/');
  const brand = page.locator('.site-nav .brand');
  // 空的 aria-hidden span 不該替連結加上任何可讀內容
  await expect(brand).toHaveText('HAPPYHACKING.NINJA');
  await expect(page.locator(caret)).toHaveAttribute('aria-hidden', 'true');
});

test.describe('prefers-reduced-motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  /**
   * 動畫只負責「把游標按掉」，基準狀態是亮著的——所以關掉動畫之後游標不會
   * 剛好停在隱形的那一格，而是常亮。這正是想要的退化行為：不閃，但看得見。
   */
  test('關掉動態效果後游標不閃，但仍然看得見', async ({ page }) => {
    await page.goto('/');
    const opacity = await page.locator(caret).evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(opacity).toBe('1');
  });
});
