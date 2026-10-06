import * as THREE from 'three';
import { resolveAnimationStateMap } from './assets.js';

export class AnimationController {
  constructor(mixer, clips = []) {
    this.mixer = mixer;
    this.clips = clips;
    this.stateMap = resolveAnimationStateMap(clips);

    this.currentState = 'IDLE';
    this.previousState = 'IDLE';
    this.actions = new Map();
    this._bindActions();

    if (clips.length > 0) {
      this.setState('IDLE', 0.05);
    }
  }

  _bindActions() {
    for (const clip of this.clips) {
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      action.setEffectiveWeight(0);
      action.play();
      this.actions.set(clip.name, action);
    }
  }

  getClipForState(stateName) {
    const clipName = this.stateMap[stateName.toLowerCase()] || this.stateMap[stateName];
    if (clipName) {
      return this.clips.find((clip) => clip.name === clipName) || this.clips[0] || null;
    }
    return this.clips[0] || null;
  }

  setState(nextState, fadeDuration = 0.18) {
    if (!this.clips.length) return;

    this.previousState = this.currentState;
    this.currentState = nextState;

    const nextClip = this.getClipForState(nextState);
    if (!nextClip) return;

    for (const [name, action] of this.actions) {
      const shouldBeActive = name === nextClip.name;
      const targetWeight = shouldBeActive ? 1 : 0;
      if (shouldBeActive) {
        action.reset();
      }
      action.fadeTo(targetWeight, fadeDuration);
      action.setEffectiveWeight(targetWeight);
    }
  }

  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}

export function createAnimationMixerForObject(object) {
  if (!object) return null;

  const mixer = new THREE.AnimationMixer(object);
  const clips = object.animations || [];
  return { mixer, clips, controller: new AnimationController(mixer, clips) };
}
