import { describe, it, expect } from 'vitest';
import { PX_PER_RAD, toRotation } from './pointer-spin';

describe('toRotation', () => {
  it('水平位移轉 y 軸，垂直位移轉 x 軸', () => {
    expect(toRotation(PX_PER_RAD, 0)).toEqual({ x: 0, y: 1 });
    expect(toRotation(0, PX_PER_RAD)).toEqual({ x: 1, y: 0 });
  });

  it('往左往上是反方向', () => {
    const { x, y } = toRotation(-PX_PER_RAD, -PX_PER_RAD);
    expect(x).toBeCloseTo(-1, 9);
    expect(y).toBeCloseTo(-1, 9);
  });

  it('沒動就沒有旋轉', () => {
    expect(toRotation(0, 0)).toEqual({ x: 0, y: 0 });
  });
});
