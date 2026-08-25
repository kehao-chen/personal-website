import * as THREE from 'three';
import type { Frame } from '../sequence/timeline';
import { FRAGMENT_SHADER, VERTEX_SHADER, UNIFORM_NAMES } from './shader';
import { createScene, type DitherScene } from './scene';

export { FRAGMENT_SHADER, VERTEX_SHADER, UNIFORM_NAMES };

export interface DitherOptions {
  ground?: string;
  ink?: string;
  accent?: string;
}

export interface DitherHandle {
  /** true 表示 WebGL 初始化成功、正在算繪；false 表示初始化失敗，其餘方法皆為 no-op */
  readonly active: boolean;
  /** 每一幀餵進來的可視參數 */
  setFrame(frame: Frame): void;
  /** 觸發一次換頁用的 datamosh 爆發 */
  burst(): void;
  /** 閱讀模式：完全停止算繪，畫面留在純底色 */
  setReading(reading: boolean): void;
  destroy(): void;
}

const NAV_BURST_MS = 420;
const FLICKER_INTERVAL_MS = 4200;

function toVector(hex: string): THREE.Vector3 {
  const value = hex.replace('#', '');
  return new THREE.Vector3(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

/** 初始化失敗時回傳的假手把：不算繪、不配置資源，呼叫端靠 `active` 分辨 */
function createInertHandle(): DitherHandle {
  return {
    active: false,
    setFrame() {},
    burst() {},
    setReading() {},
    destroy() {},
  };
}

/**
 * 這個模組不知道網站的存在。給它一個 canvas 和一組數值，它畫出畫面。
 */
export function createDither(
  canvas: HTMLCanvasElement,
  options: DitherOptions = {},
): DitherHandle {
  const ground = options.ground ?? '#22212C';
  const ink = options.ink ?? '#F8F8F2';
  const accent = options.accent ?? '#80FFEA';

  // 初始化任何一步都可能丟出例外（拿不到 WebGL context、超過 context 上限、
  // 驅動拒絕指定的 context 屬性……）。失敗時不讓例外穿出去，改回傳惰性手把，
  // 由呼叫端決定要不要退回無 WebGL 的樣式。
  let renderer: THREE.WebGLRenderer | undefined;
  let world: DitherScene | undefined;
  let target: THREE.WebGLRenderTarget | undefined;
  let postQuad: THREE.Mesh | undefined;
  let postMaterial: THREE.ShaderMaterial | undefined;

  try {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(dpr);

    world = createScene();
    target = new THREE.WebGLRenderTarget(1, 1);

    const uniforms = {
      tDiffuse: { value: target.texture },
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uAmt: { value: 0 },
      uGrain: { value: 0 },
      uRing: { value: 0 },
      uRingSpeed: { value: 1.4 },
      uInk: { value: toVector(ink) },
      uGround: { value: toVector(ground) },
      uAccent: { value: toVector(accent) },
    };

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(postQuad);

    const activeWorld = world;
    const activeRenderer = renderer;
    const activeTarget = target;
    const activePostMaterial = postMaterial;
    const activePostQuad = postQuad;

    let frame: Frame | null = null;
    let reading = false;
    let running = true;
    let rafId = 0;

    let burstStart = -Infinity;
    let nextFlickerAt = performance.now() + FLICKER_INTERVAL_MS;
    let flickerUntil = 0;

    const start = performance.now();

    function burstAmount(now: number): number {
      const e = (now - burstStart) / NAV_BURST_MS;
      if (e < 0 || e >= 1) return 0;
      return e < 0.1 ? e / 0.1 : e < 0.55 ? 1 : 1 - (e - 0.55) / 0.45;
    }

    /** 低頻閃動：偶爾抽一下，不是持續抖 */
    function flickerAmount(now: number): number {
      if (now > nextFlickerAt) {
        flickerUntil = now + 70 + Math.random() * 90;
        nextFlickerAt = now + FLICKER_INTERVAL_MS * (0.6 + Math.random() * 0.8);
      }
      return now < flickerUntil ? 0.35 + Math.random() * 0.45 : 0;
    }

    function resize(): void {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      if (canvas.width !== Math.floor(width * dpr)) {
        activeRenderer.setSize(width, height, false);
        activeWorld.camera.aspect = width / height;
        activeWorld.camera.updateProjectionMatrix();
      }
      activeTarget.setSize(Math.floor(width * dpr), Math.floor(height * dpr));
      uniforms.uRes.value.set(width * dpr, height * dpr);
    }

    function tick(): void {
      if (!running) return;
      rafId = requestAnimationFrame(tick);

      const now = performance.now();
      const burst = burstAmount(now);

      // 閱讀模式：沒有換頁故障要畫時，完全不算繪
      if (reading && burst === 0) return;
      if (!frame) return;

      resize();

      const seconds = (now - start) / 1000;
      const flicker = reading ? 0 : flickerAmount(now);

      uniforms.uTime.value = seconds;
      uniforms.uGrain.value = reading ? 0 : frame.grain;
      uniforms.uRing.value = reading ? 0 : frame.ring;
      uniforms.uRingSpeed.value = frame.ringSpeed;
      uniforms.uAmt.value = Math.max(reading ? 0 : frame.glitch, burst, flicker * 0.5);

      const wordmarkMaterial = activeWorld.wordmark.material as THREE.MeshBasicMaterial;
      const grantedMaterial = activeWorld.granted.material as THREE.MeshBasicMaterial;
      const shellMaterial = activeWorld.shell.material as THREE.MeshStandardMaterial;

      const flickerDip = flicker > 0 ? 0.25 + Math.random() * 0.75 : 1;
      wordmarkMaterial.opacity = reading ? 0 : frame.wordmark * flickerDip;
      grantedMaterial.opacity = reading ? 0 : frame.granted;
      shellMaterial.opacity = reading ? 0 : frame.scene * 0.5;

      activeWorld.shell.rotation.x = seconds * 0.09;
      activeWorld.shell.rotation.y = seconds * 0.14;
      activeWorld.camera.position.x = Math.sin(seconds * 0.22) * 0.9;
      activeWorld.camera.position.y = 1.6 + Math.sin(seconds * 0.3) * 0.2;
      activeWorld.camera.lookAt(0, 1.3, 0);

      activeRenderer.setRenderTarget(activeTarget);
      activeRenderer.render(activeWorld.scene, activeWorld.camera);
      activeRenderer.setRenderTarget(null);
      activeRenderer.render(postScene, postCamera);
    }

    rafId = requestAnimationFrame(tick);

    return {
      active: true,
      setFrame(next) { frame = next; },
      burst() { burstStart = performance.now(); },
      setReading(next) {
        // 只是停止算繪的話，最後一幀會留在畫布上凍住（換頁進文章時就是文字底下
        // 那一層殘影）。進入閱讀模式時必須主動把畫布清成純底色。
        // 不能改用「數值歸零再畫一幀」代替：step(bayer4(cell), 0) 仍會點亮所有
        // 門檻為 0 的格子，得到的是稀疏墨點網格而不是乾淨底色。
        if (next && !reading) {
          activeRenderer.setRenderTarget(null);
          activeRenderer.setClearColor(new THREE.Color(ground), 1);
          activeRenderer.clear();
        }
        reading = next;
      },
      destroy() {
        running = false;
        cancelAnimationFrame(rafId);
        activeWorld.dispose();
        activePostQuad.geometry.dispose();
        activePostMaterial.dispose();
        activeTarget.dispose();
        activeRenderer.dispose();
      },
    };
  } catch {
    // 盡力釋放例外發生前已經配置好的資源，不留下半套 GPU 資源。
    world?.dispose();
    postQuad?.geometry.dispose();
    postMaterial?.dispose();
    target?.dispose();
    renderer?.dispose();
    return createInertHandle();
  }
}
