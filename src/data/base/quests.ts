import type { Color, Faction, ItemDeck, Quest, Tier } from '../../rules/model.js';
import { QUEST_ROWS } from './quest-rows.js';
import { scanSource, slug } from './source.js';
const colors:Record<string,Color>={b:'blue',g:'green',r:'red'};
const decks:Record<string,ItemDeck>={t:'triangle',s:'square',c:'circle'};
export const BASE_QUESTS:Quest[]=Object.entries(QUEST_ROWS).flatMap(([folder,rows])=>rows.map((row,i)=>{
 const [name,level,gold,xp,spawns,items,special]=row.split('|');
 const [side,tier]=folder.split('/');
 return {id:`quest-${side.startsWith('Horde')?'horde':'alliance'}-${slug(name)}`,name,
  faction:side.split(' ')[0].toLowerCase() as Faction,tier:tier.toLowerCase() as Tier,level:Number(level),
  spawns:spawns.split(';').map(value=>{const [creature,color,region,count]=value.split(':');return {creature,color:colors[color],region,count:Number(count)};}),
  reward:{gold:Number(gold),xp:Number(xp),items:items?items.split(',').map(value=>({deck:decks[value[0]],draw:Number(value.slice(1))})):[],special:special?special.split(';').map(name=>`special-${slug(name==='Jade Breastplate'?'Jade Breastplate of Power':name)}`):[]},
  source:scanSource(`${folder}/${i+1}.png`,name==='Brutes in the Barrows'?'The Infectis Scar replaces both printed Hearthglen locations':undefined),
 };
}));
