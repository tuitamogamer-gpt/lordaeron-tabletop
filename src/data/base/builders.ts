import type { Ability, Card, Color, DiceFilter, Effect, Timing } from '../../rules/model.js';
export const dice=(color:Color,amount=1):Effect=>({op:'dice',color,amount});
export const stat=(stat:'reroll'|'attrition'|'armor'|'threat',amount:number):Effect=>({op:'stat',stat,amount});
export const token=(box:'damage'|'defense'|'attrition'|'armor',amount=1):Effect=>({op:'token',box,amount});
export const resource=(resource:'health'|'energy'|'gold',amount:number,gain=false):Effect=>({op:'resource',resource,amount,gain});
export const spot=(filter:DiceFilter,count:number,...effects:Effect[]):Effect=>({op:'spot',filter,count,effects});
export const change=(filter:DiceFilter,value?:number,color?:Color,count=1):Effect=>({op:'change',filter,count,value,color});
export const ability=(timing:Timing,effects:Effect[],options:Partial<Ability>={}):Ability=>({id:timing,timing,effects,...options});
export const pool=(...effects:Effect[]):Ability=>ability('pool',effects,{id:'passive',automatic:true});
export function definedCard(name:string,options:Partial<Card>&Pick<Card,'id'|'source'>):Card {
 return {name,kind:'item',type:'general',level:1,price:0,energy:0,description:'',abilities:[],...options};
}
