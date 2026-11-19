import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { decide, type Difficulty } from '../ai/planner';
import { publicState } from '../ai/public-state';
import { BASE_PACK } from '../data/base';
import { character, faction } from '../rules/common';
import { botOwns } from '../multiplayer/ownership';
import type { BattleStage, Command, ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';
import { apply } from '../rules/game';
import { roundForecast } from './combat-forecast';
import { regionName } from './event-text';
import { LIVE_BANK_BEATS, LIVE_BEATS, LIVE_LIGHT_BEATS } from './table-time';

export const DICE_SETTLE_MS = 1350;
export const COMBAT_STEP_MS = 750;
/** A bookkeeping step stays visible for a beat before it continues on its own. */
export const AUTO_CONTINUE_MS = 900;
/** Wounds that fall on the only character who can take them follow one another without that pause. */
export const AUTO_WOUND_MS = 350;
export const COMBAT_BEATS = { action: 420, impact: 980, recovery: 1600, complete: 2200 } as const;
/** A power or a new attacker has no outcome to wait for: what it did shows at once, and the table is free again after a short flourish. */
export const LIGHT_BEATS = { action: 110, impact: 240, recovery: 430, complete: 600 } as const;
export const REDUCED_COMBAT_MS = 180;
export type CombatCue = {
 key: number;
 kind: 'prepare' | 'ranged' | 'melee' | 'defend' | 'hurt' | 'heal' | 'bank' | 'power';
 title: string;
 anticipation: string;
 detail: string;
 heroId?: string;
 /** Enemies that fell in this exchange. */
 kills?: number;
 /** One wound of several: the next one is still to be assigned, so this one does not hold the table for a full exchange. */
 light?: boolean;
 before: GameView;
};
export const lightCue = (cue?: Pick<CombatCue, 'kind' | 'light'>) => cue?.kind === 'power' || cue?.kind === 'prepare' || !!cue?.light;
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
 const kills = Math.max(0, (battle.killed?.length ?? 0) - (old.killed?.length ?? 0));
 const make = (kind: CombatCue['kind'], title: string, anticipation: string, detail: string, hero = heroId): CombatCue => ({ key: after.revision, kind, title, anticipation, detail, heroId: hero, ...(kills ? { kills } : {}), before });
 const defeated = kills ? `${kills} ${kills === 1 ? 'enemy falls' : 'enemies fall'}` : '';
 // A character who leaves the fight is a loss, whatever Health he returns with. (It was announced as "Restoring strength · +1 health".)
 const fell = battle.defeated.filter(id => !old.defeated.includes(id));
 if (fell.length) return make('hurt', `${fell.map(name).join(' and ')} ${fell.length > 1 ? 'fall' : 'falls'}`, 'The last Health is gone', fell.map(id => `${name(id)} leaves the fight and returns to ${regionName(after.heroes.find(h => h.id === id)?.location ?? '')}`).join(' · '), fell[0]);
 const health = battle.participants.map(id => ({ id, delta: (after.heroes.find(h => h.id === id)?.health ?? 0) - (before.heroes.find(h => h.id === id)?.health ?? 0) })).filter(h => h.delta);
 if (health.length) {
  const hurt = health.find(h => h.delta < 0), target = hurt ?? health[0];
  const cue = make(hurt ? 'hurt' : 'heal', hurt ? 'Enemy strike' : 'Restoring strength', hurt ? 'Brace for impact' : 'Gathering restorative energy', health.map(h => `${name(h.id)} ${h.delta > 0 ? '+' : '−'}${Math.abs(h.delta)} health`).join(' · '), target.id);
  // A run of wounds: while more are waiting to be assigned, each one lands in a short beat (a full exchange each made five wounds last eleven seconds).
  return hurt && old.stage === 'wounds' && battle.stage === 'wounds' && battle.wounds.horde + battle.wounds.alliance > 0 && !after.respawns.length ? { ...cue, light: true } : cue;
 }
 if (old.stage === 'defense' && battle.stage !== 'defense') {
  const ranged = old.boxes[side].damage > 0;
  const wounds = battle.wounds[side];
  // What the opponents struck with and how much of it was stopped, from the same forecast the Combat Area shows.
  const f = old.kind === 'pve' && battle.stage !== 'over' ? roundForecast(BASE_PACK, before) : undefined;
  const struck = f && !f.ranged.won ? `${f.foe} attacks for ${f.attack}${f.blocked + f.absorbed ? ` · ${f.blocked + f.absorbed} stopped` : ''}` : '';
  const detail = [defeated, struck, wounds > 0 ? `${wounds} ${wounds === 1 ? 'wound' : 'wounds'} to assign` : battle.stage === 'over' ? 'The encounter is decided' : 'The party holds its ground'].filter(Boolean).join(' · ');
  // The exchange is named by what it is: the opponents' attack when they are left to attack, the ranged strike when it ends the
  // fight. (An attack that was all blocked used to be called "Ranged volley" because a damage token lay in the Combat Area.)
  if (struck) return make(kills ? 'ranged' : 'defend', `${f!.foe} ${f!.opponents - f!.ranged.kills > 1 ? 'attack' : 'attacks'}`, kills ? 'The ranged strike lands first' : 'Shields at the ready', detail);
  return make(ranged ? 'ranged' : 'defend', ranged ? old.kind === 'pve' ? 'Ranged strike' : 'Ranged volley' : 'Hold the line', ranged ? 'Taking aim' : 'Shields at the ready', detail);
 }
 if (old.stage === 'resolution' && battle.stage !== 'resolution') {
  const wounds = (['horde', 'alliance'] as const).filter(f => battle.wounds[f] > 0).map(f => `${f === 'horde' ? 'Horde' : 'Alliance'}: ${battle.wounds[f]} ${battle.wounds[f] === 1 ? 'wound' : 'wounds'} to assign`).join(' · ');
  const carried = battle.kind === 'pve' && battle.stage !== 'over' ? battle.boxes[side].damage : 0;
  const detail = [defeated, battle.stage === 'over' ? defeated ? '' : 'The final exchange decides the battle' : battle.kind === 'pve' ? carried ? `${carried} damage ${carried === 1 ? 'token stays' : 'tokens stay'} for the next round` : 'No damage carries into the next round' : wounds || 'Both factions clear their hit tokens'].filter(Boolean).join(' · ');
  return make('melee', 'Melee & attrition', 'Closing the distance', detail);
 }
 if (kills) return make('ranged', 'A decisive strike', 'Finding an opening', defeated);
 const total = battle.boxes[side], previous = old.boxes[side];
 const gained = total.damage + total.defense + total.armor + total.attrition - previous.damage - previous.defense - previous.armor - previous.attrition;
 // A power is named as a power, also when it lays a token: "Crimson Robe · +1 armor". (It was announced as "Hits secured", the
 // same words as the hits of the roll, and held the table as long.)
 if (battle.active && old.active?.heroId === battle.active.heroId && battle.active.used.length > old.active.used.length) {
  // Name the card: `used` records "<card>:<ability>" for each power of this attack.
  const key = battle.active.used.at(-1)!, played = BASE_PACK.cards.find(c => c.id === key.slice(0, key.lastIndexOf(':')))?.name;
  const laid = ([['damage', 'damage'], ['defense', 'defense'], ['armor', 'armor'], ['attrition', 'attrition']] as const).filter(([box]) => total[box] > previous[box]).map(([box, word]) => `+${total[box] - previous[box]} ${word}`).join(' · ');
  return make('power', played ?? 'Power unleashed', `${name(battle.active.heroId)} uses ${played ?? 'a power'}`, laid || 'Its effect is on the table');
 }
 if (gained > 0) return make('bank', 'Hits placed', 'Counting the hits', `+${gained} ${gained === 1 ? 'token' : 'tokens'} in the Combat Area`);
 if (battle.active && battle.active.heroId !== old.active?.heroId) return make('prepare', `${name(battle.active.heroId)} steps forward`, 'A new attacker takes position', 'Choose your powers, then roll');
}

/** Shared with automation so no decision can overtake a visible combat beat.
 * `live` is the table's pace (0 when it is off): with it an exchange takes the time of a real one, held long enough to be read. */
export function useCombatPresentation(state: GameView, live = 0): CombatPresentation {
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
 // Before the browser paints: an exchange holds its outcome back until the blow lands, so the new state must not be seen for
 // the frame it would take an ordinary effect to announce the exchange. (It was: "Assign wounds" flashed, then "Defense" again.)
 useLayoutEffect(() => {
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
  const beats = lightCue(cue) ? live ? LIVE_LIGHT_BEATS : LIGHT_BEATS : live ? cue.kind === 'bank' ? LIVE_BANK_BEATS : LIVE_BEATS : COMBAT_BEATS, pace = live || 1;
  const timers = [setTimeout(() => setPhase('action'), beats.action * pace), setTimeout(() => setPhase('impact'), beats.impact * pace), setTimeout(() => setPhase('recovery'), beats.recovery * pace), setTimeout(finish, beats.complete * pace)];
  return () => timers.forEach(clearTimeout);
 }, [cue, reducedMotion]);
 return { cue, phase, busy: !!cue };
}

const BOOKKEEPING: Command['type'][] = ['advance', 'tokens', 'monster', 'attacker', 'wound'];
/** The single legal continuation of a combat step is bookkeeping, not a decision.
 * Rolling, rerolls, abilities, the outcome and any choice between targets or
 * characters stay with the player. Pending bot moves and other seats' options
 * keep the step manual, so a shared party decision is never taken on their behalf.
 * In the Armor step of a fight between the factions each faction sets its own armor: a faction with exactly one way to set
 * it (no armor, or nothing to choose between) has no decision either, and its step continues even while the other
 * faction still has a choice to make. */
export function bookkeepingStep(state: GameView, human: Command[], all: Command[], botPending: boolean): Command | undefined {
 const b = state.battle;
 if (state.phase !== 'combat' || !b || b.stage === 'over' || botPending) return;
 if (b.stage === 'defense' && b.kind !== 'pve' && human.length && human.every(c => c.type === 'armor')) {
  for (const f of ['horde', 'alliance'] as const) {
   const own = human.filter(c => c.type === 'armor' && c.faction === f);
   if (own.length === 1 && all.filter(c => c.type === 'armor' && c.faction === f).length === 1) return own[0];
  }
  return;
 }
 if (human.length !== 1) return;
 const step = human[0];
 if (!BOOKKEEPING.includes(step.type)) return;
 return all.filter(c => c.type !== 'ability').length === 1 ? step : undefined;
}

export const combatSteps = ['Prepare', 'Roll & abilities', 'Ranged & defense', 'Melee & attrition', 'Outcome'];
export function combatStep(stage: BattleStage, afterWounds?: 'resolution' | 'round-end') {
 if (['attacker', 'pool', 'penalty'].includes(stage)) return 0;
 if (['after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens'].includes(stage)) return 1;
 if (stage === 'defense' || (stage === 'wounds' && afterWounds !== 'round-end')) return 2;
 return stage === 'over' ? 4 : 3;
}

export type CombatAutomationOptions = {
 resolve: boolean; campaignAuto: boolean; difficulty: Difficulty;
 /** One explicit click may decline optional human reactions during a bot's move. */
 humanResponsePassed?: boolean;
 /** Accepted for older callers only. It never delegates a human's decisions. */
 play?: boolean;
};

/** A bot may support a player only while preserving every currently offered
 * human choice. In particular it cannot consume a pending healing/mana response
 * or move on to another phase. The preview never reads the actual game RNG.
 */
function preservesHumanWindow(p:ContentPack,state:GameView,command:Command,human:Command[]):boolean{
 if(command.type!=='ability')return false;
 try{
  const next=apply(p,publicState(state),command),before=state.battle,after=next.battle;
  if(next.phase!==state.phase||!before||!after||after.stage!==before.stage||after.round!==before.round||after.active?.heroId!==before.active?.heroId)return false;
  const changedDice=new Set(before.active?.dice.filter(d=>{
   const updated=after.active?.dice.find(a=>a.id===d.id);
   return !updated||updated.spotted!==d.spotted||updated.removed!==d.removed||updated.value!==d.value||updated.color!==d.color;
  }).map(d=>d.id));
  // Test choices involving changed dice first: one rejected Spot/Remove proves
  // that this support would consume the player's decision. Avoid regenerating
  // hundreds of bounded target/strength combinations for every bot candidate.
  const affected=(c:Command)=>c.type==='ability'&&[...(c.args?.dice??[]),...(c.args?.removeDice??[])].some(id=>changedDice.has(id));
  return [...human].sort((a,b)=>Number(affected(b))-Number(affected(a))).every(c=>{
   // Healing can prevent an imminent defeat. It may remove the no-longer-needed
   // respawn prompt, but cannot actually defeat/revive the hero or pick a home.
   if(c.type==='respawn'&&state.respawns.includes(c.hero)&&!next.respawns.includes(c.hero)&&!after.defeated.includes(c.hero)&&(next.heroes.find(h=>h.id===c.hero)?.health??0)>0)return true;
   try{apply(p,next,c);return true;}catch{return false;}
  });
 }catch{return false;}
}
const supportCache=new WeakMap<GameView,WeakMap<Command[],Map<string,{pack:ContentPack;commands:Command[]}>>>();
function supportedMove(p:ContentPack,state:GameView,legal:Command[],bots:string[],human:Command[],candidates:Command[],difficulty:Difficulty):Command[]{
 const abilities=candidates.filter(c=>c.type==='ability');if(!abilities.length)return [];
 let byLegal=supportCache.get(state);if(!byLegal){byLegal=new WeakMap();supportCache.set(state,byLegal);}
 let cached=byLegal.get(legal);if(!cached){cached=new Map();byLegal.set(legal,cached);}
 const key=JSON.stringify([bots,difficulty]);
 const previous=cached.get(key);if(previous?.pack===p)return previous.commands;
 // Rank once with the existing policy, then validate only until a profitable,
 // safe support move is found. A sole optional ability is still free to decline.
 const ranked=abilities.map(c=>decide(p,state,[c],difficulty)).filter((d):d is NonNullable<typeof d>=>!!d&&d.score>0).sort((a,b)=>b.score-a.score);
 const best=ranked.find(d=>preservesHumanWindow(p,state,d.command,human));
 const result=best?[best.command]:[];cached.set(key,{pack:p,commands:result});return result;
}

/** A human's decision window stays open, including a single legal confirmation. */
export function combatCandidates(p: ContentPack, state: GameView, legal: Command[], bots: string[], options: CombatAutomationOptions): Command[] {
 if (state.phase !== 'combat' || !state.battle) return [];
 const human = legal.filter(c => !botOwns(p, state, c, bots));
 const candidates = legal.filter(c => botOwns(p, state, c, bots));
 if (human.length && (!options.humanResponsePassed || human.some(c => c.type !== 'ability'))) {
  if(!options.resolve)return [];
  return supportedMove(p,state,legal,bots,human,candidates,options.difficulty);
 }
 // Bots may take their loot, but the result waits for acknowledgment unless the
 // whole campaign is automated. Human/shared reward choices still take priority.
 if (state.battle.stage === 'over') {
  return options.resolve ? candidates.filter(c => c.type !== 'closeBattle' || options.campaignAuto) : [];
 }
 return options.resolve ? candidates : [];
}
export function combatAutomation(p:ContentPack,state:GameView,legal:Command[],bots:string[],options:CombatAutomationOptions):Command|undefined{
 const candidates=combatCandidates(p,state,legal,bots,options);
 return candidates.length===1?candidates[0]:decide(p,state,candidates,options.difficulty)?.command;
}

/** A reroll that lands on the same value still has a new signature. Removal/Spot does not roll again. */
export function rollSignature(state: GameView) {
 const b = state.battle, a = b?.active;
 if (state.phase !== 'combat' || !a || !a.dice.some(d => d.value > 0)) return '';
 return `${b!.round}:${a.heroId}:${a.dice.filter(d => d.value > 0).map(d => `${d.id}:${d.value}:${Number(d.rerolled)}`).join('|')}`;
}
