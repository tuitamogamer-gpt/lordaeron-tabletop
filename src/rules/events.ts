import { assert, faction, hero, note, other, random } from './common';
import { drawQuest, rewards, stronger } from './rewards';
import type { ContentPack, State } from './model';
export function finishEvent(s: State) {
 s.eventSeen = []; s.faction = other(s.faction); s.phase = 'actions'; s.tradeWindow = false;
}
export function drawEvents(p: ContentPack, s: State) {
 s.phase = 'event';
 // Bounded by the physical deck, including duplicate bonus title termination (p25).
 while (s.eventDeck.length) {
  const id = s.eventDeck.shift()!, e = p.events.find(e => e.id === id)!;
  s.eventDiscard.push(id);
  if (e.bonus && s.eventSeen.includes(e.name)) { finishEvent(s); return; }
  s.eventSeen.push(e.name); note(s, `Događaj: ${e.name}.`);
  const o = p.overlords.find(o => o.id === s.overlord.id)!;
  if (o.route?.length) { const i = Math.max(0, o.route.indexOf(s.overlord.region)); s.overlord.region = o.route[(i + e.fate) % o.route.length]; }
  for (const effect of e.effects) {
   switch (effect.op) {
    case 'gold': {
     const strong = stronger(p, s);
     for (const h of s.heroes) if (effect.faction === 'all' || (effect.faction === 'stronger' ? strong.includes(faction(p, h.id)) : !strong.includes(faction(p, h.id)))) h.gold = Math.max(0, h.gold + effect.amount);
     break;
    }
    case 'merchant': s.merchant.push(...s.itemDecks[effect.deck].splice(0, effect.count)); break;
    case 'war': s.wars.push({ id, regions: effect.regions, reward: effect.reward }); break;
    case 'auction': s.auction = { event: id, item: effect.item, bids: {} }; break;
    case 'overlord': for (const stat of ['attack', 'health', 'threat'] as const) s.overlord[stat] += effect[stat] ?? 0; break;
    case 'spawn': {
     for (const spawn of effect.spawns) {
      const c = p.creatures.find(c => c.id === spawn.creature)!;
      const available = c.stock[spawn.color] - s.enemies.filter(e => e.creature === spawn.creature && e.color === spawn.color).length;
      for (let n = 0; n < Math.min(spawn.count, available); n++) s.enemies.push({ id: `${id}:${spawn.region}:${n}`, ...spawn });
     } break;
    }
   }
  }
  if (s.auction) return;
  if (!e.bonus) { finishEvent(s); return; }
 }
 finishEvent(s);
}
export function bid(p: ContentPack, s: State, id: string, amount: number) {
 const a = s.auction, h = hero(s, id);
 assert(a && !Object.hasOwn(a.bids, id) && Number.isSafeInteger(amount) && amount >= 0 && amount <= h.gold, 'Nevažeća ili već poslana ponuda.');
 a.bids[id] = amount;
 if (Object.keys(a.bids).length === s.heroes.length) {
  const max = Math.max(...Object.values(a.bids)), tied = s.heroes.filter(h => a.bids[h.id] === max), winner = tied[random(s, tied.length)];
  winner.gold -= max; winner.auctionItems.push(a.item); note(s, `${winner.id} dobiva aukciju za ${max} zlata.`);
  const e = p.events.find(e => e.id === a.event)!; delete s.auction;
  if (e.bonus) drawEvents(p, s); else finishEvent(s);
 }
}
export function checkWars(p: ContentPack, s: State): boolean {
 const f = other(s.faction), h = s.heroes.filter(h => faction(p, h.id) === f);
 const war = s.wars.find(w => w.regions.every(r => h.some(h => h.location === r)));
 if (!war) return false;
 s.wars = s.wars.filter(w => w.id !== war.id); rewards(p, s, h.map(h => h.id), h.map(h => h.id), war.reward); s.phase = 'reward'; return true;
}
/** Public helper for content fixtures; the reducer selects only nonempty, spawnable decks. */
export function replacement(p: ContentPack, s: State, tier: 'green' | 'yellow' | 'red') {
 assert(s.reward?.replacement, 'Nema questa za zamjenu.');
 assert(drawQuest(p, s, s.reward.faction, tier), 'Iz ovog špila trenutno nije moguće postaviti quest.');
 s.reward.replacement = false;
}
