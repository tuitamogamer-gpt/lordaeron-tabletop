import { assert, capacity, card, character, faction, hero, note, other, random, region, shuffle, unique } from './common.js';
import { effects } from './effects.js';
import { addWorld, drawEvents, finishEvent, removeWorld, startNefarian, teamLeader } from './events.js';
import { receiveItem, rest } from './inventory.js';
import { drawQuest, finalAttacker, stronger } from './rewards.js';
import { activeEvent, distances, nefarianDestinations, plagued, worldEvent } from './world.js';
import type { ContentPack, EventCard, EventChoiceArgs, EventStep, State } from './model.js';
export function resolveEvent(p:ContentPack,s:State,e:EventCard){
 const flow=s.eventFlow!;flow.started=true;
 const ordered=()=>shuffle(s,s.heroes).sort((a,b)=>a.xp-b.xp).map(h=>h.id);
 const choices=(kind:EventStep['kind'])=>{flow.steps=ordered().map(hero=>({kind,hero}));};
 switch(e.script){
  case 'professions':case 'zeppelin':case 'merchants':case 'retrain':case 'sell':choices(e.script);break;
  case 'horizons':flow.steps=[s.faction,other(s.faction)].map(f=>({kind:'horizons',hero:teamLeader(p,s,f),faction:f}));break;
  case 'beasts':flow.steps=[s.faction,other(s.faction),s.faction,other(s.faction)].map(f=>({kind:'beasts',hero:teamLeader(p,s,f),faction:f}));break;
  case 'hatreds':case 'subterfuge':case 'cleanse':addWorld(s,e.id);break;
  case 'ears':if(!activeEvent(p,s,'cleanse')&&!activeEvent(p,s,'winds'))addWorld(s,e.id);break;
  case 'winds':if(s.enemies.some(v=>v.color==='blue'&&plagued(p,v.region)))addWorld(s,e.id);break;
  case 'bounty':{const world=addWorld(s,e.id);world.tokens=(['horde','alliance'] as const).map(f=>{const hs=s.heroes.filter(h=>faction(p,h.id)===f);return hs[random(s,hs.length)].id;});break;}
  case 'boss':{
   const world=addWorld(s,e.id);
   if(e.boss?.tribute==='gold')for(const h of s.heroes){const gold=Math.floor(h.gold/2);h.gold-=gold;world.gold+=gold;}
   if(e.boss?.tribute==='item')flow.steps=ordered().filter(id=>hero(s,id).bag.length).map(hero=>({kind:'tribute',hero}));break;
  }
  case 'plague':addWorld(s,e.id).tokens=['marris','hearthglen','andorhal'];break;
  case 'soul-taint':case 'arcane-corruption':{
   const plague=!!activeEvent(p,s,'plague'),d=distances(p,s.overlord.region);
   for(const h of s.heroes.filter(h=>d[h.location]<=(plague?8:4))){const prop=e.script==='soul-taint'?'health':'energy',amount=prop==='health'||plague?Math.ceil(h[prop]/2):Math.floor(h[prop]/2);h[prop]-=amount;if(!h.health&&!s.respawns.includes(h.id))s.respawns.push(h.id);}break;
  }
 }
 if(['cleanse','winds'].includes(e.script??'')){const ears=activeEvent(p,s,'ears');if(ears)removeWorld(s,ears.id);}
 for(const effect of e.effects){
  switch(effect.op){
   case 'gold':{const strong=stronger(p,s);for(const h of s.heroes)if(effect.faction==='all'||(effect.faction==='stronger'?strong.includes(faction(p,h.id)):!strong.includes(faction(p,h.id))))h.gold=Math.max(0,h.gold+effect.amount);break;}
   case 'merchant':s.merchant.push(...s.itemDecks[effect.deck].splice(0,effect.count));break;
   case 'war':s.wars.push({id:e.id,regions:effect.regions,reward:effect.reward,weakReward:effect.weakReward,perHero:effect.perHero});break;
   case 'auction':s.auction={event:e.id,item:effect.item,bids:{}};break;
   case 'overlord':for(const stat of ['attack','health','threat'] as const)s.overlord[stat]+=effect[stat]??0;break;
   case 'spawn':for(const spawn of effect.spawns){const c=p.creatures.find(c=>c.id===spawn.creature)!;const available=c.stock[spawn.color]-s.enemies.filter(v=>v.creature===spawn.creature&&v.color===spawn.color).length;for(let n=0;n<Math.min(spawn.count,available);n++)s.enemies.push({id:`${e.id}:${spawn.region}:${n}`,...spawn});}break;
  }
 }
}
export function eventChoice(p:ContentPack,s:State,id:string,c:EventChoiceArgs){
 const flow=s.eventFlow,step=flow?.steps[0],h=hero(s,id);assert(s.phase==='event'&&flow&&step?.hero===id,'Ovaj lik nema odluku događaja.');
 const e=p.events.find(e=>e.id===flow.event)!;
 if(step.kind==='tribute'){assert(c.card&&h.bag.includes(c.card),'Predaj jedan predmet iz torbe.');h.bag.splice(h.bag.indexOf(c.card),1);worldEvent(s,e.id)!.items.push(c.card);}
 else if(step.kind==='nefarian'){assert(c.region&&nefarianDestinations(p,s,e.fate).includes(c.region),'Nefarian mora završiti najbliže Bulwarku.');s.overlord.region=c.region;if(c.region==='bulwark'){startNefarian(p,s,finalAttacker(p,s));return;}}
 else if(c.mode!=='skip')switch(step.kind){
  case 'professions':if(c.mode==='gold')h.gold+=h.level;else{assert(c.mode==='recover','Odaberi zlato ili oporavak.');rest(p,h,h.level,c.health??0);}break;
  case 'zeppelin':assert(c.region&&[faction(p,id),'both'].includes(region(p,c.region).flight??'')&&!s.heroes.some(a=>a.location===c.region&&faction(p,a.id)!==faction(p,id)),'Odaberi prijateljski let bez protivnika.');h.location=c.region;break;
  case 'merchants':{assert(c.card&&s.merchant.includes(c.card),'Odaberi predmet trgovca.');const price=Math.ceil(card(p,c.card).price/2);assert(h.gold>=price,'Nema dovoljno zlata.');h.gold-=price;s.merchant.splice(s.merchant.indexOf(c.card),1);receiveItem(p,s,h,c.card,c.discard);break;}
  case 'sell':assert(c.card&&h.bag.includes(c.card)&&!card(p,c.card).soulbound,'Odaberi predmet iz torbe.');h.bag.splice(h.bag.indexOf(c.card),1);h.gold+=Math.floor(card(p,c.card).price/2);s.merchant.push(c.card);break;
  case 'retrain':{
   if(c.mode==='gold'){h.gold+=h.level*2;break;}
   assert(c.mode==='talents'&&c.talents&&c.talents.length===h.talents.length&&unique(c.talents),'Odaberi zamjene talenata.');
   const old=[...h.talents],limits=old.map(id=>card(p,id).level).sort(),next=c.talents.map(id=>card(p,id)).sort((a,b)=>a.level-b.level);
   assert(next.every((v,i)=>v.kind==='talent'&&v.classId===character(p,h.id).classId&&v.level<=limits[i]),'Novi talent mora biti istog ili nižeg nivoa.');
   h.talents=old.filter(id=>c.talents!.includes(id));const cap=capacity(p,h);h.health=Math.min(h.health,cap.health);h.energy=Math.min(h.energy,cap.energy);h.talents=[...c.talents];
   for(const id of h.talents.filter(id=>!old.includes(id)))for(const a of card(p,id).abilities.filter(a=>a.timing==='learn'))effects(p,s,h,id,a.effects,{});break;
  }
  case 'horizons':{
   const q=p.quests.find(q=>q.id===c.quest);assert(q&&s.quests.includes(q.id)&&q.faction===step.faction&&c.tier,'Odaberi svoj quest i novi špil.');
   s.quests=s.quests.filter(id=>id!==q.id);s.enemies=s.enemies.filter(v=>v.quest!==q.id);assert(drawQuest(p,s,q.faction,c.tier),'Nema dostupnog questa tog nivoa.');s.questDecks[q.faction][q.tier].push(q.id);break;
  }
  case 'beasts':{
   const enemy=s.enemies.find(v=>v.id===c.enemy);assert(enemy&&enemy.color==='blue'&&c.region,'Odaberi plavo stvorenje i regiju.');
   const group=s.enemies.filter(v=>v.color==='blue'&&v.region===enemy.region&&v.creature===enemy.creature);
   assert(group.every(v=>!flow.moved.includes(v.id)),'Ova grupa se već pomjerila.');
   assert(distances(p,enemy.region)[c.region]<=2&&!region(p,c.region).home&&!s.heroes.some(h=>h.location===c.region&&faction(p,h.id)!==step.faction)&&!s.enemies.some(v=>v.region===c.region&&v.color==='blue'&&v.creature===enemy.creature&&!group.includes(v)),'Grupa ne može završiti u toj regiji.');
   for(const v of group){v.region=c.region;flow.moved.push(v.id);}break;
  }
 }
 note(s,`${character(p,id).name}: ${e.name}.`);flow.steps.shift();if(step.kind==='nefarian'&&flow.started){finishEvent(s);return;}drawEvents(p,s);
}
