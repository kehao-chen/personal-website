import { frameAt, IDLE_FRAME, TIMELINE, bootLinesAt } from './sequence/timeline';
import { isHomeRoute, isReadingRoute } from './routes';
import type { DitherHandle } from './dither';

/**
 * `#fx` 的 canvas 有 `transition:persist`，跨換頁活著；抖色算繪器因此也必須
 * 跨換頁只有一個擁有者。這個模組就是那個擁有者。
 *
 * 之前 HeroSequence 與 SiteBackdrop 各自在模組頂層呼叫 `createDither` 並覆寫
 * `window.__dither`。Astro 的 client router 以 `src` 判斷腳本執行過沒有，兩個
 * 不同的 chunk 就是兩次執行——於是同一張已經有 WebGL context 的 canvas 上會
 * 長出第二個 `WebGLRenderer`，兩個 rAF 迴圈同時畫，後建立的那個蓋掉先建立的
 * 那個。實際後果：從 /writing/ 點 HOME 進首頁時，入侵序列被安靜背景蓋掉、
 * 字標在 DOM（gl-active → opacity 0）與 WebGL（wordmark: 0）兩層都消失。
 *
 * 所以：算繪器只建立一次，「這條路由該長什麼樣」則交給 `astro:page-load`
 * 每次換頁重新決定——換頁時 `swapRootAttributes` 會清掉 `<html>` 上所有執行期
 * 加的 class，`gl-active` 必須每次重新加回來。
 */

const SESSION_KEY = 'hh.sequence.played';

type Mode = 'home' | 'backdrop' | 'reading';

/** 非首頁門面路由的安靜背景：顆粒與脈衝環減半，場景更淡，字標為 0 */
const QUIET_FRAME = { ...IDLE_FRAME, grain: 0.01, ring: 0.13, scene: 0.5, wordmark: 0 };

let initialised = false;
let handle: DitherHandle | undefined;
let handlePromise: Promise<DitherHandle | undefined> | undefined;
/** createDither 回傳惰性 handle（探測過了但實際建構失敗）之後不再重試 */
let ditherFailed = false;
/** 探測結果快取：每次換頁都開一個 throwaway context 會逼近瀏覽器的 context 上限 */
let webglOk: boolean | undefined;
/** 換頁比動態 import 快時，用它作廢上一次還沒跑完的 apply() */
let applyToken = 0;
/** 序列的世代編號：換頁或重新 apply 時 +1，讓還在跑的 rAF 迴圈自己退場 */
let seqToken = 0;
let seqInFlight = false;
let skipAbort: AbortController | undefined;

function root(): HTMLElement {
  return document.documentElement;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL(): boolean {
  if (webglOk !== undefined) return webglOk;
  try {
    const probe = document.createElement('canvas');
    webglOk = Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    webglOk = false;
  }
  return webglOk;
}

/** sessionStorage 可能被封鎖（封鎖全部網站資料的瀏覽器設定）；封鎖時視為「還沒播過」 */
function hasPlayed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markPlayed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* 封鎖時不記錄，下次重新整理會再播一次——可接受 */
  }
}

/** 完全略過序列：不下載 three.js、不啟動 WebGL，DOM 字標留在畫面上 */
function fallBackToStatic(): void {
  root().classList.remove('seq-pending');
  document.getElementById('boot-log')?.remove();
  document.getElementById('skip-hint')?.remove();
}

/** 序列結束（或本來就不必播）：內容露出、開場終端機收掉 */
function markSequenceDone(): void {
  root().classList.remove('seq-pending');
  root().classList.add('seq-done');
  document.getElementById('boot-log')?.remove();
  document.getElementById('skip-hint')?.remove();
}

function stopSequence(): void {
  seqToken += 1;
  seqInFlight = false;
  skipAbort?.abort();
  skipAbort = undefined;
}

function modeFor(pathname: string): Mode {
  if (isReadingRoute(pathname)) return 'reading';
  return isHomeRoute(pathname) ? 'home' : 'backdrop';
}

/**
 * 單飛：`apply()` 可能同時有兩次在跑（模組載入時一次、`astro:page-load` 一次），
 * 而動態 import 是個 await 點。不共用同一個 promise 的話，兩次都會看到
 * `handle === undefined`，然後在同一張 canvas 上各建一個算繪器——正是要修的
 * 那個 bug 換個方式復發。
 */
function ensureHandle(canvas: HTMLCanvasElement): Promise<DitherHandle | undefined> {
  handlePromise ??= createHandle(canvas);
  return handlePromise;
}

async function createHandle(canvas: HTMLCanvasElement): Promise<DitherHandle | undefined> {
  if (handle) return handle;
  if (ditherFailed) return undefined;

  // 別的 chunk 先建立過就沿用它，絕不在同一張 canvas 上建立第二個算繪器
  if (window.__dither?.active) {
    handle = window.__dither;
    return handle;
  }

  // 動態 import：這一行是「沒有 WebGL 就不付下載成本」的實作
  const { createDither } = await import('./dither');
  const styles = getComputedStyle(root());
  const created = createDither(canvas, {
    ground: styles.getPropertyValue('--ground').trim(),
    ink: styles.getPropertyValue('--ink').trim(),
    accent: styles.getPropertyValue('--accent').trim(),
  });

  // 探測通過但實際建構仍可能失敗（context 上限、驅動拒絕……）
  if (!created.active) {
    ditherFailed = true;
    return undefined;
  }

  handle = created;
  window.__dither = created;
  return created;
}

function runSequence(live: DitherHandle): void {
  const bootLog = document.getElementById('boot-log');
  const skipHint = document.getElementById('skip-hint');
  const token = (seqToken += 1);
  seqInFlight = true;

  let startedAt = performance.now();

  // 提示由真正要播序列的這裡揭露：沒有 JS 的訪客不會看到一個永遠不會發生的提示
  skipHint?.removeAttribute('hidden');

  skipAbort = new AbortController();
  const skip = (): void => {
    startedAt = performance.now() - TIMELINE.settle;
  };
  document.addEventListener('keydown', skip, { signal: skipAbort.signal });
  document.addEventListener('pointerdown', skip, { signal: skipAbort.signal });

  root().style.setProperty('--seq-chrome', '0');

  function step(): void {
    // 換頁或重新 apply 過了：這一輪序列作廢，讓新的那一輪接手
    if (token !== seqToken) return;

    const ms = performance.now() - startedAt;
    const frame = frameAt(ms);
    live.setFrame(frame);

    if (bootLog) {
      bootLog.textContent = frame.phase === 'boot' || frame.phase === 'scan'
        ? bootLinesAt(ms).join('\n')
        : '';
      bootLog.style.opacity = frame.phase === 'breach'
        ? String(1 - (ms - TIMELINE.scan) / (TIMELINE.breach - TIMELINE.scan))
        : frame.phase === 'boot' || frame.phase === 'scan' ? '1' : '0';
    }
    root().style.setProperty('--seq-chrome', String(frame.chrome));
    root().style.setProperty('--seq-flash', String(frame.flash));

    // chrome 一開始長出來就把 #fx 沉回背景：內容硬切露出
    if (frame.chrome > 0) {
      root().classList.remove('seq-pending');
    }

    if (frame.phase === 'idle') {
      seqInFlight = false;
      skipAbort?.abort();
      skipAbort = undefined;
      markPlayed();
      markSequenceDone();
      return;
    }
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * 依目前路由決定這一頁該長什麼樣。每次 `astro:page-load` 都會跑一次，
 * 而且必須可以重複執行：`<html>` 上的 class 換頁時會被整批清掉。
 */
async function apply(): Promise<void> {
  const token = (applyToken += 1);
  const mode = modeFor(window.location.pathname);

  if (mode === 'reading') {
    // 文章內頁不建立算繪器；已經有的就停下來並清掉畫面，不讓上一頁的最後一幀
    // 凍在文章底下。
    stopSequence();
    handle?.setReading(true);
    root().classList.remove('seq-pending');
    return;
  }

  const canvas = document.getElementById('dither-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  // 「減少動態效果」或沒有 WebGL：完全不碰 three.js
  if (prefersReducedMotion() || !supportsWebGL()) {
    stopSequence();
    fallBackToStatic();
    return;
  }

  const live = await ensureHandle(canvas);
  if (token !== applyToken) return;   // 等 import 的時候又換頁了，交給新的 apply
  if (!live) {
    stopSequence();
    fallBackToStatic();
    return;
  }

  live.setReading(false);
  root().classList.add('gl-active');

  if (mode === 'backdrop') {
    stopSequence();
    live.setFrame(QUIET_FRAME);
    markSequenceDone();
    return;
  }

  // 首頁：序列還在跑就讓它跑完，別重頭再來一次
  if (seqInFlight) return;
  if (hasPlayed()) {
    live.setFrame(IDLE_FRAME);
    markSequenceDone();
    return;
  }
  runSequence(live);
}

export function initSiteDither(): void {
  if (initialised) return;
  initialised = true;

  // page-load 在首次載入也會發，但腳本執行與事件的先後在不同進入點下不保證，
  // 所以這裡直接跑一次；apply() 本來就設計成可以重複執行。
  document.addEventListener('astro:page-load', () => void apply());
  void apply();
}
