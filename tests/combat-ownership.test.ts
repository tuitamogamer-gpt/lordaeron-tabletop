import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { botOwns, decisionOwners } from '../src/multiplayer/ownership';
import { apply, createGame } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { combatCandidates } from '../src/campaign/combat-flow';

const [human, ally, , opponent, oppositeAlly] = DEFAULT_SETUP.roster;
const options = { resolve: true, campaignAuto: false, difficulty: 'balanced' as const };
function battle(kind: 'pve' | 'pvp' = 'pve') {
 const s = createGame(p, DEFAULT_SETUP);
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, kind, kind === 'pve' ? [human, ally] : [human, ally, opponent, oppositeAlly], kind === 'pve' ? ['enemy'] : [], 'horde', 'brill');
 return s;
}

describe('shared attacker order and individual attack control', () => {
 it('lets a human choose their bot ally first, then returns the roll to that bot', () => {
  const s = battle(), command = { type: 'attacker' as const, hero: ally };
  expect(legalActions(p, s)).toContainEqual(command);
  expect(decisionOwners(p, s, command)).toEqual([human, ally]);
  expect(botOwns(p, s, command, [ally])).toBe(false);
  expect(combatCandidates(p, view(s), legalActions(p, s), [ally], options)).toEqual([]);
  const next = apply(p, s, command);
  expect(decisionOwners(p, next, { type: 'roll' })).toEqual([ally]);
  expect(combatCandidates(p, view(next), legalActions(p, next), [ally], options).length).toBeGreaterThan(0);
 });
 it('never gives the opposite faction control of attacker ordering', () => {
  const s = battle('pvp');
  expect(decisionOwners(p, s, { type: 'attacker', hero: ally })).toEqual([human, ally]);
  expect(decisionOwners(p, s, { type: 'attacker', hero: opponent })).toEqual([]);
  s.battle!.nextFaction = 'alliance';
  expect(decisionOwners(p, s, { type: 'attacker', hero: opponent })).toEqual([opponent, oppositeAlly]);
  expect(decisionOwners(p, s, { type: 'attacker', hero: human })).toEqual([]);
 });
 it('excludes defeated, absent and already-acted participants from ordering', () => {
  const s = battle('pvp'); s.battle!.acted.push(human);
  expect(decisionOwners(p, s, { type: 'attacker', hero: ally })).toEqual([ally]);
  expect(decisionOwners(p, s, { type: 'attacker', hero: human })).toEqual([]);
  s.battle!.defeated.push(ally);
  expect(decisionOwners(p, s, { type: 'attacker', hero: opponent })).toEqual([opponent, oppositeAlly]);
  expect(decisionOwners(p, s, { type: 'attacker', hero: DEFAULT_SETUP.roster[2] })).toEqual([]);
 });
 it('keeps all-bot attacker ordering automatic without including an opposing human', () => {
  const s = battle('pvp'), legal = legalActions(p, s);
  const commands = combatCandidates(p, view(s), legal, [human, ally], options);
  expect(commands.filter(c => c.type === 'attacker')).toHaveLength(2);
  expect(commands.every(c => botOwns(p, s, c, [human, ally]))).toBe(true);
 });
 it('lets a living human assign wounds to a bot ally without giving that choice to opponents', () => {
  const s = battle('pvp'); s.battle!.stage = 'wounds'; s.battle!.wounds.horde = 2;
  expect(decisionOwners(p, s, { type: 'wound', hero: ally })).toEqual([human, ally]);
  expect(botOwns(p, s, { type: 'wound', hero: ally }, [ally, opponent, oppositeAlly])).toBe(false);
  const legal = legalActions(p, s);
  expect(legal).toContainEqual({ type: 'wound', hero: ally });
  expect(combatCandidates(p, view(s), legal, [ally, opponent, oppositeAlly], options)).toEqual([]);
  expect(combatCandidates(p, view(s), legal, [human, ally], options).filter(c => c.type === 'wound')).toHaveLength(2);
 });
});
