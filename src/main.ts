import * as THREE from 'three';
import {
  CameraMode,
  ControlMode,
  DIFFICULTY_CONFIGS,
  Difficulty,
  GameState,
  InputState,
  QUALITY_CONFIGS,
  QualityPreset
} from './types';
import { SeededPRNG } from './prng';
import { PersistenceManager } from './persistence';
import { AudioEngine } from './audio';
import { FlightCorridorPath } from './path';
import { FlyingVehicle } from './vehicle';
import { MegacityWorld } from './city';
import { HazardManager } from './hazards';
import { ParticleSystem } from './particles';
import { RenderPipeline } from './post';

const QUIPS = [
  '"The skyline always collects its toll."',
  '"Too high and the orbital grid owns you. Too slow and the street eats you."',
  '"Chrome, rain, and 800 gigawatts of bad decisions."',
  '"You grazed a megacorp spire at Mach 0.4. Respect."',
  '"Delrogue is still playing on the wreck radio."'
];

class SkylineRunGame {
  private readonly canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly persistence = new PersistenceManager();
  private readonly audio: AudioEngine;
  private prng = new SeededPRNG();
  private path: FlightCorridorPath;
  private readonly vehicle: FlyingVehicle;
  private readonly city: MegacityWorld;
  private readonly hazards: HazardManager;
  private readonly particles: ParticleSystem;
  private readonly pipeline: RenderPipeline;

  private state: GameState = 'MENU';
  private score = 0;
  private combo = 1;
  private comboTimer = 0;
  private nextMilestoneKm = 1;
  private crashTimer = 0;
  private tutorialStep = 0;

  private readonly keys = new Set<string>();
  private readonly touchInput: InputState = { steer: 0, climb: 0, nitro: false };
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Frame profiler
  private fpsFrames = 0;
  private fpsAccum = 0;
  private benchmarkFrames = 0;
  private benchmarkDone = false;

  constructor() {
    const saved = this.persistence.get();
    const qualCfg = QUALITY_CONFIGS[saved.quality];

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      powerPreference: 'high-performance',
      antialias: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualCfg.pixelRatioCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene.background = new THREE.Color(0x050208);
    this.scene.fog = new THREE.FogExp2(0x050208, 0.0042);

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.3, 620);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.8);
    dirLight.position.set(30, 120, 40);
    this.scene.add(dirLight, new THREE.AmbientLight(0xbc13fe, 0.9));

    this.audio = new AudioEngine(saved.muted);
    this.path = new FlightCorridorPath(this.prng);
    this.vehicle = new FlyingVehicle(this.scene);
    this.city = new MegacityWorld(this.scene, qualCfg, this.prng);
    this.hazards = new HazardManager(this.scene);
    this.particles = new ParticleSystem(this.scene, qualCfg);
    this.pipeline = new RenderPipeline(this.renderer, this.scene, this.camera, qualCfg);

    this.bindUI();
    this.bindInput();
    this.syncMenuState();

    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'PLAYING') {
        this.pauseGame();
      }
    });

    let lastTime = performance.now();
    const animate = (now: number): void => {
      requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      this.tick(dt);
    };
    requestAnimationFrame(animate);
  }

  private bindUI(): void {
    // Difficulty pills
    document.querySelectorAll<HTMLButtonElement>('#diff-pills .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.diff as Difficulty;
        this.persistence.update({ difficulty: diff });
        this.audio.playClick();
        this.syncMenuState();
      });
    });

    // Camera pills
    document.querySelectorAll<HTMLButtonElement>('#cam-pills .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cam = btn.dataset.cam as CameraMode;
        this.persistence.update({ cameraMode: cam });
        this.audio.playClick();
        this.syncMenuState();
      });
    });

    // Control mode pills
    document.querySelectorAll<HTMLButtonElement>('#ctrl-pills .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ctrl = btn.dataset.ctrl as ControlMode;
        this.persistence.update({ controlMode: ctrl });
        this.audio.playClick();
        this.syncMenuState();
      });
    });

    // Quality pills
    document.querySelectorAll<HTMLButtonElement>('#qual-pills .pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const qual = btn.dataset.qual as QualityPreset;
        this.benchmarkDone = true;
        this.applyQualityPreset(qual);
        this.audio.playClick();
      });
    });

    // CRT toggle
    document.getElementById('crt-toggle')?.addEventListener('click', () => {
      const next = !this.persistence.get().crtEnabled;
      this.persistence.update({ crtEnabled: next });
      this.audio.playClick();
      this.syncMenuState();
    });

    // How-to-play
    document.getElementById('btn-howto')?.addEventListener('click', () => {
      const p = document.getElementById('howto-panel');
      if (p) p.style.display = p.style.display === 'block' ? 'none' : 'block';
      this.audio.playClick();
    });

    // Mute buttons
    const toggleMute = (): void => {
      const next = !this.audio.isMuted();
      this.audio.setMuted(next);
      this.persistence.update({ muted: next });
      this.syncMenuState();
    };
    document.getElementById('btn-menu-mute')?.addEventListener('click', toggleMute);
    document.getElementById('btn-mute')?.addEventListener('click', toggleMute);

    // Camera cycle in HUD
    document.getElementById('btn-cam')?.addEventListener('click', () => this.cycleCamera());

    // Start, Pause, Resume, Restart, Menu
    document.getElementById('btn-start-race')?.addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.pauseGame());
    document.getElementById('btn-resume')?.addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => this.startNewRun());
    document.getElementById('btn-go-restart')?.addEventListener('click', () => this.startNewRun());

    const toMenu = (): void => {
      this.state = 'MENU';
      document.getElementById('hud')?.classList.add('hidden');
      document.getElementById('pause-screen')?.classList.add('hidden');
      document.getElementById('gameover-screen')?.classList.add('hidden');
      document.getElementById('menu-screen')?.classList.remove('hidden');
      this.syncMenuState();
    };
    document.getElementById('btn-pause-menu')?.addEventListener('click', toMenu);
    document.getElementById('btn-go-menu')?.addEventListener('click', toMenu);

    // Tutorial skip
    document.getElementById('btn-skip-tutorial')?.addEventListener('click', () => {
      this.persistence.update({ tutorialDone: true });
      document.getElementById('tutorial-box')?.classList.add('hidden');
    });

    // Share summary
    document.getElementById('btn-go-share')?.addEventListener('click', () => {
      const s = this.persistence.get();
      const distKm = (this.vehicle.carLong / 1000).toFixed(2);
      const summary = `OF US: SKYLINE RUN [${s.difficulty}] — ${Math.floor(this.score).toLocaleString()} PTS | ${distKm} KM | SEED: ${this.prng.seedCode}`;
      void navigator.clipboard?.writeText(summary);
      const btn = document.getElementById('btn-go-share');
      if (btn) btn.textContent = 'COPIED TO CLIPBOARD!';
    });
  }

  private bindInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      } else if (e.code === 'KeyM') {
        const next = !this.audio.isMuted();
        this.audio.setMuted(next);
        this.persistence.update({ muted: next });
        this.syncMenuState();
      } else if (e.code === 'KeyC') {
        this.cycleCamera();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Touch D-Pad buttons
    document.querySelectorAll<HTMLButtonElement>('#touch-controls .touch-btn').forEach((btn) => {
      const act = btn.dataset.act;
      const setAct = (down: boolean): void => {
        btn.classList.toggle('pressed', down);
        if (act === 'left') this.touchInput.steer = down ? -1 : 0;
        if (act === 'right') this.touchInput.steer = down ? 1 : 0;
        if (act === 'up') this.touchInput.climb = down ? 1 : 0;
        if (act === 'down') this.touchInput.climb = down ? -1 : 0;
        if (act === 'nitro') this.touchInput.nitro = down;
      };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setAct(true);
      });
      btn.addEventListener('pointerup', () => setAct(false));
      btn.addEventListener('pointerleave', () => setAct(false));
    });

    // Virtual Flight Yoke / Wheel
    const wheelZone = document.getElementById('touch-wheel-zone');
    const wheelKnob = document.getElementById('touch-wheel-knob');
    if (wheelZone && wheelKnob) {
      let dragging = false;
      const updateWheel = (clientX: number, clientY: number): void => {
        const rect = wheelZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = Math.max(-1, Math.min(1, (clientX - cx) / 55));
        const dy = Math.max(-1, Math.min(1, (cy - clientY) / 55));
        this.touchInput.steer = dx;
        this.touchInput.climb = dy;
        wheelKnob.style.transform = `translate(calc(-50% + ${dx * 42}px), calc(-50% - ${dy * 42}px))`;
      };
      wheelZone.addEventListener('pointerdown', (e) => {
        dragging = true;
        wheelZone.setPointerCapture(e.pointerId);
        updateWheel(e.clientX, e.clientY);
      });
      wheelZone.addEventListener('pointermove', (e) => {
        if (dragging) updateWheel(e.clientX, e.clientY);
      });
      const release = (): void => {
        dragging = false;
        this.touchInput.steer = 0;
        this.touchInput.climb = 0;
        wheelKnob.style.transform = 'translate(-50%, -50%)';
      };
      wheelZone.addEventListener('pointerup', release);
      wheelZone.addEventListener('pointercancel', release);
    }
  }

  private cycleCamera(): void {
    const order: CameraMode[] = ['CHASE', 'COCKPIT', 'CINEMATIC'];
    const cur = this.persistence.get().cameraMode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    this.persistence.update({ cameraMode: next });
    this.audio.playClick();
    this.syncMenuState();
  }

  private applyQualityPreset(preset: QualityPreset): void {
    this.persistence.update({ quality: preset });
    const cfg = QUALITY_CONFIGS[preset];
    this.pipeline.applyQuality(this.renderer, cfg);
    this.city.applyQuality(cfg);
    this.particles.applyQuality(cfg);
    this.syncMenuState();
  }

  private syncMenuState(): void {
    const s = this.persistence.get();
    document.querySelectorAll<HTMLButtonElement>('#diff-pills .pill-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.diff === s.difficulty);
    });
    document.querySelectorAll<HTMLButtonElement>('#cam-pills .pill-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.cam === s.cameraMode);
    });
    document.querySelectorAll<HTMLButtonElement>('#ctrl-pills .pill-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.ctrl === s.controlMode);
    });
    document.querySelectorAll<HTMLButtonElement>('#qual-pills .pill-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.qual === s.quality);
    });

    const best = s.best[s.difficulty];
    const bestEl = document.getElementById('menu-best-line');
    if (bestEl) {
      bestEl.textContent = `BEST: ${best.score.toLocaleString()} PTS · ${best.distanceKm.toFixed(1)} KM`;
    }

    const crtEl = document.getElementById('crt-toggle');
    if (crtEl) crtEl.textContent = `CRT SCANLINES: ${s.crtEnabled ? 'ON' : 'OFF'}`;
    document.getElementById('diegetic-frame')?.classList.toggle('crt-on', s.crtEnabled);

    const muteText = s.muted ? 'AUDIO: MUTED' : 'AUDIO: ON';
    const mBtn = document.getElementById('btn-mute');
    if (mBtn) mBtn.textContent = muteText;
    const mmBtn = document.getElementById('btn-menu-mute');
    if (mmBtn) mmBtn.textContent = `MUTE: ${s.muted ? 'ON' : 'OFF'}`;

    const cBtn = document.getElementById('btn-cam');
    if (cBtn) cBtn.textContent = `CAM: ${s.cameraMode}`;

    const dpad = document.getElementById('touch-dpad');
    const wheel = document.getElementById('touch-wheel-zone');
    if (dpad && wheel) {
      dpad.style.display = s.controlMode === 'KEYS' ? 'flex' : 'none';
      wheel.style.display = s.controlMode === 'WHEEL' ? 'block' : 'none';
    }
  }

  private startNewRun(): void {
    this.audio.unlockAndStart();
    this.audio.duckMusic(false);
    this.audio.playClick();

    const s = this.persistence.get();
    const diffCfg = DIFFICULTY_CONFIGS[s.difficulty];

    this.prng = new SeededPRNG();
    this.path = new FlightCorridorPath(this.prng);
    this.vehicle.reset(diffCfg);
    this.city.reset(this.path, this.prng);
    this.hazards.reset();

    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.nextMilestoneKm = 1;
    this.tutorialStep = 0;
    this.state = 'PLAYING';

    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    document.getElementById('gameover-screen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');

    const seedEl = document.getElementById('hud-seed');
    if (seedEl) seedEl.textContent = this.prng.seedCode;

    const shareBtn = document.getElementById('btn-go-share');
    if (shareBtn) shareBtn.textContent = 'COPY RUN SUMMARY';

    const tutBox = document.getElementById('tutorial-box');
    if (tutBox) {
      tutBox.classList.toggle('hidden', s.tutorialDone);
    }

    this.renderShieldCells();
  }

  private pauseGame(): void {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    document.getElementById('pause-screen')?.classList.remove('hidden');
  }

  private resumeGame(): void {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    document.getElementById('pause-screen')?.classList.add('hidden');
  }

  private triggerCrash(): void {
    this.state = 'CRASHING';
    this.crashTimer = 1.9;
    this.audio.duckMusic(true);
    this.audio.playExplosion(0);
    this.particles.spawnBurst(this.vehicle.root.position, 85, 0xff3355);
  }

  private finishGameOver(): void {
    this.state = 'GAMEOVER';
    const s = this.persistence.get();
    const distKm = this.vehicle.carLong / 1000;
    const isNewBest = this.persistence.recordRun(s.difficulty, this.score, distKm);

    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('gameover-screen')?.classList.remove('hidden');

    const bestBanner = document.getElementById('go-new-best');
    if (bestBanner) bestBanner.style.display = isNewBest ? 'block' : 'none';

    const quipEl = document.getElementById('go-quip');
    if (quipEl) quipEl.textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)];

    const scEl = document.getElementById('go-score');
    if (scEl) scEl.textContent = Math.floor(this.score).toLocaleString();

    const dEl = document.getElementById('go-dist');
    if (dEl) dEl.textContent = `${distKm.toFixed(2)} KM`;

    const spEl = document.getElementById('go-speed');
    if (spEl) spEl.textContent = `${Math.floor(this.vehicle.topSpeedReached * 3.2)} KM/H`;

    const sdEl = document.getElementById('go-seed');
    if (sdEl) sdEl.textContent = this.prng.seedCode;
  }

  private renderShieldCells(): void {
    const row = document.getElementById('shields-row');
    if (!row) return;
    row.innerHTML = '';
    for (let i = 0; i < this.vehicle.maxShields; i++) {
      const div = document.createElement('div');
      div.className = 'shield-cell';
      if (i < this.vehicle.shields) div.classList.add('active');
      if (this.vehicle.shields <= 1) div.classList.add('low');
      row.appendChild(div);
    }
  }

  private spawnPopup(text: string, color: string): void {
    const stack = document.getElementById('popup-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'hud-popup';
    el.style.color = color;
    el.textContent = text;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  private readInput(): InputState {
    let steer = this.touchInput.steer;
    let climb = this.touchInput.climb;
    let nitro = this.touchInput.nitro;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) climb += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) climb -= 1;
    if (this.keys.has('Space') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) nitro = true;

    return {
      steer: Math.max(-1, Math.min(1, steer)),
      climb: Math.max(-1, Math.min(1, climb)),
      nitro
    };
  }

  private tick(dt: number): void {
    const saved = this.persistence.get();
    const diffCfg = DIFFICULTY_CONFIGS[saved.difficulty];
    const qualCfg = QUALITY_CONFIGS[saved.quality];
    const speedRatio = Math.min(1.5, this.vehicle.speed / diffCfg.maxSpeed);

    // Quick startup auto-benchmark
    if (!this.benchmarkDone && this.benchmarkFrames < 90) {
      this.benchmarkFrames++;
      if (this.benchmarkFrames === 90) {
        this.benchmarkDone = true;
        const avgFps = this.fpsFrames / Math.max(0.001, this.fpsAccum);
        if (avgFps < 38 && saved.quality === 'HIGH') {
          this.applyQualityPreset('MEDIUM');
        } else if (avgFps < 28) {
          this.applyQualityPreset('LOW');
        }
      }
    }

    this.audio.update(dt, speedRatio, this.vehicle.isNitroActive, this.state === 'PLAYING');

    if (this.state === 'MENU') {
      // Idle attract flythrough
      this.vehicle.carLong += dt * 42;
      this.vehicle.carIdx = Math.floor(this.vehicle.carLong / this.path.stepLength);
      this.path.advanceAndCull(this.vehicle.carIdx);
      this.path.toWorldPosition(this.vehicle.carLong, Math.sin(this.vehicle.carLong * 0.01) * 6, 18, this.vehicle.root.position);
      this.city.update(
        dt,
        this.vehicle.carLong,
        0,
        18,
        this.path,
        this.prng,
        this.audio.pulse,
        qualCfg.trafficCount,
        () => {},
        () => {}
      );
      this.updateCamera(dt, 'CINEMATIC', 0.5);
    } else if (this.state === 'PLAYING') {
      const input = this.readInput();
      let activeWarning: string | null = null;

      this.path.advanceAndCull(this.vehicle.carIdx);

      this.vehicle.update(
        dt,
        input,
        diffCfg,
        this.path,
        this.audio,
        this.particles,
        (txt, col) => this.spawnPopup(txt, col),
        (warn) => {
          activeWarning = warn;
        },
        () => {
          this.combo = 1;
          this.renderShieldCells();
          if (this.vehicle.shields <= 0) {
            this.triggerCrash();
          }
        }
      );

      this.city.update(
        dt,
        this.vehicle.carLong,
        this.vehicle.carLat,
        this.vehicle.carAlt,
        this.path,
        this.prng,
        this.audio.pulse,
        qualCfg.trafficCount,
        () => {
          this.onNearMiss('TRAFFIC SLIPSTREAM');
        },
        () => {
          this.vehicle.takeHit(
            this.audio,
            this.particles,
            (t, c) => this.spawnPopup(t, c),
            () => {
              this.renderShieldCells();
              if (this.vehicle.shields <= 0) this.triggerCrash();
            },
            'TRAFFIC COLLISION'
          );
        }
      );

      this.hazards.update(
        dt,
        this.vehicle,
        diffCfg,
        this.path,
        this.prng,
        this.audio,
        this.particles,
        this.audio.pulse,
        (pts) => {
          this.score += pts * this.combo * diffCfg.scoreMult;
        },
        () => this.onNearMiss('NEAR MISS'),
        (txt, col) => this.spawnPopup(txt, col),
        (warn) => {
          if (warn) activeWarning = warn;
        },
        () => {
          this.renderShieldCells();
          if (this.vehicle.shields <= 0) this.triggerCrash();
        }
      );

      this.particles.update(
        dt,
        this.vehicle.root.position,
        this.vehicle.root.quaternion,
        this.vehicle.carAlt < 8.5
      );

      // Score accrual & Distance Milestones
      this.score +=
        this.vehicle.speed *
        dt *
        1.8 *
        this.vehicle.slipstreamMultiplier *
        this.combo *
        diffCfg.scoreMult;

      const distKm = this.vehicle.carLong / 1000;
      if (distKm >= this.nextMilestoneKm) {
        this.spawnPopup(`${this.nextMilestoneKm} KM MILESTONE! +1000`, '#00f3ff');
        this.score += 1000;
        this.nextMilestoneKm++;
      }

      if (this.combo > 1) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 1;
      }

      this.updateTutorial(input);
      this.updateHUD(distKm, activeWarning);
      this.updateCamera(dt, saved.cameraMode, speedRatio);
    } else if (this.state === 'CRASHING') {
      this.crashTimer -= dt;
      this.particles.update(dt, this.vehicle.root.position, this.vehicle.root.quaternion, false);
      this.updateCamera(dt, 'CINEMATIC', 0.2);
      if (this.crashTimer <= 0) {
        this.finishGameOver();
      }
    }

    this.pipeline.update(dt, speedRatio, this.vehicle.isNitroActive, this.audio.pulse, this.reducedMotion);
    this.updatePerfBadge(dt, saved.quality);
  }

  private onNearMiss(label: string): void {
    if (this.vehicle.grazeCooldown > 0) return;
    this.vehicle.grazeCooldown = 0.28;
    this.combo = Math.min(8, this.combo + 1);
    this.comboTimer = 4.2;
    this.vehicle.nitro = Math.min(100, this.vehicle.nitro + 12);
    this.score += 200 * this.combo;
    this.audio.playNearMiss(0);
    this.spawnPopup(`${label} x${this.combo}!`, '#ff2d95');
  }

  private updateTutorial(input: InputState): void {
    const s = this.persistence.get();
    if (s.tutorialDone) return;
    const textEl = document.getElementById('tutorial-step-text');
    if (!textEl) return;

    if (this.tutorialStep === 0 && Math.abs(input.steer) > 0.2) {
      this.tutorialStep = 1;
      textEl.textContent = 'CLIMB OR DIVE WITH [W/S] OR [UP/DOWN]. SKIM BELOW 8M FOR SLIPSTREAM!';
    } else if (this.tutorialStep === 1 && Math.abs(input.climb) > 0.2) {
      this.tutorialStep = 2;
      textEl.textContent = 'HOLD [SPACE] OR [SHIFT] FOR NITRO BOOST. RAM DRONES & THREAD BARRICADES!';
    } else if (this.tutorialStep === 2 && input.nitro) {
      this.persistence.update({ tutorialDone: true });
      document.getElementById('tutorial-box')?.classList.add('hidden');
      this.spawnPopup('SYSTEMS CALIBRATED — FLY HARD!', '#00f3ff');
    }
  }

  private updateHUD(distKm: number, warningText: string | null): void {
    const scEl = document.getElementById('hud-score');
    if (scEl) scEl.textContent = Math.floor(this.score).toLocaleString();

    const cbEl = document.getElementById('hud-combo');
    if (cbEl) cbEl.textContent = `x${this.combo}`;

    const dsEl = document.getElementById('hud-dist');
    if (dsEl) dsEl.textContent = distKm.toFixed(2);

    const spEl = document.getElementById('hud-speed');
    if (spEl) spEl.textContent = String(Math.floor(this.vehicle.speed * 3.2));

    const nbEl = document.getElementById('hud-nitro-bar');
    if (nbEl) nbEl.style.transform = `scaleX(${(this.vehicle.nitro / 100).toFixed(3)})`;

    const sbEl = document.getElementById('hud-slip-bar');
    if (sbEl) sbEl.style.transform = `scaleX(${this.vehicle.slipstreamCharge.toFixed(3)})`;

    const smEl = document.getElementById('hud-slip-mult');
    if (smEl) smEl.textContent = `${this.vehicle.slipstreamMultiplier.toFixed(1)}x`;

    const altVal = document.getElementById('hud-alt-val');
    if (altVal) altVal.textContent = `${Math.floor(this.vehicle.carAlt)}m`;

    const altPip = document.getElementById('alt-Pip');
    if (altPip) {
      const pct = Math.max(0, Math.min(100, (this.vehicle.carAlt / 118) * 100));
      altPip.style.bottom = `${pct}%`;
    }

    const warnBanner = document.getElementById('warning-banner');
    if (warnBanner) {
      if (warningText) {
        warnBanner.style.display = 'block';
        warnBanner.textContent = warningText;
      } else {
        warnBanner.style.display = 'none';
      }
    }
  }

  private updateCamera(dt: number, mode: CameraMode, speedRatio: number): void {
    const carPos = this.vehicle.root.position;
    const carQuat = this.vehicle.root.quaternion;

    // FOV kick with speed & Nitro
    const targetFov = mode === 'COCKPIT' ? 76 : 66 + speedRatio * 10 + (this.vehicle.isNitroActive ? 12 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 8);
    this.camera.updateProjectionMatrix();

    if (this.state === 'CRASHING') {
      // Dramatic Orbiting Crash Cam
      const angle = (2.0 - this.crashTimer) * 2.4;
      this.camera.position.set(
        carPos.x + Math.sin(angle) * 14,
        carPos.y + 6,
        carPos.z + Math.cos(angle) * 14
      );
      this.camera.lookAt(carPos);
      return;
    }

    if (mode === 'COCKPIT') {
      const offset = new THREE.Vector3(0, 0.56, -0.35).applyQuaternion(carQuat);
      this.camera.position.copy(carPos).add(offset);
      const forward = new THREE.Vector3(0, 0.42, -25).applyQuaternion(carQuat).add(carPos);
      this.camera.lookAt(forward);
      this.camera.rotation.z += -this.vehicle.steer * 0.22;
    } else if (mode === 'CINEMATIC') {
      const sideOffset = new THREE.Vector3(3.8, 2.2, 8.8).applyQuaternion(carQuat);
      this.camera.position.lerp(carPos.clone().add(sideOffset), Math.min(1, dt * 9));
      const lookAtPos = new THREE.Vector3(0, 0.5, -18).applyQuaternion(carQuat).add(carPos);
      this.camera.lookAt(lookAtPos);
    } else {
      // CHASE camera with speed-based pullback & banking roll
      const pullback = 8.2 + speedRatio * 2.4 + (this.vehicle.isNitroActive ? 1.8 : 0);
      const chaseOffset = new THREE.Vector3(0, 2.55, pullback).applyQuaternion(carQuat);
      this.camera.position.lerp(carPos.clone().add(chaseOffset), Math.min(1, dt * 14));
      const lookAhead = new THREE.Vector3(0, 0.6, -24).applyQuaternion(carQuat).add(carPos);
      this.camera.lookAt(lookAhead);
      if (!this.reducedMotion) {
        this.camera.rotation.z += -this.vehicle.steer * 0.24;
      }
    }

    if (!this.reducedMotion && this.vehicle.shakeIntensity > 0.01) {
      const s = this.vehicle.shakeIntensity * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
  }

  private updatePerfBadge(dt: number, preset: QualityPreset): void {
    this.fpsFrames++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsAccum);
      const calls = this.renderer.info.render.calls;
      const tris = Math.round(this.renderer.info.render.triangles / 1000);
      const badge = document.getElementById('perf-badge');
      if (badge) {
        badge.textContent = `${fps} FPS · ${preset} · ${calls} DC · ${tris}k TRI`;
      }
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.pipeline.composer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SkylineRunGame();
});