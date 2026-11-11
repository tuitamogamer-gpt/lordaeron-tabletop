// @vitest-environment jsdom
import { existsSync, readFileSync, statSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioDirector, CROSSFADE, FADE_IN, FADE_OUT, LOOP, phrase, scene, theme, THEMES, type Track } from '../src/campaign/audio';

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
 buffer?: { duration: number; url: string }; loop = false; loopStart = 0; loopEnd = 0; out?: FakeGain;
 started?: number; offset?: number; stopAt?: number; onended?: () => void;
 constructor(private ctx: FakeContext) {}
 connect(node: FakeGain) { this.out = node; }
 start(at = this.ctx.currentTime, offset = 0) { this.started = at; this.offset = offset; this.ctx.sources.push(this); }
 stop(at = this.ctx.currentTime) { this.stopAt = at; }
 /** The theme this source plays, by its file name. */
 get theme() { return this.buffer!.url.match(/themes\/([\w-]+)\.mp3/)![1]; }
 /** The browser ends a source at its scheduled stop. */
 finish() { this.ctx.currentTime = this.stopAt!; this.onended?.(); }
}
class FakeContext {
 static last: FakeContext;
 currentTime = 0; state = 'running'; destination = {}; sources: FakeSource[] = [];
 constructor() { FakeContext.last = this; }
 createGain() { return new FakeGain(); }
 createBufferSource() { return new FakeSource(this); }
 decodeAudioData(data: ArrayBuffer) { return Promise.resolve({ duration: LOOP.period + 2 * LOOP.lead, url: new TextDecoder().decode(data) }); }
 resume() { this.state = 'running'; return Promise.resolve(); }
 suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

/** Themes whose file the stand-in server does not have. */
let missing: string[] = [];
beforeEach(() => {
 localStorage.clear(); missing = [];
 vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
 vi.stubGlobal('AudioContext', FakeContext);
 vi.stubGlobal('fetch', (url: string) => Promise.resolve({ ok: !missing.some(name => url.endsWith(`/${name}.mp3`)), arrayBuffer: () => Promise.resolve(new TextEncoder().encode(url).buffer) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

/** Lets time pass on the wall clock (rests and timers) and on the audio clock alike. */
const pass = async (seconds: number) => { FakeContext.last.currentTime += seconds; await vi.advanceTimersByTimeAsync(seconds * 1000); };
/** A director that begins each scene with the first theme of its list, already allowed to play. */
const director = async (track: Track = 'map', random = () => 0) => { const d = new AudioDirector(random); d.unlock(); await d.music(track); return { d, ctx: FakeContext.last }; };
const played = (ctx: FakeContext) => ctx.sources.map(s => s.theme);
const length = (s: FakeSource) => s.stopAt! - s.started!;

describe('the pacing of the music', () => {
 it('gives the map longer rests than a battle and does not pair a theme with the same phrase every time', () => {
  const of = (track: Track) => [0, 1, 2].map(n => phrase(track, n));
  expect(Math.min(...of('map').map(p => p.rest))).toBeGreaterThan(Math.max(...of('battle').map(p => p.rest)));
  expect(Math.max(...of('boss').map(p => p.rest))).toBeLessThanOrEqual(Math.max(...of('battle').map(p => p.rest)));
  for (const p of [...of('map'), ...of('battle'), ...of('boss')]) { expect(p.cycles).toBeGreaterThanOrEqual(3); expect(p.cycles).toBeLessThanOrEqual(6); expect(p.rest).toBeGreaterThanOrEqual(10); }
  expect(phrase('map', 3)).toEqual(phrase('map', 0));
  expect(THEMES.map.length % 3).not.toBe(0);
 });

 it('plays a phrase of a few cycles with a fade at each end instead of looping without end', async () => {
  const { ctx } = await director(), [source] = ctx.sources, play = phrase('map', 0).cycles * LOOP.period;
  expect(played(ctx)).toEqual(['map']);
  expect(length(source)).toBeCloseTo(play + 0.05);
  expect(source.out!.gain.events).toEqual([['set', 0, 0], ['ramp', 1, FADE_IN], ['set', 1, play - FADE_OUT], ['ramp', 0, play]]);
 });

 it('loops between the marks inside the file, where the music is continuous on both sides', async () => {
  const { ctx } = await director(), [source] = ctx.sources;
  expect(source.loop).toBe(true);
  expect([source.loopStart, source.loopEnd]).toEqual([LOOP.lead, LOOP.lead + LOOP.period]);
  expect(source.offset).toBe(LOOP.lead);
  expect(LOOP.lead).toBeGreaterThanOrEqual(0.1);
 });

 it('rests after the phrase, then plays the next theme', async () => {
  const { ctx } = await director(), first = phrase('map', 0), second = phrase('map', 1);
  ctx.sources[0].finish();
  await pass(first.rest - 1);
  expect(played(ctx)).toEqual(['map']);
  await pass(1);
  expect(played(ctx)).toEqual(['map', 'map-road']);
  expect(length(ctx.sources[1])).toBeCloseTo(second.cycles * LOOP.period + 0.05);
 });

 it('plays every theme of the map before one returns', async () => {
  const { ctx } = await director();
  for (let n = 0; n < THEMES.map.length; n++) { ctx.sources[n].finish(); await pass(phrase('map', n).rest); }
  expect(played(ctx)).toEqual([...THEMES.map, THEMES.map[0]]);
  expect(new Set(THEMES.map).size).toBe(THEMES.map.length);
 });

 it('begins a session with a theme picked by chance, except a boss fight', async () => {
  expect(played((await director('map', () => 0.6)).ctx)).toEqual([THEMES.map[2]]);
  expect(played((await director('battle', () => 0.6)).ctx)).toEqual([THEMES.battle[1]]);
  expect(played((await director('map', () => 0.9999)).ctx)).toEqual([THEMES.map.at(-1)]);
  expect(played((await director('boss', () => 0.9999)).ctx)).toEqual(['boss']);
  expect(theme('map', 3, 2)).toBe(THEMES.map[1]);
 });

 it('does not start resting music over on every click or change of the game state', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  for (let i = 0; i < 5; i++) { d.unlock(); await d.music('map'); await pass(2); }
  expect(played(ctx)).toEqual(['map']);
 });

 it('begins the battle music with the battle and fades the map theme out', async () => {
  const { d, ctx } = await director();
  await pass(12);
  await d.music('battle');
  expect(played(ctx)).toEqual(['map', 'battle']);
  expect(ctx.sources[0].stopAt).toBeCloseTo(12 + CROSSFADE + 0.05);
  expect(ctx.sources[0].out!.gain.events.at(-1)).toEqual(['ramp', 0, 12 + CROSSFADE]);
 });

 it('lets the map finish its rest when the battle is over, then moves on to its next theme', async () => {
  const { d, ctx } = await director();
  await pass(12);
  await d.music('battle');
  await pass(20);
  await d.music('map');
  expect(played(ctx)).toEqual(['map', 'battle']);
  expect(ctx.sources[1].stopAt).toBeCloseTo(32 + CROSSFADE + 0.05);
  await pass(phrase('map', 0).rest - 20 - 1);
  expect(played(ctx)).toEqual(['map', 'battle']);
  await pass(1);
  expect(played(ctx)).toEqual(['map', 'battle', 'map-road']);
 });

 it('starts the next battle at once, with the other battle theme', async () => {
  const { d, ctx } = await director('battle');
  await pass(8);
  await d.music('map');
  await pass(3);
  await d.music('battle');
  expect(played(ctx)).toEqual(['battle', 'map', 'battle-charge']);
 });

 it('keeps a long battle on the same schedule: phrase, rest, next theme', async () => {
  const { ctx } = await director('battle');
  ctx.sources[0].finish();
  await pass(phrase('battle', 0).rest - 1);
  expect(played(ctx)).toEqual(['battle']);
  await pass(1);
  expect(played(ctx)).toEqual(['battle', 'battle-charge']);
 });

 it('opens every boss fight with the boss theme', async () => {
  const { d, ctx } = await director('boss');
  await pass(30);
  await d.music('map');
  await pass(5);
  await d.music('boss');
  expect(played(ctx)).toEqual(['boss', 'map', 'boss']);
  expect(THEMES.boss[0]).toBe('boss');
 });

 it('alternates the boss theme with a battle theme through a long boss fight', async () => {
  const { ctx } = await director('boss');
  for (let n = 0; n < 2; n++) { ctx.sources[n].finish(); await pass(phrase('boss', n).rest); }
  expect(played(ctx)).toEqual(['boss', 'battle', 'boss']);
 });

 it('knows the scene from the table: the map, a battle, a battle against a boss', () => {
  expect(scene({ phase: 'actions' })).toBe('map');
  expect(scene({ phase: 'reward', battle: { boss: 'kelthuzad' } as never })).toBe('map');
  expect(scene({ phase: 'combat', battle: { enemies: ['e1'] } as never })).toBe('battle');
  expect(scene({ phase: 'combat', battle: { boss: 'kelthuzad' } as never })).toBe('boss');
  expect(scene({ phase: 'combat', battle: { boss: 'event-7' } as never })).toBe('boss');
 });

 it('gives a theme that cannot be loaded no phrase and goes on to the next', async () => {
  missing = ['map-road'];
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  await pass(phrase('map', 0).rest);
  expect(played(ctx)).toEqual(['map']);
  await d.music('map');
  expect(played(ctx)).toEqual(['map', 'map-blight']);
 });

 it('plays at once for whoever turns the music on or moves its volume', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  await pass(5);
  d.update({ music: 0.6 });
  await pass(0);
  expect(played(ctx)).toEqual(['map', 'map-road']);
  d.update({ muted: true });
  expect(ctx.sources[1].stopAt).toBeDefined();
  await pass(3);
  d.update({ muted: false });
  await pass(0);
  expect(played(ctx)).toEqual(['map', 'map-road', 'map-blight']);
 });

 it('stays silent while muted, through the end of a rest too', async () => {
  const { d, ctx } = await director();
  d.update({ muted: true });
  await pass(300);
  expect(played(ctx)).toEqual(['map']);
  d.update({ voices: false });
  await pass(0);
  expect(played(ctx)).toEqual(['map']);
 });

 it('waits in a hidden tab and returns when the tab is shown again', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  d.suspend(true);
  await vi.advanceTimersByTimeAsync(600_000);
  expect(played(ctx)).toEqual(['map']);
  d.suspend(false);
  await vi.advanceTimersByTimeAsync(0);
  expect(played(ctx)).toEqual(['map', 'map-road']);
 });

 it('starts afresh when a new campaign is laid out', async () => {
  const { d, ctx } = await director();
  ctx.sources[0].finish();
  d.silence();
  await d.music('map');
  expect(played(ctx)).toEqual(['map', 'map']);
  expect(length(ctx.sources[1])).toBeCloseTo(phrase('map', 0).cycles * LOOP.period + 0.05);
 });
});

describe('the music files', () => {
 const names = [...new Set(Object.values(THEMES).flat())];

 it('has a file for every theme, and no theme twice in a scene', () => {
  for (const name of names) {
   const file = `public/assets/audio/themes/${name}.mp3`;
   expect(existsSync(file), file).toBe(true);
   expect(statSync(file).size).toBeGreaterThan(100_000);
  }
  for (const list of Object.values(THEMES)) expect(new Set(list).size).toBe(list.length);
  expect(names).toHaveLength(7);
 });

 it('loops them over the period and the lead the preparation script writes', () => {
  const script = readFileSync('scripts/prepare-audio.py', 'utf8');
  const [, clip, fade] = script.match(/^LOOP, FADE = ([\d.]+), ([\d.]+)$/m)!, [, lead] = script.match(/^PERIOD, LEAD = LOOP - FADE, ([\d.]+)$/m)!;
  expect(LOOP.period).toBeCloseTo(Number(clip) - Number(fade));
  expect(LOOP.lead).toBe(Number(lead));
 });
});
