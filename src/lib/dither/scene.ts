import * as THREE from 'three';
import { createWordmark, createGrantedPlate } from './wordmark';

export interface DitherScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  wordmark: THREE.Mesh;
  granted: THREE.Mesh;
  shell: THREE.Mesh;
  dispose(): void;
}

export function createScene(): DitherScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 240);
  camera.position.set(0, 1.3, 8.6);

  const wordmark = createWordmark();
  wordmark.position.set(0, 1.3, 2.6);
  scene.add(wordmark);

  const granted = createGrantedPlate();
  granted.position.set(0, 1.3, 3.4);
  scene.add(granted);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.4, 2),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.7, wireframe: true, transparent: true, opacity: 0,
    }),
  );
  shell.position.y = 1.3;
  scene.add(shell);

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

  return {
    scene, camera, wordmark, granted, shell,
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
