import type { CollectionEntry } from 'astro:content';
import { estimateReadingTime } from './reading-time';
import { LOCALES, type Locale } from './i18n/locales';

// 語言清單的家在 i18n/locales.ts（見那裡的註解）；這裡沿用原本的匯出點，
// 讓既有的 `import type { Locale } from '../lib/posts'` 全部維持不變。
export { LOCALES, type Locale };

export interface PostMeta {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  translationKey?: string;
  readingTime: number;
}

export type LoadedPost = PostMeta & { entry: CollectionEntry<'posts'> };

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** id 形如 "zh/aks-lun"。語言目錄是唯一真相，frontmatter 的 lang 必須一致。 */
export function parseEntryId(id: string): { locale: Locale; slug: string } {
  const [dir, ...rest] = id.split('/');
  if (rest.length === 0 || !isLocale(dir)) {
    throw new Error(
      `文章 id "${id}" 必須位於合法的 locale 目錄下（${LOCALES.join(' / ')}），例如 zh/my-post`,
    );
  }
  return { locale: dir, slug: rest.join('/') };
}

export function sortByDate(posts: PostMeta[]): PostMeta[] {
  return [...posts].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function filterByLocale<T extends PostMeta>(posts: T[], locale: Locale): T[] {
  return posts.filter((post) => post.locale === locale);
}

export function filterByTag<T extends PostMeta>(posts: T[], tag: string | null): T[] {
  if (!tag) return posts;
  const needle = tag.toLowerCase();
  return posts.filter((post) => post.tags.some((t) => t.toLowerCase() === needle));
}

export function collectTags(posts: PostMeta[]): string[] {
  return [...new Set(posts.flatMap((post) => post.tags))].sort();
}

export function findTranslation<T extends PostMeta>(post: T, all: T[]): T | undefined {
  if (!post.translationKey) return undefined;
  return all.find(
    (other) => other.translationKey === post.translationKey && other.locale !== post.locale,
  );
}

/**
 * 唯一碰 astro:content 的地方。其餘邏輯都是上面的純函式。
 * 動態 import 是為了讓本檔案能在 vitest（沒有 Astro 的 astro:content 虛擬模組）下被
 * 載入，以便測試上面的純函式；loadPosts() 本身則交由 Task 11 的 Playwright 端對端覆蓋。
 */
export async function loadPosts(): Promise<LoadedPost[]> {
  const { getCollection } = await import('astro:content');
  const entries = await getCollection('posts');
  return entries.map((entry) => {
    const { locale, slug } = parseEntryId(entry.id);
    if (entry.data.lang !== locale) {
      throw new Error(
        `${entry.id}: frontmatter lang="${entry.data.lang}" 與所在目錄 "${locale}" 不符`,
      );
    }
    return {
      slug,
      locale,
      title: entry.data.title,
      description: entry.data.description,
      date: entry.data.date,
      tags: entry.data.tags,
      translationKey: entry.data.translationKey,
      readingTime: entry.data.readingTime ?? estimateReadingTime(entry.body ?? ''),
      entry,
    };
  });
}
