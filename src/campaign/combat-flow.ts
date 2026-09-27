import { decide, type Difficulty } from '../ai/planner';
import { botOwns } from '../multiplayer/ownership';
import type { BattleStage, Command, ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';

export const DICE_SETTLE_MS = 1250;
export const COMBAT_STEP_MS = 750;

export const combatSteps = ['Prepare', 'Roll & abilities', 'Ranged & defense', 'Melee & attrition', 'Outcome'];
export function combatStep(stage: BattleStage, afterWounds?: 'resolution' | 'round-end') {
 if (['attacker', 'pool', 'penalty'].includes(stage)) return 0;
 if (['after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens'].includes(stage)) return 1;
 if (stage === 'defense' || (stage === 'wounds' && afterWounds !== 'round-end')) return 2;
 return stage === 'over' ? 4 : 3;
}

/** Only advances bookkeeping with a single legal outcome. Tactical choices stay visible. */
export function bookkeepingCommand(state: GameView, legal: Command[]): Command | undefined {
 const battle = state.battle;
 if (state.phase !== 'combat' || !battle || battle.stage === 'over' || state.respawns.length) return;
 if (legal.some(c => c.type === 'ability' || c.type === 'reroll' || c.type === 'talent')) return;
 if (legal.length !== 1) return;
 const command = legal[0];
 if (['attacker', 'advance', 'tokens', 'monster', 'wound', 'armor', 'penalty'].includes(command.type)) return command;
}

export function combatAutomation(p: ContentPack, state: GameView, legal: Command[], bots: string[], options: {
 resolve: boolean; play: boolean; campaignAuto: boolean; difficulty: Difficulty;
}): Command | undefined {
 if (state.phase !== 'combat' || !state.battle) return;
 // Hold the result until acknowledged. Campaign-wide AI may continue an all-bot battle.
 if (state.battle.stage === 'over') {
  return options.campaignAuto ? decide(p, state, legal.filter(c => botOwns(p, state, c, bots)), options.difficulty)?.command : undefined;
 }
 if (options.play) return decide(p, state, legal, options.difficulty)?.command;
 if (!options.resolve) return;
 const human = legal.filter(c => !botOwns(p, state, c, bots));
 if (human.length) return bookkeepingCommand(state, human);
 return decide(p, state, legal, options.difficulty)?.command;
}

/** A reroll that lands on the same value still has a new signature. Removal/Spot does not roll again. */
export function rollSignature(state: GameView) {
 const b = state.battle, a = b?.active;
 if (state.phase !== 'combat' || !a || !a.dice.some(d => d.value > 0)) return '';
 return `${b!.round}:${a.heroId}:${a.dice.filter(d => d.value > 0).map(d => `${d.id}:${d.value}:${Number(d.rerolled)}`).join('|')}`;
}
