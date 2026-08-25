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

/**
 * @param availableLocales 實際存在對應頁面的語言集合，預設為全部語言（首頁、
 *   about、writing 索引頁皆兩種語言都有，維持原本行為）。標籤頁與文章頁的手足
 *   URL 不保證存在，呼叫端需自行篩選只含真的存在的語言，才不會產生指向 404 的
 *   hreflang。x-default 僅在預設語言的頁面存在時才產生。
 */
export function alternateHreflang(
  path: string,
  availableLocales: readonly Locale[] = LOCALES,
): Array<{ hreflang: string; href: string }> {
  const base = stripLocale(path);
  const entries = LOCALES.filter((locale) => availableLocales.includes(locale)).map((locale) => ({
    hreflang: HREFLANG[locale],
    href: localizePath(locale, base),
  }));
  if (!availableLocales.includes(DEFAULT_LOCALE)) return entries;
  return [...entries, { hreflang: 'x-default', href: localizePath(DEFAULT_LOCALE, base) }];
}
