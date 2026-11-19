import { character, contentFor, faction } from '../rules/common.js';
import type { ContentPack } from '../rules/model.js';
import type { GameView } from '../rules/view.js';
import { ORDER_MODES, type OrderMode, type Orders } from './orders.js';
import type { Difficulty } from './planner.js';
import { createStrategy, type Objective, type Plan } from './strategy.js';

/** What a bot would do under one agreement, in a line the council can show, and where on the map that is. */
export interface Proposal { mode: OrderMode; text: string; region?: string; risk?: 'low' | 'moderate' | 'high'; party: string[]; score: number }
/** One bot's side of the council: its plan under each agreement, and the one it would choose itself. */
export interface Counsel { hero: string; proposals: Proposal[]; suggested: OrderMode }

const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
const listed = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
/** How far in Travel actions: each moves a character up to two regions. */
const away = (n: number) => n ? `${n} Travel away` : 'already there';
const riskOf = (win: number) => win > .8 ? 'low' : win > .5 ? 'moderate' : 'high';
/** An objective at the head of a line: the quest by its name, a creature or a boss as it is called. */
const titled = (o: Objective) => o.quest ? `Quest “${o.label}”` : o.clue ? 'A clue to Kazzak' : o.label;
const fought = (plan: Plan) => !plan.objective.war && !plan.objective.escort && !plan.objective.clue;

/**
 * The council before a faction's turn: for each bot beside the player, what it would do if it went alone, if it came with
 * the player's character, and if the player came with it. The plans are the planner's own, made under each agreement in turn
 * (the other bots keep the agreement they have), so what the council says is what the bot then does.
 */
export function counsel(pack: ContentPack, s: GameView, heroes: string[], difficulty: Difficulty, options: { independent?: string[]; orders?: Orders } = {}): Counsel[] {
 const p = contentFor(pack, s), risk = difficulty === 'cautious' ? 1.5 : difficulty === 'aggressive' ? .65 : 1, agreed = options.orders ?? {};
 const place = (id: string) => p.regions.find(r => r.id === id)?.name ?? id;
 return heroes.flatMap(id => {
  const h = s.heroes.find(v => v.id === id), order = agreed[id];
  if (!h || !order) return [];
  const side = faction(p, id), partners = listed(order.partners.map(v => first(p, v)));
  const proposals = ORDER_MODES.map((mode): Proposal => {
   const strategy = createStrategy(p, s, risk, options.independent, { ...agreed, [id]: { ...order, mode } }), plan = strategy.plan(h);
   const others = plan ? plan.party.filter(v => v !== id) : [], trip = (who: string) => Math.ceil(strategy.distance(s.heroes.find(v => v.id === who)!.location, plan!.objective.region, side) / 2);
   const odds = plan && fought(plan) ? riskOf(plan.forecast.win) : undefined, base = { mode, party: plan?.party ?? [id], score: plan?.score ?? -Infinity, region: plan?.objective.region, ...(odds ? { risk: odds } : {}) } satisfies Omit<Proposal, 'text'>;
   if (mode === 'follow') {
    if (!plan?.following) return { ...base, text: `${partners} cannot be reached this turn.` };
    const there = plan.objective.escort ? `fights where ${first(p, plan.following)} fights` : `there: ${titled(plan.objective).replace(/^Quest/, 'quest')}, ${odds} risk together`;
    return { ...base, text: `Joins ${first(p, plan.following)} in ${place(plan.objective.region)} (${away(plan.travelActions)}) · ${there}` };
   }
   if (mode === 'lead') {
    if (!plan?.leading?.length) return { ...base, text: 'Sees nothing worth leading the party to this turn.' };
    // How far each of the party is: said once when it is the same for all.
    const trips = [id, ...plan.leading].map(v => ({ who: first(p, v), n: trip(v) })), same = trips.every(v => v.n === trips[0].n);
    const far = same ? `${away(trips[0].n)}${trips[0].n ? ` for ${trips.length === 2 ? 'both' : 'all'}` : ''}` : trips.map(v => `${v.who} ${v.n ? v.n : 'there'}`).join(', ') + ' Travel away';
    return { ...base, text: `${titled(plan.objective)} in ${place(plan.objective.region)} with ${listed(plan.leading.map(v => first(p, v)))} · ${far} · ${odds} risk together` };
   }
   if (!plan) return { ...base, text: 'Nothing worth a fight within reach alone: rests, trains or shops.' };
   if (plan.objective.war) return { ...base, text: `Holds ${place(plan.objective.region)} for ${plan.objective.label} (${away(plan.travelActions)}), with ${first(p, plan.objective.war.partner)} in ${place(plan.objective.war.other)}` };
   return { ...base, text: `${titled(plan.objective)} in ${place(plan.objective.region)} · ${others.length ? `with ${listed(others.map(v => first(p, v)))}` : 'alone'} · ${away(plan.travelActions)}${odds ? ` · ${odds} risk` : ''}` };
  });
  // What the bot itself would rather do: go together when that is clearly worth more than going alone.
  const alone = proposals.find(v => v.mode === 'alone')!, lead = proposals.find(v => v.mode === 'lead')!;
  return [{ hero: id, proposals, suggested: Number.isFinite(lead.score) && lead.score >= Math.max(0, alone.score) * 1.25 + .5 ? 'lead' : 'alone' }];
 });
}
