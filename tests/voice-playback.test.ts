// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioDirector, VOICE_WAIT } from '../src/campaign/audio';

/**
 * How the director plays its recordings, on a stand-in audio context: the recordings of a voice cue take turns, voice lines
 * are said one after another, and the combat's effects are levelled and tuned.
 */
class FakeParam { value = 1; setTargetAtTime() {} setValueAtTime() {} }
class FakeGain { gain = new FakeParam(); to?: unknown; connect(node: unknown) { this.to = node; } }
class FakeSource {
 buffer?: { duration: number; url: string }; playbackRate = new FakeParam(); out?: FakeGain | unknown; started?: number;
 constructor(private ctx: FakeContext) {}
 connect(node: unknown) { this.out = node; }
 start(at = this.ctx.currentTime) { this.started = at; this.ctx.sources.push(this); }
 get file() { return this.buffer!.url.match(/audio\/(.+)\.mp3/)![1]; }
}
/** Every recording is two seconds long here, except those given another length. */
const LENGTH: Record<string, number> = { 'voice/battle-won': 0.9, 'voice/quest': 1.3 };
class FakeContext {
 static last: FakeContext;
 currentTime = 0; state = 'running'; destination = {}; sources: FakeSource[] = [];
 constructor() { FakeContext.last = this; }
 createGain() { return new FakeGain(); }
 createBufferSource() { return new FakeSource(this); }
 decodeAudioData(data: ArrayBuffer) { const url = new TextDecoder().decode(data); return Promise.resolve({ duration: LENGTH[url.match(/audio\/(.+)\.mp3/)![1]] ?? 2, url }); }
 resume() { return Promise.resolve(); }
}
beforeEach(() => {
 localStorage.clear();
 vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
 vi.stubGlobal('AudioContext', FakeContext);
 vi.stubGlobal('fetch', (url: string) => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(url).buffer) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
/** Lets time pass on the wall clock and on the audio clock alike. */
const pass = async (seconds: number) => { FakeContext.last.currentTime += seconds; await vi.advanceTimersByTimeAsync(seconds * 1000); };
/** Lets what was asked for be loaded and scheduled, without time passing. */
const settle = () => vi.advanceTimersByTimeAsync(0);
const director = (random = () => 0) => { const d = new AudioDirector(random); d.unlock(); return { d, ctx: FakeContext.last }; };
const heard = (ctx: FakeContext) => ctx.sources.map(s => `${s.file} at ${s.started!.toFixed(2)}`);

describe('voice lines', () => {
 it('play the next recording of their cue each time', async () => {
  const { d, ctx } = director();
  for (let i = 0; i < 4; i++) { await d.play('voice', 'turn-horde'); await pass(3); }
  expect(ctx.sources.map(s => s.file)).toEqual(['voice/turn-horde', 'voice/turn-horde-2', 'voice/turn-horde-3', 'voice/turn-horde']);
 });
 it('wait for the line being spoken instead of talking over it or going unsaid', async () => {
  const { d, ctx } = director();
  // The fight is won, and the quest it completes is announced a third of a second later.
  void d.play('voice', 'battle-won'); await settle(); await pass(0.3);
  void d.play('voice', 'quest'); await settle();
  // 0.9 s of the first line and a breath of 0.15 s: the second begins when the first has ended.
  expect(heard(ctx)).toEqual(['voice/battle-won at 0.00', 'voice/quest at 1.05']);
  // With nothing being said, a line begins at once.
  await pass(5);
  void d.play('voice', 'level'); await settle();
  expect(heard(ctx).at(-1)).toBe('voice/level at 5.30');
 });
 it('say three lines asked for together one after another, in the order asked', async () => {
  const { d, ctx } = director();
  void d.play('voice', 'battle-won'); void d.play('voice', 'quest'); void d.play('voice', 'new-quest');
  await settle();
  expect(heard(ctx)).toEqual(['voice/battle-won at 0.00', 'voice/quest at 1.05', 'voice/new-quest at 2.50']);
 });
 it('leave a line unsaid when it would have to wait too long', async () => {
  const { d, ctx } = director();
  expect(VOICE_WAIT).toBe(2600);
  void d.play('voice', 'overlord-kelthuzad'); void d.play('voice', 'event'); await settle();
  // Two lines of two seconds are under way: 4.3 s of speech ahead of the third.
  void d.play('voice', 'turn-alliance'); await settle();
  expect(ctx.sources.map(s => s.file)).toEqual(['voice/overlord-kelthuzad', 'voice/event']);
  // Once the wait is short again, lines are said again, after what is still being spoken.
  await pass(2);
  void d.play('voice', 'turn-alliance'); await settle();
  expect(heard(ctx)).toEqual(['voice/overlord-kelthuzad at 0.00', 'voice/event at 2.15', 'voice/turn-alliance at 4.30']);
 });
 it('do not repeat the same cue asked twice in one moment, and stay silent when voices are switched off', async () => {
  const { d, ctx } = director();
  void d.play('voice', 'quest'); void d.play('voice', 'quest'); await settle();
  expect(ctx.sources).toHaveLength(1);
  d.update({ voices: false });
  await pass(5); void d.play('voice', 'level'); await settle();
  expect(ctx.sources).toHaveLength(1);
  d.update({ voices: true, muted: true });
  void d.play('voice', 'level'); void d.play('sfx', 'hit'); await settle();
  expect(ctx.sources).toHaveLength(1);
 });
});

describe('the combat’s effects', () => {
 it('are set a little under the rest and tuned from one blow to the next', async () => {
  const { d, ctx } = director();
  for (let i = 0; i < 4; i++) { await d.play('sfx', 'hit'); await pass(1); }
  expect(ctx.sources.map(s => s.playbackRate.value)).toEqual([1, 0.93, 1.07, 1]);
  expect(ctx.sources.map(s => (s.out as FakeGain).gain.value)).toEqual([0.9, 0.9, 0.9, 0.9]);
  await d.play('sfx', 'roar'); await d.play('sfx', 'dice');
  const [roar, dice] = ctx.sources.slice(-2);
  expect((roar.out as FakeGain).gain.value).toBe(0.6);
  // The dice, like every earlier effect, go straight to the effects bus at their own pitch.
  expect(dice.playbackRate.value).toBe(1); expect((dice.out as FakeGain).to).toBeDefined();
 });
 it('start after the delay their cue gives them', async () => {
  const { d, ctx } = director();
  await pass(2);
  d.cue({ sfx: 'slain', delay: 0.28 }); await settle();
  expect(ctx.sources[0].file).toBe('sfx/slain'); expect(ctx.sources[0].started).toBeCloseTo(2.28, 5);
 });
});
