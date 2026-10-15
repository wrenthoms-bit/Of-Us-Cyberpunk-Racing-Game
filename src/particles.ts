import * as THREE from 'three';
import { QualityConfig } from './types';

interface SparkParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public readonly group = new THREE.Group();
  private readonly rainMesh: THREE.InstancedMesh;
  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly sprayPoints: THREE.Points;

  private readonly rainOffsets: Float32Array;
  private readonly sparks: SparkParticle[] = [];
  private activeRainCount = 2000;
  private readonly maxRain = 3600;
  private readonly maxSparks = 160;
  private readonly dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, quality: QualityConfig) {
    this.activeRainCount = quality.rainCount;

    // 1. GPU-instanced Cyberpunk Rain Streaks
    const rainGeo = new THREE.BoxGeometry(0.035, 2.4, 0.035);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0x66f7ff,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, this.maxRain);
    this.rainMesh.frustumCulled = false;

    this.rainOffsets = new Float32Array(this.maxRain * 3);
    for (let i = 0; i < this.maxRain; i++) {
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * 90;
      this.rainOffsets[i * 3 + 1] = Math.random() * 80;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }

    // 2. Pooled Sparks / Explosions / Debris InstancedMesh
    const sparkGeo = new THREE.BoxGeometry(0.24, 0.24, 0.75);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffb300,
      blending: THREE.AdditiveBlending
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, this.maxSparks);
    this.sparkMesh.frustumCulled = false;

    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5
      });
    }

    // 3. Low-altitude Ground-Effect Water Spray Plume
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      sprayPositions[i * 3] = (Math.random() - 0.5) * 3.2;
      sprayPositions[i * 3 + 1] = Math.random() * 1.6 - 0.8;
      sprayPositions[i * 3 + 2] = 2.4 + Math.random() * 6.0;
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
    const sprayMat = new THREE.PointsMaterial({
      color: 0x00f3ff,
      size: 0.42,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sprayPoints = new THREE.Points(sprayGeo, sprayMat);

    this.group.add(this.rainMesh, this.sparkMesh, this.sprayPoints);
    scene.add(this.group);
  }

  public applyQuality(quality: QualityConfig): void {
    this.activeRainCount = quality.rainCount;
  }

  public spawnBurst(origin: THREE.Vector3, count: number, colorHex: number): void {
    const color = new THREE.Color(colorHex);
    let spawned = 0;
    for (let i = 0; i < this.maxSparks && spawned < count; i++) {
      const s = this.sparks[i];
      if (s.active) continue;
      s.active = true;
      s.pos.copy(origin);
      s.vel.set(
        (Math.random() - 0.5) * 34,
        (Math.random() - 0.2) * 28,
        (Math.random() - 0.5) * 34
      );
      s.maxLife = 0.28 + Math.random() * 0.35;
      s.life = s.maxLife;
      this.sparkMesh.setColorAt(i, color);
      spawned++;
    }
    if (this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  public spawnTurretTracer(target: THREE.Vector3): void {
    this.spawnBurst(target, 28, 0xff3355);
  }

  public update(dt: number, carPos: THREE.Vector3, carQuat: THREE.Quaternion, isLowAltitude: boolean): void {
    // Update Rain around vehicle
    for (let i = 0; i < this.maxRain; i++) {
      if (i >= this.activeRainCount) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      let ry = this.rainOffsets[i * 3 + 1] - dt * 58;
      if (ry < -20) ry += 85;
      this.rainOffsets[i * 3 + 1] = ry;

      this.dummy.position.set(
        carPos.x + this.rainOffsets[i * 3],
        carPos.y + ry,
        carPos.z + this.rainOffsets[i * 3 + 2]
      );
      this.dummy.rotation.set(0.22, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.rainMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.rainMesh.instanceMatrix.needsUpdate = true;

    // Update Sparks
    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        continue;
      }
      s.pos.addScaledVector(s.vel, dt);
      s.vel.y -= 24 * dt;
      const scale = s.life / s.maxLife;
      this.dummy.position.copy(s.pos);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;

    // Update Low-Altitude Spray Plume
    this.sprayPoints.position.copy(carPos);
    this.sprayPoints.quaternion.copy(carQuat);
    const sprayMat = this.sprayPoints.material as THREE.PointsMaterial;
    sprayMat.opacity = isLowAltitude ? 0.65 : 0.0;
  }
}