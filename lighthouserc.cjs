/**
 * 目標是綠色（>= 0.90），不是滿分。
 * numberOfRuns: 3 —— Lighthouse 分數有雜訊，LHCI 取中位數。
 * 只跑一次會產生隨機失敗的測試，那比沒有測試更糟。
 */
const GREEN = 0.9;

/**
 * CPU 節流倍率。
 *
 * GitHub runner 是 2 vCPU 的共用機器，本身就比開發機慢好幾倍；在上面再套
 * 行動模擬預設的 4× 節流，等於節流兩次。實測（2026-08-28，run 33148261490）
 * TBT 從本機的 193 ms 變成 4687–13251 ms、performance 0.70——量到的不是這個
 * 站，是 runner 的排隊延遲。CI 上把倍率設回 1，其餘（網路節流、行動視窗、
 * 三次取中位數）完全不動。
 */
const cpuSlowdownMultiplier = process.env.CI ? 1 : 4;

/** 四個類別一律要綠 */
const categories = {
  'categories:performance': ['error', { minScore: GREEN }],
  'categories:accessibility': ['error', { minScore: GREEN }],
  'categories:best-practices': ['error', { minScore: GREEN }],
  'categories:seo': ['error', { minScore: GREEN }],
};

/**
 * 類別分數是加權合成的，可能藏住單一項爛掉的指標。
 * 這裡直接對 Core Web Vitals 的「良好」門檻設限。
 */
const vitals = {
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  'total-blocking-time': ['error', { maxNumericValue: 300 }],
  'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
};

/** 與本專案的設計紀律直接對應的個別稽核 */
const discipline = {
  // 配色紀律的第二道防線（第一道是 tokens.test.ts）
  'color-contrast': ['error', { minScore: 1 }],
  'html-has-lang': ['error', { minScore: 1 }],
  'document-title': ['error', { minScore: 1 }],
  'meta-description': ['error', { minScore: 1 }],
  hreflang: ['error', { minScore: 1 }],
  'heading-order': ['error', { minScore: 1 }],
  // three.js 必然會被判定為「未使用的 JavaScript」——它是刻意的設計選擇，不是疏失
  'unused-javascript': 'off',
  'legacy-javascript': 'off',
  // v1 沒有圖片，這些稽核沒有意義
  'uses-responsive-images': 'off',
  'modern-image-formats': 'off',
  // 靜態站的 CSP 由 Cloudflare Pages 的 _headers 處理，不在建置產物內
  'csp-xss': 'off',
};

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'localhost',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/about/',
        'http://localhost:4321/writing/',
        'http://localhost:4321/writing/approval-orchestrator/',
        'http://localhost:4321/zh/',
        'http://localhost:4321/zh/writing/aks-lun-exhaustion/',
      ],
      settings: {
        // 預設即為行動裝置模擬，明寫出來避免日後被誤改
        preset: 'desktop' === process.env.LHCI_PRESET ? 'desktop' : undefined,
        skipAudits: ['uses-http2'], // 本機 preview 沒有 HTTP/2，正式環境由 Cloudflare 提供
        throttling: { cpuSlowdownMultiplier },
      },
    },
    assert: {
      assertMatrix: [
        {
          // 文章內頁：零 JavaScript，標準最嚴
          matchingUrlPattern: '.*/writing/[^/]+/$',
          assertions: { ...categories, ...vitals, ...discipline },
        },
        {
          // 其餘所有路由（首頁、About、索引）：載入 WebGL
          matchingUrlPattern: '.*',
          assertions: { ...categories, ...vitals, ...discipline },
        },
      ],
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
