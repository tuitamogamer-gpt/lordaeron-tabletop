import { describe, expect, it } from 'vitest';
import { attackPreview, cardNote, diceWords, energyNote, energySources } from '../src/campaign/combat-readiness';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { capacity, hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall';
const STRIKE = 'warrior-heroic-strike', CHARGE = `${WARRIOR}-ranged`, SWORD = `${WARRIOR}-melee`;
/** A level 1 Warrior with Heroic Strike (2 energy) and a Mage ally face a creature; nobody has attacked yet. */
function fight(change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP), h = hero(s, WARRIOR);
 h.learned = [STRIKE]; h.slots[1].card = STRIKE;
 change(s);
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', [WARRIOR, MAGE], ['enemy'], 'horde', 'brill');
 return s;
}
const powers = (s: State, id: string) => [...new Set(legalActions(p, s).flatMap(c => c.type === 'ability' && c.hero === id ? [c.card] : []))];
const strike: Command = { type: 'ability', hero: WARRIOR, card: STRIKE, ability: 'pool', args: {} };

describe('what a character brings to his attack', () => {
 it('previews Charge: a full Warrior starts his Dice Pool step with 2 energy and Heroic Strike in reach', () => {
  const s = fight(), v = view(s);
  expect(hero(s, WARRIOR).energy).toBe(1);
  expect(capacity(p, hero(s, WARRIOR)).energy).toBe(1);
  const preview = attackPreview(p, v, WARRIOR)!;
  expect(preview).toMatchObject({ hero: WARRIOR, energy: 2, gained: 1, dice: { red: 2, blue: 0, green: 1 } });
  expect(preview.sources.map(source => [source.name, source.amount])).toEqual([['Charge', 1]]);
  expect(preview.powers).toEqual([STRIKE]);
  expect(diceWords(preview.dice)).toBe('2 red, 1 green');
 });
 it('says exactly what the real command then does, and leaves the table untouched', () => {
  const s = fight(), v = view(s), before = structuredClone(v);
  const preview = attackPreview(p, v, WARRIOR)!;
  expect(v).toEqual(before);
  const real = apply(p, s, { type: 'attacker', hero: WARRIOR });
  expect(hero(real, WARRIOR).energy).toBe(preview.energy);
  expect(powers(real, WARRIOR)).toEqual(preview.powers);
  expect(real.battle!.active!.dice.filter(die => die.color === 'red')).toHaveLength(preview.dice.red);
  // Asking twice for the same table costs one simulation.
  expect(attackPreview(p, v, WARRIOR)).toBe(preview);
 });
 it('previews each character on his own', () => {
  const v = view(fight());
  expect(attackPreview(p, v, MAGE)).toMatchObject({ energy: 4, gained: 0, sources: [], dice: { red: 1, blue: 1, green: 0 }, powers: [`${MAGE}-ranged`] });
 });
 it('has nothing to preview once an attacker is chosen, or for a character who cannot attack', () => {
  const s = fight(), attacking = apply(p, s, { type: 'attacker', hero: WARRIOR });
  expect(attackPreview(p, view(attacking), WARRIOR)).toBeUndefined();
  expect(attackPreview(p, view(attacking), MAGE)).toBeUndefined();
  s.battle!.acted = [WARRIOR];
  expect(attackPreview(p, view(s), WARRIOR)).toBeUndefined();
  expect(attackPreview(p, view(s), MAGE)).toBeDefined();
 });
});

describe('why a card on the sheet waits', () => {
 it('tells the Warrior that Heroic Strike is ready once he attacks, counting the energy from Charge', () => {
  expect(cardNote(p, view(fight()), WARRIOR, STRIKE)).toEqual({ tone: 'soon', text: 'Ready when Grumbaz attacks · 2 energy with Charge' });
 });
 it('says what is missing when even Charge is not enough, and that Charge refills each round', () => {
  const s = fight(s => { hero(s, WARRIOR).energy = 0; });
  expect(cardNote(p, view(s), WARRIOR, STRIKE)).toEqual({ tone: 'wait', text: 'Needs 2 energy · Grumbaz will have 1 · Charge gives 1 each round' });
  const attacking = apply(p, s, { type: 'attacker', hero: WARRIOR });
  expect(hero(attacking, WARRIOR).energy).toBe(1);
  expect(powers(attacking, WARRIOR)).toEqual([]);
  expect(cardNote(p, view(attacking), WARRIOR, STRIKE)).toEqual({ tone: 'wait', text: 'Needs 2 energy · Grumbaz has 1 · Charge gives 1 each round' });
 });
 it('marks a power used this round', () => {
  const used = apply(p, apply(p, fight(), { type: 'attacker', hero: WARRIOR }), strike);
  expect(hero(used, WARRIOR).energy).toBe(0);
  expect(cardNote(p, view(used), WARRIOR, STRIKE)).toEqual({ tone: 'spent', text: 'Used this round' });
 });
 it('keeps a power of the Dice Pool step for its owner’s own attack', () => {
  const s = fight(), allyAttacks = apply(p, s, { type: 'attacker', hero: MAGE });
  expect(cardNote(p, view(allyAttacks), WARRIOR, STRIKE).text).toBe('Only in Grumbaz’s own attack');
  const rolled = apply(p, apply(p, s, { type: 'attacker', hero: WARRIOR }), { type: 'roll' });
  expect(cardNote(p, view(rolled), WARRIOR, STRIKE).text).toBe('Use before the roll');
  s.battle!.acted = [WARRIOR];
  expect(cardNote(p, view(s), WARRIOR, STRIKE)).toEqual({ tone: 'wait', text: 'Grumbaz has attacked this round · next round' });
 });
 it('says what a card does by itself, and when it has done it', () => {
  const s = fight(), attacking = apply(p, s, { type: 'attacker', hero: WARRIOR });
  expect(cardNote(p, view(s), WARRIOR, SWORD)).toEqual({ tone: 'passive', text: '+1 red dice · when attacking' });
  expect(cardNote(p, view(s), WARRIOR, CHARGE).text).toBe('Gain 1 energy (may exceed capacity) · when attacking');
  expect(cardNote(p, view(attacking), WARRIOR, SWORD).text).toBe('+1 red dice · applied this round');
  expect(cardNote(p, view(attacking), WARRIOR, CHARGE).text).toBe('Gain 1 energy (may exceed capacity) · applied this round');
 });
});

describe('where the energy comes from', () => {
 it('names Charge before and after it gives its energy', () => {
  const s = fight(), attacking = apply(p, s, { type: 'attacker', hero: WARRIOR }), used = apply(p, attacking, strike);
  expect(energySources(p, view(s), WARRIOR)).toEqual([{ card: CHARGE, name: 'Charge', amount: 1, timing: 'pool', applied: false }]);
  expect(energyNote(p, view(s), WARRIOR, 1)).toBe('Charge gives +1 when Grumbaz attacks: 2 to spend');
  expect(energySources(p, view(attacking), WARRIOR)[0].applied).toBe(true);
  expect(energyNote(p, view(attacking), WARRIOR, 1)).toBe('+1 from Charge this round · 1 above capacity is lost when combat ends');
  expect(energyNote(p, view(used), WARRIOR, 1)).toBe('+1 from Charge this round');
  expect(energyNote(p, view(s), MAGE, 4)).toBe('');
 });
 it('gives Charge again in every round of the fight', () => {
  let s = apply(p, apply(p, fight(), { type: 'attacker', hero: WARRIOR }), strike);
  s.battle!.acted = [WARRIOR, MAGE]; s.battle!.stage = 'round-end'; delete s.battle!.active;
  s = apply(p, s, { type: 'advance' });
  expect(s.battle).toMatchObject({ round: 2, stage: 'attacker' });
  expect(attackPreview(p, view(s), WARRIOR)).toMatchObject({ energy: 1, gained: 1, powers: [] });
  expect(cardNote(p, view(s), WARRIOR, STRIKE).text).toBe('Needs 2 energy · Grumbaz will have 1 · Charge gives 1 each round');
 });
});
