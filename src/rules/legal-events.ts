import { capacity, card, character, faction, hero } from './common.js';
import { bagSize } from './inventory.js';
import { distances, nefarianDestinations } from './world.js';
import type { Command, ContentPack, EventChoiceArgs, State } from './model.js';
export function eventCommands(p:ContentPack,s:State):Command[]{
 const step=s.eventFlow?.steps[0];if(!step)return [];
 const h=hero(s,step.hero),choices:EventChoiceArgs[]=[{mode:'skip'}];
 switch(step.kind){
  case 'professions':choices.push({mode:'gold'});for(let health=0;health<=Math.min(h.level,Math.max(0,capacity(p,h).health-h.health));health++)choices.push({mode:'recover',health});break;
  case 'retrain':choices.push({mode:'gold'});for(const old of h.talents)for(const c of p.cards.filter(c=>c.kind==='talent'&&c.classId===character(p,h.id).classId&&c.level<=card(p,old).level&&!h.talents.includes(c.id)))choices.push({mode:'talents',talents:h.talents.map(id=>id===old?c.id:id)});break;
  case 'zeppelin':for(const r of p.regions.filter(r=>r.flight===faction(p,h.id)||r.flight==='both'))choices.push({region:r.id});break;
  case 'merchants':for(const id of s.merchant){const discards=bagSize(p,[...h.bag,id])>3?[...h.bag,id].filter(id=>!card(p,id).bagExempt):[undefined];for(const discard of discards)choices.push({card:id,discard});}break;
  case 'tribute':choices.length=0;for(const card of h.bag)choices.push({card});break;
  case 'sell':for(const card of h.bag)choices.push({card});break;
  case 'horizons':for(const quest of s.quests.filter(id=>p.quests.find(q=>q.id===id)?.faction===step.faction))for(const tier of ['green','yellow','red'] as const)choices.push({quest,tier});break;
  case 'beasts':{
   const groups=new Set<string>();for(const e of s.enemies.filter(e=>e.color==='blue')){const key=`${e.creature}:${e.region}`;if(groups.has(key))continue;groups.add(key);for(const [region,d] of Object.entries(distances(p,e.region)))if(d<=2)choices.push({enemy:e.id,region});}break;
  }
  case 'nefarian':choices.length=0;for(const region of nefarianDestinations(p,s,p.events.find(e=>e.id===s.eventFlow!.event)!.fate))choices.push({region});break;
 }
 return choices.map(choice=>({type:'event-choice',hero:h.id,choice}));
}
