import { describe, expect, it } from 'vitest';
import { BASE_PACK as p } from '../src/data/base';
import { candidateObjectives, encounterState, lateTokens, profile, upsetChance, type Objective } from '../src/ai/strategy';
import { chance } from '../src/ai/tactics';
import { capacity } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import type { Color, Die } from '../src/rules/model';
import { view } from '../src/rules/view';

const dice = (colors: Color[]): Die[] => colors.map((color, id) => ({ id, color, value: 0, rerolled: false, spotted: false, removed: false }));
function party(classId: 'warrior' | 'paladin' | 'shaman') {
 const def = p.characters.find(c => c.classId === classId)!;
 const roster = [def];
 for (const c of p.characters) if (!roster.some(h => h.classId === c.classId) && roster.filter(h => h.faction === c.faction).length < 2) roster.push(c);
 const s = createGame(p, { seed: 71, overlord: 'kelthuzad', roster: roster.map(h => h.id) });
 const h = s.heroes.find(h => h.id === def.id)!;
 h.level = 5; Object.assign(h, capacity(p, h));
 return { s, h };
}
const boss: Objective = { id: 'kelthuzad', region: 'brill', enemies: [], boss: 'kelthuzad', label: 'Kel’Thuzad' };

describe('late combat powers in the AI forecast', () => {
 it('counts automatic token powers and Spot bonuses with their real trigger chance', () => {
  const { h } = party('warrior');
  h.talents = ['warrior-piercing-howl'];
  expect(lateTokens(p, h, dice(['red', 'red']), 'none', h.energy).box.armor).toBe(1);
  h.talents = ['warrior-blood-thirst'];
  // Blood Thirst spots red 8s: with four red dice, E[matches] = 4 × 1/8.
  const thirst = lateTokens(p, h, dice(['red', 'red', 'red', 'red', 'blue']), 'none', h.energy);
  expect(thirst.box.defense).toBeCloseTo(4 / 8, 6);
  expect(thirst.box.damage + thirst.box.armor + thirst.box.attrition).toBe(0);
 });

 it('pays printed energy for instant powers and skips them when the hero cannot afford them', () => {
  const { h } = party('shaman');
  h.slots[0] = { card: 'shaman-purge', addons: [] };
  const cost = p.cards.find(c => c.id === 'shaman-purge')!.energy;
  const rich = lateTokens(p, h, dice(['red']), 'none', cost);
  expect(rich.box.armor).toBe(3);
  expect(rich.energy).toBe(cost);
  if (cost > 0) expect(lateTokens(p, h, dice(['red']), 'none', cost - 1).box.armor).toBe(0);
 });

 it('values one strength of a multi-strength power, never the sum of every strength', () => {
  const { s, h } = party('paladin');
  const reds = () => profile(p, encounterState(p, view(s, s.heroes.map(x => x.id)), boss, [h]), h);
  const without = reds();
  h.slots[1] = { card: 'paladin-blessing-of-protection', addons: [] };
  const withBlessing = reds();
  // Blessing turns up to seven red misses into armor 8s. Summing all seven strengths reached 20+ armor.
  const gain = withBlessing.box.armor - without.box.armor;
  expect(gain).toBeGreaterThan(0);
  expect(gain).toBeLessThanOrEqual(7 * (1 - chance(7)));
 });
});

describe('Overlord decisions', () => {
 it('keeps a distant Overlord among the planned objectives', () => {
  const near = Array.from({ length: 7 }, (_, i): Objective => ({ id: `quest-${i}`, region: 'brill', enemies: [], label: `Quest ${i}` }));
  const chosen = candidateObjectives([...near, boss], 'kelthuzad');
  expect(chosen.map(o => o.id)).toEqual(['quest-0', 'quest-1', 'quest-2', 'quest-3', 'quest-4', 'kelthuzad']);
  expect(candidateObjectives(near.slice(0, 3), 'kelthuzad')).toHaveLength(3);
 });

 it('gives a regenerating boss a real but small chance when the average roll falls short', () => {
  const rounds = Array.from({ length: 7 }, () => ({ hits: 10, guard: 12, wounds: 11, hazard: 2, heal: 6 }));
  const hot = upsetChance(rounds, 27, 32, chance(7));
  expect(hot).toBeGreaterThan(.005);
  expect(hot).toBeLessThan(.5);
  // Far weaker dice or a fragile party leave no realistic path to victory.
  expect(upsetChance(rounds.map(r => ({ ...r, hits: 4 })), 27, 32, chance(7))).toBeLessThan(1e-4);
  expect(upsetChance(rounds, 27, 8, chance(7))).toBeLessThan(.01);
 });
});

