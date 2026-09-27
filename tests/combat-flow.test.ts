import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle, chooseAttacker, stats } from '../src/rules/combat';
import { settleAutomatic } from '../src/rules/effects';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { bookkeepingCommand, combatAutomation, combatStep, rollSignature } from '../src/campaign/combat-flow';
import type { BattleStage, Command, State } from '../src/rules/model';

const hero = DEFAULT_SETUP.roster[0];
const options = { resolve: true, play: false, campaignAuto: false, difficulty: 'balanced' as const };
function battle(creature = 'murloc') {
 const s = createGame(p, DEFAULT_SETUP);
 s.enemies = [{ id: 'enemy', creature, color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', [hero], ['enemy'], 'horde', 'brill');
 chooseAttacker(p, s, hero); settleAutomatic(p, s);
 return s;
}
const auto = (s: State, bots: string[] = [], overrides = {}) => combatAutomation(p, view(s), legalActions(p, s), bots, { ...options, ...overrides });

describe('combat automation without bypassing player decisions', () => {
 it('waits for a human roll, but rolls for a bot without campaign-wide AI', () => {
  const s = battle(); expect(auto(s)).toBeUndefined(); expect(auto(s, [hero])).toBeDefined();
 });
 it('autoplay handles a player and pauses as soon as it is disabled', () => {
  const s = battle(); expect(auto(s, [], { play: true })).toBeDefined(); expect(auto(s, [], { resolve: false })).toBeUndefined();
 });
 it('never bypasses an optional ability, reroll, or choice of wound recipient', () => {
  const s = view(battle()); s.battle!.stage = 'reroll';
  const next: Command = { type: 'advance' };
  expect(bookkeepingCommand(s, [next, { type: 'reroll', dice: [0] }])).toBeUndefined();
  expect(bookkeepingCommand(s, [next, { type: 'ability', hero, card: 'printed-melee', ability: 'pool' }])).toBeUndefined();
  s.battle!.stage = 'wounds';
  expect(bookkeepingCommand(s, [{ type: 'wound', hero }, { type: 'wound', hero: DEFAULT_SETUP.roster[1] }])).toBeUndefined();
  expect(bookkeepingCommand(s, [{ type: 'wound', hero }])).toEqual({ type: 'wound', hero });
 });
 it('preserves the last healing and respawn window', () => {
  const s = view(battle()); s.respawns = [hero];
  expect(bookkeepingCommand(s, [{ type: 'advance' }])).toBeUndefined();
 });
 it('counts blue, red, armor and attrition once through the existing reducer', () => {
  let s = battle(); s.battle!.stage = 'tokens';
  const a = s.battle!.active!; a.threat = 5; a.attrition = 2; a.armor = 1;
  a.dice = [8, 5, 4, 7, 6, 1].map((value, id) => ({ id, value, color: id < 3 ? 'blue' : id < 5 ? 'red' : 'green', spotted: false, removed: false, rerolled: false }));
  expect(auto(s)).toEqual({ type: 'tokens' });
  s = apply(p, s, auto(s)!);
  expect(s.battle!.boxes.horde).toEqual({ damage: 2, defense: 2, armor: 1, attrition: 2 });
  expect(s.battle!.active).toBeUndefined(); expect(auto(s)?.type).toBe('advance');
 });
 it('ranged kills happen before enemy wounds', () => {
  let s = battle(); s.battle!.stage = 'defense'; delete s.battle!.active;
  s.battle!.boxes.horde.damage = stats(p, s, 'enemy').health;
  const health = s.heroes[0].health;
  s = apply(p, s, auto(s)!);
  expect(s.battle!.stage).toBe('over'); expect(s.heroes[0].health).toBe(health);
  expect(auto(s)).toBeUndefined(); expect(auto(s, [hero])).toBeUndefined();
  expect(auto(s, [hero], { campaignAuto: true })).toEqual({ type: 'closeBattle' });
 });
 it('red hits block wounds and remain available for resolution with attrition', () => {
  let s = battle('ogre'); s.battle!.stage = 'defense'; delete s.battle!.active;
  const attack = stats(p, s, 'enemy').attack;
  s.battle!.boxes.horde = { damage: 0, defense: attack, armor: 0, attrition: 2 };
  s = apply(p, s, auto(s)!);
  expect(s.battle!.stage).toBe('resolution'); expect(s.battle!.boxes.horde.defense).toBe(attack);
  expect(s.battle!.wounds.horde).toBe(0);
  s = apply(p, s, auto(s)!);
  expect(s.battle!.boxes.horde.defense).toBe(0); expect(s.battle!.boxes.horde.attrition).toBe(0);
 });
 it('finishes varied all-bot encounters using legal commands and stops at the result', () => {
  for (const creature of ['murloc', 'gnoll', 'spider', 'wraith', 'drake']) {
   let s = battle(creature), steps = 0;
   while (s.battle!.stage !== 'over' && steps++ < 300) {
    const command = auto(s, s.heroes.map(h => h.id));
    expect(command, `${creature}: ${s.battle!.stage}`).toBeDefined();
    s = apply(p, s, command!);
   }
   expect(s.battle!.stage).toBe('over'); expect(auto(s, s.heroes.map(h => h.id))).toBeUndefined();
  }
 });
 it('a same-value reroll animates again, while marking or removing a die does not', () => {
  const s = view(battle()); s.battle!.active!.dice = [{ id: 0, value: 3, color: 'red', rerolled: false, spotted: false, removed: false }];
  const before = rollSignature(s); s.battle!.active!.dice[0].rerolled = true;
  const after = rollSignature(s); expect(after).not.toBe(before);
  s.battle!.active!.dice[0].spotted = s.battle!.active!.dice[0].removed = true;
  expect(rollSignature(s)).toBe(after);
 });
 it.each(['attacker', 'pool', 'penalty', 'after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens', 'defense', 'wounds', 'resolution', 'round-end', 'over'] as BattleStage[])('shows a current timeline step for %s', stage => {
  expect(combatStep(stage)).toBeGreaterThanOrEqual(0); expect(combatStep(stage)).toBeLessThan(5);
 });
 it('places PvP resolution wounds in the correct step', () => expect(combatStep('wounds', 'round-end')).toBe(3));
});
