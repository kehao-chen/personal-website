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

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(FRAMING.shellRadius, 2),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.7, wireframe: true, transparent: true, opacity: 0,
    }),
  );
  shell.position.set(0, FRAMING.baseY, FRAMING.shellZ);
  scene.add(shell);

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

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
