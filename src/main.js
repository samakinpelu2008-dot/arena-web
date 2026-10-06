import * as THREE from 'three';
import { AssetManager } from './assets.js';
import { Player } from './player.js';
import { TPSCameraRig } from './camera.js';
import { TouchControls } from './controls.js';
import { MapScene } from './map.js';

class TPSPrototype {
  constructor() {
    this.container = document.getElementById('app');
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1015');
    this.scene.fog = new THREE.Fog('#0d1015', 20, 65);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.scene.add(this.camera);

    this.clock = new THREE.Clock();
    this.debugPanel = document.getElementById('debug-panel');
    this.debugStats = document.getElementById('debug-stats');
    this.assetManager = new AssetManager();

    this.mapScene = null;
    this.player = null;
    this.cameraRig = new TPSCameraRig(this.camera, { distance: 4.4, height: 2.6, yaw: Math.PI * 0.75, pitch: -0.22 });
    this.touchControls = new TouchControls(this.cameraRig, this.player);

    this.isDebugVisible = false;
    this.lastFrameTime = 0;

    this.setupLighting();
    this.setupWindowHandlers();
    this.bindDebugToggle();
    this.init();
  }

  setupLighting() {
    const hemi = new THREE.HemisphereLight('#dce7ff', '#20252d', 1.3);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight('#f5f1e6', 1.9);
    dir.position.set(8, 18, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    this.scene.add(dir);
  }

  bindDebugToggle() {
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'd') {
        this.isDebugVisible = !this.isDebugVisible;
        this.debugPanel.classList.toggle('hidden', !this.isDebugVisible);
      }
    });
  }

  setupWindowHandlers() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  async init() {
    const { map, player, gun, animations, assetReport } = await this.assetManager.loadAll();

    if (map) {
      this.mapScene = new MapScene();
      this.mapScene.addToScene(this.scene, map);
    } else {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: '#2d373f', roughness: 0.95, metalness: 0.1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ground.position.y = -0.05;
      this.scene.add(ground);
    }

    if (player) {
      this.player = new Player(player, animations);
      this.player.position.set(0, 0.45, 0);
      this.scene.add(this.player.root);
      this.touchControls.setPlayer(this.player);
    } else {
      this.player = new Player(null, {});
      this.scene.add(this.player.root);
      this.touchControls.setPlayer(this.player);
    }

    if (gun) {
      this.player.attachGun(gun);
    }

    this.cameraRig.followTarget = this.player.root;
    this.cameraRig.setPositionFromTarget();

    this.assetManager.logSummary(assetReport);
    this.animate();
  }

  updateDebug() {
    if (!this.player) return;

    const state = this.player.getDebugState();
    const debugText = [
      `FPS: ${Math.round(1 / Math.max(this.clock.getDelta(), 0.016))}`,
      `Position: ${state.position.toFixed(2)}`,
      `Animation: ${state.animation}`,
      `Grounded: ${state.grounded ? 'true' : 'false'}`,
      `Bones: ${state.boneCount}`,
      `Hand Bone: ${state.handBone}`,
      `Assets: ${state.assetStatus}`,
    ];

    this.debugStats.innerHTML = debugText.map((line) => `<div>${line}</div>`).join('');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    if (this.player) {
      const moveInput = this.touchControls.getMovementVector();
      const firePressed = this.touchControls.fireRequested;
      this.player.update(delta, moveInput, this.cameraRig.cameraYaw, firePressed, this.cameraRig.cameraPitch);
      this.touchControls.clearFireRequest();
      this.cameraRig.update(delta, this.player.root.position, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
    this.updateDebug();
  }
}

new TPSPrototype();
