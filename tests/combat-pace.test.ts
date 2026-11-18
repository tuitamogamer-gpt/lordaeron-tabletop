import { describe, expect, it } from 'vitest';
import { bookkeepingStep, combatCue, lightCue } from '../src/campaign/combat-flow';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { faction, hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall';
/** The Warrior and the Mage against one green creature; nobody has attacked yet. */
function fight(creature = 'crusader', change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP);
 change(s);
 s.enemies = [{ id: 'enemy', creature, color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', [WARRIOR, MAGE], ['enemy'], 'horde', 'brill');
 return s;
}
const at = (s: State, damage: number, defense: number, armor: number, attrition: number) => { s.battle!.boxes.horde = { damage, defense, armor, attrition }; s.battle!.stage = 'defense'; return s; };
/** The same two against two Alliance characters, at the Armor step: the Horde has no armor, the Alliance one token and two ways to use it. */
function armored() {
 const s = createGame(p, DEFAULT_SETUP), alliance = s.heroes.filter(h => faction(p, h.id) === 'alliance').slice(0, 2).map(h => h.id);
 beginBattle(s, 'pvp', [WARRIOR, MAGE, ...alliance], [], 'horde', 'brill');
 s.battle!.stage = 'defense'; s.battle!.acted = [...s.battle!.participants];
 s.battle!.boxes = { horde: { damage: 1, defense: 2, armor: 0, attrition: 1 }, alliance: { damage: 0, defense: 1, armor: 1, attrition: 0 } };
 return s;
}

describe('a run of wounds', () => {
 it('lands each wound in a short beat while more are waiting, and the last one in a full exchange', () => {
  let s = apply(p, at(fight('crusader', state => { hero(state, WARRIOR).health = 9; }), 0, 1, 0, 0), { type: 'advance' });
  expect(s.battle!.wounds.horde).toBe(3);
  const cues = [];
  for (let i = 0; i < 3; i++) { const next = apply(p, s, { type: 'wound', hero: WARRIOR }); cues.push(combatCue(view(s), view(next))!); s = next; }
  expect(cues.map(cue => cue.kind)).toEqual(['hurt', 'hurt', 'hurt']);
  expect(cues.map(cue => lightCue(cue))).toEqual([true, true, false]);
  expect(cues.every(cue => cue.detail === 'Grumbaz −1 health')).toBe(true);
 });
 it('says in the exchange what the opponents struck with and how much was stopped', () => {
  const s = at(fight(), 0, 2, 1, 1), cue = combatCue(view(s), view(apply(p, s, { type: 'advance' })))!;
  expect(cue.detail).toBe('Crusader attacks for 4 · 3 stopped · 1 wound to assign');
  const calm = at(fight(), 0, 3, 1, 0), held = combatCue(view(calm), view(apply(p, calm, { type: 'advance' })))!;
  expect(held.detail).toBe('Crusader attacks for 4 · 4 stopped · The party holds its ground');
 });
});

describe('the Armor step of a fight between the factions', () => {
 it('continues by itself for a faction that has nothing to choose, and waits for one that has', () => {
  const s = armored(), legal = legalActions(p, s), v = view(s);
  const horde = legal.filter(c => c.type === 'armor' && c.faction === 'horde'), alliance = legal.filter(c => c.type === 'armor' && c.faction === 'alliance');
  expect(horde).toHaveLength(1);
  expect(alliance).toHaveLength(2);
  // Both factions are the player's: the Horde's empty assignment goes by itself, the Alliance's choice stays.
  expect(bookkeepingStep(v, legal.filter(c => c.type === 'armor'), legal, false)).toEqual(horde[0]);
  const next = apply(p, s, horde[0]), after = legalActions(p, next);
  expect(bookkeepingStep(view(next), after.filter(c => c.type === 'armor'), after, false)).toBeUndefined();
  // A bot still to move, or a power the player could use first, keeps the step with the player.
  expect(bookkeepingStep(v, horde, legal, true)).toBeUndefined();
  const power: Command = { type: 'ability', hero: WARRIOR, card: 'printed-melee', ability: 'defense' };
  expect(bookkeepingStep(v, [...horde, power], [...legal, power], false)).toBeUndefined();
  // The other faction's forced step is not this seat's to take.
  expect(bookkeepingStep(v, alliance, legal, false)).toBeUndefined();
 });
});
