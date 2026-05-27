// Ambient sound engine using Web Audio API — no external dependencies

type AmbientSoundType = 'cafe' | 'forest' | 'white-noise' | 'rain' | 'none';

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private extraNodes: AudioNode[] = [];
  private chirpInterval: ReturnType<typeof setInterval> | null = null;
  private currentType: AmbientSoundType = 'none';
  private currentVolume = 0.3;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.currentVolume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private makeNoiseBuffer(durationSec: number, type: 'white' | 'brown' | 'pink'): AudioBuffer {
    const ctx = this.getCtx();
    const size = ctx.sampleRate * durationSec;
    const buf = ctx.createBuffer(2, size, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      let lastOut = 0;
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < size; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') {
          data[i] = white * 0.5;
        } else if (type === 'brown') {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        } else {
          // Pink noise (Voss-McCartney approximation)
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
    }
    return buf;
  }

  private playLoop(buffer: AudioBuffer, gain?: GainNode): AudioBufferSourceNode {
    const ctx = this.getCtx();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const g = gain ?? this.masterGain!;
    src.connect(g);
    src.start(0);
    return src;
  }

  private scheduleChirps() {
    if (this.chirpInterval) clearInterval(this.chirpInterval);
    this.chirpInterval = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      this.playChirp();
    }, 4000 + Math.random() * 8000);
  }

  private playChirp() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    const freq = 1800 + Math.random() * 1200;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + 0.06);
    osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    osc.type = 'sine';
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    this.extraNodes.push(osc, gain);
  }

  private stopCurrent() {
    try { this.currentSource?.stop(); } catch {}
    this.currentSource = null;
    if (this.chirpInterval) { clearInterval(this.chirpInterval); this.chirpInterval = null; }
    this.extraNodes = [];
  }

  play(type: AmbientSoundType, volume?: number) {
    if (volume !== undefined) this.currentVolume = volume;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.currentVolume, this.getCtx().currentTime, 0.1);

    if (type === 'none') { this.stop(); return; }
    if (type === this.currentType && this.currentSource) return;

    this.stopCurrent();
    this.currentType = type;
    const ctx = this.getCtx();

    if (type === 'white-noise') {
      const buf = this.makeNoiseBuffer(4, 'white');
      const src = this.playLoop(buf);
      this.currentSource = src;
    }

    if (type === 'rain') {
      const buf = this.makeNoiseBuffer(6, 'brown');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 0.5;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(filter);
      filter.connect(this.masterGain!);
      src.start(0);
      this.currentSource = src;
      this.extraNodes.push(filter);
    }

    if (type === 'cafe') {
      // Warm brown noise as cafe ambiance
      const buf = this.makeNoiseBuffer(8, 'brown');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      gain.connect(this.masterGain!);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(filter);
      filter.connect(gain);
      src.start(0);
      this.currentSource = src;
      this.extraNodes.push(filter, gain);
    }

    if (type === 'forest') {
      // Pink noise for forest ambiance + bird chirps
      const buf = this.makeNoiseBuffer(8, 'pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.3;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      gain.connect(this.masterGain!);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(filter);
      filter.connect(gain);
      src.start(0);
      this.currentSource = src;
      this.extraNodes.push(filter, gain);
      this.scheduleChirps();
    }
  }

  stop() {
    this.stopCurrent();
    this.currentType = 'none';
  }

  setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  getCurrentType() { return this.currentType; }
}

// Singleton
let engine: AmbientAudioEngine | null = null;
export function getAmbientEngine(): AmbientAudioEngine {
  if (!engine) engine = new AmbientAudioEngine();
  return engine;
}
