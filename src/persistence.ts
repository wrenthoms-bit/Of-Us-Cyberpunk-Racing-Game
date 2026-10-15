import { Difficulty, PersistedState } from './types';

const STORAGE_KEY = 'of_us_neon_circuit_save_v2';
const LEGACY_KEYS = ['of_us_best', 'neon_circuit_save', 'ofUsBestScores'];
const MUTE_KEY = 'of_us_muted';

const DEFAULT_STATE: PersistedState = {
  version: 2,
  muted: false,
  difficulty: 'RACER',
  cameraMode: 'CHASE',
  controlMode: 'KEYS',
  quality: 'HIGH',
  crtEnabled: false,
  tutorialDone: false,
  best: {
    ROOKIE: { score: 0, distanceKm: 0 },
    RACER: { score: 0, distanceKm: 0 },
    LEGEND: { score: 0, distanceKm: 0 }
  }
};

export class PersistenceManager {
  private state: PersistedState;

  constructor() {
    this.state = this.load();
  }

  private load(): PersistedState {
    try {
      const cloned: PersistedState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      const rawMute = localStorage.getItem(MUTE_KEY);
      if (rawMute !== null) {
        cloned.muted = rawMute === 'true' || rawMute === '1';
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed.difficulty) cloned.difficulty = parsed.difficulty;
        if (parsed.cameraMode) cloned.cameraMode = parsed.cameraMode;
        if (parsed.controlMode) cloned.controlMode = parsed.controlMode;
        if (parsed.quality) cloned.quality = parsed.quality;
        if (typeof parsed.muted === 'boolean') cloned.muted = parsed.muted;
        if (typeof parsed.crtEnabled === 'boolean') cloned.crtEnabled = parsed.crtEnabled;
        if (typeof parsed.tutorialDone === 'boolean') cloned.tutorialDone = parsed.tutorialDone;
        if (parsed.best) {
          (['ROOKIE', 'RACER', 'LEGEND'] as Difficulty[]).forEach((d) => {
            if (parsed.best?.[d]) {
              cloned.best[d] = {
                score: Math.max(0, Number(parsed.best[d].score) || 0),
                distanceKm: Math.max(0, Number(parsed.best[d].distanceKm) || 0)
              };
            }
          });
        }
      }

      // Migrate legacy v1 keys without losing any record
      for (const legKey of LEGACY_KEYS) {
        const legRaw = localStorage.getItem(legKey);
        if (!legRaw) continue;
        try {
          const legObj = JSON.parse(legRaw) as Record<string, unknown>;
          (['ROOKIE', 'RACER', 'LEGEND'] as Difficulty[]).forEach((d) => {
            const val = legObj[d] ?? legObj[d.toLowerCase()];
            if (typeof val === 'number' && val > cloned.best[d].score) {
              cloned.best[d].score = Math.floor(val);
            } else if (val && typeof val === 'object' && 'score' in val) {
              const s = Number((val as { score: unknown }).score) || 0;
              if (s > cloned.best[d].score) cloned.best[d].score = Math.floor(s);
            }
          });
        } catch {
          // Ignore malformed legacy entry
        }
      }

      return cloned;
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_STATE)) as PersistedState;
    }
  }

  public get(): PersistedState {
    return this.state;
  }

  public update(patch: Partial<PersistedState>): void {
    Object.assign(this.state, patch);
    this.save();
  }

  public recordRun(diff: Difficulty, score: number, distanceKm: number): boolean {
    const cur = this.state.best[diff];
    let isNewBest = false;
    if (score > cur.score) {
      cur.score = Math.floor(score);
      isNewBest = true;
    }
    if (distanceKm > cur.distanceKm) {
      cur.distanceKm = Number(distanceKm.toFixed(2));
    }
    this.save();
    return isNewBest;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem(MUTE_KEY, String(this.state.muted));
    } catch {
      // Quota or private browsing safe ignore
    }
  }
}