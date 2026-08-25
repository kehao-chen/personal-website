import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE, localizePath, localeFromPath, stripLocale, alternateHreflang,
} from './routing';

describe('localizePath', () => {
  it('預設語言不加前綴', () => {
    expect(localizePath('en', '/writing')).toBe('/writing/');
    expect(localizePath('en', '/')).toBe('/');
  });

  it('非預設語言加上前綴', () => {
    expect(localizePath('zh', '/writing')).toBe('/zh/writing/');
    expect(localizePath('zh', '/about')).toBe('/zh/about/');
  });

  it('非預設語言的首頁保留尾斜線', () => {
    expect(localizePath('zh', '/')).toBe('/zh/');
  });

  it('容忍缺少前導斜線的輸入', () => {
    expect(localizePath('zh', 'writing')).toBe('/zh/writing/');
    expect(localizePath('en', 'writing')).toBe('/writing/');
  });

  // canonical 來自 Astro.url.pathname（目錄形式），hreflang 來自這裡；兩者
  // 不一致會讓整組 hreflang 被丟棄，所以尾斜線是行為的一部分，不是格式偏好。
  it('一律輸出目錄形式的尾斜線', () => {
    expect(localizePath('en', '/writing/tag/kubernetes')).toBe('/writing/tag/kubernetes/');
    expect(localizePath('zh', '/writing/aks-lun-exhaustion')).toBe('/zh/writing/aks-lun-exhaustion/');
    expect(localizePath('en', '/writing/')).toBe('/writing/');
  });

  it('不重複加上已經存在的語言前綴', () => {
    expect(localizePath('zh', '/zh/about')).toBe('/zh/about/');
    expect(localizePath('zh', '/zh/')).toBe('/zh/');
    // 邊界：/zhuangzi 不是 zh 前綴，該加還是要加
    expect(localizePath('zh', '/zhuangzi')).toBe('/zh/zhuangzi/');
  });
});

describe('localeFromPath', () => {
  it('辨識 zh 前綴', () => {
    expect(localeFromPath('/zh/writing/foo')).toBe('zh');
    expect(localeFromPath('/zh/')).toBe('zh');
    expect(localeFromPath('/zh')).toBe('zh');
  });

  it('無前綴時回傳預設語言', () => {
    expect(localeFromPath('/writing/foo')).toBe('en');
    expect(localeFromPath('/')).toBe('en');
  });

  it('不把僅是開頭相同的路徑誤判為語言前綴', () => {
    expect(localeFromPath('/zhuangzi')).toBe('en');
    expect(localeFromPath('/zhuangzi/notes')).toBe('en');
  });
});

describe('stripLocale', () => {
  it('移除語言前綴', () => {
    expect(stripLocale('/zh/writing/foo')).toBe('/writing/foo/');
    expect(stripLocale('/zh/')).toBe('/');
    expect(stripLocale('/zh')).toBe('/');
  });

  it('無前綴時原樣回傳', () => {
    expect(stripLocale('/writing/foo')).toBe('/writing/foo/');
    expect(stripLocale('/zhuangzi')).toBe('/zhuangzi/');
  });
});

describe('alternateHreflang', () => {
  it('為每個語言與 x-default 產生條目', () => {
    expect(alternateHreflang('/writing')).toEqual([
      { hreflang: 'en', href: '/writing/' },
      { hreflang: 'zh-Hant', href: '/zh/writing/' },
      { hreflang: 'x-default', href: '/writing/' },
    ]);
  });

  it('接受已含前綴的路徑並正規化', () => {
    expect(alternateHreflang('/zh/about')).toEqual([
      { hreflang: 'en', href: '/about/' },
      { hreflang: 'zh-Hant', href: '/zh/about/' },
      { hreflang: 'x-default', href: '/about/' },
    ]);
  });

  it('可用語言只有 en 時，只產生 en 與 x-default', () => {
    expect(alternateHreflang('/writing/tag/architecture', ['en'])).toEqual([
      { hreflang: 'en', href: '/writing/tag/architecture/' },
      { hreflang: 'x-default', href: '/writing/tag/architecture/' },
    ]);
  });

  it('可用語言只有 zh 時，不產生 x-default（預設語言頁面不存在）', () => {
    expect(alternateHreflang('/zh/writing/tag/aks', ['zh'])).toEqual([
      { hreflang: 'zh-Hant', href: '/zh/writing/tag/aks/' },
    ]);
  });
});

describe('DEFAULT_LOCALE', () => {
  it('是 en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
});
