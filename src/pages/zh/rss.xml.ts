import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { loadPosts, sortByDate, filterByLocale } from '../../lib/posts';
import { localizePath } from '../../lib/i18n/routing';

export async function GET(context: APIContext) {
  const posts = sortByDate(filterByLocale(await loadPosts(), 'zh'));
  return rss({
    title: 'KEHAO — happyhacking.ninja',
    description: '雲端原生與 AI 基礎建設的筆記。',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.date,
      link: localizePath('zh', `/writing/${post.slug}`),
      categories: post.tags,
    })),
  });
}
