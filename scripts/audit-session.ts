import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { BASE_PACK as pack } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { importSession } from '../src/rules/session';
import { bagSize } from '../src/rules/inventory';
import { character } from '../src/rules/common';
import type { State } from '../src/rules/model';

// Audit an actual exported playthrough. This never generates gameplay commands.
const input = process.argv[2];
assert(input, 'Usage: npx tsx scripts/audit-session.ts <export.json> [report.json]');
const { session, state: replayed } = importSession(pack, readFileSync(input, 'utf8'));
let state = createGame(pack, session.setup);
const types: Record<string, number> = {};
const phases = new Set<string>();
const stages = new Set<string>();
const turns: { turn: number; faction: string; command: number; heroes: unknown[] }[] = [];
const combats: unknown[] = [];
const events = new Set<string>();
let checks = 0;
function check(s: State) {
  checks++;
  assert(s.turn >= 1 && s.turn <= 30);
  assert.equal(new Set(s.heroes.map(h => character(pack, h.id).classId)).size, s.heroes.length);
  for (const h of s.heroes) {
    for (const n of [h.health, h.energy, h.gold, h.xp, h.actions, h.curse, h.stun]) assert(Number.isInteger(n) && n >= 0, `Invalid resource: ${h.id}`);
    assert(h.actions <= 2, `Too many actions: ${h.id}`);
    assert(h.level >= 1 && h.level <= 5 && h.xp >= pack.xp[h.level - 1]);
    assert(bagSize(pack, h.bag) <= 3, `Bag over capacity: ${h.id}`);
    assert(h.slots.length >= 7 && h.slots.length <= 8);
    assert.equal(new Set(h.learned).size, h.learned.length);
    assert.equal(new Set(h.talents).size, h.talents.length);
    for (const id of h.learned) assert(pack.cards.some(c => c.id === id && c.kind === 'power' && c.classId === character(pack, h.id).classId && c.level <= h.level));
    for (const id of h.talents) assert(pack.cards.some(c => c.id === id && c.kind === 'talent' && c.classId === character(pack, h.id).classId && c.level <= h.level));
    for (const n of Object.values(h.pets)) assert(Number.isInteger(n) && n >= 0);
  }
  const battle = s.battle;
  if (s.phase === 'combat' && battle) {
    stages.add(battle.stage);
    for (const box of Object.values(battle.boxes)) for (const n of Object.values(box)) assert(Number.isInteger(n) && n >= 0);
    for (const die of battle.active?.dice ?? []) assert(Number.isInteger(die.value) && die.value >= 0 && die.value <= 8);
    for (const color of ['red', 'blue', 'green'] as const) {
      const available: number = (battle.active?.dice ?? []).filter(d => !d.removed && d.color === color).length;
      assert(available + battle.lostDice[color] <= 7, `Physical ${color} dice supply exceeded`);
    }
  }
  phases.add(s.phase);
  s.eventDiscard.forEach(id => events.add(id));
}
check(state);
for (const [index, command] of session.commands.entries()) {
  const before = state;
  state = apply(pack, before, command);
  assert.equal(state.revision, before.revision + 1);
  types[command.type] = (types[command.type] ?? 0) + 1;
  if (['travel', 'rest', 'train', 'town'].includes(command.type) && 'hero' in command) {
    assert.equal(state.heroes.find(h => h.id === command.hero)!.actions, before.heroes.find(h => h.id === command.hero)!.actions - 1);
  }
  if (command.type === 'challenge') for (const id of [command.hero, ...command.allies]) {
    assert.equal(state.heroes.find(h => h.id === id)!.actions, before.heroes.find(h => h.id === id)!.actions - 1);
  }
  if (command.type === 'closeBattle') combats.push({ command: index + 1, turn: before.turn, kind: before.battle?.kind, first: before.battle?.first, boss: before.battle?.boss, region: before.battle?.region, rounds: before.battle?.round, winner: before.battle?.winner, defeated: before.battle?.defeated });
  if (before.turn !== state.turn || index === 0) turns.push({ turn: state.turn, faction: state.faction, command: index + 1, heroes: state.heroes.map(h => ({ id: h.id, level: h.level, xp: h.xp, health: h.health, energy: h.energy, gold: h.gold, actions: h.actions, location: h.location })) });
  check(state);
}
assert.deepEqual(state, replayed, 'The independently applied command log diverged from strict import');
assert.equal(state.phase, 'finished', 'The exported campaign has not finished');
const report = { input, setup: session.setup, commands: session.commands.length, checkedStates: checks, replayIdentical: true, phase: state.phase, turn: state.turn, winner: state.winner, quests: state.completed.map(id => ({ id, name: pack.quests.find(q => q.id === id)?.name, faction: pack.quests.find(q => q.id === id)?.faction })), events: [...events].map(id => ({ id, name: pack.events.find(e => e.id === id)?.name })), phases: [...phases], combatStages: [...stages], types, heroes: state.heroes, combats, turns };
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ commands: report.commands, checkedStates: checks, replayIdentical: true, phase: state.phase, turn: state.turn, winner: state.winner, quests: state.completed.length, combats: combats.length, events: events.size, types, phases: report.phases, combatStages: report.combatStages }, null, 2));
