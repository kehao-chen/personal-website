import { describe, it, expect } from 'vitest';
import { isReadingRoute, isHomeRoute } from './routes';

describe('isReadingRoute', () => {
  it('文章內頁是閱讀路由（兩種語言、有沒有尾斜線都算）', () => {
    expect(isReadingRoute('/writing/approval-orchestrator/')).toBe(true);
    expect(isReadingRoute('/writing/approval-orchestrator')).toBe(true);
    expect(isReadingRoute('/zh/writing/aks-lun-exhaustion/')).toBe(true);
  });

  /** 404 用的是 ReadingLayout，判定必須跟版面一致，否則離開時會多播一次故障轉場 */
  it('404 是閱讀路由', () => {
    expect(isReadingRoute('/404')).toBe(true);
    expect(isReadingRoute('/404/')).toBe(true);
  });

  it('索引頁與標籤頁不是閱讀路由', () => {
    expect(isReadingRoute('/')).toBe(false);
    expect(isReadingRoute('/writing/')).toBe(false);
    expect(isReadingRoute('/writing/tag/kubernetes/')).toBe(false);
    expect(isReadingRoute('/zh/writing/')).toBe(false);
    expect(isReadingRoute('/about/')).toBe(false);
  });
});

describe('isHomeRoute', () => {
  it('只有兩個語言的首頁是首頁', () => {
    expect(isHomeRoute('/')).toBe(true);
    expect(isHomeRoute('/zh/')).toBe(true);
    expect(isHomeRoute('/zh')).toBe(true);
  });

  it('其他門面路由不是首頁', () => {
    expect(isHomeRoute('/about/')).toBe(false);
    expect(isHomeRoute('/writing/')).toBe(false);
    // 邊界：/zhuangzi 不是中文首頁
    expect(isHomeRoute('/zhuangzi/')).toBe(false);
  });
});
