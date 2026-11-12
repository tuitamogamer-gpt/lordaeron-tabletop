// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { audio } from '../src/campaign/audio';
import Stage, { holdOf, MIN_HOLD } from '../src/campaign/Stage';
import { beats, loadPace, PACES, savePace, STAGED_VOICES, type Beat } from '../src/campaign/stage';
import { STINGERS } from '../src/campaign/stingers';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction, hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { newSession } from '../src/rules/session';
import type { Command } from '../src/rules/model';

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall';
beforeEach(() => {
 localStorage.clear(); window.scrollTo = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/** Plays passes and empty management until the next command turns an Event card over; returns the table just before it. */
function untilEvent(seed = 2005) {
 let s = createGame(p, { ...DEFAULT_SETUP, seed }); const commands: Command[] = [];
 for (let guard = 0; guard < 2000; guard++) {
  const legal = legalActions(p, s), acting = s.heroes.find(h => faction(p, h.id) === s.faction && h.actions > 0);
  const c: Command = s.phase === 'actions' ? acting ? { type: 'travel', hero: acting.id, path: [] } : { type: 'endActions' }
   : legal.find(c => c.type === 'endManagement') ?? legal.find(c => c.type === 'manage') ?? legal[0];
  const next = apply(p, s, c);
  if (next.eventDiscard.length > s.eventDiscard.length) return { before: s, after: next, command: c, commands };
  s = next; commands.push(c);
 }
 throw new Error('no Event card was drawn');
}
const kinds = (list: Beat[]) => list.map(b => b.kind);

describe('what the stage announces', () => {
 it('turns the Event card over first and hands the turn over last', () => {
  const { before, after, command } = untilEvent(), list = beats(p, before, after, command, false);
  expect(kinds(list)).toEqual(['event', 'turn']);
  const [event, turn] = list, drawn = p.events.find(e => e.id === after.eventDiscard.at(-1))!;
  expect(event).toMatchObject({ size: 'card', title: drawn.name, eyebrow: 'Event card · end of the Horde’s turn', art: { kind: 'event', id: drawn.id }, cue: { sfx: 'card', voice: 'event-war', stinger: 'wardrums' } });
  expect(event.lines[0]).toContain('Occupy Ambermill and Shining Strand');
  expect(event.hold).toBeGreaterThan(turn.hold);
  expect(turn).toMatchObject({ size: 'banner', title: 'Alliance · turn 4', art: { kind: 'faction', id: 'alliance' }, cue: { voice: 'turn-alliance', stinger: 'horn' } });
  expect(new Set(list.map(b => b.id)).size).toBe(list.length);
 });
 it('says that a decision follows an Event card which asks for one', () => {
  const { before, after, command } = untilEvent(7), [event] = beats(p, before, after, command, false);
  expect(after.eventFlow?.steps.length).toBeGreaterThan(0);
  expect(event).toMatchObject({ kind: 'event', title: 'Professions and Crafts' });
  expect(event.lines.at(-1)).toBe('A decision follows.');
  // The turn is not handed over while the Event waits for its decisions.
  expect(kinds(beats(p, before, after, command, false))).toEqual(['event']);
 });
 it('announces a bot’s journey with its way, and leaves a player’s own journey unannounced', () => {
  const s = createGame(p, DEFAULT_SETUP), c = legalActions(p, s).find((c): c is Extract<Command, { type: 'travel' }> => c.type === 'travel' && c.hero === MAGE && c.path.length === 2 && !c.power)!;
  const next = apply(p, s, c), [beat] = beats(p, s, next, c, true), to = p.regions.find(r => r.id === c.path[1])!.name, via = p.regions.find(r => r.id === c.path[0])!.name;
  expect(beat).toMatchObject({ kind: 'travel', size: 'banner', title: `Sofeea travels to ${to}`, region: c.path[1], from: 'brill', path: c.path, art: { kind: 'hero', id: MAGE }, cue: { stinger: 'steps' } });
  expect(beat.lines[0]).toBe(`Through ${via}.`);
  expect(beats(p, s, next, c, false)).toEqual([]);
 });
 it('announces a pass, a rest and a training in the bot’s own words', () => {
  const s = createGame(p, DEFAULT_SETUP); hero(s, MAGE).health = 1; hero(s, MAGE).energy = 0;
  const pass: Command = { type: 'travel', hero: MAGE, path: [] };
  expect(beats(p, s, apply(p, s, pass), pass, true)[0]).toMatchObject({ kind: 'pass', title: 'Sofeea passes' });
  const rest = legalActions(p, s).filter((c): c is Extract<Command, { type: 'rest' }> => c.type === 'rest' && c.hero === MAGE && !c.food).at(-1)!;
  const rested = apply(p, s, rest), [beat] = beats(p, s, rested, rest, true);
  expect(beat).toMatchObject({ kind: 'rest', title: 'Sofeea rests', cue: { stinger: 'heal' } });
  expect(beat.lines[0]).toBe([`+${hero(rested, MAGE).health - 1} health`, `+${hero(rested, MAGE).energy} energy`].filter(text => !text.startsWith('+0')).join(' · '));
  const train = legalActions(p, s).find((c): c is Extract<Command, { type: 'train' }> => c.type === 'train' && c.hero === WARRIOR && c.cards.length === 1 && c.cards[0] === 'warrior-heroic-strike')!;
  // What was learned is shown as the card itself, in the middle of the table.
  expect(beats(p, s, apply(p, s, train), train, true)[0]).toMatchObject({ kind: 'train', size: 'card', art: { kind: 'card', id: 'warrior-heroic-strike' }, title: 'Grumbaz trains', lines: ['Learns Heroic Strike for 3 gold.'], cue: { stinger: 'page', voice: 'train' } });
 });
 it('shows what a bot takes as the card itself: a quest reward with what else was offered, a talent, a purchase', () => {
  const s = createGame(p, DEFAULT_SETUP), items = p.cards.filter(c => c.kind === 'item' && !c.printed), [taken, left, dropped] = items;
  // A quest reward: two cards lie face up, the mage takes one and makes room for it.
  const offered = { ...s, phase: 'reward' as const, reward: { faction: 'horde' as const, eligible: [MAGE], items: [], special: [], offered: [taken.id, left.id], replacement: true } };
  const claim: Command = { type: 'reward', hero: MAGE, card: taken.id, discard: dropped.id }, claimed = { ...structuredClone(offered), revision: s.revision + 1 };
  const [reward] = beats(p, offered, claimed, claim, true);
  expect(reward).toMatchObject({ kind: 'loot', size: 'card', eyebrow: 'Horde · Quest reward', title: `Sofeea takes ${taken.name}`, art: { kind: 'card', id: taken.id }, cue: { stinger: 'page' } });
  expect(reward.lines.slice(1)).toEqual([`Also offered: ${left.name}, returned to its deck.`, `${dropped.name} is discarded to make room in the bag.`]);
  expect(reward.hold).toBeGreaterThanOrEqual(4000);
  // The only card offered: nothing else to mention.
  expect(beats(p, { ...offered, reward: { ...offered.reward, offered: [taken.id] } }, claimed, { type: 'reward', hero: MAGE, card: taken.id }, true)[0].lines).toHaveLength(1);
  // The player's own claim is not announced back to him.
  expect(beats(p, offered, claimed, claim, false)).toEqual([]);
  // A talent.
  const talent = p.cards.find(c => c.kind === 'talent' && c.classId === 'mage')!, learned = { ...structuredClone(s), revision: s.revision + 1 };
  expect(beats(p, s, learned, { type: 'talent', hero: MAGE, card: talent.id }, true)[0]).toMatchObject({ kind: 'talent', size: 'card', title: `Sofeea learns ${talent.name}`, art: { kind: 'card', id: talent.id }, lines: [`level ${talent.level} talent, kept for the rest of the campaign.`] });
  // A purchase in town shows the card bought; a visit that only sells or recovers stays a banner.
  const bought: Command = { type: 'town', hero: MAGE, health: 0, operations: [{ op: 'sell', card: dropped.id }, { op: 'buy', card: taken.id }] };
  expect(beats(p, s, learned, bought, true)[0]).toMatchObject({ kind: 'town', size: 'card', art: { kind: 'card', id: taken.id }, lines: [`sells ${dropped.name} · buys ${taken.name}`] });
  expect(beats(p, s, learned, { type: 'town', hero: MAGE, health: 0, operations: [{ op: 'sell', card: dropped.id }] }, true)[0]).toMatchObject({ kind: 'town', size: 'banner', art: { kind: 'hero', id: MAGE } });
 });
 it('announces the spoils a bot takes from a defeated character, and who won an auction', () => {
  const s = createGame(p, DEFAULT_SETUP), item = p.cards.find(c => c.kind === 'item' && !c.printed)!;
  // Inside a combat nothing else is announced here: the combat window shows the rest.
  const fought = { ...s, phase: 'combat' as const }, after = { ...structuredClone(fought), revision: s.revision + 1 };
  const loot: Command = { type: 'loot', hero: MAGE, from: 'brandon-lightstone', card: item.id };
  expect(beats(p, fought, after, loot, true)).toMatchObject([{ kind: 'loot', size: 'card', eyebrow: 'Horde · Spoils of the battle', title: `Sofeea takes ${item.name} from Brandon`, art: { kind: 'card', id: item.id } }]);
  expect(beats(p, fought, after, loot, false)).toEqual([]);
  expect(beats(p, fought, after, { type: 'attacker', hero: MAGE }, true)).toEqual([]);
  // The bids were sealed: the result is news to everyone, the player included.
  const bidding = { ...s, auction: { item: item.id } }, sold = { ...structuredClone(s), revision: s.revision + 1 };
  sold.log.push({ id: (s.log.at(-1)?.id ?? 0) + 1, turn: s.turn, text: `Sofeea Icecall wins the auction for ${item.name} with 7 gold.` });
  expect(beats(p, bidding, sold, { type: 'bid', hero: WARRIOR, amount: 2 }, false)).toMatchObject([{ kind: 'loot', size: 'card', eyebrow: 'Auction house', title: `Sofeea wins ${item.name}`, lines: ['For 7 gold. The other bidders pay nothing.'], art: { kind: 'card', id: item.id } }]);
 });
 it('announces a bot’s challenge before the combat opens, and nothing while the combat runs', () => {
  let s = createGame(p, DEFAULT_SETUP);
  s = apply(p, s, { type: 'travel', hero: WARRIOR, path: ['brightwater'] });
  const challenge = legalActions(p, s).find((c): c is Extract<Command, { type: 'challenge' }> => c.type === 'challenge' && c.hero === WARRIOR && !c.allies.length)!;
  const fighting = apply(p, s, challenge), [beat] = beats(p, s, fighting, challenge, true);
  expect(beat).toMatchObject({ kind: 'challenge', title: 'Grumbaz challenges the Crusader', lines: ['In Brightwater Lake.'], region: 'brightwater' });
  const attacking = apply(p, fighting, { type: 'attacker', hero: WARRIOR });
  expect(beats(p, fighting, attacking, { type: 'attacker', hero: WARRIOR }, true)).toEqual([]);
 });
 it('shows a finished quest, a new level and a new quest as steps of their own', () => {
  const s = createGame(p, DEFAULT_SETUP), next = structuredClone(s);
  const done = next.quests.find(id => p.quests.find(q => q.id === id)?.faction === 'horde')!, fresh = p.quests.find(q => q.faction === 'horde' && q.tier === 'green' && !next.quests.includes(q.id))!;
  next.revision++; next.completed.push(done); next.quests = [...next.quests.filter(id => id !== done), fresh.id]; hero(next, WARRIOR).level = 2;
  const list = beats(p, s, next, undefined, false);
  expect(kinds(list)).toEqual(['quest-done', 'level', 'new-quest']);
  expect(list[0]).toMatchObject({ size: 'card', title: p.quests.find(q => q.id === done)!.name, art: { kind: 'quest', id: done }, cue: { voice: 'quest' } });
  expect(list[1]).toMatchObject({ title: 'Grumbaz reaches level 2', cue: { sfx: 'levelup', voice: 'level' } });
  expect(list[2]).toMatchObject({ size: 'card', title: fresh.name, eyebrow: 'New Horde quest · green', cue: { sfx: 'card', voice: 'new-quest' } });
  expect(list[2].lines[1]).toMatch(/^Creatures appear in /);
 });
 it('says what a bot answers to an Event card that asks each character in turn', () => {
  // Professions and Crafts: skip, take gold, or recover.
  const { after } = untilEvent(7), asked = after.eventFlow!.steps[0].hero, name = p.characters.find(c => c.id === asked)!.name.split(' ')[0];
  const gold: Command = { type: 'event-choice', hero: asked, choice: { mode: 'gold' } }, paid = apply(p, after, gold), gained = hero(paid, asked).gold - hero(after, asked).gold;
  expect(gained).toBeGreaterThan(0);
  expect(beats(p, after, paid, gold, true)[0]).toMatchObject({ kind: 'choice', size: 'banner', eyebrow: 'Alliance · Professions and Crafts', title: `${name} takes the gold`, lines: [`+${gained} gold`], art: { kind: 'hero', id: asked } });
  const skip: Command = { type: 'event-choice', hero: asked, choice: { mode: 'skip' } };
  expect(beats(p, after, apply(p, after, skip), skip, true)[0]).toMatchObject({ kind: 'choice', title: `${name} declines`, lines: [] });
  // The player's own answer is not announced back to him.
  expect(beats(p, after, paid, gold, false).filter(b => b.kind === 'choice')).toEqual([]);
 });
 it('stays silent for a change that is not a step forward', () => {
  const s = createGame(p, DEFAULT_SETUP), c: Command = { type: 'travel', hero: MAGE, path: [] }, next = apply(p, s, c);
  expect(beats(p, undefined, s, undefined, true)).toEqual([]);
  expect(beats(p, s, s, c, true)).toEqual([]);
  expect(beats(p, next, s, c, true)).toEqual([]);
  expect(beats(p, { ...s, revision: next.revision - 40 }, next, c, true)).toEqual([]);
 });
 it('leaves to the stage exactly the voices it plays itself', () => {
  const played = new Set<string>(), s = createGame(p, DEFAULT_SETUP), { before, after, command } = untilEvent();
  for (const b of beats(p, before, after, command, false)) if (b.cue.voice) played.add(b.cue.voice);
  const next = structuredClone(s); next.revision++; next.completed.push(next.quests[0]); next.quests = [...next.quests.slice(1), p.quests.find(q => !next.quests.includes(q.id))!.id]; hero(next, WARRIOR).level = 2;
  for (const b of beats(p, s, next, undefined, false)) if (b.cue.voice) played.add(b.cue.voice);
  expect([...played].sort()).toEqual(['event-war', 'level', 'new-quest', 'quest', 'turn-alliance']);
  expect([...played].every(voice => STAGED_VOICES.includes(voice as never))).toBe(true);
 });
});

describe('the pace of the table', () => {
 it('keeps the chosen pace, and announces nothing in tests unless asked', () => {
  expect(loadPace()).toBe('off');
  savePace('relaxed');
  expect(loadPace()).toBe('relaxed');
  localStorage.setItem('lordaeron-pace-v1', 'nonsense');
  expect(loadPace()).toBe('off');
  expect(PACES.map(v => v.id)).toEqual(['relaxed', 'normal', 'brisk', 'off']);
 });
 it('holds a step longer at a relaxed pace and never shorter than the minimum', () => {
  const beat = { hold: 2000 } as Beat;
  expect(holdOf(beat, 'normal')).toBe(2000);
  expect(holdOf(beat, 'relaxed')).toBe(3000);
  expect(holdOf(beat, 'brisk')).toBe(1100);
  expect(holdOf({ hold: 900 } as Beat, 'brisk')).toBe(MIN_HOLD);
 });
});

describe('the stage on screen', () => {
 const queue = () => { const { before, after, command } = untilEvent(); return beats(p, before, after, command, false); };
 it('shows one step at a time for its hold, with its sound, then the next', () => {
  vi.useFakeTimers();
  const play = vi.spyOn(audio, 'play').mockResolvedValue(undefined), stinger = vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  let list = queue(); const next = vi.fn(() => { list = list.slice(1); r.rerender(<Stage queue={list} pace="normal" next={next} clear={vi.fn()} />); });
  const r = render(<Stage queue={list} pace="normal" next={next} clear={vi.fn()} />);
  const stage = screen.getByRole('status', { name: 'What just happened at the table' });
  expect(stage.className).toContain('card');
  expect(screen.getByText('The Silverpine War')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'The Silverpine War card' })).toBeTruthy();
  expect(screen.getByText(/1 more/)).toBeTruthy();
  expect(play.mock.calls).toEqual([['sfx', 'card'], ['voice', 'event-war']]);
  expect(stinger).toHaveBeenCalledExactlyOnceWith('wardrums');
  act(() => { vi.advanceTimersByTime(list[0].hold - 1); });
  expect(next).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); });
  expect(next).toHaveBeenCalledOnce();
  expect(screen.getByText('Alliance · turn 4')).toBeTruthy();
  expect(screen.queryByText('The Silverpine War')).toBeNull();
  expect(play).toHaveBeenLastCalledWith('voice', 'turn-alliance');
  expect(stinger).toHaveBeenLastCalledWith('horn');
  act(() => { vi.advanceTimersByTime(list[0].hold); });
  expect(next).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('status', { name: 'What just happened at the table' })).toBeNull();
 });
 it('moves on at a click, at Space or Enter, and clears everything at Escape or Skip all', () => {
  vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  const next = vi.fn(), clear = vi.fn();
  render(<Stage queue={queue()} pace="normal" next={next} clear={clear} />);
  fireEvent.click(screen.getByRole('status', { name: 'What just happened at the table' }));
  fireEvent.keyDown(window, { key: ' ' }); fireEvent.keyDown(window, { key: 'Enter' });
  expect(next).toHaveBeenCalledTimes(3);
  fireEvent.keyDown(window, { key: 'a' });
  expect(next).toHaveBeenCalledTimes(3);
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Skip all' }));
  expect(clear).toHaveBeenCalledTimes(2);
  expect(next).toHaveBeenCalledTimes(3);
 });
 it('does not take Space away from a button that has the focus', () => {
  vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  const next = vi.fn();
  render(<><button>Travel</button><Stage queue={queue()} pace="normal" next={next} clear={vi.fn()} /></>);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Travel' }), { key: ' ' });
  expect(next).not.toHaveBeenCalled();
 });
 it('keeps a card up while the pointer rests on it', () => {
  vi.useFakeTimers(); vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  const list = queue(), next = vi.fn(), r = render(<Stage queue={list} pace="normal" next={next} clear={vi.fn()} />), card = r.container.querySelector('.stage-card')!;
  fireEvent.pointerEnter(card, { pointerType: 'mouse' });
  act(() => { vi.advanceTimersByTime(list[0].hold * 3); });
  expect(next).not.toHaveBeenCalled();
  expect(screen.getByText(/Held while you read/)).toBeTruthy();
  fireEvent.pointerLeave(card);
  act(() => { vi.advanceTimersByTime(list[0].hold); });
  expect(next).toHaveBeenCalledOnce();
 });
});

describe('the stage at a real table', () => {
 function seat(commands: Command[], seed = 2005) {
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, { ...DEFAULT_SETUP, seed }), commands }));
  localStorage.setItem('lordaeron-base-bots-v3', '[]');
  localStorage.setItem('lordaeron-pace-v1', 'normal');
 }
 const stage = () => screen.queryByRole('status', { name: 'What just happened at the table' });
 it('shows the Event card with its picture when the turn ends, then the next turn, and saves the game at once', async () => {
  const { commands, after } = untilEvent(); seat(commands);
  vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  await act(async () => { render(<Campaign />); });
  expect(stage()).toBeNull();
  vi.useFakeTimers();
  fireEvent.click(screen.getAllByRole('button', { name: /^End turn/ })[0]);
  // The game has moved and is saved; the stage only shows what happened.
  expect(JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands).toHaveLength(commands.length + 1);
  expect(stage()!.textContent).toContain('The Silverpine War');
  expect(screen.getByRole('img', { name: 'The Silverpine War card' })).toBeTruthy();
  const [event, turn] = beats(p, untilEvent().before, after, { type: 'endManagement' }, false);
  await act(async () => { vi.advanceTimersByTime(event.hold); });
  expect(stage()!.textContent).toContain('Alliance · turn 4');
  await act(async () => { vi.advanceTimersByTime(turn.hold); });
  expect(stage()).toBeNull();
 });
 it('lets the Event card be seen before its decision is asked', async () => {
  const { commands } = untilEvent(7); seat(commands, 7);
  vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {});
  await act(async () => { render(<Campaign />); });
  vi.useFakeTimers();
  fireEvent.click(screen.getAllByRole('button', { name: /^End turn/ })[0]);
  expect(stage()!.textContent).toContain('Professions and Crafts');
  expect(screen.queryByRole('dialog', { name: 'Professions and Crafts' })).toBeNull();
  // A click moves on: the decision opens with the card lying beside it.
  fireEvent.click(stage()!);
  expect(stage()).toBeNull();
  const decision = screen.getByRole('dialog', { name: 'Professions and Crafts' });
  expect(decision.querySelector('img.decision-event-card')!.getAttribute('alt')).toBe('Professions and Crafts event card');
 });
 it('announces nothing when the pace is off', async () => {
  const { commands } = untilEvent(); seat(commands); localStorage.setItem('lordaeron-pace-v1', 'off');
  await act(async () => { render(<Campaign />); });
  fireEvent.click(screen.getAllByRole('button', { name: /^End turn/ })[0]);
  expect(stage()).toBeNull();
 });
});

describe('the sounds made on the spot', () => {
 /** Counts what a recipe schedules, with the loudest gain it asks for. */
 function fakeContext() {
  const made = { oscillators: 0, noises: 0, started: 0, peak: 0, last: 0 };
  const param = () => ({ value: 0, setValueAtTime(_v: number, t: number) { made.last = Math.max(made.last, t); return this; }, linearRampToValueAtTime(_v: number, t: number) { made.last = Math.max(made.last, t); return this; }, exponentialRampToValueAtTime(_v: number, t: number) { made.last = Math.max(made.last, t); return this; } });
  const gainParam = () => { const base = param(); const note = (v: number, t: number) => { made.peak = Math.max(made.peak, v); made.last = Math.max(made.last, t); return base; }; return { ...base, setValueAtTime: note, linearRampToValueAtTime: note, exponentialRampToValueAtTime: note }; };
  const node = () => ({ connect: vi.fn(), start: () => { made.started++; }, stop: vi.fn() });
  const ctx = {
   sampleRate: 8000,
   createOscillator: () => { made.oscillators++; return { ...node(), type: 'sine', frequency: param() }; },
   createGain: () => ({ ...node(), gain: gainParam() }),
   createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param(), Q: param() }),
   createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
   createBufferSource: () => { made.noises++; return { ...node(), buffer: null }; },
  };
  return { ctx: ctx as unknown as BaseAudioContext, made };
 }
 it.each(Object.keys(STINGERS) as (keyof typeof STINGERS)[])('%s schedules sound of a sensible length and loudness', name => {
  const { ctx, made } = fakeContext(), length = STINGERS[name](ctx, {} as AudioNode, 10);
  expect(made.oscillators + made.noises).toBeGreaterThan(0);
  expect(made.started).toBe(made.oscillators + made.noises);
  expect(length).toBeGreaterThan(0.2);
  expect(length).toBeLessThanOrEqual(2);
  expect(made.peak).toBeGreaterThan(0.05);
  expect(made.peak).toBeLessThanOrEqual(0.65);
  // Everything is scheduled from the given time and is over within the stated length (plus the last release).
  expect(made.last).toBeGreaterThan(10);
  expect(made.last).toBeLessThanOrEqual(10 + length + 0.1);
 });
});
