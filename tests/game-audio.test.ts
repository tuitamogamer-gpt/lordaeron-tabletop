import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { cues, pick } from '../src/campaign/audio';
import { faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { view, type GameView } from '../src/rules/view';

const start = (overlord = 'kelthuzad') => view(createGame(p, { ...DEFAULT_SETUP, overlord }));
const step = (v: GameView, change: (n: GameView) => void) => { const n = structuredClone(v); n.revision = v.revision + 1; change(n); return n; };
const battle = (participants: string[], boss?: string) => ({ kind: 'pve', region: 'brill', participants, defeated: [], enemies: [], boss, round: 1, stage: 'attacker' }) as unknown as NonNullable<GameView['battle']>;

describe('the sound of the game state', () => {
 it('stays silent for a new or imported campaign and for an undo', () => {
  const a = start(), later = step(a, n => { n.heroes[0].level = 2; });
  expect(cues(p, undefined, a)).toEqual([]);
  expect(cues(p, later, a)).toEqual([]);
  expect(cues(p, a, { ...later, revision: a.revision + 200 })).toEqual([]);
  expect(cues(p, a, a)).toEqual([]);
 });

 it('puts a new level ahead of the gold that came with it, one effect and one voice at a time', () => {
  const a = start(), b = step(a, n => { n.heroes[0].level = 2; n.heroes[0].gold += 4; n.completed.push(n.quests[0]); });
  expect(cues(p, a, b).map(c => c.sfx ?? c.voice)).toEqual(['levelup', 'quest', 'coins']);
  expect(pick(cues(p, a, b))).toEqual({ sfx: 'levelup', voice: 'level' });
 });

 it('opens a battle with the side’s battle cry, or with the Overlord’s own line', () => {
  const a = start('nefarian'), horde = a.heroes.find(h => faction(p, h.id) === 'horde')!.id, alliance = a.heroes.find(h => faction(p, h.id) === 'alliance')!.id;
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([horde]); })))).toEqual({ sfx: 'sword', voice: 'horde' });
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([alliance]); })))).toEqual({ sfx: 'sword', voice: 'alliance' });
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([horde], 'nefarian'); })))).toEqual({ sfx: 'sword', voice: 'overlord-nefarian' });
 });

 it('rolls dice when a roll or a reroll changes them, not when they are spent', () => {
  const a = step(start(), n => { n.battle = battle([n.heroes[0].id]); });
  const rolled = step(a, n => { n.battle!.active = { heroId: n.heroes[0].id, dice: [{ id: 'd1', color: 'red', value: 3 }, { id: 'd2', color: 'blue', value: 7 }] } as never; });
  expect(pick(cues(p, a, rolled)).sfx).toBe('dice');
  const rerolled = step(rolled, n => { n.battle!.active!.dice[0] = { ...n.battle!.active!.dice[0], value: 6, rerolled: true }; });
  expect(pick(cues(p, rolled, rerolled)).sfx).toBe('dice');
  expect(pick(cues(p, rerolled, step(rerolled, n => { n.battle!.active!.dice.pop(); }))).sfx).toBeUndefined();
 });

 it('announces events, new quests, auctions and the next faction’s turn', () => {
  const a = start();
  expect(pick(cues(p, a, step(a, n => { n.eventDiscard.push('event-11'); })))).toEqual({ sfx: 'card', voice: 'event' });
  expect(pick(cues(p, a, step(a, n => { n.quests = [...n.quests.slice(1), 'a-new-quest']; })))).toEqual({ sfx: 'card', voice: 'new-quest' });
  expect(pick(cues(p, a, step(a, n => { n.auction = { event: 'auction-house', item: 'x', submitted: [], ownBids: {} }; }))).voice).toBe('auction');
  const next = step(a, n => { n.faction = n.faction === 'horde' ? 'alliance' : 'horde'; n.phase = 'actions'; });
  expect(pick(cues(p, a, next)).voice).toBe(`turn-${next.faction}`);
 });

 it('is heard for an Event card that resolves without any decision, at the end of a real turn', () => {
  // Turn 3 is the Horde’s and space 4 draws an Event card; a War needs no decision, so the whole Event step passes within one command.
  const s = createGame(p, DEFAULT_SETUP); s.turn = 3; s.eventDeck = ['event-24', ...s.eventDeck.filter(id => id !== 'event-24')];
  for (const h of s.heroes) h.actions = 0;
  let last = apply(p, s, { type: 'endActions' });
  for (const h of last.heroes.filter(h => faction(p, h.id) === last.faction)) last = apply(p, last, { type: 'manage', hero: h.id, slots: h.slots, discard: [] });
  const next = apply(p, last, { type: 'endManagement' });
  expect(next.eventDiscard).toEqual(['event-24']);
  expect(pick(cues(p, view(last), view(next)))).toEqual({ sfx: 'card', voice: 'event' });
 });

 it('ends with the winner’s fanfare, or with the draw line when Nefarian outlasts both', () => {
  const a = start();
  expect(pick(cues(p, a, step(a, n => { n.winner = 'alliance'; n.phase = 'finished'; })))).toEqual({ sfx: 'victory', voice: 'victory-alliance' });
  expect(pick(cues(p, a, step(a, n => { n.winner = 'draw'; n.phase = 'finished'; })))).toEqual({ sfx: 'victory', voice: 'draw' });
 });
});
