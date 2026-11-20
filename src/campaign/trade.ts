import { card, character, faction } from '../rules/common';
import { fitsSlot, heroSlots } from '../rules/inventory';
import type { ContentPack, Hero } from '../rules/model';
import type { GameView } from '../rules/view';

/**
 * What an item is worth to one character: whether he can put it on now, only at a higher level, never, or carries it to use
 * from the bag. Shown wherever an item changes hands (a quest reward, a trade), so that the choice is not made on a name.
 */
export interface ItemFit { fit: 'equip' | 'level' | 'carry' | 'none'; text: string; }
export function itemFit(p: ContentPack, h: Hero, id: string): ItemFit {
 const c = card(p, id), areas = heroSlots(p, h);
 if (c.type === 'bag') return { fit: 'carry', text: c.trait === 'Food' ? 'Eaten while resting' : 'Used from the bag' };
 const at = areas.map((area, i) => fitsSlot(p, h, c, area) ? i : -1).filter(i => i >= 0);
 if (at.length) {
  if (c.addon) return { fit: 'equip', text: 'Can attach it now' };
  const held = (i: number) => h.slots[i]?.card ?? areas[i].printed, free = at.some(i => !held(i)), worn = at.map(held).find(Boolean);
  return { fit: 'equip', text: free || !worn ? 'Can equip now · free slot' : `Can equip now · in place of ${card(p, worn).name}` };
 }
 if (areas.some(area => fitsSlot(p, { ...h, level: 5 }, c, area))) return { fit: 'level', text: `Can equip at level ${c.level}` };
 return { fit: 'none', text: c.trait ? `Cannot equip ${c.trait}` : 'Cannot equip it' };
}
/** The best use first: the character who can wear the item now, then the one who grows into it. */
const WORTH: Record<ItemFit['fit'], number> = { equip: 3, level: 2, carry: 1, none: 0 };
export const fitWorth = (fit: ItemFit) => WORTH[fit.fit];

/**
 * Trading (rulebook p. 36): free, between characters of the same faction standing in the same region, once an action has been
 * taken in their faction's turn (rules/game.ts > trade). `partners` are the allies standing with the character; `reason` says
 * why nothing can change hands yet, `short` in the few words that fit under the button.
 */
export interface TradeDesk { partners: Hero[]; open: boolean; reason: string; short: string; }
export function tradeDesk(p: ContentPack, s: Pick<GameView, 'phase' | 'faction' | 'heroes' | 'tradeWindow' | 'respawns'>, id: string, controlled: string[]): TradeDesk {
 const h = s.heroes.find(v => v.id === id), side = h ? faction(p, id) : undefined;
 const partners = h ? s.heroes.filter(v => v.id !== id && v.location === h.location && faction(p, v.id) === side) : [];
 const goods = (v: Hero) => v.gold > 0 || v.bag.some(item => !card(p, item).soulbound);
 const names = partners.map(v => character(p, v.id).name.split(' ')[0]);
 const [reason, short] = !h || !partners.length ? ['No ally stands in this region.', 'no ally here']
  : !controlled.includes(id) ? ['Select a character you control.', 'AI character']
  : side !== s.faction || s.phase !== 'actions' ? ['Trading happens during your faction’s actions.', 'on your turn']
  : s.respawns.length || s.heroes.some(v => v.talentChoices.length) ? ['Finish the pending choice first.', 'after this choice']
  : !s.tradeWindow ? ['Trading opens once a character of your faction has taken an action this turn.', 'after an action']
  : ![h, ...partners].some(goods) ? ['Neither of you carries gold or an item that can change hands.', 'nothing to trade']
  : ['', `with ${names.length > 2 ? `${names.length} allies` : names.join(' or ')} · free`];
 return { partners, open: !reason, reason, short };
}
