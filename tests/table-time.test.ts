import { describe, expect, it } from 'vitest';
import { DICE_REST_MS, DICE_STAGGER_MS, DICE_TOSS_MS, diceSettleMs, LIVE_BANK_BEATS, LIVE_BEATS, LIVE_CONTINUE_MS, LIVE_LIGHT_BEATS, LIVE_WOUND_MS, natural, readMs, thinkMs, TOKEN_STEP_MS, WALK_STEP_MS, walkMs } from '../src/campaign/table-time';
import { AUTO_CONTINUE_MS, AUTO_WOUND_MS, COMBAT_BEATS, COMBAT_STEP_MS, DICE_SETTLE_MS, LIGHT_BEATS } from '../src/campaign/combat-flow';
import { BOT_PAUSE_MS, botCombatDelay, RESULT_HOLD_MS } from '../src/campaign/bot-turns';
import type { BattleStage, Command } from '../src/rules/model';

/**
 * The time things take at a real table (campaign/table-time.ts). The request of 19. 11. 2026: "the game is still too fast;
 * actions and combat should be more natural, somewhat slower, closer to the game as it is played live".
 */
const STAGES: BattleStage[] = ['attacker', 'pool', 'penalty', 'after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens', 'defense', 'wounds', 'resolution', 'round-end', 'over'];

describe('a pause that is never twice the same', () => {
 it('stays within fifteen percent of its length and is the same for the same moment', () => {
  const seen = new Set<number>();
  for (let seed = 0; seed < 400; seed++) { const ms = natural(1000, seed); expect(ms).toBeGreaterThanOrEqual(850); expect(ms).toBeLessThanOrEqual(1150); seen.add(ms); expect(natural(1000, seed)).toBe(ms); }
  // A metronome would have one length; a table has many.
  expect(seen.size).toBeGreaterThan(15);
 });
});

describe('a bot’s look at the board before it moves', () => {
 const travel: Command = { type: 'travel', hero: 'x', path: ['a'] }, challenge: Command = { type: 'challenge', hero: 'x', target: 'e', allies: [] }, rest: Command = { type: 'rest', hero: 'x', health: 1 };
 it('is longer before a fight than before a rest', () => {
  for (let seed = 0; seed < 50; seed++) expect(thinkMs(challenge, seed)!).toBeGreaterThan(thinkMs(rest, seed)!);
  expect(thinkMs(travel, 3)).toBeGreaterThanOrEqual(1000);
 });
 it('is not taken before bookkeeping', () => {
  expect(thinkMs({ type: 'endActions' }, 1)).toBeUndefined();
  expect(thinkMs({ type: 'endManagement' }, 1)).toBeUndefined();
  expect(thinkMs({ type: 'manage', hero: 'x', slots: [] } as unknown as Command, 1)).toBeUndefined();
 });
 it('follows a pause after the move before', () => { expect(BOT_PAUSE_MS).toBeGreaterThan(550); });
});

describe('a figure on its way', () => {
 it('is walked one region at a time, and its announcement lasts as long as the walk', () => {
  expect(walkMs(2)).toBe(2 * WALK_STEP_MS);
  expect(WALK_STEP_MS).toBeGreaterThanOrEqual(500);
 });
});

describe('a fight between bots', () => {
 it('gives every step more time than the flat step it had', () => {
  for (const stage of STAGES) for (let seed = 0; seed < 20; seed++) expect(readMs(stage, seed)).toBeGreaterThan(COMBAT_STEP_MS);
 });
 it('gives the most time to what has to be read: the roll, the opponents’ strike, the outcome', () => {
  const mid = (stage: BattleStage) => readMs(stage, 0) / natural(1000, 0);
  expect(mid('after-pool')).toBeGreaterThan(mid('reroll'));
  expect(mid('defense')).toBeGreaterThan(mid('tokens'));
  expect(mid('over')).toBeGreaterThan(mid('after-pool'));
  expect(readMs('over', 0)).toBeGreaterThan(RESULT_HOLD_MS);
 });
 it('only nods at a step with nothing to decide, but never at the roll or the outcome', () => {
  for (const stage of ['reroll', 'after-reroll', 'defense', 'resolution', 'round-end'] as const) expect(readMs(stage, 7, true)).toBeLessThan(readMs(stage, 7));
  expect(readMs('after-pool', 7, true)).toBe(readMs('after-pool', 7));
  expect(readMs('over', 7, true)).toBe(readMs('over', 7));
 });
 it('takes the step’s reading time in place of the flat step, at the table’s pace', () => {
  const advance: Command = { type: 'advance' }, close: Command = { type: 'closeBattle' };
  expect(botCombatDelay([advance], COMBAT_STEP_MS, 1, false, 2000)).toBe(2000);
  expect(botCombatDelay([advance], COMBAT_STEP_MS, 1.5, false, 2000)).toBe(3000);
  expect(botCombatDelay([close], COMBAT_STEP_MS, 1, false, 4200)).toBe(4200);
  // Step by step the result still waits to be closed; with the pace off the old times stand.
  expect(botCombatDelay([close], COMBAT_STEP_MS, 1, true, 4200)).toBeUndefined();
  expect(botCombatDelay([advance], COMBAT_STEP_MS, 1, false)).toBe(COMBAT_STEP_MS);
  expect(botCombatDelay([close], COMBAT_STEP_MS, 1, false)).toBe(RESULT_HOLD_MS);
 });
});

describe('the dice', () => {
 it('land one after another, so more dice take longer to come to rest', () => {
  expect(diceSettleMs(1)).toBe(DICE_TOSS_MS + DICE_REST_MS);
  expect(diceSettleMs(4)).toBe(DICE_TOSS_MS + 3 * DICE_STAGGER_MS + DICE_REST_MS);
  expect(diceSettleMs(7)).toBeGreaterThan(diceSettleMs(3));
  // A handful of dice is not waited for without end.
  expect(diceSettleMs(40)).toBe(diceSettleMs(12));
  expect(diceSettleMs(2)).toBeGreaterThan(DICE_SETTLE_MS);
 });
});

describe('an exchange of blows', () => {
 it('is held longer than it was, and its outcome longest', () => {
  expect(LIVE_BEATS.complete).toBeGreaterThan(COMBAT_BEATS.complete);
  expect(LIVE_BEATS.complete - LIVE_BEATS.impact).toBeGreaterThan(COMBAT_BEATS.complete - COMBAT_BEATS.impact);
  for (const beats of [LIVE_BEATS, LIVE_BANK_BEATS, LIVE_LIGHT_BEATS]) { expect(beats.action).toBeLessThan(beats.impact); expect(beats.impact).toBeLessThan(beats.recovery); expect(beats.recovery).toBeLessThan(beats.complete); }
 });
 it('is shorter for tokens laid down than for a blow, and shortest for a flourish', () => {
  expect(LIVE_BANK_BEATS.complete).toBeLessThan(LIVE_BEATS.complete);
  expect(LIVE_LIGHT_BEATS.complete).toBeLessThan(LIVE_BANK_BEATS.complete);
  expect(LIVE_LIGHT_BEATS.complete).toBeGreaterThan(LIGHT_BEATS.complete);
 });
 it('leaves the player’s own bookkeeping step up longer before it continues', () => {
  expect(LIVE_CONTINUE_MS).toBeGreaterThan(AUTO_CONTINUE_MS);
  expect(LIVE_WOUND_MS).toBeGreaterThan(AUTO_WOUND_MS);
  expect(TOKEN_STEP_MS).toBeGreaterThan(25);
 });
});
