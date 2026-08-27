/**
 * 首頁 .profile 視窗的開關。
 *
 * 狀態是 wrapper 上的 `data-open`。標記裡沒有它——桌面上 .profile 是一個要點
 * 開的檔案，預設收起。「沒有 JS 就看不到自我介紹」這個風險不靠這裡處理，而是
 * 在 CSS：收起的規則掛在 `html.js` 底下（見 base.css），沒有 JS 就不生效，
 * 視窗維持展開，因為那時圖示按不動，收起來就再也打不開。
 *
 * 不存 sessionStorage：視窗活在 `main.page` 裡（換頁會被 swap），每次回到
 * 首頁都是全新的 DOM，重置為收起是自然結果也是想要的行為。
 */

const OPEN_ATTR = 'data-open';

/**
 * `nav-glitch.ts` 換頁故障轉場時，會把整棵 `main.page` clone 兩份塞進
 * `#fx-layers`（`#fx` 在 DOM 順序上排在 `main.page` 之前）。clone 沒有清掉
 * 子孫的 id/class，所以在轉場的 420ms 內，文件裡會同時存在真正的 `.desktop`
 * 與兩份 clone，`[data-profile-toggle]` 同理。任何無範圍的查詢都可能抓到
 * clone 而不是真正的那一個——這個判斷式把 clone 篩掉，兩處查詢共用同一套
 * 規則，不各寫一次。
 */
function isReal(el: Element): boolean {
  return !el.closest('#fx');
}

function desktop(): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>('.desktop')].find(isReal) ?? null;
}

function realToggles(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-profile-toggle]')].filter(isReal);
}

function reflectAria(): void {
  const open = String(isOpen());
  for (const toggle of realToggles()) {
    toggle.setAttribute('aria-expanded', open);
  }
}

function setOpen(open: boolean): void {
  const root = desktop();
  if (!root) return;

  // 用 [x] 或 ESC 關閉時，焦點通常還停在視窗內部（例如 [x] 本身）；視窗收起
  // 後那個節點不再可聚焦，焦點會掉到 <body>。收合型控制項關閉時該把焦點交還
  // 給觸發它的圖示——這正是那個入口，重新打開視窗也是點它。
  const shouldRestoreFocus = !open && root.contains(document.activeElement);

  if (open) root.setAttribute(OPEN_ATTR, '');
  else root.removeAttribute(OPEN_ATTR);

  reflectAria();

  if (shouldRestoreFocus) {
    const toggle = root.querySelector<HTMLElement>('[data-profile-toggle]');
    // 窄畫面圖示 display:none，offsetParent 為 null；隱藏元素不能 focus()
    if (toggle && toggle.offsetParent !== null) toggle.focus();
  }
}

function isOpen(): boolean {
  return desktop()?.hasAttribute(OPEN_ATTR) ?? false;
}

function onClick(event: MouseEvent): void {
  // 序列進行中，所有點擊屬於「跳過序列」，不搶（與 onKeydown 同一條規則）。
  // #fx 的 canvas 蓋住畫面但 pointer-events:none，滑鼠打得到底下（此時看不見的）
  // .desktop-icon；沒有這個守衛，使用者為了跳過序列點下去，會順手把一個他還
  // 沒看見的視窗打開。
  if (document.documentElement.classList.contains('seq-pending')) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('[data-profile-close]')) {
    setOpen(false);
    return;
  }
  if (target.closest('[data-profile-toggle]')) {
    setOpen(!isOpen());
  }
}

/**
 * `:q` 需要記住前一個鍵。只保留一個字元的記憶，而且任何非預期的鍵都會清掉它
 * ——不做完整的 vim 命令列解析，那不是這個彩蛋的重點。
 *
 * 屬於「當前這一頁的這個視窗」，不該跨換頁存活。astro:page-load 會重置它。
 */
let pendingColon = false;

function onKeydown(event: KeyboardEvent): void {
  // 序列進行中，所有按鍵屬於「跳過序列」，不搶
  if (document.documentElement.classList.contains('seq-pending')) return;
  // 修飾鍵組合是瀏覽器捷徑，不搶
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  // 只在視窗開著時作用：關掉的視窗不該被鍵盤打開
  if (!isOpen()) { pendingColon = false; return; }

  if (event.key === 'Escape') {
    setOpen(false);
    pendingColon = false;
    return;
  }

  if (pendingColon && event.key === 'q') {
    setOpen(false);
    pendingColon = false;
    return;
  }

  pendingColon = event.key === ':';
}

/**
 * 防禦性初始化守衛。這個專案曾經因為模組被多個 chunk 引入導致同一監聽器
 * 被重複註冊而出 bug（見 src/lib/site-dither.ts 的長註解）。雖然目前架構
 * 已經排除這個風險，但保留守衛作為未來重構的安全網。
 */
let initialised = false;

export function initProfileWindow(): void {
  if (initialised) return;
  initialised = true;

  // 委派到 document：換頁後 DOM 會被換掉，綁在元素上的 listener 會跟著消失。
  // 委派讓這個模組只需要初始化一次。
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);

  // pendingColon 屬於「當前這一頁的這個視窗」，不該跨換頁存活。
  // 順便讓 aria-expanded 跟上新頁面剛換好的 DOM（通常已經正確，這裡只是保險）。
  document.addEventListener('astro:page-load', () => {
    pendingColon = false;
    reflectAria();
  });
}
