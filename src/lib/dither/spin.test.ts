import { describe, it, expect } from 'vitest';
import {
  BASE_SPIN,
  MAX_SPIN,
  MAX_STEP,
  RELAX_TAU,
  advance,
  dragBy,
  flick,
  initialSpin,
  type SpinState,
} from './spin';

describe('initialSpin', () => {
  it('從基礎轉速開始，角度歸零', () => {
    expect(initialSpin()).toEqual({ x: 0, y: 0, vx: BASE_SPIN.vx, vy: BASE_SPIN.vy });
  });
});

describe('advance', () => {
  it('以目前的角速度推進角度', () => {
    const next = advance({ x: 0, y: 0, vx: 2, vy: -3 }, 0.05);
    expect(next.x).toBeCloseTo(0.1, 6);
    expect(next.y).toBeCloseTo(-0.15, 6);
  });

  it('把角速度往基礎轉速拉近', () => {
    const next = advance({ x: 0, y: 0, vx: 4, vy: 4 }, 0.1);
    expect(next.vx).toBeLessThan(4);
    expect(next.vx).toBeGreaterThan(BASE_SPIN.vx);
  });

  it('從另一側靠近時同樣是拉近，不是一律變小', () => {
    const next = advance({ x: 0, y: 0, vx: -4, vy: -4 }, 0.1);
    expect(next.vx).toBeGreaterThan(-4);
    expect(next.vx).toBeLessThan(BASE_SPIN.vx);
  });

  // dt 會被夾在 MAX_STEP，所以一個時間常數要用累積多幀來走完
  it('累積一個時間常數之後，與基礎轉速的差距剩下 1/e', () => {
    let state: SpinState = { x: 0, y: 0, vx: BASE_SPIN.vx + 1, vy: 0 };
    for (let elapsed = 0; elapsed < RELAX_TAU - 1e-9; elapsed += MAX_STEP) {
      state = advance(state, MAX_STEP);
    }
    expect(state.vx - BASE_SPIN.vx).toBeCloseTo(Math.exp(-1), 4);
  });

  // 這條擋的是「改用 vel += (BASE - vel) * dt / tau」這種歐拉近似：
  // dt 超過 tau 時它會衝過頭，dt 兩倍 tau 時甚至把球甩向反方向。
  it('dt 遠大於時間常數時不會過衝到基礎轉速的另一側', () => {
    const next = advance({ x: 0, y: 0, vx: BASE_SPIN.vx + 5, vy: 0 }, MAX_STEP);
    expect(next.vx).toBeGreaterThan(BASE_SPIN.vx);
  });

  it('把單幀的 dt 夾在上限內：分頁切回來時不會瞬移', () => {
    const state = { x: 0, y: 0, vx: 1, vy: 0 };
    expect(advance(state, 30).x).toBeCloseTo(advance(state, MAX_STEP).x, 9);
  });

  it('dt 為零或負數時原樣返回', () => {
    const state = { x: 0.3, y: 0.4, vx: 2, vy: 2 };
    expect(advance(state, 0)).toEqual(state);
    expect(advance(state, -1)).toEqual(state);
  });

  it('放著不管會收斂到基礎轉速', () => {
    let state = { x: 0, y: 0, vx: -8, vy: 8 };
    for (let i = 0; i < 400; i += 1) state = advance(state, MAX_STEP);
    expect(state.vx).toBeCloseTo(BASE_SPIN.vx, 6);
    expect(state.vy).toBeCloseTo(BASE_SPIN.vy, 6);
  });
});

describe('dragBy', () => {
  it('直接加到角度上', () => {
    const next = dragBy({ x: 1, y: 2, vx: 0.5, vy: 0.5 }, 0.25, -0.5);
    expect(next.x).toBeCloseTo(1.25, 6);
    expect(next.y).toBeCloseTo(1.5, 6);
  });

  it('不動角速度：拖拽期間球跟著指標，不是被加速', () => {
    const next = dragBy({ x: 0, y: 0, vx: 0.5, vy: 0.5 }, 3, 3);
    expect(next.vx).toBe(0.5);
    expect(next.vy).toBe(0.5);
  });
});

describe('flick', () => {
  it('由最後一段位移與時間換算成角速度', () => {
    const next = flick({ x: 0, y: 0, vx: 0, vy: 0 }, 0.2, -0.4, 0.1);
    expect(next.vx).toBeCloseTo(2, 6);
    expect(next.vy).toBeCloseTo(-4, 6);
  });

  it('不動角度：放手的瞬間球不該跳一下', () => {
    const next = flick({ x: 1.5, y: -2, vx: 0, vy: 0 }, 0.2, 0.2, 0.1);
    expect(next.x).toBe(1.5);
    expect(next.y).toBe(-2);
  });

  it('把初速夾在上限內，兩個方向都夾', () => {
    const fast = flick({ x: 0, y: 0, vx: 0, vy: 0 }, 100, -100, 0.001);
    expect(fast.vx).toBe(MAX_SPIN);
    expect(fast.vy).toBe(-MAX_SPIN);
  });

  it('dt 為零時不產生 Infinity，退回基礎轉速', () => {
    const next = flick({ x: 0, y: 0, vx: 3, vy: 3 }, 0.2, 0.2, 0);
    expect(next.vx).toBe(BASE_SPIN.vx);
    expect(next.vy).toBe(BASE_SPIN.vy);
  });
});
