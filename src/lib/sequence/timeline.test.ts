import { describe, it, expect } from 'vitest';
import { frameAt, bootLinesAt, TIMELINE, IDLE_FRAME } from './timeline';

describe('TIMELINE 常數', () => {
  it('符合設計文件的區間', () => {
    expect(TIMELINE).toEqual({ boot: 900, scan: 1500, breach: 1820, granted: 2500, settle: 3050 });
  });
});

describe('frameAt 階段判定', () => {
  it.each([
    [0, 'boot'],
    [899, 'boot'],
    [900, 'scan'],
    [1499, 'scan'],
    [1500, 'breach'],
    [1620, 'breach'],
    [1819, 'breach'],
    [1820, 'granted'],
    [2499, 'granted'],
    [2500, 'settle'],
    [3049, 'settle'],
    [3050, 'idle'],
    [99999, 'idle'],
  ])('%ims 屬於 %s', (ms, phase) => {
    expect(frameAt(ms).phase).toBe(phase);
  });

  it('負數視為 0', () => {
    expect(frameAt(-500).phase).toBe('boot');
  });
});

describe('frameAt 參數', () => {
  it('BREACH 期間 glitch 為滿值', () => {
    expect(frameAt(1620).glitch).toBe(1);
  });

  it('BOOT 期間看不到字標與 ACCESS GRANTED', () => {
    const frame = frameAt(400);
    expect(frame.wordmark).toBe(0);
    expect(frame.granted).toBe(0);
  });

  it('GRANTED 期間 ACCESS GRANTED 可見，字標仍隱藏', () => {
    const frame = frameAt(2000);
    expect(frame.granted).toBeGreaterThan(0);
    expect(frame.wordmark).toBe(0);
  });

  it('SETTLE 期間字標由 0 漸增到 1', () => {
    expect(frameAt(2500).wordmark).toBeCloseTo(0, 2);
    expect(frameAt(3049).wordmark).toBeGreaterThan(0.99);
  });

  it('序列結束後等同 IDLE_FRAME', () => {
    expect(frameAt(4000)).toEqual(IDLE_FRAME);
  });

  it('IDLE 使用規格的固定值', () => {
    expect(IDLE_FRAME.grain).toBe(0.02);
    expect(IDLE_FRAME.ring).toBe(0.26);
    expect(IDLE_FRAME.ringSpeed).toBe(1.4);
    expect(IDLE_FRAME.chrome).toBe(1);
    expect(IDLE_FRAME.wordmark).toBe(1);
  });

  it('所有輸出值都在 0..1 之間（ringSpeed 除外）', () => {
    for (const ms of [0, 450, 900, 1200, 1500, 1700, 1820, 2100, 2500, 2800, 3050, 5000]) {
      const frame = frameAt(ms);
      for (const key of ['grain', 'ring', 'glitch', 'wordmark', 'granted', 'scene', 'chrome', 'flash'] as const) {
        expect(frame[key], `${key} @ ${ms}ms`).toBeGreaterThanOrEqual(0);
        expect(frame[key], `${key} @ ${ms}ms`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('導覽列在 BREACH 之前都不出現', () => {
    expect(frameAt(1700).chrome).toBe(0);
  });
});

describe('bootLinesAt', () => {
  it('一開始沒有任何行', () => {
    expect(bootLinesAt(0)).toEqual([]);
  });

  it('隨時間逐行出現', () => {
    expect(bootLinesAt(300).length).toBe(1);
    expect(bootLinesAt(900).length).toBeGreaterThan(1);
  });

  it('全部打完後共五行且無游標', () => {
    const lines = bootLinesAt(2000);
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe('> TARGET  happyhacking.ninja');
    expect(lines.join('')).not.toContain('_');
  });

  it('打字中的那一行帶游標', () => {
    expect(bootLinesAt(100).at(-1)).toMatch(/_$/);
  });
});
