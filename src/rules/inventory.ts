import { assert, capacity, card, character, integer, unique } from './common.js';
import type { Card, ContentPack, Equipped, Hero, Slot, State, TownOperation } from './model.js';
export const heroSlots=(p:ContentPack,h:Hero):Slot[]=>[...character(p,h.id).slots,...h.auctionItems.filter(id=>card(p,id).extraInstantSlot).map(()=>({types:['instant' as const],traits:['all']}))];
/** Item traits restrict items only. Power categories are checked across the whole sheet. */
export function fitsSlot(p:ContentPack,h:Hero,c:Card,area:Slot):boolean {
 const override=c.kind==='item'&&!c.addon&&h.talents.some(id=>{const v=card(p,id).equipOverride;return v&&area.types.includes(v.slot)&&v.traits.includes(c.trait??'')&&c.level<=v.maxLevel;});
 return c.level<=h.level&&(area.types.includes(c.type)||override)&&(c.kind!=='item'||area.traits.includes('all')||area.traits.includes(c.trait??'')||override)&&(!area.stanceOnly||c.unique==='Stance')&&(c.unique!=='Stance'||!!area.stanceOnly);
}
export function classDeck(p:ContentPack,h:Hero) {
 const cards=p.cards.filter(c=>c.classId===character(p,h.id).classId&&!c.printed);
 return {powers:cards.filter(c=>c.kind==='power'&&!h.learned.includes(c.id)),talents:cards.filter(c=>c.kind==='talent'&&!h.talents.includes(c.id))};
}
type Market = Pick<State, 'merchant'>;
export function equipped(p: ContentPack, h: Hero): string[] {
 return h.slots.flatMap((slot, i) => [slot.card ?? character(p, h.id).slots[i]?.printed, ...slot.addons].filter((id): id is string => !!id));
}
export const petCapacity=(p:ContentPack,h:Hero,id:string)=>(card(p,id).petHealth??0)+h.talents.reduce((n,t)=>{const v=card(p,t).petCapacity;return n+(v&&v.trait===card(p,id).trait?v.amount:0);},0);
export const bagSize = (p: ContentPack, ids: string[]) => ids.filter(id => !card(p, id).bagExempt).length;
export function receiveItem(p: ContentPack, s: Market, h: Hero, id: string, discard?: string) {
 assert(card(p, id).kind === 'item', "Only items can go in the bag.");
 h.bag.push(id);
 if (bagSize(p, h.bag) > 3) {
  assert(discard && h.bag.includes(discard) && !card(p, discard).bagExempt, "Your bag is full. Choose an item for the merchant.");
  h.bag.splice(h.bag.indexOf(discard), 1); s.merchant.push(discard);
 } else assert(!discard, "An item can only be discarded when the bag overflows.");
}
export function unequip(p: ContentPack, h: Hero, id: string) {
 const before=capacity(p,h);
 for (const slot of h.slots) { if (slot.card === id) delete slot.card; slot.addons = slot.addons.filter(c => c !== id); }
 delete h.pets[id];
 const c = card(p, id); if (c.kind === 'item') h.bag.push(id);
 const after=capacity(p,h);if(after.health<before.health)h.health=Math.min(h.health,after.health);if(after.energy<before.energy)h.energy=Math.min(h.energy,after.energy);
}
export function train(p: ContentPack, h: Hero, id: string) {
 const c = card(p, id);
 assert(c.kind === 'power' && !c.printed && c.classId === character(p, h.id).classId && c.level <= h.level && !h.learned.includes(id), "This power is unavailable for training.");
 assert(h.gold >= c.price, "Not enough gold."); h.gold -= c.price; h.learned.push(id);
}
export function manage(p: ContentPack, s: Market, h: Hero, slots: Equipped[], discard: string[], reEquip: string[] = []) {
 const def = {...character(p, h.id),slots:heroSlots(p,h)}, before = equipped(p, h);
 assert(slots.length === def.slots.length, "Incorrect number of equipment slots.");
 const oldItems = [...h.bag, ...h.slots.flatMap(a => [a.card, ...a.addons].filter((id): id is string => !!id && card(p, id).kind === 'item'))];
 const ids = slots.flatMap(a => [a.card, ...a.addons].filter((id): id is string => !!id));
 assert(unique(ids) && unique(discard), "The same card cannot occupy two slots.");
 assert(unique(reEquip)&&reEquip.every(id=>before.includes(id)&&ids.includes(id)&&card(p,id).kind==='power'),"Only an equipped power can be re-equipped.");
 const groups: string[] = []; let cost = 0;const newlyActive:string[]=[];
 slots.forEach((slot, i) => {
  const area = def.slots[i]; const functions: string[] = [];
  for (const id of [slot.card ?? area.printed, ...slot.addons].filter((x): x is string => !!x)) {
   const c = card(p, id), isPrinted = id === area.printed && !slot.card;
   assert(isPrinted || (c.kind === 'power' ? h.learned.includes(id) : oldItems.includes(id)), "This card is not in your bag or spellbook.");
   const override=h.talents.map(id=>card(p,id).equipOverride).find(v=>v&&area.types.includes(v.slot)&&v.traits.includes(c.trait??'')&&c.level<=v.maxLevel&&c.kind==='item'&&!c.addon);
   assert(c.level <= h.level && (area.types.includes(c.type)||override), "This card does not fit the slot or the hero’s level.");
   assert(c.kind !== 'item' || area.traits.includes('all') || area.traits.includes(c.trait ?? '')||override, "The item’s trait does not fit the slot.");
   assert(!area.stanceOnly || c.unique === 'Stance', "This slot is only for Stance powers.");
   assert(c.unique !== 'Stance' || area.stanceOnly, "A Stance must occupy its designated slot.");
   if (c.unique && c.kind === 'power') { assert(!groups.includes(c.unique), "Only one power in a unique category is allowed."); groups.push(c.unique); }
   if (slot.addons.includes(id)) { assert(c.addon && c.functionTrait && !functions.includes(c.functionTrait), "An add-on with this function is already equipped."); functions.push(c.functionTrait); }
   else assert(!c.addon, "An add-on belongs in an attachment slot.");
   const stayed=(h.slots[i].card??area.printed)===id||h.slots[i].addons.includes(id);
   if ((!stayed||reEquip.includes(id)) && c.type === 'active') newlyActive.push(id);
  }
 });
 // Management may equip the discount aura first; it never discounts its own equip cost.
 const modifiers=[...h.talents,...slots.flatMap((a,i)=>[a.card??def.slots[i].printed,...a.addons]).filter((id):id is string=>!!id&&!newlyActive.includes(id))].map(id=>card(p,id));
 for(const c of newlyActive.map(id=>card(p,id)).sort((a,b)=>(b.powerDiscount??0)-(a.powerDiscount??0))){
  const free=modifiers.some(ca=>ca.equipFreeTraits?.includes(c.trait??''));
  cost+=free?0:Math.max(0,c.energy-modifiers.reduce((n,ca)=>n+(ca.powerDiscount??0),0));modifiers.push(c);
 }
 assert(h.energy >= cost, "Not enough energy to equip active powers.");
 const nextItems = ids.filter(id => card(p, id).kind === 'item');
 h.bag = oldItems.filter(id => !nextItems.includes(id));
 for (const id of discard) { assert(bagSize(p, h.bag) > 3 && h.bag.includes(id) && !card(p, id).bagExempt, "Invalid bag discard."); h.bag.splice(h.bag.indexOf(id), 1); s.merchant.push(id); }
 assert(bagSize(p, h.bag) <= 3, "A bag holds at most three items.");
 h.energy -= cost; h.slots = structuredClone(slots);
 const after = equipped(p, h);
 for (const id of Object.keys(h.pets)) if (!after.includes(id)) delete h.pets[id];
 for (const id of after) if (card(p, id).petHealth && (!before.includes(id)||newlyActive.includes(id)||reEquip.includes(id))) h.pets[id] = petCapacity(p,h,id);
 const cap = capacity(p, h); h.health = Math.min(h.health, cap.health); h.energy = Math.min(h.energy, cap.energy);
}
export function sell(p: ContentPack, s: Market, h: Hero, id: string) {
 const c = card(p, id), bag = h.bag.indexOf(id);
 assert(c.kind === 'item' && !c.soulbound && (bag >= 0 || h.slots.some(a => a.card === id || a.addons.includes(id))), "This item cannot be sold.");
 if (bag >= 0) h.bag.splice(bag, 1); else { unequip(p, h, id); h.bag.splice(h.bag.indexOf(id), 1); }
 h.gold += Math.ceil(c.price / 2); s.merchant.push(id);
}
export function rest(p: ContentPack, h: Hero, budget: number, health: number) {
 const cap = capacity(p, h);
 assert(integer(health, 0, budget) && health <= Math.max(0, cap.health - h.health), "Invalid recovery distribution.");
 h.health += health; h.energy = Math.max(h.energy, Math.min(cap.energy, h.energy + budget - health));
}
/** Shared transaction executor also powers the UI's read-only cart preview. */
export function townOperations(p: ContentPack, s: Market, h: Hero, health: number, operations: TownOperation[], recoverAfter = 0) {
 assert(operations.length <= 100,"Too many transactions.");
 assert(integer(recoverAfter,-1,operations.length),"Invalid recovery position.");
 assert(recoverAfter!==-1||health===0,"Skipped recovery cannot restore health.");
 for (let i=0;i<=operations.length;i++) {
  if(i===recoverAfter)rest(p,h,h.level,health);
  if(i===operations.length)break;
  const op=operations[i];
  if (op.op === 'train') train(p,h,op.card);
  else if (op.op === 'sell') sell(p,s,h,op.card);
  else { const item=card(p,op.card); assert(s.merchant.includes(item.id)&&h.gold>=item.price,"This item is unavailable or you lack enough gold."); h.gold-=item.price; s.merchant.splice(s.merchant.indexOf(item.id),1); receiveItem(p,s,h,item.id,op.discard); }
 }
}
