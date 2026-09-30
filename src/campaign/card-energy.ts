import type { Card } from '../rules/model';

/** Printed use costs, before character discounts and conditional free uses. */
export function cardEnergyText(card: Card): string {
 const choices = card.type === 'instant' ? card.abilities.filter(a => !a.automatic).map(a => a.cost ?? card.energy) : [];
 const costs = choices.length ? choices : [card.energy];
 const min = Math.min(...costs), max = Math.max(...costs);
 return `${min === max ? min : `${min}–${max}`} energy`;
}
