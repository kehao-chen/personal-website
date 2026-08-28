import { test, expect } from '@playwright/test';

/**
 * 證照的驗證連結看得見的字都一樣（verify／驗證），螢幕閱讀器的連結清單會把
 * 連結抽離表格列來唸——五個一模一樣的名稱在那個清單裡分不出誰是誰，所以要靠
 * aria-label 帶上證照名。
 */
for (const [name, path, verb] of [['英文', '/about/', 'verify'], ['中文', '/zh/about/', '驗證']] as const) {
  test(`${name}關於頁的驗證連結各自有可辨識的無障礙名稱`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator('.prose table tbody a');
    await expect(links).toHaveCount(5);

    const names = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? ''),
    );
    expect(new Set(names).size, `五個連結的名稱撞在一起：${names.join(' / ')}`).toBe(5);
    for (const n of names) expect(n.startsWith(`${verb} `), `「${n}」沒有帶上證照名`).toBe(true);

    // 看得見的字維持短的動詞
    for (const text of await links.allTextContents()) expect(text.trim()).toBe(verb);
  });

  test(`${name}關於頁的證照表格與另一個語言版本是同一份資料`, async ({ page }) => {
    await page.goto(path);
    const hrefs = await page.locator('.prose table tbody a').evaluateAll(
      (els) => els.map((el) => el.getAttribute('href')),
    );
    expect(hrefs.every((h) => h?.startsWith('https://'))).toBe(true);
    expect(new Set(hrefs).size, '驗證連結有重複').toBe(5);
  });
}

test('兩個語言版本的證照連結完全一致（共用同一份資料，不會各自走鐘）', async ({ page }) => {
  const read = async (path: string) => {
    await page.goto(path);
    return page.locator('.prose table tbody tr').evaluateAll((rows) =>
      rows.map((r) => ({
        name: r.children[0].textContent?.trim(),
        issuer: r.children[1].textContent?.trim(),
        href: r.querySelector('a')?.getAttribute('href'),
      })),
    );
  };
  expect(await read('/about/')).toEqual(await read('/zh/about/'));
});

test('關於頁的狀態列連結指向正確的來源，外部連結才開新分頁', async ({ page }) => {
  await page.goto('/about/');
  const rss = page.locator('.win-foot a', { hasText: 'RSS' });
  await expect(rss).toHaveAttribute('href', '/rss.xml');
  await expect(rss).not.toHaveAttribute('target', '_blank');

  const github = page.locator('.win-foot a', { hasText: 'GITHUB' });
  await expect(github).toHaveAttribute('target', '_blank');
  // 開新分頁一定要帶 noopener，否則新分頁能透過 window.opener 反向操作原頁
  await expect(github).toHaveAttribute('rel', /noopener/);

  await page.goto('/zh/about/');
  await expect(page.locator('.win-foot a', { hasText: 'RSS' })).toHaveAttribute('href', '/zh/rss.xml');
});

/**
 * 表格的儲存格不再被 white-space: nowrap 綁住。窄畫面上證照名（最長的
 * 「CKA: Certified Kubernetes Administrator」）該折成多行，而不是把整張表
 * 撐成一條只能橫捲的長條。剩下真的塞不下的部分才交給 overflow-x。
 */
test('窄畫面的證照名稱會折行，不是整欄硬撐', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/about/');

  // 用 Range 數行框：每個 client rect 就是一行，比拿 clientHeight 去除
  // line-height 可靠（儲存格的 line-height 是 normal，除不出整數）
  const wrapped = await page.locator('.prose table tbody tr').last().evaluate((row) => {
    const cell = row.children[0];
    const range = document.createRange();
    range.selectNodeContents(cell);
    return { lines: range.getClientRects().length, text: cell.textContent?.trim() };
  });
  expect(wrapped.lines, `「${wrapped.text}」只排成一行，代表沒有折行`).toBeGreaterThan(1);

  // 表格再寬也不能撐破頁面（超出的部分由 overflow-x 自己捲）
  const doc = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(doc.sw).toBeLessThanOrEqual(doc.cw);
});

/**
 * 資訊架構：小標的順序就是這一頁的敘事。
 * 「現在在做什麼」與「長期能力」分開兩個小標——它們的更新週期差很多，綁在
 * 同一個標題底下的結果是兩邊都不會被更新。
 */
const HEADINGS = {
  '/about/': ['About', 'Now', 'What I do', "A few things I'm stubborn about", 'Certifications', 'Elsewhere'],
  '/zh/about/': ['關於', '近況', '我做什麼', '幾條偏執', '證照', '在其他地方'],
} as const;

for (const [path, expected] of Object.entries(HEADINGS)) {
  test(`${path} 的小標順序就是它的敘事`, async ({ page }) => {
    await page.goto(path);
    const headings = await page.locator('.prose h1, .prose h2').allTextContents();
    expect(headings.map((h) => h.trim())).toEqual([...expected]);
  });
}

test('兩個語言的 about 是同一個資訊架構', async ({ page }) => {
  const count = async (path: string) => {
    await page.goto(path);
    return page.locator('.prose h1, .prose h2').count();
  };
  expect(await count('/zh/about/')).toBe(await count('/about/'));
});

test('近況段落標了更新月份——沒更新就看得出來', async ({ page }) => {
  for (const path of ['/about/', '/zh/about/']) {
    await page.goto(path);
    const now = page.locator('.prose [data-now-updated]');
    await expect(now, `${path} 的近況段沒有更新月份`).toHaveCount(1);
    expect(await now.getAttribute('datetime'), `${path} 的更新月份格式不對`)
      .toMatch(/^\d{4}-\d{2}$/);
  }
});

test('Elsewhere 段落把對外連結寫進正文，不是只躲在狀態列', async ({ page }) => {
  await page.goto('/about/');
  const links = page.locator('.prose h2:text-is("Elsewhere") ~ p a[href^="https://"]');
  expect(await links.count(), '正文裡沒有對外連結').toBeGreaterThan(0);
  for (const rel of await links.evaluateAll((els) => els.map((e) => e.getAttribute('rel') ?? ''))) {
    expect(rel, '外部連結少了 noopener').toContain('noopener');
  }
});
