import { test, expect, type Page } from '@playwright/test';

/**
 * 桌面上 .profile 預設是收起的，點圖示才展開——這幾乎是每個測試的前置條件。
 * 序列進行中的點擊會被當成「跳過序列」吃掉（見 profile-window.ts 的守衛），
 * 所以一定要等序列結束再點。
 */
async function openProfile(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await page.locator('.desktop-icon').click();
  await expect(page.locator('#profile-window')).toBeVisible();
}

test('英文首頁的 profile 內容住在 vim 視窗裡', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);
  const win = page.locator('.vim');
  await expect(win).toContainText('1x engineer');
  // 標題列與底部檔名列都顯示路徑
  await expect(win.locator('.vim-path')).toHaveText('~/.profile');
  await expect(win.locator('.vim-foot')).toContainText('~/.profile');
});

test('中文首頁同樣使用 vim 視窗', async ({ page }) => {
  await page.goto('/zh/');
  await openProfile(page);
  const win = page.locator('.vim');
  await expect(win).toContainText('1x 軟體工程師');
});

test('CSS counter 規則產生邏輯行號，不進無障礙樹也不進文字內容', async ({ page }) => {
  await page.goto('/');

  // 邏輯行數與內容驗證
  // 五個欄位（WHO / NOW / STACK / WHERE / LINKS）加最後那行 motto
  const lines = page.locator('.vim-line');
  await expect(lines).toHaveCount(6);

  // 行號不進文字內容：textContent 不含行號數字
  const bodyText = await page.locator('.vim-body').textContent();
  expect(bodyText).not.toMatch(/^\s*1\s/);

  // 驗證行號的 CSS counter 規則存在且參數正確。
  // 注意：這個測試驗的是「產生行號的 CSS 規則」，不是「渲染出來的數字長什麼樣」。
  // 後者需要視覺回歸基準圖，對這個規模不成比例。但這組規則足以捕捉常見的 bug：
  // 1. 整條規則被刪掉 → counterReset / counterIncrement 會變成 'none'
  // 2. counter-reset 的起始值改錯（例如 41 而非 0） → counterReset 可見
  // 3. counter-increment 的步進改錯 → counterIncrement 可見

  // counter-reset 與 counter-increment 的值在 computed style 裡是解析過的（不像 content
  // 裡的 counter() 函數被 Chromium 不解析），所以能被斷言。
  const counterReset = await page.locator('.vim-body').evaluate(
    (el) => getComputedStyle(el).counterReset,
  );
  expect(counterReset).toBe('vimline 0');

  const counterIncrement = await lines.first().evaluate(
    (el) => getComputedStyle(el).counterIncrement,
  );
  expect(counterIncrement).toBe('vimline 1');

  // 補充確認 ::before 偽元素的 content 規則存在
  // (Chromium 不解析函數值 "counter(vimline)"，但 "counter(...)" 不是 "none" 就證明規則有效)
  const firstBeforeContent = await lines.first().evaluate(
    (el) => getComputedStyle(el, '::before').content,
  );
  expect(firstBeforeContent).not.toBe('none');
  expect(firstBeforeContent).toContain('counter');
});

test('首頁不再有舊的終端機視窗', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.layout-front .win')).toHaveCount(0);
});

test('[x] 的點擊區達到 WCAG 2.5.8 的 24px', async ({ page }) => {
  await page.goto('/');
  // 視窗收起時 .vim（含 [x]）visibility:hidden，elementFromPoint 打不到它；
  // 先展開再量測，不然中心點本身就會落空。
  await openProfile(page);
  // 視覺盒刻意維持小尺寸（標題列高度由字級決定），熱區靠覆蓋式 ::after 撐開，
  // 所以量 boundingBox 量不到——要從中心往上下打點，看命中的是不是同一個按鈕。
  const height = await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>('.vim-close');
    if (!btn) return 0;
    const box = btn.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hits = (dy: number) => {
      const el = document.elementFromPoint(cx, cy + dy);
      return el === btn || btn.contains(el);
    };
    let up = 0;
    let down = 0;
    while (up < 40 && hits(-(up + 1))) up++;
    while (down < 40 && hits(down + 1)) down++;
    return up + down + 1;
  });
  expect(height).toBeGreaterThanOrEqual(24);
});

test('預設收起，點圖示展開，點 [x] 收回', async ({ page }) => {
  await page.goto('/');
  const desktop = page.locator('.desktop');
  const win = page.locator('#profile-window');
  const icon = page.locator('.desktop-icon');

  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(win).toBeHidden();
  await expect(desktop).not.toHaveAttribute('data-open', /.*/);
  await expect(icon).toHaveAttribute('aria-expanded', 'false');

  await icon.click();
  await expect(win).toBeVisible();
  await expect(desktop).toHaveAttribute('data-open', '');
  await expect(icon).toHaveAttribute('aria-expanded', 'true');

  await page.locator('.vim-close').click();
  await expect(win).toBeHidden();
  await expect(desktop).not.toHaveAttribute('data-open', /.*/);
  await expect(icon).toHaveAttribute('aria-expanded', 'false');
});

test('點 [x] 關閉視窗後，焦點移回桌面圖示（disclosure 收合後焦點該還給觸發它的控制項）', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);

  await page.locator('.vim-close').click();
  await expect(page.locator('#profile-window')).toBeHidden();
  await expect(page.locator('.desktop-icon')).toBeFocused();
});

/**
 * 收起的規則掛在 `html.js` 底下，而那個 class 由 <head> 的 inline script 加上。
 * 沒有 JS 就沒有 class，規則整條不生效——圖示按不動的情況下，視窗必須是開的，
 * 否則首頁唯一的自我介紹永遠讀不到。
 */
test('停用 JavaScript 時視窗是開的，內容完整可見', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#profile-window')).toBeVisible();
  await expect(page.locator('#profile-window')).toContainText('1x engineer');
  await ctx.close();
});

test('序列結束後視窗仍然收著，不會自己冒出來', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/seq-pending/);
  await expect(page.locator('#profile-window')).toBeHidden();

  // 序列跑到 chrome > 0 時 site-dither 會移除 seq-pending，其他內容硬切露出——
  // 但 .profile 是一個要點開的檔案，序列結束不等於幫使用者點開它
  await expect(page.locator('html')).not.toHaveClass(/seq-pending/, { timeout: 10_000 });
  await expect(page.locator('#profile-window')).toBeHidden();
  await expect(page.locator('.desktop')).not.toHaveAttribute('data-open', /.*/);
  await expect(page.locator('.desktop-icon')).toHaveAttribute('aria-expanded', 'false');
});

test('同一 session 第二次進首頁不播序列，視窗一樣要點才開', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });

  // 同一個 context 重新進入：head script 讀到 hh.sequence.played 就不會設 seq-pending
  await page.goto('/writing/');
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/seq-pending/);
  await expect(page.locator('#profile-window')).toBeHidden();

  await page.locator('.desktop-icon').click();
  await expect(page.locator('#profile-window')).toBeVisible();
});

test('換頁離開再回來，視窗重置為收起', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);

  await page.locator('.site-nav a[href="/writing/"]').click();
  await expect(page).toHaveURL(/\/writing\/$/);
  // `.site-nav a[href="/"]` 同時命中 .brand 與 HOME 這兩個連結（兩者都指向
  // 首頁）；用 .nav-link 縮小到真正的導覽項目，避免 strict mode violation。
  await page.locator('.site-nav .nav-link[href="/"]').click();
  await expect(page).toHaveURL(/localhost:4321\/$/);

  // 視窗活在 main.page 裡，換頁被整棵換掉；新的 DOM 沒有 data-open
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('展開後 ESC 關閉視窗', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);

  await page.keyboard.press('Escape');
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('展開後 :q 關閉視窗', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);

  await page.keyboard.press(':');
  await page.keyboard.press('q');
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('序列進行中按 ESC 是跳過序列，不會順手把視窗打開', async ({ page }) => {
  await page.goto('/');
  // 序列剛開始就按：這一下應該被序列的 skip 吃掉
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('視窗收起時，鍵盤打不開它（只有圖示是入口）', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(page.locator('#profile-window')).toBeHidden();

  await page.keyboard.press('Escape');
  await page.keyboard.press(':');
  await page.keyboard.press('q');
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('pendingColon 在換頁後重置，:q 不會誤關新頁面的視窗', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);

  // 按 `:` 設置 pendingColon = true
  await page.keyboard.press(':');

  // 用滑鼠點導覽列離開，不按任何鍵（避免在離開時重置 pendingColon）
  await page.locator('.site-nav a[href="/writing/"]').click();
  await expect(page).toHaveURL(/\/writing\/$/);

  // 用滑鼠點回首頁——換頁產生新的 DOM，視窗回到收起，再點圖示展開
  await page.locator('.site-nav .nav-link[href="/"]').click();
  await expect(page).toHaveURL(/localhost:4321\/$/);
  await page.locator('.desktop-icon').click();
  await expect(page.locator('#profile-window')).toBeVisible();

  // 按 `q`：如果 pendingColon 沒有正確重置，視窗會被關掉（bug）
  // 正確的行為是視窗仍然開著，因為 pendingColon 已經在 astro:page-load 時重置
  await page.keyboard.press('q');
  await expect(page.locator('#profile-window')).toBeVisible();
});

test('序列進行中點到看不見的桌面圖示，序列結束後視窗仍是收起的', async ({ page }) => {
  await page.goto('/');
  // 序列剛開始：#fx 蓋住畫面但 pointer-events:none，.desktop-icon 視覺上看不見
  // 卻打得到。site-dither 把「點擊或按任意鍵」都當成「跳過序列」，onClick 必須
  // 有跟 onKeydown 一樣的守衛，不然這一下會同時跳過序列，又打開一個使用者還沒
  // 看見的視窗。
  await expect(page.locator('html')).toHaveClass(/seq-pending/);
  await page.locator('.desktop-icon').dispatchEvent('click');

  await expect(page.locator('html')).toHaveClass(/seq-done/, { timeout: 10_000 });
  await expect(page.locator('.desktop')).not.toHaveAttribute('data-open', /.*/);
  await expect(page.locator('#profile-window')).toBeHidden();
});

test('.vim 開合過程中，computed opacity 只會是 0 或 1，不會停在半透明的中間格（axe 對比護欄）', async ({ page }) => {
  // 這條護欄對應一個實測會被 Lighthouse/axe 抓到的缺陷：.vim 的開合曾經用
  // opacity 做轉場，序列剛結束、.vim 從 seq-pending 的 opacity:0 revert 回
  // 顯示狀態的那 120ms 窗口內，文字會疊在半透明背景上，對比不足。
  // 修法是讓 opacity/visibility 瞬間切換，只有 transform 做動畫——任何時間點
  // 截圖，.vim 的 computed opacity 都該只是 '0' 或 '1'，絕不會停在中間值。
  await page.goto('/');

  // 涵蓋序列結束、.vim 從隱藏 revert 回顯示的那個瞬間：從現在開始連續取樣，
  // 直到 seq-done 出現後再多跑一段緩衝，確保真的涵蓋轉場窗口。
  const seqSamples = await page.evaluate(() => new Promise<string[]>((resolve) => {
    const vim = document.querySelector('.vim');
    const html = document.documentElement;
    const values: string[] = [];
    const start = performance.now();
    let doneAt: number | null = null;
    function tick() {
      if (vim) values.push(getComputedStyle(vim).opacity);
      if (doneAt === null && html.classList.contains('seq-done')) doneAt = performance.now();
      const elapsed = performance.now() - start;
      const bufferedAfterDone = doneAt !== null && performance.now() - doneAt > 300;
      if (bufferedAfterDone || elapsed > 15_000) {
        resolve(values);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));

  expect(seqSamples.length).toBeGreaterThan(0);
  for (const opacity of seqSamples) expect(['0', '1']).toContain(opacity);

  // 同一份護欄也涵蓋使用者手動點圖示展開／收起視窗的路徑
  const toggleSamples = await page.evaluate(() => new Promise<string[]>((resolve) => {
    const vim = document.querySelector('.vim');
    const icon = document.querySelector<HTMLElement>('[data-profile-toggle]');
    if (!vim || !icon) { resolve([]); return; }
    const values: string[] = [];
    const start = performance.now();
    let reopened = false;
    icon.click(); // 展開
    function tick() {
      values.push(getComputedStyle(vim as Element).opacity);
      const elapsed = performance.now() - start;
      if (elapsed > 200 && !reopened) {
        reopened = true;
        (icon as HTMLElement).click(); // 收起，繼續取樣收起過程
      }
      if (elapsed > 400) {
        resolve(values);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }));

  expect(toggleSamples.length).toBeGreaterThan(0);
  for (const opacity of toggleSamples) expect(['0', '1']).toContain(opacity);
});

test('文件裡混進 nav-glitch 式的 clone 時，ESC 只會影響真正的視窗', async ({ page }) => {
  await page.goto('/');
  await openProfile(page);

  // nav-glitch 換頁故障轉場時，會把 main.page 整棵 clone 塞進排在它前面的
  // #fx-layers，而且不清子孫的 id/class——所以轉場的幾百毫秒內文件裡真的會有
  // 兩份 `.desktop`。真正轉場只有幾百毫秒寬，用它來當守門測試在 CI 的平行負載
  // 下容易因為系統排程延遲而錯過那個窗口而各偽陽性；這裡直接照那個機制在
  // #fx-layers 底下放一份複製品，決定性地重現同一種文件狀態，不賭時間。
  await page.evaluate(() => {
    const real = document.querySelector('.desktop');
    const fxLayers = document.getElementById('fx-layers');
    if (real && fxLayers) fxLayers.appendChild(real.cloneNode(true));
  });
  await expect(page.locator('.desktop')).toHaveCount(2);

  await page.keyboard.press('Escape');

  // 真正的視窗被正確關閉，而不是誤中 clone、什麼都沒發生。真正那一個是
  // <body> 的直接子元素，clone 埋在 #fx > #fx-layers 底下多一層——clone 本身
  // 也是 main.page 整棵複製過去的，所以「main.page .desktop」這個選擇器
  // 抓不出真假，要用 `body > main.page` 才能唯一鎖定真正的那一個。
  const realDesktop = page.locator('body > main.page .desktop');
  await expect(realDesktop).not.toHaveAttribute('data-open', /.*/);
  await expect(page.locator('body > main.page #profile-window')).toBeHidden();
  await expect(page.locator('body > main.page .desktop-icon')).toHaveAttribute('aria-expanded', 'false');

  // clone 完全沒被動到——它停在「複製當下」的樣子（複製當下視窗還開著）
  await expect(page.locator('#fx-layers .desktop')).toHaveAttribute('data-open', '');
});
