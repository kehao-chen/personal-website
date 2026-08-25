/**
 * 首頁 .profile 視窗的開關。
 *
 * 狀態是 wrapper 上的 `data-open`，HTML 預設就帶著它——所以沒有 JS 時視窗
 * 是開的，這個模組只負責「收起來」與「再打開」。任何「預設隱藏、靠 JS 顯示」
 * 的寫法都會讓無 JS 訪客看不到首頁唯一的自我介紹。
 *
 * 不存 sessionStorage：視窗活在 `main.page` 裡（換頁會被 swap），每次回到
 * 首頁都是全新的 DOM，重置為開啟是自然結果也是想要的行為。
 */

const OPEN_ATTR = 'data-open';

function desktop(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.desktop');
}

function setOpen(open: boolean): void {
  const root = desktop();
  if (!root) return;

  if (open) root.setAttribute(OPEN_ATTR, '');
  else root.removeAttribute(OPEN_ATTR);

  for (const toggle of document.querySelectorAll<HTMLElement>('[data-profile-toggle]')) {
    toggle.setAttribute('aria-expanded', String(open));
  }
}

function isOpen(): boolean {
  return desktop()?.hasAttribute(OPEN_ATTR) ?? false;
}

function onClick(event: MouseEvent): void {
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
  document.addEventListener('astro:page-load', () => { pendingColon = false; });
}
