import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, State } from '../src/rules/model';
import { undoable } from '../src/campaign/undo';

const start = () => createGame(p, DEFAULT_SETUP);
const first = (s: State, type: Command['type']) => legalActions(p, s).find(c => c.type === type && (!('hero' in c) || faction(p, c.hero) === s.faction))!;

describe('undo', () => {
 it('takes back travel and rest, which roll nothing and reveal nothing', () => {
  for (const type of ['travel', 'rest'] as const) {
   const s = start(), c = first(s, type);
   expect(c).toBeTruthy();
   expect(undoable(s, apply(p, s, c), c)).toBe(true);
  }
 });

 it('never takes back a move that drew a card or used the random state', () => {
  const s = start(), c = first(s, 'travel'), after = apply(p, s, c);
  expect(undoable(s, { ...after, rng: after.rng + 1 }, c)).toBe(false);
  expect(undoable(s, { ...after, eventDeck: after.eventDeck.slice(1) }, c)).toBe(false);
  expect(undoable(s, { ...after, enemies: after.enemies.slice(1) }, c)).toBe(false);
 });

 it('never takes back a challenge, an end of turn or anything that opens combat', () => {
  const s = start(), end = { type: 'endActions' } as Command;
  expect(undoable(s, s, end)).toBe(false);
  const travel = first(s, 'travel'), after = apply(p, s, travel);
  expect(undoable(s, { ...after, battle: {} as State['battle'] }, travel)).toBe(false);
  const challenge = { type: 'challenge', hero: s.heroes[0].id, target: 'x', allies: [] } as unknown as Command;
  expect(undoable(s, s, challenge)).toBe(false);
 });
});
