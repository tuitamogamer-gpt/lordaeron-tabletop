// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { beginBattle } from '../src/rules/combat';
import { startRewards } from '../src/rules/reward-engine';
import { legalActions } from '../src/rules/legal';
import { view } from '../src/rules/view';
import { botOwns, decisionOwners } from '../src/multiplayer/ownership';
import { commandSchema } from '../src/multiplayer/protocol';
import { decide } from '../src/ai/planner';
import WorldDecision from '../src/campaign/WorldDecision';

afterEach(cleanup);
const skip = { type: 'skip-quest' } as const;
function exhausted() {
 const state = createGame(p, DEFAULT_SETUP), hero = state.heroes[0];
 state.quests = []; state.enemies = [];
 beginBattle(state, 'pve', [hero.id], [], 'horde', hero.location);
 state.battle!.stage = 'over'; state.battle!.winner = 'horde'; state.phase = 'reward';
 const reward = { xp: 0, gold: 0, items: [] };
 startRewards(p, state, [hero.id], [hero.id], reward, { ...p.quests.find(q => q.faction === 'horde')!, reward });
 for (const tier of ['green', 'yellow', 'red'] as const) state.questDecks.horde[tier] = [];
 return state;
}

describe('exhausted replacement quest decks', () => {
 it('continues after rewards without duplicating loot, drawing grey quests or recycling completed cards', () => {
  const state = exhausted(), before = structuredClone(state);
  state.questDecks.horde.grey = [p.quests.find(q => q.faction === 'horde' && q.tier === 'grey')!.id];
  expect(legalActions(p, state)).toContainEqual(skip);
  expect(legalActions(p, state).some(c => c.type === 'quest')).toBe(false);
  const next = apply(p, state, skip);
  expect(next.phase).toBe('actions'); expect(next.reward).toBeUndefined(); expect(next.battle).toBeUndefined();
  expect(next.heroes).toEqual(before.heroes); expect(next.quests).toEqual(before.quests); expect(next.completed).toEqual(before.completed);
  expect(next.questDecks).toEqual(state.questDecks);
  expect(next.log.at(-1)?.text).toContain('No replacement quests remain');
  expect(state.reward!.replacement).toBe(true);
  expect(() => apply(p, next, skip)).toThrow('No quest to replace');
 });

 it.each(['green', 'yellow', 'red'] as const)('rejects skipping while the %s deck still contains a card', tier => {
  const state = exhausted(); state.questDecks.horde[tier] = [p.quests.find(q => q.faction === 'horde' && q.tier === tier)!.id];
  const before = structuredClone(state);
  expect(legalActions(p, state)).not.toContainEqual(skip);
  expect(() => apply(p, state, skip)).toThrow('still available');
  expect(state).toEqual(before);
 });

 it.each(['offered', 'items', 'special', 'extraItems', 'relic'] as const)('requires resolving %s before continuing', field => {
  const state = exhausted(), reward = state.reward!;
  if (field === 'items') reward.items = [{ deck: 'triangle', draw: 1 }];
  else if (field === 'relic') reward.relic = 'pending-relic';
  else reward[field] = ['pending-card'];
  const before = structuredClone(state);
  expect(() => apply(p, state, skip)).toThrow('Distribute rewards first');
  expect(state).toEqual(before);
 });

 it('waits for pending talents and cannot skip outside the reward phase', () => {
  const state = exhausted(); state.heroes[0].talentChoices = [2];
  expect(() => apply(p, state, skip)).toThrow('Choose a talent');
  state.heroes[0].talentChoices = []; state.phase = 'actions';
  expect(() => apply(p, state, skip)).toThrow('No quest to replace');
 });

 it('checks and assigns control to the replacement faction for a stolen quest', () => {
  const state = exhausted(); state.reward!.replacementFaction = 'alliance';
  expect(() => apply(p, state, skip)).toThrow('still available');
  for (const tier of ['green', 'yellow', 'red'] as const) state.questDecks.alliance[tier] = [];
  const alliance = state.heroes.filter(h => state.factions![h.id] === 'alliance').map(h => h.id);
  expect(decisionOwners(p, state, skip)).toEqual(alliance);
  expect(botOwns(p, state, skip, [state.heroes[0].id])).toBe(false);
  expect(botOwns(p, state, skip, alliance)).toBe(true);
  expect(apply(p, state, skip).phase).toBe('actions');
 });

 it('lets the faction continue even if no reward recipient survived, and gives AI a valid move', () => {
  const state = exhausted(); state.reward!.eligible = [];
  const faction = state.heroes.filter(h => state.factions![h.id] === 'horde').map(h => h.id);
  expect(decisionOwners(p, state, skip)).toEqual(faction);
  expect(commandSchema.parse(skip)).toEqual(skip);
  expect(decide(p, view(state), legalActions(p, state))?.command).toEqual(skip);
 });

 it('explains the empty decks and provides the human continuation control', () => {
  const state = exhausted(), send = vi.fn();
  render(<WorldDecision state={view(state)} legal={legalActions(p, state)} send={send} inspect={() => {}} botStep={() => {}} botReady={false} auto={false} toggleBots={() => {}}/>);
  expect(screen.getByText('No quests left to draw')).toBeTruthy();
  expect(screen.getByText(/green, yellow and red quest decks for this faction are empty/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Continue without a replacement quest' }));
  expect(send).toHaveBeenCalledExactlyOnceWith(skip);
  expect(screen.queryByText(/Another character makes this decision/)).toBeNull();
 });
});
