import { LOCALES, type Locale } from '../posts';

export const DEFAULT_LOCALE: Locale = 'en';

/** 給 hreflang 用的 BCP 47 標籤 */
const HREFLANG: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-Hant',
};

function normalise(path: string): string {
  return '/' + path.replace(/^\/+/, '');
}

export function localizePath(locale: Locale, path: string): string {
  const clean = normalise(path);
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}/` : `/${locale}${clean}`;
}

export function localeFromPath(pathname: string): Locale {
  const clean = normalise(pathname);
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    // 邊界很重要：/zhuangzi 不是中文頁
    if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return locale;
  }
  return DEFAULT_LOCALE;
}

export function stripLocale(pathname: string): string {
  const clean = normalise(pathname);
  const locale = localeFromPath(clean);
  if (locale === DEFAULT_LOCALE) return clean;
  const rest = clean.slice(`/${locale}`.length);
  return rest === '' || rest === '/' ? '/' : rest;
}

export function alternateHreflang(path: string): Array<{ hreflang: string; href: string }> {
  const base = stripLocale(path);
  const entries = LOCALES.map((locale) => ({
    hreflang: HREFLANG[locale],
    href: localizePath(locale, base),
  }));
  return [...entries, { hreflang: 'x-default', href: localizePath(DEFAULT_LOCALE, base) }];
}
