import { assert, capacity, card, character, colors, faction, hero, integer, random } from './common';
import { equipped, unequip } from './inventory';
import type { AbilityArgs, Condition, ContentPack, DiceFilter, Die, Effect, Hero, State, Timing } from './model';
export const matches = (die: Die, filter: DiceFilter) => !die.removed && (!filter.colors || filter.colors.includes(die.color)) && (!filter.values || filter.values.includes(die.value)) && (filter.min === undefined || die.value >= filter.min);
export function availableCards(p: ContentPack, h: Hero) {
 return [...new Set([...equipped(p, h), ...h.talents, ...h.auctionItems, ...h.bag.filter(id => card(p, id).type === 'bag'), ...[character(p, h.id).racial].filter((id): id is string => !!id)])];
}
export function timing(s: State): Timing | undefined {
 const stage = s.battle?.stage;
 if (s.respawns.length) return 'wound';
 if (stage === 'wounds') return 'wound';
 if (stage === 'pool' || stage === 'after-pool' || stage === 'reroll' || stage === 'after-reroll' || stage === 'tokens' || stage === 'defense' || stage === 'round-end') return stage;
 if (s.phase === 'actions') return 'action';
 return undefined;
}
function condition(p: ContentPack, s: State, h: Hero, id: string, test: Condition): boolean {
 const b = s.battle, a = b?.active;
 switch (test.kind) {
  case 'previous-use': return !!b?.previous[h.id]?.cards.includes(test.cardId ?? id) && (!test.unharmed || !b.previous[h.id].harmed);
  case 'equipped': return equipped(p, h).includes(test.cardId);
  case 'dice': return (a?.dice.filter(d => matches(d, test.filter)).length ?? 0) >= test.atLeast;
  case 'no-color': return !a?.dice.some(d => !d.removed && d.color === test.color);
  case 'pvp': return !!b && b.kind !== 'pve';
 }
}
export function healthLoss(s: State, h: Hero, amount: number) {
 if (amount > 0 && s.battle) { s.battle.current[h.id] ??= { cards: [], harmed: false }; s.battle.current[h.id].harmed = true; }
 h.health = Math.max(0, h.health - amount);
 if (h.health === 0 && !s.respawns.includes(h.id)) s.respawns.push(h.id);
}
export function effects(p: ContentPack, s: State, h: Hero, id: string, list: Effect[], args: AbilityArgs) {
 const b = s.battle, a = b?.active;
 const select = (filter: DiceFilter, count: number) => {
  assert(a && args.dice && args.dice.length === count && new Set(args.dice).size === count, 'Odaberi tačan broj kockica.');
  const dice = args.dice.map(id => a.dice.find(d => d.id === id));
  assert(dice.every((d): d is Die => !!d && matches(d, filter)), 'Kockice ne odgovaraju efektu.'); return dice;
 };
 const target = (kind?: 'self' | 'friendly' | 'pet') => {
  if (!kind || kind === 'self') return h;
  assert(kind !== 'pet', 'Za ljubimca koristi njegov poseban efekt.');
  const t = hero(s, args.target ?? h.id);
  assert(b && b.participants.includes(t.id) && !b.defeated.includes(t.id) && faction(p, t.id) === faction(p, h.id), 'Cilj mora biti prijateljski učesnik borbe.'); return t;
 };
 for (const e of list) {
  switch (e.op) {
   case 'dice': {
    assert(a && a.heroId === h.id && b, 'Kockice se dodaju samo aktivnom junaku.');
    const available = 7 - b.lostDice[e.color] - a.removed[e.color] - a.dice.filter(d => !d.removed && d.color === e.color).length;
    for (let i = 0; i < Math.min(e.amount, available); i++) a.dice.push({ id: Math.max(-1, ...a.dice.map(d => d.id)) + 1, color: e.color, value: b.stage === 'pool' ? 0 : random(s, 8) + 1, rerolled: false, spotted: false, removed: false });
    a.pool[e.color] += e.amount; break;
   }
   case 'resource': {
    const t = target(e.target);
    if (e.resource === 'gold') t.gold = Math.max(0, t.gold + e.amount);
    else if (e.resource === 'health' && e.amount < 0) healthLoss(s, t, -e.amount);
    else if (e.amount < 0) t.energy = Math.max(0, t.energy + e.amount);
    else { const limit = capacity(p, t)[e.resource]; t[e.resource] = e.gain ? t[e.resource] + e.amount : Math.max(t[e.resource], Math.min(limit, t[e.resource] + e.amount)); if (t.health > 0) s.respawns = s.respawns.filter(id => id !== t.id); }
    break;
   }
   case 'stat': assert(a && a.heroId === h.id, 'Nema aktivnog napada.'); a[e.stat] += e.amount; break;
   case 'token': {
    assert(b, 'Nema borbe.'); const enemy = s.enemies.find(v => v.id === b.enemies[0]), rule = p.creatures.find(v => v.id === enemy?.creature)?.rule;
    if (!(e.box === 'attrition' && (rule === 'spider' || rule === 'wraith')) && !(e.box === 'armor' && rule === 'drake')) b.boxes[faction(p, h.id)][e.box] += e.amount;
    break;
   }
   case 'condition': { const t = target(e.target); t[e.condition] = Math.max(0, t[e.condition] + e.amount); break; }
   case 'if': effects(p, s, h, id, condition(p, s, h, id, e.condition) ? e.then : e.otherwise ?? [], args); break;
   case 'spot': {
    const dice = select(e.filter, e.count); assert(dice.every(d => !d.spotted), 'Kockica je već iskorištena za Spot.'); dice.forEach(d => d.spotted = true); effects(p, s, h, id, e.effects, args); break;
   }
   case 'remove': {
    assert(a, 'Nema aktivnog napada.'); const dice = select(e.filter, e.count); assert(dice.every(d => !d.spotted), 'Spotted kockica ne može se dobrovoljno ukloniti.');
    dice.forEach(d => { d.removed = true; a.removed[d.color]++; }); effects(p, s, h, id, e.effects, args); break;
   }
   case 'change': {
    assert(a && b, 'Nema aktivnog napada.');
    for (const d of select(e.filter, e.count)) {
     const color = e.color ?? args.color ?? d.color; assert(colors.includes(color), 'Nepoznata boja.');
     if (color !== d.color) assert(a.dice.filter(x => !x.removed && x.color === color).length < 7 - a.removed[color] - b.lostDice[color], 'Nema slobodne kockice nove boje.');
     d.color = color; d.value = e.value;
    } break;
   }
   case 'discard-self': {
    const i = h.bag.indexOf(id); if (i >= 0) h.bag.splice(i, 1); else { unequip(p, h, id); const j = h.bag.indexOf(id); if (j >= 0) h.bag.splice(j, 1); } break;
   }
   case 'heal-pet': {
    assert(args.target && Object.hasOwn(h.pets, args.target), 'Odaberi svog opremljenog ljubimca.');
    h.pets[args.target] = Math.min(card(p, args.target).petHealth!, h.pets[args.target] + e.amount); break;
   }
  }
 }
}
export function activate(p: ContentPack, s: State, heroId: string, cardId: string, abilityId: string, args: AbilityArgs = {}) {
 const h = hero(s, heroId), c = card(p, cardId), ability = c.abilities.find(a => a.id === abilityId), b = s.battle, a = b?.active;
 assert(availableCards(p, h).includes(cardId) && c.level <= h.level, 'Karta nije dostupna ovom junaku.');
 assert(ability && ability.timing === timing(s), 'Sposobnost se ne koristi u ovoj fazi.');
 assert(b && b.participants.includes(heroId) && !b.defeated.includes(heroId), 'Ova verzija izvršava borbene sposobnosti.');
 assert(['wound', 'defense', 'round-end'].includes(ability.timing) || a?.heroId === heroId, 'Drugi junak je trenutno aktivan.');
 b.current[heroId] ??= { cards: [], harmed: false };
 const useKey = `${cardId}:${abilityId}`;
 assert(!b.current[heroId].cards.includes(useKey), 'Sposobnost je već upotrijebljena u ovoj rundi.');
 if (ability.requires) assert(b.current[heroId].cards.includes(`${cardId}:${ability.requires}`), 'Prvo aktiviraj primarnu sposobnost ove karte.');
 const paid = b.current[heroId].cards.includes(cardId);
 const cost = ability.cost ?? (paid || c.type === 'active' || c.kind === 'talent' || c.kind === 'racial' ? 0 : c.energy);
 assert(integer(cost) && h.energy >= cost, 'Nema dovoljno energije.'); h.energy -= cost;
 effects(p, s, h, cardId, ability.effects, args);
 b.current[heroId].cards.push(useKey); if (!paid) b.current[heroId].cards.push(cardId);
 if (a?.heroId === heroId) { a.used.push(useKey); if (!a.paid.includes(cardId)) a.paid.push(cardId); }
}
