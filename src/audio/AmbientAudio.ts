type SoundState = 'day' | 'night' | 'rain' | 'storm';

export class AmbientAudio {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isInitialized = false;
  private volume = 0.3;

  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  private currentState: SoundState = 'day';
  private chirpTimer = 0;
  private cricketTimer = 0;
  private rumbleTimer = 0;

  constructor() {}

  init(): void {
    if (this.isInitialized) return;

    try {
      this.audioCtx = new AudioContext();
    } catch {
      return;
    }

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.audioCtx.destination);

    this.windGain = this.audioCtx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(this.masterGain);

    this.rainGain = this.audioCtx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(this.masterGain);

    this.startWindNoise();
    this.startRainNoise();

    this.isInitialized = true;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioCtx.currentTime, 0.1);
    }
  }

  update(timeOfDay: number, weather: string, tick: number): void {
    if (!this.isInitialized || !this.audioCtx || !this.windGain || !this.rainGain) return;

    const now = this.audioCtx.currentTime;
    const transitionTime = 0.5;

    const newState = this.resolveState(timeOfDay, weather);
    this.currentState = newState;

    switch (this.currentState) {
      case 'day':
        this.windGain.gain.setTargetAtTime(0.15, now, transitionTime);
        this.rainGain.gain.setTargetAtTime(0, now, transitionTime);
        this.handleChirps(tick);
        break;
      case 'night':
        this.windGain.gain.setTargetAtTime(0.08, now, transitionTime);
        this.rainGain.gain.setTargetAtTime(0, now, transitionTime);
        this.handleCrickets(tick);
        break;
      case 'rain':
        this.windGain.gain.setTargetAtTime(0.05, now, transitionTime);
        this.rainGain.gain.setTargetAtTime(0.3, now, transitionTime);
        break;
      case 'storm':
        this.windGain.gain.setTargetAtTime(0.1, now, transitionTime);
        this.rainGain.gain.setTargetAtTime(0.5, now, transitionTime);
        this.handleRumble(tick);
        break;
    }
  }

  destroy(): void {
    if (this.windNode) {
      this.windNode.stop();
      this.windNode.disconnect();
      this.windNode = null;
    }
    if (this.rainNode) {
      this.rainNode.stop();
      this.rainNode.disconnect();
      this.rainNode = null;
    }
    if (this.windGain) {
      this.windGain.disconnect();
      this.windGain = null;
    }
    if (this.rainGain) {
      this.rainGain.disconnect();
      this.rainGain = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    this.isInitialized = false;
  }

  // --- Private helpers ---

  private resolveState(timeOfDay: number, weather: string): SoundState {
    if (weather === 'storm') return 'storm';
    if (weather === 'rain') return 'rain';
    // timeOfDay: 0-1 where 0.25=dawn, 0.75=dusk roughly
    if (timeOfDay < 0.2 || timeOfDay > 0.8) return 'night';
    return 'day';
  }

  private createNoiseBuffer(durationSec: number, type: 'white' | 'pink'): AudioBuffer {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else {
      // Pink noise via Paul Kellet's algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    return buffer;
  }

  private startWindNoise(): void {
    const ctx = this.audioCtx!;
    const buffer = this.createNoiseBuffer(2, 'white');

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.connect(this.windGain!);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(filter);
    source.start();

    this.windNode = source;
  }

  private startRainNoise(): void {
    const ctx = this.audioCtx!;
    const buffer = this.createNoiseBuffer(2, 'pink');

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    filter.connect(this.rainGain!);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(filter);
    source.start();

    this.rainNode = source;
  }

  private handleChirps(tick: number): void {
    if (tick - this.chirpTimer < 120) return;
    if (Math.random() > 0.3) return;
    this.chirpTimer = tick;
    this.playChirp();
  }

  private handleCrickets(tick: number): void {
    if (tick - this.cricketTimer < 30) return;
    if (Math.random() > 0.4) return;
    this.cricketTimer = tick;
    this.playCricket();
  }

  private handleRumble(tick: number): void {
    if (tick - this.rumbleTimer < 300) return;
    if (Math.random() > 0.2) return;
    this.rumbleTimer = tick;
    this.playRumble();
  }

  private playChirp(): void {
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500 + Math.random() * 1500, now);
    osc.frequency.exponentialRampToValueAtTime(3000 + Math.random() * 1000, now + 0.05);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playCricket(): void {
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;
    const pulseCount = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < pulseCount; i++) {
      const offset = i * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 4000 + Math.random() * 500;

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.04, now + offset + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + offset);
      osc.stop(now + offset + 0.03);
    }
  }

  private playRumble(): void {
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;
    const duration = 0.6 + Math.random() * 0.8;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(40 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration);
  }
}
