import type { Card } from '../rules/model';
import { triggerLabels } from './card-labels';
import { effectText, staticCardText } from './rules-text';

/**
 * What a card does, in a line short enough to stand under its thumbnail: "+2 red dice · +1 Reroll", "Preparation: +2 blue dice".
 * The printed face says the same in full; at the size of a slot on the character sheet its text cannot be read.
 */
export function cardGist(c: Card): string {
 const lines = c.abilities.map(a => `${a.automatic ? '' : `${triggerLabels[a.timing] ?? a.timing}: `}${a.effects.map(effectText).join(' · ')}${a.cost ? ` (${a.cost} energy)` : ''}`);
 const all = [...new Set([...lines, ...staticCardText(c)])].filter(Boolean);
 return all.length ? `${all.slice(0, 2).join(' / ')}${all.length > 2 ? ' …' : ''}` : c.kind === 'item' ? 'Carried' : 'See the card';
}
