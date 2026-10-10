// Web Audio port of src/ragaz/render.py: a flute-like lead over a tanpura drone.
// The browser plays the notation itself, so tempo and Sa can change and every
// visual reads the same clock (AudioContext.currentTime).

import { type Note, type Raga, swaraHz } from "./music";

const HARMONICS = [1.0, 0.35, 0.18, 0.08, 0.04]; // render.py render_lead
const TANPURA_GAPS = [1.1, 1.1, 1.1, 1.5]; // render.py render_tanpura

export type Pluck = { at: number; string: number }; // string 0 = Pa/Ma, 1–2 = Sa, 3 = low Sa
export type Playback = { t0: number; beat: number; end: number; notes: Note[]; tag?: string };
export type Hit = { at: number; semis: number; hz: number; kind: "note" | "wrong" | "harmonic" };

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/** One tanpura string: harmonics that bloom one after another (the jawari buzz). */
function tanpuraPluck(ctx: BaseAudioContext, hz: number, seconds = 5, seed = 0) {
  const sr = ctx.sampleRate;
  const n = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(1, n, sr);
  const out = buf.getChannelData(0);
  const rnd = seeded(seed);
  const decay = new Float32Array(n);
  for (let i = 0; i < n; i++) decay[i] = Math.exp(-i / sr / 3);
  for (let k = 1; k < 25; k++) {
    if (k * hz > sr / 2.5) break;
    const tk = 0.05 + 0.07 * k; // higher harmonics peak later
    const w = (2 * Math.PI * k * hz * (1 + 0.0002 * k)) / sr;
    const phase = rnd() * 2 * Math.PI;
    const amp = k ** -0.8;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] += amp * decay[i] * (0.35 + 0.65 * (t / tk) * Math.exp(1 - t / tk)) * Math.sin(w * i + phase);
    }
  }
  const attack = Math.floor(0.006 * sr);
  for (let i = 0; i < attack; i++) out[i] *= i / attack;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  for (let i = 0; i < n; i++) out[i] /= peak;
  return buf;
}

function reverbIR(ctx: BaseAudioContext, seconds = 1.8) {
  const sr = ctx.sampleRate;
  const n = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    const rnd = seeded(2 + c);
    for (let i = Math.floor(0.012 * sr); i < n; i++) d[i] = (rnd() * 2 - 1) * Math.exp(-i / sr / 0.5);
  }
  return buf;
}

/** The lead voice: harmonic oscillator + delayed vibrato + band-passed breath. */
class Flute {
  osc: OscillatorNode;
  lfo: OscillatorNode;
  noise: AudioBufferSourceNode;
  amp: GainNode;
  breath: GainNode;
  depth: GainNode;
  constructor(ctx: AudioContext, out: AudioNode, noiseBuf: AudioBuffer, wave: PeriodicWave) {
    this.osc = ctx.createOscillator();
    this.osc.setPeriodicWave(wave);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 4200;
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 5.2;
    this.depth = ctx.createGain();
    this.depth.gain.value = 0;
    this.lfo.connect(this.depth).connect(this.osc.frequency);
    this.noise = ctx.createBufferSource();
    this.noise.buffer = noiseBuf;
    this.noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2700;
    band.Q.value = 0.9;
    this.breath = ctx.createGain();
    this.breath.gain.value = 0;
    this.osc.connect(tone).connect(this.amp).connect(out);
    this.noise.connect(band).connect(this.breath).connect(out);
  }
  start(at: number, hz: number) {
    this.osc.frequency.setValueAtTime(hz, at);
    for (const s of [this.osc, this.lfo, this.noise]) s.start(at - 0.02);
  }
  /** A new note at `at`: glide (~45 ms like render.py), tonguing dip, vibrato after 250 ms. */
  note(at: number, hz: number, dur: number, first = false, level = 1) {
    if (!first) this.osc.frequency.setTargetAtTime(hz, at - 0.012, 0.014);
    this.amp.gain.setTargetAtTime(first ? level : 0.55 * level, at, first ? 0.03 : 0.004);
    this.amp.gain.setTargetAtTime(level, at + 0.012, 0.02);
    this.breath.gain.setTargetAtTime(0.1 * level, at, 0.01);
    this.breath.gain.setTargetAtTime(0.045 * level, at + 0.06, 0.08);
    this.depth.gain.setTargetAtTime(0, at, 0.02);
    if (dur > 0.3) this.depth.gain.setTargetAtTime(0.006 * hz, at + 0.25, 0.18);
  }
  release(at: number, tau = 0.12) {
    for (const g of [this.amp.gain, this.breath.gain, this.depth.gain]) {
      g.cancelScheduledValues(at);
      g.setTargetAtTime(0, at, tau);
    }
    for (const s of [this.osc, this.lfo, this.noise]) s.stop(at + tau * 10);
  }
}

export class Engine {
  ctx: AudioContext;
  analyser: AnalyserNode;
  plucks: Pluck[] = [];
  hits: Hit[] = [];
  saHz = 261.63;
  raga: Raga | null = null;
  playback: Playback | null = null;
  onEnd: ((p: Playback) => void) | null = null;
  private bus: GainNode;
  private droneGain: GainNode;
  private leadBus: GainNode;
  private strings: AudioBuffer[] = [];
  private droneTimer: number | null = null;
  private nextPluck = { at: 0, i: 0 };
  private piece: Flute | null = null;
  private glide: Flute | null = null;
  private test: Flute | null = null;
  private noiseBuf: AudioBuffer;
  private wave: PeriodicWave;
  private rnd = seeded(1);
  private endTimer: number | null = null;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    const ctx = this.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;
    this.bus = ctx.createGain();
    const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver();
    conv.buffer = reverbIR(ctx);
    dry.gain.value = 0.78;
    wet.gain.value = 0.6; // IR isn't energy-normalised like render.py's; matched by ear
    this.bus.connect(dry).connect(comp);
    this.bus.connect(conv).connect(wet).connect(comp);
    comp.connect(this.analyser).connect(ctx.destination);
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.connect(this.bus);
    this.leadBus = ctx.createGain();
    this.leadBus.gain.value = 0.32;
    this.leadBus.connect(this.bus);

    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    const r = seeded(7);
    for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
    this.wave = ctx.createPeriodicWave(new Float32Array(HARMONICS.length + 1), new Float32Array([0, ...HARMONICS]));
  }

  get now() {
    return this.ctx.currentTime;
  }
  async resume() {
    if (this.ctx.state !== "running") await this.ctx.resume();
  }
  private flute() {
    return new Flute(this.ctx, this.leadBus, this.noiseBuf, this.wave);
  }

  // ------------------------------------------------------------ tanpura

  /** Tune the four strings: first string Pa (or Ma when the raga has no Pa), Sa, Sa, low Sa. */
  tune(raga: Raga, saHz = this.saHz) {
    if (this.raga?.key === raga.key && this.saHz === saHz && this.strings.length) return;
    this.raga = raga;
    this.saHz = saHz;
    const hz = [swaraHz(raga.tanpura, -1, saHz), saHz, saHz, saHz / 2];
    this.strings = hz.map((f, i) => tanpuraPluck(this.ctx, f, 5, i + 1));
  }

  startDrone(fadeIn = 1.5) {
    if (this.droneTimer !== null) return;
    const t = this.now;
    this.droneGain.gain.cancelScheduledValues(t);
    this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, t);
    this.droneGain.gain.linearRampToValueAtTime(0.16, t + fadeIn);
    this.nextPluck = { at: t + 0.05, i: 0 };
    const tick = () => {
      while (this.nextPluck.at < this.now + 0.25) {
        const { at, i } = this.nextPluck;
        const s = this.ctx.createBufferSource();
        s.buffer = this.strings[i % 4];
        const g = this.ctx.createGain();
        g.gain.value = 0.85 + 0.15 * this.rnd();
        s.connect(g).connect(this.droneGain);
        s.start(at);
        this.plucks.push({ at, string: i % 4 });
        if (this.plucks.length > 64) this.plucks.shift();
        this.nextPluck = { at: at + TANPURA_GAPS[i % 4] * (0.97 + 0.06 * this.rnd()), i: i + 1 };
      }
    };
    tick();
    this.droneTimer = window.setInterval(tick, 80);
  }

  stopDrone(fadeOut = 1.2) {
    if (this.droneTimer === null) return;
    window.clearInterval(this.droneTimer);
    this.droneTimer = null;
    const t = this.now;
    this.droneGain.gain.cancelScheduledValues(t);
    this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, t);
    this.droneGain.gain.linearRampToValueAtTime(0, t + fadeOut);
  }

  /** Retune to another raga or Sa with a short crossfade (keeps the drone going). */
  retune(raga: Raga, saHz = this.saHz) {
    if (this.raga?.key === raga.key && this.saHz === saHz && this.strings.length) return;
    const was = this.droneOn;
    this.stopDrone(0.3);
    this.tune(raga, saHz);
    if (was) window.setTimeout(() => this.startDrone(0.8), 320);
  }

  get droneOn() {
    return this.droneTimer !== null;
  }

  // ------------------------------------------------------------ pieces

  play(notes: Note[], tempo: number, tag?: string): Playback {
    this.stopPiece();
    const beat = 60 / tempo;
    const t0 = this.now + 0.3;
    const last = notes[notes.length - 1];
    const end = t0 + (last.t + last.d) * beat;
    const v = this.flute();
    v.start(t0, swaraHz(notes[0].s, notes[0].o, this.saHz));
    notes.forEach((n, i) => v.note(t0 + n.t * beat, swaraHz(n.s, n.o, this.saHz), n.d * beat, i === 0));
    v.release(end);
    this.piece = v;
    const pb = { t0, beat, end, notes, tag };
    this.playback = pb;
    if (this.endTimer) window.clearTimeout(this.endTimer);
    this.endTimer = window.setTimeout(() => this.onEnd?.(pb), (end - this.now + 0.3) * 1000);
    return pb;
  }

  stopPiece() {
    this.piece?.release(this.now, 0.05);
    this.piece = null;
    this.playback = null;
    if (this.endTimer) window.clearTimeout(this.endTimer);
  }

  /** Resolves when the given playback finishes (or is replaced). */
  until(pb: Playback) {
    return new Promise<void>((resolve) => {
      const check = () => (this.playback !== pb || this.now > pb.end + 0.2 ? resolve() : window.setTimeout(check, 100));
      check();
    });
  }

  // ------------------------------------------------------------ playing by hand

  /** One short note (a tap on the mandala). Wrong notes sound muted. */
  note(swara: string, octave: number, dur = 0.55, kind: Hit["kind"] = "note") {
    const hz = swaraHz(swara, octave, this.saHz);
    const v = this.flute();
    const at = this.now + 0.01;
    v.start(at, hz);
    v.note(at, hz, dur, true, kind === "wrong" ? 0.3 : 0.85);
    v.release(at + dur, kind === "wrong" ? 0.06 : 0.18);
    this.log({ at, semis: "SrRgGmMPdDnN".indexOf(swara) + 12 * octave, hz, kind });
  }

  log(h: Hit) {
    this.hits.push(h);
    if (this.hits.length > 200) this.hits.shift();
  }

  /** Continuous voice for meend (glides): start, move, end. */
  glideStart(hz: number) {
    this.glideEnd();
    const v = this.flute();
    const at = this.now + 0.01;
    v.start(at, hz);
    v.amp.gain.setTargetAtTime(0.85, at, 0.04);
    v.breath.gain.setTargetAtTime(0.06, at, 0.05);
    v.depth.gain.setTargetAtTime(0.004 * hz, at + 0.35, 0.3);
    this.glide = v;
  }
  glideTo(hz: number, tau = 0.03) {
    this.glide?.osc.frequency.setTargetAtTime(hz, this.now, tau);
  }
  glideEnd() {
    this.glide?.release(this.now, 0.15);
    this.glide = null;
  }

  /** Pure overtone k of the low Sa string (the harmonic ladder). */
  harmonic(k: number, dur = 1.6) {
    const hz = (this.saHz / 2) * k;
    const o = this.ctx.createOscillator();
    o.frequency.value = hz;
    const g = this.ctx.createGain();
    const at = this.now + 0.01;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.5 / Math.sqrt(k), at + 0.03);
    g.gain.setTargetAtTime(0, at + dur * 0.6, dur * 0.25);
    o.connect(g).connect(this.leadBus);
    o.start(at);
    o.stop(at + dur * 2);
    this.log({ at, semis: 12 * Math.log2(k / 2), hz, kind: "harmonic" });
  }

  /** A held test tone for the tuning lab (no vibrato, so beating is audible). */
  testOn(hz: number) {
    if (this.test) return this.testSet(hz);
    const v = this.flute();
    const at = this.now + 0.01;
    v.start(at, hz);
    v.amp.gain.setTargetAtTime(0.7, at, 0.08);
    v.breath.gain.setTargetAtTime(0.02, at, 0.1);
    this.test = v;
  }
  testSet(hz: number) {
    this.test?.osc.frequency.setTargetAtTime(hz, this.now, 0.05);
  }
  testOff() {
    this.test?.release(this.now, 0.2);
    this.test = null;
  }
  get testing() {
    return this.test !== null;
  }

  /** A tiny pluck for UI feedback: a short, quiet harmonic of Sa. */
  tick(kind: "tap" | "soft" = "tap") {
    if (this.ctx.state !== "running") return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const at = this.now + 0.005;
    o.type = "sine";
    o.frequency.value = this.saHz * (kind === "tap" ? 4 : 3);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(kind === "tap" ? 0.05 : 0.03, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    o.connect(g).connect(this.leadBus);
    o.start(at);
    o.stop(at + 0.2);
  }

  /** Energy in three bands, 0..1, for the resonance field. */
  bands(buf: Uint8Array<ArrayBuffer>) {
    this.analyser.getByteFrequencyData(buf);
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    const avg = (lo: number, hi: number) => {
      let s = 0;
      const a = Math.floor(lo / binHz), b = Math.ceil(hi / binHz);
      for (let i = a; i < b; i++) s += buf[i];
      return s / (b - a) / 255;
    };
    return [avg(60, 250), avg(250, 1200), avg(1200, 5000)] as const;
  }
}

let engine: Engine | null = null;
export function getEngine() {
  if (!engine) {
    engine = new Engine();
    if (process.env.NODE_ENV === "development") (window as unknown as { __engine: Engine }).__engine = engine; // local audio checks
  }
  return engine;
}
export const peekEngine = () => engine;
