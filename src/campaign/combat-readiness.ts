import { publicState } from '../ai/public-state';
import { eligibleAttackers } from '../rules/combat';
import { card, character, colors, emptyPool } from '../rules/common';
import { abilityEnergyCost, availableCards, condition, timing } from '../rules/effects';
import { apply } from '../rules/game';
import { legalActions } from '../rules/legal';
import type { Ability, Card, Command, ContentPack, Effect, Pool, State, Timing } from '../rules/model';
import type { GameView } from '../rules/view';
import { conditionText, effectText } from './rules-text';

type AbilityCommand = Extract<Command, { type: 'ability' }>;
const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
const manual = (c: Card) => c.abilities.filter(a => !a.automatic && !a.judgement);
/** Steps of a character's own attack: a power with one of these timings works only while its owner is the attacker. */
const OWN_ATTACK: Timing[] = ['pool', 'after-pool', 'reroll', 'after-reroll', 'tokens', 'after-tokens'];
const IN_COMBAT: Timing[] = [...OWN_ATTACK, 'round-start', 'defense', 'wound', 'round-end', 'energy-spent'];
/** When a power can be used, in the words a player would say at the table. */
export const whenLabel: Partial<Record<Timing, string>> = {
 'round-start': 'at the start of a round', pool: 'before the roll', 'after-pool': 'after the roll', reroll: 'during rerolls', 'after-reroll': 'after rerolls',
 tokens: 'when hits are placed', 'after-tokens': 'after hits are placed', defense: 'during defense', wound: 'when a character loses health', 'round-end': 'at the end of a round',
 'energy-spent': 'after spending energy', 'combat-end': 'when combat ends',
};
const energyOf = (effects: Effect[]) => effects.reduce((n, e) => n + (e.op === 'resource' && e.resource === 'energy' && !e.target ? e.amount : 0), 0);

export type EnergySource = { card: string; name: string; amount: number; timing: Timing; applied: boolean };
/** Cards that give this character energy by themselves during combat (Charge, Icicle Rod…), and whether each already did so this round. */
export function energySources(p: ContentPack, state: Pick<GameView, 'battle' | 'heroes'>, heroId: string): EnergySource[] {
 const h = state.heroes.find(h => h.id === heroId), used = state.battle?.current[heroId]?.cards ?? [];
 if (!h) return [];
 return availableCards(p, h).flatMap(id => card(p, id).abilities.flatMap(a => {
  const amount = a.automatic && IN_COMBAT.includes(a.timing) ? energyOf(a.effects) : 0;
  return amount > 0 ? [{ card: id, name: card(p, id).name, amount, timing: a.timing, applied: used.includes(`${id}:${a.id}`) }] : [];
 }));
}

export type AttackPreview = {
 hero: string;
 /** Energy at the start of the character's Dice Pool step, after cards such as Charge. */
 energy: number; gained: number; sources: EnergySource[];
 /** Dice the character's equipment prepares, before any power. */
 dice: Pool;
 /** Cards whose power becomes usable in that Dice Pool step. */
 powers: string[];
};
const previews = new WeakMap<GameView, Map<string, AttackPreview | undefined>>();
/**
 * What a character brings if chosen as the next attacker. Choosing an attacker rolls nothing and draws nothing, so the
 * step can be played on a throw-away copy of the public state and read back: energy, prepared dice and usable powers.
 */
export function attackPreview(p: ContentPack, view: GameView, heroId: string): AttackPreview | undefined {
 let cache = previews.get(view);
 if (!cache) previews.set(view, cache = new Map());
 if (cache.has(heroId)) return cache.get(heroId);
 let result: AttackPreview | undefined;
 try {
  const before = view.heroes.find(h => h.id === heroId), b = view.battle;
  if (before && b?.stage === 'attacker' && !view.respawns.length && eligibleAttackers(p, view as unknown as State).includes(heroId)) {
   const s = apply(p, publicState(view), { type: 'attacker', hero: heroId }), after = s.heroes.find(h => h.id === heroId)!;
   const had = b.current[heroId]?.cards ?? [], dice = emptyPool();
   for (const die of s.battle!.active!.dice) if (!die.removed) dice[die.color]++;
   const powers = [...new Set(legalActions(p, s).filter((c): c is AbilityCommand => c.type === 'ability' && c.hero === heroId).map(c => c.card))];
   result = { hero: heroId, energy: after.energy, gained: after.energy - before.energy, dice, powers,
    sources: energySources(p, s, heroId).filter(source => source.applied && !had.some(key => key.startsWith(`${source.card}:`))) };
  }
 } catch { result = undefined; }
 cache.set(heroId, result);
 return result;
}
export const diceWords = (pool: Pool) => colors.filter(c => pool[c]).map(c => `${pool[c]} ${c}`).join(', ') || 'no dice';

export type CardNote = {
 /** `soon`: becomes usable when its owner attacks. `spent`: already used. `wait`: cannot be used now. `passive`: works by itself. */
 tone: 'soon' | 'spent' | 'wait' | 'passive';
 text: string;
};
const passiveText = (c: Card, applied: (a: Ability) => boolean): string => {
 const own = c.abilities.filter(a => a.automatic && (IN_COMBAT.includes(a.timing) || a.timing === 'combat-end'));
 if (!own.length) return c.abilities.some(a => a.automatic) ? 'Works by itself' : 'Equipped';
 const done = own.filter(applied), shown = done.length ? done : own;
 const text = [...new Set(shown.flatMap(a => a.effects.map(effectText)))].join(' · ');
 const when = [...new Set(shown.map(a => a.timing === 'pool' ? 'when attacking' : whenLabel[a.timing] ?? a.timing))].join(' / ');
 return done.length ? `${text} · applied this round` : `${text} · ${when}`;
};
/**
 * Why a card on the sheet cannot be used right now, or what it does by itself. A card with a legal command never gets
 * here: it is shown as a playable power instead.
 */
export function cardNote(p: ContentPack, view: GameView, heroId: string, cardId: string): CardNote {
 const b = view.battle, h = view.heroes.find(h => h.id === heroId), c = card(p, cardId);
 if (!b || !h) return { tone: 'passive', text: 'Equipped' };
 const used = b.current[heroId]?.cards ?? [], name = first(p, heroId), now = timing(view as unknown as State);
 const mine = manual(c), usable = mine.filter(a => IN_COMBAT.includes(a.timing));
 if (!mine.length) return { tone: 'passive', text: passiveText(c, a => used.includes(`${cardId}:${a.id}`)) };
 if (b.defeated.includes(heroId)) return { tone: 'wait', text: `${name} is defeated` };
 if (!usable.length) return { tone: 'wait', text: 'Used outside combat' };
 if (mine.some(a => used.includes(`${cardId}:${a.id}`))) return { tone: 'spent', text: 'Used this round' };
 const cost = Math.min(...usable.map(a => abilityEnergyCost(p, view, h, cardId, a.id)));
 const sources = energySources(p, view, heroId), perRound = sources.filter(s => s.timing === 'pool' || s.timing === 'round-start');
 const refill = perRound.length ? ` · ${perRound.map(s => s.name).join(' and ')} ${perRound.length > 1 ? 'give' : 'gives'} ${perRound.reduce((n, s) => n + s.amount, 0)} each round` : '';
 const ownOnly = usable.every(a => OWN_ATTACK.includes(a.timing) && !a.friendlyTiming);
 const preview = b.stage === 'attacker' ? attackPreview(p, view, heroId) : undefined;
 if (preview && usable.some(a => a.timing === 'pool')) {
  if (preview.powers.includes(cardId)) return { tone: 'soon', text: `Ready when ${name} attacks${preview.gained > 0 ? ` · ${preview.energy} energy with ${preview.sources.map(s => s.name).join(' and ') || 'this round’s gain'}` : ''}` };
  if (cost > preview.energy) return { tone: 'wait', text: `Needs ${cost} energy · ${name} will have ${preview.energy}${refill}` };
 }
 if (ownOnly && b.acted.includes(heroId) && b.active?.heroId !== heroId) return { tone: 'wait', text: `${name} has attacked this round · next round` };
 const fits = usable.filter(a => a.timing === now);
 if (!fits.length) {
  const when = [...new Set(usable.map(a => whenLabel[a.timing] ?? a.timing))];
  return { tone: 'wait', text: `Use ${when.slice(0, 2).join(' or ')}${ownOnly && b.active?.heroId !== heroId ? `, in ${name}’s own attack` : ''}${cost > h.energy ? ` · needs ${cost} energy, has ${h.energy}` : ''}` };
 }
 if (ownOnly && b.active && b.active.heroId !== heroId) return { tone: 'wait', text: `Only in ${name}’s own attack` };
 if (cost > h.energy) return { tone: 'wait', text: `Needs ${cost} energy · ${name} has ${h.energy}${refill}` };
 const unmet = fits.map(a => a.condition).find(test => test && !condition(p, view, h, cardId, test));
 if (unmet) return { tone: 'wait', text: `Needs: ${conditionText(unmet)}` };
 if (fits.every(a => a.requires && !used.includes(`${cardId}:${a.requires}`))) return { tone: 'wait', text: 'Use this card’s first ability before this one' };
 return { tone: 'wait', text: 'Nothing for it to do at this step' };
}

/** One sentence under the energy tokens: where this round's energy came from, or where it will come from. */
export function energyNote(p: ContentPack, view: GameView, heroId: string, capacity: number): string {
 const b = view.battle, h = view.heroes.find(h => h.id === heroId);
 if (!b || !h || b.stage === 'over') return '';
 const name = first(p, heroId), sources = energySources(p, view, heroId), parts: string[] = [];
 const applied = sources.filter(s => s.applied);
 if (applied.length) parts.push(`${applied.map(s => `+${s.amount} from ${s.name}`).join(', ')} this round`);
 const preview = b.stage === 'attacker' ? attackPreview(p, view, heroId) : undefined;
 if (preview && preview.gained > 0) parts.push(`${preview.sources.map(s => s.name).join(' and ') || 'A card'} ${preview.sources.length > 1 ? 'give' : 'gives'} +${preview.gained} when ${name} attacks: ${preview.energy} to spend`);
 if (h.energy > capacity) parts.push(`${h.energy - capacity} above capacity is lost when combat ends`);
 return parts.join(' · ');
}
