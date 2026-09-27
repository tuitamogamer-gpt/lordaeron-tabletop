import original from '../original-characters.json' with {type:'json'};
import type { Ability, Card, Character, ClassId, Faction, Slot, SlotType } from '../../rules/model.js';
import { ability, change, definedCard, dice, pool, resource, spot, stat, token } from './builders.js';
import { scanSource } from './source.js';
const all:Slot={types:['instant','active'],traits:['all']};
const general:Slot={types:['general','instant'],traits:['all']};
const racialByClass:Record<ClassId,[string,string]>={warrior:['Shadowmeld','Bloodfury'],mage:['Expansive Mind','Cannibalize'],hunter:['Stoneform','Warstomp'],druid:['Shadowmeld','Warstomp'],paladin:['Weapon Specialization',''],priest:['Stoneform','Regeneration'],rogue:['Expansive Mind','Regeneration'],shaman:['','Bloodfury'],warlock:['Weapon Specialization','Cannibalize']};
const raceByRacial:Record<string,string>={'Shadowmeld':'Night Elf','Bloodfury':'Orc','Expansive Mind':'Gnome','Cannibalize':'Undead','Stoneform':'Dwarf','Warstomp':'Tauren','Weapon Specialization':'Human','Regeneration':'Troll'};
export const STARTING_CARDS:Card[]=[];
export const BASE_CHARACTERS:Character[]=(['Alliance','Horde'] as const).flatMap((side,sideIndex)=>original[side].map((raw,index)=>{
 const cls=raw.class.toLowerCase() as ClassId, horde=side==='Horde',id=raw.name.toLowerCase().replace(/[^a-z]+/g,'-');
 const source=scanSource(`Character Sheets/${raw.class} ${horde?'H':'A'}.png`);
 const racial=racialByClass[cls][horde?1:0],racialId=`${id}-racial`;
 const add=(key:string,name:string,type:SlotType,trait:string,abilities:Ability[],extra:Partial<Card>={})=>{
  const card=definedCard(name,{id:`${id}-${key}`,source,printed:true,type,trait,abilities,...extra});STARTING_CARDS.push(card);return card.id;
 };
 let racials:Ability[]=[];
 if(['Shadowmeld','Warstomp'].includes(racial))racials=[ability('pool',[dice(racial==='Shadowmeld'?'blue':'red')],{automatic:true,condition:{kind:'first-round'}})];
 if(racial==='Weapon Specialization')racials=[pool(stat('reroll',1))];
 if(racial==='Bloodfury')racials=[pool(stat('attrition',1))];
 if(['Regeneration','Expansive Mind'].includes(racial))racials=[ability('turn-start',[resource(racial==='Regeneration'?'health':'energy',1)],{automatic:true})];
 if(racial==='Cannibalize')racials=[ability('combat-end',[resource('health',2)],{automatic:true,condition:{kind:'opponent-defeated'}})];
 if(racial==='Stoneform')racials=[ability('reroll',[{op:'change',filter:{values:[1,2]},value:3,count:1,colorChoice:true}],{startOnly:true})];
 STARTING_CARDS.push(definedCard(racial,{id:racialId,source,kind:'racial',type:'general',abilities:racials,description:racial==='Stoneform'?'At the start of your Reroll step, change one result of 1 or 2 into a 3 of any available color (FAQ 1.4).':''}));
 const top:Slot[]=[structuredClone(all),structuredClone(all),structuredClone(all)];
 if(['warlock','mage','druid','rogue'].includes(cls))top[2].types=['active'];
 if(cls==='hunter')top[2].types=['instant'];
 if(cls==='warrior')top[0]={types:['active'],traits:['all'],stanceOnly:true,printed:add('stance','Battle Stance','active','Stance',[pool(dice('red'))],{kind:'power',classId:cls,unique:'Stance'})};
 let ranged:Slot,melee:Slot,armor:Slot;
 const red=[pool(dice('red'))],green=[pool(dice('green'))];
 const bow=(name:string,trait:string)=>add('ranged',name,'ranged',trait,[pool(dice('blue')),ability('after-reroll',[spot({colors:['blue'],min:7},1,dice('blue'))])]);
 const wand=(name:string)=>add('ranged',name,'ranged','Wand',[pool(dice('blue')),ability('after-pool',[spot({colors:['blue'],values:[8]},1,dice('blue'))])]);
 if(cls==='warrior'){
  ranged={types:['ranged'],traits:['Bow','Gun'],printed:add('ranged','Charge','ranged','',[pool(resource('energy',1,true))],{kind:'power',classId:cls})};
  melee={types:['melee'],traits:['Mace','Sword'],printed:add('melee','Rusty Sword','melee','Sword',red)};
  armor={types:['armor'],traits:['all'],printed:add('armor','Slarkskin','armor','Mail',green)};
 }else if(cls==='druid'){
  ranged={types:['instant'],traits:['all'],printed:add('ranged','Wrath','instant','',[ability('pool',[dice('blue')]),ability('after-reroll',[spot({colors:['red','blue'],min:5},1,stat('attrition',1))],{requires:'pool'})],{kind:'power',classId:cls,energy:1})};
  melee={types:['melee','instant'],traits:['Mace','Staff'],printed:add('melee','Darkwood Staff','melee','Staff',red)};
  armor={types:['armor'],traits:['Cloth','Leather'],printed:add('armor','Camouflaged Cloak','armor','Leather',green)};
 }else if(cls==='hunter'||cls==='rogue'){
  ranged={types:['ranged'],traits:['Bow','Gun'],printed:bow(cls==='hunter'?'Old Blunderbuss':'Ashwood Bow',cls==='hunter'?'Gun':'Bow')};
  melee={types:cls==='rogue'?['melee','instant']:['melee'],traits:cls==='hunter'?['Staff','Sword']:['Mace','Sword'],printed:add('melee',cls==='hunter'?"Hunter's Blade":horde?'Cursed Felblade':"Assassin's Blade",'melee','Sword',red)};
  armor={types:['armor'],traits:['Cloth','Leather'],printed:add('armor',cls==='hunter'?"Huntsman's Cape":'Worn Leather Vest','armor','Leather',green)};
 }else if(cls==='mage'){
  ranged={types:['ranged'],traits:['Wand'],printed:add('ranged',horde?'Dire Wand':'Moonstone Wand','ranged','Wand',[pool(dice('blue')),ability('pool',[dice('blue')],{id:'empower',cost:1})])};
  melee={types:['melee','instant'],traits:['Staff','Sword'],printed:add('melee','Crooked Staff','melee','Staff',red)};
  armor={types:['armor'],traits:['Cloth'],printed:add('armor',horde?'Crimson Robe':'Magesmith Robe','armor','Cloth',[ability('after-reroll',[token('armor')],{cost:1})])};
 }else if(cls==='priest'){
  ranged={types:['ranged'],traits:['Wand'],printed:wand('Spellcrafter Wand')};
  melee={types:['melee'],traits:['Mace','Staff'],printed:add('melee','Heavy Mace','melee','Mace',red)};
  armor={types:['armor'],traits:['Cloth'],printed:add('armor',horde?'Frayed Robe':'Apprentice Robe','armor','Cloth',[ability('after-reroll',[change({colors:['red','blue'],min:3},3,'green')])])};
 }else if(cls==='warlock'){
  ranged={types:['ranged'],traits:['Wand'],printed:wand('Gravestone Scepter')};
  melee={types:['melee','instant'],traits:['Staff','Sword'],printed:add('melee','Worn Staff','melee','Staff',red)};
  armor={types:['armor'],traits:['Cloth'],printed:add('armor',horde?'Moldy Robes':'Azure Silk Hood','armor','Cloth',[ability('wound',[{op:'prevent',amount:1}],{cost:1,condition:{kind:'has-damage'}})])};
 }else if(cls==='paladin'){
  ranged={types:['instant'],traits:['all'],printed:add('ranged','Judgement','instant','',[ability('pool',[{op:'judgement'}])],{kind:'power',classId:cls})};
  melee={types:['melee'],traits:['Mace','Sword'],printed:add('melee','Forsaken Maul','melee','Mace',red)};
  armor={types:['armor'],traits:['all'],printed:add('armor','Rusty Chainmail','armor','Mail',[pool(dice('green')),ability('after-pool',[spot({values:[1]},1,stat('reroll',1))])])};
 }else{
  ranged={types:['instant'],traits:['all'],printed:add('ranged','Lightning Bolt','instant','',[ability('pool',[dice('blue')]),ability('after-reroll',[change({colors:['red','blue'],min:4},5,'blue')],{requires:'pool'})],{kind:'power',classId:cls,energy:1})};
  melee={types:['melee'],traits:['Mace','Staff'],printed:add('melee','Rough Staff','melee','Staff',red)};
  armor={types:['armor'],traits:['Cloth','Leather'],printed:add('armor','Primal Wraps','armor','Leather',green)};
 }
 return {id,name:raw.name==='Shailara Whitherblade'?'Shailara Witherblade':raw.name,classId:cls,faction:side.toLowerCase() as Faction,portrait:sideIndex*8+index,race:raceByRacial[racial],capacities:raw.levelCaps,slots:[...top,ranged,melee,structuredClone(general),armor],racial:racialId,source};
}));
