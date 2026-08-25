import { describe, it, expect } from 'vitest';
import { estimateReadingTime } from './reading-time';

describe('estimateReadingTime', () => {
  it('空字串回傳最小值 1', () => {
    expect(estimateReadingTime('')).toBe(1);
  });

  it('600 個中文字約 2 分鐘', () => {
    expect(estimateReadingTime('字'.repeat(600))).toBe(2);
  });

  it('400 個英文詞約 2 分鐘', () => {
    expect(estimateReadingTime(Array(400).fill('word').join(' '))).toBe(2);
  });

  it('中英混排分開計算後相加', () => {
    // 300 中文字 (1 分) + 200 英文詞 (1 分) = 2 分
    const text = '字'.repeat(300) + ' ' + Array(200).fill('word').join(' ');
    expect(estimateReadingTime(text)).toBe(2);
  });

  it('忽略程式碼區塊內容', () => {
    const withCode = '字'.repeat(300) + '\n\n```\n' + '字'.repeat(3000) + '\n```\n';
    expect(estimateReadingTime(withCode)).toBe(1);
  });

  it('忽略 frontmatter', () => {
    const doc = '---\ntitle: ' + '字'.repeat(600) + '\n---\n\n' + '字'.repeat(300);
    expect(estimateReadingTime(doc)).toBe(1);
  });

  it('無條件進位，且永遠至少 1', () => {
    expect(estimateReadingTime('字')).toBe(1);
  });
});
