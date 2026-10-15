import * as THREE from 'three';
import { DifficultyConfig } from './types';
import { FlightCorridorPath } from './path';
import { SeededPRNG } from './prng';
import { FlyingVehicle } from './vehicle';
import { AudioEngine } from './audio';
import { ParticleSystem } from './particles';

type HazardKind = 'BARRICADE' | 'PYLON_ARRAY' | 'ORBITAL_LASER' | 'BOOST_RING' | 'PICKUP_SHIELD' | 'PICKUP_NITRO' | 'PICKUP_ORB';

interface ActiveHazard {
  active: boolean;
  kind: HazardKind;
  s: number;
  lat: number;
  alt: number;
  width: number;
  height: number;
  passed: boolean;
  timer: number;
  mesh: THREE.Group;
}

interface ChaseDrone {
  active: boolean;
  sOffset: number;
  lat: number;
  alt: number;
  shotTimer: number;
  mesh: THREE.Group;
}

export class HazardManager {
  public readonly group = new THREE.Group();
  private readonly pool: ActiveHazard[] = [];
  private readonly drones: ChaseDrone[] = [];
  private nextSpawnS = 140;
  private laserCooldown = 8.0;
  private droneCooldown = 14.0;

  private readonly posScratch = new THREE.Vector3();
  private readonly tanScratch = new THREE.Vector3();
  private readonly rightScratch = new THREE.Vector3();
  private readonly lookMat = new THREE.Matrix4();

  private readonly barricadeMat: THREE.MeshBasicMaterial;
  private readonly laserMat: THREE.MeshBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.barricadeMat = new THREE.MeshBasicMaterial({
      color: 0xff2d95,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.laserMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffb300,
      wireframe: false
    });

    for (let i = 0; i < 42; i++) {
      const g = new THREE.Group();
      g.visible = false;
      this.group.add(g);
      this.pool.push({
        active: false,
        kind: 'BARRICADE',
        s: 0,
        lat: 0,
        alt: 0,
        width: 6,
        height: 6,
        passed: false,
        timer: 0,
        mesh: g
      });
    }

    // Hostile Chase Drones Pool
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0x1a0826,
      emissive: 0xff3355,
      emissiveIntensity: 2.2,
      roughness: 0.3,
      metalness: 0.8
    });
    for (let i = 0; i < 3; i++) {
      const dg = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), droneMat);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.12, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xff3355 })
      );
      dg.add(core, ring);
      dg.visible = false;
      this.group.add(dg);
      this.drones.push({
        active: false,
        sOffset: 26,
        lat: 0,
        alt: 18,
        shotTimer: 2.5,
        mesh: dg
      });
    }

    scene.add(this.group);
  }

  public reset(): void {
    this.nextSpawnS = 140;
    this.laserCooldown = 7.0;
    this.droneCooldown = 12.0;
    for (const h of this.pool) {
      h.active = false;
      h.mesh.visible = false;
    }
    for (const d of this.drones) {
      d.active = false;
      d.mesh.visible = false;
    }
  }

  private acquireSlot(kind: HazardKind): ActiveHazard | null {
    const slot = this.pool.find((p) => !p.active);
    if (!slot) return null;

    slot.active = true;
    slot.kind = kind;
    slot.passed = false;
    slot.timer = 0;
    slot.mesh.clear();
    slot.mesh.visible = true;

    if (kind === 'BARRICADE') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(10, 12, 0.45), this.barricadeMat);
      slot.mesh.add(m);
      slot.width = 5.0;
      slot.height = 6.0;
    } else if (kind === 'PYLON_ARRAY') {
      const pylonMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });
      for (let x = -6; x <= 6; x += 3) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.65, 9, 6), pylonMat);
        p.position.set(x, 4.5, 0);
        slot.mesh.add(p);
      }
      slot.width = 7.2;
      slot.height = 9.0;
    } else if (kind === 'ORBITAL_LASER') {
      const teleRing = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 4.2, 24),
        new THREE.MeshBasicMaterial({ color: 0xff3355, side: THREE.DoubleSide })
      );
      teleRing.rotation.x = -Math.PI / 2;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 160, 16), this.laserMat);
      beam.position.y = 80;
      beam.visible = false;
      slot.mesh.add(teleRing, beam);
      slot.width = 3.2;
      slot.height = 160;
    } else if (kind === 'BOOST_RING') {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.35, 10, 28), this.ringMat);
      slot.mesh.add(torus);
      slot.width = 4.2;
      slot.height = 4.2;
    } else {
      const color = kind === 'PICKUP_SHIELD' ? 0x00f3ff : kind === 'PICKUP_NITRO' ? 0xbc13fe : 0xffb300;
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.35, 0),
        new THREE.MeshBasicMaterial({ color })
      );
      slot.mesh.add(orb);
      slot.width = 2.4;
      slot.height = 2.4;
    }

    return slot;
  }

  public update(
    dt: number,
    vehicle: FlyingVehicle,
    diff: DifficultyConfig,
    path: FlightCorridorPath,
    prng: SeededPRNG,
    audio: AudioEngine,
    particles: ParticleSystem,
    pulse: number,
    onScore: (pts: number) => void,
    onNearMiss: () => void,
    onPopup: (text: string, color: string) => void,
    onWarning: (text: string | null) => void,
    onShieldChange: () => void
  ): void {
    this.barricadeMat.opacity = 0.55 + pulse * 0.35;

    // 1. Spawn procedural hazards & pickups ahead
    const spacing = Math.max(24, 48 / diff.hazardDensity);
    while (this.nextSpawnS < vehicle.carLong + 520) {
      const node = path.sampleAtDistance(this.nextSpawnS, this.posScratch, this.tanScratch, this.rightScratch);
      const roll = prng.next();

      if (roll < 0.34) {
        const h = this.acquireSlot('BARRICADE');
        if (h) {
          h.s = this.nextSpawnS;
          h.lat = prng.range(-node.corridorHalfWidth + 6, node.corridorHalfWidth - 6);
          h.alt = node.deckHeight + prng.range(6, 38);
        }
      } else if (roll < 0.54) {
        const h = this.acquireSlot('PYLON_ARRAY');
        if (h) {
          h.s = this.nextSpawnS;
          h.lat = prng.range(-node.corridorHalfWidth * 0.5, node.corridorHalfWidth * 0.5);
          h.alt = node.deckHeight;
        }
      } else if (roll < 0.72) {
        const h = this.acquireSlot('BOOST_RING');
        if (h) {
          h.s = this.nextSpawnS;
          h.lat = prng.range(-12, 12);
          h.alt = node.deckHeight + prng.range(10, 34);
        }
      } else {
        const pKind: HazardKind =
          prng.next() < 0.25 ? 'PICKUP_SHIELD' : prng.next() < 0.55 ? 'PICKUP_NITRO' : 'PICKUP_ORB';
        const h = this.acquireSlot(pKind);
        if (h) {
          h.s = this.nextSpawnS;
          h.lat = prng.range(-14, 14);
          h.alt = node.deckHeight + prng.range(4.5, 24);
        }
      }

      this.nextSpawnS += spacing;
    }

    // 2. Orbital Laser Spawner
    this.laserCooldown -= dt;
    if (this.laserCooldown <= 0) {
      this.laserCooldown = diff.laserCadence;
      const volleyCount = diff.label === 'LEGEND' ? 2 : 1;
      for (let v = 0; v < volleyCount; v++) {
        const l = this.acquireSlot('ORBITAL_LASER');
        if (l) {
          l.s = vehicle.carLong + 165 + v * 36;
          l.lat = vehicle.carLat + prng.range(-6, 6);
          l.alt = 0;
          audio.playLaserCharge(l.lat / 20);
        }
      }
      onWarning('ORBITAL LASER LOCK — EVADE!');
    }

    // 3. Hostile Chase Drone Spawner (encourages low altitude or Nitro ramming)
    this.droneCooldown -= dt;
    if (this.droneCooldown <= 0 && vehicle.carAlt > 14) {
      this.droneCooldown = prng.range(14, 22);
      const d = this.drones.find((dr) => !dr.active);
      if (d) {
        d.active = true;
        d.sOffset = 32;
        d.lat = vehicle.carLat + prng.range(-8, 8);
        d.alt = vehicle.carAlt + 4;
        d.shotTimer = 2.8;
        d.mesh.visible = true;
        onPopup('HOSTILE DRONE ON TAIL — RAM WITH NITRO!', '#bc13fe');
      }
    }

    // 4. Update Active Hazards
    for (const h of this.pool) {
      if (!h.active) continue;
      if (h.s < vehicle.carLong - 35) {
        h.active = false;
        h.mesh.visible = false;
        continue;
      }

      h.timer += dt;
      const node = path.sampleAtDistance(h.s, this.posScratch, this.tanScratch, this.rightScratch);
      h.mesh.position.copy(this.posScratch).addScaledVector(this.rightScratch, h.lat);
      h.mesh.position.y += h.alt;

      const target = this.posScratch.copy(h.mesh.position).add(this.tanScratch);
      this.lookMat.lookAt(h.mesh.position, target, node.normal);
      h.mesh.quaternion.setFromRotationMatrix(this.lookMat);

      if (h.kind === 'ORBITAL_LASER') {
        const beam = h.mesh.children[1];
        if (h.timer > 0.85 && !beam.visible) {
          beam.visible = true;
          audio.playLaserStrike(h.lat / 20);
        }
      } else if (h.kind.startsWith('PICKUP_')) {
        h.mesh.rotation.y += dt * 3.2;
      }

      // Check player interaction
      const ds = Math.abs(h.s - vehicle.carLong);
      if (ds < 3.6) {
        const dLat = Math.abs(h.lat - vehicle.carLat);
        const dAlt = Math.abs(h.alt - vehicle.carAlt);

        if (h.kind === 'BOOST_RING') {
          if (!h.passed && dLat < h.width && dAlt < h.height) {
            h.passed = true;
            vehicle.speed = Math.min(diff.maxSpeed * 1.65, vehicle.speed + 38);
            vehicle.carAlt = Math.min(82, vehicle.carAlt + 12);
            vehicle.nitro = Math.min(100, vehicle.nitro + 25);
            audio.playBoostRing();
            onScore(500);
            onPopup('AIR TIME! +500', '#00f3ff');
          }
        } else if (h.kind.startsWith('PICKUP_')) {
          if (dLat < h.width && dAlt < h.height) {
            h.active = false;
            h.mesh.visible = false;
            particles.spawnBurst(h.mesh.position, 18, 0x00f3ff);
            if (h.kind === 'PICKUP_SHIELD') {
              vehicle.shields = Math.min(vehicle.maxShields, vehicle.shields + 1);
              audio.playPickup('SHIELD', h.lat / 20);
              onPopup('SHIELD CELL +1', '#00f3ff');
              onShieldChange();
            } else if (h.kind === 'PICKUP_NITRO') {
              vehicle.nitro = Math.min(100, vehicle.nitro + 45);
              audio.playPickup('NITRO', h.lat / 20);
              onPopup('NITRO FULL CHARGE', '#bc13fe');
            } else {
              audio.playPickup('ORB', h.lat / 20);
              onScore(350);
              onPopup('ORB +350', '#ffb300');
            }
          }
        } else if (h.kind === 'ORBITAL_LASER') {
          if (h.timer > 0.85) {
            if (dLat < h.width) {
              vehicle.takeHit(audio, particles, onPopup, onShieldChange, 'ORBITAL LASER');
            } else if (!h.passed && dLat < h.width + 5.5) {
              h.passed = true;
              audio.playNearMiss(h.lat / 20);
              onScore(750);
              onNearMiss();
              onPopup('LASER DODGED! +750', '#00f3ff');
            }
          }
        } else {
          // Barricade or Energy Pylon Array
          const hitAlt = h.kind === 'PYLON_ARRAY' ? vehicle.carAlt < h.alt + h.height : dAlt < h.height;
          if (dLat < h.width && hitAlt) {
            h.active = false;
            h.mesh.visible = false;
            vehicle.takeHit(
              audio,
              particles,
              onPopup,
              onShieldChange,
              h.kind === 'PYLON_ARRAY' ? 'DECK ENERGY PYLON' : 'HOLO-BARRICADE'
            );
          } else if (!h.passed && dLat < h.width + 3.2 && hitAlt) {
            h.passed = true;
            audio.playNearMiss(h.lat / 20);
            onNearMiss();
          }
        }
      }
    }

    // 5. Update Hostile Chase Drones
    for (const d of this.drones) {
      if (!d.active) continue;
      d.lat += (vehicle.carLat - d.lat) * dt * 1.8;
      d.alt += (vehicle.carAlt - d.alt) * dt * 1.8;
      d.sOffset += ((vehicle.isNitroActive ? -8 : 22) - d.sOffset) * dt * 2.2;

      const droneS = vehicle.carLong + d.sOffset;
      path.toWorldPosition(droneS, d.lat, d.alt, d.mesh.position);
      d.mesh.rotation.y += dt * 6;
      d.mesh.rotation.z = Math.sin(droneS * 0.1) * 0.35;

      // Rammed with Nitro
      if (Math.abs(d.sOffset) < 4.5 && Math.abs(d.lat - vehicle.carLat) < 3.4) {
        if (vehicle.isNitroActive) {
          d.active = false;
          d.mesh.visible = false;
          audio.playExplosion(0);
          particles.spawnBurst(d.mesh.position, 40, 0xbc13fe);
          onScore(1000);
          onPopup('DRONE OBLITERATED! +1000', '#bc13fe');
          continue;
        }
      }

      d.shotTimer -= dt;
      if (d.shotTimer <= 0) {
        d.shotTimer = 2.6;
        if (Math.abs(d.lat - vehicle.carLat) < 2.2 && Math.abs(d.alt - vehicle.carAlt) < 2.2) {
          vehicle.takeHit(audio, particles, onPopup, onShieldChange, 'CHASE DRONE PLASMA');
        } else {
          audio.playNearMiss(0);
          onPopup('DRONE SHOT EVADED!', '#00f3ff');
        }
        d.active = false;
        d.mesh.visible = false;
      }
    }
  }
}