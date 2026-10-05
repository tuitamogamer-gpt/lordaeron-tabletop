import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle, chooseAttacker, stats } from '../src/rules/combat';
import { settleAutomatic } from '../src/rules/effects';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { bookkeepingStep, combatCandidates, combatAutomation, combatCue, combatStep, rollSignature } from '../src/campaign/combat-flow';
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
 it('never hands a human to AI, even through the obsolete autoplay option', () => {
  const s = battle(); expect(auto(s, [], { play: true })).toBeUndefined(); expect(auto(s, [], { campaignAuto: true })).toBeUndefined(); expect(auto(s, [hero], { resolve: false })).toBeUndefined();
 });
 it('re-evaluates bot eligibility when a player takes control during combat', () => {
  const s = battle(), legal = legalActions(p, s);
  expect(combatCandidates(p, view(s), legal, [hero], options).length).toBeGreaterThan(0);
  expect(combatCandidates(p, view(s), legal, [], options)).toEqual([]);
 });
 it('never bypasses an optional ability, reroll, or a single wound recipient', () => {
  const s = view(battle()); s.battle!.stage = 'reroll';
  const next: Command = { type: 'advance' };
  const candidates = (legal: Command[]) => combatCandidates(p, s, legal, [], options);
  expect(candidates([next, { type: 'reroll', dice: [0] }])).toEqual([]);
  expect(candidates([next, { type: 'ability', hero, card: 'printed-melee', ability: 'pool' }])).toEqual([]);
  s.battle!.stage = 'wounds';
  expect(candidates([{ type: 'wound', hero }, { type: 'wound', hero: DEFAULT_SETUP.roster[1] }])).toEqual([]);
  expect(candidates([{ type: 'wound', hero }])).toEqual([]);
 });
 it('preserves the last healing and respawn window', () => {
  const s = view(battle()); s.respawns = [hero];
  expect(combatCandidates(p, s, [{ type: 'advance' }], [], options)).toEqual([]);
 });
 it.each([
  ['attacker', { type: 'attacker', hero }],
  ['pool', { type: 'roll' }],
  ['penalty', { type: 'penalty', dice: [0] }],
  ['after-pool', { type: 'advance' }],
  ['reroll', { type: 'advance' }],
  ['after-reroll', { type: 'monster' }],
  ['tokens', { type: 'tokens' }],
  ['after-tokens', { type: 'advance' }],
  ['defense', { type: 'advance' }],
  ['wounds', { type: 'wound', hero }],
  ['resolution', { type: 'advance' }],
  ['round-end', { type: 'advance' }],
  ['over', { type: 'closeBattle' }],
 ] as [BattleStage, Command][])('waits for human confirmation at %s even when there is one command', (stage, command) => {
  const s = view(battle()); s.battle!.stage = stage;
  expect(combatCandidates(p, s, [command], [], { ...options, play: true, campaignAuto: true })).toEqual([]);
 });
 it('pauses a bot for a human reaction, and resumes one move only after an explicit pass', () => {
  const s = view(battle()), responder = DEFAULT_SETUP.roster[1];
  const roll: Command = { type: 'roll' }, reaction: Command = { type: 'ability', hero: responder, card: 'friendly-power', ability: 'response' };
  expect(combatCandidates(p, s, [roll, reaction], [hero], options)).toEqual([]);
  expect(combatCandidates(p, s, [roll, reaction], [hero], { ...options, humanResponsePassed: true })).toEqual([roll]);
  expect(combatCandidates(p, s, [roll, reaction], [hero], options)).toEqual([]);
  expect(combatCandidates(p, s, [roll, reaction], [], { ...options, humanResponsePassed: true })).toEqual([]);
 });
 it('cannot pass a shared faction choice or attacker selection to a bot', () => {
  const s = view(battle()), partner = DEFAULT_SETUP.roster[1]; s.battle!.participants.push(partner);
  const optionsPassed = { ...options, humanResponsePassed: true };
  s.battle!.stage = 'attacker';
  expect(combatCandidates(p, s, [{ type: 'attacker', hero }, { type: 'attacker', hero: partner }], [hero], optionsPassed)).toEqual([]);
  s.battle!.stage = 'defense'; delete s.battle!.active;
  expect(combatCandidates(p, s, [{ type: 'advance' }], [hero], optionsPassed)).toEqual([]);
 });
 it('lets bots choose their PvP loot while preserving the final acknowledgment', () => {
  const s = view(battle()), opponent = DEFAULT_SETUP.roster[3];
  s.battle!.stage = 'over'; s.battle!.kind = 'pvp'; s.battle!.participants.push(opponent); s.battle!.defeated.push(opponent);
  const loot: Command = { type: 'loot', hero, from: opponent, card: 'trophy' };
  const close: Command = { type: 'closeBattle' };
  expect(combatCandidates(p, s, [loot, close], [hero, opponent], options)).toEqual([loot]);
  expect(combatCandidates(p, s, [close], [hero, opponent], options)).toEqual([]);
  expect(combatCandidates(p, s, [loot, close], [opponent], options)).toEqual([]);
 });
 it('counts blue, red, armor and attrition once through the existing reducer', () => {
  let s = battle(); s.battle!.stage = 'tokens';
  const a = s.battle!.active!; a.threat = 5; a.attrition = 2; a.armor = 1;
  a.dice = [8, 5, 4, 7, 6, 1].map((value, id) => ({ id, value, color: id < 3 ? 'blue' : id < 5 ? 'red' : 'green', spotted: false, removed: false, rerolled: false }));
  expect(auto(s)).toBeUndefined();
  s = apply(p, s, { type: 'tokens' });
  expect(s.battle!.boxes.horde).toEqual({ damage: 2, defense: 2, armor: 1, attrition: 2 });
  expect(s.battle!.active).toBeUndefined(); expect(auto(s)).toBeUndefined();
 });
 it('ranged kills happen before enemy wounds', () => {
  let s = battle(); s.battle!.stage = 'defense'; delete s.battle!.active;
  s.battle!.boxes.horde.damage = stats(p, s, 'enemy').health;
  const health = s.heroes[0].health;
  s = apply(p, s, { type: 'advance' });
  expect(s.battle!.stage).toBe('over'); expect(s.heroes[0].health).toBe(health);
  expect(auto(s)).toBeUndefined(); expect(auto(s, [hero])).toBeUndefined();
  expect(auto(s, [hero], { campaignAuto: true })).toEqual({ type: 'closeBattle' });
 });
 it('red hits block wounds and remain available for resolution with attrition', () => {
  let s = battle('ogre'); s.battle!.stage = 'defense'; delete s.battle!.active;
  const attack = stats(p, s, 'enemy').attack;
  s.battle!.boxes.horde = { damage: 0, defense: attack, armor: 0, attrition: 2 };
  s = apply(p, s, { type: 'advance' });
  expect(s.battle!.stage).toBe('resolution'); expect(s.battle!.boxes.horde.defense).toBe(attack);
  expect(s.battle!.wounds.horde).toBe(0);
  s = apply(p, s, { type: 'advance' });
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
 it('describes a ranged defeat without changing the authoritative outcome', () => {
  const s = battle(); s.battle!.stage = 'defense'; delete s.battle!.active;
  s.battle!.boxes.horde.damage = stats(p, s, 'enemy').health;
  const before = view(s), next = apply(p, s, { type: 'advance' }), after = view(next);
  const snapshot = JSON.stringify([before, after]);
  const cue = combatCue(before, after);
  expect(cue?.kind).toBe('ranged'); expect(cue?.detail).toContain('1 enemy falls');
  expect(cue?.before.battle?.stage).toBe('defense'); expect(after.battle?.stage).toBe('over');
  expect(JSON.stringify([before, after])).toBe(snapshot);
 });
 it('leaves simple bookkeeping unanimated so a reroll choice stays responsive', () => {
  const s = battle(); s.battle!.stage = 'after-pool';
  const next = apply(p, s, { type: 'advance' });
  expect(next.battle!.stage).toBe('reroll'); expect(combatCue(view(s), view(next))).toBeUndefined();
 });
});

describe('automatic continuation of bookkeeping steps', () => {
 const advance: Command = { type: 'advance' }, wound: Command = { type: 'wound', hero };
 const at = (stage: BattleStage) => { const s = view(battle()); s.battle!.stage = stage; return s; };
 it('continues the only legal advance, token placement, creature effect or lone attacker', () => {
  expect(bookkeepingStep(at('after-pool'), [advance], [advance], false)).toEqual(advance);
  const tokens: Command = { type: 'tokens' }, monster: Command = { type: 'monster' }, attacker: Command = { type: 'attacker', hero };
  expect(bookkeepingStep(at('tokens'), [tokens], [tokens], false)).toEqual(tokens);
  expect(bookkeepingStep(at('after-reroll'), [monster], [monster], false)).toEqual(monster);
  expect(bookkeepingStep(at('attacker'), [attacker], [attacker], false)).toEqual(attacker);
  expect(bookkeepingStep(at('wounds'), [wound], [wound], false)).toEqual(wound);
 });
 it('never continues a roll, a reroll choice, an ability window, the outcome or a shared choice', () => {
  const roll: Command = { type: 'roll' }, reroll: Command = { type: 'reroll', dice: [0] }, ability: Command = { type: 'ability', hero, card: 'printed-melee', ability: 'pool' };
  expect(bookkeepingStep(at('pool'), [roll], [roll], false)).toBeUndefined();
  expect(bookkeepingStep(at('reroll'), [advance, reroll], [advance, reroll], false)).toBeUndefined();
  expect(bookkeepingStep(at('after-pool'), [advance, ability], [advance, ability], false)).toBeUndefined();
  expect(bookkeepingStep(at('over'), [{ type: 'closeBattle' }], [{ type: 'closeBattle' }], false)).toBeUndefined();
  const allyWound: Command = { type: 'wound', hero: DEFAULT_SETUP.roster[1] };
  expect(bookkeepingStep(at('wounds'), [wound], [wound, allyWound], false)).toBeUndefined();
  expect(bookkeepingStep(at('wounds'), [wound, allyWound], [wound, allyWound], false)).toBeUndefined();
 });
 it('yields to a pending bot move, to bot-owned steps and to phases outside combat', () => {
  expect(bookkeepingStep(at('after-pool'), [advance], [advance], true)).toBeUndefined();
  expect(bookkeepingStep(at('after-pool'), [], [advance], false)).toBeUndefined();
  const s = view(createGame(p, DEFAULT_SETUP));
  expect(bookkeepingStep(s, [advance], [advance], false)).toBeUndefined();
 });
});
