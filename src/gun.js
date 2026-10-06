import * as THREE from 'three';

export function setupGunAttachment(player, gunModel, handBone, offset = new THREE.Vector3(0.18, 0.06, 0.02), rotation = new THREE.Euler(0, Math.PI * 0.5, 0), scale = 1) {
  if (!player || !gunModel || !handBone) return null;

  const gunRoot = new THREE.Group();
  gunRoot.name = 'GunRig';

  const modelRoot = gunModel.scene ? gunModel.scene : gunModel;
  modelRoot.scale.setScalar(scale);
  modelRoot.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  gunRoot.add(modelRoot);
  gunRoot.position.copy(offset);
  gunRoot.rotation.copy(rotation);
  handBone.add(gunRoot);

  player.gun = gunRoot;
  player.handBone = handBone;
  return gunRoot;
}
