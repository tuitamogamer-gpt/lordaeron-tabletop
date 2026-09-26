import { assert, capacity, card, character, faction, hero, integer, note, other, region, shuffle, unique } from './common.js';
import { activate } from './effects.js';
import { beginBattle, chooseAttacker, continueWounds, creatureRule, defeat, defense, enforceDicePenalties, living, monsterEffect, nextRound, omitDice, placeTokens, removePenalty, reroll, resolution, wound } from './combat.js';
import { bid, checkWars, drawEvents, finishEvent, replacement } from './events.js';
import { bagSize, manage, receiveItem, rest, townOperations, train } from './inventory.js';
import { independents, respawnRegions, travel } from './movement.js';
import { drawQuest, finalAttacker, nextItem, rewards } from './rewards.js';
import type { Command, ContentPack, Hero, ItemDeck, Setup, State, Tier } from './model.js';

export function validatePack(p: ContentPack): string[] {
 const errors: string[] = [];
 const ids = (values: { id: string }[], name: string) => { if (!unique(values.map(v => v.id))) errors.push(`${name}: duplicirani ID-jevi`); };
 ids(p.cards, 'Karte'); ids(p.characters, 'Likovi'); ids(p.quests, 'Questovi'); ids(p.events, 'Događaji'); ids(p.regions, 'Regije'); ids(p.creatures,'Stvorenja'); ids(p.overlords,'Overlordi');
 for (const r of p.regions) for (const n of r.neighbors) if (!p.regions.some(a => a.id === n && a.neighbors.includes(r.id))) errors.push(`Veza ${r.id}–${n} nije dvosmjerna`);
 if (p.xp.length !== 5 || p.xp[0] !== 0 || p.xp.some((n, i) => i > 0 && n <= p.xp[i - 1])) errors.push('XP pragovi');
 for (const c of p.characters) if (c.capacities.length !== 5 || c.slots.length !== 7 || c.capacities.some(v=>!integer(v.health,1)||!integer(v.energy)) || c.slots.some(s => s.printed && !p.cards.some(c => c.id === s.printed)) || (c.racial && !p.cards.some(a=>a.id===c.racial))) errors.push(`List lika ${c.id}`);
 for (const f of ['horde','alliance'] as const) if (p.regions.filter(r=>r.home===f).length !== 1) errors.push(`Početna regija: ${f}`);
 for (const c of p.cards) if (!integer(c.level,1,5)||!integer(c.price)||!integer(c.energy)||!unique(c.abilities.map(a=>a.id))||c.abilities.some(a=>a.requires&&!c.abilities.some(b=>b.id===a.requires))) errors.push(`Karta ${c.id}`);
 for (const o of p.overlords) if (!p.regions.some(r=>r.id===o.region)||o.route?.some(id=>!p.regions.some(r=>r.id===id))||[o.stats[4],o.stats[6]].some(s=>!s||!integer(s.health,1)||!integer(s.attack)||!integer(s.threat,1))) errors.push(`Overlord ${o.id}`);
 for (const q of p.quests) for (const spawn of q.spawns) if (!p.regions.some(r => r.id === spawn.region) || !p.creatures.some(c => c.id === spawn.creature) || !integer(spawn.count, 1, 8)) errors.push(`Spawn ${q.id}`);
 if (p.officialComplete) {
  if (p.characters.length !== 16 || p.cards.filter(c => c.kind === 'power'&&!c.printed).length !== 108 || p.cards.filter(c => c.kind === 'talent').length !== 108 || p.cards.filter(c => c.kind === 'item'&&!c.printed).length !== 120 || p.quests.length !== 80 || p.events.length !== 52 || p.creatures.length !== 13 || p.overlords.length !== 3) errors.push('Osnovni set nema sve komponente');
  if ([...p.cards, ...p.characters, ...p.creatures, ...p.quests, ...p.events, ...p.overlords].some(c => c.source.status !== 'verified')) errors.push('Osnovni set sadrži neprovjerene komponente');
 }
 return errors;
}
export function createGame(p: ContentPack, setup: Setup): State {
 const errors = validatePack(p); assert(!errors.length, errors.join('; '));
 assert(integer(setup.seed, 1, 0xffffffff), 'Seed mora biti pozitivan 32-bitni broj.');
 assert([4, 6].includes(setup.roster.length) && unique(setup.roster), 'Osnovna igra koristi četiri ili šest različitih likova.');
 const defs = setup.roster.map(id => character(p, id));
 assert(unique(defs.map(d => d.classId)), 'Svaka klasa može biti odabrana samo jednom u cijeloj partiji.');
 assert(defs.filter(d => d.faction === 'horde').length === defs.length / 2, 'Frakcije moraju imati jednak broj likova.');
 const boss = p.overlords.find(o => o.id === setup.overlord); assert(boss, 'Nepoznat Overlord.');
 const heroes: Hero[] = defs.map(d => ({ id: d.id, location: p.regions.find(r => r.home === d.faction)!.id, ...d.capacities[0], gold: 5, level: 1, xp: 0, actions: 2, curse: 0, stun: 0, learned: [], talents: [], bag: [], slots: d.slots.map(() => ({ addons: [] })), pets: {}, auctionItems: [], talentChoices: [] }));
 const s: State = { version: 2, pack: p.id, revision: 0, rng: setup.seed, phase: 'actions', turn: 1, faction: 'horde', heroes, enemies: [], quests: [], completed: [], questDecks: { horde: { grey: [], green: [], yellow: [], red: [] }, alliance: { grey: [], green: [], yellow: [], red: [] } }, itemDecks: { triangle: [], square: [], circle: [], special: [] }, merchant: [], eventDeck: [], eventDiscard: [], eventSeen: [], wars: [], overlord: { id: boss.id, region: boss.region, attack: 0, health: 0, threat: 0 }, tradeWindow: false, finalReady: [], managed: [], respawns: [], log: [] };
 for (const f of ['horde', 'alliance'] as const) for (const tier of ['grey', 'green', 'yellow', 'red'] as Tier[]) s.questDecks[f][tier] = shuffle(s, p.quests.filter(q => q.faction === f && q.tier === tier).map(q => q.id));
 for (const deck of ['triangle', 'square', 'circle', 'special'] as ItemDeck[]) s.itemDecks[deck] = shuffle(s, p.cards.filter(c => c.kind === 'item' && c.deck === deck).map(c => c.id));
 for (const [deck, count] of [['triangle', 3], ['square', 2], ['circle', 1]] as const) { assert(s.itemDecks[deck].length >= count, 'Nedostaju predmeti za početnog trgovca.'); s.merchant.push(...s.itemDecks[deck].splice(0, count)); }
 s.eventDeck = shuffle(s, p.events.filter(e => !e.overlord || e.overlord === boss.id).map(e => e.id));
 for (const f of ['horde', 'alliance'] as const) {
  for (let i = 0; i < setup.roster.length / 2 + 1; i++) assert(drawQuest(p, s, f, 'grey'), 'Nema dovoljno početnih sivih questova.');
  assert(drawQuest(p, s, f, 'green'), 'Nema početnog zelenog questa.'); s.questDecks[f].grey = [];
 }
 note(s, 'Setup završen. Horda započinje prvu od 30 frakcijskih smjena.'); return s;
}
function actionable(p: ContentPack, s: State, id: string, challenge = false) {
 const h = hero(s, id); assert(s.phase === 'actions' && faction(p, id) === s.faction && h.actions > 0, 'Junak sada nema dostupnu akciju.');
 assert(challenge || !independents(s, h.location).length, 'Sljedeća akcija mora biti izazov nezavisnom čudovištu.'); return h;
}
function actionDone(s: State, h: Hero, message: string) { h.actions--; s.tradeWindow = true; note(s, message); }
function finishRewards(p: ContentPack, s: State) {
 if (s.heroes.some(h => h.talentChoices.length)) return;
 if (s.reward && (s.reward.offered.length || s.reward.items.length || s.reward.special.length || s.reward.replacement)) return;
 delete s.reward;
 if (s.battle && nextQuestReward(p, s)) return;
 // War rewards interrupt management; normal quest rewards resume the action phase.
 s.phase = s.battle ? 'actions' : 'management'; s.tradeWindow = s.phase === 'actions'; delete s.battle;
 for (const h of s.heroes) h.stun = 0;
 if (s.phase === 'management') advanceTurn(p, s);
}
function nextQuestReward(p: ContentPack, s: State): boolean {
 const b = s.battle;
 if (!b || b.kind !== 'pve' || b.winner !== b.first) return false;
 const q = p.quests.find(q => s.quests.includes(q.id) && q.faction === b.first && !s.enemies.some(e => e.quest === q.id));
 if (!q) return false;
 s.quests = s.quests.filter(id => id !== q.id); s.completed.push(q.id);
 rewards(p, s, b.participants, living(s, b), q.reward, q); s.phase = 'reward'; return true;
}
function advanceTurn(p: ContentPack, s: State) {
 if (checkWars(p, s)) return;
 if (s.turn === 30) { s.phase = 'final-management'; s.faction = finalAttacker(p, s); for (const h of s.heroes) { Object.assign(h, capacity(p, h)); h.stun = 0; } s.finalReady = []; note(s, 'Počinje priprema završnog PvP sukoba.'); return; }
 s.turn++; for (const h of s.heroes) if (faction(p, h.id) === other(s.faction)) h.actions = 2;
 const icon = p.track[s.turn];
 if (icon === 'event') drawEvents(p, s);
 else { if (icon) s.merchant.push(...s.itemDecks[icon].splice(0, 1)); finishEvent(s); }
}
/** Atomic deterministic reducer. A rejected command never changes the original state. */
export function apply(p: ContentPack, state: State, command: Command): State {
 assert(state.pack === p.id, 'Verzija sadržaja ne odgovara ovoj partiji.');
 assert(state.phase !== 'finished', 'Partija je završena.');
 assert(command && typeof command.type === 'string', 'Neispravna naredba.');
 const s = structuredClone(state), c = command;
 if (s.respawns.length) assert(c.type === 'respawn' || c.type === 'ability', 'Prvo razriješi poraz ili posljednju priliku za liječenje.');
 const talent = s.heroes.find(h => h.talentChoices.length);
 if (talent && !s.respawns.length) assert(c.type === 'talent', 'Prvo izaberi talent za novi nivo.');
 switch (c.type) {
  case 'travel': { const h = actionable(p, s, c.hero); travel(p, s, h, c.path); actionDone(s, h, `${h.id} putuje u ${h.location}.`); break; }
  case 'rest': { const h = actionable(p, s, c.hero), town = ['both', s.faction].includes(region(p, h.location).town ?? ''); rest(p, h, h.level * (town ? 3 : 2), c.health); h.curse = town ? 0 : Math.max(0, h.curse - 1); actionDone(s, h, `${h.id} odmara.`); break; }
  case 'train': { const h = actionable(p, s, c.hero); assert(c.cards.length && unique(c.cards), 'Odaberi različite moći.'); for (const id of c.cards) train(p, h, id); actionDone(s, h, `${h.id} uči ${c.cards.length} moći.`); break; }
  case 'town': {
   const h = actionable(p, s, c.hero); assert(['both', s.faction].includes(region(p, h.location).town ?? ''), 'Potreban je prijateljski grad.');
   townOperations(p,s,h,c.health,c.operations);
   actionDone(s, h, `${h.id} posjećuje grad.`); break;
  }
  case 'trade': {
   assert(s.phase === 'actions' && s.tradeWindow && c.hero !== c.to, 'Razmjena je dostupna nakon akcije.'); const h = hero(s, c.hero), to = hero(s, c.to);
   assert(faction(p, h.id) === s.faction && faction(p, to.id) === s.faction && h.location === to.location, 'Junaci moraju biti saveznici u istoj regiji.');
   assert(unique(c.items) && unique(c.receiveItems) && integer(c.gold, 0, h.gold) && integer(c.receiveGold, 0, to.gold), 'Neispravna razmjena.');
   for (const [from, ids] of [[h, c.items], [to, c.receiveItems]] as const) assert(ids.every(id => from.bag.includes(id) && !card(p, id).soulbound), 'Razmjenjuju se samo predmeti iz torbe koji nisu soulbound.');
   h.bag = [...h.bag.filter(id => !c.items.includes(id)), ...c.receiveItems]; to.bag = [...to.bag.filter(id => !c.receiveItems.includes(id)), ...c.items];
   assert(bagSize(p, h.bag) <= 3 && bagSize(p, to.bag) <= 3, 'Razmjena prelazi kapacitet torbe.'); h.gold += c.receiveGold - c.gold; to.gold += c.gold - c.receiveGold; break;
  }
  case 'challenge': {
   const h = actionable(p, s, c.hero, true), ids = [h.id, ...c.allies]; assert(unique(ids), 'Junak može pristupiti samo jednom.');
   for (const id of c.allies) { const ally = actionable(p, s, id, true); assert(ally.location === h.location, 'Saveznik mora biti u istoj regiji.'); }
   const independent = independents(s, h.location); let enemies: string[] = [], boss: string | undefined, defenders: string[] = [];
   if (c.target === 'pvp') { assert(!independent.length, 'Prvo izazovi nezavisna stvorenja.'); defenders = s.heroes.filter(a => faction(p, a.id) !== s.faction && a.location === h.location).map(a => a.id); assert(defenders.length, 'Nema protivničkih likova.'); }
   else if (c.target === s.overlord.id) { assert(!independent.length && s.overlord.region === h.location, 'Overlord nije dostupan.'); boss = c.target; }
   else {
    const e = s.enemies.find(e => e.id === c.target); assert(e && e.region === h.location && (!e.faction || e.faction === s.faction) && (!independent.length || e.color === 'blue'), 'Protivnik nije dostupan.');
    enemies = s.enemies.filter(a => a.region === h.location && a.creature === e.creature && (a.color === 'blue') === (e.color === 'blue') && a.faction === e.faction).map(e => e.id);
   }
   ids.forEach(id => hero(s, id).actions--); beginBattle(s, defenders.length ? 'pvp' : 'pve', [...ids, ...defenders], enemies, s.faction, h.location, boss); note(s, `Izazov: ${ids.join(', ')}.`); break;
  }
  case 'endActions': assert(s.phase === 'actions' && s.heroes.filter(h => faction(p, h.id) === s.faction).every(h => !h.actions), 'Svi aktivni junaci prvo koriste dvije akcije.'); s.phase = 'management'; s.managed = []; s.tradeWindow = false; break;
  case 'manage': {
   const h = hero(s, c.hero); assert((s.phase === 'management' && faction(p, h.id) === s.faction) || (s.phase === 'final-management' && !s.finalReady.includes(h.id)), 'Nije faza upravljanja ovog lika.');
   if (s.phase === 'final-management' && faction(p, h.id) !== s.faction) assert(s.heroes.filter(h => faction(p, h.id) === s.faction).every(h => s.finalReady.includes(h.id)), 'Napadačka frakcija se prva priprema.');
   manage(p, s, h, c.slots, c.discard); if (s.phase === 'final-management') s.finalReady.push(h.id); else if (!s.managed.includes(h.id)) s.managed.push(h.id); break;
  }
  case 'endManagement': {
   assert(s.phase === 'management' || s.phase === 'final-management', 'Nije faza upravljanja.');
   if (s.phase === 'final-management') { assert(s.finalReady.length === s.heroes.length, 'Svi junaci moraju završiti pripremu.'); beginBattle(s, 'final', s.heroes.map(h => h.id), [], s.faction, 'final'); }
   else { assert(s.heroes.filter(h => faction(p, h.id) === s.faction).every(h => s.managed.includes(h.id)), 'Svi aktivni junaci moraju potvrditi opremu.'); advanceTurn(p, s); } break;
  }
  case 'talent': { const h = hero(s, c.hero), t = card(p, c.card); assert(h.talentChoices.length && t.kind === 'talent' && t.classId === character(p, h.id).classId && t.level <= h.talentChoices[0] && !h.talents.includes(t.id), 'Talent nije dostupan.'); h.talents.push(t.id); h.talentChoices.shift(); break; }
  case 'attacker': assert(s.phase === 'combat' && s.battle, 'Nema borbe.'); chooseAttacker(p, s, c.hero); break;
  case 'ability': activate(p, s, c.hero, c.card, c.ability, c.args); if (s.battle?.stage === 'wounds' && !s.respawns.length) continueWounds(p, s); break;
  case 'roll': assert(s.battle?.stage === 'pool', 'Nije vrijeme za bacanje.'); omitDice(s, c.omit); enforceDicePenalties(s); break;
  case 'penalty': assert(s.battle, 'Nema borbe.'); removePenalty(s, c.dice); break;
  case 'reroll': assert(s.battle, 'Nema borbe.'); reroll(p, s, c.dice); break;
  case 'monster': assert(s.battle, 'Nema borbe.'); monsterEffect(p, s, c.unequip); break;
  case 'tokens': assert(s.battle, 'Nema borbe.'); placeTokens(p, s, c.toAttrition); break;
  case 'armor': {
   const b = s.battle; assert(b && b.kind !== 'pve' && b.stage === 'defense' && !b.armorDone.includes(c.faction), 'Oklop je već raspoređen ili nije dostupan.');
   const own = b.boxes[c.faction], enemy = b.boxes[other(c.faction)];
   assert(integer(c.damage, 0, enemy.damage) && integer(c.defense, 0, enemy.defense) && c.damage + c.defense === Math.min(own.armor, enemy.damage + enemy.defense), 'Raspodijeli oklop na protivničke pogotke.');
   enemy.damage -= c.damage; enemy.defense -= c.defense; enemy.attrition = Math.max(0, enemy.attrition - own.armor); own.armor = 0; b.armorDone.push(c.faction); break;
  }
  case 'wound': assert(s.battle, 'Nema borbe.'); wound(p, s, c.hero, c.pet); break;
  case 'respawn': { assert(s.respawns.includes(c.hero) && respawnRegions(p, s, c.hero).includes(c.region), 'Odaberi početnu regiju ili najbliže groblje.'); defeat(p, s, c.hero, c.region); break; }
  case 'advance': {
   const b = s.battle; assert(b, 'Nema borbe.');
   if (c.targets) assert(b.kind === 'pve' && ['defense','resolution'].includes(b.stage), 'Odabir meta je dostupan samo pri razrješenju pogodaka.');
   if (b.stage === 'after-pool') b.stage = 'reroll'; else if (b.stage === 'reroll') b.stage = 'after-reroll'; else if (b.stage === 'defense') defense(p, s, c.targets); else if (b.stage === 'resolution') resolution(p, s, c.targets); else if (b.stage === 'round-end') nextRound(s); else assert(false, 'Potreban je izbor prije nastavka.'); break;
  }
  case 'loot': {
   const b = s.battle; assert(b && b.stage === 'over' && b.kind === 'pvp' && b.winner !== 'draw' && faction(p, c.hero) === b.winner && !b.defeated.includes(c.hero) && b.participants.includes(c.hero) && b.defeated.includes(c.from) && faction(p, c.from) !== b.winner && !b.report.includes(`looted:${c.from}`), 'Plijen nije dostupan.');
   const from = hero(s, c.from); assert(from.bag.includes(c.card) && !card(p, c.card).soulbound, 'Ovaj predmet nije moguće uzeti.'); receiveItem(p, s, hero(s, c.hero), c.card, c.discard); from.bag.splice(from.bag.indexOf(c.card), 1); b.report.push(`looted:${c.from}`); break;
  }
  case 'closeBattle': {
   const b = s.battle; assert(b?.stage === 'over', 'Borba nije završena.');
   for (const id of b.participants) hero(s, id).stun = 0;
   if (s.winner) { s.phase = 'finished'; note(s, s.winner === 'draw' ? 'Partija završava neriješeno.' : `${s.winner} pobjeđuje!`); break; }
   if (!nextQuestReward(p, s)) { delete s.battle; s.phase = 'actions'; s.tradeWindow = true; }
   break;
  }
  case 'reward': {
   const r = s.reward; assert(s.phase === 'reward' && r && r.eligible.includes(c.hero) && r.offered.includes(c.card), 'Nagrada nije dostupna.');
   receiveItem(p, s, hero(s, c.hero), c.card, c.discard);
   if (r.offeredDeck === 'special') s.itemDecks.special = s.itemDecks.special.filter(id => id !== c.card);
   else if (r.offeredDeck) s.itemDecks[r.offeredDeck].push(...r.offered.filter(id => id !== c.card));
   nextItem(s); finishRewards(p, s); break;
  }
  case 'quest': assert(s.phase === 'reward' && s.reward && !s.reward.offered.length, 'Prvo podijeli nagrade.'); replacement(p, s, c.tier); finishRewards(p, s); break;
  case 'bid': assert(s.phase === 'event', 'Aukcija nije aktivna.'); bid(p, s, c.hero, c.amount); break;
  default: assert(false, 'Nepoznata naredba.');
 }
 if (s.reward && !s.reward.offered.length && !s.reward.items.length && !s.reward.special.length && !s.reward.replacement && !s.heroes.some(h => h.talentChoices.length)) finishRewards(p, s);
 s.revision++; return s;
}
export { creatureRule };
