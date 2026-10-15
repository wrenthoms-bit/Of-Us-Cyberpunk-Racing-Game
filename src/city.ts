import * as THREE from 'three';
import { FlightCorridorPath } from './path';
import { PathNode, QualityConfig } from './types';
import { SeededPRNG } from './prng';

interface TrafficCar {
  s: number;
  lat: number;
  alt: number;
  speed: number;
  dir: 1 | -1;
  colorIndex: number;
}

export class MegacityWorld {
  public readonly group = new THREE.Group();
  private readonly deckMesh: THREE.InstancedMesh;
  private readonly neonRailMesh: THREE.InstancedMesh;
  private readonly buildingMesh: THREE.InstancedMesh;
  private readonly windowGridMesh: THREE.InstancedMesh;
  private readonly holoSignMesh: THREE.InstancedMesh;
  private readonly godRayMesh: THREE.InstancedMesh;
  private readonly trafficMesh: THREE.InstancedMesh;

  private readonly neonMat: THREE.MeshStandardMaterial;
  private readonly holoMat: THREE.MeshBasicMaterial;
  private readonly roadMat: THREE.MeshStandardMaterial;

  private readonly traffic: TrafficCar[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly scratchPos = new THREE.Vector3();
  private readonly scratchTan = new THREE.Vector3();
  private readonly scratchRight = new THREE.Vector3();
  private readonly lookMat = new THREE.Matrix4();

  private lastBuiltNodeIdx = -1;
  private buildingCursor = 0;
  private signCursor = 0;
  private readonly maxBuildings = 360;
  private readonly maxSigns = 120;
  private readonly maxDeckSegments = 160;

  constructor(scene: THREE.Scene, quality: QualityConfig, prng: SeededPRNG) {
    // Wet reflective cyberpunk street deck material
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x07040e,
      roughness: 1 - quality.roadReflectivity * 0.78,
      metalness: 0.85
    });

    this.neonMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.5
    });

    this.holoMat = new THREE.MeshBasicMaterial({
      color: 0xff2d95,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // 1. Pooled Corridor Deck Segments
    const deckGeo = new THREE.BoxGeometry(44, 1.2, 10.4);
    this.deckMesh = new THREE.InstancedMesh(deckGeo, this.roadMat, this.maxDeckSegments);
    this.deckMesh.frustumCulled = false;

    // 2. Pooled Neon Guide Rails
    const railGeo = new THREE.BoxGeometry(0.45, 0.45, 10.2);
    this.neonRailMesh = new THREE.InstancedMesh(railGeo, this.neonMat, this.maxDeckSegments * 2);
    this.neonRailMesh.frustumCulled = false;

    // 3. Multi-tier Skyscraper Canyon InstancedMesh
    const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
    bldgGeo.translate(0, 0.5, 0);
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x090514,
      roughness: 0.35,
      metalness: 0.75
    });
    this.buildingMesh = new THREE.InstancedMesh(bldgGeo, bldgMat, this.maxBuildings);
    this.buildingMesh.frustumCulled = false;

    //Emissive Window Stripes on Buildings
    const winGeo = new THREE.BoxGeometry(1.02, 0.18, 1.02);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    this.windowGridMesh = new THREE.InstancedMesh(winGeo, winMat, this.maxBuildings);
    this.windowGridMesh.frustumCulled = false;

    // 4. Holographic Ad Billboards & Overhead Bridges
    const signGeo = new THREE.PlaneGeometry(1, 1);
    this.holoSignMesh = new THREE.InstancedMesh(signGeo, this.holoMat, this.maxSigns);
    this.holoSignMesh.frustumCulled = false;

    // 5. Cheap Fake Volumetric Light Shafts / God Rays
    const rayGeo = new THREE.ConeGeometry(7, 65, 8, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: quality.godRays ? 0.065 : 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.godRayMesh = new THREE.InstancedMesh(rayGeo, rayMat, this.maxSigns);
    this.godRayMesh.frustumCulled = false;

    // 6. Multi-Layer Flying Traffic
    const trafficGeo = new THREE.BoxGeometry(1.8, 0.65, 4.2);
    const trafficMat = new THREE.MeshStandardMaterial({
      color: 0x151026,
      emissive: 0xff2d95,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.8
    });
    this.trafficMesh = new THREE.InstancedMesh(trafficGeo, trafficMat, 96);
    this.trafficMesh.frustumCulled = false;

    for (let i = 0; i < 96; i++) {
      this.traffic.push({
        s: prng.range(40, 1400),
        lat: prng.range(-18, 18),
        alt: prng.pick([4.5, 14, 28, 46, 68]),
        speed: prng.range(28, 72),
        dir: prng.next() > 0.35 ? 1 : -1,
        colorIndex: i % 3
      });
    }

    this.group.add(
      this.deckMesh,
      this.neonRailMesh,
      this.buildingMesh,
      this.windowGridMesh,
      this.holoSignMesh,
      this.godRayMesh,
      this.trafficMesh
    );
    scene.add(this.group);
  }

  public applyQuality(quality: QualityConfig): void {
    this.roadMat.roughness = 1 - quality.roadReflectivity * 0.78;
    const rayMat = this.godRayMesh.material as THREE.MeshBasicMaterial;
    rayMat.opacity = quality.godRays ? 0.065 : 0;
  }

  public reset(path: FlightCorridorPath, prng: SeededPRNG): void {
    this.lastBuiltNodeIdx = -1;
    this.buildingCursor = 0;
    this.signCursor = 0;
    for (let i = 0; i < this.traffic.length; i++) {
      this.traffic[i].s = prng.range(40, 1400);
      this.traffic[i].lat = prng.range(-16, 16);
    }
    this.populateAhead(path, prng);
  }

  private populateAhead(path: FlightCorridorPath, prng: SeededPRNG): void {
    const palette = [new THREE.Color(0x00f3ff), new THREE.Color(0xff2d95), new THREE.Color(0xbc13fe), new THREE.Color(0xffb300)];

    for (let i = 0; i < path.nodes.length; i++) {
      const node = path.nodes[i];
      if (node.index <= this.lastBuiltNodeIdx) continue;
      this.lastBuiltNodeIdx = node.index;

      // Update pooled road deck segment
      const slot = node.index % this.maxDeckSegments;
      this.positionAlongNode(node, 0, node.deckHeight - 0.6, node.corridorHalfWidth / 22, 1, 1);
      this.deckMesh.setMatrixAt(slot, this.dummy.matrix);

      // Left & Right Neon Corridor Rails
      this.positionAlongNode(node, -node.corridorHalfWidth, node.deckHeight + 0.2, 1, 1, 1);
      this.neonRailMesh.setMatrixAt(slot * 2, this.dummy.matrix);

      this.positionAlongNode(node, node.corridorHalfWidth, node.deckHeight + 0.2, 1, 1, 1);
      this.neonRailMesh.setMatrixAt(slot * 2 + 1, this.dummy.matrix);

      // Spawn buildings on both sides of the canyon
      if (node.index % 2 === 0) {
        for (const side of [-1, 1]) {
          const bSlot = this.buildingCursor % this.maxBuildings;
          this.buildingCursor++;

          const width = prng.range(12, 24);
          const depth = prng.range(14, 24);
          const isSpire = prng.next() > 0.45;
          const height = isSpire ? prng.range(75, 165) : prng.range(28, 72);
          const latOffset = side * (node.corridorHalfWidth + width * 0.5 + prng.range(1.5, 8));

          this.positionAlongNode(node, latOffset, -20, width, height, depth);
          this.buildingMesh.setMatrixAt(bSlot, this.dummy.matrix);

          // Lit window band
          this.positionAlongNode(node, latOffset, height * 0.55, width * 1.01, height * 0.08, depth * 1.01);
          this.windowGridMesh.setMatrixAt(bSlot, this.dummy.matrix);
          this.windowGridMesh.setColorAt(bSlot, prng.pick(palette));
        }
      }

      // Spawn Holographic Ads & God-Ray Shafts
      if (node.index % 5 === 0) {
        const sSlot = this.signCursor % this.maxSigns;
        this.signCursor++;
        const side = prng.next() > 0.5 ? 1 : -1;
        const lat = side * (node.corridorHalfWidth - 2.2);
        const alt = prng.range(14, 62);
        this.positionAlongNode(node, lat, alt, prng.range(8, 16), prng.range(5, 11), 1);
        this.holoSignMesh.setMatrixAt(sSlot, this.dummy.matrix);
        this.holoSignMesh.setColorAt(sSlot, prng.pick(palette));

        this.positionAlongNode(node, lat * 0.7, 28, 1, 1, 1);
        this.godRayMesh.setMatrixAt(sSlot, this.dummy.matrix);
      }
    }

    this.deckMesh.instanceMatrix.needsUpdate = true;
    this.neonRailMesh.instanceMatrix.needsUpdate = true;
    this.buildingMesh.instanceMatrix.needsUpdate = true;
    this.windowGridMesh.instanceMatrix.needsUpdate = true;
    if (this.windowGridMesh.instanceColor) this.windowGridMesh.instanceColor.needsUpdate = true;
    this.holoSignMesh.instanceMatrix.needsUpdate = true;
    if (this.holoSignMesh.instanceColor) this.holoSignMesh.instanceColor.needsUpdate = true;
    this.godRayMesh.instanceMatrix.needsUpdate = true;
  }

  private positionAlongNode(node: PathNode, lat: number, alt: number, sx: number, sy: number, sz: number): void {
    this.dummy.position.copy(node.pos).addScaledVector(node.binormal, lat);
    this.dummy.position.y += alt;
    const target = this.scratchPos.copy(this.dummy.position).add(node.tangent);
    this.lookMat.lookAt(this.dummy.position, target, node.normal);
    this.dummy.quaternion.setFromRotationMatrix(this.lookMat);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.updateMatrix();
  }

  public update(
    dt: number,
    carLong: number,
    carLat: number,
    carAlt: number,
    path: FlightCorridorPath,
    prng: SeededPRNG,
    pulse: number,
    activeTrafficCount: number,
    onTrafficNearMiss: () => void,
    onTrafficCollision: () => void
  ): void {
    this.populateAhead(path, prng);

    // Music-reactive pulse flares world emissives
    this.neonMat.emissiveIntensity = 1.6 + pulse * 2.8;
    this.holoMat.opacity = 0.32 + pulse * 0.35;

    for (let i = 0; i < this.traffic.length; i++) {
      const t = this.traffic[i];
      if (i >= activeTrafficCount) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.trafficMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      t.s += t.speed * t.dir * dt;
      if (t.s < carLong - 60) {
        t.s = carLong + prng.range(380, 950);
        t.lat = prng.range(-16, 16);
      } else if (t.s > carLong + 1050) {
        t.s = carLong + prng.range(280, 650);
      }

      const node = path.sampleAtDistance(t.s, this.scratchPos, this.scratchTan, this.scratchRight);
      this.dummy.position.copy(this.scratchPos).addScaledVector(this.scratchRight, t.lat);
      this.dummy.position.y += node.deckHeight + t.alt;

      const lookTarget = this.scratchPos.copy(this.dummy.position).addScaledVector(this.scratchTan, t.dir);
      this.lookMat.lookAt(this.dummy.position, lookTarget, node.normal);
      this.dummy.quaternion.setFromRotationMatrix(this.lookMat);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.trafficMesh.setMatrixAt(i, this.dummy.matrix);

      // Check collision or slipstream near-miss with player craft
      const ds = Math.abs(t.s - carLong);
      if (ds < 4.2) {
        const dLat = Math.abs(t.lat - carLat);
        const dAlt = Math.abs(node.deckHeight + t.alt - carAlt);
        if (dLat < 1.9 && dAlt < 1.35) {
          onTrafficCollision();
          t.s = carLong - 100;
        } else if (dLat < 4.4 && dAlt < 3.2) {
          onTrafficNearMiss();
        }
      }
    }

    this.trafficMesh.instanceMatrix.needsUpdate = true;
  }
}