import { character, faction } from '../rules/common.js';
import type { ContentPack, Hero } from '../rules/model.js';
import type { GameView } from '../rules/view.js';

/**
 * What a bot and the player beside it agree on before their faction's turn.
 *
 * Until 19. 11. 2026 a bot counted on a player's character wherever that character stood: three characters forecast better
 * than two, so the bots walked to whatever region the player was in, turn after turn, without his having agreed to anything.
 * Now the party agrees first, and the bot keeps to it:
 *
 * - `alone`: the bot goes its own way. It never counts on a player's character, never asks one to join, and leaves alone
 *   what stands in the region where a player's character is. While it can win nothing alone (a lone character of level 1
 *   or 2 often cannot), it joins the player's character like a bot told to come with him: until 20. 11. 2026 it stood in
 *   town instead, visiting the market for nothing, turn after turn.
 * - `follow` ("come with me"): the bot stays with the player's character. It walks to him once he has moved, keeps its
 *   actions while he still has his (so that he can take it along on a Challenge), and fights only at his side.
 * - `lead` ("I go with you"): the bot chooses an objective for itself and the player's characters together, sets off
 *   first so that the player sees where, and waits there: it does not begin that fight without him.
 *
 * A bot without an order (the other faction's, a table with no player on that side) plans as before.
 */
export type OrderMode = 'alone' | 'follow' | 'lead';
export interface PartyOrder { mode: OrderMode; /** The player's characters of the bot's faction: whom it follows, or who comes along. */ partners: string[] }
export type Orders = Record<string, PartyOrder>;
export const ORDER_MODES: OrderMode[] = ['alone', 'follow', 'lead'];

/** A bot under `follow` or `lead` is spoken for this turn: no other bot counts on it for a plan of its own. */
export const committed = (orders: Orders, id: string) => !!orders[id] && orders[id].mode !== 'alone';

/** The orders of every bot that has a player's character on its side; `chosen` holds what the party agreed, `alone` otherwise. */
export function partyOrders(p: ContentPack, heroes: Pick<Hero, 'id'>[], bots: string[], chosen: Partial<Record<string, OrderMode>>): Orders {
 const out: Orders = {};
 for (const h of heroes) {
  if (!bots.includes(h.id)) continue;
  const partners = heroes.filter(a => !bots.includes(a.id) && faction(p, a.id) === faction(p, h.id)).map(a => a.id);
  if (partners.length) out[h.id] = { mode: chosen[h.id] ?? 'alone', partners };
 }
 return out;
}

const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
/** The partner a follower walks to: the nearest of the player's characters still standing. */
export function leaderOf(s: Pick<GameView, 'heroes'>, h: Hero, order: PartyOrder, distance: (from: string, to: string) => number): Hero | undefined {
 return s.heroes.filter(a => order.partners.includes(a.id) && a.id !== h.id && a.health > 0)
  .sort((a, b) => distance(h.location, a.location) - distance(h.location, b.location) || a.id.localeCompare(b.id))[0];
}
/** "Grumbaz", "Grumbaz and Zowka": the player's characters an order names, as a sentence says them. */
export function partnerNames(p: ContentPack, s: Pick<GameView, 'heroes'>, order: PartyOrder): string {
 const names = order.partners.filter(id => s.heroes.some(h => h.id === id)).map(id => first(p, id));
 return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
