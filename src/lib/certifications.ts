/**
 * 證照清單。兩個語言版本的 about 共用同一份——名稱與驗證連結都是不翻譯的
 * 固有名詞，各寫一份的話下一次換連結就得記得改兩個地方（原本是 5 筆 × 2 頁
 * 共 10 條 URL）。頁面只負責翻譯欄位標題與連結的無障礙名稱。
 */
export interface Certification {
  /** 證照全名，不翻譯 */
  name: string;
  /** 發證機構，不翻譯 */
  issuer: string;
  /** 官方驗證頁 */
  href: string;
}

export const CERTIFICATIONS: readonly Certification[] = [
  {
    name: 'Azure Solutions Architect Expert',
    issuer: 'Microsoft',
    href: 'https://learn.microsoft.com/api/credentials/share/en-us/kehao-chen/5C1C6D2DCE6C5DAE?sharingId=339B6985F6579064',
  },
  {
    name: 'DevOps Engineer Expert',
    issuer: 'Microsoft',
    href: 'https://learn.microsoft.com/api/credentials/share/en-us/kehao-chen/88780FEC56298A7D?sharingId=339B6985F6579064',
  },
  {
    name: 'Azure Administrator Associate',
    issuer: 'Microsoft',
    href: 'https://learn.microsoft.com/api/credentials/share/en-us/kehao-chen/AA2D84683A352AC?sharingId=339B6985F6579064',
  },
  {
    name: 'Azure AI Engineer Associate',
    issuer: 'Microsoft',
    href: 'https://learn.microsoft.com/api/credentials/share/en-us/kehao-chen/A571699F719CAB4C?sharingId=339B6985F6579064',
  },
  {
    name: 'CKA: Certified Kubernetes Administrator',
    issuer: 'The Linux Foundation',
    href: 'https://www.credly.com/badges/cb96f42a-de8f-4948-b6a0-61365bdeff4e/linked_in_profile',
  },
] as const;
