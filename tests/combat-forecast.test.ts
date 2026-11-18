import { describe, expect, it } from 'vitest';
import { carryWords, effectWords, forecastLines, forecastNote, forecastSentence, roundForecast, versus } from '../src/campaign/combat-forecast';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { hero } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall';
type Color = 'green' | 'red' | 'blue';
/** Two Horde characters against creatures of one type, or against a boss; nobody has attacked yet. */
function fight(creature: string, colors: Color[] = ['green'], change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP);
 change(s);
 s.enemies = colors.map((color, i) => ({ id: `enemy-${i}`, creature, color, region: 'brill' }));
 beginBattle(s, 'pve', [WARRIOR, MAGE], s.enemies.map(e => e.id), 'horde', 'brill');
 return s;
}
function bossFight(boss: string, change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP);
 change(s);
 beginBattle(s, 'pve', [WARRIOR, MAGE], [], 'horde', 'brill', boss);
 return s;
}
const boxes = (s: State, damage: number, defense: number, armor: number, attrition: number, stage: State['battle'] extends infer B ? B extends { stage: infer S } ? S : never : never = 'defense') => {
 s.battle!.boxes.horde = { damage, defense, armor, attrition }; s.battle!.stage = stage; return s;
};
const lines = (s: State) => forecastLines(roundForecast(p, view(s))!).map(line => `${line.label}: ${line.sum} = ${line.result}`);

/**
 * Plays a fight to its end without powers or rerolls: the first legal step each time, wounds to whoever has most Health.
 * `seen` gets every step with the state before and after it.
 */
function play(s: State, seen: (before: State, command: Command, after: State) => void, limit = 600) {
 for (let i = 0; i < limit && s.phase === 'combat' && s.battle!.stage !== 'over'; i++) {
  const legal = legalActions(p, s), b = s.battle!;
  const order = [
   ...legal.filter(c => c.type === 'respawn'),
   ...(b.stage === 'wounds' ? legal.filter((c): c is Extract<Command, { type: 'wound' }> => c.type === 'wound' && !c.pet).sort((a, z) => hero(s, z.hero).health - hero(s, a.hero).health) : []),
   ...legal.filter(c => ['attacker', 'roll', 'penalty', 'monster', 'tokens', 'advance'].includes(c.type)),
  ];
  let next: State | undefined, done: Command | undefined;
  for (const command of order) try { next = apply(p, s, command); done = command; break; } catch { /* Not legal after all: try the next. */ }
  if (!next || !done) break;
  seen(s, done, next); s = next;
 }
 return s;
}

describe('the round as it stands', () => {
 it('adds up what the rulebook’s Defense Phase does: Attack less hits and armor, then every hit against Health', () => {
  // A green Crusader: Threat 5, Attack 4, Health 3.
  const s = boxes(fight('crusader'), 0, 2, 1, 1), f = roundForecast(p, view(s))!;
  expect(f).toMatchObject({ attack: 4, blocked: 2, absorbed: 1, wounds: 1, damage: 3, health: 3, kills: 1, won: true, foe: 'Crusader', opponents: 1 });
  expect(lines(s)).toEqual(['Enemy attack: 4 attack − 2 hits − 1 armor = 1 wound', 'Party damage: 0 ranged + 2 melee + 1 attrition = 3 of 3 · falls']);
  expect(forecastSentence(f)).toBe('1 wound incoming · 3 of 3 damage: Crusader falls');
  // The rules themselves agree.
  const defended = apply(p, s, { type: 'advance' });
  expect(defended.battle).toMatchObject({ stage: 'wounds', wounds: { horde: 1 } });
  const resolved = apply(p, apply(p, defended, { type: 'wound', hero: WARRIOR }), { type: 'advance' });
  expect(resolved.battle).toMatchObject({ stage: 'over', winner: 'horde' });
 });
 it('lets the Ranged Strike fell an opponent before it attacks', () => {
  // Two green Murlocs: Attack 3, Health 2 each. Three ranged hits fell one of them: the other attacks alone.
  const s = boxes(fight('murloc', ['green', 'green']), 3, 0, 1, 0), f = roundForecast(p, view(s))!;
  expect(f).toMatchObject({ ranged: { kills: 1, won: false }, attack: 3, absorbed: 1, wounds: 2, strike: { ranged: 1, melee: 0, attrition: 0 }, damage: 1, health: 2, won: false, carried: 1 });
  expect(lines(s)).toEqual(['Ranged strike: 3 ranged strike first = 1 of 2 falls', 'Enemy attack: 3 attack − 1 armor = 2 wounds', 'Party damage: 1 ranged + 0 melee + 0 attrition = 1 of 2']);
  expect(carryWords(f)).toBe('1 damage token stays for the next round');
  const after = apply(p, s, { type: 'advance' });
  expect(after.battle!.enemies).toHaveLength(1);
  expect(after.battle!.wounds.horde).toBe(2);
 });
 it('ends the combat in the Ranged Strike when the damage is enough for everything', () => {
  const s = boxes(fight('murloc', ['green', 'green']), 4, 0, 0, 0), f = roundForecast(p, view(s))!;
  expect(f).toMatchObject({ ranged: { kills: 2, won: true }, wounds: 0, won: true });
  expect(lines(s)).toEqual(['Ranged strike: 4 ranged of 4 health = 2 × Murloc fall']);
  expect(forecastSentence(f)).toBe('Ranged strike: 4 damage, 2 × Murloc fall');
  expect(apply(p, s, { type: 'advance' }).battle).toMatchObject({ stage: 'over', winner: 'horde' });
 });
 it('names what the opponent’s rule takes from the damage that stays', () => {
  // A green Crusader's rule: at the end of each round one damage token is removed for each Crusader.
  const s = boxes(fight('crusader'), 0, 2, 0, 0), f = roundForecast(p, view(s))!;
  expect(f).toMatchObject({ damage: 2, health: 3, won: false, lost: 1, carried: 1 });
  expect(carryWords(f)).toBe('Crusader’s rule removes 1 damage token: 1 of 2 stays for the next round');
  const next = apply(p, apply(p, apply(p, apply(p, s, { type: 'advance' }), { type: 'wound', hero: WARRIOR }), { type: 'wound', hero: WARRIOR }), { type: 'advance' });
  expect(next.battle).toMatchObject({ stage: 'round-end', boxes: { horde: { damage: 1 } } });
  const over = roundForecast(p, view(next))!;
  expect(over).toMatchObject({ resolved: true, carried: 1 });
  expect(forecastSentence(over)).toBe('1 damage token stays for the next round');
  expect(lines(next)).toEqual(['Round over: 1 damage token stays for the next round = 1 of 3']);
 });
 it('keeps the wounds of a Damage step that is behind us, and counts those still to assign', () => {
  const s = apply(p, boxes(fight('crusader'), 0, 1, 0, 0), { type: 'advance' });
  expect(s.battle).toMatchObject({ stage: 'wounds', wounds: { horde: 3 } });
  expect(lines(s)[0]).toBe('Enemy attack: 4 attack − 1 hit = 3 wounds to assign');
  const one = apply(p, s, { type: 'wound', hero: WARRIOR });
  expect(lines(one)[0]).toBe('Enemy attack: 4 attack − 1 hit = 2 wounds to assign');
  expect(forecastSentence(roundForecast(p, view(one))!)).toBe('2 wounds to assign · 1 of 3 damage');
 });
 it('says whose dice it counts and who has still to roll', () => {
  let s = fight('crusader');
  expect(forecastNote(p, roundForecast(p, view(s))!)).toBe('Grumbaz and Sofeea still to attack');
  s = apply(p, apply(p, s, { type: 'attacker', hero: WARRIOR }), { type: 'roll' });
  const f = roundForecast(p, view(s))!;
  expect(f.rolling).toBe(WARRIOR);
  expect(forecastNote(p, f)).toBe('with Grumbaz’s dice as they lie · Sofeea still to attack');
  // His hits as they lie are the hits he then places.
  const hits = s.battle!.active!.dice.filter(d => d.value >= s.battle!.active!.threat);
  expect(f.boxes.defense).toBe(hits.filter(d => d.color === 'red').length);
  expect(f.boxes.armor).toBe(hits.filter(d => d.color === 'green').length);
 });
 it('leaves the game as it was', () => {
  const s = apply(p, apply(p, fight('murloc'), { type: 'attacker', hero: WARRIOR }), { type: 'roll' }), v = view(s), before = structuredClone(v);
  roundForecast(p, v);
  expect(v).toEqual(before);
 });
 it('has nothing to say outside a fight against creatures or a boss', () => {
  const s = createGame(p, DEFAULT_SETUP);
  expect(roundForecast(p, view(s))).toBeUndefined();
  const over = boxes(fight('murloc'), 9, 0, 0, 0);
  expect(roundForecast(p, view(apply(p, over, { type: 'advance' })))).toBeUndefined();
 });
});

describe('the opponent’s rule on the dice as they lie', () => {
 const rolled = (creature: string, values: [number, number, number], change?: (s: State) => void) => {
  const s = apply(p, apply(p, fight(creature, ['green'], change), { type: 'attacker', hero: WARRIOR }), { type: 'roll' });
  s.battle!.active!.dice.forEach((d, i) => { d.value = values[i]; });
  return s;
 };
 it('counts a Murloc’s bite before the button is pressed', () => {
  // The Warrior rolls two red dice and one green: a red 1 costs him one Health against Murlocs.
  const s = rolled('murloc', [1, 6, 6]), f = roundForecast(p, view(s))!;
  expect(f.effect).toMatchObject({ hero: WARRIOR, health: -1, falls: false });
  expect(effectWords(p, f.effect)).toBe('Grumbaz loses 1 health');
  const after = apply(p, apply(p, apply(p, s, { type: 'advance' }), { type: 'advance' }), { type: 'monster' });
  expect(hero(after, WARRIOR).health).toBe(hero(s, WARRIOR).health - 1);
 });
 it('warns when the rule would fell the attacker, and does not count his hits', () => {
  const s = rolled('ogre', [1, 2, 8], state => { hero(state, WARRIOR).health = 3; }), f = roundForecast(p, view(s))!;
  expect(f.effect).toMatchObject({ health: -3, falls: true });
  expect(effectWords(p, f.effect)).toBe('Grumbaz loses 3 health · Grumbaz falls unless healed');
  expect(f.boxes).toEqual({ damage: 0, defense: 0, armor: 0, attrition: 0 });
 });
 it('names Stun, Curse, lost energy and lost dice', () => {
  expect(effectWords(p, roundForecast(p, view(rolled('spider', [1, 2, 6])))!.effect)).toBe('Grumbaz takes 2 Stun tokens');
  expect(effectWords(p, roundForecast(p, view(rolled('wraith', [1, 6, 1])))!.effect)).toBe('Grumbaz takes 2 Curse tokens');
  // Charge has given the Warrior a second energy for this attack: two red 1s take both.
  expect(effectWords(p, roundForecast(p, view(rolled('gnoll', [1, 1, 6])))!.effect)).toBe('Grumbaz loses 2 energy');
  expect(effectWords(p, roundForecast(p, view(rolled('doomguard', [2, 8, 8])))!.effect)).toBe('Grumbaz loses 1 health and loses 1 die');
 });
 it('is silent when the dice give the rule nothing', () => {
  expect(roundForecast(p, view(rolled('murloc', [5, 6, 7])))!.effect).toBeUndefined();
  expect(effectWords(p, undefined)).toBe('');
 });
});

describe('the forecast and the rules engine', () => {
 const creatures = p.creatures.map(c => c.id), colors: Color[] = ['green', 'red', 'blue'];
 const cases: { name: string; make: () => State }[] = [
  ...creatures.flatMap(id => colors.map(color => ({ name: `${color} ${id}`, make: () => fight(id, [color]) }))),
  ...creatures.map(id => ({ name: `two green and a red ${id}`, make: () => fight(id, ['green', 'green', 'red']) })),
  ...p.overlords.map(o => ({ name: o.name, make: () => bossFight(o.id, s => { s.overlord.id = o.id; }) })),
  ...p.events.filter(e => e.boss).map(e => ({ name: e.name, make: () => bossFight(e.id) })),
 ];
 it('covers every creature, every Overlord and every event boss', () => {
  expect(creatures).toHaveLength(13);
  expect(cases.length).toBeGreaterThan(13 * 4 + 3);
 });
 it.each(cases)('says what the rules then do: $name', ({ make }) => {
  let checked = 0;
  for (const seed of [7, 1234, 99991]) {
   const start = make(); start.rng = seed;
   // Stronger characters: the fights last several rounds and wounds do not end them at once.
   for (const id of [WARRIOR, MAGE]) hero(start, id).health += 20;
   let pending: { hero: string; boxes: unknown } | undefined;
   play(start, (before, command, after) => {
    const b = before.battle!, side = b.first, f = roundForecast(p, view(before));
    expect(f, `${b.stage} has a forecast`).toBeDefined();
    const fell = (after.battle?.killed?.length ?? 0) - (b.killed?.length ?? 0), won = after.battle?.stage === 'over' && after.battle.winner === side;
    if (b.stage === 'defense' && command.type === 'advance') {
     checked++;
     expect(f!.ranged.won).toBe(won);
     if (!won) { expect(after.battle!.wounds[side]).toBe(f!.wounds); expect(fell).toBe(f!.ranged.kills); }
    }
    if (b.stage === 'resolution' && command.type === 'advance') {
     checked++;
     expect(f!.won).toBe(won);
     if (!won) { expect(after.battle!.boxes[side].damage).toBe(f!.carried); expect(fell).toBe(f!.kills); }
    }
    // The dice of an attack as they lie: what the rule then takes, and the tokens the attack leaves when it is over.
    if (b.stage === 'after-reroll' && command.type === 'monster' && f!.rolling) {
     const id = b.active!.heroId;
     expect(hero(after, id).health - hero(before, id).health).toBe(f!.effect?.health ?? 0);
     expect(hero(after, id).stun - hero(before, id).stun).toBe(f!.effect?.stun ?? 0);
     expect(hero(after, id).curse - hero(before, id).curse).toBe(f!.effect?.curse ?? 0);
     pending = { hero: id, boxes: f!.boxes };
    }
    if (pending && b.active?.heroId === pending.hero && after.battle?.active?.heroId !== pending.hero && after.battle?.stage !== 'over') {
     checked++;
     expect(after.battle!.boxes[side]).toEqual(pending.boxes);
     pending = undefined;
    }
   });
  }
  expect(checked).toBeGreaterThan(0);
 });
});

describe('a fight between the factions', () => {
 it('sets both Combat Areas side by side and says who is ahead in the Resolution step', () => {
  const s = createGame(p, DEFAULT_SETUP), alliance = s.heroes.find(h => p.characters.find(c => c.id === h.id)!.faction === 'alliance')!.id;
  beginBattle(s, 'pvp', [WARRIOR, alliance], [], 'horde', 'brill');
  s.battle!.boxes = { horde: { damage: 1, defense: 2, armor: 1, attrition: 1 }, alliance: { damage: 0, defense: 1, armor: 0, attrition: 0 } };
  // The Horde's armor is still to be used: nobody is ahead yet.
  expect(versus(view(s))).toMatchObject({ strike: { horde: 3, alliance: 1 }, armor: { horde: 1, alliance: 0 }, loser: undefined, wounds: 0 });
  expect(roundForecast(p, view(s))).toBeUndefined();
  s.battle!.boxes.horde.armor = 0;
  expect(versus(view(s))).toMatchObject({ armor: { horde: 0, alliance: 0 }, loser: 'alliance', wounds: 2 });
  s.battle!.boxes.alliance.defense = 3;
  expect(versus(view(s))).toMatchObject({ loser: undefined, wounds: 0 });
 });
 it('is not for a fight against creatures', () => {
  expect(versus(view(fight('murloc')))).toBeUndefined();
 });
});
