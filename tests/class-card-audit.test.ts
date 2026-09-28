import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, CLASS_CARDS } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { capacity, card, character, faction, hero } from '../src/rules/common';
import { abilityCommands, legalActions } from '../src/rules/legal';
import { equipped, fitsSlot, manage } from '../src/rules/inventory';
import { healthLoss } from '../src/rules/effects';
import { reachable } from '../src/rules/movement';
import type { Ability, Card, ClassId, Command, State } from '../src/rules/model';

function fixture(cls: ClassId) {
 const def = p.characters.find(c => c.classId === cls)!, roster = [def];
 for (const c of p.characters) if (!roster.some(r => r.classId === c.classId) && roster.filter(r => r.faction === c.faction).length < 2) roster.push(c);
 const s = createGame(p, { seed: 2005, roster: roster.map(c => c.id), overlord: 'kelthuzad' });
 const id = def.id, h = hero(s, id); s.faction = def.faction; h.level = 5; h.xp = 28; h.gold = 100;
 Object.assign(h, capacity(p, h));
 return { s, id };
}
function give(s: State, id: string, cardId: string) {
 const h = hero(s, id), c = card(p, cardId);
 if (c.kind === 'talent') { if (!h.talents.includes(c.id)) h.talents.push(c.id); return; }
 if (!h.learned.includes(c.id)) h.learned.push(c.id);
 const slot = character(p, id).slots.findIndex((area, i) => !h.slots[i].card && fitsSlot(p, h, c, area));
 expect(slot, `No slot for ${cardId}`).toBeGreaterThanOrEqual(0);
 const slots = structuredClone(h.slots);
 if (c.addon) slots[slot].addons.push(c.id); else slots[slot].card = c.id;
 h.energy = 30; manage(p, s, h, slots, []);
}
function start(s: State, id: string, group = false) {
 const ids = group ? s.heroes.filter(h => faction(p, h.id) === faction(p, id)).map(h => h.id) : [id];
 s.enemies = [{ id: 'audit-enemy', creature: 'murloc', color: 'blue', region: 'brill' }];
 beginBattle(s, 'pve', ids, ['audit-enemy'], faction(p, id), 'brill');
 return apply(p, s, { type: 'attacker', hero: id });
}
function actions(s: State, id: string, cardId: string, ability?: string) {
 return abilityCommands(p, s).filter((c): c is Extract<Command, { type: 'ability' }> => c.type === 'ability' && c.hero === id && c.card === cardId && (!ability || c.ability === ability)).filter(c => {
  try { apply(p, s, c); return true; } catch { return false; }
 });
}

describe('the complete class catalog is playable', () => {
 it.each(CLASS_CARDS.filter(c => c.kind === 'power'))('$id can be trained and equipped in a valid slot', c => {
  let { s, id } = fixture(c.classId!);
  const gold = hero(s, id).gold;
  s = apply(p, s, { type: 'train', hero: id, cards: [c.id] });
  expect(hero(s, id)).toMatchObject({ gold: gold - c.price, actions: 1, learned: [c.id] });
  expect(equipped(p, hero(s, id))).not.toContain(c.id);
  give(s, id, c.id);
  expect(equipped(p, hero(s, id))).toContain(c.id);
  if (c.petHealth) expect(hero(s, id).pets[c.id]).toBe(c.petHealth);
 });

 it.each(CLASS_CARDS.filter(c => c.kind === 'talent'))('$id can be selected at its level and cannot be selected twice', c => {
  const { s, id } = fixture(c.classId!); hero(s, id).talentChoices = [c.level];
  const next = apply(p, s, { type: 'talent', hero: id, card: c.id });
  expect(hero(next, id).talents).toEqual([c.id]); expect(hero(next, id).talentChoices).toEqual([]);
  const fighting = start(next, id, true);
  expect(fighting.battle?.stage).toBe('pool');
  hero(next, id).talentChoices = [5]; expect(() => apply(p, next, { type: 'talent', hero: id, card: c.id })).toThrow();
 });
});

// Expected gains are stated independently of the effect interpreter, including
// printed equipment displaced by a stance or form.
const poolGains: [string, Partial<Record<'red' | 'blue' | 'green' | 'reroll' | 'attrition' | 'threat', number>>, string?][] = [
 ['warrior-shield-discipline', { green: 2 }], ['warrior-battle-shout', { reroll: 1 }],
 ['warrior-berserker-stance', { red: -1, attrition: 2 }], ['warrior-shield-wall', { attrition: -2 }],
 ['warrior-defensive-stance', { red: -1, green: 2 }], ['warrior-improved-battleshout', { reroll: 1 }, 'warrior-battle-shout'],
 ['hunter-bear', { red: 1 }], ['hunter-aspect-of-the-hawk', { attrition: 2 }],
 ['hunter-aspect-of-the-monkey', { reroll: 2 }], ['hunter-white-tiger', { red: 2 }],
 ['hunter-trueshot', { threat: -1 }], ['hunter-lightning-reflexes', { green: 2 }], ['hunter-growl', { red: 2 }, 'hunter-bear'],
 ['druid-bear-form', { red: 1, green: 1 }], ['druid-cat-form', { red: 2 }], ['druid-mark-of-the-wild', { green: 1 }],
 ['druid-ferocity', { reroll: 1, attrition: 1 }, 'druid-cat-form'], ['druid-thick-hide', { green: 2 }, 'druid-bear-form'],
 ['paladin-seal-of-righteousness', { attrition: 1 }], ['paladin-devotion-aura', { green: 1 }],
 ['paladin-improved-devotion', { green: 1, reroll: 1 }, 'paladin-devotion-aura'], ['paladin-reckoning', { attrition: 2 }],
 ['paladin-mace-specialization', { red: 1, reroll: 1 }], ['paladin-holy-shock', { blue: 2, reroll: 2 }],
 ['priest-holy-nova', { red: 1, green: 1 }], ['priest-shadowform', { green: 4 }],
 ['priest-darkness', { attrition: 2 }, 'priest-shadowguard'],
 ['rogue-deadly-poison', { red: 2 }], ['rogue-stealth', { red: 1, blue: -1 }], ['rogue-dual-wield', { red: 2 }],
 ['rogue-improved-dual-wield', { red: 1, reroll: 2 }, 'rogue-dual-wield'],
 ['shaman-stoneskin-totem', { green: 2, reroll: 1 }], ['shaman-rockbiter-weapon', { red: 1, reroll: 1 }],
 ['shaman-improved-rockbiter', { red: 1 }, 'shaman-rockbiter-weapon'], ['shaman-stormstrike', { blue: 2 }],
 ['shaman-mana-tide-totem', { reroll: 1 }],
 ['warlock-demonic-embrace', { reroll: -1 }], ['warlock-siphon-life', { attrition: 1 }],
 ['warlock-succubus', { red: 3, reroll: 2 }], ['warlock-voidwalker', { red: 1, reroll: 1 }],
 ['warlock-imp', { blue: 1, green: 1 }], ['warlock-demon-armor', { green: 1, reroll: 1 }],
];
describe('passive powers and talents produce their printed combat gains', () => {
 it.each(poolGains)('%s changes the pool and combat values correctly', (cardId, expected, dependency) => {
  let { s, id } = fixture(card(p, cardId).classId!);
  if (dependency) give(s, id, dependency);
  const withCard = structuredClone(s); give(withCard, id, cardId);
  s = start(s, id); const next = start(withCard, id), before = s.battle!.active!, after = next.battle!.active!;
  const delta = { red: 0, blue: 0, green: 0, reroll: after.reroll - before.reroll, attrition: after.attrition - before.attrition, threat: after.threat - before.threat };
  for (const color of ['red', 'blue', 'green'] as const) delta[color] = after.dice.filter(d => d.color === color).length - before.dice.filter(d => d.color === color).length;
  expect(delta).toEqual({ red: 0, blue: 0, green: 0, reroll: 0, attrition: 0, threat: 0, ...expected });
 });
});

// Witness loadouts for prerequisites printed on the cards. Variants that differ
// only in the number of dice/tokens are represented by their smallest option.
const companions: Record<string, string[]> = {
 'druid-ferocious-bite': ['druid-cat-form'], 'druid-strength-of-the-wild': ['druid-bear-form'],
 'mage-piercing-ice': ['mage-frostbolt'], 'mage-shatter': ['mage-frostbolt'], 'mage-incinerate': ['mage-fireball'],
 'hunter-mend-pet': ['hunter-bear'], 'hunter-frenzy': ['hunter-bear'],
 'rogue-ambush': ['rogue-stealth', 'rogue-eviscerate'], 'rogue-cheap-shot': ['rogue-stealth', 'rogue-eviscerate'],
 'rogue-opportunity': ['rogue-stealth'], 'rogue-premeditation': ['rogue-eviscerate'],
 'rogue-sinister-strike': ['rogue-eviscerate'], 'rogue-backstab': ['rogue-eviscerate', 'rogue-improved-backstab'],
 'rogue-cold-blood': ['rogue-eviscerate'], 'priest-improved-pain': ['priest-shadow-word-pain'],
 'shaman-elemental-mastery': ['shaman-earth-shock'],
 'warlock-sacrifice': ['warlock-voidwalker'], 'warlock-soothing-kiss': ['warlock-succubus'],
 'warrior-revenge': ['warrior-defensive-stance'],
};
const manualGroups = CLASS_CARDS.flatMap(c => {
 const seen = new Set<string>();
 return c.abilities.filter(a => {
  if (a.automatic || a.judgement) return false;
  // An alternate option with a distinct condition is a separate path, e.g. Improved Backstab.
  const group = `${a.usageGroup ?? a.id}:${JSON.stringify(a.condition)}`;
  if (seen.has(group)) return false; seen.add(group); return true;
 }).map(a => ({ c, a, label: `${c.id}/${a.id}` }));
});
function witness(c: Card, a: Ability) {
 let { s, id } = fixture(c.classId!);
 for (const dep of companions[c.id] ?? []) give(s, id, dep);
 give(s, id, c.id);
 if (c.id === 'rogue-vanish') hero(s, id).learned.push('rogue-stealth');
 if (c.id === 'shaman-natures-swiftness') hero(s, id).learned.push('shaman-healing-wave');
 if (c.id === 'warlock-unholy-power') hero(s, id).learned.push('warlock-imp');
 s = start(s, id, true);
 const h = hero(s, id), b = s.battle!, attack = b.active!;
 h.energy = 30; h.health = Math.max(1, capacity(p, h).health - 4);
 attack.dice = (['red', 'blue', 'green'] as const).flatMap((color, i) => [8, 7, 5, 1].map((value, n) => ({ id: i * 4 + n, color, value, removed: false, spotted: false, rerolled: false })));
 if (c.id === 'hunter-lethal-shots') attack.dice = Array.from({ length: 7 }, (_, id) => ({ id, color: 'red', value: 5, removed: false, spotted: false, rerolled: false }));
 attack.reroll = 7; attack.attrition = 2;
 b.boxes[faction(p, id)] = { damage: 4, defense: 0, armor: 0, attrition: 4 };
 b.damageTaken = { [id]: 4 }; b.defenseLosses = { [id]: 4 };
 b.counters = { [c.id]: 4, 'rogue-eviscerate': 4 };
 // Record actual earlier activations where the card requires them.
 const primary = a.requires ?? (c.id === 'rogue-backstab' && a.id.startsWith('after-reroll') ? 'strike' : undefined);
 if (primary) {
  b.stage = c.abilities.find(v => v.id === primary)!.timing as typeof b.stage;
  const cmd = actions(s, id, c.id, primary)[0]; expect(cmd, `${c.id} primary`).toBeDefined(); s = apply(p, s, cmd);
 }
 if (c.id === 'mage-piercing-ice' || c.id === 'priest-improved-pain') {
  const dependency = companions[c.id][0]; s.battle!.stage = 'pool';
  s = apply(p, s, actions(s, id, dependency)[0]);
 }
 if (c.id === 'rogue-deadly-poison') {
  // Printed Rogue weapon is a Sword, so the add-on's weapon prerequisite is real.
  expect(equipped(p, hero(s, id)).some(id => ['Sword', 'Mace'].includes(card(p, id).trait ?? ''))).toBe(true);
 }
 if (a.timing === 'wound') {
  s.battle!.stage = 'wounds'; s.battle!.wounds[faction(p, id)] = 1;
  const victim = c.id === 'shaman-reincarnation' ? hero(s, id) : s.heroes.find(h => h.id !== id && faction(p, h.id) === faction(p, id))!;
  healthLoss(s, victim, a.reaction === 'defeat' ? victim.health : 1);
 } else s.battle!.stage = a.timing === 'round-start' ? 'attacker' : a.timing as typeof b.stage;
 if (a.timing === 'defense' || a.timing === 'round-end' || a.timing === 'round-start') delete s.battle!.active;
 return { s, id };
}

describe('every optional class ability has an executable command', () => {
 it.each(manualGroups)('$label has a legal activation and respects its use limit', ({ c, a }) => {
  const { s, id } = witness(c, a), available = actions(s, id, c.id, a.id);
  expect(available.length, `Unreachable ${c.id}/${a.id}`).toBeGreaterThan(0);
  const before = structuredClone(s), next = apply(p, s, available[0]);
  expect(s).toEqual(before); expect(next.revision).toBe(s.revision + 1);
  expect(actions(next, id, c.id, a.id)).toHaveLength(0);
  for (const h of next.heroes) for (const n of [h.health, h.energy, h.gold]) expect(n).toBeGreaterThanOrEqual(0);
  for (const color of ['red', 'blue', 'green']) expect(next.battle?.active?.dice.filter(d => !d.removed && d.color === color).length ?? 0).toBeLessThanOrEqual(7);
 });
});

describe('talents reach the same playable choices used by the UI and bots', () => {
 it('Nature’s Swiftness can equip Healing Wave into the Hood of Shadow slot', () => {
  let { s, id } = fixture('shaman'); give(s, id, 'shaman-natures-swiftness');
  const h = hero(s, id); h.learned.push('shaman-healing-wave'); h.auctionItems.push('auction-hood-of-shadow'); h.slots.push({ addons: [] });
  s = start(s, id);
  const cmd = legalActions(p, s).find(c => c.type === 'ability' && c.card === 'shaman-natures-swiftness' && c.args?.slot === 7);
  expect(cmd).toBeDefined(); const next = apply(p, s, cmd!);
  expect(hero(next, id).slots[7].card).toBe('shaman-healing-wave');
 });

 it('equipping a power during combat cannot duplicate a card already in another slot', () => {
  let { s, id } = fixture('shaman'); give(s, id, 'shaman-natures-swiftness'); give(s, id, 'shaman-healing-wave'); s = start(s, id);
  expect(() => apply(p, s, { type: 'ability', hero: id, card: 'shaman-natures-swiftness', ability: 'pool', args: { slot: 1 } })).toThrow();
 });

 it('Inner Focus offers an unaffordable instant power for free exactly once per combat', () => {
  let { s, id } = fixture('priest'); give(s, id, 'priest-inner-focus'); give(s, id, 'priest-smite');
  s = start(s, id); hero(s, id).energy = 0;
  const cmd = legalActions(p, s).find(c => c.type === 'ability' && c.card === 'priest-smite' && c.args?.free)!;
  expect(cmd).toBeDefined(); const next = apply(p, s, cmd);
  expect(hero(next, id).energy).toBe(0); expect(next.battle!.active!.dice.filter(d => d.color === 'blue')).toHaveLength(4);
  expect(next.battle!.once).toContain(`free:${id}`);
  next.battle!.current = {}; next.battle!.round++;
  expect(legalActions(p, next).some(c => c.type === 'ability' && c.card === 'priest-smite')).toBe(false);
 });

 it('Holy Specialization lets the player choose a different ally for its extra healing', () => {
  let { s, id } = fixture('priest'); give(s, id, 'priest-holy-specialization'); give(s, id, 'priest-lesser-heal');
  s = start(s, id, true); const ally = s.heroes.find(h => h.id !== id && faction(p, h.id) === faction(p, id))!;
  hero(s, id).health = 2; ally.level = 5; ally.health = 2; healthLoss(s, ally, 1);
  const cmd = legalActions(p, s).find(c => c.type === 'ability' && c.card === 'priest-lesser-heal' && c.args?.target === ally.id && c.args.secondaryTarget === id)!;
  expect(cmd).toBeDefined(); const next = apply(p, s, cmd);
  expect(hero(next, ally.id).health).toBe(3); expect(hero(next, id).health).toBe(4);
  expect(equipped(p, hero(next, id))).not.toContain('priest-lesser-heal');
 });

 it.each([
  ['warrior-heroic-strike', 'warrior-improved-heroic-strike', 'red', 1],
  ['mage-fireball', 'mage-impact', 'threat', -1],
  ['hunter-scorpid-sting', 'hunter-improved-sting', 'blue', 1],
  ['druid-moonfire', 'druid-moonfury', 'blue', 1],
  ['priest-smite', 'priest-improved-smite', 'blue', 1],
  ['rogue-sinister-strike', 'rogue-improved-sinister-strike', 'red', 1],
  ['shaman-chain-lightning', 'shaman-call-of-thunder', 'blue', 1],
  ['warlock-shadow-bolt', 'warlock-improved-shadow-bolt', 'blue', 1],
 ] as const)('%s receives the effect of %s', (power, talent, stat, amount) => {
  let { s, id } = fixture(card(p, power).classId!); give(s, id, power); s = start(s, id);
  const enhanced = structuredClone(s); give(enhanced, id, talent);
  let normal = apply(p, s, actions(s, id, power)[0]), improved = apply(p, enhanced, actions(enhanced, id, power)[0]);
  if (stat === 'threat') {
   for (const cmd of [{ type: 'roll' }, { type: 'advance' }, { type: 'advance' }] as Command[]) { normal = apply(p, normal, cmd); improved = apply(p, improved, cmd); }
   expect(improved.battle!.active!.threat - normal.battle!.active!.threat).toBe(amount);
  } else expect(improved.battle!.active!.dice.filter(d => d.color === stat).length - normal.battle!.active!.dice.filter(d => d.color === stat).length).toBe(amount);
 });
});

describe('spells outside combat preserve the faction action economy', () => {
 it('Teleport crosses blue creatures, charges for each region, and consumes one action', () => {
  const { s, id } = fixture('mage'); give(s, id, 'mage-teleport');
  s.enemies = []; const path = Object.values(reachable(p, s, hero(s, id), 3)).find(path => path.length === 3)!;
  expect(path).toBeDefined(); s.enemies.push({ id: 'roadblock', creature: 'murloc', color: 'blue', region: path[0] });
  const energy = hero(s, id).energy;
  const next = apply(p, s, { type: 'travel', hero: id, path, power: 'mage-teleport' });
  expect(hero(next, id)).toMatchObject({ energy: energy - 3, actions: 1, location: path[2] });
  expect(next.faction).toBe(s.faction);
 });

 it('Prayer of Healing restores only colocated allies, pays discounts and consumes one action', () => {
  const { s, id } = fixture('priest'); give(s, id, 'priest-prayer-of-healing'); give(s, id, 'priest-improved-healing'); give(s, id, 'priest-mental-agility');
  s.heroes.forEach(h => { h.health = 1; }); const energy = hero(s, id).energy;
  const next = apply(p, s, { type: 'power-action', hero: id, card: 'priest-prayer-of-healing' });
  for (const h of next.heroes) expect(h.health).toBe(faction(p, h.id) === s.faction ? capacity(p, h).health : 1);
  expect(hero(next, id)).toMatchObject({ energy: energy - 2, actions: 1 });
  expect(equipped(p, hero(next, id))).not.toContain('priest-prayer-of-healing');
 });

 it.each(['mage-portal', 'warlock-ritual-of-summoning', 'paladin-lay-on-hands'])('%s is preparatory and locks the next action to its caster', power => {
  const { s, id } = fixture(card(p, power).classId!); give(s, id, power);
  const own = s.heroes.filter(h => faction(p, h.id) === s.faction), ally = own.find(h => h.id !== id)!;
  const start = hero(s, id).location; hero(s, id).location = 'andorhal'; ally.location = power === 'mage-portal' ? 'andorhal' : start;
  hero(s, id).health = 1; s.enemies = [];
  const cmd: Command = power === 'mage-portal' ? { type: 'portal', hero: id, allies: [ally.id] }
   : power === 'warlock-ritual-of-summoning' ? { type: 'summon', hero: id, target: ally.id }
   : { type: 'power-action', hero: id, card: power };
  const next = apply(p, s, cmd);
  expect(next.pendingPortal).toBe(id); expect(hero(next, id).actions).toBe(2); expect(next.faction).toBe(s.faction);
  expect(() => apply(p, next, { type: 'rest', hero: ally.id, health: 0 })).toThrow();
  expect(() => apply(p, next, cmd)).toThrow();
  if (power === 'mage-portal') expect(own.map(h => hero(next, h.id).location)).toEqual([start, start]);
  if (power === 'warlock-ritual-of-summoning') expect(hero(next, ally.id).location).toBe('andorhal');
  if (power === 'paladin-lay-on-hands') expect(hero(next, id).health).toBe(capacity(p, hero(next, id)).health);
  const done = apply(p, next, { type: 'rest', hero: id, health: 0 });
  expect(hero(done, id).actions).toBe(1); expect(done.pendingPortal).toBeUndefined();
 });

 it.each(['hunter-aspect-of-the-cheetah', 'shaman-ghost-wolf'])('%s permits three travel steps once before unequipping', power => {
  const { s, id } = fixture(card(p, power).classId!); give(s, id, power); s.enemies = [];
  const path = Object.values(reachable(p, s, hero(s, id), 3)).find(path => path.length === 3)!;
  const next = apply(p, s, { type: 'travel', hero: id, path, power });
  expect(hero(next, id).location).toBe(path[2]); expect(hero(next, id).actions).toBe(1);
  expect(equipped(p, hero(next, id))).not.toContain(power);
  expect(() => apply(p, next, { type: 'travel', hero: id, path: [...path].reverse(), power })).toThrow();
 });
});

describe('repeated powers and conditional enhancements', () => {
 it.each([
  ['druid-moonfire', 'druid-natures-grace', 'pool', 2, 2],
  ['warlock-shadow-bolt', 'warlock-nightfall', 'pool', 0, 0],
  ['mage-fireball', 'mage-arcane-power', 'pool', 1, 2],
  ['shaman-chain-lightning', 'shaman-natures-swiftness', 'pool', 2, 2],
 ] as const)('%s can repeat exactly twice with %s and pays each use correctly', (power, talent, ability, first, second) => {
  let { s, id } = fixture(card(p, power).classId!); give(s, id, power); give(s, id, talent); s = start(s, id);
  hero(s, id).energy = 10;
  const once = apply(p, s, { type: 'ability', hero: id, card: power, ability });
  const twice = apply(p, once, { type: 'ability', hero: id, card: power, ability });
  expect(hero(once, id).energy).toBe(10 - first); expect(hero(twice, id).energy).toBe(10 - first - second);
  expect(() => apply(p, twice, { type: 'ability', hero: id, card: power, ability })).toThrow();
 });

 it('Ruthlessness lowers the combo Spot threshold and Seal Fate doubles the tokens', () => {
  let { s, id } = fixture('rogue');
  for (const c of ['rogue-ruthlessness', 'rogue-seal-fate', 'rogue-sinister-strike', 'rogue-eviscerate']) give(s, id, c);
  s = start(s, id); s = apply(p, s, actions(s, id, 'rogue-sinister-strike', 'pool')[0]);
  s.battle!.stage = 'after-reroll'; s.battle!.active!.dice = [{ id: 0, color: 'red', value: 4, removed: false, spotted: false, rerolled: false }];
  const next = apply(p, s, actions(s, id, 'rogue-sinister-strike', 'after-reroll-1')[0]);
  expect(next.battle!.counters?.['rogue-eviscerate']).toBe(2); expect(next.battle!.active!.dice[0].spotted).toBe(true);
 });

 it('Nature’s Grace retains Rejuvenation only on its first use in the combat', () => {
  let { s, id } = fixture('druid'); give(s, id, 'druid-natures-grace'); give(s, id, 'druid-rejuvenation'); s = start(s, id);
  healthLoss(s, hero(s, id), 1); s = apply(p, s, actions(s, id, 'druid-rejuvenation')[0]);
  expect(equipped(p, hero(s, id))).toContain('druid-rejuvenation');
  s.battle!.current = {}; s.battle!.round++;
  healthLoss(s, hero(s, id), 1); s = apply(p, s, actions(s, id, 'druid-rejuvenation')[0]);
  expect(equipped(p, hero(s, id))).not.toContain('druid-rejuvenation');
 });
});
