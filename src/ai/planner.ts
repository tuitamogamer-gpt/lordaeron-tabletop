import { capacity, card, faction } from '../rules/common.js';
import type { Command, ContentPack, Hero, Pool } from '../rules/model.js';
import type { GameView } from '../rules/view.js';
import { availableCards } from '../rules/effects.js';
import { cardValue, loadouts, scoreLoadout, usableItem } from './loadout.js';
import { equipped } from '../rules/inventory.js';
import { apply } from '../rules/game.js';
import { abilityCommands } from '../rules/legal.js';
import { publicState } from './public-state.js';
import { createStrategy, type Objective } from './strategy.js';
import { abilityScore, healthValue, tacticalScore } from './tactics.js';
export type Difficulty = 'cautious' | 'balanced' | 'aggressive';
export interface Decision { command: Command; score: number; reason: string; alternatives: number; considered: { command: Command; score: number; reason: string }[]; }
const equipmentCaches=new WeakMap<ContentPack,Map<string,number>>();
/** Pure policy module: receives public information + legal moves, never the hidden server State. */
function pool(p: ContentPack, h: Hero): Pool {
 const result = { red: 0, blue: 0, green: 0 };
 for (const id of availableCards(p, h)) for (const a of card(p, id).abilities) if (a.timing === 'pool' && h.energy >= (card(p,id).type==='active'||card(p,id).kind==='talent'||card(p,id).kind==='racial'?0:card(p,id).energy)) for (const e of a.effects) if (e.op === 'dice') result[e.color] += e.amount;
 return { red: Math.min(7, result.red), blue: Math.min(7, result.blue), green: Math.min(7, result.green) };
}
function distance(p: ContentPack, from: string, to: string, f: string): number {
 const queue: [string, number][] = [[from, 0]], seen = new Set([from]);
 while (queue.length) { const [at, n] = queue.shift()!; if (at === to) return n; const r = p.regions.find(r => r.id === at)!;
  const adjacent = [...r.neighbors, ...((r.flight === f || r.flight === 'both') ? p.regions.filter(r => r.flight === f || r.flight === 'both').map(r => r.id) : [])];
  for (const id of adjacent) if (!seen.has(id) && (!p.regions.find(r => r.id === id)?.home || p.regions.find(r => r.id === id)?.home === f)) { seen.add(id); queue.push([id, n + 1]); }
 } return 100;
}
const itemValue=cardValue;
export function decide(p: ContentPack, s: GameView, legal: Command[], difficulty: Difficulty = 'balanced'): Decision | undefined {
 const risk = difficulty === 'cautious' ? 1.5 : difficulty === 'aggressive' ? .65 : 1;
 const strategy = createStrategy(p,s,risk), training = new Map<string,number>();
 let equipment=equipmentCaches.get(p);if(!equipment){equipment=new Map();equipmentCaches.set(p,equipment);}
 const bestEquipment = (h:Hero) => {
  const key=JSON.stringify([h.id,h.level,h.learned,h.bag,h.slots,h.energy,h.talents,h.auctionItems,h.pets]);
  if(!equipment!.has(key)){
   if(equipment!.size>=1024)equipment!.delete(equipment!.keys().next().value!);
   equipment!.set(key,Math.max(...loadouts(p,h).map(c=>scoreLoadout(p,h,c))));
  }
  return equipment!.get(key)!;
 };
 const trainValue=(h:Hero,ids:string[])=>{
  const key=`${h.id}:${[...ids].sort().join(',')}`;
  if(!training.has(key)){
   const next={...h,learned:[...h.learned,...ids]};
   const gain=bestEquipment(next)-bestEquipment(h),cost=ids.reduce((n,id)=>n+card(p,id).price,0);
   training.set(key,gain*3-cost*.3-1.2+(ids.length>1?.25:0));
  }
  return training.get(key)!;
 };
 const recovery=(h:Hero,next:Hero)=>{
  const cap=capacity(p,h),health=(healthValue(next)-healthValue(h))*risk;
  const energy=(next.energy-h.energy)*(h.energy<Math.max(2,cap.energy*.3)?1.5:.65);
  return health+energy+(h.curse-next.curse)*2.5;
 };
 const itemGain=(h:Hero,id:string,discard?:string)=>{
  if(discard===id)return 0;
  const next=structuredClone(h);next.bag=[...next.bag.filter(v=>v!==discard),id];
  return (bestEquipment(next)-bestEquipment(h))*3+Math.ceil(card(p,id).price/2)*.12-(discard?cardValue(p,discard,h)*.35:0);
 };
 const scored = legal.map((command, index) => {
  let score = -10, reason = "Advancing to the next phase.";
  const h = 'hero' in command ? s.heroes.find(h => h.id === command.hero) : undefined;
  const f = h ? faction(p, h.id) : s.faction;
  switch (command.type) {
   case 'rest': {
    const next=apply(p,publicState(s),command).heroes.find(v=>v.id===h!.id)!;
    score=recovery(h!,next)-1.3-(command.food?.length?.15:0);
    const plan=strategy.plan(h!);
    if(plan&&!plan.objective.clue&&plan.objective.region===h!.location&&h!.actions>1){
     const party=plan.party.map(id=>id===h!.id?next:s.heroes.find(v=>v.id===id)!);
     const ready=strategy.forecast(plan.objective,party);
     score+=Math.max(0,ready.win-plan.forecast.win)*8;
    }
    reason=`Recovering ${next.health-h!.health} health and ${next.energy-h!.energy} energy${plan?` before ${plan.objective.label}`:''}.`;break;
   }
   case 'travel': {
    if (!command.path.length) { score = -40; reason='Waiting for the party or the next management phase.'; break; }
    const at = command.path.at(-1)!;
    const plan=strategy.plan(h!);score=-50;
    if(plan){
     const before=strategy.distance(h!.location,plan.objective.region,f),after=strategy.distance(at,plan.objective.region,f);
     if(after<before&&plan.score>-.5){
      score=2+Math.min(3,plan.score*.7)+Math.min(2,before-after)*1.2+(after===0?1.5:0);
      if(after===0&&h!.actions>1&&plan.forecast.win>.75)score+=2;
     }
     reason=`Moving toward ${plan.objective.label} with ${plan.party.length===1?'a solo route':`${plan.party.length} planned participants`}; ${Math.ceil(after/2)} further Travel actions.`;
    }
    if(s.enemies.some(e=>e.region===at&&e.color==='blue'))score-=4*risk;
    if(command.power){const power=card(p,command.power);score-=power.actionPower==='teleport'?command.path.length*.55:power.travelPower?.unequip?1:0;}
    // Retreat to a friendly town only when its recovery is worth the detour.
    const cap=capacity(p,h!);
    if(h!.health<cap.health*.35){
     const towns=p.regions.filter(r=>r.town===f||r.town==='both');
     const before=Math.min(...towns.map(r=>strategy.distance(h!.location,r.id,f))),after=Math.min(...towns.map(r=>strategy.distance(at,r.id,f)));
     if(after<before)score=Math.max(score,4+(after===0?3:0));
    }
    break;
   }
   case 'challenge': {
    const party = [h!, ...command.allies.map(id => s.heroes.find(h => h.id === id)!)];
    const at=command.region??h!.location;
    let objective=strategy.targets(f).find(o=>o.id===command.target&&o.region===at);
    if(command.target==='pvp')objective={id:'pvp',region:at,label:'opposing party',enemies:[],pvp:s.heroes.filter(v=>faction(p,v.id)!==f&&v.location===at).map(v=>v.id)} satisfies Objective;
    if(!objective||objective.clue){score=-30;reason='Investigate the clue before committing a Challenge.';break;}
    const forecast=strategy.forecast(objective,party);
    score=strategy.value(objective,party,forecast);
    if(objective.enemies[0]?.color==='blue')score+=5;
    reason=`Challenging ${objective.label} with ${party.length} participant${party.length>1?'s':''}: estimated ${forecast.rounds} rounds and ${forecast.wounds.toFixed(1)} wounds; ${forecast.win>.8?'low':forecast.win>.5?'moderate':'high'} risk.`;break;
   }
   case 'ability': {
    const a = card(p, command.card).abilities.find(a => a.id === command.ability)!;
    score = 10;
    if (a.timing === 'wound') { const target = s.heroes.find(h => h.id === (command.args?.target ?? command.hero))!; score = capacity(p, target).health - target.health >= 2 ? 30 : -5; }
    if (a.timing === 'reroll') score = s.battle?.active?.dice.some(d => !d.rerolled && d.value < s.battle!.active!.threat) ? 15 : -5;
    reason = "Using an available ability at the right time."; break;
   }
   case 'attacker': score = pool(p, h!).blue + h!.health * .1; reason = "Choosing the party’s attack order."; break;
   case 'reroll': { const d = s.battle!.active!.dice.find(d => d.id === command.dice[0])!; score = d.value < s.battle!.active!.threat ? 12 - d.value : -5; reason = "Rerolling a miss or a dangerous low result."; break; }
   case 'wound': score = command.pet ? 30 : h!.health * 2 + h!.energy * .1; reason = "Assigning wounds while keeping participants alive."; break;
   case 'penalty': score = command.dice.reduce((n, id) => n + (s.battle!.active!.dice.find(d => d.id === id)?.color === 'green' ? 0 : -1), 0); break;
   case 'manage': score = scoreLoadout(p,h!,command); reason = "Choosing a complete loadout within slot, category and energy limits."; break;
   case 'train': score = trainValue(h!,command.cards); reason = "Comparing complete future loadouts and learning useful powers together."; break;
   case 'town': {
    const op = command.operations[0];
    if (op?.op === 'buy') { const c = card(p, op.card); score = c.level <= h!.level&&usableItem(p,h!,c) ? itemGain(h!,c.id,op.discard)-c.price*.4-1.2 : -5; if (op.discard === op.card) score = -20; }
    else if (op?.op === 'sell') score = h!.bag.includes(op.card) && bagSizeValue(p, h!) >= 3 ? 2 : -5;
    else if(op?.op==='train')score=trainValue(h!,command.operations.filter(o=>o.op==='train').map(o=>o.card))+.1;
    else score = -1;
    const next=apply(p,publicState(s),command).heroes.find(v=>v.id===h!.id)!;
    score+=recovery(h!,next);reason = "Combining actual recovery with purchases, training and equipment compatibility."; break;
   }
   case 'reward': score=itemGain(h!,command.card,command.discard);reason="Assigning the reward by its improvement to each hero’s complete equipment.";break;
   case 'talent': score = itemValue(p, command.card,h!); reason = "Choosing a talent that supports learned powers and equipment."; break;
   case 'quest': { const level = s.heroes.filter(h => faction(p, h.id) === s.reward?.faction).reduce((n,h) => n + h.level,0) / (s.heroes.length/2); score = 5 - Math.abs((command.tier === 'green' ? 2 : command.tier === 'yellow' ? 3 : 4) - level) * 3; reason = "Choosing quest difficulty for the faction’s level."; break; }
   case 'bid': {
    const value=s.auction?cardValue(p,s.auction.item,h!):0;
    const reserve=h!.level<4?3:1,limit=Math.max(0,Math.min(h!.gold-reserve,Math.floor(value*.8)));
    score=-Math.abs(command.amount-limit);reason = "Valuing this auction item while reserving gold for class development.";break;
   }
   case 'peek':score=40;reason="Investigating the clue before spending an action on Kazzak.";break;
   case 'purify':score=8;reason="Cleansing plague to weaken creatures in this zone.";break;
   case 'claim-relic':score=h!.level*2+h!.health;reason="Giving the relic to a hero ready for Kel’Thuzad.";break;
   case 'event-choice':{
    const step=s.eventFlow?.steps[0],a=command.choice;
    score=a.mode==='skip'?0:1;reason="Choosing an event benefit for the hero’s current needs.";
    if(a.mode==='skip')break;
    if(step?.kind==='professions')score=a.mode==='gold'?h!.level:Math.min(capacity(p,h!).health-h!.health,a.health??0)*2+Math.min(capacity(p,h!).energy-h!.energy,h!.level-(a.health??0));
    if(step?.kind==='retrain')score=a.mode==='gold'?h!.level*2:(a.talents??[]).reduce((n,id)=>n+itemValue(p,id),0)-h!.talents.reduce((n,id)=>n+itemValue(p,id),0);
    if(step?.kind==='tribute')score=-itemValue(p,a.card!);
    if(step?.kind==='sell')score=Math.floor(card(p,a.card!).price/2)-itemValue(p,a.card!)*2;
    if(step?.kind==='merchants')score=card(p,a.card!).level<=h!.level?itemValue(p,a.card!)+2-Math.ceil(card(p,a.card!).price/2)*.2-(a.discard?itemValue(p,a.discard):0):-1;
    if(step?.kind==='zeppelin'){
     const goals=s.enemies.filter(e=>e.faction===f);score=Math.max(0,...goals.map(e=>distance(p,h!.location,e.region,f)-distance(p,a.region!,e.region,f)))-1;
     if(s.enemies.some(e=>e.color==='blue'&&e.region===a.region))score-=5;
    }
    if(step?.kind==='horizons'){
     const q=p.quests.find(q=>q.id===a.quest)!,level=s.heroes.filter(h=>faction(p,h.id)===f).reduce((n,h)=>n+h.level,0)/(s.heroes.length/2),tier=a.tier==='green'?2:a.tier==='yellow'?3:4;
     score=Math.abs(q.level-level)-Math.abs(tier-level)-1;
    }
    if(step?.kind==='beasts'){
     const friendly=s.heroes.filter(h=>faction(p,h.id)===f),enemy=s.heroes.filter(h=>faction(p,h.id)!==f);
     score=Math.min(...friendly.map(h=>distance(p,a.region!,h.location,f)))-Math.min(...enemy.map(h=>distance(p,a.region!,h.location,f)));
     if(s.enemies.some(e=>e.region===a.region&&e.faction===f))score-=4;
    }
    if(step?.kind==='nefarian')score=1;
    break;
   }
   case 'respawn': score = p.regions.find(r => r.id === command.region)?.town ? 3 : 0; reason = "Returning to a safe region to recover."; break;
   case 'armor': score = command.damage * 2 + command.defense; reason = "Blocking ranged hits first."; break;
   case 'trade': {
    const to=s.heroes.find(v=>v.id===command.to)!;
    const next=structuredClone(h!);next.bag=next.bag.filter(id=>!command.items.includes(id));
    const recipient=structuredClone(to);recipient.bag.push(...command.items);
    score=(bestEquipment(recipient)-bestEquipment(to)+bestEquipment(next)-bestEquipment(h!))*3-.8;
    if(score<=0)score=-1000;
    reason='Sharing an unused item with an ally who can equip it.';break;
   }
   case 'power-action': {
    const next=apply(p,publicState(s),command);
    score=s.heroes.filter(v=>faction(p,v.id)===f).reduce((n,v)=>n+recovery(v,next.heroes.find(a=>a.id===v.id)!),0)-.8;
    reason='Using the recovery power when the party gains more than its energy cost.';break;
   }
   case 'summon': {
    const target=s.heroes.find(v=>v.id===command.target)!,plan=strategy.plan(target);
    score=plan?(strategy.distance(target.location,plan.objective.region,f)-strategy.distance(h!.location,plan.objective.region,f))*2-card(p,equipped(p,h!).find(id=>card(p,id).actionPower==='summon')!).energy:-5;
    if(target.location===h!.location)score=-20;
    reason='Summoning an ally to shorten their route to the shared objective.';break;
   }
   case 'portal': {
    const travelers=[...(command.self===false?[]:[h!.id]),...command.allies].map(id=>s.heroes.find(h=>h.id===id)!);
    score=travelers.reduce((n,v)=>n+(v.health<capacity(p,v).health*.3?5:-5),0)-2;
    if(p.regions.find(r=>r.id===h!.location)?.home===f)score=-20;
    reason='Using Portal to bring a badly injured party home for recovery.';break;
   }
   case 'loot':score=cardValue(p,command.card,h!)+(usableItem(p,h!,card(p,command.card))?2:0)-(command.discard?cardValue(p,command.discard,h!):0);reason='Taking useful loot without discarding a stronger item.';break;
   default: score = 0;
  }
  const tactical=tacticalScore(p,s,command,risk);if(tactical){score=tactical.score;reason=tactical.reason;}
  return { command, score, reason, index };
 });
 if(s.battle&&s.battle.stage!=='over'){
  // Compare optional gains with the best mandatory continuation, including wounds.
  const forced=scored.filter(v=>!['ability','reroll'].includes(v.command.type));
  const bestForced=Math.max(...forced.map(v=>v.score));
  if(Number.isFinite(bestForced))for(const v of forced)v.score-=bestForced;
  if(s.battle.stage==='pool'){
   const beam=scored.filter(v=>v.command.type==='ability').sort((a,b)=>b.score-a.score).slice(0,4);
   for(const v of beam){
    if(v.command.type!=='ability'||v.score<-5)continue;
    try{
     const next=apply(p,publicState(s),v.command);
     if(next.battle?.stage!=='pool'||next.respawns.length)continue;
     const follow=abilityCommands(p,next).filter((c):c is Extract<Command,{type:'ability'}>=>c.type==='ability').slice(0,24);
     const gain=Math.max(0,...follow.map(c=>abilityScore(p,next,c)));
     const combo=(v.score+gain)*.85-.05;
     if(combo>v.score){v.score=combo;v.reason+=' Preparing a useful follow-up power.';}
    }catch{/* The supplied legal list remains the sole source of actual commands. */}
   }
  }
  for(const v of scored)if(v.command.type==='ability'&&v.score<=0)v.score=-10000;
 }
 scored.sort((a,b)=>b.score-a.score||(JSON.stringify(a.command)<JSON.stringify(b.command)?-1:JSON.stringify(a.command)>JSON.stringify(b.command)?1:0));
 if (!scored.length) return undefined;
 const best = scored[0]; return { command: best.command, score: Math.round(best.score * 100) / 100, reason: best.reason, alternatives: legal.length,
  considered:scored.slice(0,3).map(({command,score,reason})=>({command,score:Math.round(score*100)/100,reason})) };
}
function bagSizeValue(p: ContentPack, h: Hero) { return h.bag.filter(id => !card(p, id).bagExempt).length; }
