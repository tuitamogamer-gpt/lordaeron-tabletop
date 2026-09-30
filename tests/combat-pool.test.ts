import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { combatPool } from '../src/campaign/combat-pool';
import { beginBattle, poolPenaltyDice } from '../src/rules/combat';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Color, Pool, State } from '../src/rules/model';

const warrior = 'grumbaz-crowsblood';
function battle(stance?: string) {
 let s = createGame(p, DEFAULT_SETUP);
 const h = s.heroes.find(h => h.id === warrior)!;
 h.learned = ['warrior-heroic-strike', ...(stance ? [stance] : [])];
 h.slots[1].card = 'warrior-heroic-strike';
 if (stance) { h.level = 5; h.slots[0].card = stance; }
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', [warrior], ['enemy'], 'horde', 'brill');
 s = apply(p, s, { type: 'attacker', hero: warrior });
 return s;
}
const preview = (s: State, omit?: Pool) => combatPool(p, s.heroes.find(h => h.id === warrior)!, s.battle!.active!, omit);
function rolledPool(s: State): Pool {
 return Object.fromEntries((['red', 'blue', 'green'] as Color[]).map(color => [color, s.battle!.active!.dice.filter(d => !d.removed && d.color === color).length])) as Pool;
}

describe('combat dice pool preview agrees with the reducer', () => {
 it('shows Charge energy and lets the player choose Heroic Strike before omitting and rolling dice', () => {
  let s = battle();
  expect(s.heroes.find(h => h.id === warrior)!.energy).toBe(2);
  expect(preview(s).kept).toEqual({ red: 2, blue: 0, green: 1 });
  s = apply(p, s, { type: 'ability', hero: warrior, card: 'warrior-heroic-strike', ability: 'pool' });
  expect(s.heroes.find(h => h.id === warrior)!.energy).toBe(0);
  expect(s.battle!.active!.reroll).toBe(1);
  const chosen = preview(s, { red: 1, blue: 0, green: 0 });
  expect(chosen.kept).toEqual({ red: 2, blue: 0, green: 1 });
  expect(chosen.total).toBe(3);
  const rolled = apply(p, s, { type: 'roll', omit: chosen.omit });
  expect(rolled.battle!.stage).toBe('after-pool');
  expect(rolledPool(rolled)).toEqual(chosen.kept);
  expect(rolled.battle!.active!.dice.every(d => d.value >= 1 && d.value <= 8)).toBe(true);
 });

 it('accounts for equipment losses before required color omissions and limits', () => {
  const s = battle('warrior-berserker-stance'), a = s.battle!.active!;
  const colors: Color[] = ['red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'green', 'green', 'green', 'green'];
  a.dice = colors.map((color, id) => ({ id, color, value: 0, removed: id === 7, spotted: false, rerolled: false }));
  a.forbidden = { pool: ['red'] };
  a.poolLimits = { blue: 1 };
  const h = s.heroes.find(h => h.id === warrior)!;
  expect(poolPenaltyDice(p, h, a)).toEqual([8, 9]);
  const chosen = preview(s);
  expect(chosen.penalties).toEqual([8, 9]);
  expect(chosen.available).toEqual({ red: 4, blue: 3, green: 1 });
  expect(chosen.maximum).toEqual({ red: 0, blue: 1, green: 1 });
  expect(chosen.omit).toEqual({ red: 4, blue: 2, green: 0 });
  expect(chosen.kept).toEqual({ red: 0, blue: 1, green: 1 });
  const required = legalActions(p, s).find(command => command.type === 'roll');
  expect(required).toEqual({ type: 'roll', omit: chosen.omit });
  const rolled = apply(p, s, required!);
  expect(rolledPool(rolled)).toEqual(chosen.kept);
  expect(rolled.battle!.active!.dice.filter(d => d.removed).map(d => d.id)).toEqual([7, 8, 9]);
  expect(rolled.battle!.active!.dice.filter(d => !d.removed)).toHaveLength(chosen.total);
 });

 it('does not change dice, energy, RNG, or requested omissions while previewing', () => {
  const s = battle('warrior-berserker-stance'), before = structuredClone(s);
  const requested = { red: 1, blue: 0, green: 1 }, originalRequest = { ...requested };
  const first = preview(s, requested), second = preview(s, requested);
  expect(first).toEqual(second);
  expect(s).toEqual(before);
  expect(requested).toEqual(originalRequest);
 });

 it('keeps the chosen omission when a power adds dice, and clamps it when the available pool shrinks', () => {
  let s = battle();
  const requested = { red: 1, blue: 0, green: 0 };
  expect(preview(s, requested).kept.red).toBe(1);
  s = apply(p, s, { type: 'ability', hero: warrior, card: 'warrior-heroic-strike', ability: 'pool' });
  expect(preview(s, requested).kept.red).toBe(2);
  s.battle!.active!.dice.filter(d => d.color === 'red').slice(1).forEach(d => { d.removed = true; });
  const chosen = preview(s, { red: 9, blue: -2, green: 0.8 });
  expect(chosen.omit).toEqual({ red: 1, blue: 0, green: 0 });
  expect(chosen.kept).toEqual({ red: 0, blue: 0, green: 1 });
  expect(rolledPool(apply(p, s, { type: 'roll', omit: chosen.omit }))).toEqual(chosen.kept);
 });
});
