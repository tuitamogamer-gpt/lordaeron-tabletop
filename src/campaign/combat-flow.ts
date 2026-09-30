import { useEffect, useRef, useState } from 'react';
import { decide, type Difficulty } from '../ai/planner';
import { BASE_PACK } from '../data/base';
import { character, faction } from '../rules/common';
import { botOwns } from '../multiplayer/ownership';
import type { BattleStage, Command, ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';

export const DICE_SETTLE_MS = 1350;
export const COMBAT_STEP_MS = 750;
export const COMBAT_BEATS = { action: 420, impact: 980, recovery: 1600, complete: 2200 } as const;
export const REDUCED_COMBAT_MS = 180;
export type CombatCue = {
 key: number;
 kind: 'prepare' | 'ranged' | 'melee' | 'defend' | 'hurt' | 'heal' | 'bank' | 'power';
 title: string;
 anticipation: string;
 detail: string;
 heroId?: string;
 before: GameView;
};
export type CombatPresentation = {
 cue?: CombatCue;
 phase: 'idle' | 'anticipation' | 'action' | 'impact' | 'recovery';
 busy: boolean;
};

/** Describe reducer results without changing, predicting or replaying game rules. */
export function combatCue(before: GameView, after: GameView): CombatCue | undefined {
 const old = before.battle, battle = after.battle;
 if (before.phase !== 'combat' || after.phase !== 'combat' || !old || !battle || before.revision === after.revision) return;
 const actor = battle.active ?? old.active;
 const heroId = actor?.heroId ?? battle.participants.find(id => !battle.defeated.includes(id)) ?? battle.participants[0];
 const side = heroId ? faction(BASE_PACK, heroId) : battle.first;
 const name = (id: string) => character(BASE_PACK, id).name.split(' ')[0];
 const make = (kind: CombatCue['kind'], title: string, anticipation: string, detail: string, hero = heroId): CombatCue => ({ key: after.revision, kind, title, anticipation, detail, heroId: hero, before });
 const kills = Math.max(0, (battle.killed?.length ?? 0) - (old.killed?.length ?? 0));
 const defeated = kills ? `${kills} ${kills === 1 ? 'enemy falls' : 'enemies fall'}` : '';
 const health = battle.participants.map(id => ({ id, delta: (after.heroes.find(h => h.id === id)?.health ?? 0) - (before.heroes.find(h => h.id === id)?.health ?? 0) })).filter(h => h.delta);
 if (health.length) {
  const hurt = health.find(h => h.delta < 0), target = hurt ?? health[0];
  return make(hurt ? 'hurt' : 'heal', hurt ? 'Enemy strike' : 'Restoring strength', hurt ? 'Brace for impact' : 'Gathering restorative energy', health.map(h => `${name(h.id)} ${h.delta > 0 ? '+' : '−'}${Math.abs(h.delta)} health`).join(' · '), target.id);
 }
 if (old.stage === 'defense' && battle.stage !== 'defense') {
  const ranged = old.boxes[side].damage > 0;
  const wounds = battle.wounds[side];
  return make(ranged ? 'ranged' : 'defend', ranged ? 'Ranged volley' : 'Hold the line', ranged ? 'Taking aim' : 'Shields at the ready', [defeated, wounds > 0 ? `${wounds} ${wounds === 1 ? 'wound' : 'wounds'} to assign` : battle.stage === 'over' ? 'The encounter is decided' : 'The party holds its ground'].filter(Boolean).join(' · '));
 }
 if (old.stage === 'resolution' && battle.stage !== 'resolution') return make('melee', 'Melee & attrition', 'Closing the distance', defeated || (battle.stage === 'over' ? 'The final exchange decides the battle' : 'Damage carries into the next round'));
 if (kills) return make('ranged', 'A decisive strike', 'Finding an opening', defeated);
 const total = battle.boxes[side], previous = old.boxes[side];
 const gained = total.damage + total.defense + total.armor + total.attrition - previous.damage - previous.defense - previous.armor - previous.attrition;
 if (gained > 0) return make('bank', 'Hits secured', 'Gathering your successes', `+${gained} to the shared battle pool`);
 if (battle.active && old.active?.heroId === battle.active.heroId && battle.active.used.length > old.active.used.length) return make('power', 'Power unleashed', `${name(battle.active.heroId)} channels a power`, 'The ability takes effect');
 if (battle.active && battle.active.heroId !== old.active?.heroId) return make('prepare', `${name(battle.active.heroId)} steps forward`, 'A new attacker takes position', 'Choose your powers, then roll');
}

/** Shared with automation so no decision can overtake a visible combat beat. */
export function useCombatPresentation(state: GameView): CombatPresentation {
 const previous = useRef(state);
 const [cue, setCue] = useState<CombatCue>();
 const [phase, setPhase] = useState<CombatPresentation['phase']>('idle');
 const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 useEffect(() => {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!media) return;
  const change = () => setReducedMotion(media.matches);
  media.addEventListener?.('change', change);
  return () => media.removeEventListener?.('change', change);
 }, []);
 useEffect(() => {
  const before = previous.current; previous.current = state;
  if (before.revision === state.revision && before.phase === state.phase) return;
  const next = combatCue(before, state);
  setCue(next); setPhase(next ? 'anticipation' : 'idle');
 }, [state.revision, state.phase]);
 useEffect(() => {
  if (!cue) return;
  const finish = () => { setCue(undefined); setPhase('idle'); };
  if (reducedMotion) {
   setPhase('impact');
   const timer = setTimeout(finish, REDUCED_COMBAT_MS);
   return () => clearTimeout(timer);
  }
  setPhase('anticipation');
  const timers = [setTimeout(() => setPhase('action'), COMBAT_BEATS.action), setTimeout(() => setPhase('impact'), COMBAT_BEATS.impact), setTimeout(() => setPhase('recovery'), COMBAT_BEATS.recovery), setTimeout(finish, COMBAT_BEATS.complete)];
  return () => timers.forEach(clearTimeout);
 }, [cue, reducedMotion]);
 return { cue, phase, busy: !!cue };
}

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

export function combatCandidates(p: ContentPack, state: GameView, legal: Command[], bots: string[], options: {
 resolve: boolean; play: boolean; campaignAuto: boolean; difficulty: Difficulty;
}): Command[] {
 if (state.phase !== 'combat' || !state.battle) return [];
 // Hold the result until acknowledged. Campaign-wide AI may continue an all-bot battle.
 if (state.battle.stage === 'over') {
  return options.campaignAuto ? legal.filter(c => botOwns(p, state, c, bots)) : [];
 }
 if (options.play) return legal;
 if (!options.resolve) return [];
 const human = legal.filter(c => !botOwns(p, state, c, bots));
 if (human.length) {const command=bookkeepingCommand(state,human);return command?[command]:[];}
 return legal;
}
export function combatAutomation(p:ContentPack,state:GameView,legal:Command[],bots:string[],options:{resolve:boolean;play:boolean;campaignAuto:boolean;difficulty:Difficulty}):Command|undefined{
 const candidates=combatCandidates(p,state,legal,bots,options);
 return candidates.length===1?candidates[0]:decide(p,state,candidates,options.difficulty)?.command;
}

/** A reroll that lands on the same value still has a new signature. Removal/Spot does not roll again. */
export function rollSignature(state: GameView) {
 const b = state.battle, a = b?.active;
 if (state.phase !== 'combat' || !a || !a.dice.some(d => d.value > 0)) return '';
 return `${b!.round}:${a.heroId}:${a.dice.filter(d => d.value > 0).map(d => `${d.id}:${d.value}:${Number(d.rerolled)}`).join('|')}`;
}
