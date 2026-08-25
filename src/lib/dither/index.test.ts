import { describe, it, expect } from 'vitest';
import { createDither } from './index';
import { IDLE_FRAME } from '../sequence/timeline';

describe('createDither 的初始化失敗降級路徑', () => {
  it('初始化中途丟出例外時，回傳 active:false 的惰性 handle，而不是讓例外穿出去', () => {
    // 這個測試環境（vitest environment: 'node'）沒有 window/document，
    // 所以 createDither 一開始存取 window.devicePixelRatio 就會丟出例外——
    // 這正好演練了「初始化中途失敗」的情境（拿不到 WebGL context、
    // 建構期間丟例外……皆屬同一種失敗模式），用來驗證 createDither
    // 會吞下例外、不外洩，並回傳一個安全、無副作用的假 handle。
    const fakeCanvas = {} as unknown as HTMLCanvasElement;

    let handle: ReturnType<typeof createDither> | undefined;
    expect(() => {
      handle = createDither(fakeCanvas);
    }).not.toThrow();

    expect(handle!.active).toBe(false);
    expect(() => handle!.setFrame(IDLE_FRAME)).not.toThrow();
    expect(() => handle!.burst()).not.toThrow();
    expect(() => handle!.setReading(true)).not.toThrow();
    expect(() => handle!.destroy()).not.toThrow();
  });
});
