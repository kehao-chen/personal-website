import * as THREE from 'three';

interface TextPlaneOptions {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

function textPlane({ width, height, canvasWidth, canvasHeight, draw }: TextPlaneOptions): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  draw(ctx, canvasWidth, canvasHeight);

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0,
    }),
  );
}

/** 白色繪製 → post shader 視為 ink */
export function createWordmark(): THREE.Mesh {
  return textPlane({
    width: 9.0, height: 2.44, canvasWidth: 1400, canvasHeight: 380,
    draw: (ctx, w) => {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 200px ui-monospace, Menlo, monospace';
      ctx.fillText('KEHAO', w / 2, 150);
      ctx.font = '600 46px ui-monospace, Menlo, monospace';
      ctx.fillText('/ /  H A P P Y   H A C K I N G', w / 2, 300);
    },
  });
}

/** 紅色繪製 → post shader 的 accentMask 判定為強調色。全片唯一彩色時刻。 */
export function createGrantedPlate(): THREE.Mesh {
  return textPlane({
    width: 9.4, height: 2.4, canvasWidth: 1500, canvasHeight: 380,
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
