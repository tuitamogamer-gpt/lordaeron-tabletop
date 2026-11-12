import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { capacity, hero, RULES_REVISION } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, Effect, State } from '../src/rules/model';

/**
 * Rules p. 13: an ability that lets a character *gain* Health or Energy may take him above his capacity "for that ability's
 * duration"; one that lets him *regain* it may not. The verb below is the one printed on each card of the base game that
 * gives Health or Energy through a counted effect, read from the scans on 12. 11. 2026.
 */
const PRINTED = {
 gain: ['Anger Management', 'Arcane Intellect', 'Blessing of Kings', 'Bloodrage', 'Charge', 'Divine Spirit', 'Mental Strength', 'Power Word: Fortitude', 'Sacrifice', 'Unbridled Wrath'],
 regain: ["Advisor's Gnarled Staff", 'Arcane Meditation', 'Arcane Mind', 'Cannibalize', 'Crocolisk Steak', 'Deathcoil', 'Expansive Mind', 'Greater Healing Potion', 'Greater Mana Potion', 'Holy Shield', 'Icicle Rod', 'Lesser Healing Potion', 'Lesser Mana Potion', "Lorekeeper's Ring", 'Mana Tide Totem', 'Meditation', 'Minor Healing Potion', 'Minor Mana Potion', 'Omen of Clarity', 'Regeneration', 'Relentless Strikes', 'Robe of Power', 'Siphon Life', 'Tranquility'],
};
type Giving = Extract<Effect, { op: 'resource' | 'resource-level' | 'group-resource' }>;
const giving = (effects: Effect[]): Giving[] => effects.flatMap(e => [
 ...(e.op === 'resource' && e.resource !== 'gold' && e.amount > 0 || e.op === 'resource-level' || e.op === 'group-resource' ? [e as Giving] : []),
 ...('effects' in e ? giving(e.effects) : []), ...(e.op === 'if' ? [...giving(e.then), ...giving(e.otherwise ?? [])] : []),
]);
const names = (gain: boolean) => [...new Set(p.cards.filter(c => c.abilities.some(a => giving(a.effects).some(e => !!e.gain === gain))).map(c => c.name))].sort();

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall', SHAMAN = 'zowka-shattertusk';
function fight(ids: string[], rules = RULES_REVISION, change: (s: State) => void = () => {}) {
 const s = createGame(p, { ...DEFAULT_SETUP, variants: { ...DEFAULT_SETUP.variants, rules } });
 change(s);
 for (const id of ids) Object.assign(hero(s, id), capacity(p, hero(s, id)));
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', ids, ['enemy'], 'horde', 'brill');
 return s;
}
const use = (s: State, cardId: string, pick: (c: Extract<Command, { type: 'ability' }>) => boolean = () => true) => {
 const command = legalActions(p, s).find((c): c is Extract<Command, { type: 'ability' }> => c.type === 'ability' && c.card === cardId && pick(c));
 expect(command, `${cardId} can be used`).toBeDefined();
 return apply(p, s, command!);
};
/** Plays a combat to its end without using a power, then closes it. */
function finish(state: State) {
 let s = state;
 for (let i = 0; i < 300 && s.battle; i++) {
  const legal = legalActions(p, s);
  s = apply(p, s, legal.find(c => c.type === 'attacker') ?? legal.find(c => c.type === 'roll') ?? legal.find(c => ['advance', 'tokens', 'monster', 'wound', 'penalty', 'closeBattle', 'respawn'].includes(c.type)) ?? legal.find(c => c.type !== 'ability')!);
 }
 expect(s.battle).toBeUndefined();
 return s;
}
const over = (s: State, id: string) => { const h = hero(s, id), cap = capacity(p, h); return { health: h.health - cap.health, energy: h.energy - cap.energy }; };

describe('the printed verb decides whether capacity can be exceeded', () => {
 it('lets exactly the cards printed with "gain" exceed capacity', () => {
  expect(names(true)).toEqual(PRINTED.gain);
 });
 it('caps every card printed with "regain" at capacity', () => {
  expect(names(false)).toEqual(PRINTED.regain);
 });
 it('never gives one card both verbs', () => {
  expect(names(true).filter(name => names(false).includes(name))).toEqual([]);
 });
});

describe('gaining above capacity', () => {
 it('Charge: a full Warrior goes one above capacity in every round he attacks', () => {
  let s = apply(p, fight([WARRIOR]), { type: 'attacker', hero: WARRIOR });
  expect(over(s, WARRIOR).energy).toBe(1);
  s.battle!.acted = [WARRIOR]; s.battle!.stage = 'round-end'; delete s.battle!.active;
  s = apply(p, apply(p, s, { type: 'advance' }), { type: 'attacker', hero: WARRIOR });
  expect(over(s, WARRIOR).energy).toBe(2);
 });
 it('Bloodrage: each Health spent gives 2 Energy, above capacity', () => {
  const start = fight([WARRIOR], RULES_REVISION, s => { const h = hero(s, WARRIOR); h.level = 3; h.learned = ['warrior-bloodrage']; h.slots[1].card = 'warrior-bloodrage'; });
  const cap = capacity(p, hero(start, WARRIOR));
  const s = use(apply(p, start, { type: 'attacker', hero: WARRIOR }), 'warrior-bloodrage', c => c.ability.endsWith('2'));
  expect(hero(s, WARRIOR)).toMatchObject({ health: cap.health - 2, energy: cap.energy + 1 + 4 });
 });
 it('Arcane Intellect: the Mage gains as the Warrior does', () => {
  const s = fight([MAGE], RULES_REVISION, s => { const h = hero(s, MAGE); h.learned = ['mage-arcane-intellect']; h.slots[0].card = 'mage-arcane-intellect'; });
  expect(over(apply(p, s, { type: 'attacker', hero: MAGE }), MAGE)).toEqual({ health: 0, energy: 1 });
 });
 it('a regain stops at capacity: at the start of a round Icicle Rod gives a full character nothing and an empty one 1', () => {
  const secondRound = (energy?: number) => {
   const s = fight([MAGE], RULES_REVISION, s => { hero(s, MAGE).level = 3; hero(s, MAGE).slots[4].card = 'special-icicle-rod'; });
   if (energy !== undefined) hero(s, MAGE).energy = energy;
   s.battle!.acted = [MAGE]; s.battle!.stage = 'round-end';
   return hero(apply(p, s, { type: 'advance' }), MAGE);
  };
  const full = secondRound();
  expect(full.energy).toBe(capacity(p, full).energy);
  expect(secondRound(0).energy).toBe(1);
 });
});

describe('losing it again', () => {
 it('removes what every participant gained above capacity when the combat ends', () => {
  const start = fight([WARRIOR, MAGE, SHAMAN], RULES_REVISION, s => { const h = hero(s, MAGE); h.learned = ['mage-arcane-intellect']; h.slots[0].card = 'mage-arcane-intellect'; });
  let s = apply(p, start, { type: 'attacker', hero: WARRIOR });
  expect(over(s, WARRIOR).energy).toBe(1);
  // The party also stands above its Health capacity, as after Power Word: Fortitude.
  for (const id of [WARRIOR, MAGE, SHAMAN]) hero(s, id).health += 1;
  s = finish(s);
  for (const id of [WARRIOR, MAGE, SHAMAN]) { expect(over(s, id).energy, id).toBeLessThanOrEqual(0); expect(over(s, id).health, id).toBeLessThanOrEqual(0); }
 });
 const escaping = (rules: number) => {
  const start = fight([MAGE, WARRIOR], rules, s => { const h = hero(s, MAGE); h.level = 3; h.talents = ['mage-ice-block']; h.learned = ['mage-arcane-intellect']; h.slots[0].card = 'mage-arcane-intellect'; });
  let s = apply(p, apply(p, start, { type: 'attacker', hero: MAGE }), { type: 'roll' });
  expect(over(s, MAGE).energy).toBe(1);
  hero(s, MAGE).stun = 1; hero(s, MAGE).health += 1;
  s = use(s, 'mage-ice-block');
  expect(s.battle!.participants).toEqual([WARRIOR]);
  return s;
 };
 it('ends combat for a character who escapes it: an Ice Block leaves gained Energy, gained Health and Stun behind', () => {
  const s = escaping(RULES_REVISION);
  expect(over(s, MAGE)).toEqual({ health: 0, energy: 0 });
  expect(hero(s, MAGE).stun).toBe(0);
  // The Warrior fights on and loses his own excess when the combat closes.
  expect(over(finish(s), WARRIOR).energy).toBeLessThanOrEqual(0);
 });
 it('keeps campaigns begun before rules revision 4 as they were played: the escaped Mage kept his excess', () => {
  const s = escaping(3);
  expect(over(s, MAGE)).toEqual({ health: 1, energy: 1 });
  expect(hero(s, MAGE).stun).toBe(1);
  expect(over(finish(s), MAGE)).toEqual({ health: 1, energy: 1 });
 });
 it('begins new campaigns with rules revision 4', () => {
  expect(RULES_REVISION).toBe(4);
  expect(createGame(p, DEFAULT_SETUP).variants?.rules).toBe(4);
 });
});
