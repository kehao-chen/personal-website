import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  // 底線開頭的檔案視為草稿，不會被收錄
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    lang: z.enum(['en', 'zh']),
    tags: z.array(z.string()).default([]),
    translationKey: z.string().optional(),
    readingTime: z.number().int().positive().optional(),
  }),
});

export const collections = { posts };
