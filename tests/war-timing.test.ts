import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction, hero, RULES_REVISION } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Faction, State, War } from '../src/rules/model';

// Rulebook, p. 26: a War rewards “the faction that manages to have characters in two specific board regions at the end of their
// opponents’ faction turn”. P. 12: a faction turn ends with three steps — Character Management, Advance Turn Marker, Event — so the
// Wars are judged after the Event card of that turn. Rules revision 3 does this; earlier campaigns judged them before the marker moved.
const WAR = 'event-24', [ANDORHAL, HEARTHGLEN] = ['andorhal', 'hearthglen'];
const war = (): War => ({ id: WAR, regions: [ANDORHAL, HEARTHGLEN], reward: { xp: 2, gold: 5, items: [] }, weakReward: { xp: 4, gold: 5, items: [] }, perHero: true });
const side = (s: State, f: Faction) => s.heroes.filter(h => faction(p, h.id) === f);
const hold = (s: State, f: Faction) => { const [a, b] = side(s, f); a.location = ANDORHAL; b.location = HEARTHGLEN; };

/** A campaign under the given rules revision, on a turn of the given faction whose characters have all acted. */
function table(rules: number, turn: number, variants: { overlordOnly: boolean } = { overlordOnly: true }) {
 const s = createGame(p, { ...DEFAULT_SETUP, variants: { ...variants, rules } });
 s.turn = turn; s.faction = turn % 2 ? 'horde' : 'alliance';
 for (const h of s.heroes) h.actions = 0;
 return s;
}
function endTurn(state: State) {
 let s = apply(p, state, { type: 'endActions' });
 for (const h of side(s, s.faction)) s = apply(p, s, { type: 'manage', hero: h.id, slots: h.slots, discard: [] });
 return apply(p, s, { type: 'endManagement' });
}
/** Takes every pending talent or reward decision. */
function settle(state: State) {
 let s = state;
 for (let i = 0; i < 40 && (s.phase === 'reward' || s.heroes.some(h => h.talentChoices.length)); i++) s = apply(p, s, legalActions(p, s).find(c => ['talent', 'reward'].includes(c.type))!);
 return s;
}
const wealth = (s: State, f: Faction) => side(s, f).map(h => [h.gold, h.xp]);

describe('when a War is judged', () => {
 it('begins new campaigns with rules revision 3', () => {
  expect(RULES_REVISION).toBe(3);
  expect(createGame(p, DEFAULT_SETUP).variants?.rules).toBe(3);
 });

 it('rewards the opposing faction at once when a War is drawn over regions it already holds', () => {
  // Turn 3 is the Horde’s; space 4 draws an Event card.
  const s = table(3, 3); hold(s, 'alliance'); s.eventDeck = [WAR, ...s.eventDeck.filter(id => id !== WAR)];
  const before = wealth(s, 'alliance'), next = endTurn(s);
  expect(next.eventDiscard).toEqual([WAR]);
  expect(next.wars).toEqual([]);
  expect(wealth(next, 'alliance')).toEqual(before.map(([gold, xp]) => [gold + 5, xp + 2]));
  expect([next.phase, next.faction, next.turn]).toEqual(['actions', 'alliance', 4]);
  expect(side(next, 'alliance').every(h => h.actions === 2)).toBe(true);
 });

 it('left that War on the table for a later turn before revision 3', () => {
  const s = table(2, 3); hold(s, 'alliance'); s.eventDeck = [WAR, ...s.eventDeck.filter(id => id !== WAR)];
  const before = wealth(s, 'alliance'), next = endTurn(s);
  expect(next.wars.map(w => w.id)).toEqual([WAR]);
  expect(wealth(next, 'alliance')).toEqual(before);
  expect([next.phase, next.faction, next.turn]).toEqual(['actions', 'alliance', 4]);
 });

 it('judges a War already on the table after the turn marker has moved and the Event card is resolved', () => {
  const s = table(3, 3); hold(s, 'alliance'); s.wars = [war()];
  for (const h of side(s, 'alliance')) h.xp = 3;   // The War’s experience brings a level and a talent to choose, which holds the game at the reward.
  const drawn = s.eventDeck[0], next = endTurn(s);
  expect(next.phase).toBe('reward');
  expect([next.faction, next.turn]).toEqual(['horde', 4]);
  expect(next.eventDiscard).toEqual([drawn]);
  const done = settle(next);
  expect([done.phase, done.faction, done.turn]).toEqual(['actions', 'alliance', 4]);
  expect(done.eventDiscard).toEqual([drawn]);
  for (const h of side(done, 'alliance')) expect(h).toMatchObject({ level: 2, actions: 2 });
 });

 it('judged it before the marker moved and before the Event card in campaigns begun earlier', () => {
  for (const rules of [1, 2]) {
   const s = table(rules, 3); hold(s, 'alliance'); s.wars = [war()];
   for (const h of side(s, 'alliance')) h.xp = 3;
   const drawn = s.eventDeck[0], next = endTurn(s);
   expect(next.phase).toBe('reward');
   expect([next.faction, next.turn]).toEqual(['horde', 3]);
   expect(next.eventDiscard).toEqual([]);
   const done = settle(next);
   expect([done.phase, done.faction, done.turn]).toEqual(['actions', 'alliance', 4]);
   expect(done.eventDiscard).toEqual([drawn]);
  }
 });

 it('does not reward a faction at the end of its own turn, only at the end of the enemy’s', () => {
  const s = table(3, 3); hold(s, 'horde'); s.wars = [war()]; s.eventDeck = [];   // No Event card: this seed would draw a second War.
  const before = wealth(s, 'horde'), own = endTurn(s);
  expect(own.wars.map(w => w.id)).toEqual([WAR]);
  expect(wealth(own, 'horde')).toEqual(before);
  expect(own.faction).toBe('alliance');
  for (const h of own.heroes) h.actions = 0;
  const enemy = endTurn(own);
  expect(enemy.wars).toEqual([]);
  expect(wealth(enemy, 'horde')).toEqual(before.map(([gold, xp]) => [gold + 5, xp + 2]));
  expect([enemy.phase, enemy.faction, enemy.turn]).toEqual(['actions', 'horde', 5]);
 });

 it('gives the weaker faction the larger reward, per character', () => {
  const s = table(3, 3); hold(s, 'alliance'); s.wars = [war()];
  hero(s, side(s, 'horde')[0].id).xp = 1;
  const before = wealth(s, 'alliance'), next = settle(endTurn(s));
  expect(wealth(next, 'alliance')).toEqual(before.map(([gold, xp]) => [gold + 5, xp + 4]));
 });

 it('writes the War and its reward into the chronicle', () => {
  const s = table(3, 3); hold(s, 'alliance'); s.wars = [war()];
  const next = endTurn(s), texts = next.log.map(e => e.text);
  const won = texts.indexOf('The Alliance wins The Andorhal War, holding Ruins of Andorhal and Hearthglen: 5 gold and 2 XP for each of its characters.');
  expect(won).toBeGreaterThan(-1);
  expect(texts.findIndex(t => t.startsWith('Event: '))).toBeLessThan(won);
  expect(texts.at(-1)).toBe('The Alliance begins faction turn 4.');
 });

 it('goes straight to the final battle when the marker reaches End: that turn has no Event step and no end to judge Wars at', () => {
  const s = table(3, 30, { overlordOnly: false }); hold(s, 'horde'); s.wars = [war()];
  const before = wealth(s, 'horde'), next = endTurn(s);
  expect(next.phase).toBe('final-management');
  expect(next.wars.map(w => w.id)).toEqual([WAR]);
  expect(wealth(next, 'horde')).toEqual(before);
 });

 it('in the Defeat the Overlord variant judges Wars at the end of turn 30 as on any other turn', () => {
  const s = table(3, 30); hold(s, 'horde'); s.wars = [war()];
  const before = wealth(s, 'horde'), next = endTurn(s);
  expect(next.wars).toEqual([]);
  expect(wealth(next, 'horde')).toEqual(before.map(([gold, xp]) => [gold + 5, xp + 2]));
  expect([next.phase, next.faction, next.turn, next.lap]).toEqual(['actions', 'horde', 1, 2]);
 });
});
