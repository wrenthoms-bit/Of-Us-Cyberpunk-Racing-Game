export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private analyserAttached = false;
  private muted = false;
  private unlocked = false;
  private syntheticTime = 0;

  public pulse = 0;
  public bassPulse = 0;
  public midPulse = 0;

  constructor(initialMuted: boolean) {
    this.muted = initialMuted;
  }

  public unlockAndStart(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.musicGain.gain.value = 0.78;
      this.sfxGain.gain.value = 0.9;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setupMusicElement();
      this.setupEngineLoop();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (this.audioEl && this.audioEl.paused) {
      this.audioEl.play().catch(() => {
        // Fallback if browser blocks or file is missing
      });
    }

    this.unlocked = true;
  }

  private setupMusicElement(): void {
    if (!this.ctx || !this.musicGain) return;
    const audio = new Audio('./Of_Us_Master_Game.mp3');
    audio.loop = true;
    this.audioEl = audio;

    // If opened over file://, MediaElementSource can taint or throw in some browsers;
    // wrap in try/catch and fall back to un-analysed playback + synthetic pulse.
    if (window.location.protocol !== 'file:') {
      try {
        const source = this.ctx.createMediaElementSource(audio);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.78;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        source.connect(this.analyser);
        this.analyser.connect(this.musicGain);
        this.analyserAttached = true;
      } catch {
        this.analyserAttached = false;
      }
    }
  }

  private setupEngineLoop(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineSubOsc.type = 'triangle';
    this.engineOsc.frequency.value = 65;
    this.engineSubOsc.frequency.value = 32.5;
    this.engineGain.gain.value = 0.0001;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    this.engineOsc.connect(filter);
    this.engineSubOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
    this.engineSubOsc.start();
  }

  public update(dt: number, speedRatio: number, isNitro: boolean, isPlaying: boolean): void {
    this.syntheticTime += dt;

    // 1. Update Music Pulse
    if (this.analyserAttached && this.analyser && this.freqData && this.audioEl && !this.audioEl.paused) {
      this.analyser.getByteFrequencyData(this.freqData);
      let bassSum = 0;
      for (let i = 0; i < 10; i++) bassSum += this.freqData[i];
      let midSum = 0;
      for (let i = 10; i < 42; i++) midSum += this.freqData[i];

      const rawBass = bassSum / (10 * 255);
      const rawMid = midSum / (32 * 255);

      if (rawBass > 0.02 || rawMid > 0.02) {
        this.bassPulse = Math.pow(rawBass, 1.35);
        this.midPulse = rawMid;
        this.pulse = Math.min(1, this.bassPulse * 0.75 + this.midPulse * 0.35);
      } else {
        this.computeSyntheticPulse();
      }
    } else {
      this.computeSyntheticPulse();
    }

    // 2. Update Continuous Doppler Engine Whine
    if (this.ctx && this.engineOsc && this.engineSubOsc && this.engineGain) {
      const now = this.ctx.currentTime;
      if (isPlaying && !this.muted) {
        const baseFreq = 58 + speedRatio * 145 + (isNitro ? 55 : 0);
        this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
        this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
        this.engineGain.gain.setTargetAtTime(0.065 + speedRatio * 0.05, now, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
    }
  }

  private computeSyntheticPulse(): void {
    // 128 BPM synthwave kick simulation
    const beat = (this.syntheticTime * (128 / 60)) % 1;
    const kick = Math.pow(Math.max(0, 1 - beat * 3.2), 2.2);
    const swell = 0.5 + 0.5 * Math.sin(this.syntheticTime * 2.1);
    this.bassPulse = kick;
    this.midPulse = swell * 0.6;
    this.pulse = kick * 0.75 + swell * 0.25;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 1, this.ctx.currentTime, 0.04);
    }
    if (this.audioEl) {
      this.audioEl.muted = mute;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public duckMusic(duck: boolean): void {
    if (!this.musicGain || !this.ctx) return;
    this.musicGain.gain.setTargetAtTime(duck ? 0.18 : 0.78, this.ctx.currentTime, 0.15);
  }

  private createSpatialOut(panX = 0): AudioNode | null {
    if (!this.ctx || !this.sfxGain || this.muted || !this.unlocked) return null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, panX));
      panner.connect(this.sfxGain);
      return panner;
    }
    return this.sfxGain;
  }

  public playClick(): void {
    const out = this.createSpatialOut(0);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.045);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playPickup(type: 'SHIELD' | 'NITRO' | 'ORB', panX = 0): void {
    const out = this.createSpatialOut(panX);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type === 'ORB' ? 'sine' : 'triangle';
    const base = type === 'SHIELD' ? 520 : type === 'NITRO' ? 660 : 880;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.75, now + 0.16);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playNearMiss(panX = 0): void {
    const out = this.createSpatialOut(panX);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.18);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playGraze(panX = 0): void {
    const out = this.createSpatialOut(panX);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.12);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playBoostRing(): void {
    const out = this.createSpatialOut(0);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1120, now + 0.35);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playLaserCharge(panX = 0): void {
    const out = this.createSpatialOut(panX);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(1560, now + 0.45);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  public playLaserStrike(panX = 0): void {
    const out = this.createSpatialOut(panX);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.38);
    g.gain.setValueAtTime(0.38, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playCeilingLockBeep(): void {
    const out = this.createSpatialOut(0);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.setValueAtTime(1760, now + 0.05);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playShieldBreak(): void {
    const out = this.createSpatialOut(0);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.42);
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playExplosion(panX = 0): void {
    const out = this.createSpatialOut(panX);
    if (!out || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.55;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.16));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(65, now + 0.5);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.54);

    noise.connect(filter);
    filter.connect(g);
    g.connect(out);
    noise.start(now);
  }
}