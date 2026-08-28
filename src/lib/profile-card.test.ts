import { describe, it, expect } from 'vitest';
import { LOCALES } from './i18n/locales';
import { PROFILE_CARD, PROFILE_FIELDS } from './profile-card';

describe('PROFILE_CARD', () => {
  it.each(LOCALES)('%s 的每個欄位都有值', (locale) => {
    const card = PROFILE_CARD[locale];
    for (const field of PROFILE_FIELDS) {
      expect(card[field].trim(), `${locale} 的 ${field} 是空的`).not.toBe('');
    }
    expect(card.motto.trim()).not.toBe('');
  });

  // STACK 幾乎都是專有名詞，兩個語言本來就會一樣，所以不列入
  it.each(['who', 'now', 'where'] as const)('%s 兩個語言真的各寫一份', (field) => {
    expect(PROFILE_CARD.en[field]).not.toBe(PROFILE_CARD.zh[field]);
  });

  it('motto 兩個語言各寫一份', () => {
    expect(PROFILE_CARD.en.motto).not.toBe(PROFILE_CARD.zh.motto);
  });

  it('兩個語言的連結標籤與順序一致', () => {
    expect(PROFILE_CARD.zh.links.map((link) => link.label))
      .toEqual(PROFILE_CARD.en.links.map((link) => link.label));
  });

  it.each(LOCALES)('%s 的連結都是 https', (locale) => {
    for (const link of PROFILE_CARD[locale].links) {
      expect(link.href, `${link.label} 不是 https`).toMatch(/^https:\/\//);
    }
  });

  it.each(LOCALES)('%s 的連結標籤不重複', (locale) => {
    const labels = PROFILE_CARD[locale].links.map((link) => link.label);
    expect(new Set(labels).size, '有重複的連結標籤').toBe(labels.length);
  });

  it('欄位順序是固定的：先講是誰，再講現在在做什麼', () => {
    expect(PROFILE_FIELDS).toEqual(['who', 'now', 'stack', 'where']);
  });
});
