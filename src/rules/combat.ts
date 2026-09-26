import { assert, character, colors, emptyBoxes, emptyPool, faction, hero, note, other, random } from './common';
import { healthLoss, matches } from './effects';
import { equipped, unequip } from './inventory';
import type { Battle, ContentPack, CreatureRule, Faction, State } from './model';
export const living = (_s: State, b: Battle, f?: Faction, p?: ContentPack) => b.participants.filter(id => !b.defeated.includes(id) && (!f || faction(p!, id) === f));
export const creatureRule = (p: ContentPack, s: State): CreatureRule => { const e = s.enemies.find(e => e.id === s.battle?.enemies[0]); return p.creatures.find(c => c.id === e?.creature)?.rule ?? 'none'; };
export function stats(p: ContentPack, s: State, enemyId?: string) {
 if (!enemyId) { const o = p.overlords.find(o => o.id === s.battle?.boss)!; const v = o.stats[s.heroes.length as 4 | 6]; return { threat: v.threat + s.overlord.threat, attack: v.attack + s.overlord.attack, health: v.health + s.overlord.health }; }
 const e = s.enemies.find(e => e.id === enemyId)!; return p.creatures.find(c => c.id === e.creature)!.stats[e.color];
}
export function beginBattle(s: State, kind: Battle['kind'], ids: string[], enemies: string[], first: Faction, at: string, boss?: string) {
 s.battle = { kind, region: at, participants: ids, defeated: [], enemies, boss, round: 1, stage: 'attacker', first, nextFaction: first, acted: [], boxes: { horde: emptyBoxes(), alliance: emptyBoxes() }, lostDice: emptyPool(), previous: {}, current: {}, wounds: { horde: 0, alliance: 0 }, armorDone: [], report: [] };
 s.phase = 'combat'; s.tradeWindow = false;
}
export function eligibleAttackers(p: ContentPack, s: State): string[] {
 const b = s.battle!; const candidates = living(s, b).filter(id => !b.acted.includes(id));
 const next = candidates.filter(id => faction(p, id) === b.nextFaction); return next.length ? next : candidates;
}
export function chooseAttacker(p: ContentPack, s: State, id: string) {
 const b = s.battle!; assert(b.stage === 'attacker' && eligibleAttackers(p, s).includes(id), 'Junak sada ne može napasti.');
 let threat: number;
 if (b.kind === 'pve') threat = Math.max(...(b.boss ? [stats(p, s).threat] : b.enemies.map(id => stats(p, s, id).threat)));
 else threat = Math.max(...living(s, b, other(faction(p, id)), p).map(id => hero(s, id).level)) + 2;
 b.active = { heroId: id, dice: [], pool: emptyPool(), removed: emptyPool(), reroll: -hero(s, id).curse, attrition: -hero(s, id).curse, armor: 0, threat, used: [], paid: [], woundStart: hero(s, id).health };
 b.current[id] = { cards: [], harmed: false }; b.stage = 'pool';
}
export function rollPool(s: State) {
 const b = s.battle!, a = b.active!;
 for (const die of a.dice.filter(d => !d.removed)) die.value = random(s, 8) + 1;
 b.stage = 'after-pool';
}
export function monsterEffect(p: ContentPack, s: State, selected: string[] = []) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId);
 assert(b.stage === 'after-reroll', 'Efekt čudovišta nije na redu.');
 const rule = creatureRule(p, s), dice = a.dice.filter(d => !d.removed);
 const low = dice.filter(d => d.value <= 2 && d.color !== 'green');
 const ones = dice.filter(d => d.value === 1 && d.color !== 'green');
 const allLow = dice.filter(d => d.value <= 2), allOnes = dice.filter(d => d.value === 1);
 switch (rule) {
  case 'murloc': healthLoss(s, h, ones.length); break;
  case 'naga': healthLoss(s, h, low.length); break;
  case 'gnoll': h.energy = Math.max(0, h.energy - low.length); break;
  case 'ogre': healthLoss(s, h, allLow.length * 2); break;
  case 'infernal': healthLoss(s, h, ones.length * 2); h.energy = Math.max(0, h.energy - ones.length * 2); break;
  case 'doomguard':
   healthLoss(s, h, low.length); for (const d of low) { d.removed = true; b.lostDice[d.color]++; } break;
  case 'spider': h.stun += allLow.length; break;
  case 'wraith': h.curse += allOnes.length; a.reroll -= allOnes.length; a.attrition -= allOnes.length; break;
  case 'wildkin': {
   const powers = equipped(p, h).filter(id => p.cards.find(c => c.id === id)?.kind === 'power' && h.slots.some(a => a.card === id || a.addons.includes(id)));
   assert(selected.length === Math.min(powers.length, allOnes.length) && new Set(selected).size === selected.length && selected.every(id => powers.includes(id)), 'Odaberi moći koje Wildkin uklanja.');
   for (const id of selected) unequip(p, h, id); break;
  }
 }
 b.stage = 'tokens';
}
export function placeTokens(p: ContentPack, s: State, toAttrition: number[] = []) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId), box = b.boxes[faction(p, h.id)], rule = creatureRule(p, s);
 assert(b.stage === 'tokens', 'Pogoci se ne raspoređuju u ovoj fazi.');
 if (!b.defeated.includes(h.id)) {
  const hits = a.dice.filter(d => !d.removed && d.value >= a.threat);
  const nefarian = p.overlords.find(o => o.id === b.boss)?.combat === 'nefarian';
  assert(new Set(toAttrition).size === toAttrition.length && toAttrition.every(id => hits.some(d => d.id === id && d.color !== 'green')), 'Nevažeći izbor pogodaka.');
  if (nefarian) {
   const eights = a.dice.filter(d => matches(d, { colors: ['red', 'blue'], values: [8] })).length;
   assert(hits.filter(d => d.color !== 'green').length - toAttrition.length <= eights, 'Nefarian ograničava pogotke na broj crvenih/plavih osmica.');
  } else assert(!toAttrition.length, 'Ovdje nije dozvoljeno premještanje pogodaka.');
  for (const d of hits) {
   if (toAttrition.includes(d.id)) box.attrition++;
   else if (d.color === 'blue') box.damage++;
   else if (d.color === 'red') box.defense++;
   else if (rule !== 'drake' || d.value === 8) box.armor++;
  }
  if (rule !== 'drake') box.armor += a.armor;
  if (!['spider', 'wraith'].includes(rule)) box.attrition += Math.max(0, a.attrition);
 }
 b.acted.push(h.id); b.nextFaction = b.kind === 'pve' ? b.first : other(faction(p, h.id)); delete b.active;
 b.stage = living(s, b).some(id => !b.acted.includes(id)) ? 'attacker' : 'defense';
}
function killCreatures(p: ContentPack, s: State, targets?: string[]) {
 const b = s.battle!, box = b.boxes[b.first];
 if (b.boss) { if (box.damage >= stats(p, s).health) { box.damage -= stats(p, s).health; b.winner = b.first; b.stage = 'over'; s.winner = b.first; } return; }
 if (targets) assert(targets.length === b.enemies.length && new Set(targets).size === targets.length && targets.every(id => b.enemies.includes(id)), 'Poredaj sve preostale protivnike bez ponavljanja.');
 const sorted = targets ?? [...b.enemies].sort((a, z) => stats(p, s, a).health - stats(p, s, z).health);
 for (const id of sorted) {
  const health = stats(p, s, id).health;
  if (box.damage < health) continue;
  box.damage -= health; s.enemies = s.enemies.filter(e => e.id !== id); b.enemies = b.enemies.filter(e => e !== id);
 }
 if (!b.enemies.length) { b.winner = b.first; b.stage = 'over'; }
}
export function checkElimination(p: ContentPack, s: State): boolean {
 const b = s.battle!;
 if (s.respawns.length) return false;
 const horde = living(s, b, 'horde', p).length, alliance = living(s, b, 'alliance', p).length;
 if (b.kind === 'pve') { if (living(s, b).length) return false; b.winner = other(b.first); }
 else { if (horde && alliance) return false; b.winner = horde ? 'horde' : alliance ? 'alliance' : 'draw'; }
 b.stage = 'over'; if (b.kind === 'final') s.winner = b.winner; return true;
}
export function defense(p: ContentPack, s: State, targets?: string[]) {
 const b = s.battle!; assert(b.stage === 'defense', 'Nije faza odbrane.');
 if (b.kind === 'pve') {
  killCreatures(p, s, targets); if (b.winner) return;
  const box = b.boxes[b.first], attack = b.boss ? stats(p, s).attack : b.enemies.reduce((n, id) => n + stats(p, s, id).attack, 0);
  b.wounds[b.first] = Math.max(0, attack - box.defense - box.armor);
 } else {
  assert(b.armorDone.length === 2, 'Obje frakcije moraju rasporediti oklop.');
  for (const f of ['horde', 'alliance'] as const) { b.wounds[other(f)] = b.boxes[f].damage; b.boxes[f].damage = 0; }
 }
 b.afterWounds = 'resolution'; b.stage = b.wounds.horde + b.wounds.alliance > 0 ? 'wounds' : 'resolution';
}
export function wound(p: ContentPack, s: State, id: string, pet?: string) {
 const b = s.battle!, h = hero(s, id), f = faction(p, id);
 assert(b.stage === 'wounds' && b.wounds[f] > 0 && living(s, b).includes(id) && h.health > 0, 'Ovaj junak ne može primiti ranu.');
 if (pet) { assert(h.pets[pet] > 0, 'Ljubimac nije aktivan.'); h.pets[pet]--; if (!h.pets[pet]) unequip(p, h, pet); }
 else healthLoss(s, h, 1);
 b.wounds[f]--;
 if (!s.respawns.length) continueWounds(p, s);
}
export function continueWounds(p: ContentPack, s: State) {
 const b = s.battle!;
 for (const f of ['horde', 'alliance'] as const) if (!living(s, b, f, p).length) b.wounds[f] = 0;
 if (!b.wounds.horde && !b.wounds.alliance) { if (!checkElimination(p, s)) b.stage = b.afterWounds ?? 'resolution'; }
}
export function defeat(p: ContentPack, s: State, id: string, destination: string) {
 const h = hero(s, id), b = s.battle!;
 b.defeated.push(id); h.health = 1; h.energy = 1; h.actions = 0; h.stun = 0; h.curse = 0; h.location = destination;
 for (const pet of Object.keys(h.pets)) unequip(p, h, pet);
 h.auctionItems = []; s.respawns = s.respawns.filter(x => x !== id);
 note(s, `${character(p, id).name} je poražen i vraća se u ${destination}.`);
 if (b.stage === 'wounds') { if (!s.respawns.length) continueWounds(p, s); }
 else if (!checkElimination(p, s) && b.active?.heroId === id) { b.stage = 'tokens'; placeTokens(p, s); }
}
export function resolution(p: ContentPack, s: State, targets?: string[]) {
 const b = s.battle!; assert(b.stage === 'resolution', 'Nije faza razrješenja.');
 for (const f of ['horde', 'alliance'] as const) { const box = b.boxes[f]; box.damage += box.defense + box.attrition; box.defense = box.attrition = box.armor = 0; }
 if (b.kind === 'pve') {
  killCreatures(p, s, targets); if (b.winner) return;
  const rule = creatureRule(p, s); const loss = rule === 'worgen' ? 2 * b.enemies.length : rule === 'crusader' ? b.enemies.length : rule === 'infernal' ? 3 : 0;
  b.boxes[b.first].damage = Math.max(0, b.boxes[b.first].damage - loss); b.stage = 'round-end';
 } else {
  const difference = b.boxes.horde.damage - b.boxes.alliance.damage;
  b.wounds[difference > 0 ? 'alliance' : 'horde'] = Math.abs(difference);
  b.boxes = { horde: emptyBoxes(), alliance: emptyBoxes() }; b.afterWounds = 'round-end'; b.stage = difference ? 'wounds' : 'round-end';
 }
}
export function nextRound(s: State) {
 const b = s.battle!; assert(b.stage === 'round-end', 'Runda još nije završila.');
 b.previous = b.current; b.current = {}; b.round++; b.acted = []; b.nextFaction = b.first; b.armorDone = []; b.stage = 'attacker';
}
export function enforceDicePenalties(s: State) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId), dice = a.dice.filter(d => !d.removed);
 if (dice.length < h.stun * 2) { healthLoss(s, h, h.health); return; }
 if (h.stun || h.curse) b.stage = 'penalty'; else rollPool(s);
}
export function removePenalty(s: State, ids: number[]) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId), dice = a.dice.filter(d => !d.removed);
 assert(b.stage === 'penalty' && ids.length === Math.min(dice.length, h.stun * 2 + h.curse) && new Set(ids).size === ids.length, 'Odaberi kockice za Stun i Curse.');
 for (const id of ids) { const d = dice.find(d => d.id === id); assert(d, 'Kockica nije dostupna.'); d.removed = true; a.removed[d.color]++; }
 rollPool(s);
}
export function reroll(p: ContentPack, s: State, ids: number[]) {
 const b = s.battle!, a = b.active!; assert(b.stage === 'reroll' && creatureRule(p, s) !== 'ghoul', 'Reroll nije dozvoljen.');
 assert(ids.length > 0 && new Set(ids).size === ids.length && ids.length <= a.reroll, 'Nema dovoljno ponovnih bacanja.');
 for (const id of ids) { const d = a.dice.find(d => d.id === id); assert(d && !d.removed && !d.rerolled, 'Ova kockica se ne može ponoviti.'); d.value = random(s, 8) + 1; d.rerolled = true; }
 a.reroll -= ids.length;
}
export function omitDice(s: State, omit = emptyPool()) {
 const a = s.battle!.active!;
 for (const color of colors) { assert(Number.isSafeInteger(omit[color]) && omit[color] >= 0, 'Nevažeći broj kockica.'); const dice = a.dice.filter(d => !d.removed && d.color === color); assert(omit[color] <= dice.length, 'Nema toliko kockica.'); const ids = dice.slice(0, omit[color]).map(d => d.id); a.dice = a.dice.filter(d => !ids.includes(d.id)); }
}
