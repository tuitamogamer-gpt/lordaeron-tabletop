import { card } from '../rules/common.js';
import { bagSize, equipped, fitsSlot, heroSlots, manage } from '../rules/inventory.js';
import type { Card, Command, ContentPack, Effect, Equipped, Hero } from '../rules/model.js';

function effectValue(e:Effect):number {
 switch(e.op){
  case 'dice':return e.amount*(e.color==='blue'?1.3:e.color==='green'?.9:1.15);
  case 'stat':return e.amount*(e.stat==='threat'?-1.6:e.stat==='reroll'?.65:1);
  case 'token':return e.amount*(e.box==='damage'?1.6:1.2);
  case 'resource':return e.amount*(e.resource==='health'?.65:.8);
  case 'if':return Math.max(...[e.then,e.otherwise??[]].map(v=>v.reduce((n,e)=>n+effectValue(e),0)))*.7;
  case 'spot':return e.effects.reduce((n,v)=>n+effectValue(v),0)*.5;
  case 'remove':return e.effects.reduce((n,v)=>n+effectValue(v),0)*.6-e.count*.3;
  case 'change':return e.count*(e.value===8?1:.55);
  case 'unequip-self':return -.5;
  case 'damage-all':return -e.amount;
  case 'resource-level':return 2;
  case 'heal-reaction':case 'prevent':return e.amount*.7;
  case 'restrict':return -1;
  case 'group-dice':return e.amount*2;
  case 'group-resource':return e.amount*1.2;
  case 'reroll-selected':return e.max==='level'?1.6:e.max*.5;
  default:return .4;
 }
}
/** Strength alternatives count once. A card with 21 choices is still one power. */
export function cardValue(p:ContentPack,id:string,h?:Hero):number {
 const c=card(p,id),groups=new Map<string,number>();
 for(const a of c.abilities){
  const score=a.effects.reduce((n,e)=>n+effectValue(e),0)*(a.condition?.kind==='equipped'&&h&&!equipped(p,h).includes(a.condition.cardId) ? .2 : 1)-(a.cost??0)*.22;
  const key=a.usageGroup??a.id;groups.set(key,Math.max(groups.get(key)??-Infinity,score));
 }
 let value=[...groups.values()].reduce((n,v)=>n+v,0)+(c.petHealth??0)*.6+(c.capacity?.health??0)*.5+(c.capacity?.energy??0)*.7+(c.powerDiscount??0)*2+(c.instantDiscount??0)*1.7;
 value+=(c.travelPower?1.2:0)+(c.actionPower?1:0)+(c.discount?1:0)+(c.freeInstantOnce?1.5:0)+(c.equipFreeTraits?2:0)+(c.cardRepeat?1.4:0)+(c.instantRepeat?2:0)+(c.petCapacity?1.2:0)+(c.finisher ? .5 : 0);
 for(const e of c.enhance??[])value+=e.effects.reduce((n,v)=>n+effectValue(v),0)*(h&&!h.learned.includes(e.card) ? .2 : 1);
 for(const a of c.aura??[])value+=a.effects.reduce((n,v)=>n+effectValue(v),0)*1.5;
 if(c.type==='instant')value-=c.energy*.2;
 return value;
}
export function loadoutValue(p:ContentPack,h:Hero):number {
 return equipped(p,h).reduce((n,id)=>n+cardValue(p,id,h),0)+Object.values(h.pets).reduce((n,hp)=>n+hp*.12,0);
}
type Loadout=Extract<Command,{type:'manage'}>;
/** Bounded whole-sheet search, using only the hero's public possessions. */
export function loadouts(p:ContentPack,h:Hero):Loadout[]{
 const areas=heroSlots(p,h),owned=[...new Set([...h.learned,...h.bag,...h.slots.flatMap(s=>[s.card,...s.addons].filter((id):id is string=>!!id))])];
 const options=areas.map(area=>owned.filter(id=>fitsSlot(p,h,card(p,id),area)));
 const order=areas.map((_,i)=>i).sort((a,b)=>options[a].length-options[b].length);
 type Candidate={slots:Equipped[];ids:string[];groups:string[];score:number;cost:number};
 let beam:Candidate[]=[{slots:areas.map(()=>({addons:[]})),ids:[],groups:[],score:0,cost:0}];
 const discount=h.talents.reduce((n,id)=>n+(card(p,id).powerDiscount??0),0)+Math.max(0,...owned.map(id=>card(p,id).powerDiscount??0));
 for(const i of order){
  const expanded:Candidate[]=[];
  const addons=options[i].filter(id=>card(p,id).addon);
  const attachments:string[][]=[[]];
  for(const id of addons)for(const group of [...attachments])if(!group.some(a=>card(p,a).functionTrait===card(p,id).functionTrait))attachments.push([...group,id]);
  for(const prev of beam)for(const id of [undefined,...options[i].filter(id=>!card(p,id).addon)])for(const extra of attachments){
   const effective=id??areas[i].printed,ids=[...effective?[effective]:[],...extra];
   if(ids.some(v=>prev.ids.includes(v)))continue;
   const groups=ids.map(v=>card(p,v)).filter(c=>c.kind==='power'&&c.unique).map(c=>c.unique!);
   if(new Set([...prev.groups,...groups]).size!==prev.groups.length+groups.length)continue;
   const cost=prev.cost+ids.reduce((n,v)=>{const c=card(p,v);return n+(c.type==='active'&&(h.slots[i].card??areas[i].printed)!==v&&!h.talents.some(t=>card(p,t).equipFreeTraits?.includes(c.trait??''))?Math.max(0,c.energy-discount):0);},0);
   if(cost>h.energy)continue;
   const slots=prev.slots.map((s,j)=>i===j?{card:id,addons:extra}:s);
   expanded.push({slots,ids:[...prev.ids,...ids],groups:[...prev.groups,...groups],score:prev.score+ids.reduce((n,v)=>n+cardValue(p,v,h),0),cost});
  }
  beam=expanded.sort((a,b)=>(b.score-b.cost*.12)-(a.score-a.cost*.12)).slice(0,36);
 }
 const candidates:Loadout[]=[{type:'manage',hero:h.id,slots:structuredClone(h.slots),discard:[]}];
 for(const b of beam){
  const bag=owned.filter(id=>card(p,id).kind==='item'&&!b.ids.includes(id)),discard=bag.filter(id=>!card(p,id).bagExempt).sort((a,b)=>cardValue(p,a,h)-cardValue(p,b,h)).slice(0,Math.max(0,bagSize(p,bag)-3));
  const c:Loadout={type:'manage',hero:h.id,slots:b.slots,discard};
  try{manage(p,{merchant:[]},structuredClone(h),c.slots,c.discard);candidates.push(c);}catch{/* Lower-bound pruning is followed by the actual equipment rules. */}
 }
 const base=[...candidates];
 for(const c of base)for(const id of Object.keys(h.pets))if(h.pets[id]<(card(p,id).petHealth??0)&&c.slots.some(s=>s.card===id)){
  const next={...c,reEquip:[id]};try{manage(p,{merchant:[]},structuredClone(h),next.slots,next.discard,next.reEquip);candidates.push(next);}catch{/* Refresh also pays energy. */}
 }
 const unique=new Map(candidates.map(c=>[JSON.stringify(c),c]));
 return [...unique.values()].sort((a,b)=>scoreLoadout(p,h,b)-scoreLoadout(p,h,a)).slice(0,6);
}
export function scoreLoadout(p:ContentPack,h:Hero,c:Loadout):number {
 const next=structuredClone(h);manage(p,{merchant:[]},next,c.slots,c.discard,c.reEquip);
 return loadoutValue(p,next)-(h.energy-next.energy)*.12-c.discard.reduce((n,id)=>n+cardValue(p,id,h)*.3,0);
}
export function usableItem(p:ContentPack,h:Hero,c:Card){return heroSlots(p,h).some(area=>fitsSlot(p,{...h,level:Math.max(h.level,c.level)},c,area));}
