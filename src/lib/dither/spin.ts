/**
 * 線框球的自轉狀態機。
 *
 * 原本球的角度是由經過秒數直接算出來的（`rotation.y = seconds * 0.14`）。
 * 那個式子裡沒有「速度」這個東西可以被干擾，所以要能被拖，得改成積分式：
 * 同時保存角度與角速度，每一幀把角速度積分進角度，再把角速度往基礎轉速拉。
 *
 * 這裡不認識 three.js，也不認識 DOM。給它狀態與時間，回傳新狀態。
 */

export interface SpinState {
  /** 繞 x 軸的角度（rad） */
  readonly x: number;
  /** 繞 y 軸的角度（rad） */
  readonly y: number;
  /** 繞 x 軸的角速度（rad/s） */
  readonly vx: number;
  /** 繞 y 軸的角速度（rad/s） */
  readonly vy: number;
}

/** 沒人碰的時候的轉速，與改動之前的 `seconds * 0.09 / 0.14` 一致 */
export const BASE_SPIN = { vx: 0.09, vy: 0.14 } as const;

/** 回歸的時間常數（秒）：一個 tau 之後與基礎轉速的差距剩下 1/e */
export const RELAX_TAU = 1.6;

/** 甩出去的角速度上限（rad/s）。沒有上限的話一次暴力滑動可以讓球快到只剩殘影 */
export const MAX_SPIN = 6;

/** 單幀 dt 的上限（秒）。分頁切走時 rAF 停擺，切回來的第一幀 dt 會是好幾秒 */
export const MAX_STEP = 0.1;

export function initialSpin(): SpinState {
  return { x: 0, y: 0, vx: BASE_SPIN.vx, vy: BASE_SPIN.vy };
}

function clampSpin(value: number): number {
  return Math.max(-MAX_SPIN, Math.min(MAX_SPIN, value));
}

/**
 * 往基礎轉速指數靠近。
 *
 * 用 `1 - exp(-dt/tau)` 而不是 `dt/tau`：後者是歐拉近似，dt 一旦超過 tau 就會
 * 衝過頭，dt 到兩倍 tau 時甚至會把球甩向反方向。指數形式對任何 dt 都落在
 * 起點與目標之間。
 */
function relax(velocity: number, base: number, dt: number): number {
  return base + (velocity - base) * Math.exp(-dt / RELAX_TAU);
}

/** 推進一幀：角度吃目前的角速度，角速度往基礎轉速回歸 */
export function advance(state: SpinState, dt: number): SpinState {
  if (!(dt > 0)) return state;
  const step = Math.min(dt, MAX_STEP);
  return {
    x: state.x + state.vx * step,
    y: state.y + state.vy * step,
    vx: relax(state.vx, BASE_SPIN.vx, step),
    vy: relax(state.vy, BASE_SPIN.vy, step),
  };
}

/** 拖拽中：角度 1:1 跟著指標，角速度不動——手指按著的時候球不該自己加速 */
export function dragBy(state: SpinState, dx: number, dy: number): SpinState {
  return { ...state, x: state.x + dx, y: state.y + dy };
}

/** 放手：用最後一段位移換算初速。角度不動，否則放手的瞬間球會跳一下 */
export function flick(state: SpinState, dx: number, dy: number, dt: number): SpinState {
  if (!(dt > 0)) return { ...state, vx: BASE_SPIN.vx, vy: BASE_SPIN.vy };
  return { ...state, vx: clampSpin(dx / dt), vy: clampSpin(dy / dt) };
}
