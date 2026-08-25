import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://happyhacking.ninja',
  output: 'static',
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
});
