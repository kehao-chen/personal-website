import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Rgb = [number, number, number];

const css = readFileSync(
  fileURLToPath(new URL('./tokens.css', import.meta.url)),
  'utf8',
);

function parseTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of source.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

/** 把 token 值解析成實際顯示的 RGB。rgba() 會與 ground 合成。 */
function resolve(value: string, ground: Rgb): Rgb {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return [
      r * a + ground[0] * (1 - a),
      g * a + ground[1] * (1 - a),
      b * a + ground[2] * (1 - a),
    ];
  }
  throw new Error(`無法解析的顏色值: ${value}`);
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('配色 token', () => {
  const tokens = parseTokens(css);
  const ground = resolve(tokens['--ground'], [0, 0, 0]);

  it('定義了所有必要的 token', () => {
    for (const name of [
      '--ground', '--ink', '--accent', '--line', '--panel', '--dim', '--muted',
      '--syntax-keyword', '--syntax-function', '--syntax-string',
      '--syntax-number', '--syntax-comment', '--syntax-param', '--syntax-class',
    ]) {
      expect(tokens[name], `缺少 ${name}`).toBeDefined();
    }
  });

  it('內文對比達 AAA（≥ 7:1）', () => {
    expect(contrast(resolve(tokens['--ink'], ground), ground)).toBeGreaterThanOrEqual(7);
  });

  it('強調色對比達 AAA（≥ 7:1）', () => {
    expect(contrast(resolve(tokens['--accent'], ground), ground)).toBeGreaterThanOrEqual(7);
  });

  it('次要資訊文字對比達 AA（≥ 4.5:1）', () => {
    expect(contrast(resolve(tokens['--muted'], ground), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it('裝飾性 chrome 至少達 AA Large（≥ 3:1）', () => {
    expect(contrast(resolve(tokens['--dim'], ground), ground)).toBeGreaterThanOrEqual(3);
  });

  it('不得出現任何被授權限制的主題名稱', () => {
    expect(css.toLowerCase()).not.toContain('dracula');
  });
});
