const CJK_PER_MINUTE = 300;
const WORDS_PER_MINUTE = 200;

/** 中日韓統一表意文字與常用標點，逐字計算 */
const CJK_PATTERN = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/g;

function stripNonProse(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')  // frontmatter
    .replace(/```[\s\S]*?```/g, '')                  // 圍籬式程式碼區塊
    .replace(/`[^`\n]*`/g, '')                       // 行內程式碼
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '');          // 連結與圖片
}

/**
 * 估算閱讀時間（分鐘）。中文以字計、英文以詞計，兩者分開換算後相加。
 * 永遠回傳 >= 1 的整數。
 */
export function estimateReadingTime(markdown: string): number {
  const prose = stripNonProse(markdown);

  const cjkCount = (prose.match(CJK_PATTERN) ?? []).length;
  const latinWords = prose
    .replace(CJK_PATTERN, ' ')
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;

  const minutes = cjkCount / CJK_PER_MINUTE + latinWords / WORDS_PER_MINUTE;
  return Math.max(1, Math.ceil(minutes));
}
