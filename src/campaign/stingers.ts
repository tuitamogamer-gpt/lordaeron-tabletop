import type { Stinger } from './stage';

/**
 * Short sounds for the steps of the table and the moments of a combat that have no recording: footsteps for a journey, a horn
 * for the hand-over of the turn, a drum under an Event card, counters put down, a bowstring, wings, a town bell. They are built
 * from oscillators and noise when they are needed, so they cost no download. Each recipe schedules its nodes on `ctx` from
 * time `t` into `out` and returns how long it sounds, in seconds.
 */
type Recipe = (ctx: BaseAudioContext, out: AudioNode, t: number) => number;

/**
 * A gain that is silent until its sound begins. A gain's own value is 1 until its first scheduled event, and a source that
 * starts between two samples can begin one sample before that event: noise then opens with a click at full level. So the
 * value itself starts at silence. (Measured on 12. 11. 2026: a burst meant to peak at 0.1 opened at 0.9.)
 */
const silent = (ctx: BaseAudioContext, t: number) => { const gain = ctx.createGain(); gain.gain.value = 0.0001; gain.gain.setValueAtTime(0.0001, t); return gain; };
const envelope = (ctx: BaseAudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number) => {
 const gain = silent(ctx, t); gain.gain.exponentialRampToValueAtTime(peak, t + attack); gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
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

/** A brass voice: a few sawtooth partials opening and closing behind a filter, as the horn does. */
const brass = (ctx: BaseAudioContext, out: AudioNode, t: number, frequency: number, peak: number, length: number) => {
 const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.7;
 filter.frequency.setValueAtTime(380, t); filter.frequency.linearRampToValueAtTime(1700, t + length * 0.35); filter.frequency.linearRampToValueAtTime(600, t + length); filter.connect(out);
 for (const [ratio, share] of [[1, 1], [1.5, 0.6], [2, 0.3]] as const) {
  const osc = ctx.createOscillator(), gain = silent(ctx, t); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(frequency * ratio * 0.99, t); osc.frequency.linearRampToValueAtTime(frequency * ratio, t + 0.06);
  gain.gain.exponentialRampToValueAtTime(peak * share, t + 0.05); gain.gain.setValueAtTime(peak * share, t + length * 0.6); gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain); gain.connect(filter); osc.start(t); osc.stop(t + length + 0.05);
 }
};

export const STINGERS: Record<Stinger, Recipe> = {
 // Three soft steps on a road.
 steps: (ctx, out, t) => { for (let i = 0; i < 3; i++) { const at = t + i * 0.19; tone(ctx, out, at, 'sine', 120 - i * 8, 58, 0.44, 0.008, 0.13); noise(ctx, out, at, 'lowpass', 900, 300, 0.16, 0.004, 0.07); } return 0.6; },
 // A war horn: a fifth swelling open and falling away.
 horn: (ctx, out, t) => {
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(320, t); filter.frequency.linearRampToValueAtTime(1500, t + 0.45); filter.frequency.linearRampToValueAtTime(500, t + 1.35); filter.connect(out);
  for (const [frequency, peak] of [[146.83, 0.22], [220, 0.16], [293.66, 0.07]] as const) {
   const osc = ctx.createOscillator(), gain = silent(ctx, t); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(frequency * 0.985, t); osc.frequency.linearRampToValueAtTime(frequency, t + 0.18);
   gain.gain.exponentialRampToValueAtTime(peak, t + 0.22); gain.gain.setValueAtTime(peak, t + 0.85); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
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
  for (const frequency of [55, 58.27, 110.4]) { const osc = ctx.createOscillator(), gain = silent(ctx, t); osc.type = 'sawtooth'; osc.frequency.value = frequency; gain.gain.exponentialRampToValueAtTime(0.2, t + 0.7); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.7); osc.connect(gain); gain.connect(filter); osc.start(t); osc.stop(t + 1.75); }
  return 1.75;
 },
 // A fall.
 thud: (ctx, out, t) => { tone(ctx, out, t, 'sine', 140, 38, 0.55, 0.004, 0.42); noise(ctx, out, t, 'lowpass', 700, 150, 0.2, 0.003, 0.12); return 0.46; },

 // ----- The combat's moments without a recording -----
 // Health coming back: four soft notes rising, with a breath of air over them.
 heal: (ctx, out, t) => {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => { tone(ctx, out, t + i * 0.075, 'sine', frequency, frequency, 0.15, 0.012, 0.55); tone(ctx, out, t + i * 0.075, 'sine', frequency * 2, frequency * 2, 0.045, 0.01, 0.3); });
  noise(ctx, out, t, 'highpass', 5000, 8000, 0.05, 0.25, 0.5); return 0.95;
 },
 // Hit counters put down on the board: three small clacks.
 tokens: (ctx, out, t) => { [0, 0.08, 0.15].forEach((at, i) => { noise(ctx, out, t + at, 'bandpass', 2400 + i * 300, 1800, 0.45, 0.002, 0.045); tone(ctx, out, t + at, 'triangle', 760 - i * 60, 420, 0.2, 0.002, 0.05); }); return 0.25; },
 // A bowstring, the arrow's flight and where it lands.
 volley: (ctx, out, t) => {
  tone(ctx, out, t, 'triangle', 190, 150, 0.3, 0.003, 0.16); noise(ctx, out, t + 0.03, 'bandpass', 900, 3200, 0.22, 0.05, 0.22);
  tone(ctx, out, t + 0.33, 'sine', 150, 70, 0.42, 0.003, 0.12); noise(ctx, out, t + 0.33, 'lowpass', 1400, 400, 0.18, 0.002, 0.05); return 0.5;
 },
 // A blade drawn through the air for a warrior's, a rogue's or a hunter's power.
 power: (ctx, out, t) => { noise(ctx, out, t, 'bandpass', 1800, 6200, 0.55, 0.04, 0.16); tone(ctx, out, t + 0.1, 'sine', 2093, 2093, 0.11, 0.004, 0.3); tone(ctx, out, t + 0.1, 'sine', 3136, 3136, 0.06, 0.004, 0.22); return 0.42; },
 // Sparks over a spell: the recorded bolt is a low surge, and this is its glitter.
 spark: (ctx, out, t) => { [2637, 3136, 3951, 3520, 4186].forEach((frequency, i) => tone(ctx, out, t + 0.05 + i * 0.045, 'sine', frequency, frequency * 0.985, 0.1, 0.004, 0.2)); noise(ctx, out, t, 'bandpass', 6000, 9000, 0.1, 0.06, 0.3); return 0.5; },
 // The side that won the fight: three quick rising notes of a horn.
 triumph: (ctx, out, t) => { brass(ctx, out, t, 196, 0.13, 0.2); brass(ctx, out, t + 0.16, 261.63, 0.14, 0.2); brass(ctx, out, t + 0.32, 329.63, 0.16, 0.62); return 0.95; },
 // The side that lost it: two low notes falling.
 defeat: (ctx, out, t) => { brass(ctx, out, t, 164.81, 0.16, 0.55); brass(ctx, out, t + 0.45, 130.81, 0.17, 0.95); return 1.4; },

 // ----- The table's steps -----
 // A flight path: three beats of great wings.
 wings: (ctx, out, t) => { for (let i = 0; i < 3; i++) { const at = t + i * 0.3; noise(ctx, out, at, 'lowpass', 700, 260, 0.65, 0.07, 0.16); noise(ctx, out, at, 'lowpass', 1100, 420, 0.6, 0.06, 0.15); noise(ctx, out, at + 0.12, 'bandpass', 1500, 900, 0.3, 0.03, 0.08); } return 0.9; },
 // A town's bell: the partials of a cast bell, the low ones ringing longest.
 bell: (ctx, out, t) => {
  for (const [ratio, peak, decay] of [[0.5, 0.09, 1.6], [1, 0.19, 1.3], [1.19, 0.11, 0.9], [1.5, 0.07, 0.7], [2, 0.11, 0.6], [2.67, 0.045, 0.4], [3.01, 0.035, 0.3]] as const) tone(ctx, out, t, 'sine', 440 * ratio, 440 * ratio, peak, 0.004, decay);
  noise(ctx, out, t, 'bandpass', 3000, 2000, 0.08, 0.002, 0.04); return 1.65;
 },
 // A portal or a summoning: two voices sliding upward through a rising wind, and a soft close.
 portal: (ctx, out, t) => {
  tone(ctx, out, t, 'sine', 180, 720, 0.2, 0.3, 0.5); tone(ctx, out, t, 'sine', 271, 1084, 0.12, 0.3, 0.5); noise(ctx, out, t, 'bandpass', 600, 4000, 0.3, 0.35, 0.4);
  tone(ctx, out, t + 0.82, 'sine', 880, 440, 0.12, 0.005, 0.25); return 1.1;
 },
 // War: two drum beats and a third, heavier.
 wardrums: (ctx, out, t) => { [[0, 0.4], [0.28, 0.4], [0.56, 0.58]].forEach(([at, peak]) => { tone(ctx, out, t + at, 'sine', 92, 44, peak, 0.005, 0.5); noise(ctx, out, t + at, 'lowpass', 500, 140, peak * 0.4, 0.004, 0.14); }); return 1.1; },
 // Equipment changed: leather pulled tight and a buckle.
 equip: (ctx, out, t) => { noise(ctx, out, t, 'bandpass', 420, 760, 0.65, 0.05, 0.12); noise(ctx, out, t, 'bandpass', 900, 1400, 0.5, 0.05, 0.11); tone(ctx, out, t + 0.16, 'sine', 2500, 2500, 0.12, 0.002, 0.07); tone(ctx, out, t + 0.2, 'sine', 3300, 3300, 0.09, 0.002, 0.06); noise(ctx, out, t + 0.16, 'highpass', 4000, 4000, 0.14, 0.002, 0.03); return 0.3; },
};
