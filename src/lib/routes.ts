import { stripLocale } from './i18n/routing';

/**
 * 門面 / 閱讀的分界，全站唯一一份。
 *
 * 這個區分以前散在三個地方（`front` prop、`nav-glitch` 的正規表示式、以及
 * 「哪個元件被 import」），而且已經彼此矛盾過：`/404` 用的是 ReadingLayout，
 * 卻被舊的 `isFrontRoute` 判成門面路由，離開 404 頁時會多播一次故障轉場。
 * 現在只留這一份，nav-glitch 與 site-dither 都從這裡拿答案。
 */

/** 文章內頁與 404：這兩種頁面只負責被讀完，不播故障轉場、不算繪抖色。 */
export function isReadingRoute(pathname: string): boolean {
  const base = stripLocale(pathname);
  return /^\/writing\/[^/]+\/$/.test(base) || base === '/404/';
}

/** 首頁（`/` 與 `/zh/`）：唯一會播入侵序列、唯一有字標的路由。 */
export function isHomeRoute(pathname: string): boolean {
  return stripLocale(pathname) === '/';
}
