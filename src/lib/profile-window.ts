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

export function initProfileWindow(): void {
  // 委派到 document：換頁後 DOM 會被換掉，綁在元素上的 listener 會跟著消失。
  // 委派讓這個模組只需要初始化一次。
  document.addEventListener('click', onClick);
}
