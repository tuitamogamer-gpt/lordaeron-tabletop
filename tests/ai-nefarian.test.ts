import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { decide } from '../src/ai/planner';
import { createStrategy, nefarianSteps, nefarianUrgency, type Objective } from '../src/ai/strategy';
import { capacity, faction } from '../src/rules/common';
import { createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { distances } from '../src/rules/world';
import { view } from '../src/rules/view';

const nefarianGame = () => createGame(p, { ...DEFAULT_SETUP, overlord: 'nefarian' });
const toBulwark = distances(p, 'bulwark');
const regionAt = (steps: number) => p.regions.find(r => toBulwark[r.id] === steps && !r.home)!.id;

describe('the AI races Nefarian to the Bulwark', () => {
 it('measures how far Nefarian still has to march, and only for Nefarian', () => {
  const s = nefarianGame();
  expect(nefarianSteps(p, s)).toBe(toBulwark[s.overlord.region]);
  s.overlord.region = 'bulwark';
  expect(nefarianSteps(p, s)).toBeUndefined();
  expect(nefarianSteps(p, createGame(p, { ...DEFAULT_SETUP, overlord: 'kelthuzad' }))).toBeUndefined();
 });

 it('values an attack on Nefarian more with every region he advances', () => {
  expect(nefarianUrgency(undefined)).toBe(0);
  expect(nefarianUrgency(6)).toBe(0);
  expect(nefarianUrgency(2)).toBeGreaterThan(nefarianUrgency(4));
  const s = nefarianGame(), party = s.heroes.filter(h => faction(p, h.id) === 'horde');
  const objective = (region: string): Objective => ({ id: 'nefarian', region, enemies: [], boss: 'nefarian', label: 'Nefarian' });
  s.overlord.region = regionAt(6);
  const far = createStrategy(p, view(s, s.heroes.map(h => h.id)), 1).rewardValue(objective(s.overlord.region), party);
  s.overlord.region = regionAt(1);
  const near = createStrategy(p, view(s, s.heroes.map(h => h.id)), 1).rewardValue(objective(s.overlord.region), party);
  expect(near - far).toBe(nefarianUrgency(1));
 });

 it('rests a spent hero sooner when Nefarian is one Fate event from the Bulwark', () => {
  const restScore = (steps: number) => {
   const s = nefarianGame(), h = s.heroes.find(h => faction(p, h.id) === s.faction)!, cap = capacity(p, h);
   h.health = Math.max(1, cap.health - 2); h.energy = 0; s.overlord.region = regionAt(steps);
   const rests = legalActions(p, s).filter(c => c.type === 'rest' && c.hero === h.id);
   expect(rests.length).toBeGreaterThan(0);
   return decide(p, view(s, s.heroes.map(v => v.id)), rests)!.score;
  };
  expect(restScore(1)).toBeGreaterThan(restScore(6));
 });
});
