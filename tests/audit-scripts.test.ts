import { describe, expect, it } from 'vitest';
import { BASE_PACK, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { assertState } from '../scripts/assert-state';
import { simulationOptions } from '../scripts/simulation-options';

describe('audit script inputs and invariant checks', () => {
 it('parses flags independently of positional arguments and reports the actual roster', () => {
  expect(simulationOptions(['--trace', '71', 'nefarian', 'casters', '--output', 'run.json'])).toMatchObject({ seed: 71, overlord: 'nefarian', roster: 'casters', trace: true, output: 'run.json', maxCommands: 12000 });
  expect(simulationOptions(['2005', 'kelthuzad', '--trace']).roster).toBe('default');
 });
 it.each([['0'], ['NaN'], ['1', 'typo'], ['1', 'kazzak', 'typo'], ['--max-commands', '0'], ['--max-commands', '20001'], ['--unknown']])('rejects invalid simulation arguments %j', (...args) => {
  expect(() => simulationOptions(args)).toThrow();
 });
 it('rejects duplicate figure identities and exhausted physical supplies', () => {
  const s = createGame(BASE_PACK, DEFAULT_SETUP);
  expect(() => assertState(BASE_PACK, s)).not.toThrow();
  s.enemies.push({ ...s.enemies[0] });
  expect(() => assertState(BASE_PACK, s)).toThrow(/Duplicate creature/);
  const creature = BASE_PACK.creatures[0];
  s.enemies = Array.from({ length: creature.stock.blue + 1 }, (_, i) => ({ id: `overflow-${i}`, creature: creature.id, color: 'blue', region: 'brill' }));
  expect(() => assertState(BASE_PACK, s)).toThrow(/Figure supply/);
 });
});
