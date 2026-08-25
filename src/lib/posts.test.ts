import { describe, it, expect } from 'vitest';
import {
  sortByDate, filterByLocale, filterByTag, collectTags,
  findTranslation, parseEntryId, type PostMeta,
} from './posts';

function post(overrides: Partial<PostMeta> & Pick<PostMeta, 'slug'>): PostMeta {
  return {
    locale: 'zh',
    title: 'T',
    description: 'D',
    date: new Date('2026-01-01'),
    tags: [],
    readingTime: 5,
    ...overrides,
  };
}

describe('parseEntryId', () => {
  it('從 id 解析 locale 與 slug', () => {
    expect(parseEntryId('zh/aks-lun')).toEqual({ locale: 'zh', slug: 'aks-lun' });
    expect(parseEntryId('en/approval')).toEqual({ locale: 'en', slug: 'approval' });
  });

  it('目錄名不是合法 locale 時拋錯', () => {
    expect(() => parseEntryId('jp/foo')).toThrow(/locale/i);
  });

  it('沒有語言目錄時拋錯', () => {
    expect(() => parseEntryId('foo')).toThrow(/locale/i);
  });
});

describe('sortByDate', () => {
  it('由新到舊排序，不改動輸入陣列', () => {
    const input = [
      post({ slug: 'a', date: new Date('2026-01-01') }),
      post({ slug: 'b', date: new Date('2026-03-01') }),
      post({ slug: 'c', date: new Date('2026-02-01') }),
    ];
    expect(sortByDate(input).map((p) => p.slug)).toEqual(['b', 'c', 'a']);
    expect(input.map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterByLocale', () => {
  it('只留下指定語言', () => {
    const all = [post({ slug: 'a', locale: 'zh' }), post({ slug: 'b', locale: 'en' })];
    expect(filterByLocale(all, 'en').map((p) => p.slug)).toEqual(['b']);
  });
});

describe('filterByTag', () => {
  const all = [
    post({ slug: 'a', tags: ['AZURE', 'AKS'] }),
    post({ slug: 'b', tags: ['LLM'] }),
  ];

  it('tag 為 null 時回傳全部', () => {
    expect(filterByTag(all, null)).toHaveLength(2);
  });

  it('比對不分大小寫', () => {
    expect(filterByTag(all, 'azure').map((p) => p.slug)).toEqual(['a']);
  });

  it('沒有符合時回傳空陣列', () => {
    expect(filterByTag(all, 'KAFKA')).toEqual([]);
  });
});

describe('collectTags', () => {
  it('去重並依字母排序', () => {
    const all = [
      post({ slug: 'a', tags: ['LLM', 'AZURE'] }),
      post({ slug: 'b', tags: ['AZURE', 'AKS'] }),
    ];
    expect(collectTags(all)).toEqual(['AKS', 'AZURE', 'LLM']);
  });
});

describe('findTranslation', () => {
  it('用 translationKey 找到另一語言的版本', () => {
    const zh = post({ slug: 'a', locale: 'zh', translationKey: 'k1' });
    const en = post({ slug: 'a-en', locale: 'en', translationKey: 'k1' });
    expect(findTranslation(zh, [zh, en])?.slug).toBe('a-en');
  });

  it('沒有 translationKey 時回傳 undefined', () => {
    const zh = post({ slug: 'a', locale: 'zh' });
    expect(findTranslation(zh, [zh])).toBeUndefined();
  });

  it('只有自己有這個 key 時回傳 undefined', () => {
    const zh = post({ slug: 'a', locale: 'zh', translationKey: 'k1' });
    expect(findTranslation(zh, [zh])).toBeUndefined();
  });

  it('不會回傳同語言的文章', () => {
    const zh1 = post({ slug: 'a', locale: 'zh', translationKey: 'k1' });
    const zh2 = post({ slug: 'b', locale: 'zh', translationKey: 'k1' });
    expect(findTranslation(zh1, [zh1, zh2])).toBeUndefined();
  });
});
