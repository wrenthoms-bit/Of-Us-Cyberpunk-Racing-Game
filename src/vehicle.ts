import * as THREE from 'three';
import { DifficultyConfig, InputState } from './types';
import { FlightCorridorPath } from './path';
import { AudioEngine } from './audio';
import { ParticleSystem } from './particles';

export class FlyingVehicle {
  public readonly root = new THREE.Group();
  public readonly chassisGroup = new THREE.Group();
  public readonly cockpitGroup = new THREE.Group();
  private readonly nacelles: THREE.Mesh[] = [];
  private readonly thrusterCones: THREE.Mesh[] = [];
  private readonly shieldShell: THREE.Mesh;
  private readonly underLight: THREE.PointLight;
  private readonly thrusterMat: THREE.MeshBasicMaterial;
  private readonly neonTrimMat: THREE.MeshStandardMaterial;

  // Arcade-rail 3D flight coordinates
  public carLong = 0;
  public carLat = 0;
  public carAlt = 14;
  public carIdx = 0;
  public speed = 0;
  public topSpeedReached = 0;

  public steer = 0;
  public pitch = 0;
  public lateralVel = 0;
  public verticalVel = 0;

  public shields = 3;
  public maxShields = 3;
  public nitro = 100;
  public isNitroActive = false;

  public slipstreamMultiplier = 1.0;
  public slipstreamCharge = 0;
  public ceilingLockTimer = 0;
  public invulnTimer = 0;
  public shakeIntensity = 0;
  public grazeCooldown = 0;

  private readonly worldPos = new THREE.Vector3();
  private readonly tangent = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly lookMatrix = new THREE.Matrix4();
  private readonly targetQuat = new THREE.Quaternion();

  constructor(scene: THREE.Scene) {
    this.thrusterMat = new THREE.MeshBasicMaterial({
      color: 0xff2d95,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    });

    this.neonTrimMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.6,
      roughness: 0.2,
      metalness: 0.8
    });

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0d0918,
      roughness: 0.16,
      metalness: 0.92
    });

    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x06152d,
      roughness: 0.08,
      metalness: 0.2,
      transmission: 0.55,
      transparent: true,
      opacity: 0.78
    });

    // Main fuselage
    const hullGeo = new THREE.BoxGeometry(2.3, 0.62, 4.9);
    const hull = new THREE.Mesh(hullGeo, bodyMat);
    this.chassisGroup.add(hull);

    // Nose splitter wings
    const noseGeo = new THREE.ConeGeometry(1.4, 2.2, 4);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.rotateZ(Math.PI / 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.scale.set(1.15, 0.38, 1.0);
    nose.position.set(0, -0.04, -3.1);
    this.chassisGroup.add(nose);

    // Teardrop canopy
    const canopyGeo = new THREE.BoxGeometry(1.45, 0.48, 2.4);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.44, -0.2);
    this.chassisGroup.add(canopy);

    // Glowing neon side strakes & tail light bar
    const strakeGeo = new THREE.BoxGeometry(0.08, 0.12, 4.7);
    const leftStrake = new THREE.Mesh(strakeGeo, this.neonTrimMat);
    leftStrake.position.set(-1.18, 0.05, 0);
    const rightStrake = new THREE.Mesh(strakeGeo, this.neonTrimMat);
    rightStrake.position.set(1.18, 0.05, 0);
    this.chassisGroup.add(leftStrake, rightStrake);

    const tailBarMat = new THREE.MeshBasicMaterial({ color: 0xff2d95 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.1), tailBarMat);
    tailBar.position.set(0, 0.12, 2.46);
    this.chassisGroup.add(tailBar);

    // 4 Articulated Engine Nacelles + Afterburner Cones
    const nacelleGeo = new THREE.BoxGeometry(0.55, 0.36, 1.45);
    const coneGeo = new THREE.ConeGeometry(0.24, 1.35, 12);
    coneGeo.rotateX(Math.PI / 2);

    const offsets: [number, number, number][] = [
      [-1.42, 0.0, -1.35],
      [1.42, 0.0, -1.35],
      [-1.5, -0.05, 1.65],
      [1.5, -0.05, 1.65]
    ];

    offsets.forEach(([ox, oy, oz]) => {
      const nac = new THREE.Mesh(nacelleGeo, bodyMat);
      nac.position.set(ox, oy, oz);
      this.chassisGroup.add(nac);
      this.nacelles.push(nac);

      const cone = new THREE.Mesh(coneGeo, this.thrusterMat);
      cone.position.set(0, 0, 1.15);
      nac.add(cone);
      this.thrusterCones.push(cone);
    });

    // Shield Hex Energy Shell
    const shieldGeo = new THREE.IcosahedronGeometry(2.9, 1);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.shieldShell = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldShell.scale.set(0.95, 0.45, 1.35);
    this.chassisGroup.add(this.shieldShell);

    // Modelled Cockpit Interior for COCKPIT camera mode
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x07040e, roughness: 0.4, metalness: 0.8 });
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.65), dashMat);
    dash.position.set(0, 0.28, -0.95);
    const holoScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    holoScreen.position.set(0, 0.48, -0.82);
    holoScreen.rotation.x = -0.25;
    this.cockpitGroup.add(dash, holoScreen);
    this.chassisGroup.add(this.cockpitGroup);

    // Glowing Underlight
    this.underLight = new THREE.PointLight(0x00f3ff, 3.5, 18);
    this.underLight.position.set(0, -0.8, 0);
    this.chassisGroup.add(this.underLight);

    this.root.add(this.chassisGroup);
    scene.add(this.root);
  }

  public reset(diff: DifficultyConfig): void {
    this.carLong = 0;
    this.carLat = 0;
    this.carAlt = 12;
    this.carIdx = 0;
    this.speed = 25;
    this.topSpeedReached = 0;
    this.steer = 0;
    this.pitch = 0;
    this.lateralVel = 0;
    this.verticalVel = 0;
    this.maxShields = diff.maxShields;
    this.shields = diff.maxShields;
    this.nitro = 100;
    this.isNitroActive = false;
    this.slipstreamMultiplier = 1.0;
    this.slipstreamCharge = 0;
    this.ceilingLockTimer = 0;
    this.invulnTimer = 0;
    this.shakeIntensity = 0;
    this.grazeCooldown = 0;
  }

  public update(
    dt: number,
    input: InputState,
    diff: DifficultyConfig,
    path: FlightCorridorPath,
    audio: AudioEngine,
    particles: ParticleSystem,
    onPopup: (text: string, color: string) => void,
    onWarning: (text: string | null) => void,
    onShieldLost: () => void
  ): void {
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.grazeCooldown = Math.max(0, this.grazeCooldown - dt);
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.8);

    // Input smoothing identical in character to original
    this.steer += (input.steer - this.steer) * Math.min(1, dt * 10);
    this.pitch += (input.climb - this.pitch) * Math.min(1, dt * 10);

    // Nitro logic
    if (input.nitro && this.nitro > 1) {
      this.isNitroActive = true;
      this.nitro = Math.max(0, this.nitro - dt * 28);
    } else {
      this.isNitroActive = false;
      this.nitro = Math.min(100, this.nitro + dt * 4.5);
    }

    // Ground Effect / Slipstream (< 8.5m above deck)
    const currentNode = path.sampleAtDistance(this.carLong, this.worldPos, this.tangent, this.right);
    const relativeAlt = this.carAlt - currentNode.deckHeight;

    if (relativeAlt < 8.5) {
      const prevTier = Math.floor(this.slipstreamMultiplier);
      this.slipstreamCharge = Math.min(1, this.slipstreamCharge + dt * 0.48);
      this.slipstreamMultiplier = 1.0 + this.slipstreamCharge * 2.0; // up to 3.0x
      const newTier = Math.floor(this.slipstreamMultiplier);
      if (newTier > prevTier && newTier >= 2) {
        onPopup(`SLIPSTREAM x${newTier}!`, '#ffb300');
      }
      this.nitro = Math.min(100, this.nitro + dt * 6.5);
    } else {
      this.slipstreamCharge = Math.max(0, this.slipstreamCharge - dt * 0.35);
      this.slipstreamMultiplier = 1.0 + this.slipstreamCharge * 2.0;
    }

    // Auto-throttle longitudinal speed
    const slipSpeedBonus = 1 + (this.slipstreamMultiplier - 1) * 0.14;
    const nitroMult = this.isNitroActive ? 1.44 : 1.0;
    const targetSpeed = diff.maxSpeed * slipSpeedBonus * nitroMult;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 2.6);
    if (this.speed > this.topSpeedReached) {
      this.topSpeedReached = this.speed;
    }

    this.carLong += this.speed * dt;
    this.carIdx = Math.floor(this.carLong / path.stepLength);

    // Lateral movement & corridor wall clamp
    const steerAuthority = 32 + (this.speed / diff.maxSpeed) * 18;
    this.lateralVel = this.steer * steerAuthority;
    this.carLat += this.lateralVel * dt;

    const bound = currentNode.corridorHalfWidth - 1.6;
    if (Math.abs(this.carLat) > bound) {
      const sign = Math.sign(this.carLat);
      const excess = Math.abs(this.carLat) - bound;
      this.carLat = sign * bound;
      this.speed *= Math.max(0.82, 1 - dt * 2.5);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);

      if (this.grazeCooldown <= 0) {
        this.grazeCooldown = 0.18;
        audio.playGraze(sign * 0.8);
        particles.spawnBurst(this.root.position, 14, 0xffb300);
        if (excess > 0.65 && this.invulnTimer <= 0) {
          this.takeHit(audio, particles, onPopup, onShieldLost, 'CORRIDOR WALL GRAZE');
        }
      }
    }

    // Vertical altitude movement & soft ceiling punishment
    this.verticalVel = this.pitch * 28;
    this.carAlt += this.verticalVel * dt;

    const minAlt = currentNode.deckHeight + 1.6;
    if (this.carAlt < minAlt) {
      this.carAlt = minAlt;
      if (this.verticalVel < -10) {
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.25);
      }
    }

    // Soft ceiling & Skyline Defence Turret acquisition (> 92m)
    if (this.carAlt > 92) {
      this.ceilingLockTimer += dt;
      onWarning('SKYLINE DEFENCE TURRET LOCK — DESCEND NOW!');
      if (Math.floor(this.ceilingLockTimer * 5) !== Math.floor((this.ceilingLockTimer - dt) * 5)) {
        audio.playCeilingLockBeep();
      }
      if (this.ceilingLockTimer > 1.65) {
        this.ceilingLockTimer = 0.5;
        particles.spawnTurretTracer(this.root.position);
        this.takeHit(audio, particles, onPopup, onShieldLost, 'SKYLINE TURRET FIRE');
        this.carAlt -= 8;
      }
      // Soft ceiling pushback above 118m
      if (this.carAlt > 118) {
        this.carAlt = 118;
      }
    } else {
      this.ceilingLockTimer = Math.max(0, this.ceilingLockTimer - dt * 2);
    }

    // Update 3D Transform
    path.toWorldPosition(this.carLong, this.carLat, this.carAlt, this.worldPos);
    this.root.position.copy(this.worldPos);

    const targetPoint = this.worldPos.clone().add(this.tangent);
    this.lookMatrix.lookAt(this.worldPos, targetPoint, currentNode.normal);
    this.targetQuat.setFromRotationMatrix(this.lookMatrix);
    this.root.quaternion.slerp(this.targetQuat, Math.min(1, dt * 14));

    // Visual banking roll & pitch on chassis
    this.chassisGroup.rotation.z = -this.steer * 0.52;
    this.chassisGroup.rotation.x = this.pitch * 0.28;

    // Animate engine nacelles & afterburners
    const coneScale = (0.85 + Math.random() * 0.35) * (this.isNitroActive ? 2.15 : 1.0);
    this.thrusterMat.color.setHex(this.isNitroActive ? 0x00f3ff : 0xff2d95);
    this.underLight.color.setHex(this.isNitroActive ? 0x00f3ff : this.shields <= 1 ? 0xff3355 : 0x00f3ff);

    for (let i = 0; i < this.nacelles.length; i++) {
      this.nacelles[i].rotation.x = -this.pitch * 0.45;
      this.nacelles[i].rotation.z = -this.steer * 0.25;
      this.thrusterCones[i].scale.set(1, 1, coneScale);
    }

    // Shield shell flash & damage sparks
    const shieldMat = this.shieldShell.material as THREE.MeshBasicMaterial;
    shieldMat.opacity = this.invulnTimer > 0 ? 0.35 * (0.5 + 0.5 * Math.sin(this.invulnTimer * 28)) : 0;

    if (this.shields === 1 && Math.random() < dt * 7) {
      particles.spawnBurst(this.root.position, 4, 0xff3355);
    }
  }

  public takeHit(
    audio: AudioEngine,
    particles: ParticleSystem,
    onPopup: (text: string, color: string) => void,
    onShieldLost: () => void,
    sourceLabel: string
  ): void {
    if (this.invulnTimer > 0) return;
    this.shields--;
    this.invulnTimer = 1.35; // Coyote-time forgiveness window
    this.shakeIntensity = 1.0;
    this.speed *= 0.68;
    audio.playShieldBreak();
    particles.spawnBurst(this.root.position, 32, 0xff3355);
    onPopup(`HIT: ${sourceLabel} (-1 SHIELD)`, '#ff3355');
    onShieldLost();
  }
}