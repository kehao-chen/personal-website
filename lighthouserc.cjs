/**
 * 目標是綠色（>= 0.90），不是滿分。
 * numberOfRuns: 3 —— Lighthouse 分數有雜訊，LHCI 取中位數。
 * 只跑一次會產生隨機失敗的測試，那比沒有測試更糟。
 */
const GREEN = 0.9;

/**
 * CPU 節流倍率：本機 4×（Lighthouse 行動模擬預設），CI 1×。
 *
 * 不是因為 runner 慢。實測 benchmarkIndex，GitHub runner 2123–2436、本機
 * 2388，單核效能是同一個級別。壞掉的是「4× CDP 節流 + 2 vCPU + WebGL」這個
 * 組合：CDP 的節流靠讓 renderer thread 空轉實作，開發機有多餘的核心吸收
 * compositor / raster，2 vCPU 的 VM 沒有，於是 three.js 的頁面 TBT 從本機的
 * 193 ms 炸到 4687–13251 ms（run 33148261490），三次之間還差到三倍。零 JS 的
 * 兩個文章頁在同一輪 4× 下全過——瓶頸只在這個組合，不在站本身。
 *
 * 代價要講清楚：CI 不節流 CPU，TBT 在 CI 就是個弱訊號（實測 0–107 ms，離
 * 300 ms 門檻很遠，擋不住中等程度的退步）。4× 的效能契約留在本機
 * `npm run test:lighthouse` 與 docs/lighthouse-baseline.md。CI 擋得住的是
 * a11y / best-practices / SEO 與網路節流下的 LCP、FCP、CLS——這些不受影響。
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
