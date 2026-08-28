import type { Locale } from './i18n/locales';

/**
 * 首頁 `.profile` 視窗的內容。
 *
 * 這個檔案在 shell 裡本來就是一連串 `export KEY=value`，所以視窗裡放的是欄位
 * 而不是散文——同樣的視覺重量下講得完「你是誰、現在在做什麼、用什麼、在哪、
 * 去哪找你」，而不是把 about 的前兩段再縮寫一次。
 *
 * 值住在這裡而不是 index.astro：中英兩頁各寫一份的話，下一次改近況就得記得
 * 改兩個地方。頁面只負責排版。
 */

export interface ProfileLink {
  /** 終端機風格的鍵名，不翻譯 */
  label: string;
  href: string;
}

export interface ProfileCard {
  /** 是誰 */
  who: string;
  /** 現在在做什麼。改動這裡時記得 about 的 Now 段也要一起改 */
  now: string;
  /** 常用的東西 */
  stack: string;
  /** 在哪、在哪出沒 */
  where: string;
  /** 收在最後的簽名檔 */
  motto: string;
  links: readonly ProfileLink[];
}

/** 欄位的顯示順序。先講是誰，再講現在在做什麼——名片的讀法 */
export const PROFILE_FIELDS = ['who', 'now', 'stack', 'where'] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export const PROFILE_CARD: Record<Locale, ProfileCard> = {
  en: {
    who: 'INTJ-O-H · thoroughly average 1x engineer',
    now: 'Making LLM agents production-grade — deployable, auditable, debuggable',
    stack: 'Azure · Kubernetes · Cloud-native · Agentic coding',
    where: 'Taipei · DevOpsDays Taipei / JCConf regular',
    motto: 'Anxiety is just compute starvation.',
    links: [
      { label: 'GITHUB', href: 'https://github.com/kehao-chen' },
      { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/kehao-chen/?locale=en' },
      { label: 'X', href: 'https://x.com/_hhnj' },
    ],
  },
  zh: {
    who: 'INTJ-O-H · 自我認證的平庸 1x 軟體工程師',
    now: '把 LLM agent 做成能上線、能稽核、出事查得到的系統',
    stack: 'Azure · Kubernetes · Cloud-native · Agentic coding',
    where: '台北 · DevOpsDays Taipei / JCConf 常客',
    motto: '焦慮來自於算力不足',
    links: [
      { label: 'GITHUB', href: 'https://github.com/kehao-chen' },
      { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/kehao-chen/?locale=zh_TW' },
      { label: 'X', href: 'https://x.com/_hhnj' },
    ],
  },
};
