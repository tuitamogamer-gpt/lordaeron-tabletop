import { ORDER_MODES, type OrderMode } from '../ai/orders';

/**
 * The party plan: what the player and the bots beside him agree before their faction's turn (ai/orders.ts).
 * The agreement is kept in the browser with the choice whether the table asks before every turn. It holds until it is
 * changed: a new turn opens the council with last turn's plan chosen.
 */
const KEY = 'lordaeron-party-plan-v1';
export interface PartyPlanChoice { modes: Partial<Record<string, OrderMode>>; ask: boolean }
// Tests of the rest of the table run without the council unless they ask for it, as they run without announcements.
const DEFAULT_ASK = import.meta.env?.MODE !== 'test';
export function loadPartyPlan(): PartyPlanChoice {
 try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PartyPlanChoice> | null, modes: PartyPlanChoice['modes'] = {};
  for (const [id, mode] of Object.entries(saved?.modes ?? {})) if (ORDER_MODES.includes(mode as OrderMode)) modes[id] = mode as OrderMode;
  return { modes, ask: typeof saved?.ask === 'boolean' ? saved.ask : DEFAULT_ASK };
 } catch { return { modes: {}, ask: DEFAULT_ASK }; }
}
export function savePartyPlan(plan: PartyPlanChoice) { try { localStorage.setItem(KEY, JSON.stringify(plan)); } catch { /* the plan lasts until the tab closes */ } }

/** The three agreements in the words of the table. `short` completes "Sofeea …" on the table's button and in a notice. */
export const ORDER_WORDS: Record<OrderMode, { label: string; short: string; note: string; icon: string }> = {
 alone: { label: 'Go your own way', short: 'goes alone', icon: 'compass', note: 'Picks its own objective, never counts on your characters and leaves alone what stands where they are.' },
 follow: { label: 'Come with me', short: 'comes with you', icon: 'users', note: 'Walks to your character once you have moved, keeps its actions for your Challenge and fights only at your side.' },
 lead: { label: 'Lead, I follow', short: 'leads the way', icon: 'flag', note: 'Chooses an objective for both of you, sets off first so that you see where, and waits for you there.' },
};
