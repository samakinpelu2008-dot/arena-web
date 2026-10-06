import * as THREE from 'three';

export class TouchControls {
  constructor(cameraRig, player) {
    this.cameraRig = cameraRig;
    this.player = player;
    this.joystickArea = document.getElementById('joystick-area');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickThumb = document.getElementById('joystick-thumb');
    this.jumpButton = document.getElementById('jump-button');
    this.moveInput = new THREE.Vector2();
    this.fireRequested = false;
    this.keyboard = { w: false, a: false, s: false, d: false };

    this.joystickPointerId = null;
    this.cameraDragPointerId = null;

    this.bindUI();
    this.bindKeyboard();
  }

  setPlayer(player) {
    this.player = player;
  }

  bindUI() {
    const joystickRadius = 52;

    const updateThumb = (x, y) => {
      const clampedX = THREE.MathUtils.clamp(x, -1, 1);
      const clampedY = THREE.MathUtils.clamp(y, -1, 1);
      const dx = clampedX * joystickRadius;
      const dy = clampedY * joystickRadius;
      this.joystickThumb.style.transform = `translate(${dx - 27}px, ${dy - 27}px)`;
      this.moveInput.set(clampedX, clampedY);
    };

    this.joystickArea.addEventListener('pointerdown', (event) => {
      this.joystickPointerId = event.pointerId;
      this.joystickArea.setPointerCapture(event.pointerId);
      const rect = this.joystickArea.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) / (rect.width * 0.5);
      const dy = (event.clientY - cy) / (rect.height * 0.5);
      updateThumb(dx, -dy);
    });

    this.joystickArea.addEventListener('pointermove', (event) => {
      if (this.joystickPointerId !== event.pointerId) return;
      const rect = this.joystickArea.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) / (rect.width * 0.5);
      const dy = (event.clientY - cy) / (rect.height * 0.5);
      updateThumb(dx, -dy);
    });

    const resetJoystick = () => {
      this.joystickPointerId = null;
      this.joystickThumb.style.transform = 'translate(-50%, -50%)';
      this.moveInput.set(0, 0);
    };

    this.joystickArea.addEventListener('pointerup', resetJoystick);
    this.joystickArea.addEventListener('pointerleave', resetJoystick);
    this.joystickArea.addEventListener('pointercancel', resetJoystick);

    this.jumpButton.addEventListener('pointerdown', () => {
      this.fireRequested = true;
    });
    this.jumpButton.addEventListener('click', () => {
      this.fireRequested = true;
    });

    document.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (window.innerWidth > 700 && event.clientX > window.innerWidth * 0.55) {
        this.cameraDragPointerId = event.pointerId;
      }
    });

    document.addEventListener('pointermove', (event) => {
      if (this.cameraDragPointerId === event.pointerId && this.cameraRig) {
        this.cameraRig.orbit(event.movementX, event.movementY);
      }
    });

    document.addEventListener('pointerup', () => {
      this.cameraDragPointerId = null;
    });
  }

  bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.keyboard.w = true;
          break;
        case 'KeyA':
          this.keyboard.a = true;
          break;
        case 'KeyS':
          this.keyboard.s = true;
          break;
        case 'KeyD':
          this.keyboard.d = true;
          break;
        case 'Space':
          this.fireRequested = true;
          break;
      }
    });

    window.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.keyboard.w = false;
          break;
        case 'KeyA':
          this.keyboard.a = false;
          break;
        case 'KeyS':
          this.keyboard.s = false;
          break;
        case 'KeyD':
          this.keyboard.d = false;
          break;
      }
    });
  }

  getMovementVector() {
    let x = 0;
    let y = 0;

    if (this.keyboard.d) x += 1;
    if (this.keyboard.a) x -= 1;
    if (this.keyboard.w) y += 1;
    if (this.keyboard.s) y -= 1;

    const joystickInput = this.moveInput.clone();
    x += joystickInput.x;
    y += joystickInput.y;

    return new THREE.Vector2(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  }

  clearFireRequest() {
    this.fireRequested = false;
  }
}
