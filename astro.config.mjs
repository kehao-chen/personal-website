import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://happyhacking.ninja',
  output: 'static',
  markdown: {
    // 預設的 github-dark 會把 GitHub 的顏色寫成 inline style（含
    // background-color:#24292e），specificity 壓過 .prose pre，整站的
    // --syntax-* token 因此完全用不到。改用 css-variables 主題，顏色由
    // base.css 裡的 --astro-code-* 對應回專案 token。
    shikiConfig: { theme: 'css-variables' },
  },
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', zh: 'zh-Hant' },
      },
    }),
  ],
});
