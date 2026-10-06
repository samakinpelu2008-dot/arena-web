import * as THREE from 'three';

export class TPSCameraRig {
  constructor(camera, options = {}) {
    this.camera = camera;
    this.followTarget = null;
    this.distance = options.distance ?? 4.2;
    this.height = options.height ?? 2.4;
    this.yaw = options.yaw ?? Math.PI * 0.75;
    this.pitch = options.pitch ?? -0.22;
    this.minPitch = -0.7;
    this.maxPitch = 0.7;
    this.lookAtOffset = new THREE.Vector3(0, 1.5, 0);
    this.cameraYaw = this.yaw;
    this.cameraPitch = this.pitch;
  }

  setPositionFromTarget() {
    if (!this.followTarget) return;
    const target = this.followTarget.position;
    const desired = new THREE.Vector3(
      target.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.distance,
      target.y + this.height + Math.sin(this.cameraPitch) * this.distance,
      target.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.distance
    );

    this.camera.position.copy(desired);
    this.camera.lookAt(target.x, target.y + 1.6, target.z);
  }

  update(delta, targetPosition, elapsed = 0) {
    if (!this.followTarget) return;

    const target = this.followTarget.position.clone();
    const desiredPosition = new THREE.Vector3(
      target.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.distance,
      target.y + this.height + Math.sin(this.cameraPitch) * this.distance,
      target.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.distance
    );

    this.camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 8));
    this.camera.lookAt(target.x, target.y + 1.55, target.z);
  }

  orbit(dx, dy) {
    this.cameraYaw -= dx * 0.005;
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - dy * 0.005, this.minPitch, this.maxPitch);
  }
}
