import { advance, dragBy, flick, initialSpin, type SpinState } from './spin';

/**
 * 把指標動作接到球體的自轉狀態上。
 *
 * `#fx` 是 `pointer-events: none`，而 `.page` 蓋滿整個視窗，所以沒有任何元素
 * 收得到「背景上的」指標事件。監聽因此掛在 window，再用選擇器把從導覽、連結、
 * .profile 視窗上開始的拖拽排除掉——那些地方的拖拽屬於它們自己。
 */

/** 拖多少像素等於轉一弧度 */
export const PX_PER_RAD = 220;

/** 超過這個距離才算拖拽。低於門檻仍是點擊，開場序列的「點一下跳過」要留著 */
export const DRAG_THRESHOLD_PX = 4;

/** 放手前最後一次移動超過這麼久，就當成「停住才放手」，不給初速 */
export const FLICK_WINDOW_MS = 110;

/** 換算初速時 dt 的下限（秒）：1ms 內的一次事件不該換算出誇張的角速度 */
const MIN_FLICK_DT = 0.008;

/** 從這些東西上面開始的拖拽不算撥球 */
const BLOCKED = 'a, button, input, textarea, select, summary, [role="button"], .vim';

/** 水平位移轉 y 軸，垂直位移轉 x 軸——就是抓住地球儀轉的方向 */
export function toRotation(dxPx: number, dyPx: number): { x: number; y: number } {
  return { x: dyPx / PX_PER_RAD, y: dxPx / PX_PER_RAD };
}

export interface SpinController {
  /** 每一幀呼叫一次，回傳這一幀該用的角度 */
  sample(now: number): { x: number; y: number };
  /** 只有首頁開啟；關閉時進行中的拖拽會被中止 */
  setEnabled(on: boolean): void;
  destroy(): void;
}

export function createSpinController(target: Window = window): SpinController {
  let state: SpinState = initialSpin();
  let enabled = false;
  let lastSampleAt: number | undefined;

  let pointerId: number | undefined;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastMoveAt = 0;
  let lastDx = 0;
  let lastDy = 0;
  let lastMoveDt = 0;
  let dragging = false;

  function endTracking(): void {
    pointerId = undefined;
    dragging = false;
  }

  function onPointerDown(event: PointerEvent): void {
    if (!enabled || pointerId !== undefined) return;
    // 滑鼠只認左鍵；右鍵與中鍵留給瀏覽器
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const origin = event.target as Element | null;
    if (origin?.closest?.(BLOCKED)) return;

    pointerId = event.pointerId;
    downX = lastX = event.clientX;
    downY = lastY = event.clientY;
    lastMoveAt = event.timeStamp;
    lastDx = lastDy = 0;
    lastMoveDt = 0;
    dragging = false;
  }

  function onPointerMove(event: PointerEvent): void {
    if (pointerId !== event.pointerId) return;

    if (!dragging) {
      const far = Math.hypot(event.clientX - downX, event.clientY - downY);
      if (far < DRAG_THRESHOLD_PX) return;
      dragging = true;
      // 從門檻那一刻起算，否則第一幀會補上一段本來不該算的位移
      lastX = event.clientX;
      lastY = event.clientY;
      lastMoveAt = event.timeStamp;
      // 拖拽期間不要順手選到底下的文字
      event.preventDefault();
      return;
    }

    lastDx = event.clientX - lastX;
    lastDy = event.clientY - lastY;
    lastMoveDt = Math.max((event.timeStamp - lastMoveAt) / 1000, MIN_FLICK_DT);
    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveAt = event.timeStamp;

    const rotation = toRotation(lastDx, lastDy);
    state = dragBy(state, rotation.x, rotation.y);
    event.preventDefault();
  }

  function onPointerUp(event: PointerEvent): void {
    if (pointerId !== event.pointerId) return;

    if (dragging) {
      const stale = event.timeStamp - lastMoveAt > FLICK_WINDOW_MS;
      // dt 傳 0 時 flick 直接回到基礎轉速：停住才放手就不該有殘餘慣性
      const rotation = stale ? { x: 0, y: 0 } : toRotation(lastDx, lastDy);
      state = flick(state, rotation.x, rotation.y, stale ? 0 : lastMoveDt);
      // 拖拽期間沒有推進時間，放手後別把這段空白補進第一幀
      lastSampleAt = undefined;
    }
    endTracking();
  }

  target.addEventListener('pointerdown', onPointerDown as EventListener);
  target.addEventListener('pointermove', onPointerMove as EventListener, { passive: false });
  target.addEventListener('pointerup', onPointerUp as EventListener);
  target.addEventListener('pointercancel', onPointerUp as EventListener);

  return {
    sample(now) {
      const previous = lastSampleAt;
      lastSampleAt = now;
      // 手按著的時候球歸手管：不推進，也不回歸
      if (dragging || previous === undefined) return { x: state.x, y: state.y };
      state = advance(state, (now - previous) / 1000);
      return { x: state.x, y: state.y };
    },
    setEnabled(on) {
      enabled = on;
      if (!on) endTracking();
    },
    destroy() {
      endTracking();
      target.removeEventListener('pointerdown', onPointerDown as EventListener);
      target.removeEventListener('pointermove', onPointerMove as EventListener);
      target.removeEventListener('pointerup', onPointerUp as EventListener);
      target.removeEventListener('pointercancel', onPointerUp as EventListener);
    },
  };
}
