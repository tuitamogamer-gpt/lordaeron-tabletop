import type { Stinger } from './stage';

/**
 * Short sounds for the steps of the table that have no recording: footsteps for a journey, a horn for the hand-over of the
 * turn, a drum under an Event card. They are built from oscillators and noise when they are needed, so they cost no download.
 * Each recipe schedules its nodes on `ctx` from time `t` into `out` and returns how long it sounds, in seconds.
 */
type Recipe = (ctx: BaseAudioContext, out: AudioNode, t: number) => number;

const envelope = (ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number) => {
 const gain = ctx.createGain();
 gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(peak, t + attack); gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
 gain.connect(out); return gain;
};
const tone = (ctx: BaseAudioContext, out: AudioNode, t: number, type: OscillatorType, from: number, to: number, peak: number, attack: number, decay: number) => {
 const osc = ctx.createOscillator(); osc.type = type;
 osc.frequency.setValueAtTime(from, t); if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
 osc.connect(envelope(ctx, out, t, peak, attack, decay)); osc.start(t); osc.stop(t + attack + decay + 0.05);
};
/** White noise through a filter: the breath of a page, the skin of a drum. */
const noise = (ctx: BaseAudioContext, out: AudioNode, t: number, type: BiquadFilterType, from: number, to: number, peak: number, attack: number, decay: number) => {
 const length = Math.ceil(ctx.sampleRate * (attack + decay + 0.05)), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
 // A fixed sequence, so the same step always sounds the same.
 let seed = 0x2f6e2b1;
 for (let i = 0; i < length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = ((seed >>> 0) / 0x100000000) * 2 - 1; }
 const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
 source.buffer = buffer; filter.type = type; filter.Q.value = 0.9;
 filter.frequency.setValueAtTime(from, t); if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
 source.connect(filter); filter.connect(envelope(ctx, out, t, peak, attack, decay)); source.start(t); source.stop(t + attack + decay + 0.05);
};

export const STINGERS: Record<Stinger, Recipe> = {
 // Three soft steps on a road.
 steps: (ctx, out, t) => { for (let i = 0; i < 3; i++) { const at = t + i * 0.19; tone(ctx, out, at, 'sine', 120 - i * 8, 58, 0.44, 0.008, 0.13); noise(ctx, out, at, 'lowpass', 900, 300, 0.16, 0.004, 0.07); } return 0.6; },
 // A war horn: a fifth swelling open and falling away.
 horn: (ctx, out, t) => {
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(320, t); filter.frequency.linearRampToValueAtTime(1500, t + 0.45); filter.frequency.linearRampToValueAtTime(500, t + 1.35); filter.connect(out);
  for (const [frequency, peak] of [[146.83, 0.22], [220, 0.16], [293.66, 0.07]] as const) {
   const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(frequency * 0.985, t); osc.frequency.linearRampToValueAtTime(frequency, t + 0.18);
   gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(peak, t + 0.22); gain.gain.setValueAtTime(peak, t + 0.85); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
   osc.connect(gain); gain.connect(filter); osc.start(t); osc.stop(t + 1.45);
  }
  return 1.45;
 },
 // One deep drum under a card turned over.
 drum: (ctx, out, t) => { tone(ctx, out, t, 'sine', 96, 42, 0.6, 0.006, 0.55); noise(ctx, out, t, 'lowpass', 420, 120, 0.22, 0.004, 0.16); return 0.62; },
 // Two small bells, a fifth apart.
 chime: (ctx, out, t) => { for (const [at, base] of [[0, 659.25], [0.13, 987.77]] as const) for (const [ratio, peak] of [[1, 0.2], [2.76, 0.07], [5.4, 0.03]] as const) tone(ctx, out, t + at, 'sine', base * ratio, base * ratio, peak, 0.005, 0.85 / ratio ** 0.5); return 1.0; },
 // A page turned, or a card slid across the table.
 page: (ctx, out, t) => { noise(ctx, out, t, 'bandpass', 1800, 5200, 0.62, 0.03, 0.17); noise(ctx, out, t + 0.12, 'bandpass', 4200, 2400, 0.34, 0.01, 0.1); return 0.3; },
 // Something stirs: two low voices a semitone apart.
 omen: (ctx, out, t) => {
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(180, t); filter.frequency.linearRampToValueAtTime(420, t + 0.9); filter.connect(out);
  for (const frequency of [55, 58.27, 110.4]) { const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.2, t + 0.7); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.7); osc.connect(gain); gain.connect(filter); osc.start(t); osc.stop(t + 1.75); }
  return 1.75;
 },
 // A fall.
 thud: (ctx, out, t) => { tone(ctx, out, t, 'sine', 140, 38, 0.55, 0.004, 0.42); noise(ctx, out, t, 'lowpass', 700, 150, 0.2, 0.003, 0.12); return 0.46; },
};
