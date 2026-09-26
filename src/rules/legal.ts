import { capacity, card, character, faction, hero, other } from './common';
import { eligibleAttackers, living } from './combat';
import { availableCards, matches, timing } from './effects';
import { apply } from './game';
import { bagSize, equipped } from './inventory';
import { reachable, respawnRegions } from './movement';
import type { AbilityArgs, Command, ContentPack, Effect, Hero, State } from './model';

export function combinations<T>(values: T[], count: number, limit = 64): T[][] {
 const result: T[][] = [];
 const visit = (start: number, chosen: T[]) => { if (result.length >= limit) return; if (chosen.length === count) { result.push(chosen); return; } for (let i = start; i <= values.length - (count - chosen.length); i++) visit(i + 1, [...chosen, values[i]]); };
 if (count >= 0 && count <= values.length) visit(0, []); return result;
}
function argsFor(p: ContentPack, s: State, h: Hero, effects: Effect[]): AbilityArgs[] {
 const diceEffect = effects.find(e => e.op === 'spot' || e.op === 'remove' || e.op === 'change');
 let args: AbilityArgs[] = [{}];
 if (diceEffect && (diceEffect.op === 'spot' || diceEffect.op === 'remove' || diceEffect.op === 'change')) {
  const choices = (s.battle?.active?.dice ?? []).filter(d => matches(d, diceEffect.filter) && (diceEffect.op === 'change' || !d.spotted));
  args = combinations(choices.map(d => d.id), diceEffect.count).map(dice => ({ dice }));
 }
 if (effects.some(e => e.op === 'resource' && e.target === 'friendly')) args = args.flatMap(a => (s.battle?.participants ?? [h.id]).filter(id => faction(p, id) === faction(p, h.id)).map(target => ({ ...a, target })));
 if (effects.some(e => e.op === 'heal-pet')) args = args.flatMap(a => Object.keys(h.pets).map(target => ({ ...a, target })));
 return args;
}
export function abilityCommands(p: ContentPack, s: State): Command[] {
 if (!s.battle) return [];
 return s.battle.participants.flatMap(id => {
  const h = hero(s, id);
  return availableCards(p, h).flatMap(id => card(p, id).abilities.filter(a => a.timing === timing(s)).flatMap(a => argsFor(p, s, h, a.effects).map(args => ({ type: 'ability' as const, hero: h.id, card: id, ability: a.id, args }))));
 });
}
function discards(p: ContentPack, h: Hero, incoming: string): (string | undefined)[] { return bagSize(p, [...h.bag, incoming]) > 3 ? [...h.bag, incoming].filter(id => !card(p, id).bagExempt) : [undefined]; }
export function legalActions(p: ContentPack, s: State): Command[] {
 const list: Command[] = [];
 if (s.phase === 'finished') return list;
 const talent = s.heroes.find(h => h.talentChoices.length);
 if (s.respawns.length) { for (const id of s.respawns) for (const r of respawnRegions(p, s, id)) list.push({ type: 'respawn', hero: id, region: r }); list.push(...abilityCommands(p, s)); }
 else if (talent) { for (const c of p.cards.filter(c => c.kind === 'talent')) list.push({ type: 'talent', hero: talent.id, card: c.id }); }
 else if (s.phase === 'actions') {
  for (const h of s.heroes.filter(h => faction(p, h.id) === s.faction && h.actions > 0)) {
   for (const path of Object.values(reachable(p, s, h))) list.push({ type: 'travel', hero: h.id, path });
   list.push({ type: 'travel', hero: h.id, path: [] });
   const town = p.regions.find(r => r.id === h.location)?.town;
   for (let health = 0; health <= Math.min(h.level * (town === s.faction || town === 'both' ? 3 : 2), Math.max(0, capacity(p, h).health - h.health)); health++) list.push({ type: 'rest', hero: h.id, health });
   for (const c of p.cards.filter(c => c.kind === 'power' && c.classId === character(p, h.id).classId)) list.push({ type: 'train', hero: h.id, cards: [c.id] });
   if (town === s.faction || town === 'both') {
    const health = Math.min(h.level, Math.max(0, capacity(p, h).health - h.health));
    list.push({ type: 'town', hero: h.id, health, operations: [] });
    for (const id of s.merchant) for (const discard of discards(p, h, id)) list.push({ type: 'town', hero: h.id, health, operations: [{ op: 'buy', card: id, discard }] });
    for (const id of [...h.bag, ...equipped(p, h)]) list.push({ type: 'town', hero: h.id, health, operations: [{ op: 'sell', card: id }] });
   }
   const allies = s.heroes.filter(a => a.id !== h.id && a.location === h.location && faction(p, a.id) === s.faction && a.actions > 0).map(a => a.id);
   const groups = Array.from({ length: allies.length + 1 }, (_, n) => combinations(allies, n)).flat();
   const targets = [...new Set(s.enemies.filter(e => e.region === h.location).map(e => e.id)), 'pvp', s.overlord.id];
   for (const target of targets) for (const allies of groups) list.push({ type: 'challenge', hero: h.id, target, allies });
  }
  list.push({ type: 'endActions' });
 } else if (s.phase === 'management' || s.phase === 'final-management') {
  for (const h of s.heroes) {
   if (s.phase === 'management' && s.managed.includes(h.id)) continue;
   list.push({ type: 'manage', hero: h.id, slots: structuredClone(h.slots), discard: [] });
   for (const id of [...h.bag, ...h.learned].filter(id => !equipped(p, h).includes(id))) for (let i = 0; i < h.slots.length; i++) {
    const slots = structuredClone(h.slots); if (card(p, id).addon) slots[i].addons.push(id); else slots[i].card = id;
    list.push({ type: 'manage', hero: h.id, slots, discard: [] });
   }
  }
  list.push({ type: 'endManagement' });
 } else if (s.phase === 'combat') {
  const b = s.battle!, a = b.active;
  list.push(...abilityCommands(p, s));
  if (b.stage === 'attacker') for (const id of eligibleAttackers(p, s)) list.push({ type: 'attacker', hero: id });
  if (b.stage === 'pool') list.push({ type: 'roll' });
  if (b.stage === 'penalty') {
   const h = hero(s, a!.heroId), dice = a!.dice.filter(d => !d.removed);
   for (const ids of combinations(dice.map(d => d.id), Math.min(dice.length, h.stun * 2 + h.curse))) list.push({ type: 'penalty', dice: ids });
  }
  if (b.stage === 'reroll') for (const die of a!.dice.filter(d => !d.removed && !d.rerolled)) list.push({ type: 'reroll', dice: [die.id] });
  if (b.stage === 'after-reroll') {
   const h = hero(s, a!.heroId), powers = h.slots.flatMap(a => [a.card, ...a.addons].filter((id): id is string => !!id && card(p, id).kind === 'power'));
   const count = Math.min(powers.length, a!.dice.filter(d => !d.removed && d.value === 1).length);
   list.push({ type: 'monster' }); if (count) for (const unequip of combinations(powers, count)) list.push({ type: 'monster', unequip });
  }
  if (b.stage === 'tokens') {
   const hits = a!.dice.filter(d => !d.removed && d.value >= a!.threat && d.color !== 'green');
   const eights = a!.dice.filter(d => !d.removed && d.value === 8 && d.color !== 'green').length;
   list.push({ type: 'tokens' }); if (hits.length > eights) for (const toAttrition of combinations(hits.map(d => d.id), hits.length - eights)) list.push({ type: 'tokens', toAttrition });
  }
  if (b.stage === 'defense' && b.kind !== 'pve') for (const f of ['horde','alliance'] as const) {
   const own = b.boxes[f], enemy = b.boxes[other(f)], total = Math.min(own.armor, enemy.damage + enemy.defense);
   for (let damage = Math.max(0, total - enemy.defense); damage <= Math.min(total, enemy.damage); damage++) list.push({ type: 'armor', faction: f, damage, defense: total - damage });
  }
  if (b.stage === 'wounds') for (const id of living(s, b)) { list.push({ type: 'wound', hero: id }); for (const pet of Object.keys(hero(s, id).pets)) list.push({ type: 'wound', hero: id, pet }); }
  if (b.stage === 'over') {
   if (b.kind === 'pvp' && b.winner && b.winner !== 'draw') for (const id of living(s,b,b.winner,p)) for (const from of b.defeated.filter(id => faction(p,id) !== b.winner)) for (const item of hero(s,from).bag) for (const discard of discards(p,hero(s,id),item)) list.push({type:'loot',hero:id,from,card:item,discard});
   list.push({ type: 'closeBattle' });
  }
  if (b.kind === 'pve' && !b.boss && ['defense','resolution'].includes(b.stage) && new Set(s.enemies.filter(e => b.enemies.includes(e.id)).map(e => e.color)).size > 1) {
   for (const color of ['green','red'] as const) list.push({type:'advance',targets:[...b.enemies].sort((x,y) => Number(s.enemies.find(e=>e.id===y)?.color===color)-Number(s.enemies.find(e=>e.id===x)?.color===color))});
  } else list.push({ type: 'advance' });
 } else if (s.phase === 'reward' && s.reward) {
  for (const id of s.reward.eligible) for (const c of s.reward.offered) for (const discard of discards(p, hero(s, id), c)) list.push({ type: 'reward', hero: id, card: c, discard });
  for (const tier of ['green','yellow','red'] as const) list.push({ type: 'quest', tier });
 } else if (s.auction) for (const h of s.heroes) for (let amount = 0; amount <= Math.min(h.gold, 50); amount++) list.push({ type: 'bid', hero: h.id, amount });
 const seen = new Set<string>();
 return list.filter(c => { const key = JSON.stringify(c); if (seen.has(key)) return false; seen.add(key); try { apply(p, s, c); return true; } catch { return false; } });
}
export function commandLabel(p: ContentPack, c: Command): string {
 const name = 'hero' in c ? character(p, c.hero).name.split(' ')[0] : '';
 switch (c.type) {
  case 'travel': return c.path.length ? `${name}: ${p.regions.find(r => r.id === c.path.at(-1))!.name}` : `${name}: ostani na mjestu`;
  case 'rest': return `${name}: odmor (+${c.health} zdravlja)`;
  case 'train': return `${name}: ${card(p, c.cards[0]).name}`;
  case 'town': return `${name}: ${c.operations.length ? c.operations.map(o => `${o.op === 'buy' ? 'kupi' : o.op === 'sell' ? 'prodaj' : 'nauči'} ${card(p, o.card).name}`).join(', ') : 'gradski oporavak'}`;
  case 'ability': return `${name}: ${card(p, c.card).name}${c.args?.target ? ` → ${p.characters.find(h => h.id === c.args?.target)?.name ?? c.args.target}` : ''}`;
  case 'challenge': return `${name}: izazov${c.allies.length ? ` (+${c.allies.length} saveznika)` : ''}`;
  case 'attacker': return `${name} napada`;
  case 'wound': return `${name}: rana${c.pet ? ' ljubimcu' : ''}`;
  case 'respawn': return `${name}: ${p.regions.find(r => r.id === c.region)?.name}`;
  case 'talent': return `${name}: ${card(p, c.card).name}`;
  case 'reward': return `${name}: uzmi ${card(p, c.card).name}`;
  case 'quest': return `Novi ${c.tier} quest`;
  case 'bid': return `${name}: ponudi ${c.amount} zlata`;
  case 'manage': return `${name}: potvrdi opremu`;
  case 'roll': return 'Baci kockice'; case 'reroll': return 'Ponovi odabranu kockicu'; case 'penalty': return 'Ukloni odabrane kockice';
  case 'tokens': return 'Postavi pogotke'; case 'monster': return 'Primijeni sposobnost čudovišta';
  case 'armor': return `${c.faction}: oklop (${c.damage} daljinskih / ${c.defense} bliskih)`;
  case 'endActions': return 'Pređi na upravljanje'; case 'endManagement': return 'Završi upravljanje'; case 'advance': return 'Sljedeća faza'; case 'closeBattle': return 'Završi borbu';
  case 'trade': return 'Potvrdi razmjenu'; case 'loot': return `${name}: plijen ${card(p,c.card).name} od ${character(p,c.from).name.split(' ')[0]}`;
 }
}
