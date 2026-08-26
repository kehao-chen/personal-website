import { describe, expect, it } from 'vitest';
import { FRAMING, framePlane, frameShell, visibleSize } from './framing';

/** 幾個真實裝置的長寬比 */
const DESKTOP = 1.6;
const IPHONE_14 = 390 / 844;
const IPHONE_SE = 320 / 568;
const IPAD_PORTRAIT = 820 / 1180;

const word = (aspect: number) =>
  framePlane(FRAMING.wordmarkWidth, FRAMING.wordmarkZ, aspect);

describe('visibleSize', () => {
  it('高度與長寬比無關，只由深度決定', () => {
    expect(visibleSize(FRAMING.wordmarkZ, 0.5).height)
      .toBeCloseTo(visibleSize(FRAMING.wordmarkZ, 2).height, 10);
  });

  it('寬度與長寬比成正比', () => {
    const narrow = visibleSize(FRAMING.wordmarkZ, 0.5).width;
    const wide = visibleSize(FRAMING.wordmarkZ, 1.5).width;
    expect(wide / narrow).toBeCloseTo(3, 10);
  });

  it('越遠的平面看到的範圍越大', () => {
    expect(visibleSize(FRAMING.shellZ, 1).width)
      .toBeGreaterThan(visibleSize(FRAMING.grantedZ, 1).width);
  });
});

describe('framePlane', () => {
  it('桌面比例維持原尺寸，不動既有構圖', () => {
    expect(word(DESKTOP).scale).toBe(1);
    expect(word(DESKTOP).y).toBe(FRAMING.baseY);
  });

  it('直式螢幕把字標縮到可視寬度以內', () => {
    for (const aspect of [IPHONE_14, IPHONE_SE, IPAD_PORTRAIT]) {
      const { scale } = word(aspect);
      const rendered = FRAMING.wordmarkWidth * scale;
      expect(rendered).toBeLessThanOrEqual(visibleSize(FRAMING.wordmarkZ, aspect).width);
    }
  });

  it('字標永遠留在 baseY，才會與脈衝環同心', () => {
    for (const aspect of [IPHONE_14, IPHONE_SE, IPAD_PORTRAIT, DESKTOP, 2.4]) {
      expect(word(aspect).y).toBe(FRAMING.baseY);
    }
  });

  it('永遠不放大超過設計尺寸', () => {
    for (const aspect of [1, 1.6, 2.4, 4]) {
      expect(word(aspect).scale).toBeLessThanOrEqual(1);
    }
  });

  it('越窄縮得越多', () => {
    expect(word(IPHONE_SE).scale).toBeLessThan(word(IPAD_PORTRAIT).scale);
    expect(word(IPAD_PORTRAIT).scale).toBeLessThan(word(DESKTOP).scale);
  });

  it('GRANTED 版與字標套用同一套規則', () => {
    const plate = framePlane(FRAMING.grantedWidth, FRAMING.grantedZ, IPHONE_14);
    expect(FRAMING.grantedWidth * plate.scale)
      .toBeLessThanOrEqual(visibleSize(FRAMING.grantedZ, IPHONE_14).width);
    expect(plate.y).toBe(FRAMING.baseY);
  });
});

describe('frameShell', () => {
  it('桌面比例維持原尺寸', () => {
    expect(frameShell(DESKTOP).scale).toBe(1);
  });

  it('直式螢幕把整顆球縮進可視寬度', () => {
    for (const aspect of [IPHONE_14, IPHONE_SE]) {
      const diameter = FRAMING.shellRadius * 2 * frameShell(aspect).scale;
      expect(diameter).toBeLessThanOrEqual(visibleSize(FRAMING.shellZ, aspect).width);
    }
  });

  it('球是背景，不跟著字標上移', () => {
    expect(frameShell(IPHONE_14).y).toBe(FRAMING.baseY);
    expect(frameShell(DESKTOP).y).toBe(FRAMING.baseY);
  });
});

describe('相機游移振幅', () => {
  /**
   * 相機一橫移，位於 lookAt 目標前方的字標就跟螢幕中心（脈衝環的圓心）
   * 分家。位移量 = 振幅 × (cameraZ - wordmarkZ) / cameraZ，換算成畫面寬度
   * 的比例後必須小到只像抖動。
   */
  const driftFraction = (amplitude: number, aspect: number) => {
    const parallax = (amplitude * (FRAMING.cameraZ - FRAMING.wordmarkZ)) / FRAMING.cameraZ;
    return parallax / visibleSize(FRAMING.wordmarkZ, aspect).width;
  };

  it('桌面上字標離開中心不超過畫面寬度的 1.5%', () => {
    expect(driftFraction(FRAMING.driftX, DESKTOP)).toBeLessThan(0.015);
  });

  it('最窄的手機上也不超過 3%', () => {
    expect(driftFraction(FRAMING.driftX, IPHONE_SE)).toBeLessThan(0.03);
  });

  it('垂直振幅不大於水平振幅', () => {
    expect(FRAMING.driftY).toBeLessThanOrEqual(FRAMING.driftX);
  });
});
