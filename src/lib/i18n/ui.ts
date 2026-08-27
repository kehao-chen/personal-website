import type { Locale } from '../posts';

const STRINGS = {
  en: {
    'nav.skipToContent': 'Skip to content',
    'nav.home': 'HOME',
    'nav.writing': 'WRITING',
    'nav.about': 'ABOUT',
    'writing.count': 'POSTS',
    'writing.allTags': 'ALL',
    'writing.empty': 'No posts match this tag.',
    'post.readingTime': 'MIN',
    'post.translationAvailable': 'Also available in 中文',
    'post.onlyLanguage': 'This post is only available in its original language.',
    'skip.sequence': 'CLICK / ANY KEY TO SKIP',
    'error.404.title': 'SEGMENT NOT FOUND',
    'error.404.body': 'That path does not exist on this host.',
    'error.404.back': 'RETURN TO ROOT',
    'profile.open': 'Open ~/.profile',
    'profile.close': 'Close ~/.profile',
    'cert.name': 'Certification',
    'cert.issuer': 'Issuer',
    'cert.verification': 'Verification',
    'cert.verify': 'verify',
  },
  zh: {
    'nav.skipToContent': '跳至主要內容',
    'nav.home': 'HOME',
    'nav.writing': 'WRITING',
    'nav.about': 'ABOUT',
    'writing.count': '篇',
    'writing.allTags': '全部',
    'writing.empty': '沒有符合這個標籤的文章。',
    'post.readingTime': '分鐘',
    'post.translationAvailable': '本篇另有 English 版本',
    'post.onlyLanguage': '本篇僅有原文版本。',
    'skip.sequence': '點擊或按任意鍵跳過',
    'error.404.title': 'SEGMENT NOT FOUND',
    'error.404.body': '這個路徑在這台主機上不存在。',
    'error.404.back': '回到根目錄',
    'profile.open': '開啟 ~/.profile',
    'profile.close': '關閉 ~/.profile',
    'cert.name': '證照',
    'cert.issuer': '發證機構',
    'cert.verification': '驗證',
    'cert.verify': '驗證',
  },
} as const;

export type UiKey = keyof (typeof STRINGS)['en'];

export function t(locale: Locale, key: UiKey): string {
  return STRINGS[locale][key];
}
