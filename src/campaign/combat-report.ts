// The words of the combat window that are read off the state: what the scene says while it waits for the player, who can
// take a wound and what it leaves him with.
import { capacity, card, character, faction, other } from '../rules/common';
import type { Command, ContentPack, Faction } from '../rules/model';
import type { GameView } from '../rules/view';
import { effectWords, forecastSentence, type RoundForecast } from './combat-forecast';

const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
const side = (f: Faction) => f === 'horde' ? 'Horde' : 'Alliance';
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type WoundChoice = {
 command: Extract<Command, { type: 'wound' }>; hero: string; side: Faction;
 /** The pet that takes the wound instead of its owner, and the wounds it can still take after this one. */
 pet?: string; petLeft?: number;
 health: number; after: number; capacity: number;
 /** This wound takes the character's last Health: he is defeated unless he is healed at once. */
 falls: boolean;
};
/** Every character (or pet) who may take the next wound, with the Health it leaves him. */
export function woundChoices(p: ContentPack, view: GameView, legal: Command[]): WoundChoice[] {
 return legal.flatMap(command => {
  if (command.type !== 'wound') return [];
  const h = view.heroes.find(h => h.id === command.hero);
  if (!h) return [];
  const pet = command.pet, after = pet ? h.health : Math.max(0, h.health - 1);
  return [{ command, hero: h.id, side: faction(p, h.id), ...(pet ? { pet: card(p, pet).name, petLeft: (h.pets[pet] ?? 1) - 1 } : {}), health: h.health, after, capacity: capacity(p, h).health, falls: !pet && after === 0 }];
 });
}
/** "Health 4 → 3", "Last Health: Grumbaz falls", "Wolf takes it · 1 more after this". */
export function woundWords(p: ContentPack, w: WoundChoice): string {
 if (w.pet) return `${w.pet} takes it · ${w.petLeft ? `${w.petLeft} more after this` : 'its last'}`;
 return w.falls ? `Last Health: ${first(p, w.hero)} falls` : `Health ${w.health} → ${w.after}`;
}

/**
 * What the scene says while the table waits for the player: who is to act, and what the step in front of him comes to. (It
 * used to repeat one line, "Ranged first. Hold the line. Strike back.", through every step of every round.)
 */
export function sceneWords(p: ContentPack, view: GameView, f?: RoundForecast): { heading: string; detail: string } {
 const b = view.battle!, a = b.active, name = a ? first(p, a.heroId) : '', round = `Round ${b.round}`;
 if (b.kind !== 'pve') {
  const heading = a ? b.stage === 'pool' || b.stage === 'penalty' ? `${name} prepares an attack` : `${name} attacks` : `${round} · ${b.stage === 'defense' ? 'armor and ranged hits' : b.stage === 'resolution' ? 'melee and attrition' : b.stage === 'wounds' ? 'wounds' : b.stage === 'round-end' ? 'round over' : 'the battlefield'}`;
  const detail = a ? `${a.threat}+ scores a hit against the ${side(other(faction(p, a.heroId)))}` : b.stage === 'attacker' ? 'The factions take turns to attack.' : b.stage === 'defense' ? 'Armor cancels opposing hits; the ranged hits left become wounds.' : b.stage === 'resolution' ? 'Melee and attrition are compared: the weaker side takes the difference.' : b.stage === 'wounds' ? 'Each faction decides who takes its wounds.' : 'Both Combat Areas are cleared.';
  return { heading, detail };
 }
 const effect = effectWords(p, f?.effect), standing = f ? forecastSentence(f) : '';
 switch (b.stage) {
  case 'attacker': return { heading: `${round} · who attacks next`, detail: standing };
  case 'pool': return { heading: `${name} prepares an attack`, detail: `${a?.threat ?? '?'}+ scores a hit${standing ? ` · ${standing}` : ''}` };
  case 'penalty': {
   // Stun takes two dice for each token, Curse one (rulebook p. 36).
   const h = view.heroes.find(h => h.id === a?.heroId), dice = a?.dice.filter(d => !d.removed).length ?? 0, lost = Math.min(dice, (h?.stun ?? 0) * 2 + (h?.curse ?? 0));
   return { heading: `${name} gives up ${count(lost, 'die', 'dice')}`, detail: [h?.stun ? `Stun ${h.stun}: two dice each` : '', h?.curse ? `Curse ${h.curse}: one die each, and −${h.curse} to rerolls and attrition` : ''].filter(Boolean).join(' · ') };
  }
  case 'after-pool': case 'reroll': case 'after-reroll': {
   const dice = a?.dice.filter(d => !d.removed) ?? [], hits = dice.filter(d => d.value >= (a?.threat ?? 9)).length;
   return { heading: `${name} rolls ${count(hits, 'hit')} of ${count(dice.length, 'die', 'dice')}`, detail: effect ? `${f!.foe}: ${effect}` : standing };
  }
  case 'tokens': case 'after-tokens': return { heading: `${name} places the hits`, detail: standing };
  case 'defense': return { heading: `${round} · ${f?.foe ?? 'the enemy'} strikes`, detail: standing };
  case 'wounds': return { heading: f ? `${f.foe} hits for ${f.attack}${f.blocked + f.absorbed ? ` · ${f.blocked + f.absorbed} stopped` : ''}` : `${round} · wounds`, detail: f?.left ? `${count(f.left, 'wound')} to assign` : standing };
  case 'resolution': return { heading: `${round} · strike back`, detail: f ? `${f.damage} damage against ${f.health} health${f.won ? `: ${f.foe} ${f.opponents - f.ranged.kills > 1 ? 'fall' : 'falls'}` : ''}` : '' };
  case 'round-end': return { heading: `${round} is over`, detail: standing };
  default: return { heading: `${round} · the battlefield`, detail: standing };
 }
}
