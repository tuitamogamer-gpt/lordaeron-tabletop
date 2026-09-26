import { assert, capacity, card, character, integer, unique } from './common.js';
import type { ContentPack, Equipped, Hero, State, TownOperation } from './model.js';
type Market = Pick<State, 'merchant'>;
export function equipped(p: ContentPack, h: Hero): string[] {
 return h.slots.flatMap((slot, i) => [slot.card ?? character(p, h.id).slots[i].printed, ...slot.addons].filter((id): id is string => !!id));
}
export const bagSize = (p: ContentPack, ids: string[]) => ids.filter(id => !card(p, id).bagExempt).length;
export function receiveItem(p: ContentPack, s: Market, h: Hero, id: string, discard?: string) {
 assert(card(p, id).kind === 'item', 'Samo predmeti mogu u torbu.');
 h.bag.push(id);
 if (bagSize(p, h.bag) > 3) {
  assert(discard && h.bag.includes(discard) && !card(p, discard).bagExempt, 'Torba je puna. Odaberi predmet za trgovca.');
  h.bag.splice(h.bag.indexOf(discard), 1); s.merchant.push(discard);
 } else assert(!discard, 'Predmet se može odbaciti samo kada je torba prepuna.');
}
export function unequip(p: ContentPack, h: Hero, id: string) {
 for (const slot of h.slots) { if (slot.card === id) delete slot.card; slot.addons = slot.addons.filter(c => c !== id); }
 delete h.pets[id];
 const c = card(p, id); if (c.kind === 'item') h.bag.push(id);
}
export function train(p: ContentPack, h: Hero, id: string) {
 const c = card(p, id);
 assert(c.kind === 'power' && !c.printed && c.classId === character(p, h.id).classId && c.level <= h.level && !h.learned.includes(id), 'Moć nije dostupna za trening.');
 assert(h.gold >= c.price, 'Nema dovoljno zlata.'); h.gold -= c.price; h.learned.push(id);
}
export function manage(p: ContentPack, s: Market, h: Hero, slots: Equipped[], discard: string[]) {
 const def = character(p, h.id), before = equipped(p, h);
 assert(slots.length === def.slots.length, 'Pogrešan broj mjesta za opremu.');
 const oldItems = [...h.bag, ...h.slots.flatMap(a => [a.card, ...a.addons].filter((id): id is string => !!id && card(p, id).kind === 'item'))];
 const ids = slots.flatMap(a => [a.card, ...a.addons].filter((id): id is string => !!id));
 assert(unique(ids) && unique(discard), 'Ista karta ne može biti na dva mjesta.');
 const groups: string[] = []; let cost = 0;
 slots.forEach((slot, i) => {
  const area = def.slots[i]; const functions: string[] = [];
  for (const id of [slot.card ?? area.printed, ...slot.addons].filter((x): x is string => !!x)) {
   const c = card(p, id), isPrinted = id === area.printed && !slot.card;
   assert(isPrinted || (c.kind === 'power' ? h.learned.includes(id) : oldItems.includes(id)), 'Karta nije u tvojoj torbi ili knjizi.');
   assert(c.level <= h.level && area.types.includes(c.type), 'Karta ne odgovara mjestu ili nivou junaka.');
   assert(c.kind !== 'item' || area.traits.includes('all') || area.traits.includes(c.trait ?? ''), 'Osobina predmeta ne odgovara mjestu.');
   assert(!area.stanceOnly || c.unique === 'Stance', 'Ovo mjesto je samo za Stance moći.');
   assert(c.unique !== 'Stance' || area.stanceOnly, 'Stance mora biti u predviđenom mjestu.');
   if (c.unique && c.kind === 'power') { assert(!groups.includes(c.unique), 'Dozvoljena je samo jedna moć jedinstvene kategorije.'); groups.push(c.unique); }
   if (slot.addons.includes(id)) { assert(c.addon && c.functionTrait && !functions.includes(c.functionTrait), 'Add-on iste funkcije je već opremljen.'); functions.push(c.functionTrait); }
   else assert(!c.addon, 'Add-on pripada dodatnom mjestu.');
   if (!before.includes(id) && c.type === 'active') cost += c.energy;
  }
 });
 assert(h.energy >= cost, 'Nema energije za opremanje aktivnih moći.');
 const nextItems = ids.filter(id => card(p, id).kind === 'item');
 h.bag = oldItems.filter(id => !nextItems.includes(id));
 for (const id of discard) { assert(bagSize(p, h.bag) > 3 && h.bag.includes(id) && !card(p, id).bagExempt, 'Nevažeće odbacivanje iz torbe.'); h.bag.splice(h.bag.indexOf(id), 1); s.merchant.push(id); }
 assert(bagSize(p, h.bag) <= 3, 'Torba smije imati najviše tri predmeta.');
 h.energy -= cost; h.slots = structuredClone(slots);
 const after = equipped(p, h);
 for (const id of Object.keys(h.pets)) if (!after.includes(id)) delete h.pets[id];
 for (const id of after) if (card(p, id).petHealth && !before.includes(id)) h.pets[id] = card(p, id).petHealth!;
 const cap = capacity(p, h); h.health = Math.min(h.health, cap.health); h.energy = Math.min(h.energy, cap.energy);
}
export function sell(p: ContentPack, s: Market, h: Hero, id: string) {
 const c = card(p, id), bag = h.bag.indexOf(id);
 assert(c.kind === 'item' && !c.soulbound && (bag >= 0 || h.slots.some(a => a.card === id || a.addons.includes(id))), 'Predmet se ne može prodati.');
 if (bag >= 0) h.bag.splice(bag, 1); else { unequip(p, h, id); h.bag.splice(h.bag.indexOf(id), 1); }
 h.gold += Math.ceil(c.price / 2); s.merchant.push(id);
}
export function rest(p: ContentPack, h: Hero, budget: number, health: number) {
 const cap = capacity(p, h);
 assert(integer(health, 0, budget) && health <= Math.max(0, cap.health - h.health), 'Neispravna raspodjela oporavka.');
 h.health += health; h.energy = Math.max(h.energy, Math.min(cap.energy, h.energy + budget - health));
}
/** Shared transaction executor also powers the UI's read-only cart preview. */
export function townOperations(p: ContentPack, s: Market, h: Hero, health: number, operations: TownOperation[]) {
 rest(p,h,h.level,health); assert(operations.length <= 100,'Previše transakcija.');
 for (const op of operations) {
  if (op.op === 'train') train(p,h,op.card);
  else if (op.op === 'sell') sell(p,s,h,op.card);
  else { const item=card(p,op.card); assert(s.merchant.includes(item.id)&&h.gold>=item.price,'Predmet nije dostupan ili nema dovoljno zlata.'); h.gold-=item.price; s.merchant.splice(s.merchant.indexOf(item.id),1); receiveItem(p,s,h,item.id,op.discard); }
 }
}
