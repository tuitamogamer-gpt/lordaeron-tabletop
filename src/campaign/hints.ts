// The move advisor: on request, the planner that plays the AI characters weighs the player's own legal actions and explains its choice.
// It sees what the player may see (the player's view of the state), and nothing happens until the player takes the suggestion.
import { card, character, listed } from '../rules/common';
import type { Command, ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';

/** The actions a character can spend on the table; the advisor chooses among these. */
const ACTIONS: Command['type'][] = ['travel', 'rest', 'train', 'town', 'challenge', 'power-action', 'portal', 'summon'];

/** Every action the given character may take now. */
export function hintCandidates(legal: Command[], heroId: string): Command[] {
 return legal.filter(c => ACTIONS.includes(c.type) && 'hero' in c && c.hero === heroId);
}

const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
const regionName = (p: ContentPack, id: string) => p.regions.find(r => r.id === id)?.name ?? id;

/** What a suggested action is, in the words of the action buttons: “Travel to Stillwater Pond”, “Challenge the Crusader with Sofeea”. */
export function hintLabel(p: ContentPack, state: Pick<GameView, 'heroes' | 'enemies' | 'overlord'>, c: Command): string {
 switch (c.type) {
  case 'travel': {
   if (!c.path.length) return 'Stay here and pass this action';
   const via = c.path.length > 1 ? ` through ${regionName(p, c.path[0])}` : '';
   return `Travel to ${regionName(p, c.path.at(-1)!)}${via}${c.power ? ` with ${card(p, c.power).name}` : ''}`;
  }
  case 'rest': return c.food ? `Rest and eat ${card(p, c.food).name}` : c.health ? `Rest: ${c.health} health, the rest to energy` : 'Rest: recover energy';
  case 'train': return `Train: learn ${listed(c.cards.map(id => card(p, id).name))}`;
  case 'town': {
   const deals = c.operations.map(o => `${o.op === 'buy' ? 'buy' : o.op === 'sell' ? 'sell' : 'learn'} ${card(p, o.card).name}`);
   return deals.length ? `Town: ${listed(deals)}` : 'Town: recover';
  }
  case 'challenge': {
   const hero = state.heroes.find(h => h.id === c.hero), at = c.region ?? hero?.location ?? '';
   const enemy = state.enemies.find(e => e.id === c.target), creature = p.creatures.find(v => v.id === enemy?.creature);
   const group = enemy ? state.enemies.filter(e => e.region === enemy.region && e.creature === enemy.creature && (e.color === 'blue') === (enemy.color === 'blue') && e.faction === enemy.faction).length : 0;
   const foe = c.target === 'pvp' ? 'the enemy characters' : creature ? group > 1 ? `the ${group} ${creature.name}s` : `the ${creature.name}` : p.overlords.find(o => o.id === c.target)?.name ?? p.events.find(e => e.id === c.target)?.name ?? 'the boss';
   return `Challenge ${foe} in ${regionName(p, at)}${c.allies.length ? ` with ${listed(c.allies.map(id => first(p, id)))}` : ''}`;
  }
  case 'power-action': return `Use ${card(p, c.card).name}`;
  case 'portal': return `Open a Portal home${c.allies.length ? ` for ${listed(c.allies.map(id => first(p, id)))}` : ''}${c.self === false ? ' (you stay)' : ''}`;
  case 'summon': return `Summon ${first(p, c.target)}`;
  default: return 'Continue';
 }
}

/** What the table shows of the advisor: nothing asked yet, thinking, a suggestion with its reason, or why none could be given. */
export interface Hint { busy: boolean; label?: string; reason?: string; error?: string }
