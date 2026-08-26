import * as THREE from 'three';
import { createWordmark, createGrantedPlate } from './wordmark';
import { FRAMING, framePlane, frameShell } from './framing';

export interface DitherScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  wordmark: THREE.Mesh;
  granted: THREE.Mesh;
  shell: THREE.Mesh;
  /** 依畫布長寬比重新取景：窄畫面把字標與球縮到容得下為止 */
  fit(aspect: number): void;
  dispose(): void;
}

export function createScene(): DitherScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(FRAMING.fovDeg, 1.6, 0.1, 240);
  camera.position.set(0, FRAMING.baseY, FRAMING.cameraZ);

  const wordmark = createWordmark();
  wordmark.position.set(0, FRAMING.baseY, FRAMING.wordmarkZ);
  scene.add(wordmark);

  const granted = createGrantedPlate();
  granted.position.set(0, FRAMING.baseY, FRAMING.grantedZ);
  scene.add(granted);

  // 線框球有兩件事會讓線消失，兩件都跟打光有關：
  //   1. 細分度 2（320 面）的線在 2px 抖色格上互相干涉成一團灰。降到 1
  //      （80 面），每條邊都佔得到獨立的格子。
  //   2. 用受光材質的話，背光側的亮度會低於抖色門檻整片不見，看起來像半顆
  //      球。線框不需要明暗——它的立體感來自輪廓與邊的交錯——所以改用不受
  //      光的 MeshBasicMaterial，每條線一樣亮。
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(FRAMING.shellRadius, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, wireframe: true, transparent: true, opacity: 0,
    }),
  );
  shell.position.set(0, FRAMING.baseY, FRAMING.shellZ);
  scene.add(shell);

  return {
    scene, camera, wordmark, granted, shell,
    fit(aspect) {
      const word = framePlane(FRAMING.wordmarkWidth, FRAMING.wordmarkZ, aspect);
      wordmark.scale.setScalar(word.scale);
      wordmark.position.y = word.y;

      const plate = framePlane(FRAMING.grantedWidth, FRAMING.grantedZ, aspect);
      granted.scale.setScalar(plate.scale);
      granted.position.y = plate.y;

      const globe = frameShell(aspect);
      shell.scale.setScalar(globe.scale);
      shell.position.y = globe.y;
    },
    dispose() {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material as THREE.Material & { map?: THREE.Texture };
          material.map?.dispose();
          material.dispose();
        }
      });
    },
  };
}
