import * as THREE from 'three';

export class MapScene {
  constructor() {
    this.ground = null;
  }

  addToScene(scene, mapModel) {
    if (!mapModel) return;

    const root = mapModel.scene ? mapModel.scene : mapModel;
    root.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });

    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    root.position.y = -center.y;
    root.position.x = 0;
    root.position.z = 0;

    scene.add(root);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(size.x, 30), Math.max(size.z, 30)),
      new THREE.MeshStandardMaterial({ color: '#1a2129', roughness: 0.98, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;

    return root;
  }
}
