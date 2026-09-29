import assert from 'node:assert/strict';
import { character } from '../src/rules/common';
import { bagSize } from '../src/rules/inventory';
import { retainedFigures } from '../src/rules/world';
import type { ContentPack, State } from '../src/rules/model';

/** Shared by generated campaigns and independently replayed playthroughs. */
export function assertState(pack: ContentPack, s: State) {
 assert(Number.isInteger(s.turn) && s.turn >= 1 && s.turn <= 30, 'Invalid faction turn');
 assert.equal(new Set(s.heroes.map(h => character(pack, h.id).classId)).size, s.heroes.length, 'Duplicate hero class');
 assert.equal(new Set(s.enemies.map(e => e.id)).size, s.enemies.length, 'Duplicate creature figure ID');
 for (const c of pack.creatures) for (const color of ['red', 'blue', 'green'] as const) {
  assert(s.enemies.filter(e => e.creature === c.id && e.color === color).length + retainedFigures(s, c.id, color) <= c.stock[color], `Figure supply exceeded: ${c.id}/${color}`);
 }
 for (const h of s.heroes) {
  for (const n of [h.health, h.energy, h.gold, h.xp, h.actions, h.curse, h.stun]) assert(Number.isSafeInteger(n) && n >= 0, `Invalid resource: ${h.id}`);
  assert(h.actions <= 2, `Too many actions: ${h.id}`);
  assert(Number.isInteger(h.level) && h.level >= 1 && h.level <= 5 && h.xp >= pack.xp[h.level - 1] && h.xp <= pack.xp[4], `Invalid level/XP: ${h.id}`);
  assert(bagSize(pack, h.bag) <= 3, `Bag over capacity: ${h.id}`);
  assert(h.slots.length >= 7 && h.slots.length <= 8, `Invalid slots: ${h.id}`);
  assert.equal(new Set(h.learned).size, h.learned.length, `Duplicate learned power: ${h.id}`);
  assert.equal(new Set(h.talents).size, h.talents.length, `Duplicate talent: ${h.id}`);
  for (const id of h.learned) assert(pack.cards.some(c => c.id === id && c.kind === 'power' && c.classId === character(pack, h.id).classId && c.level <= h.level), `Invalid learned power: ${id}`);
  for (const id of h.talents) assert(pack.cards.some(c => c.id === id && c.kind === 'talent' && c.classId === character(pack, h.id).classId && c.level <= h.level), `Invalid talent: ${id}`);
  for (const n of Object.values(h.pets)) assert(Number.isSafeInteger(n) && n >= 0, `Invalid pet health: ${h.id}`);
 }
 const battle = s.battle;
 if (battle) {
  for (const box of Object.values(battle.boxes)) for (const n of Object.values(box)) assert(Number.isSafeInteger(n) && n >= 0, 'Invalid combat tokens');
  for (const die of battle.active?.dice ?? []) assert(Number.isInteger(die.value) && die.value >= 0 && die.value <= 8, 'Invalid D8 result');
  for (const color of ['red', 'blue', 'green'] as const) {
   const available: number = (battle.active?.dice ?? []).filter(d => !d.removed && d.color === color).length;
   assert(available + battle.lostDice[color] <= 7, `Physical ${color} dice supply exceeded`);
  }
 }
}
