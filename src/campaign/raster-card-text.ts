import { BASE_PACK as p } from '../data/base';
import type { Ability, Card, Character, Creature, EventCard, Overlord, Quest } from '../rules/model';
import { conditionText, effectText, filterText, staticCardText } from './rules-text';
import { cardEnergyText } from './card-energy';
import { eventText, overlordText, regionName, rewardText } from './event-text';
import { creatureRules, triggerLabels } from './card-labels';

/** This is the complete accessible transcript of the corresponding baked image. */
export interface RasterCardText {
 id:string; category:'ability'|'quest'|'event'|'creature'|'overlord'|'character';
 title:string; kind:string; rank:string; subtitle:string; footer:string;
 sections:{label:string;text:string}[]; art:string; accent:string;
}
const cardName=(id:string)=>p.cards.find(c=>c.id===id)?.name??id;
const creatureName=(id:string)=>p.creatures.find(c=>c.id===id)?.name??id;
const names=(ids:string[])=>ids.map(cardName).join(' / ');

export function abilityRasterText(c:Card,a:Ability):string {
 return [a.cost!==undefined?`${a.cost} energy.`:'',a.startOnly?'At the start of this step.':'',
  a.condition?`If ${conditionText(a.condition)}:`:'',
  a.requires?`After using ${triggerLabels[c.abilities.find(v=>v.id===a.requires)?.timing??'']??a.requires}.`:'',
  a.freeIf?`Free if ${conditionText(a.freeIf)}.`:'',
  a.friendlyTiming?'May be used during a friendly participant’s step.':'',
  a.reaction==='friendly-damage'?'Reaction: a friendly character loses health.':a.reaction==='defeat'?'Reaction: a character is defeated.':'',
  a.perAttacker?'Once for each attacker.':'',
  a.judgement?'Judgement:':'',a.effects.map(effectText).join(' · '),
 ].filter(Boolean).join(' ');
}
function ability(c:Card):RasterCardText {
 const sections:RasterCardText['sections']=[];
 const seen=new Set<string>();
 for(const a of c.abilities){
  if(a.usageGroup&&seen.has(a.usageGroup))continue;
  const choices=a.usageGroup?c.abilities.filter(v=>v.usageGroup===a.usageGroup):[a];
  if(a.usageGroup)seen.add(a.usageGroup);
  const compact=compactChoices(c,choices);
  if(compact)sections.push({label:`${triggerLabels[a.timing]??a.timing} · choose one strength`,text:compact});
  else choices.forEach((v,i)=>sections.push({label:`${triggerLabels[v.timing]??v.timing}${v.automatic?' · passive':''}${choices.length>1?` · choose one (${i+1}/${choices.length})`:''}`,text:abilityRasterText(c,v)}));
 }
 staticCardText(c).forEach(text=>sections.push({label:'',text}));
 const extras=[c.petHealth?`Pet health: ${c.petHealth}.`:'',c.unique?`Only one ${c.unique} may be equipped.`:'',c.soulbound?'Soulbound.':'',c.addon?'Add-on: attach to a matching equipment slot.':'',c.travelPower?.oncePerTurn?'Travel power: once per faction turn.':''];
 if(extras.some(Boolean))sections.push({label:'',text:extras.filter(Boolean).join(' ')});
 if(!sections.length)sections.push({label:'',text:c.description||'No additional effect.'});
 return {id:c.id,category:'ability',title:c.name,kind:c.kind==='racial'?'RACIAL':c.kind==='talent'?'TALENT':c.kind==='power'?'POWER':c.type==='bag'?'CONSUMABLE':'EQUIPMENT',rank:`LEVEL ${c.level}`,subtitle:[c.classId,c.type,c.trait].filter(Boolean).join(' · '),footer:`${cardEnergyText(c)} · ${c.printed?'Starting ability':c.kind==='talent'?'Free on level up':`${c.price} gold`}`,sections,art:c.id,accent:c.classId??c.type};
}
/** A lossless formula for complete linear option ranges, never a truncated list.
 * Every differing number must be an exact positive multiple of option index X.
 * All fixed numbers, costs, conditions and other words are retained verbatim. */
export function compactChoices(c:Card,choices:Ability[]):string|undefined {
 if(choices.length<=6)return undefined;
 if(!choices.every(a=>a.timing===choices[0].timing&&a.automatic===choices[0].automatic))return undefined;
 const text=choices.map(a=>abilityRasterText(c,a));
 const parts=text.map(t=>t.split(/(\d+)/));
 const first=parts[0];
 if(parts.every(p=>p.length===first.length&&p.every((s,i)=>i%2===1||s===first[i]))){
  let variables=0,valid=true;
  const template=first.map((s,i)=>{
   if(i%2===0||parts.every(p=>p[i]===s))return s;
   const factor=Number(s);if(factor<=0||!parts.every((p,j)=>Number(p[i])===factor*(j+1))){valid=false;return s;}
   variables++;return factor===1?'X':`${factor}×X`;
  }).join('');
  if(valid&&variables>0)return `Choose X from 1–${choices.length}. ${template}`;
 }
 // Strength of the Wild enumerates every split of N hits between two boxes.
 const spots=choices.map(a=>a.effects.length===1&&a.effects[0].op==='spot'?a.effects[0]:undefined);
 const example=spots[0];
 const metadata=(a:Ability)=>JSON.stringify({...a,id:'',effects:[]});
 if(example&&spots.every(s=>s&&JSON.stringify(s.filter)===JSON.stringify(example.filter))&&choices.every(a=>metadata(a)===metadata(choices[0]))){
  const max=Math.max(...spots.map(s=>s!.count));
  const complete=spots.every(s=>Number.isInteger(s!.count)&&s!.count>=1)&&Array.from({length:max},(_,i)=>i+1).every(count=>{
   const options=spots.filter(s=>s!.count===count);
   return options.length===count+1&&Array.from({length:count+1},(_,ranged)=>ranged).every(ranged=>options.some(s=>s!.effects.length===2&&s!.effects[0].op==='token'&&s!.effects[0].box==='damage'&&s!.effects[0].amount===ranged&&s!.effects[1].op==='token'&&s!.effects[1].box==='defense'&&s!.effects[1].amount===count-ranged));
  });
  if(complete){const prefix=abilityRasterText(c,{...choices[0],effects:[]});return `${prefix} Spot 1–${max} (${filterText(example.filter)}) → gain that many hits, divided as you choose between ranged hits and melee hits.`.trim();}
 }
 return undefined;
}
function quest(q:Quest):RasterCardText {
 const spawn=(blue:boolean)=>q.spawns.filter(s=>(s.color==='blue')===blue).map(s=>`${s.count} × ${creatureName(s.creature)} (${s.color}) · ${regionName(s.region)}`).join(' / ');
 return {id:q.id,category:'quest',title:q.name,kind:'QUEST',rank:`LEVEL ${q.level}`,subtitle:`${q.faction} · ${q.tier}`,footer:rewardText(q.reward),sections:[{label:'OBJECTIVE',text:spawn(false)},{label:'INDEPENDENT CREATURES',text:spawn(true)||'No blue creatures.'}],art:q.id,accent:q.faction};
}
function event(e:EventCard):RasterCardText {
 const sections:RasterCardText['sections']=[];
 if(e.boss)sections.push({label:'THREAT / ATTACK / HEALTH',text:`${e.boss.stats.threat}+ / ${e.boss.stats.attack} / ${e.boss.stats.health}`});
 sections.push({label:'EVENT',text:eventText(e)});
 for(const effect of e.effects)if(effect.op==='auction')sections.push({label:'AUCTION ITEM',text:cardName(effect.item)});
 return {id:e.id,category:'event',title:e.name,kind:'EVENT',rank:`FATE ${e.fate}`,subtitle:e.overlord?'Kel’Thuzad':e.bonus?'Bonus event':'Lordaeron',footer:e.bonus?'Bonus · draw another event':'Remains until resolved',sections,art:e.id,accent:'arcane'};
}
function creature(c:Creature):RasterCardText {
 return {id:`creature-${c.id}`,category:'creature',title:c.name,kind:'CREATURE',rank:'BESTIARY',subtitle:'Lordaeron bestiary',footer:'Threat / attack / health',sections:[{label:'ENEMY ENCOUNTER',text:creatureRules[c.rule]},...(['green','blue','red'] as const).filter(color=>c.stock[color]>0).map(color=>({label:color.toUpperCase(),text:`${c.stats[color].threat}+ threat · ${c.stats[color].attack} attack · ${c.stats[color].health} health`}))],art:`creature-${c.id}`,accent:'nature'};
}
function overlord(o:Overlord,count:4|6):RasterCardText {
 const s=o.stats[count];
 return {id:`overlord-${o.id}-${count}`,category:'overlord',title:o.name,kind:'OVERLORD',rank:`${count} HEROES`,subtitle:`${count} characters · ${regionName(o.region)}`,footer:'Defeat this Overlord to win for your faction',sections:[{label:'THREAT / ATTACK / HEALTH',text:`${s.threat}+ / ${s.attack} / ${s.health}`},{label:'OVERLORD RULES',text:overlordText(o)}],art:`overlord-${o.id}`,accent:'arcane'};
}
function character(c:Character):RasterCardText {
 const racial=p.cards.find(v=>v.id===c.racial);
 const sections:RasterCardText['sections']=[{label:'LEVEL · HEALTH / ENERGY · XP',text:c.capacities.map((v,i)=>`${i+1}: ${v.health} / ${v.energy} · ${p.xp[i]} XP`).join('  |  ')}];
 if(racial)sections.push({label:`RACIAL · ${racial.name}`,text:racial.abilities.map(a=>`${triggerLabels[a.timing]}: ${abilityRasterText(racial,a)}`).concat(staticCardText(racial)).join(' ')});
 c.slots.forEach((s,i)=>sections.push({label:`SLOT ${i+1} · ${s.stanceOnly?'STANCE':s.types.join(' / ').toUpperCase()}`,text:`${s.traits.includes('all')?'All traits':s.traits.join(' / ')}${s.printed?` · ${names([s.printed])}`:''}`}));
 return {id:`character-${c.id}`,category:'character',title:c.name,kind:'CHARACTER',rank:c.faction.toUpperCase(),subtitle:`${c.race} · ${c.classId}`,footer:'Starting: 5 gold · 2 actions · bag capacity 3',sections,art:`portrait:${c.id}`,accent:c.faction};
}
export function allRasterCardText():RasterCardText[]{return [...p.cards.map(ability),...p.quests.map(quest),...p.events.map(event),...p.creatures.map(creature),...p.overlords.flatMap(o=>[overlord(o,4),overlord(o,6)]),...p.characters.map(character)];}
export function rasterCardDescription(c:RasterCardText):string {return [c.title,c.kind,c.rank,c.subtitle,...c.sections.map(s=>[s.label,s.text].filter(Boolean).join(': ')),c.footer].filter(Boolean).join('\n');}
