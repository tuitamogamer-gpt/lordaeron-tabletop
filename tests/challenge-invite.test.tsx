// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import ChallengeInvite from '../src/campaign/ChallengeInvite';
import { inviteKey, invitedPlayers, jointChallenges, type Challenge } from '../src/campaign/invitations';
import { createStrategy } from '../src/ai/strategy';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { botOwns } from '../src/multiplayer/ownership';
import { character } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import { newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import type { Command, State } from '../src/rules/model';

// The planner is replaced by a stand-in that wants the player's character along whenever it may ask.
const plan = vi.hoisted(() => vi.fn());
vi.mock('../src/ai/client', () => ({ AI_PLAN_TIMEOUT_MS: 90_000, PlannerClient: class { plan = plan; dispose() {} } }));

const [PLAYER, ALLY, THIRD] = DEFAULT_SETUP.roster, BOTS = DEFAULT_SETUP.roster.slice(1);
const first = (id: string) => character(p, id).name.split(' ')[0];
const joint = (c: Command): c is Challenge => c.type === 'challenge' && c.hero !== PLAYER && c.allies.includes(PLAYER);

/** The player's character and one bot ally travel to the same quest creature; each has one action left. */
function sideBySide() {
 let s = createGame(p, DEFAULT_SETUP); const commands: Command[] = [];
 const reachable = (id: string) => legalActions(p, s).filter((c): c is Extract<Command, { type: 'travel' }> => c.type === 'travel' && c.hero === id && !c.power && c.path.length > 0);
 const target = reachable(PLAYER).map(c => c.path.at(-1)!).find(region => s.enemies.some(e => e.region === region && e.faction === 'horde' && e.color !== 'blue') && !s.enemies.some(e => e.region === region && e.color === 'blue'))!;
 for (const id of [PLAYER, ALLY]) { const c = reachable(id).find(c => c.path.at(-1) === target)!; s = apply(p, s, c); commands.push(c); }
 return { s, commands, target };
}

beforeEach(() => {
 localStorage.clear(); plan.mockReset();
 vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
 HTMLElement.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn();
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('which challenges need the player’s consent', () => {
 it('finds the bots’ challenges that would bring the player’s character along', () => {
  const { s, target } = sideBySide(), legal = legalActions(p, s);
  expect(s.heroes.filter(h => h.location === target).map(h => [h.id, h.actions])).toEqual([[PLAYER, 1], [ALLY, 1]]);
  const asking = jointChallenges(s, legal, BOTS, new Set());
  expect(asking.length).toBeGreaterThan(0);
  for (const c of asking) { expect(c.hero).toBe(ALLY); expect(invitedPlayers(c, BOTS)).toEqual([PLAYER]); expect(botOwns(p, s, c, BOTS)).toBe(false); }
  // The bot's own challenges stay its own.
  expect(legal.some(c => c.type === 'challenge' && c.hero === ALLY && !c.allies.length && botOwns(p, s, c, BOTS))).toBe(true);
 });

 it('does not ask a character who declined again during the same faction turn', () => {
  const { s } = sideBySide(), legal = legalActions(p, s);
  expect(jointChallenges(s, legal, BOTS, new Set([inviteKey(s, PLAYER)]))).toEqual([]);
  expect(jointChallenges({ ...s, turn: s.turn + 2 }, legal, BOTS, new Set([inviteKey(s, PLAYER)])).length).toBeGreaterThan(0);
  expect(inviteKey({ lap: 2, turn: 3, faction: 'horde' }, PLAYER)).not.toBe(inviteKey({ turn: 3, faction: 'horde' }, PLAYER));
 });

 it('asks nobody outside the action phase or when every ally is a bot', () => {
  const { s } = sideBySide(), legal = legalActions(p, s);
  expect(jointChallenges({ ...s, phase: 'management' }, legal, BOTS, new Set())).toEqual([]);
  expect(jointChallenges(s, legal, DEFAULT_SETUP.roster, new Set())).toEqual([]);
 });
});

describe('the bots’ plans beside a player', () => {
 const partyOf = (s: State, bot: string, independent: string[]) => createStrategy(p, view(s, DEFAULT_SETUP.roster), 1, independent).plan(s.heroes.find(h => h.id === bot)!);

 it('count on the player’s character only where that character already stands', () => {
  const s = createGame(p, DEFAULT_SETUP);
  for (const bot of [ALLY, THIRD]) {
   const plan = partyOf(s, bot, [PLAYER]);
   expect(plan).toBeDefined();
   if (plan!.party.includes(PLAYER)) expect(s.heroes.find(h => h.id === PLAYER)!.location).toBe(plan!.objective.region);
  }
  // At the start nobody stands at an objective, so no bot's plan includes the player; without the knowledge, some do.
  expect([ALLY, THIRD].some(bot => partyOf(s, bot, [PLAYER])!.party.includes(PLAYER))).toBe(false);
  expect([ALLY, THIRD].some(bot => partyOf(s, bot, [])!.party.includes(PLAYER))).toBe(true);
 });

 it('may still fight beside the player where the player stands', () => {
  const { s, target } = sideBySide();
  const plan = partyOf(s, ALLY, [PLAYER])!;
  expect(plan.objective.region).toBe(target);
  expect(plan.party).toContain(PLAYER);
 });
});

describe('the invitation', () => {
 it('says who asks, whom to fight, what the advisor expects and what joining costs', () => {
  const { s, target } = sideBySide(), command = jointChallenges(s, legalActions(p, s), BOTS, new Set())[0], join = vi.fn(), decline = vi.fn();
  render(<ChallengeInvite state={view(s)} command={command} reason="About 2 rounds; low risk." bots={BOTS} onJoin={join} onDecline={decline} />);
  const text = document.body.textContent!;
  expect(text).toContain(`${first(ALLY)} is about to challenge`);
  expect(text).toContain(`in ${p.regions.find(r => r.id === target)!.name} and asks ${first(PLAYER)} to join the fight.`);
  expect(text).toContain('About 2 rounds; low risk.');
  expect(text).toContain(`Joining spends one action of ${first(PLAYER)} (1 action left).`);
  fireEvent.click(screen.getByRole('button', { name: 'Join the fight' }));
  fireEvent.click(screen.getByRole('button', { name: 'Not this time' }));
  expect([join.mock.calls.length, decline.mock.calls.length]).toEqual([1, 1]);
 });
});

describe('a bot beside the player’s character', () => {
 const open = () => {
  const { commands } = sideBySide();
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, DEFAULT_SETUP), commands }));
  localStorage.setItem('lordaeron-base-bots-v3', JSON.stringify(BOTS));
  render(<Campaign />);
  return commands.length;
 };
 const saved = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];
 const invitation = () => screen.findByRole('dialog', { name: 'An ally asks for help' }, { timeout: 8000 });

 it('asks before the fight and fights together when the player joins', async () => {
  plan.mockImplementation(async (_view: unknown, legal: Command[]) => { const command = legal.find(joint); return command && { command, reason: 'Together: low risk.', score: 1, alternatives: legal.length, considered: [] }; });
  const before = open();
  fireEvent.click(screen.getByRole('button', { name: /Run AI/ }));
  const dialog = await invitation();
  expect(saved()).toHaveLength(before);
  expect(dialog.textContent).toContain(`${first(ALLY)} is about to challenge`);
  expect(dialog.textContent).toContain('Together: low risk.');
  // The planner was told whom it does not steer.
  expect(plan.mock.calls[0][3]).toEqual({ independent: [PLAYER] });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Join the fight' }));
  await waitFor(() => expect(saved()).toHaveLength(before + 1));
  expect(saved().at(-1)).toMatchObject({ type: 'challenge', hero: ALLY, allies: [PLAYER] });
  expect(screen.queryByRole('dialog', { name: 'An ally asks for help' })).toBeNull();
 }, 30_000);

 it('lets the bot decide again without the player and does not ask twice in a turn', async () => {
  let asked = 0;
  plan.mockImplementation(async (_view: unknown, legal: Command[]) => {
   const command = legal.find(joint);
   if (command) { asked++; return { command, reason: 'Together: low risk.', score: 1, alternatives: legal.length, considered: [] }; }
   // Without the player: the ally passes, once.
   const pass = legal.find(c => c.type === 'travel' && c.hero === ALLY && !c.path.length);
   return pass && { command: pass, reason: 'Waiting.', score: 0, alternatives: legal.length, considered: [] };
  });
  const before = open();
  fireEvent.click(screen.getByRole('button', { name: /Run AI/ }));
  fireEvent.click(within(await invitation()).getByRole('button', { name: 'Not this time' }));
  await waitFor(() => expect(saved()).toHaveLength(before + 1));
  expect(saved().at(-1)).toMatchObject({ type: 'travel', hero: ALLY, path: [] });
  expect(asked).toBe(1);
  // Every later request of this turn leaves the player's character out.
  await waitFor(() => expect(plan.mock.calls.length).toBeGreaterThan(1));
  for (const [, legal] of plan.mock.calls.slice(1)) expect((legal as Command[]).some(joint)).toBe(false);
  expect(screen.queryByRole('dialog', { name: 'An ally asks for help' })).toBeNull();
 }, 30_000);

 it('treats closing the invitation as declining', async () => {
  plan.mockImplementation(async (_view: unknown, legal: Command[]) => { const command = legal.find(joint); return command && { command, reason: 'Together.', score: 1, alternatives: legal.length, considered: [] }; });
  const before = open();
  fireEvent.click(screen.getByRole('button', { name: /Run AI/ }));
  fireEvent.click(within(await invitation()).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(plan.mock.calls.length).toBeGreaterThan(1));
  expect((plan.mock.calls.at(-1)![1] as Command[]).some(joint)).toBe(false);
  expect(saved()).toHaveLength(before);
 }, 30_000);
});
