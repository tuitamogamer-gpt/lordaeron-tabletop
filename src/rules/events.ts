import { assert, card, faction, hero, integer, note, other, random, shuffle } from './common.js';
import { beginBattle } from './combat.js';
import { drawQuest, finalAttacker, rewards, stronger } from './rewards.js';
import { activeEvent, nefarianDestinations } from './world.js';
import { resolveEvent } from './event-choices.js';
import type { ContentPack, Faction, State, WorldEvent } from './model.js';
export { eventChoice } from './event-choices.js';
export { battleEvents, purify } from './event-rewards.js';
export function finishEvent(s:State){delete s.eventFlow;s.eventSeen=[];s.faction=other(s.faction);s.phase='actions';s.tradeWindow=false;}
export const removeWorld=(s:State,id:string)=>{s.world=s.world?.filter(e=>e.id!==id);};
export function addWorld(s:State,id:string):WorldEvent{
 const e:WorldEvent={id,tokens:[],attempts:[],gold:0,items:[],trophies:{horde:[],alliance:[]}};(s.world??=[]).push(e);return e;
}
export const teamLeader=(p:ContentPack,s:State,f:Faction)=>shuffle(s,s.heroes.filter(h=>faction(p,h.id)===f)).sort((a,b)=>b.xp-a.xp)[0].id;
export function startNefarian(p:ContentPack,s:State,f:Faction){
 (s.nefarianFinal??=[]).push(f);delete s.eventFlow;
 beginBattle(s,'pve',s.heroes.filter(h=>faction(p,h.id)===f).map(h=>h.id),[],f,'bulwark',s.overlord.id);
 note(s,`Nefarian has reached the Bulwark. ${f} enters the final battle.`);
}
export function nextNefarianBattle(p:ContentPack,s:State){
 if(!s.nefarianFinal)return false;
 if(s.nefarianFinal.length===2){s.winner='draw';s.phase='finished';note(s,"Both factions are defeated. Nefarian ends the game in a draw.");}
 else startNefarian(p,s,other(s.nefarianFinal[0]));return true;
}
/** Resume an interrupted choice without repeating Fate or losing the bonus chain. */
export function drawEvents(p:ContentPack,s:State){
 s.phase='event';
 while(true){
  if(s.eventFlow){
   const e=p.events.find(e=>e.id===s.eventFlow!.event)!;
   if(s.eventFlow.steps.length||s.auction||s.respawns.length)return;
   if(!s.eventFlow.started)resolveEvent(p,s,e);
   if(s.eventFlow.steps.length||s.auction||s.respawns.length)return;
   delete s.eventFlow;if(!e.bonus){finishEvent(s);return;}
  }
  if(!s.eventDeck.length){finishEvent(s);return;}
  const id=s.eventDeck.shift()!,e=p.events.find(e=>e.id===id)!;
  const ears=activeEvent(p,s,'ears');if(ears)removeWorld(s,ears.id);
  s.eventDiscard.push(id);note(s,`Event: ${e.name}.`);
  const duplicate=e.bonus&&s.eventSeen.includes(e.name);s.eventSeen.push(e.name);
  s.eventFlow={event:id,steps:[],started:false,moved:[]};
  // Fate precedes effects, including a duplicate bonus card that ends the chain.
  if(p.overlords.find(o=>o.id===s.overlord.id)?.combat==='nefarian'&&e.fate){
   const choices=nefarianDestinations(p,s,e.fate);
   if(choices.length>1){s.eventFlow.steps.push({kind:'nefarian',hero:teamLeader(p,s,s.faction),faction:s.faction});if(duplicate)s.eventFlow.started=true;return;}
   s.overlord.region=choices[0];if(choices[0]==='bulwark'){startNefarian(p,s,finalAttacker(p,s));return;}
  }else {const o=p.overlords.find(o=>o.id===s.overlord.id)!;if(o.route?.length){const i=Math.max(0,o.route.indexOf(s.overlord.region));s.overlord.region=o.route[(i+e.fate)%o.route.length];}}
  if(duplicate){finishEvent(s);return;}
 }
}
export function bid(p:ContentPack,s:State,id:string,amount:number){
 const a=s.auction,h=hero(s,id);assert(a&&!Object.hasOwn(a.bids,id)&&integer(amount,0,h.gold),"Invalid bid or bid already submitted.");a.bids[id]=amount;
 if(Object.keys(a.bids).length===s.heroes.length){const max=Math.max(...Object.values(a.bids)),tied=s.heroes.filter(h=>a.bids[h.id]===max),winner=tied[random(s,tied.length)];winner.gold-=max;winner.auctionItems.push(a.item);if(card(p,a.item).extraInstantSlot)winner.slots.push({addons:[]});note(s,`${winner.id} wins the auction for ${max} gold.`);delete s.auction;drawEvents(p,s);}
}
export function checkWars(p:ContentPack,s:State):boolean{
 const f=other(s.faction),hs=s.heroes.filter(h=>faction(p,h.id)===f),war=s.wars.find(w=>w.regions.every(r=>hs.some(h=>h.location===r)));if(!war)return false;
 s.wars=s.wars.filter(w=>w.id!==war.id);const reward=stronger(p,s).includes(f)?war.reward:war.weakReward??war.reward;
 rewards(p,s,hs.map(h=>h.id),hs.map(h=>h.id),war.perHero?{...reward,xp:reward.xp*hs.length,gold:reward.gold*hs.length}:reward);s.phase='reward';return true;
}
export function replacement(p:ContentPack,s:State,tier:'green'|'yellow'|'red'){
 assert(s.reward?.replacement,"No quest to replace.");
 assert(!s.reward.offered.length&&!s.reward.items.length&&!s.reward.special.length&&!s.reward.extraItems?.length&&!s.reward.relic,"Distribute rewards first.");
 assert(drawQuest(p,s,s.reward.replacementFaction??s.reward.faction,tier),"A quest cannot currently be placed from this deck.");s.reward.replacement=false;
 if(s.reward.resolution){s.reward.resolution.status='complete';s.reward.resolution.receipts.push({kind:'quest',card:s.quests.at(-1),text:`A new ${tier} quest enters play.`});}
}
