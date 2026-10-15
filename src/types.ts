import * as THREE from 'three';

export type Difficulty = 'ROOKIE' | 'RACER' | 'LEGEND';
export type CameraMode = 'CHASE' | 'COCKPIT' | 'CINEMATIC';
export type ControlMode = 'KEYS' | 'WHEEL';
export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'CRASHING' | 'GAMEOVER';

export type HeroMomentType =
  | 'STANDARD'
  | 'NEON_STRAIGHT'
  | 'TOWER_CHICANE'
  | 'TUNNEL_DIVE'
  | 'ROOFTOP_SKIM'
  | 'CHASM_BRIDGE'
  | 'MARKET_ALLEY';

export interface DifficultyConfig {
  label: Difficulty;
  maxSpeed: number;
  accel: number;
  hazardDensity: number;
  laserCadence: number;
  maxShields: number;
  scoreMult: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  ROOKIE: {
    label: 'ROOKIE',
    maxSpeed: 92,
    accel: 28,
    hazardDensity: 0.72,
    laserCadence: 14.0,
    maxShields: 4,
    scoreMult: 1.0
  },
  RACER: {
    label: 'RACER',
    maxSpeed: 122,
    accel: 36,
    hazardDensity: 1.0,
    laserCadence: 9.5,
    maxShields: 3,
    scoreMult: 1.35
  },
  LEGEND: {
    label: 'LEGEND',
    maxSpeed: 154,
    accel: 45,
    hazardDensity: 1.42,
    laserCadence: 6.2,
    maxShields: 2,
    scoreMult: 1.85
  }
};

export interface QualityConfig {
  preset: QualityPreset;
  pixelRatioCap: number;
  bloomIntensity: number;
  godRays: boolean;
  rainCount: number;
  buildingSegments: number;
  trafficCount: number;
  roadReflectivity: number;
}

export const QUALITY_CONFIGS: Record<QualityPreset, QualityConfig> = {
  LOW: {
    preset: 'LOW',
    pixelRatioCap: 1.0,
    bloomIntensity: 0.65,
    godRays: false,
    rainCount: 400,
    buildingSegments: 36,
    trafficCount: 24,
    roadReflectivity: 0.25
  },
  MEDIUM: {
    preset: 'MEDIUM',
    pixelRatioCap: 1.25,
    bloomIntensity: 1.1,
    godRays: true,
    rainCount: 1100,
    buildingSegments: 56,
    trafficCount: 48,
    roadReflectivity: 0.5
  },
  HIGH: {
    preset: 'HIGH',
    pixelRatioCap: 1.5,
    bloomIntensity: 1.45,
    godRays: true,
    rainCount: 2200,
    buildingSegments: 80,
    trafficCount: 72,
    roadReflectivity: 0.75
  },
  ULTRA: {
    preset: 'ULTRA',
    pixelRatioCap: 2.0,
    bloomIntensity: 1.85,
    godRays: true,
    rainCount: 3600,
    buildingSegments: 104,
    trafficCount: 96,
    roadReflectivity: 0.9
  }
};

export interface PathNode {
  index: number;
  s: number;
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  corridorHalfWidth: number;
  deckHeight: number;
  heroType: HeroMomentType;
}

export interface BestRecord {
  score: number;
  distanceKm: number;
}

export interface PersistedState {
  version: number;
  muted: boolean;
  difficulty: Difficulty;
  cameraMode: CameraMode;
  controlMode: ControlMode;
  quality: QualityPreset;
  crtEnabled: boolean;
  tutorialDone: boolean;
  best: Record<Difficulty, BestRecord>;
}

export interface InputState {
  steer: number;      // -1..1
  climb: number;      // -1..1
  nitro: boolean;
}