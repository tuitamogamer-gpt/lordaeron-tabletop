import { capacity, card, faction, other } from '../rules/common.js';
import { creatureRule, stats } from '../rules/combat.js';
import { apply } from '../rules/game.js';
import { immune } from '../rules/effects.js';
import { equipped } from '../rules/inventory.js';
import type { Boxes, Command, ContentPack, Die, Faction, Hero, State } from '../rules/model.js';
import type { GameView } from '../rules/view.js';
import { cardValue } from './loadout.js';
import { publicState } from './public-state.js';

export interface ScoredMove { score: number; reason: string; }
export const chance = (threat: number) => Math.max(0, Math.min(1, (9 - threat) / 8));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function healthValue(h: Hero): number {
 // The final health points preserve a participant, their actions and their equipment.
 return h.health > 0 ? h.health + 3 * Math.log(1 + h.health) + 9 : -14;
}
function resources(p: ContentPack, h: Hero) {
 return healthValue(h) + Math.min(h.energy, capacity(p, h).energy + 3) * .55
  - h.curse * 1.8 - h.stun * 1.5 + sum(Object.values(h.pets)) * .8
  + sum(equipped(p, h).map(id => cardValue(p, id, h))) * .24;
}

/** Expected low-roll cost. Creature effects trigger once per attacker, not per figure. */
export function dieHazard(p: ContentPack, s: State, h: Hero, d: Die): number {
 if (d.removed) return 0;
 if (!d.value) return sum(Array.from({ length: 8 }, (_, i) => dieHazard(p, s, h, { ...d, value: i + 1 }))) / 8;
 const rule = immune(p, h, creatureRule(p, s)) ? 'none' : creatureRule(p, s);
 const redBlue = d.color !== 'green', one = d.value === 1, low = d.value <= 2;
 const hp = h.health <= 2 ? 3.5 : 1.6;
 let loss = redBlue ? (rule === 'ogre' && low ? 2 * hp : ['naga', 'doomguard'].includes(rule) && low ? hp : ['murloc', 'infernal'].includes(rule) && one ? hp * (rule === 'infernal' ? 2 : 1) : 0) : 0;
 if (redBlue && one && ['gnoll', 'infernal'].includes(rule)) loss += Math.min(h.energy, rule === 'infernal' ? 2 : 1) * .6;
 if (rule === 'doomguard' && low && redBlue) loss += 1.3;
 if (rule === 'spider' && low) loss += 1.5;
 if (rule === 'wraith' && one) loss += 1.8;
 if (rule === 'wildkin' && one) loss += 1.5;
 if (redBlue && low && s.battle?.boss === 'kelthuzad') loss += hp * 2;
 if (redBlue && low && s.battle?.boss === 'kazzak') loss += hp + .6;
 return loss;
}

export function projectedBoxes(p: ContentPack, s: State, side: Faction): Boxes {
 const b = s.battle!, box = { ...b.boxes[side] }, a = b.active;
 if (!a || faction(p, a.heroId) !== side || ['after-tokens', 'defense', 'wounds', 'resolution', 'round-end', 'over'].includes(b.stage)) return box;
 const h = s.heroes.find(h => h.id === a.heroId)!;
 const rule = immune(p, h, creatureRule(p, s)) ? 'none' : creatureRule(p, s);
 for (const d of a.dice.filter(d => !d.removed)) {
  const hit = d.value ? Number(d.value >= a.threat) : chance(a.threat);
  if (d.color === 'green') box.armor += rule === 'drake' ? (d.value ? Number(d.value === 8) : 1 / 8) : hit;
  else box[d.hitBox ?? (d.color === 'blue' ? 'damage' : 'defense')] += hit;
 }
 if (b.boss === 'nefarian') {
  const hits = (box.damage - b.boxes[side].damage) + (box.defense - b.boxes[side].defense);
  const cap = sum(a.dice.filter(d => !d.removed && d.color !== 'green').map(d => d.value ? Number(d.value === 8) : 1 / 8));
  const displaced = Math.max(0, hits - cap), red = Math.min(displaced, box.defense - b.boxes[side].defense);
  box.defense -= red; box.damage -= displaced - red; box.attrition += displaced;
 }
 if (!['spider', 'wraith'].includes(rule)) box.attrition += Math.max(0, a.attrition) / (b.boss === 'nefarian' ? 2 : 1);
 if (rule !== 'drake') box.armor += a.armor;
 if (a.flags?.['ice-barrier'] && rule !== 'drake') box.armor += box.damage - b.boxes[side].damage;
 if (a.flags?.revenge && !['spider', 'wraith'].includes(rule)) box.attrition += box.armor - b.boxes[side].armor;
 return box;
}

/** A common utility for before/after previews: useful damage, survival and resources. */
export function combatValue(p: ContentPack, s: State, side: Faction): number {
 const b = s.battle;
 if (!b) return 0;
 const ids = b.participants, team = s.heroes.filter(h => ids.includes(h.id) && faction(p, h.id) === side);
 let value = sum(team.map(h => resources(p, h) - (b.defeated.includes(h.id) ? 25 : 0)));
 if (b.winner) return value + (b.winner === side ? 100 : b.winner === 'draw' ? -25 : -100);
 const box = projectedBoxes(p, s, side);
 if (b.kind === 'pve') {
  const foes = b.boss ? [stats(p, s)] : b.enemies.map(id => stats(p, s, id));
  const totalHealth = sum(foes.map(e => e.health));
  let ranged = box.damage, attack = sum(foes.map(e => e.attack));
  for (const e of [...foes].sort((a, b) => a.health - b.health)) if (ranged >= e.health) { ranged -= e.health; attack -= e.attack; }
  const wounds = Math.max(0, attack - box.defense - box.armor);
  value += Math.min(totalHealth, box.damage + box.defense + box.attrition) * 2.5 + Math.min(totalHealth, box.damage) * .25;
  value -= wounds * 1.55;
  if (box.damage >= totalHealth) value += 12;
  if (box.damage + box.defense + box.attrition >= totalHealth && wounds < sum(team.map(h => h.health))) value += 6;
  if (b.active?.flags?.execute && box.damage < totalHealth) value -= 12 + box.defense + box.attrition;
 } else {
  const enemy = projectedBoxes(p, s, other(side));
  const enemyHealth = sum(s.heroes.filter(h => ids.includes(h.id) && faction(p, h.id) !== side && !b.defeated.includes(h.id)).map(h => h.health));
  value += Math.min(enemyHealth, Math.max(0, box.damage - enemy.armor)) * 2;
  value -= Math.max(0, enemy.damage - box.armor) * 2;
  const melee = box.defense + box.attrition - enemy.defense - enemy.attrition;
  value += Math.max(-enemyHealth, Math.min(enemyHealth, melee)) * 1.1;
 }
 const a = b.active;
 if (a && faction(p, a.heroId) === side && !['tokens', 'after-tokens', 'defense', 'wounds', 'resolution', 'round-end', 'over'].includes(b.stage)) {
  const h = team.find(h => h.id === a.heroId)!;
  value -= sum(a.dice.map(d => dieHazard(p, s, h, d)));
  if (creatureRule(p, s) !== 'ghoul') {
   const misses = sum(a.dice.filter(d => !d.removed && !d.rerolled && !a.forbidden?.reroll?.includes(d.color)).map(d => d.value ? Number(d.value < a.threat) : 1 - chance(a.threat)));
   value += Math.min(Math.max(0, a.reroll), misses) * chance(a.threat) * 1.5;
  }
 }
 value += sum(Object.values(b.counters ?? {})) * .45;
 return value;
}

function randomEffect(e: import('../rules/model.js').Effect): boolean {
 return ['reroll-all', 'reroll-selected', 'dice', 'dice-choice', 'creature-dice', 'group-dice'].includes(e.op)
  || ('effects' in e && e.effects.some(randomEffect)) || (e.op === 'if' && [...e.then, ...e.otherwise ?? []].some(randomEffect));
}
const SAMPLE_SEEDS = [0x912bc41, 0xa31790d3, 0x7fac1035, 0x5e973ba1, 0x39a27f61, 0xe45298b7];

export function abilityScore(p: ContentPack, state: State, command: Extract<Command, { type: 'ability' }>): number {
 const side = faction(p, command.hero), before = combatValue(p, state, side);
 const ability = card(p, command.card).abilities.find(a => a.id === command.ability)!;
 const stochastic = state.battle?.stage !== 'pool' && ability.effects.some(randomEffect);
 let total = 0;
 for (const seed of stochastic ? SAMPLE_SEEDS : SAMPLE_SEEDS.slice(0, 1)) {
  try {
   const next = apply(p, { ...state, rng: seed }, command);
   if (!state.battle) {
    const h = state.heroes.find(h => h.id === command.hero)!, n = next.heroes.find(v => v.id === h.id)!;
    total += resources(p, n) - resources(p, h);
   } else total += combatValue(p, next, side) - before;
  } catch { return -Infinity; }
 }
 return total / (stochastic ? SAMPLE_SEEDS.length : 1) - .08;
}

export function tacticalScore(p: ContentPack, view: GameView, command: Command, risk: number): ScoredMove | undefined {
 if (!view.battle && command.type !== 'ability') return;
 const s = publicState(view), b = s.battle, a = b?.active;
 switch (command.type) {
  case 'ability': return { score: abilityScore(p, s, command), reason: `Using ${card(p, command.card).name} for its benefit with the current dice, targets and energy.` };
  case 'reroll': {
   if (!a) return;
   const side = faction(p, a.heroId), before = combatValue(p, s, side);
   // Enumerate all eight faces for a single die; never consult the game's PRNG.
   const die = a.dice.find(d => d.id === command.dice[0])!;
   let expected = 0;
   for (let value = 1; value <= 8; value++) {
    const n = structuredClone(s), na = n.battle!.active!, nd = na.dice.find(d => d.id === die.id)!;
    nd.value = value; nd.rerolled = true; na.reroll = Math.max(0, na.reroll - 1);
    expected += combatValue(p, n, side) / 8;
   }
   return { score: expected - before, reason: `Rerolling ${die.color} ${die.value}: comparing all eight outcomes, including creature penalties.` };
  }
  case 'wound': {
   const h = s.heroes.find(h => h.id === command.hero)!;
   const cost = command.pet ? .8 + (h.pets[command.pet] === 1 ? cardValue(p, command.pet, h) * .65 : 0)
    : (healthValue(h) - healthValue({ ...h, health: h.health - 1 })) * risk;
   return { score: -cost, reason: command.pet ? 'Absorbing wounds with a pet while accounting for losing its abilities.' : 'Preserving participants and their next attack while distributing wounds.' };
  }
  case 'penalty': {
   const side = faction(p, a!.heroId), n = structuredClone(s);
   for (const d of n.battle!.active!.dice) if (command.dice.includes(d.id)) d.removed = true;
   return { score: combatValue(p, n, side), reason: 'Removing the least useful dice for this opponent and current defense.' };
  }
  case 'monster': return { score: -(command.unequip ?? []).reduce((n, id) => n + cardValue(p, id, s.heroes.find(h => h.id === a?.heroId)), 0), reason: 'Keeping the strongest powers when the creature forces unequipping.' };
  case 'armor': {
   const box = b!.boxes[command.faction], enemy = b!.boxes[other(command.faction)];
   const hp = sum(s.heroes.filter(h => b!.participants.includes(h.id) && !b!.defeated.includes(h.id) && faction(p, h.id) === command.faction).map(h => h.health));
   const ranged = enemy.damage - command.damage, melee = Math.max(0, enemy.defense - command.defense + Math.max(0, enemy.attrition - box.armor) - (s.variants?.deadlyPvp ? 0 : box.defense + box.attrition));
   return { score: -ranged * 1.2 - melee - (ranged >= hp ? 100 : 0), reason: 'Assigning armor to prevent lethal ranged damage and reduce the coming melee exchange.' };
  }
  case 'tokens': {
   const attrition = new Set(command.toAttrition ?? []);
   return { score: -sum(a!.dice.filter(d => attrition.has(d.id)).map(d => d.color === 'blue' ? 1.4 : 1)), reason: 'Keeping early ranged hits and defensive melee hits within Nefarian’s limit.' };
  }
  case 'advance': {
   if (!command.targets) return { score: 0, reason: 'Continuing after all useful tactical choices have been considered.' };
   const next = apply(p, s, command);
   return { score: combatValue(p, next, b!.first), reason: 'Resolving targets to remove the most dangerous surviving creatures.' };
  }
  default: return;
 }
}
