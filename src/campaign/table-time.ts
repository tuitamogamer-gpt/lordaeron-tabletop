import type { BattleStage, Command } from '../rules/model';

/**
 * How long things take when people play at a table.
 *
 * The digital table used to answer at the speed of a script: a bot's figure was in its new region half a second after the
 * last one moved, a fight between bots went by at one step a second, and seven dice came to rest in the same instant. At a
 * real table a player looks at the board before he reaches for his figure, walks it over the regions one at a time, drops
 * his dice and counts them, and the others read the roll before anything is done with it. The times below are those
 * pauses. They are the table's pace "Normal"; the other paces scale them (stage.ts > PACES), and with the pace "Off"
 * none of them applies and the table answers as it used to.
 */

/** A pause that is never twice the same: between 85% and 115% of `ms`, fixed by `seed` so that a replay keeps its rhythm. */
export function natural(ms: number, seed: number): number {
 const mixed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
 return Math.round(ms * (.85 + (mixed % 31) / 100));
}

/** How long a bot looks at the board before each kind of move (ms). Moves that are not listed are bookkeeping and get no pause. */
const THINK: Partial<Record<Command['type'], number>> = {
 travel: 1200, rest: 1000, train: 1500, town: 1600, challenge: 1900, 'power-action': 1200, portal: 1300, summon: 1300,
 reward: 1500, talent: 1500, 'event-choice': 1400, respawn: 900,
};
export const thinkMs = (c: Command, seed: number): number | undefined => THINK[c.type] === undefined ? undefined : natural(THINK[c.type]!, seed);

/** A figure is walked over the board one region at a time (ms for each region). */
export const WALK_STEP_MS = 600;
/** What a journey of `regions` regions adds to the time its announcement stays up. */
export const walkMs = (regions: number) => regions * WALK_STEP_MS;

/**
 * How long the table looks at a step of a fight before a bot goes on (ms). What takes reading takes longer: the dice that
 * have just landed, the totals before the opponent strikes, the round's outcome.
 */
const READ: Record<BattleStage, number> = {
 attacker: 1300, pool: 1400, penalty: 1300, 'after-pool': 2600, reroll: 1600, 'after-reroll': 1200, tokens: 1400, 'after-tokens': 1100,
 defense: 2400, wounds: 1500, resolution: 2200, 'round-end': 1700, over: 4200,
};
/** A step with nothing to decide and nothing new to read (results kept, a phase passed) is only a nod. */
const NOD_MS = 700;
export const readMs = (stage: BattleStage, seed: number, nod = false) => natural(nod && stage !== 'after-pool' && stage !== 'over' ? Math.min(NOD_MS, READ[stage]) : READ[stage], seed);

/** Dice do not land together: each comes to rest a little after the one before it (ms between two dice). */
export const DICE_STAGGER_MS = 130;
/** The tumble of one die, and how long the roll is left alone once the last one lies still (ms). */
export const DICE_TOSS_MS = 1400, DICE_REST_MS = 450;
/** How long a roll of `count` dice takes to come to rest. */
export const diceSettleMs = (count: number) => DICE_TOSS_MS + Math.max(0, Math.min(count, 12) - 1) * DICE_STAGGER_MS + DICE_REST_MS;

/** Tokens are counted into the Combat Area one after another (ms between two tokens). */
export const TOKEN_STEP_MS = 150;

/** An exchange of blows: the wind-up, the blow, and its outcome held long enough to be read (ms from its start). */
export const LIVE_BEATS = { action: 560, impact: 1300, recovery: 2300, complete: 3200 } as const;
/** Hits laid into the Combat Area: nothing is struck yet, the tokens are counted out. */
export const LIVE_BANK_BEATS = { action: 320, impact: 760, recovery: 1350, complete: 1900 } as const;
/** A power played, a new attacker, one wound of several: a short flourish. */
export const LIVE_LIGHT_BEATS = { action: 160, impact: 380, recovery: 720, complete: 1000 } as const;
/** A player's own bookkeeping step, and a wound that can only fall on one character, before they continue by themselves (ms). */
export const LIVE_CONTINUE_MS = 1400, LIVE_WOUND_MS = 800;
/**
 * How long a player's own step with a single way on stays before it continues by itself. The roll is looked at once, when
 * the dice have landed; the steps after it that change nothing on the table (results kept, no rule to resolve) are only a
 * nod, so that four empty steps do not take five seconds; the totals before a blow is struck are given time to be read.
 */
export function continueMs(stage: BattleStage, type: Command['type']): number {
 if (type === 'wound') return LIVE_WOUND_MS;
 if (stage === 'after-pool') return LIVE_CONTINUE_MS;
 if (stage === 'defense' || stage === 'resolution') return 1900;
 if (stage === 'round-end') return 1500;
 return type === 'advance' ? 450 : 900;
}
