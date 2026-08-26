import * as THREE from 'three';
import { FRAMING } from './framing';

/**
 * 貼圖畫布相對於設計尺寸的倍率。字標在桌面約佔 1700 螢幕像素寬，1400px 的
 * 貼圖是在放大取樣——邊緣先被雙線性內插糊掉，再送進 1-bit 量化，糊的部分就
 * 變成抖色雜訊。畫得比顯示還大一點，量化拿到的才是硬邊。
 */
const TEXTURE_SCALE = 1.6;

interface TextPlaneOptions {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

function textPlane({ width, height, canvasWidth, canvasHeight, draw }: TextPlaneOptions): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(canvasWidth * TEXTURE_SCALE);
  canvas.height = Math.round(canvasHeight * TEXTURE_SCALE);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // draw() 一律用設計座標，倍率只在這裡套一次
    ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
    // 畫布不填底色，字以外的地方 alpha 留 0。填黑底的話這個平面就是一塊
    // 9.0 × 2.44 的不透明矩形，會把後面的線框球整條橫帶切掉——字標周圍
    // 那塊「跟別處不一樣」的區域就是它。
    draw(ctx, canvasWidth, canvasHeight);
  }

  const texture = new THREE.CanvasTexture(canvas);
  // mipmap 是為了縮到很小的貼圖準備的，字標最多縮到三成——選到的那一階
  // mipmap 只會讓筆畫更糊。關掉 mipmap，讓每一格都直接從全解析度取樣。
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
    }),
  );
}

/** 白色繪製 → post shader 視為 ink */
export function createWordmark(): THREE.Mesh {
  return textPlane({
    width: FRAMING.wordmarkWidth, height: 2.44, canvasWidth: 1400, canvasHeight: 380,
    draw: (ctx, w) => {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 200px ui-monospace, Menlo, monospace';
      ctx.fillText('KEHAO', w / 2, 150);
      // 副標在手機上只剩三成大小。600/46px 的筆畫換算不到兩個抖色格，量化
      // 後會斷成一排點；加粗到 700/56px 才撐得住。
      ctx.font = '700 66px ui-monospace, Menlo, monospace';
      ctx.fillText('/ /  H A P P Y   H A C K I N G', w / 2, 306);
    },
  });
}

/** 紅色繪製 → post shader 的 accentMask 判定為強調色。全片唯一彩色時刻。 */
export function createGrantedPlate(): THREE.Mesh {
  return textPlane({
    width: FRAMING.grantedWidth, height: 2.4, canvasWidth: 1500, canvasHeight: 380,
    draw: (ctx, w, h) => {
      ctx.fillStyle = '#f00';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 104px ui-monospace, Menlo, monospace';
      ctx.fillText('ACCESS  GRANTED', w / 2, h / 2 - 26);
      ctx.font = '600 34px ui-monospace, Menlo, monospace';
      ctx.fillText('/ /  H A P P Y   H A C K I N G', w / 2, h / 2 + 66);
    },
  });
}
