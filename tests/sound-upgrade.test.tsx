// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AMBIENCE, AudioDirector, audio, battleOutcome, cues, pick, pressable, SFX_TAKES, SoundControls, VOICES } from '../src/campaign/audio';
import { actionCue, setupBeats, STAGED_VOICES } from '../src/campaign/stage';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import type { Command } from '../src/rules/model';
import { view, type GameView } from '../src/rules/view';

/**
 * The sound pass of 21. 11. 2026 (docs/SOUND-2026-11-21.md): recordings from Fish Audio's sound effect library where the browser
 * used to make a sound up, several takes of the blows of a fight, a bed of wind and birdsong on the map, a click for the
 * table's buttons, and thirty new voice lines for the moments that had none.
 */
const start = () => view(createGame(p, DEFAULT_SETUP));
const step = (v: GameView, change: (n: GameView) => void, by = 1) => { const n = structuredClone(v); n.revision = v.revision + by; change(n); return n; };
const battle = (participants: string[], more: Record<string, unknown> = {}) => ({ kind: 'pve', region: 'brill', participants, defeated: [], enemies: [], round: 1, stage: 'attacker', ...more }) as unknown as NonNullable<GameView['battle']>;
const hordeOf = (v: GameView) => v.heroes.filter(h => faction(p, h.id) === 'horde').map(h => h.id), allianceOf = (v: GameView) => v.heroes.filter(h => faction(p, h.id) === 'alliance').map(h => h.id);

describe('who is heard when a fight begins', () => {
 it('is the herald for a character who fights alone every other time, and the side’s cry otherwise', () => {
  const a = start(), [warrior] = hordeOf(a), classId = p.characters.find(c => c.id === warrior)!.classId;
  // An even revision: the herald names the class. An odd one: the battle cry, as before.
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([warrior]); }, 2)))).toEqual({ sfx: 'sword', voice: `class-${classId}-horde` });
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([warrior]); }, 1)))).toEqual({ sfx: 'sword', voice: 'horde' });
  // A party always has its cry: the herald speaks of one character.
  expect(pick(cues(p, a, step(a, n => { n.battle = battle(hordeOf(a).slice(0, 2)); }, 2)))).toEqual({ sfx: 'sword', voice: 'horde' });
 });
 it('has a herald’s line for every character in the box, in the voice of that character’s faction', () => {
  for (const c of p.characters) expect(VOICES, c.name).toHaveProperty(`class-${c.classId}-${c.faction}`);
  // Sixteen characters: eight classes on each side (the Shaman is the Horde’s, the Paladin the Alliance’s).
  expect(Object.keys(VOICES).filter(v => v.startsWith('class-'))).toHaveLength(16);
 });
 it('announces a fight between the factions every other time, and the final battle always', () => {
  const a = start(), both = [hordeOf(a)[0], allianceOf(a)[0]];
  expect(pick(cues(p, a, step(a, n => { n.battle = battle(both, { kind: 'pvp' }); }, 2))).voice).toBe('pvp');
  expect(pick(cues(p, a, step(a, n => { n.battle = battle(both, { kind: 'pvp' }); }, 1))).voice).toBe('horde');
  for (const by of [1, 2]) expect(pick(cues(p, a, step(a, n => { n.battle = battle(a.heroes.map(h => h.id), { kind: 'final' }); }, by))).voice).toBe('final-battle');
 });
 it('announces the last preparation with a fanfare, also when the table announces nothing', () => {
  const a = start();
  expect(pick(cues(p, a, step(a, n => { n.phase = 'final-management'; })))).toEqual({ sfx: 'fanfare', voice: 'final-prep' });
  // With the stage on, its banner says the line: it is not said twice.
  expect(STAGED_VOICES).toContain('final-prep');
 });
});

describe('how a fight and a campaign end', () => {
 it('gives a world boss that falls its own line, and any other won fight the usual one', () => {
  const boss = p.events.find(e => e.boss)!, a = start(), [warrior] = hordeOf(a);
  const over = (more: Record<string, unknown>) => ({ battle: battle([warrior], { stage: 'over', first: 'horde', winner: 'horde', ...more }), winner: undefined });
  expect(battleOutcome(p, over({ boss: boss.id }))).toEqual([{ stinger: 'triumph', voice: 'boss-slain' }]);
  expect(battleOutcome(p, over({}))).toEqual([{ stinger: 'triumph', voice: 'battle-won' }]);
 });
 it('puts a cheering crowd under the winner’s fanfare, and none under a draw', () => {
  const a = start();
  expect(pick(cues(p, a, step(a, n => { n.winner = 'horde'; n.phase = 'finished'; })))).toEqual({ sfx: ['victory', 'cheer'], voice: 'victory-horde' });
  expect(pick(cues(p, a, step(a, n => { n.winner = 'draw'; n.phase = 'finished'; }))).sfx).toBe('victory');
 });
});

describe('the sound of what changes hands', () => {
 const acted = () => apply(p, createGame(p, DEFAULT_SETUP), { type: 'rest', hero: DEFAULT_SETUP.roster[0], health: 0 });
 it('is coins and a word for a trade, and nothing for a trade that moves nothing', () => {
  const s = acted(), [a, b] = hordeOf(view(s));
  const trade: Command = { type: 'trade', hero: a, to: b, items: [], receiveItems: [], gold: 1, receiveGold: 0 }, empty: Command = { ...trade, gold: 0 };
  expect(actionCue(p, view(s), view(apply(p, s, trade)), trade)).toEqual({ sfx: 'coins', voice: 'trade' });
  expect(actionCue(p, view(s), view(apply(p, s, empty)), empty)).toBeUndefined();
 });
 it('is a page and a word for an item handed out', () => {
  const s = view(createGame(p, DEFAULT_SETUP)), hero = s.heroes[0].id;
  expect(actionCue(p, s, step(s, () => {}), { type: 'reward', hero, card: 'any' })).toEqual({ stinger: 'page', voice: 'spoils' });
  expect(actionCue(p, s, step(s, () => {}), { type: 'talent', hero, card: 'any' })).toEqual({ stinger: 'page' });
 });
});

describe('the table laid out', () => {
 it('is announced once, over the first faction’s quests', () => {
  const s = createGame(p, DEFAULT_SETUP), heads = setupBeats(p, s).filter(b => b.kind === 'deploy' && !b.quest);
  expect(heads.map(b => b.cue)).toEqual([{ stinger: 'horn', voice: 'setup' }, { stinger: 'horn' }]);
 });
});

/** A stand-in audio context that records what is started, looped and stopped. */
class FakeParam { value = 1; setTargetAtTime() {} setValueAtTime(v: number) { this.value = v; } linearRampToValueAtTime(v: number) { this.value = v; } cancelScheduledValues() {} }
class FakeGain { gain = new FakeParam(); connect() {} }
class FakeSource {
 buffer?: { duration: number; url: string }; playbackRate = new FakeParam(); loop = false; loopStart = 0; loopEnd = 0; started?: number; stopped = false;
 constructor(private ctx: FakeContext) {}
 connect() {} start(at = 0) { this.started = at; this.ctx.sources.push(this); } stop() { this.stopped = true; }
 get file() { return this.buffer!.url.match(/audio\/(.+)\.mp3/)![1]; }
}
class FakeContext {
 static last: FakeContext;
 currentTime = 0; state = 'running'; destination = {}; sources: FakeSource[] = [];
 constructor() { FakeContext.last = this; }
 createGain() { return new FakeGain(); } createBufferSource() { return new FakeSource(this); }
 decodeAudioData(data: ArrayBuffer) { return Promise.resolve({ duration: 2, url: new TextDecoder().decode(data) }); }
 resume() { return Promise.resolve(); }
}
describe('the director', () => {
 beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('fetch', (url: string) => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(url).buffer) }));
 });
 afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
 const pass = async (seconds: number) => { FakeContext.last.currentTime += seconds; await vi.advanceTimersByTimeAsync(seconds * 1000); };
 const settle = () => vi.advanceTimersByTimeAsync(0);
 const director = () => { const d = new AudioDirector(() => 0); d.unlock(); return { d, ctx: FakeContext.last }; };

 it('plays the takes of an effect in turn', async () => {
  const { d, ctx } = director();
  for (let i = 0; i < 4; i++) { await d.play('sfx', 'spell'); await pass(1); }
  for (let i = 0; i < 3; i++) { await d.play('sfx', 'hurt'); await pass(1); }
  expect(ctx.sources.map(s => s.file)).toEqual(['sfx/spell', 'sfx/spell-2', 'sfx/spell-3', 'sfx/spell', 'sfx/hurt', 'sfx/hurt-2', 'sfx/hurt']);
  expect(SFX_TAKES).toEqual({ hit: 3, hurt: 2, block: 2, spell: 3, clash: 3 });
 });
 it('plays every effect a cue names, with its voice', async () => {
  const { d, ctx } = director();
  d.cue({ sfx: ['bell', 'coins'], voice: 'town' }); await settle();
  expect(ctx.sources.map(s => s.file).sort()).toEqual(['sfx/bell', 'sfx/coins', 'voice/town']);
 });
 it('lays wind and birdsong under the map as one loop, and takes it away in a fight', async () => {
  const { d, ctx } = director();
  await d.ambience(true); await settle();
  const [bed] = ctx.sources;
  expect(bed).toMatchObject({ file: `themes/${AMBIENCE.file}`, loop: true, loopStart: AMBIENCE.lead, loopEnd: AMBIENCE.lead + AMBIENCE.period, started: 0, stopped: false });
  // Asked for again, it is the same loop: nothing new starts.
  await d.ambience(true); await settle();
  expect(ctx.sources).toHaveLength(1);
  await d.ambience(false);
  expect(bed.stopped).toBe(true);
 });
 it('leaves the ambience out when its setting is off, and brings it back when it is turned on on the map', async () => {
  const { d, ctx } = director();
  d.update({ ambience: false });
  await d.ambience(true); await settle();
  expect(ctx.sources).toHaveLength(0);
  d.update({ ambience: true }); await settle();
  expect(ctx.sources.map(s => s.file)).toEqual([`themes/${AMBIENCE.file}`]);
  // Sound off altogether takes it away as well.
  d.update({ muted: true }); await settle();
  expect(ctx.sources[0].stopped).toBe(true);
 });
});

describe('the table’s buttons', () => {
 afterEach(cleanup);
 it('answer with a click: a button, a tab, an option; not a disabled one, and not the page itself', () => {
  render(<div><button>Go</button><button disabled>No</button><button aria-disabled="true">Nor this</button><div role="tab">Tab</div><p>Text <b>bold</b></p><button><span>Inside</span></button></div>);
  expect(pressable(screen.getByText('Go'))).toBe(true);
  expect(pressable(screen.getByText('Inside'))).toBe(true);
  expect(pressable(screen.getByText('Tab'))).toBe(true);
  expect(pressable(screen.getByText('No'))).toBe(false);
  expect(pressable(screen.getByText('Nor this'))).toBe(false);
  expect(pressable(screen.getByText('bold'))).toBe(false);
  expect(pressable(null)).toBe(false);
 });
});

describe('the sound settings', () => {
 afterEach(() => { cleanup(); vi.restoreAllMocks(); });
 it('offer the map’s ambience as its own choice', () => {
  const update = vi.spyOn(audio, 'update').mockImplementation(() => {}); vi.spyOn(audio, 'unlock').mockImplementation(() => {});
  render(<SoundControls />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ambience on the map (wind and birdsong)' }));
  expect(update).toHaveBeenCalledExactlyOnceWith({ ambience: !audio.settings.ambience });
 });
});
