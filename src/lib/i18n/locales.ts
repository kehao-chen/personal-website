/**
 * 語言清單住在這裡，而不是 `posts.ts` 裡。
 *
 * `posts.ts` import 了 `astro:content`（只存在於伺服器端），而路由判定
 * （`routes.ts` → `routing.ts`）在瀏覽器端也要用。清單留在 posts.ts 會把整條
 * 內容集合的相依鏈拖進 client bundle，build 直接失敗。
 */
export const LOCALES = ['en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
