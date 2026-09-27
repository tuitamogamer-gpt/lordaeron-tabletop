import type { Ability, Card, ItemDeck, SlotType } from '../../rules/model.js';
import { definedCard } from './builders.js';
import { scanSource, slug } from './source.js';
export function itemDeck(deck:ItemDeck,folder:string,layer=false){
 const cards:Card[]=[];
 const add=(index:number,name:string,type:SlotType,level:number,price:number,trait:string,abilities:Ability[],extra:Partial<Card>={})=>{
  const c=definedCard(name,{id:`${deck}-${index}-${slug(name)}`,source:scanSource(`${folder}/${layer?'Layer ':''}${index}.png`,name==='Scroll of Lesser Spirit'?'Printed duplicate title corrected to Spirit':name==='Crackling Staff'?'End of Dice Pool step':undefined),deck,type,level,price,trait,abilities,...extra});cards.push(c);return c;
 };
 const copy=(index:number,original:number)=>{const c=cards.find(c=>c.id.startsWith(`${deck}-${original}-`));if(!c)throw new Error(`Missing item ${original}`);return add(index,c.name,c.type,c.level,c.price,c.trait??'',structuredClone(c.abilities),{addon:c.addon,functionTrait:c.functionTrait,bagExempt:c.bagExempt,capacity:c.capacity,description:c.description});};
 return {cards,add,copy};
}
