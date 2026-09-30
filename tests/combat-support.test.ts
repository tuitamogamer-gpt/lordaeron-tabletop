import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle, chooseAttacker } from '../src/rules/combat';
import { healthLoss, settleAutomatic } from '../src/rules/effects';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { combatAutomation, combatCandidates } from '../src/campaign/combat-flow';
import { decisionOwners } from '../src/multiplayer/ownership';
import { decide } from '../src/ai/planner';

const options = { resolve: true, campaignAuto: false, difficulty: 'balanced' as const };
function supportedBattle(power = 'priest-power-word-shield') {
 const priest = p.characters.find(c => c.classId === 'priest' && c.faction === 'horde')!;
 const roster = [...DEFAULT_SETUP.roster]; roster[2] = priest.id;
 const s = createGame(p, { ...DEFAULT_SETUP, roster });
 const human = s.heroes[0], bot = s.heroes[2];
 bot.level = 2; bot.energy = 6; bot.learned = [power]; bot.slots[1].card = power;
 s.enemies = [{ id: 'enemy', creature: 'murloc', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', [human.id, bot.id], ['enemy'], 'horde', 'brill');
 chooseAttacker(p, s, human.id); settleAutomatic(p, s);
 return { s, human, bot };
}

describe('bot support while a human chooses', () => {
 it('lets a priest cast Power Word: Shield without choosing the human roll or spending human energy', () => {
  const { s, human, bot } = supportedBattle(), legal = legalActions(p, s), before = JSON.stringify(s);
  const candidates = combatCandidates(p, view(s), legal, [bot.id], options);
  expect(candidates).toEqual([{ type: 'ability', hero: bot.id, card: 'priest-power-word-shield', ability: 'pool', args: {} }]);
  expect(JSON.stringify(s)).toBe(before);
  const next = apply(p, s, combatAutomation(p, view(s), legal, [bot.id], options)!);
  expect(next.heroes[0].energy).toBe(human.energy);
  expect(next.heroes[2].energy).toBe(bot.energy - 1);
  expect(next.battle!.stage).toBe('pool'); expect(next.battle!.active!.heroId).toBe(human.id);
  expect(next.battle!.active!.dice.filter(d => d.color === 'green')).toHaveLength(s.battle!.active!.dice.filter(d => d.color === 'green').length + 2);
  expect(legalActions(p, next)).toContainEqual({ type: 'roll' });
  expect(combatAutomation(p, view(next), legalActions(p, next), [bot.id], options)).toBeUndefined();
 });
 it('allows bot healing during shared wound assignment but never lets the bot assign those wounds', () => {
  const { s, human, bot } = supportedBattle('priest-lesser-heal');
  s.battle!.stage = 'wounds'; delete s.battle!.active;
  s.battle!.wounds.horde = 3; s.battle!.afterWounds = 'resolution'; human.health = 4; healthLoss(s, human, 3);
  const legal = legalActions(p, s), candidates = combatCandidates(p, view(s), legal, [bot.id], options);
  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates.every(c => c.type === 'ability' && c.hero === bot.id)).toBe(true);
  expect(decisionOwners(p, s, { type: 'wound', hero: bot.id })).toContain(human.id);
  const next = apply(p, s, combatAutomation(p, view(s), legal, [bot.id], options)!);
  expect(next.heroes[0].health).toBe(3); expect(next.battle!.stage).toBe('wounds'); expect(next.battle!.wounds.horde).toBe(3);
  expect(legalActions(p, next)).toContainEqual({ type: 'wound', hero: bot.id });
  expect(legalActions(p, next)).toContainEqual({ type: 'wound', hero: human.id });
  expect(combatAutomation(p, view(next), legalActions(p, next), [bot.id], options)).toBeUndefined();
 });
 it('declines a wasteful support cast when the human already has seven green dice', () => {
  const { s, bot } = supportedBattle();
  s.battle!.active!.dice = Array.from({ length: 7 }, (_, id) => ({ id, color: 'green', value: 0, removed: false, spotted: false, rerolled: false }));
  const legal = legalActions(p, s);
  expect(legal.some(c => c.type === 'ability' && c.card === 'priest-power-word-shield')).toBe(true);
  expect(combatCandidates(p, view(s), legal, [bot.id], options)).toEqual([]);
 });
 it('lets Lesser Heal save a zero-health player without choosing their respawn or advancing the wound step', () => {
  const { s, human, bot } = supportedBattle('priest-lesser-heal');
  s.battle!.stage = 'wounds'; delete s.battle!.active;
  s.battle!.wounds.horde = 3; s.battle!.afterWounds = 'resolution'; human.health = 2; healthLoss(s, human, 2);
  const legal = legalActions(p, s);
  expect(human.health).toBe(0); expect(s.respawns).toContain(human.id);
  expect(legal.some(c => c.type === 'respawn' && c.hero === human.id)).toBe(true);
  const command = combatAutomation(p, view(s), legal, [bot.id], options);
  expect(command).toMatchObject({ type: 'ability', hero: bot.id, card: 'priest-lesser-heal', args: { target: human.id } });
  const next = apply(p, s, command!);
  expect(next.heroes[0].health).toBe(2); expect(next.heroes[0].location).toBe(human.location);
  expect(next.respawns).not.toContain(human.id); expect(next.battle!.defeated).not.toContain(human.id);
  expect(next.phase).toBe('combat'); expect(next.battle!.stage).toBe('wounds'); expect(next.battle!.round).toBe(s.battle!.round);
  expect(next.battle!.wounds.horde).toBe(3);
  expect(combatAutomation(p, view(next), legalActions(p, next), [bot.id], options)).toBeUndefined();
 });
 it('does not treat Resurrection, which defeats and revives the player, as simple lifesaving healing', () => {
  const { s, human, bot } = supportedBattle('priest-resurrection'); bot.level = 4;
  s.battle!.stage = 'wounds'; delete s.battle!.active;
  s.battle!.wounds.horde = 3; s.battle!.afterWounds = 'resolution'; human.health = 2; healthLoss(s, human, 2);
  const legal = legalActions(p, s), revives = legal.filter(c => c.type === 'ability' && c.hero === bot.id);
  expect(revives.length).toBeGreaterThan(0);
  expect(decide(p, view(s), revives)?.score).toBeGreaterThan(0);
  const revived = apply(p, s, revives[0]);
  expect(revived.battle!.defeated).toContain(human.id);
  expect(combatCandidates(p, view(s), legal, [bot.id], options)).toEqual([]);
 });
 it('keeps support paused when bot automation is off', () => {
  const { s, bot } = supportedBattle();
  expect(combatCandidates(p, view(s), legalActions(p, s), [bot.id], { ...options, resolve: false })).toEqual([]);
 });
});
