import { isDeepStrictEqual } from 'node:util';
import { writeFileSync } from 'node:fs';
import { BASE_PACK as pack, DEFAULT_SETUP } from '../src/data/base';
import { capacity, faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { importSession, newSession } from '../src/rules/session';
import type { Command } from '../src/rules/model';
import { assertState } from './assert-state';

// A bounded, reproducible six-seat continuation check, including real event choices.
const setup = { ...DEFAULT_SETUP, variants: { overlordOnly: true, deadlyPvp: true } };
const session = newSession(pack, setup);
let state = createGame(pack, setup);
const send = (command: Command) => {
 state = apply(pack, state, command); assertState(pack, state); session.commands.push(command);
};
for (let turn = 0; turn < 32; turn++) {
 if (state.phase !== 'actions') throw new Error(`Unexpected phase ${state.phase}.`);
 const party = state.heroes.filter(h => faction(pack, h.id) === state.faction).map(h => h.id);
 for (let action = 0; action < 2; action++) for (const id of party) {
  const h = state.heroes.find(h => h.id === id)!;
  send({ type: 'rest', hero: id, health: Math.min(h.level * 3, capacity(pack, h).health - h.health) });
 }
 send({ type: 'endActions' });
 for (const id of party) send({ type: 'manage', hero: id, slots: state.heroes.find(h => h.id === id)!.slots, discard: [] });
 send({ type: 'endManagement' });
 for (let choice = 0; state.phase !== 'actions'; choice++) {
  if (choice > 100) throw new Error('Event resolution exceeded its bound.');
  const legal = legalActions(pack, state);
  const command = legal.find(c => c.type === 'event-choice' && c.choice.mode === 'skip')
   ?? legal.find(c => ['event-choice', 'bid', 'talent', 'respawn', 'reward', 'quest', 'claim-relic'].includes(c.type));
  if (!command) throw new Error(`No legal event continuation in ${state.phase}.`);
  send(command);
 }
}
if (state.turn !== 3 || state.lap !== 2 || state.faction !== 'horde' || state.battle || state.winner) throw new Error('Campaign did not continue beyond turn 30.');
const text = JSON.stringify(session);
if (!isDeepStrictEqual(importSession(pack, text).state, state)) throw new Error('Replay diverged.');
const output = 'docs/playtests/six-hero-continuation-2026-09-30.session.json';
writeFileSync(output, `${text}\n`);
process.stdout.write(`${JSON.stringify({ output, heroes: state.heroes.length, turnsPlayed: 32, commands: session.commands.length, turn: state.turn, lap: state.lap, phase: state.phase, events: state.eventDiscard.length, variants: state.variants, replay: true, invariants: true })}\n`);
