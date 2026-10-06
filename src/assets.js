import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_CANDIDATES = {
  player: [
    'assets/player/player.fbx',
    'assets/player/character.fbx',
    'assets/player/model.fbx',
    'assets/player/player.glb',
    'assets/player/character.glb',
    'assets/player/model.glb',
  ],
  animation: [
    'assets/animations/animations.fbx',
    'assets/animations/character_animations.fbx',
    'assets/animations/animation.fbx',
    'assets/animations/player.fbx',
    'assets/animations/idle_run_jump.fbx',
  ],
  gun: [
    'assets/gun/gun.fbx',
    'assets/gun/weapon.fbx',
    'assets/gun/model.fbx',
    'assets/gun/gun.glb',
    'assets/gun/weapon.glb',
    'assets/gun/model.glb',
  ],
  map: [
    'assets/map/map.fbx',
    'assets/map/arena.fbx',
    'assets/map/level.fbx',
    'assets/map/map.glb',
    'assets/map/arena.glb',
    'assets/map/level.glb',
  ],
};

function normalizedName(name) {
  return String(name || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchAny(expression, values) {
  const target = normalizedName(expression);
  return values.some((value) => target.includes(value));
}

function getMeshBounds(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  return {
    width: Number(size.x.toFixed(4)),
    height: Number(size.y.toFixed(4)),
    depth: Number(size.z.toFixed(4)),
    center: {
      x: Number(center.x.toFixed(4)),
      y: Number(center.y.toFixed(4)),
      z: Number(center.z.toFixed(4)),
    },
  };
}

export class AssetManager {
  constructor() {
    this.fbxLoader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
  }

  async _pathExists(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async _loadAssetFromCandidates(key) {
    const list = MODEL_CANDIDATES[key] || [];

    for (const url of list) {
      const exists = await this._pathExists(url);
      if (!exists) continue;

      try {
        if (url.endsWith('.fbx')) {
          const object = await this.fbxLoader.loadAsync(url);
          return { url, object };
        }

        if (url.endsWith('.glb') || url.endsWith('.gltf')) {
          const result = await this.gltfLoader.loadAsync(url);
          return { url, object: result.scene || result.scenes?.[0] || result.object, animations: result.animations || [] };
        }
      } catch (error) {
        console.warn(`Failed to load ${url}:`, error);
      }
    }

    return null;
  }

  inspectSkeleton(model, label = 'Player') {
    const bones = [];
    model.traverse((child) => {
      if (child.isBone) {
        bones.push(child);
      }
    });

    const report = {
      modelDimensions: getMeshBounds(model),
      skeletonExists: bones.length > 0,
      boneNames: bones.map((bone) => bone.name),
      rootBone: bones.find((bone) => bone.parent && bone.parent.isBone === false) || bones[0] || null,
      hips: null,
      spine: null,
      head: null,
      leftArm: null,
      rightArm: null,
      leftHand: null,
      rightHand: null,
      leftLeg: null,
      rightLeg: null,
      handCandidates: [],
    };

    for (const bone of bones) {
      const name = normalizedName(bone.name);
      if (!report.hips && (name.includes('hips') || name.includes('pelvis') || name.includes('root'))) {
        report.hips = bone.name;
      }
      if (!report.spine && (name.includes('spine') || name.includes('chest') || name.includes('torso'))) {
        report.spine = bone.name;
      }
      if (!report.head && (name.includes('head') || name.includes('neck'))) {
        report.head = bone.name;
      }
      if (!report.leftArm && (name.includes('left arm') || name.includes('arm l') || name.includes('upperarm l') || name.includes('leftupperarm'))) {
        report.leftArm = bone.name;
      }
      if (!report.rightArm && (name.includes('right arm') || name.includes('arm r') || name.includes('upperarm r') || name.includes('rightupperarm'))) {
        report.rightArm = bone.name;
      }
      if (!report.leftLeg && (name.includes('left leg') || name.includes('leg l') || name.includes('thigh l') || name.includes('upperleg l'))) {
        report.leftLeg = bone.name;
      }
      if (!report.rightLeg && (name.includes('right leg') || name.includes('leg r') || name.includes('thigh r') || name.includes('upperleg r'))) {
        report.rightLeg = bone.name;
      }
      if (name.includes('hand')) {
        report.handCandidates.push(bone.name);
      }
    }

    const candidates = [...bones].sort((a, b) => a.name.length - b.name.length);
    const rightHand = candidates.find((bone) => {
      const n = normalizedName(bone.name);
      return n.includes('right') && (n.includes('hand') || n.includes('wrist'));
    });
    const leftHand = candidates.find((bone) => {
      const n = normalizedName(bone.name);
      return n.includes('left') && (n.includes('hand') || n.includes('wrist'));
    });
    const genericHand = candidates.find((bone) => normalizedName(bone.name).includes('hand') || normalizedName(bone.name).includes('wrist'));

    report.leftHand = leftHand?.name || report.leftArm || null;
    report.rightHand = rightHand?.name || genericHand?.name || report.rightArm || null;

    if (report.rightHand) {
      report.detectedHandBone = report.rightHand;
    } else if (report.leftHand) {
      report.detectedHandBone = report.leftHand;
    } else if (report.handCandidates.length > 0) {
      report.detectedHandBone = report.handCandidates[0];
    } else {
      report.detectedHandBone = null;
    }

    console.group(`${label} skeleton inspection`);
    console.table({
      skeletonExists: report.skeletonExists,
      boneCount: report.boneNames.length,
      rootBone: report.rootBone ? report.rootBone.name : 'n/a',
      hips: report.hips || 'n/a',
      spine: report.spine || 'n/a',
      head: report.head || 'n/a',
      leftArm: report.leftArm || 'n/a',
      rightArm: report.rightArm || 'n/a',
      leftHand: report.leftHand || 'n/a',
      rightHand: report.rightHand || 'n/a',
      detectedHandBone: report.detectedHandBone || 'n/a',
      modelDimensions: `${report.modelDimensions.width} x ${report.modelDimensions.height} x ${report.modelDimensions.depth}`,
    });
    console.log('bones', report.boneNames);
    console.groupEnd();

    return report;
  }

  inspectAnimations(animations, label = 'Animations') {
    const report = {
      available: Array.isArray(animations) ? animations.length : 0,
      clips: [],
    };

    if (Array.isArray(animations)) {
      report.clips = animations.map((clip) => ({
        name: clip.name,
        duration: Number(clip.duration.toFixed(3)),
        tracks: clip.tracks.length,
        boneNames: [...new Set(clip.tracks.map((track) => track.name.split('.').slice(0, -1).join('.')))].filter(Boolean),
      }));
    }

    console.group(`${label} clip inspection`);
    console.table(report.clips.map((clip) => ({
      name: clip.name,
      duration: clip.duration,
      tracks: clip.tracks,
      bones: clip.boneNames.length,
    })));
    console.groupEnd();

    return report;
  }

  inspectHierarchy(model, label = 'Asset') {
    const meshes = [];
    const hierarchy = [];

    model.traverse((child) => {
      if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
        meshes.push(child.name || child.type);
      }
      hierarchy.push(child.name || child.type);
    });

    const dimensions = getMeshBounds(model);

    console.group(`${label} hierarchy`);
    console.table({
      objectType: model.type,
      totalHierarchyNodes: hierarchy.length,
      meshCount: meshes.length,
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth,
    });
    console.log('meshes', meshes);
    console.groupEnd();

    return {
      dimensions,
      meshes,
      hierarchy,
    };
  }

  async loadAll() {
    const playerResult = await this._loadAssetFromCandidates('player');
    const animationResult = await this._loadAssetFromCandidates('animation');
    const gunResult = await this._loadAssetFromCandidates('gun');
    const mapResult = await this._loadAssetFromCandidates('map');

    const report = {
      player: null,
      animation: null,
      gun: null,
      map: null,
    };

    if (playerResult) {
      const playerObject = playerResult.object;
      const skeletonReport = this.inspectSkeleton(playerObject, 'Player');
      report.player = {
        model: playerObject,
        skeleton: skeletonReport,
      };
    } else {
      console.warn('No player asset found in the expected folders. Add a .fbx or .glb under assets/player/.');
    }

    if (animationResult) {
      const animationList = Array.isArray(animationResult.animations) ? animationResult.animations : (animationResult.object?.animations || []);
      report.animation = {
        asset: animationResult.object,
        clips: animationList,
        report: this.inspectAnimations(animationList, 'Animation'),
      };
    } else {
      console.warn('No animation asset found in the expected folders. Add a .fbx or .glb under assets/animations/.');
    }

    if (gunResult) {
      report.gun = {
        model: gunResult.object,
        hierarchy: this.inspectHierarchy(gunResult.object, 'Gun'),
      };
    } else {
      console.warn('No gun asset found in the expected folders. Add a .fbx or .glb under assets/gun/.');
    }

    if (mapResult) {
      report.map = {
        model: mapResult.object,
        hierarchy: this.inspectHierarchy(mapResult.object, 'Map'),
      };
    } else {
      console.warn('No map asset found in the expected folders. Add a .fbx or .glb under assets/map/.');
    }

    return {
      player: report.player ? report.player.model : null,
      gun: report.gun ? report.gun.model : null,
      map: report.map ? report.map.model : null,
      animations: report.animation ? report.animation.clips : [],
      assetReport: report,
    };
  }

  logSummary(assetReport) {
    console.group('Asset report summary');
    console.log('Player:', assetReport.player ? assetReport.player.skeleton : 'not loaded');
    console.log('Animations:', assetReport.animation ? assetReport.animation.report : 'not loaded');
    console.log('Gun:', assetReport.gun ? assetReport.gun.hierarchy : 'not loaded');
    console.log('Map:', assetReport.map ? assetReport.map.hierarchy : 'not loaded');
    console.groupEnd();
  }
}

export function resolveAnimationStateMap(animations = []) {
  const stateMap = {};

  for (const clip of animations) {
    const name = normalizedName(clip.name);
    if (!stateMap.idle && (name.includes('idle') || name.includes('stand') || name.includes('neutral'))) {
      stateMap.idle = clip.name;
    }
    if (!stateMap.run && (name.includes('run') || name.includes('walk') || name.includes('move') || name.includes('locomotion'))) {
      stateMap.run = clip.name;
    }
    if (!stateMap.jump && (name.includes('jump') || name.includes('air') || name.includes('rise') || name.includes('hop'))) {
      stateMap.jump = clip.name;
    }
  }

  if (!stateMap.idle && animations.length > 0) stateMap.idle = animations[0].name;
  if (!stateMap.run && animations.length > 1) stateMap.run = animations[1].name;
  if (!stateMap.jump && animations.length > 2) stateMap.jump = animations[2].name;

  return stateMap;
}

export function findBoneByName(bones, preferredNames = []) {
  const normalized = preferredNames.map((value) => normalizedName(value));

  for (const bone of bones) {
    const boneName = normalizedName(bone.name);
    for (const preferred of normalized) {
      if (boneName.includes(preferred)) {
        return bone;
      }
    }
  }

  return null;
}

export function findBoneByHeuristic(bones) {
  const preferred = [
    'right hand', 'hand r', 'hand_r', 'mixamorig right hand', 'right_hand', 'r_hand', 'handright',
    'left hand', 'hand l', 'hand_l', 'mixamorig left hand', 'left_hand', 'l_hand', 'handleft',
    'hand', 'wrist',
  ];

  return findBoneByName(bones, preferred) || bones[bones.length - 1] || null;
}

export function getAssetStatus(assetReport) {
  const playerStatus = assetReport.player ? 'player loaded' : 'player missing';
  const animationStatus = assetReport.animation ? `anim clips: ${assetReport.animation.report.available}` : 'animations missing';
  const gunStatus = assetReport.gun ? 'gun loaded' : 'gun missing';
  const mapStatus = assetReport.map ? 'map loaded' : 'map missing';
  return `${playerStatus}; ${animationStatus}; ${gunStatus}; ${mapStatus}`;
}
