import * as THREE from 'three';
import { HeroMomentType, PathNode } from './types';
import { SeededPRNG } from './prng';

const HERO_SEQUENCE: readonly HeroMomentType[] = [
  'NEON_STRAIGHT',
  'TOWER_CHICANE',
  'TUNNEL_DIVE',
  'ROOFTOP_SKIM',
  'CHASM_BRIDGE',
  'MARKET_ALLEY'
];

export class FlightCorridorPath {
  public readonly nodes: PathNode[] = [];
  public readonly stepLength = 10;
  private nextIndex = 0;
  private heading = 0;
  private curvature = 0;
  private targetCurvature = 0;
  private currentHero: HeroMomentType = 'NEON_STRAIGHT';
  private heroSegmentsLeft = 36;
  private readonly prng: SeededPRNG;
  private readonly headPos = new THREE.Vector3(0, 0, 0);

  // Scratch vectors to avoid per-frame allocations
  private readonly scratchA = new THREE.Vector3();
  private readonly scratchB = new THREE.Vector3();

  constructor(prng: SeededPRNG) {
    this.prng = prng;
    this.extendTo(180);
  }

  public extendTo(targetCount: number): void {
    while (this.nodes.length < targetCount) {
      this.appendNode();
    }
  }

  public advanceAndCull(carIdx: number): void {
    const neededIndex = carIdx + 160;
    while (this.nextIndex < neededIndex) {
      this.appendNode();
    }
    while (this.nodes.length > 260 && this.nodes[0].index < carIdx - 40) {
      this.nodes.shift();
    }
  }

  private appendNode(): void {
    const idx = this.nextIndex++;
    this.heroSegmentsLeft--;
    if (this.heroSegmentsLeft <= 0) {
      this.currentHero = this.prng.pick(HERO_SEQUENCE);
      this.heroSegmentsLeft = this.prng.int(34, 58);
    }

    // Deterministic curvature modulation per Hero Moment
    if (idx < 25 || this.currentHero === 'NEON_STRAIGHT') {
      this.targetCurvature = 0;
    } else if (this.currentHero === 'TOWER_CHICANE') {
      this.targetCurvature = Math.sin(idx * 0.14) * 0.048;
    } else if (this.currentHero === 'MARKET_ALLEY') {
      this.targetCurvature = Math.cos(idx * 0.09) * 0.032;
    } else {
      if (idx % 18 === 0) {
        this.targetCurvature = this.prng.range(-0.028, 0.028);
      }
    }

    this.curvature += (this.targetCurvature - this.curvature) * 0.15;
    this.heading = Math.max(-0.68, Math.min(0.68, this.heading + this.curvature));

    const s = idx * this.stepLength;
    const tangent = new THREE.Vector3(Math.sin(this.heading), 0, -Math.cos(this.heading)).normalize();
    const normal = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

    let corridorHalfWidth = 22;
    let deckHeight = 0;
    if (this.currentHero === 'TOWER_CHICANE') corridorHalfWidth = 16.5;
    else if (this.currentHero === 'MARKET_ALLEY') corridorHalfWidth = 15.5;
    else if (this.currentHero === 'CHASM_BRIDGE') {
      corridorHalfWidth = 25;
      deckHeight = -14;
    } else if (this.currentHero === 'ROOFTOP_SKIM') {
      deckHeight = 8;
    }

    const node: PathNode = {
      index: idx,
      s,
      pos: this.headPos.clone(),
      tangent,
      normal,
      binormal,
      corridorHalfWidth,
      deckHeight,
      heroType: this.currentHero
    };

    this.nodes.push(node);
    this.headPos.addScaledVector(tangent, this.stepLength);
  }

  public sampleAtDistance(s: number, outPos: THREE.Vector3, outTan: THREE.Vector3, outRight: THREE.Vector3): PathNode {
    if (this.nodes.length === 0) {
      outPos.set(0, 0, 0);
      outTan.set(0, 0, -1);
      outRight.set(1, 0, 0);
      return {
        index: 0,
        s: 0,
        pos: outPos,
        tangent: outTan,
        normal: new THREE.Vector3(0, 1, 0),
        binormal: outRight,
        corridorHalfWidth: 22,
        deckHeight: 0,
        heroType: 'STANDARD'
      };
    }

    const firstIdx = this.nodes[0].index;
    const rawIdx = s / this.stepLength;
    const baseArrayIdx = Math.max(0, Math.min(this.nodes.length - 2, Math.floor(rawIdx) - firstIdx));
    const frac = Math.max(0, Math.min(1, rawIdx - (firstIdx + baseArrayIdx)));

    const n0 = this.nodes[baseArrayIdx];
    const n1 = this.nodes[baseArrayIdx + 1] ?? n0;

    outPos.lerpVectors(n0.pos, n1.pos, frac);
    outTan.lerpVectors(n0.tangent, n1.tangent, frac).normalize();
    outRight.lerpVectors(n0.binormal, n1.binormal, frac).normalize();
    return n0;
  }

  public toWorldPosition(s: number, lat: number, alt: number, out: THREE.Vector3): PathNode {
    const node = this.sampleAtDistance(s, out, this.scratchA, this.scratchB);
    out.addScaledVector(this.scratchB, lat);
    out.y += alt;
    return node;
  }
}