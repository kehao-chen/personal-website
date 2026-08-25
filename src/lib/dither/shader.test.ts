import { describe, it, expect } from 'vitest';
import { FRAGMENT_SHADER, VERTEX_SHADER, UNIFORM_NAMES } from './shader';

function declaredUniforms(source: string): string[] {
  return [...source.matchAll(/uniform\s+\w+\s+([\w,\s]+);/g)]
    .flatMap((match) => match[1].split(',').map((name) => name.trim()))
    .filter(Boolean)
    .sort();
}

describe('抖色 shader', () => {
  it('fragment shader 宣告的 uniform 與 UNIFORM_NAMES 完全一致', () => {
    expect(declaredUniforms(FRAGMENT_SHADER)).toEqual([...UNIFORM_NAMES].sort());
  });

  it('vertex shader 傳遞 vUv', () => {
    expect(VERTEX_SHADER).toContain('varying vec2 vUv');
    expect(FRAGMENT_SHADER).toContain('varying vec2 vUv');
  });

  it('使用 Bayer 4×4 而非其他抖動圖樣', () => {
    expect(FRAGMENT_SHADER).toContain('bayer4');
  });

  it('像素大小固定為 2', () => {
    expect(FRAGMENT_SHADER).toMatch(/uRes\s*\/\s*2\.0/);
  });

  it('故障發生在抖色量化之前', () => {
    const glitchIndex = FRAGMENT_SHADER.indexOf('shift');
    const quantiseIndex = FRAGMENT_SHADER.indexOf('bayer4(cell)');
    expect(glitchIndex).toBeGreaterThan(-1);
    expect(quantiseIndex).toBeGreaterThan(glitchIndex);
  });
});
