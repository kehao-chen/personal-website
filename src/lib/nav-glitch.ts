const DURATION_MS = 420;
const SWAP_AT = 0.42;
const LAYER_COUNT = 2;

/** 文章內頁不套用故障轉場：門面耍帥，文章負責被讀完。 */
function isFrontRoute(url: URL): boolean {
  return !/\/writing\/[^/]+\/?$/.test(url.pathname);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initNavGlitch(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let layers: HTMLElement[] = [];
  let rafId = 0;

  function clearLayers(): void {
    cancelAnimationFrame(rafId);
    layers.forEach((layer) => layer.remove());
    layers = [];
  }

  function buildLayers(): void {
    const host = document.getElementById('fx-layers');
    const source = document.querySelector('main.page');
    if (!host || !source) return;
    clearLayers();
    for (let i = 0; i < LAYER_COUNT; i += 1) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.classList.add('fx-layer');
      clone.dataset.layer = String(i);
      host.appendChild(clone);
      layers.push(clone);
    }
  }

  function animate(startedAt: number): void {
    const elapsed = (performance.now() - startedAt) / DURATION_MS;
    if (elapsed >= 1) {
      clearLayers();
      return;
    }
    const envelope =
      elapsed < 0.1 ? elapsed / 0.1
      : elapsed < 0.55 ? 1
      : 1 - (elapsed - 0.55) / 0.45;
    const amount = Math.max(0, envelope);

    layers.forEach((layer, index) => {
      const top = Math.random() * 70;
      const height = 6 + Math.random() * 26;
      const drift = (Math.random() - 0.5) * 90 * amount * (index ? 0.4 : 1);
      layer.style.opacity = String(0.9 * amount);
      layer.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`;
      layer.style.transform = `translate3d(${drift}px, 0, 0)`;
    });

    rafId = requestAnimationFrame(() => animate(startedAt));
  }

  document.addEventListener('astro:before-preparation', (event) => {
    const nav = event as unknown as {
      from: URL;
      to: URL;
      loader: () => Promise<void>;
    };

    if (reduced.matches || !isFrontRoute(nav.from) || !isFrontRoute(nav.to)) return;

    const originalLoader = nav.loader;
    nav.loader = async () => {
      window.__dither?.burst();
      buildLayers();
      animate(performance.now());
      // 讓交換發生在故障最高點
      await Promise.all([originalLoader(), wait(DURATION_MS * SWAP_AT)]);
    };
  });

  document.addEventListener('astro:after-swap', () => {
    // 換頁後停止抖色算繪：文章內頁的背景是靜止的純底色
    const reading = !isFrontRoute(new URL(window.location.href));
    window.__dither?.setReading(reading);
  });

  document.addEventListener('astro:page-load', () => {
    // 故障衰減完就清乾淨，避免殘影卡在畫面上
    setTimeout(clearLayers, DURATION_MS);
  });
}
