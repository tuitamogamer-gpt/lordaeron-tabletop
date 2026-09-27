import type { Ability, Card, ClassId, Color, DiceFilter, Effect, Timing } from '../../rules/model.js';
import { ability, definedCard, spot } from './builders.js';
import { scanSource, slug } from './source.js';
import index from './scan-index.json' with {type:'json'};
export const classDeck=(classId:ClassId)=>{
 const cards:Card[]=[];
 const add=(index:number,name:string,kind:'talent'|'power',type:Card['type'],level:number,price:number,energy:number,abilities:Ability[],extra:Partial<Card>={})=>{
  const folder=classId[0].toUpperCase()+classId.slice(1);
  const corrections:Record<string,string>={'Slice and Dice':'End of your Reroll step','Shadowguard':'During the Defense phase','Arcane Missiles':'Free only if used in the preceding round of this combat and unharmed'};
  const path=`Classes/${folder}/${index}.png`,layer=`Classes/${folder}/Layer ${index}.png`;
  const c=definedCard(name,{id:`${classId}-${slug(name)}`,kind,type,classId,level,price,energy,abilities,source:scanSource(Object.hasOwn(scanIndex,path)?path:layer,corrections[name]),...extra});cards.push(c);return c;
 };
 return {cards,talent:(i:number,n:string,l:number,a:Ability[],e:Partial<Card>={})=>add(i,n,'talent','general',l,0,0,a,e),power:(i:number,n:string,t:Card['type'],l:number,p:number,en:number,a:Ability[],e:Partial<Card>={})=>add(i,n,'power',t,l,p,en,a,e)};
};
const scanIndex=index;
export const many=(timing:Timing,max:number,effects:(n:number)=>Effect[],options:Partial<Ability>={}):Ability[]=>Array.from({length:max},(_,i)=>ability(timing,effects(i+1),{id:`${timing}-${i+1}`,usageGroup:timing,...options}));
export const eachSpot=(timing:Timing,filter:DiceFilter,effects:(n:number)=>Effect[],max=filter.colors?.length===1?7:21)=>many(timing,max,n=>[spot(filter,n,...effects(n))]);
export const rb:Color[]=['red','blue'];
