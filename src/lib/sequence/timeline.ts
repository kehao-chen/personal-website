export type Phase = 'boot' | 'scan' | 'breach' | 'granted' | 'settle' | 'idle';

export interface Frame {
  phase: Phase;
  /** 抖色顆粒（隨機亮度擾動），不是抖色本身的密度 */
  grain: number;
  /** 脈衝環強度 */
  ring: number;
  /** 脈衝環擴散速度（不受 0..1 限制） */
  ringSpeed: number;
  /** datamosh 故障強度 */
  glitch: number;
  /** 字標不透明度 */
  wordmark: number;
  /** ACCESS GRANTED 字板不透明度 */
  granted: number;
  /** 3D 場景整體不透明度 */
  scene: number;
  /** 導覽列與頁面內容不透明度 */
  chrome: number;
  /** 全螢幕白閃 */
  flash: number;
}

export const TIMELINE = {
  boot: 900,
  scan: 1500,
  breach: 1820,
  granted: 2500,
  settle: 3050,
} as const;

export const IDLE_FRAME: Frame = {
  phase: 'idle',
  grain: 0.02,
  ring: 0.26,
  ringSpeed: 1.4,
  glitch: 0.02,
  wordmark: 1,
  granted: 0,
  scene: 1,
  chrome: 1,
  flash: 0,
};

const BOOT_LINES: Array<[string, number]> = [
  ['> ESTABLISHING LINK', 340],
  ['> HANDSHAKE 0x4F2A ······ OK', 240],
  ['> BYPASSING EDGE/ctOS ···· OK', 240],
  ['> PRIVILEGE  ninja', 200],
  ['> TARGET  happyhacking.ninja', 200],
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * 純函式：給定序列開始後的毫秒數，回傳該格所有可視參數。
 * 沒有 DOM、沒有 WebGL、沒有隨機性——完全可測。
 */
export function frameAt(input: number): Frame {
  const ms = Math.max(0, input);

  if (ms < TIMELINE.boot) {
    const k = ms / TIMELINE.boot;
    return {
      phase: 'boot',
      grain: 0.55 * (1 - k * 0.35),
      ring: 0.1 + k * 0.15,
      ringSpeed: 0.8,
      glitch: 0.05,
      wordmark: 0,
      granted: 0,
      scene: k * 0.25,
      chrome: 0,
      flash: 0,
    };
  }

  if (ms < TIMELINE.scan) {
    const k = (ms - TIMELINE.boot) / (TIMELINE.scan - TIMELINE.boot);
    return {
      phase: 'scan',
      grain: 0.35 * (1 - k),
      ring: 0.25 + k * 0.55,
      ringSpeed: 0.8 + k * 6,
      glitch: 0.05 + k * 0.25,
      wordmark: 0,
      granted: 0,
      scene: 0.25 + k * 0.75,
      chrome: 0,
      flash: 0,
    };
  }

  if (ms < TIMELINE.breach) {
    const k = (ms - TIMELINE.scan) / (TIMELINE.breach - TIMELINE.scan);
    return {
      phase: 'breach',
      grain: 0.15 + k * 0.3,
      ring: 0.8 * (1 - k * 0.6),
      ringSpeed: 7,
      glitch: 1,
      wordmark: 0,
      granted: 0,
      scene: 1,
      chrome: 0,
      flash: clamp01(k ** 3 * 0.6),
    };
  }

  if (ms < TIMELINE.granted) {
    const k = (ms - TIMELINE.breach) / (TIMELINE.granted - TIMELINE.breach);
    // 尾段淡出，讓字標接手
    const fadeOut = k > 0.78 ? 1 - (k - 0.78) / 0.22 : 1;
    return {
      phase: 'granted',
      grain: 0.2 * (1 - k),
      ring: 0.3 + (1 - k) ** 2 * 0.4,
      ringSpeed: 2.4,
      glitch: Math.max(0.08, 0.75 * (1 - k) ** 1.6),
      wordmark: 0,
      granted: clamp01(Math.min(1, k * 4) * fadeOut),
      scene: 1,
      chrome: 0,
      flash: clamp01(0.6 - k * 2.6),
    };
  }

  if (ms < TIMELINE.settle) {
    const k = (ms - TIMELINE.granted) / (TIMELINE.settle - TIMELINE.granted);
    return {
      phase: 'settle',
      grain: 0.1 * (1 - k) + IDLE_FRAME.grain,
      ring: IDLE_FRAME.ring,
      ringSpeed: IDLE_FRAME.ringSpeed,
      glitch: 0.25 * (1 - k) + IDLE_FRAME.glitch,
      wordmark: clamp01(k),
      granted: 0,
      scene: 1,
      chrome: clamp01((k - 0.35) / 0.65),
      flash: 0,
    };
  }

  return { ...IDLE_FRAME };
}

/**
 * 開場終端機的逐字打字狀態。仍在打的那一行結尾帶底線游標。
 */
export function bootLinesAt(input: number): string[] {
  const ms = Math.max(0, input);
  const out: string[] = [];
  let elapsed = 0;

  for (const [text, duration] of BOOT_LINES) {
    if (ms <= elapsed) break;
    const k = Math.min(1, (ms - elapsed) / duration);
    const visible = text.slice(0, Math.ceil(text.length * k));
    out.push(k < 1 ? `${visible}_` : text);
    elapsed += duration;
  }

  return out;
}
