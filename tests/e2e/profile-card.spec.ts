import { test, expect, type Page } from '@playwright/test';

/**
 * `.profile` 從三行散文改成欄位卡片。這些測試守的是「資訊架構」而不是排版：
 * 欄位齊不齊、兩個語言是不是同一份結構、外部連結安不安全。
 */

const FIELDS = ['WHO', 'NOW', 'STACK', 'WHERE', 'LINKS'];

/** 序列進行中的點擊會被當成「跳過序列」吃掉，所以一定要等序列結束再點 */
async function openProfile(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 15_000 });
  await page.locator('.desktop-icon').click();
  await expect(page.locator('#profile-window')).toBeVisible();
}

for (const [name, path] of [['英文', '/'], ['中文', '/zh/']] as const) {
  test(`${name}首頁的 .profile 五個欄位都在，而且都有值`, async ({ page }) => {
    await openProfile(page, path);

    const keys = await page.locator('#profile-window .vim-field dt').allTextContents();
    expect(keys.map((k) => k.trim()), '欄位或順序不對').toEqual(FIELDS);

    const values = await page.locator('#profile-window .vim-field dd').allTextContents();
    for (const [i, value] of values.entries()) {
      expect(value.trim(), `${FIELDS[i]} 沒有值`).not.toBe('');
    }
  });

  test(`${name}首頁的 .profile 外部連結會開新分頁而且加了 noopener`, async ({ page }) => {
    await openProfile(page, path);
    const links = page.locator('#profile-window .vim-field dd a');
    await expect(links).toHaveCount(3);

    const attrs = await links.evaluateAll((els) =>
      els.map((el) => ({
        href: el.getAttribute('href'),
        target: el.getAttribute('target'),
        rel: el.getAttribute('rel') ?? '',
      })),
    );
    for (const a of attrs) {
      expect(a.href, `${a.href} 不是 https`).toMatch(/^https:\/\//);
      expect(a.target, `${a.href} 沒有開新分頁`).toBe('_blank');
      expect(a.rel, `${a.href} 少了 noopener`).toContain('noopener');
    }
  });

  test(`${name}首頁的 .profile 收在一句 motto`, async ({ page }) => {
    await openProfile(page, path);
    await expect(page.locator('#profile-window .vim-motto')).not.toBeEmpty();
  });
}

test('兩個語言的 .profile 是同一份結構，但值真的各寫一份', async ({ page }) => {
  const read = async (path: string) => {
    await openProfile(page, path);
    return page.locator('#profile-window .vim-field').evaluateAll((rows) =>
      rows.map((row) => ({
        key: row.querySelector('dt')?.textContent?.trim() ?? '',
        value: row.querySelector('dd')?.textContent?.trim() ?? '',
      })),
    );
  };

  const en = await read('/');
  const zh = await read('/zh/');

  expect(zh.map((f) => f.key), '兩個語言的欄位鍵名不一致').toEqual(en.map((f) => f.key));

  // STACK 幾乎都是專有名詞，兩邊本來就一樣；WHO 一定要各寫一份
  const enWho = en.find((f) => f.key === 'WHO')!.value;
  const zhWho = zh.find((f) => f.key === 'WHO')!.value;
  expect(zhWho, '中文版的 WHO 沒有翻譯，是複製貼上的').not.toBe(enWho);
});

test('.profile 不再是 about 前兩段的縮寫', async ({ page }) => {
  await openProfile(page, '/zh/');
  const card = (await page.locator('#profile-window .vim-body').textContent()) ?? '';

  await page.goto('/zh/about/');
  const about = (await page.locator('.prose').textContent()) ?? '';

  // 兩邊都會出現的那句 motto 不算重複，其餘的長句不該原封不動出現在兩個地方
  const motto = '焦慮來自於算力不足';
  const sentences = card
    .replace(motto, '')
    .split(/[。·\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);

  expect(sentences.length, '卡片上沒有足夠長的句子可以檢查').toBeGreaterThan(0);
  for (const sentence of sentences) {
    expect(about.includes(sentence), `這句在 about 裡原封不動又出現一次：${sentence}`).toBe(false);
  }
});

/**
 * 640px 以下 .desktop 整個 display:none，所以「窄畫面」對這個視窗而言就是
 * 斷點正上方那一點點寬度。標籤欄是固定的 4.4rem，值分到多少要在這裡守著。
 */
test('斷點正上方的視窗裡，值仍分得到大部分寬度', async ({ page }) => {
  await page.setViewportSize({ width: 660, height: 720 });
  await openProfile(page, '/zh/');

  const measured = await page.locator('#profile-window .vim-field').evaluateAll((rows) =>
    rows.map((row) => ({
      key: row.querySelector('dt')?.textContent?.trim() ?? '',
      ratio: (row.querySelector('dd') as HTMLElement).clientWidth / (row as HTMLElement).clientWidth,
    })),
  );

  expect(measured.length).toBe(5);
  for (const { key, ratio } of measured) {
    expect(ratio, `${key} 的值只分到 ${(ratio * 100).toFixed(0)}% 的寬度`).toBeGreaterThan(0.55);
  }
});
