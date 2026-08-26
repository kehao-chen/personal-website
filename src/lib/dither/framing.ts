/**
 * 相機與場景物件的取景數字，是 scene.ts、wordmark.ts 與縮放計算的唯一來源。
 * 分散在三個檔案裡的話，改了相機位置而忘了改縮放公式，畫面會安靜地錯位。
 */
export const FRAMING = {
  fovDeg: 55,
  cameraZ: 8.6,
  wordmarkZ: 2.6,
  grantedZ: 3.4,
  /** 背景球體的中心深度 */
  shellZ: 0,
  /** 世界座標下的平面寬度，與 wordmark.ts 畫布的長寬比對應 */
  wordmarkWidth: 9.0,
  grantedWidth: 9.4,
  /** 球體半徑，可視寬度要容得下的是直徑 */
  shellRadius: 3.4,
  /**
   * 相機的高度、相機 lookAt 的高度，也是所有物件的高度。
   * 三者相同是脈衝環對齊的前提：環畫在螢幕正中央，只有當相機水平直視
   * 這條軸線時，位於軸線上的字標與球才會落在同一個中心。
   */
  baseY: 1.3,
  /**
   * 相機游移的振幅。字標在 z=2.6、lookAt 目標在 z=0，相機一橫移，兩者之間
   * 就產生視差——字標會離開螢幕中心，脈衝環卻不會。振幅必須小到只像輕微
   * 抖動：0.14 在字標深度換算約為畫面寬度的 1%。
   */
  driftX: 0.14,
  driftY: 0.07,
  /** 字標左右各留的餘裕，不讓它貼著畫面邊緣 */
  fitMargin: 0.92,
  /** 球體是背景，可以貼得比字標近一點 */
  shellFitMargin: 0.98,
} as const;

export interface PlaneFraming {
  /** 套在物件上的等比縮放，永遠 ≤ 1：只縮小，不放大超過設計尺寸 */
  scale: number;
  /** 物件的世界座標高度 */
  y: number;
}

/** 透視相機在指定深度看得到的世界座標範圍 */
export function visibleSize(z: number, aspect: number): { width: number; height: number } {
  const distance = FRAMING.cameraZ - z;
  const height = 2 * Math.tan((FRAMING.fovDeg * Math.PI) / 360) * distance;
  return { width: height * aspect, height };
}

/**
 * 純函式：給定畫布長寬比，回傳字標類平面該用的縮放與高度。
 *
 * 平面寬度是固定的世界座標，可視寬度卻與長寬比成正比。桌面（1.6）剛好容得下
 * 9.0 寬的字標，直式手機（~0.46）只看得到三分之一——所以窄畫面必須把平面縮到
 * 容得下為止。
 *
 * 高度永遠是 baseY，不隨長寬比位移：字標得跟脈衝環同心，窄畫面也一樣。
 * 讓出空間給終端機視窗是版面的事（base.css 的 `.desktop` 上內距），不是取景的事。
 */
export function framePlane(width: number, z: number, aspect: number): PlaneFraming {
  const visible = visibleSize(z, aspect);
  const scale = Math.min(1, (visible.width * FRAMING.fitMargin) / width);
  return { scale, y: FRAMING.baseY };
}

/**
 * 純函式：背景球體的縮放。
 *
 * 球是背景不是主體，所以只縮放、不位移——它跟字標、脈衝環同樣落在 baseY 上。
 */
export function frameShell(aspect: number): PlaneFraming {
  const visible = visibleSize(FRAMING.shellZ, aspect);
  const diameter = FRAMING.shellRadius * 2;
  const scale = Math.min(1, (visible.width * FRAMING.shellFitMargin) / diameter);
  return { scale, y: FRAMING.baseY };
}
