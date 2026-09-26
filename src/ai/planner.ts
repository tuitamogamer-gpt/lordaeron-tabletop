import { capacity, card, faction } from '../rules/common.js';
import type { Command, ContentPack, Hero, Pool } from '../rules/model.js';
import type { GameView } from '../rules/view.js';
import { availableCards } from '../rules/effects.js';
export type Difficulty = 'cautious' | 'balanced' | 'aggressive';
export interface Decision { command: Command; score: number; reason: string; alternatives: number; }
/** Pure policy module: receives public information + legal moves, never the hidden server State. */
function pool(p: ContentPack, h: Hero): Pool {
 const result = { red: 0, blue: 0, green: 0 };
 for (const id of availableCards(p, h)) for (const a of card(p, id).abilities) if (a.timing === 'pool' && h.energy >= (card(p,id).type==='active'||card(p,id).kind==='talent'||card(p,id).kind==='racial'?0:card(p,id).energy)) for (const e of a.effects) if (e.op === 'dice') result[e.color] += e.amount;
 return { red: Math.min(7, result.red), blue: Math.min(7, result.blue), green: Math.min(7, result.green) };
}
function distance(p: ContentPack, from: string, to: string, f: string): number {
 const queue: [string, number][] = [[from, 0]], seen = new Set([from]);
 while (queue.length) { const [at, n] = queue.shift()!; if (at === to) return n; const r = p.regions.find(r => r.id === at)!;
  const adjacent = [...r.neighbors, ...((r.flight === f || r.flight === 'both') ? p.regions.filter(r => r.flight === f || r.flight === 'both').map(r => r.id) : [])];
  for (const id of adjacent) if (!seen.has(id) && (!p.regions.find(r => r.id === id)?.home || p.regions.find(r => r.id === id)?.home === f)) { seen.add(id); queue.push([id, n + 1]); }
 } return 100;
}
function itemValue(p: ContentPack, id: string) { return card(p, id).abilities.reduce((n, a) => n + a.effects.reduce((m, e) => m + (e.op === 'dice' ? e.amount * (e.color === 'blue' ? 1.15 : 1) : e.op === 'stat' ? e.amount * .7 : e.op === 'resource' ? e.amount * .35 : 0), 0), 0); }
export function decide(p: ContentPack, s: GameView, legal: Command[], difficulty: Difficulty = 'balanced'): Decision | undefined {
 const risk = difficulty === 'cautious' ? 1.5 : difficulty === 'aggressive' ? .65 : 1;
 const scored = legal.map((command, index) => {
  let score = -10, reason = 'Napredovanje kroz fazu.';
  const h = 'hero' in command ? s.heroes.find(h => h.id === command.hero) : undefined;
  const f = h ? faction(p, h.id) : s.faction;
  switch (command.type) {
   case 'rest': {
    const cap = capacity(p, h!); const hp = Math.min(cap.health - h!.health, command.health), energy = Math.min(cap.energy - h!.energy, h!.level * (p.regions.find(r => r.id === h!.location)?.town ? 3 : 2) - command.health);
    score = hp * 2.3 * risk + energy * .85 + h!.curse * 3 - 1; reason = 'Oporavak prije narednog izazova.'; break;
   }
   case 'travel': {
    if (!command.path.length) { score = -8; break; }
    const at = command.path.at(-1)!;
    const targets = s.enemies.filter(e => e.faction === f).map(e => {
     const stats = p.creatures.find(c => c.id === e.creature)!.stats[e.color];
     return { region: e.region, value: 9 - Math.max(0, stats.attack - h!.health) * risk - stats.health * .2 };
    });
    if (h!.level >= 4) targets.push({ region: s.overlord.region, value: 12 });
    score = Math.max(-5, ...targets.map(t => t.value - distance(p, at, t.region, f) * 1.8));
    if (s.enemies.some(e => e.region === at && e.color === 'blue')) score -= 5 * risk;
    const friends = s.heroes.filter(a => a.id !== h!.id && faction(p, a.id) === f && a.location === at); score += friends.length * 1.2;
    reason = 'Put prema dostupnom questu i okupljanje družine.'; break;
   }
   case 'challenge': {
    const party = [h!, ...command.allies.map(id => s.heroes.find(h => h.id === id)!)];
    const enemy = s.enemies.find(e => e.id === command.target);
    const e = enemy ? p.creatures.find(c => c.id === enemy.creature)!.stats[enemy.color] : p.overlords.find(o => o.id === command.target)?.stats[s.heroes.length as 4 | 6];
    if (!e) { score = -2; break; }
    const count = enemy ? s.enemies.filter(a => a.region === enemy.region && a.creature === enemy.creature && a.faction === enemy.faction && (a.color === 'blue') === (enemy.color === 'blue')).length : 1;
    const prob = (9 - e.threat) / 8, health = party.reduce((n, h) => n + h.health, 0);
    const dice = party.map(h => pool(p, h)); const damage = dice.reduce((n, d) => n + (d.blue + d.red) * prob, 0), defense = dice.reduce((n, d) => n + (d.red + d.green) * prob, 0);
    const rounds = Math.ceil(e.health * count / Math.max(.5, damage));
    const wounds = Math.max(0, e.attack * count - defense) * rounds;
    score = 12 + command.allies.length * 1.5 - Math.max(0, wounds - health * .6) * risk * 2 - (party.some(h => h.health < 2) ? 4 : 0);
    reason = 'Procjena očekivanih pogodaka, odbrane i zdravlja družine.'; break;
   }
   case 'ability': {
    const a = card(p, command.card).abilities.find(a => a.id === command.ability)!;
    score = 10;
    if (a.timing === 'wound') { const target = s.heroes.find(h => h.id === (command.args?.target ?? command.hero))!; score = capacity(p, target).health - target.health >= 2 ? 30 : -5; }
    if (a.timing === 'reroll') score = s.battle?.active?.dice.some(d => !d.rerolled && d.value < s.battle!.active!.threat) ? 15 : -5;
    reason = 'Primijeni dostupnu sposobnost u pravom trenutku.'; break;
   }
   case 'attacker': score = pool(p, h!).blue + h!.health * .1; reason = 'Redoslijed napada družine.'; break;
   case 'reroll': { const d = s.battle!.active!.dice.find(d => d.id === command.dice[0])!; score = d.value < s.battle!.active!.threat ? 12 - d.value : -5; reason = 'Ponovi promašaj ili opasan mali rezultat.'; break; }
   case 'wound': score = command.pet ? 30 : h!.health * 2 + h!.energy * .1; reason = 'Raspodjela rana uz očuvanje živih učesnika.'; break;
   case 'penalty': score = command.dice.reduce((n, id) => n + (s.battle!.active!.dice.find(d => d.id === id)?.color === 'green' ? 0 : -1), 0); break;
   case 'manage': score = command.slots.reduce((n, a) => n + (a.card ? itemValue(p, a.card) : 0) + a.addons.reduce((n, id) => n + itemValue(p, id), 0), 0); reason = 'Opremi korisne kupljene karte.'; break;
   case 'train': score = 2 + itemValue(p, command.cards[0]) - card(p, command.cards[0]).price * .25; reason = 'Ulaganje zlata u trajno dostupnu moć.'; break;
   case 'town': {
    const op = command.operations[0];
    if (op?.op === 'buy') { const c = card(p, op.card); const current = h!.slots.flatMap(a => a.card ? [a.card] : []).filter(id => card(p, id).type === c.type); score = c.level <= h!.level ? itemValue(p, c.id) - Math.max(0,...current.map(id => itemValue(p,id))) + 1 : -5; if (op.discard === op.card) score = -20; }
    else if (op?.op === 'sell') score = h!.bag.includes(op.card) && bagSizeValue(p, h!) >= 3 ? 2 : -5;
    else score = 0; reason = 'Kupovina opreme ili oslobađanje torbe.'; break;
   }
   case 'reward': score = itemValue(p, command.card) + (card(p, command.card).level <= h!.level ? 2 : 0) - (command.discard ? itemValue(p, command.discard) : 0); reason = 'Izaberi najkorisniju ponuđenu nagradu.'; break;
   case 'talent': score = itemValue(p, command.card); reason = 'Talent poboljšava borbeni učinak.'; break;
   case 'quest': { const level = s.heroes.filter(h => faction(p, h.id) === s.reward?.faction).reduce((n,h) => n + h.level,0) / (s.heroes.length/2); score = 5 - Math.abs((command.tier === 'green' ? 2 : command.tier === 'yellow' ? 3 : 4) - level) * 3; reason = 'Odaberi težinu questa prema nivou frakcije.'; break; }
   case 'bid': score = -Math.abs(command.amount - Math.min(2, h!.gold)); reason = 'Ograničena ponuda čuva zlato za trening.'; break;
   case 'respawn': score = p.regions.find(r => r.id === command.region)?.town ? 3 : 0; reason = 'Povratak u sigurno mjesto za oporavak.'; break;
   case 'armor': score = command.damage * 2 + command.defense; reason = 'Prvo blokiraj daljinske pogotke.'; break;
   default: score = 0;
  }
  return { command, score, reason, index };
 }).sort((a, b) => b.score - a.score || a.index - b.index);
 if (!scored.length) return undefined;
 const best = scored[0]; return { command: best.command, score: Math.round(best.score * 100) / 100, reason: best.reason, alternatives: legal.length };
}
function bagSizeValue(p: ContentPack, h: Hero) { return h.bag.filter(id => !card(p, id).bagExempt).length; }
