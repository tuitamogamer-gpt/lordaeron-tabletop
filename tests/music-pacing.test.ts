// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioDirector, CROSSFADE, FADE_IN, FADE_OUT, phrase, type Track } from '../src/campaign/audio';

/** Length of the stand-in loops, in seconds. */
const LENGTH = 10;

type ParamEvent = [kind: 'set' | 'ramp' | 'cancel', value: number, at: number];
class FakeParam {
 value = 1; events: ParamEvent[] = [];
 setValueAtTime(value: number, at: number) { this.events.push(['set', value, at]); }
 linearRampToValueAtTime(value: number, at: number) { this.events.push(['ramp', value, at]); }
 setTargetAtTime() {}
 cancelScheduledValues(at: number) { this.events.push(['cancel', 0, at]); }
}
class FakeGain { gain = new FakeParam(); connect() {} }
class FakeSource {
 buffer?: { duration: number; url: string }; loop = false; out?: FakeGain; started?: number; stopAt?: number; onended?: () => void;
 constructor(private ctx: FakeContext) {}
 connect(node: FakeGain) { this.out = node; }
 start() { this.started = this.ctx.currentTime; this.ctx.sources.push(this); }
 stop(at = this.ctx.currentTime) { this.stopAt = at; }
 get track() { return this.buffer!.url.match(/music\/(\w+)\.mp3/)![1] as Track; }
 /** The browser ends a source at its scheduled stop. */
 finish() { this.ctx.currentTime = this.stopAt!; this.onended?.(); }
}
class FakeContext {
 static last: FakeContext;
 currentTime = 0; state = 'running'; destination = {}; sources: FakeSource[] = [];
 constructor() { FakeContext.last = this; }
 createGain() { return new FakeGain(); }
 createBufferSource() { return new FakeSource(this); }
 decodeAudioData(data: ArrayBuffer) { return Promise.resolve({ duration: LENGTH, url: new TextDecoder().decode(data) }); }
 resume() { this.state = 'running'; return Promise.resolve(); }
 suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

beforeEach(() => {
 localStorage.clear();
 vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
 vi.stubGlobal('AudioContext', FakeContext);
 vi.stubGlobal('fetch', (url: string) => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(url).buffer) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

/** Lets time pass on the wall clock (rests and timers) and on the audio clock alike. */
const pass = async (seconds: number) => { FakeContext.last.currentTime += seconds; await vi.advanceTimersByTimeAsync(seconds * 1000); };
const director = async (track: Track = 'map') => { const d = new AudioDirector(); d.unlock(); await d.music(track); return { d, ctx: FakeContext.last }; };
const playing = (ctx: FakeContext) => ctx.sources.map(s => s.track);

describe('the pacing of the music', () => {
 it('gives the map longer rests than a battle and varies the phrases', () => {
  const map = [0, 1, 2, 3].map(n => phrase('map', n)), battle = [0, 1].map(n => phrase('battle', n));
  expect(new Set(map.map(p => p.rest)).size).toBeGreaterThan(1);
  expect(Math.min(...map.map(p => p.rest))).toBeGreaterThan(Math.max(...battle.map(p => p.rest)));
  for (const p of [...map, ...battle]) { expect(p.cycles).toBeGreaterThanOrEqual(3); expect(p.cycles).toBeLessThanOrEqual(6); expect(p.rest).toBeGreaterThanOrEqual(15); }
  expect(phrase('map', 4)).toEqual(phrase('map', 0));
 });

 it('plays a phrase of a few cycles with a fade at each end instead of looping without end', async () => {
  const { ctx } = await director(), [source] = ctx.sources, play = phrase('map', 0).cycles * LENGTH;
  expect(playing(ctx)).toEqual(['map']);
  expect(source.loop).toBe(true);
  expect(source.stopAt).toBeCloseTo(play + 0.05);
  expect(source.out!.gain.events).toEqual([['set', 0, 0], ['ramp', 1, FADE_IN], ['set', 1, play - FADE_OUT], ['ramp', 0, play]]);
 });

 it('rests after the phrase, then plays the next one', async () => {
  const { ctx } = await director(), first = phrase('map', 0), second = phrase('map', 1);
  ctx.sources[0].finish();
  await pass(first.rest - 1);
  expect(playing(ctx)).toEqual(['map']);
  await pass(1);
  expect(playing(ctx)).toEqual(['map', 'map']);
  expect(ctx.sources[1].stopAt! - ctx.sources[1].started!).toBeCloseTo(second.cycles * LENGTH + 0.05);
 });

 it('does not start a resting theme over on every click or change of the game state', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  for (let i = 0; i < 5; i++) { d.unlock(); await d.music('map'); await pass(2); }
  expect(playing(ctx)).toEqual(['map']);
 });

 it('begins the battle theme with the battle and fades the map theme out', async () => {
  const { d, ctx } = await director();
  await pass(12);
  await d.music('battle');
  expect(playing(ctx)).toEqual(['map', 'battle']);
  expect(ctx.sources[0].stopAt).toBeCloseTo(12 + CROSSFADE + 0.05);
  expect(ctx.sources[0].out!.gain.events.at(-1)).toEqual(['ramp', 0, 12 + CROSSFADE]);
 });

 it('lets the map theme finish its rest when the battle is over', async () => {
  const { d, ctx } = await director();
  await pass(12);
  await d.music('battle');
  await pass(20);
  await d.music('map');
  expect(playing(ctx)).toEqual(['map', 'battle']);
  expect(ctx.sources[1].stopAt).toBeCloseTo(32 + CROSSFADE + 0.05);
  await pass(phrase('map', 0).rest - 20 - 1);
  expect(playing(ctx)).toEqual(['map', 'battle']);
  await pass(1);
  expect(playing(ctx)).toEqual(['map', 'battle', 'map']);
 });

 it('starts the battle theme at once even when the last battle has just ended', async () => {
  const { d, ctx } = await director('battle');
  await pass(8);
  await d.music('map');
  await pass(3);
  await d.music('battle');
  expect(playing(ctx)).toEqual(['battle', 'map', 'battle']);
 });

 it('keeps a long battle’s theme on the same schedule: phrase, rest, phrase', async () => {
  const { ctx } = await director('battle');
  ctx.sources[0].finish();
  await pass(phrase('battle', 0).rest - 1);
  expect(playing(ctx)).toEqual(['battle']);
  await pass(1);
  expect(playing(ctx)).toEqual(['battle', 'battle']);
 });

 it('plays at once for whoever turns the music on or moves its volume', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  await pass(5);
  d.update({ music: 0.6 });
  await pass(0);
  expect(playing(ctx)).toEqual(['map', 'map']);
  d.update({ muted: true });
  expect(ctx.sources[1].stopAt).toBeDefined();
  await pass(3);
  d.update({ muted: false });
  await pass(0);
  expect(playing(ctx)).toEqual(['map', 'map', 'map']);
 });

 it('stays silent while muted, through the end of a rest too', async () => {
  const { d, ctx } = await director();
  d.update({ muted: true });
  await pass(300);
  expect(playing(ctx)).toEqual(['map']);
  d.update({ voices: false });
  await pass(0);
  expect(playing(ctx)).toEqual(['map']);
 });

 it('waits in a hidden tab and returns when the tab is shown again', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  d.suspend(true);
  await vi.advanceTimersByTimeAsync(600_000);
  expect(playing(ctx)).toEqual(['map']);
  d.suspend(false);
  await vi.advanceTimersByTimeAsync(0);
  expect(playing(ctx)).toEqual(['map', 'map']);
 });

 it('starts afresh when a new campaign is laid out', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  d.silence();
  await d.music('map');
  expect(playing(ctx)).toEqual(['map', 'map']);
  expect(ctx.sources[1].stopAt! - ctx.sources[1].started!).toBeCloseTo(phrase('map', 0).cycles * LENGTH + 0.05);
 });
});
