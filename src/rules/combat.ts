import { assert, capacity, card, character, colors, emptyBoxes, emptyPool, faction, hero, note, other, random } from './common.js';
import { automatic, availableCards, healthLoss, immune, matches } from './effects.js';
import { equipped, unequip } from './inventory.js';
import { eventBoss, worldAttack } from './world.js';
import type { Attack, Battle, ContentPack, CreatureRule, Faction, Hero, State } from './model.js';
export const living = (_s: State, b: Battle, f?: Faction, p?: ContentPack) => b.participants.filter(id => !b.defeated.includes(id) && (!f || faction(p!, id) === f));
export const creatureRule = (p: ContentPack, s: State): CreatureRule => { const e = s.enemies.find(e => e.id === s.battle?.enemies[0]); return p.creatures.find(c => c.id === e?.creature)?.rule ?? 'none'; };
export function stats(p: ContentPack, s: Pick<State, 'battle'|'heroes'|'enemies'|'overlord'|'world'>, enemyId?: string) {
 if (!enemyId&&eventBoss(p,s)) {const v=eventBoss(p,s)!.stats;return {...v,attack:v.attack+worldAttack(p,s,s.battle!.region)};}
 if (!enemyId) { const o = p.overlords.find(o => o.id === s.battle?.boss)!; const v = o.stats[s.heroes.length as 4 | 6]; return { threat: v.threat + s.overlord.threat, attack: v.attack + s.overlord.attack + worldAttack(p,s,s.battle!.region), health: v.health + s.overlord.health }; }
 const e = s.enemies.find(e => e.id === enemyId)!; const v=p.creatures.find(c => c.id === e.creature)!.stats[e.color];return {...v,attack:v.attack+worldAttack(p,s,e.region)};
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
 const b = s.battle!; assert(b.stage === 'attacker' && eligibleAttackers(p, s).includes(id), "This hero cannot attack now.");
 let threat: number;
 if (b.kind === 'pve') threat = Math.max(...(b.boss ? [stats(p, s).threat] : b.enemies.map(id => stats(p, s, id).threat)));
 else threat = Math.max(...living(s, b, other(faction(p, id)), p).map(id => hero(s, id).level)) + 2;
 b.active = { heroId: id, dice: [], pool: emptyPool(), removed: emptyPool(), reroll: -hero(s, id).curse-(b.boss==='kazzak'?1:0), attrition: -hero(s, id).curse, armor: 0, threat, used: [], paid: [], woundStart: hero(s, id).health };
 b.current[id] ??= { cards: [], harmed: false }; b.stage = 'pool';
}
export function rollPool(s: State) {
 const b = s.battle!, a = b.active!;
 for (const die of a.dice.filter(d => !d.removed&&!d.fixed)) die.value = random(s, 8) + 1;
 b.stage = 'after-pool';
}
export function monsterEffect(p: ContentPack, s: State, selected: string[] = []) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId);
 assert(b.stage === 'after-reroll', "The creature effect does not resolve now.");
 const rule = immune(p,h,creatureRule(p,s))?'none':creatureRule(p, s), dice = a.dice.filter(d => !d.removed);
 const low = dice.filter(d => d.value <= 2 && d.color !== 'green');
 const ones = dice.filter(d => d.value === 1 && d.color !== 'green');
 const allLow = dice.filter(d => d.value <= 2), allOnes = dice.filter(d => d.value === 1);
 switch (rule) {
  case 'murloc': healthLoss(s, h, ones.length); break;
  case 'naga': healthLoss(s, h, low.length); break;
  case 'gnoll': h.energy = Math.max(0, h.energy - ones.length); break;
  case 'ogre': healthLoss(s, h, low.length * 2); break;
  case 'infernal': healthLoss(s, h, ones.length * 2); h.energy = Math.max(0, h.energy - ones.length * 2); break;
  case 'doomguard':
   healthLoss(s, h, low.length); for (const d of low) { d.removed = true; b.lostDice[d.color]++; } break;
  case 'spider': h.stun += allLow.length; break;
  case 'wraith': h.curse += allOnes.length; a.reroll -= allOnes.length; a.attrition -= allOnes.length; break;
  case 'wildkin': {
   const powers = equipped(p, h).filter(id => p.cards.find(c => c.id === id)?.kind === 'power' && h.slots.some(a => a.card === id || a.addons.includes(id)));
   assert(selected.length === Math.min(powers.length, allOnes.length) && new Set(selected).size === selected.length && selected.every(id => powers.includes(id)), "Choose the powers removed by the Wildkin.");
   for (const id of selected) unequip(p, h, id); break;
  }
 }
 if(b.boss==='kelthuzad'){healthLoss(s,h,low.length*2);const possible=dice.filter(d=>d.color!=='green'&&d.value>=6&&!d.spotted);a.attrition=Math.min(Math.max(0,a.attrition),possible.length);possible.slice(0,a.attrition).forEach(d=>d.spotted=true);}
 if(eventBoss(p,s)?.combat==='cauldrons')b.boxes[b.first].damage=Math.max(0,b.boxes[b.first].damage-allOnes.length);
 b.stage = 'tokens';
}
export function placeTokens(p: ContentPack, s: State, toAttrition: number[] = []) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId), box = b.boxes[faction(p, h.id)], rule = immune(p,h,creatureRule(p,s))?'none':creatureRule(p, s);
 assert(b.stage === 'tokens', "Hits cannot be assigned in this phase.");
 if (!b.defeated.includes(h.id)) {
  const hits = a.dice.filter(d => !d.removed && d.value >= a.threat);
  const nefarian = p.overlords.find(o => o.id === b.boss)?.combat === 'nefarian';
  assert(new Set(toAttrition).size === toAttrition.length && toAttrition.every(id => hits.some(d => d.id === id && d.color !== 'green')), "Invalid hit selection.");
  if (nefarian) {
   const eights = a.dice.filter(d => matches(d, { colors: ['red', 'blue'], values: [8] })).length;
   assert(hits.filter(d => d.color !== 'green').length - toAttrition.length + (a.placed?.damage??0)+(a.placed?.defense??0) <= eights, "Nefarian limits hits to the number of red or blue dice showing 8.");
  } else assert(!toAttrition.length, "Hits cannot be moved here.");
  for (const d of hits) {
   a.placed??=emptyBoxes();
   if (toAttrition.includes(d.id)) {box.attrition++;a.placed.attrition++;}
   else if(d.hitBox){box[d.hitBox]++;a.placed[d.hitBox]++;}
   else if (d.color === 'blue') {box.damage++;a.placed.damage++;}
   else if (d.color === 'red') {box.defense++;a.placed.defense++;}
   else if (rule !== 'drake' || d.value === 8) {box.armor++;a.placed.armor++;}
  }
  a.placed??=emptyBoxes();
  if (rule !== 'drake') {box.armor += a.armor;a.placed.armor+=a.armor;}
  if (!['spider', 'wraith'].includes(rule)) {const attrition=nefarian?Math.ceil(Math.max(0,a.attrition)/2):Math.max(0,a.attrition);box.attrition+=attrition;a.placed.attrition+=attrition;}
 }
 if(!b.defeated.includes(h.id)&&availableCards(p,h).some(id=>card(p,id).abilities.some(a=>a.timing==='after-tokens'))){b.stage='after-tokens';return;}
 finishAttack(p,s);
}
export function finishAttack(p:ContentPack,s:State){
 const b=s.battle!,a=b.active!;automatic(p,s,a.heroId,'after-tokens');const h=hero(s,a.heroId),box=b.boxes[faction(p,h.id)],placed=a.placed??emptyBoxes();
 const drake=creatureRule(p,s)==='drake'&&!immune(p,h,'drake');
 if(a.flags?.['ice-barrier']&&!drake){box.armor+=placed.damage;placed.armor+=placed.damage;}
 if(a.flags?.revenge&&!['spider','wraith'].includes(creatureRule(p,s)))box.attrition+=placed.armor;
 if(a.flags?.adrenaline)h.energy=Math.max(h.energy,Math.min(capacity(p,h).energy,h.energy+Math.floor(placed.damage/2)));
 if(b.boss==='kazzak'){const low=a.dice.filter(d=>!d.removed&&d.color!=='green'&&d.value<=2).length;box.attrition=Math.max(0,box.attrition-low);healthLoss(s,h,low);}
 if(a.flags?.execute)b.report.push(`execute:${faction(p,h.id)}`);
 b.acted.push(h.id); b.nextFaction = b.kind === 'pve' ? b.first : other(faction(p, h.id)); delete b.active;
 b.stage = living(s, b).some(id => !b.acted.includes(id)) ? 'attacker' : 'defense';
}
function killCreatures(p: ContentPack, s: State, targets?: string[]) {
 const b = s.battle!, box = b.boxes[b.first];
 if (b.boss) { if (box.damage >= stats(p, s).health) { box.damage -= stats(p, s).health; b.winner = b.first; b.stage = 'over'; if(!eventBoss(p,s))s.winner = b.first; } return; }
 if (targets) assert(targets.length === b.enemies.length && new Set(targets).size === targets.length && targets.every(id => b.enemies.includes(id)), "Order all remaining opponents without duplicates.");
 const sorted = targets ?? [...b.enemies].sort((a, z) => stats(p, s, a).health - stats(p, s, z).health);
 for (const id of sorted) {
  const health = stats(p, s, id).health;
  if (box.damage < health) continue;
  box.damage -= health;(b.killed??=[]).push(structuredClone(s.enemies.find(e=>e.id===id)!)); s.enemies = s.enemies.filter(e => e.id !== id); b.enemies = b.enemies.filter(e => e !== id);
  b.report.push(`killed:${id}`);
 }
 if (!b.enemies.length) { b.winner = b.first; b.stage = 'over'; }
}
export function checkElimination(p: ContentPack, s: State): boolean {
 const b = s.battle!;
 if (s.respawns.length) return false;
 const horde = living(s, b, 'horde', p).length, alliance = living(s, b, 'alliance', p).length;
 if (b.kind === 'pve') { if (living(s, b).length) return false; b.winner = other(b.first); }
 else { if (horde && alliance) return false; b.winner = horde ? 'horde' : alliance ? 'alliance' : 'draw';
  if(!horde&&!alliance&&s.variants?.deadlyPvp){const diff=(b.unabsorbed?.horde??0)-(b.unabsorbed?.alliance??0);b.winner=diff>0?'alliance':diff<0?'horde':'draw';}
 }
 b.stage = 'over'; if (b.kind === 'final') s.winner = b.winner; return true;
}
export function defense(p: ContentPack, s: State, targets?: string[]) {
 const b = s.battle!; assert(b.stage === 'defense', "This is not the defense phase.");
 if (b.kind === 'pve') {
  killCreatures(p, s, targets); if (b.winner) return;
  if(b.report.includes(`execute:${b.first}`)){const box=b.boxes[b.first];box.damage=box.defense=box.attrition=0;}
  const box = b.boxes[b.first], attack = b.boss ? stats(p, s).attack : b.enemies.reduce((n, id) => n + stats(p, s, id).attack, 0);
  b.wounds[b.first] = Math.max(0, attack - box.defense - box.armor);
 } else {
  assert(b.armorDone.length === 2, "Both factions must assign armor.");
  for (const f of ['horde', 'alliance'] as const) { b.wounds[other(f)] = b.boxes[f].damage; b.boxes[f].damage = 0; }
  for(const f of ['horde','alliance'] as const)if(b.report.includes(`execute:${f}`)){const box=b.boxes[f];box.damage=box.defense=box.attrition=0;}
 }
 b.afterWounds = 'resolution'; b.stage = b.wounds.horde + b.wounds.alliance > 0 ? 'wounds' : 'resolution';
}
export function wound(p: ContentPack, s: State, id: string, pet?: string) {
 const b = s.battle!, h = hero(s, id), f = faction(p, id);
 assert(b.stage === 'wounds' && b.wounds[f] > 0 && living(s, b).includes(id) && h.health > 0, "This hero cannot receive a wound.");
 if (pet) { assert(h.pets[pet] > 0, "The pet is not active."); h.pets[pet]--; if (!h.pets[pet]) unequip(p, h, pet); }
 else healthLoss(s, h, 1);
 b.wounds[f]--;
 if (!s.respawns.length) continueWounds(p, s);
}
export function continueWounds(p: ContentPack, s: State) {
 const b = s.battle!;
 for (const f of ['horde', 'alliance'] as const) if (!living(s, b, f, p).length) {b.unabsorbed??={};b.unabsorbed[f]=(b.unabsorbed[f]??0)+b.wounds[f];b.wounds[f] = 0;}
 if (!b.wounds.horde && !b.wounds.alliance) { if (!checkElimination(p, s)) b.stage = b.afterWounds ?? 'resolution'; }
}
export function defeat(p: ContentPack, s: State, id: string, destination: string) {
 const h = hero(s, id), b = s.battle;
 if(b)b.defeated.push(id); h.health = 1; h.energy = 1; h.actions = 0; h.stun = 0; h.curse = 0; h.location = destination;
 for (const pet of Object.keys(h.pets)) unequip(p, h, pet);
 h.auctionItems = [];h.slots=h.slots.slice(0,character(p,h.id).slots.length); s.respawns = s.respawns.filter(x => x !== id);
 note(s, `${character(p, id).name} is defeated and returns to ${destination}.`);
 if(!b)return;
 if (b.stage === 'wounds') { if (!s.respawns.length) continueWounds(p, s); }
 else if (!checkElimination(p, s) && b.active?.heroId === id) { b.stage = 'tokens'; placeTokens(p, s); }
}
export function resolution(p: ContentPack, s: State, targets?: string[]) {
 const b = s.battle!; assert(b.stage === 'resolution', "This is not the resolution phase.");
 if(eventBoss(p,s)?.combat==='spilskin')b.boxes[b.first].attrition=0;
 for (const f of ['horde', 'alliance'] as const) { const box = b.boxes[f]; box.damage += box.defense + box.attrition; box.defense = box.attrition = box.armor = 0; }
 if (b.kind === 'pve') {
  killCreatures(p, s, targets); if (b.winner) return;
  const boss=eventBoss(p,s),rule = creatureRule(p, s);let bossLoss=b.boss==='kelthuzad'?s.heroes.length:boss?.combat==='dungin'?4:boss?.combat==='zaeldarr'?2:boss?.combat==='daecris'?3*living(s,b).length:0;
  if(boss?.combat==='spectral'||boss?.combat==='daecris')for(const id of living(s,b))hero(s,id).stun+=boss.combat==='spectral'?2:1;
  const loss = bossLoss + ( rule === 'worgen' ? 2 * b.enemies.length : rule === 'crusader' ? b.enemies.length : rule === 'infernal' ? 3 : 0);
  b.boxes[b.first].damage = Math.max(0, b.boxes[b.first].damage - loss); b.stage = 'round-end';
 } else {
  const difference = b.boxes.horde.damage - b.boxes.alliance.damage;
  if(s.variants?.deadlyPvp){b.wounds.horde=b.boxes.alliance.damage;b.wounds.alliance=b.boxes.horde.damage;}
  else b.wounds[difference > 0 ? 'alliance' : 'horde'] = Math.abs(difference);
  b.boxes = { horde: emptyBoxes(), alliance: emptyBoxes() }; b.afterWounds = 'round-end'; b.stage = b.wounds.horde+b.wounds.alliance ? 'wounds' : 'round-end';
 }
}
export function nextRound(s: State) {
 const b = s.battle!; assert(b.stage === 'round-end', "The round has not ended yet.");
 b.previous = b.current; b.current = {}; b.round++; b.acted = []; b.nextFaction = b.first; b.armorDone = []; b.stage = 'attacker';b.report=b.report.filter(v=>!v.startsWith('execute:'));
}
export function enforceDicePenalties(s: State) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId), dice = a.dice.filter(d => !d.removed);
 if (dice.length < h.stun * 2) { healthLoss(s, h, h.health); return; }
 if (h.stun || h.curse) b.stage = 'penalty'; else rollPool(s);
}
export function removePenalty(s: State, ids: number[]) {
 const b = s.battle!, a = b.active!, h = hero(s, a.heroId), dice = a.dice.filter(d => !d.removed);
 assert(b.stage === 'penalty' && ids.length === Math.min(dice.length, h.stun * 2 + h.curse) && new Set(ids).size === ids.length, "Choose dice for Stun and Curse.");
 for (const id of ids) { const d = dice.find(d => d.id === id); assert(d, "This die is unavailable."); d.removed = true; a.removed[d.color]++; }
 rollPool(s);
}
export function reroll(p: ContentPack, s: State, ids: number[]) {
 const b = s.battle!, a = b.active!; assert(b.stage === 'reroll' && creatureRule(p, s) !== 'ghoul', "Reroll is not allowed.");
 assert(ids.length > 0 && new Set(ids).size === ids.length && ids.length <= a.reroll, "Not enough rerolls.");
 for (const id of ids) { const d = a.dice.find(d => d.id === id); assert(d && !d.removed && !d.rerolled&&!a.forbidden?.reroll?.includes(d.color), "This die cannot be rerolled."); d.value = random(s, 8) + 1; d.rerolled = true; }
 a.reroll -= ids.length;a.rerollStarted=true;
}
export function omitDice(s: State, omit = emptyPool()) {
 const a = s.battle!.active!;
 for (const color of colors) { assert(Number.isSafeInteger(omit[color]) && omit[color] >= 0, "Invalid number of dice."); const dice = a.dice.filter(d => !d.removed && d.color === color); assert(omit[color] <= dice.length, "Not enough dice."); const ids = dice.slice(0, omit[color]).map(d => d.id); a.dice = a.dice.filter(d => !ids.includes(d.id)); }
 for(const color of colors)if(a.poolLimits?.[color]!==undefined)assert(a.dice.filter(d=>!d.removed&&d.color===color).length<=a.poolLimits[color]!, "A power limits dice of this color.");
 assert(!a.dice.some(d=>!d.removed&&a.forbidden?.pool?.includes(d.color)),"Equipment prevents rolling the chosen color.");
}
/** Deterministic equipment losses, shared by the roll and its public preview. */
export function poolPenaltyDice(p:ContentPack,h:Hero,a:Attack){
 const removed=new Set(a.dice.filter(d=>d.removed).map(d=>d.id)),ids:number[]=[];
 for(const id of availableCards(p,h))for(const color of colors){
  const n=card(p,id).poolPenalty?.[color]??0;
  for(const d of a.dice.filter(d=>!removed.has(d.id)&&d.color===color).slice(0,n)){removed.add(d.id);ids.push(d.id);}
 }
 return ids;
}
export function poolPenalties(p:ContentPack,s:State){
 const a=s.battle!.active!,h=hero(s,a.heroId);
 for(const id of poolPenaltyDice(p,h,a)){const d=a.dice.find(d=>d.id===id)!;d.removed=true;a.removed[d.color]++;}
}
