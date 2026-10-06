import * as THREE from 'three';
import { AnimationController, createAnimationMixerForObject } from './animation.js';
import { findBoneByHeuristic, getAssetStatus } from './assets.js';
import { setupGunAttachment } from './gun.js';

const MOVE_SPEED = 2.6;
const FIRE_COOLDOWN = 0.18;

export class Player {
  constructor(model, animations = [], skeletonReport = {}) {
    this.root = new THREE.Group();
    this.root.name = 'PlayerRoot';

    this.model = null;
    this.skeletonReport = skeletonReport;
    this.bones = [];
    this.handBone = null;
    this.groundHeight = 0.42;
    this.grounded = true;
    this.moveSpeed = MOVE_SPEED;
    this.lastAnimationState = null;
    this.fireCooldown = 0;
    this.fireTimer = 0;
    this.isFiring = false;

    if (model) {
      const source = model.scene ? model.scene : model;
      this.model = source;
      this.root.add(source);
      source.traverse((child) => {
        if (child.isBone) {
          this.bones.push(child);
        }
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.handBone = this.resolveHandBone();

      if (source.animations || animations.length) {
        const mixerInfo = createAnimationMixerForObject(source);
        this.mixer = mixerInfo ? mixerInfo.mixer : null;
        this.animationController = mixerInfo ? mixerInfo.controller : null;
      }
    }

    if (!this.mixer && animations.length) {
      const mixer = new THREE.AnimationMixer(this.root);
      this.mixer = mixer;
      this.animationController = new AnimationController(mixer, animations);
    }

    if (!this.animationController) {
      this.animationController = null;
    }
  }

  resolveHandBone() {
    if (!this.bones.length) return null;
    const preferred = [
      'right hand', 'hand r', 'hand_r', 'right_hand', 'r_hand', 'right_hand_01', 'mixamorig right hand',
      'left hand', 'hand l', 'hand_l', 'left_hand', 'l_hand', 'mixamorig left hand',
      'hand', 'wrist'
    ];

    const heuristic = findBoneByHeuristic(this.bones);
    if (heuristic) return heuristic;

    for (const name of preferred) {
      const found = this.bones.find((bone) => bone.name.toLowerCase().includes(name.toLowerCase()));
      if (found) return found;
    }

    return this.bones[this.bones.length - 1] || null;
  }

  attachGun(gunModel, offset = new THREE.Vector3(0.18, 0.05, 0.05), rotation = new THREE.Euler(0, Math.PI * 0.5, 0), scale = 1) {
    if (!gunModel) return null;
    if (!this.handBone) {
      this.handBone = this.resolveHandBone();
    }

    if (!this.handBone) {
      console.warn('No plausible hand bone was detected. Gun remains attached to the root transform.');
    }

    const gunRoot = setupGunAttachment(this, gunModel, this.handBone || this.root, offset, rotation, scale);
    return gunRoot;
  }

  update(delta, input, cameraYaw, fireTrigger = false, cameraPitch = 0) {
    const movementInput = input ? input.clone() : new THREE.Vector2();
    const activeMove = movementInput.lengthSq() > 0.02;

    if (this.animationController) {
      this.animationController.update(delta);
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    }

    if (this.fireTimer > 0) {
      this.fireTimer = Math.max(0, this.fireTimer - delta);
      if (this.fireTimer === 0) {
        this.isFiring = false;
      }
    }

    if (fireTrigger && this.fireCooldown <= 0) {
      this.fireCooldown = FIRE_COOLDOWN;
      this.fireTimer = 0.08;
      this.isFiring = true;
      console.log('Fire trigger active');
    }

    const moveDirection = new THREE.Vector3();
    if (activeMove) {
      const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      moveDirection.copy(forward).multiplyScalar(movementInput.y).add(right.multiplyScalar(movementInput.x));
      if (moveDirection.lengthSq() > 0.0001) {
        moveDirection.normalize();
        const moveAmount = this.moveSpeed * delta;
        this.root.position.x += moveDirection.x * moveAmount;
        this.root.position.z += moveDirection.z * moveAmount;
        this.root.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
      }
    }

    if (activeMove) {
      this.setAnimation('RUN');
    } else {
      this.setAnimation('IDLE');
    }

    if (this.model) {
      this.model.rotation.y = this.root.rotation.y;
    }
  }

  setAnimation(stateName) {
    if (!this.animationController) return;

    const normalizedState = String(stateName).toUpperCase();
    if (this.lastAnimationState !== normalizedState) {
      this.animationController.setState(normalizedState, 0.18);
      this.lastAnimationState = normalizedState;
    }
  }

  getDebugState() {
    const state = this.animationController ? this.lastAnimationState || 'IDLE' : 'NO_ANIM';
    return {
      position: `${this.root.position.x.toFixed(2)}, ${this.root.position.y.toFixed(2)}, ${this.root.position.z.toFixed(2)}`,
      animation: state,
      grounded: this.grounded,
      boneCount: this.bones.length,
      handBone: this.handBone ? this.handBone.name : 'not found',
      assetStatus: `prototype-ready | firing: ${this.isFiring ? 'yes' : 'no'}`,
    };
  }
}
