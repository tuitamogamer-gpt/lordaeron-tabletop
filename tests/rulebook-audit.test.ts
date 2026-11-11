import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle, chooseAttacker, defeat, monsterEffect } from '../src/rules/combat';
import { faction, hero, RULES_REVISION } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { importSession, newSession } from '../src/rules/session';
import type { Color, Setup, State } from '../src/rules/model';

// Deviations from the official rulebook found by reading it against the engine (docs/PLAYTHROUGH-2026-11-11.md).

const side = (s: State) => s.heroes.filter(h => faction(p, h.id) === s.faction);
/** Every hero of the active faction passes both actions, then the faction confirms its equipment. */
function passTurn(s: State, end = true) {
 for (const h of side(s)) while (hero(s, h.id).actions > 0) s = apply(p, s, { type: 'travel', hero: h.id, path: [] });
 s = apply(p, s, { type: 'endActions' });
 for (const h of side(s)) s = apply(p, s, { type: 'manage', hero: h.id, slots: structuredClone(h.slots), discard: [] });
 return end ? apply(p, s, { type: 'endManagement' }) : s;
}
/** The end of the third faction turn (Horde), with Spread the Plague active and Soul Taint next: the plague then halves Health, rounded up. */
function plagueStrikes(prepare: (s: State) => void, setup: Setup = DEFAULT_SETUP) {
 let s = createGame(p, { ...setup, overlord: 'kelthuzad' });
 s = passTurn(passTurn(s));
 s = structuredClone(passTurn(s, false));
 expect(s.turn).toBe(3); expect(s.faction).toBe('horde');
 s.world = [{ id: 'event-11', tokens: ['marris', 'hearthglen', 'andorhal'], attempts: [], gold: 0, items: [], trophies: { horde: [], alliance: [] } }];
 s.eventDeck = ['event-10', ...s.eventDeck.filter(id => id !== 'event-10' && id !== 'event-11')];
 prepare(s);
 return apply(p, s, { type: 'endManagement' });
}
const victim = 'burbon-fang';
/** A campaign begun before rules revision 2: its saved commands must replay to the same game, so it keeps the earlier behaviour. */
const BEFORE: Setup = { ...DEFAULT_SETUP, variants: { overlordOnly: true } };

describe('rules revision of a campaign', () => {
 it('begins new campaigns with the current revision and loads them again from a save', () => {
  expect(DEFAULT_SETUP.variants?.rules).toBe(RULES_REVISION);
  const session = newSession(p, DEFAULT_SETUP);
  expect(importSession(p, JSON.stringify(session)).state.variants?.rules).toBe(RULES_REVISION);
  expect(importSession(p, JSON.stringify(newSession(p, BEFORE))).state.variants?.rules).toBeUndefined();
 });

 it('leaves a campaign begun before the corrections as it was played', () => {
  let s = plagueStrikes(s => { const h = hero(s, victim); h.health = 1; h.location = 'corins'; h.bag.push(p.cards.find(c => c.name === 'Minor Healing Potion')!.id); }, BEFORE);
  expect(s.respawns).toEqual([victim]);
  expect(legalActions(p, s).every(c => c.type === 'respawn')).toBe(true);
  s = apply(p, s, legalActions(p, s)[0]);
  expect(hero(s, victim).actions).toBe(0);
 });
});

describe('a character defeated outside his own faction turn', () => {
 it('keeps the actions of the turn that follows when an event defeats him at the end of the enemy’s turn (rules p. 26)', () => {
  let s = plagueStrikes(s => { const h = hero(s, victim); h.health = 1; h.location = 'corins'; });
  expect(s.respawns).toEqual([victim]);
  s = apply(p, s, legalActions(p, s).find(c => c.type === 'respawn')!);
  expect(s.faction).toBe('alliance'); expect(s.phase).toBe('actions');
  expect(hero(s, victim)).toMatchObject({ health: 1, energy: 1, actions: 2 });
  for (const h of side(s)) expect(h.actions, h.id).toBe(2);
 });

 it('still loses his remaining actions when defeated during his own faction turn', () => {
  const s = createGame(p, DEFAULT_SETUP), own = side(s)[0], enemy = s.heroes.find(h => faction(p, h.id) !== s.faction)!;
  enemy.actions = 2;
  defeat(p, s, own.id, 'brill'); defeat(p, s, enemy.id, 'southshore');
  expect(own.actions).toBe(0);
  expect(enemy.actions).toBe(2);
 });
});

describe('the last chance to heal before defeat', () => {
 const potion = p.cards.find(c => c.name === 'Minor Healing Potion')!.id;
 it('lets a character drink a healing potion when an event takes his last Health, and then carries on (rules p. 26)', () => {
  let s = plagueStrikes(s => { const h = hero(s, victim); h.health = 1; h.location = 'corins'; h.bag.push(potion); });
  expect(s.respawns).toEqual([victim]);
  const drink = legalActions(p, s).find(c => c.type === 'ability' && c.hero === victim && c.card === potion);
  expect(drink, 'the potion is offered beside the graveyard choice').toBeTruthy();
  expect(legalActions(p, s).some(c => c.type === 'respawn')).toBe(true);
  s = apply(p, s, drink!);
  expect(s.respawns).toEqual([]);
  expect(hero(s, victim)).toMatchObject({ health: 1, location: 'corins', actions: 2 });
  expect(hero(s, victim).bag).not.toContain(potion);
  expect(s.faction).toBe('alliance'); expect(s.phase).toBe('actions');
 });

 it('does not let anyone else drink a healing potion outside combat', () => {
  const s = plagueStrikes(s => { const h = hero(s, victim); h.health = 1; h.location = 'corins'; const other = s.heroes.find(h => h.id !== victim && faction(p, h.id) === 'alliance')!; other.health = 1; other.location = 'southshore'; other.bag.push(potion); });
  expect(s.respawns).toEqual([victim]);
  expect(legalActions(p, s).filter(c => c.type === 'ability')).toEqual([]);
 });
});

describe('Kel’Thuzad’s limit on Attrition', () => {
 const dice = (s: State, rows: [Color, number, boolean?][]) => { s.battle!.active!.dice = rows.map(([color, value, spotted = false], id) => ({ id, color, value, spotted, removed: false, rerolled: false })); };
 function fight(setup: Setup = DEFAULT_SETUP) {
  const s = createGame(p, { ...setup, overlord: 'kelthuzad' }), h = s.heroes[0];
  h.level = 5; h.health = 9;
  beginBattle(s, 'pve', [h.id], [], 'horde', s.overlord.region, 'kelthuzad'); chooseAttacker(p, s, h.id);
  s.battle!.stage = 'after-reroll';
  return s;
 }
 it('counts every red or blue 6+, also one a card has already spotted, and never green dice', () => {
  const s = fight();
  dice(s, [['red', 8, true], ['blue', 6], ['green', 8], ['red', 5]]);
  s.battle!.active!.attrition = 3;
  monsterEffect(p, s);
  expect(s.battle!.active!.attrition).toBe(2);
 });
 it('leaves the dice it counted free for the character’s own abilities (rules p. 19)', () => {
  const s = fight();
  dice(s, [['red', 8], ['blue', 7], ['blue', 3]]);
  s.battle!.active!.attrition = 1;
  monsterEffect(p, s);
  expect(s.battle!.active!.attrition).toBe(1);
  expect(s.battle!.active!.dice.map(d => d.spotted)).toEqual([false, false, false]);
 });
 it('keeps the earlier reading in a campaign begun before the correction', () => {
  const s = fight(BEFORE);
  dice(s, [['red', 8, true], ['blue', 6], ['green', 8], ['red', 5]]);
  s.battle!.active!.attrition = 3;
  monsterEffect(p, s);
  expect(s.battle!.active!.attrition).toBe(1);
  expect(s.battle!.active!.dice.map(d => d.spotted)).toEqual([true, true, false, false]);
 });
 it('removes all Attrition when no red or blue die shows 6+', () => {
  const s = fight();
  dice(s, [['red', 5], ['blue', 4], ['green', 8]]);
  s.battle!.active!.attrition = 2;
  monsterEffect(p, s);
  expect(s.battle!.active!.attrition).toBe(0);
 });
});
