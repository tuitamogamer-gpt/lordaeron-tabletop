// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { decide } from '../src/ai/planner';
import { audio } from '../src/campaign/audio';
import { BOT_PATIENCE_MS, botCombatDelay, botsDecide, loadAuto, playerClaims, playerDecides, playerToAct, RESULT_HOLD_MS, saveAuto, turnKey, UNDO_GRACE_MS } from '../src/campaign/bot-turns';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command } from '../src/rules/model';
import { newSession } from '../src/rules/session';
import { view } from '../src/rules/view';

/**
 * The bots play on their own. Until 12. 11. 2026 they did nothing until the player found "Run AI", and with it off every
 * step of theirs waited for a click: "Bot move" for each reward and each choice, "Finish combat & continue" after their
 * fight, "Return to the map" after their new quest. What still waits for the player is his own: his characters act first
 * in their faction's turn, and a reward one of them may claim is his to give.
 */
const planner = vi.hoisted(() => ({ plan: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/ai/client', () => ({ PlannerClient: class { plan = planner.plan; dispose = planner.dispose; } }));

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall', SHAMAN = 'zowka-shattertusk', PALADIN = 'brandon-lightstone', ROSTER = DEFAULT_SETUP.roster;
const pass = (hero: string): Command => ({ type: 'travel', hero, path: [] });
/** A bot that passes when it may, and otherwise takes the first thing it is offered. */
const passing = async (_view: unknown, candidates: Command[]) => ({ command: candidates.find(c => c.type === 'travel' && !c.path.length) ?? candidates[0], reason: 'Nothing better to do.' });
beforeEach(() => {
 localStorage.clear(); planner.plan.mockReset(); planner.dispose.mockReset();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {}); vi.spyOn(audio, 'cue').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/** Seats a player at a campaign: he plays `human`, the bots the rest, and the bots play on their own unless `auto` says otherwise. */
function seat(human: string, commands: Command[] = [], { seed = DEFAULT_SETUP.seed, auto = 'on' as 'on' | 'off' | undefined, pace = 'off' } = {}) {
 localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, { ...DEFAULT_SETUP, seed }), commands }));
 localStorage.setItem('lordaeron-base-bots-v3', JSON.stringify(ROSTER.filter(id => id !== human)));
 localStorage.setItem('lordaeron-pace-v1', pace);
 if (auto) localStorage.setItem('lordaeron-bots-auto-v1', auto);
}
const saved = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];
/** The table as the player finds it. The clock is the test's from the start: the bots' first pause begins when the table appears. */
const open = async () => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await act(async () => { render(<Campaign />); }); };
/** Lets time pass a tenth of a second at a time, so that each step of the bots is drawn before the next is due. */
const wait = async (ms: number) => { for (let t = 0; t < ms; t += 100) await act(async () => { await vi.advanceTimersByTimeAsync(100); }); };

describe('whether the bots act by themselves', () => {
 it('is on from the start, is remembered, and is off in tests unless asked', () => {
  // The rest of the suite runs with the bots waiting, as it runs without announcements.
  expect(loadAuto()).toBe(false);
  saveAuto(true); expect(localStorage.getItem('lordaeron-bots-auto-v1')).toBe('on'); expect(loadAuto()).toBe(true);
  saveAuto(false); expect(localStorage.getItem('lordaeron-bots-auto-v1')).toBe('off'); expect(loadAuto()).toBe(false);
  localStorage.setItem('lordaeron-bots-auto-v1', 'nonsense'); expect(loadAuto()).toBe(false);
 });
 it('lets the player’s own characters act first in their faction’s turn', () => {
  let s = createGame(p, DEFAULT_SETUP);
  const mine = (controlled: string[]) => { const v = view(s, controlled); return playerToAct(p, v, legalActions(p, s).filter(c => !('hero' in c) || controlled.includes(c.hero)), controlled); };
  // The Horde begins: the warrior has both actions.
  expect(mine([WARRIOR])).toBe(true);
  s = apply(p, s, pass(WARRIOR));
  expect(mine([WARRIOR])).toBe(true);
  s = apply(p, s, pass(WARRIOR));
  // He is done: his allies may go.
  expect(mine([WARRIOR])).toBe(false);
  // The Alliance's player has nothing to do in the Horde's turn, and nobody waits for him.
  expect(mine([PALADIN])).toBe(false);
  // Outside the actions (equipment, an Event, a reward) nothing waits on this.
  for (const id of ROSTER.filter(id => faction(p, id) === 'horde' && id !== WARRIOR)) { s = apply(p, s, pass(id)); s = apply(p, s, pass(id)); }
  s = apply(p, s, { type: 'endActions' });
  expect(s.phase).toBe('management'); expect(mine([WARRIOR])).toBe(false);
  // A step that only a bot can take is not the player's to hold up, even while he has actions left.
  const fresh = createGame(p, DEFAULT_SETUP);
  expect(playerToAct(p, view(fresh, [WARRIOR]), [{ type: 'talent', hero: WARRIOR, card: 'x' }], [WARRIOR])).toBe(false);
  expect(turnKey(fresh)).toBe('1:1:horde'); expect(turnKey({ ...fresh, lap: 2, turn: 7, faction: 'alliance' })).toBe('2:7:alliance');
 });
 it('leaves a reward the player may claim to the player', () => {
  const claim: Command = { type: 'reward', hero: WARRIOR, card: 'x' };
  expect(playerClaims({ phase: 'reward' }, [claim])).toBe(true);
  expect(playerClaims({ phase: 'reward' }, [])).toBe(false);
  expect(playerClaims({ phase: 'reward' }, [{ type: 'quest', tier: 'green' }])).toBe(false);
  expect(playerClaims({ phase: 'actions' }, [claim])).toBe(false);
 });
 it('waits behind a decision dialog that is open for a choice of the player’s own', () => {
  // His talent after a level gained together, his bid, his revival, his answer to an Event: the bots' own follow his.
  for (const c of [{ type: 'reward', hero: WARRIOR, card: 'x' }, { type: 'talent', hero: WARRIOR, card: 'x' }, { type: 'bid', hero: WARRIOR, amount: 1 }, { type: 'respawn', hero: WARRIOR, region: 'brill' }, { type: 'event-choice', hero: WARRIOR, choice: { mode: 'skip' } }, { type: 'quest', tier: 'green' }] as Command[]) expect(playerDecides({ phase: 'actions' }, [c]), c.type).toBe(true);
  // A power he could use meanwhile is an offer, not a question: the bots do not wait on it. Nor do they inside a combat, which has its own order.
  expect(playerDecides({ phase: 'event' }, [{ type: 'ability', hero: WARRIOR, card: 'x', ability: 'y' }])).toBe(false);
  expect(playerDecides({ phase: 'actions' }, [pass(WARRIOR), { type: 'endActions' }])).toBe(false);
  expect(playerDecides({ phase: 'combat' }, [{ type: 'respawn', hero: WARRIOR, region: 'brill' }])).toBe(false);
  expect(playerDecides({ phase: 'reward' }, [])).toBe(false);
 });
 it('keeps the dialog of a decision that is only the bots’ away while they play by themselves', () => {
  const choice: Command = { type: 'talent', hero: WARRIOR, card: 'x' };
  expect(botsDecide(true, true, true, [])).toBe(true);
  // Paused bots: the dialog is how the player moves them on. A choice of his own: the dialog is his.
  expect(botsDecide(true, false, true, [])).toBe(false);
  expect(botsDecide(true, true, true, [choice])).toBe(false);
  expect(botsDecide(true, true, false, [])).toBe(false);
  expect(botsDecide(false, true, true, [])).toBe(false);
 });
 it('holds the result of the bots’ own fight before they close it, and step by step leaves it to the player', () => {
  const close: Command = { type: 'closeBattle' }, roll: Command = { type: 'roll' };
  expect(botCombatDelay([roll], 750, 1, false)).toBe(750);
  expect(botCombatDelay([close], 750, 1, false)).toBe(RESULT_HOLD_MS);
  expect(RESULT_HOLD_MS).toBeGreaterThanOrEqual(2500);
  expect(botCombatDelay([close], 750, 1.5, false)).toBe(RESULT_HOLD_MS * 1.5);
  // Spoils still to take: an ordinary step.
  expect(botCombatDelay([close, { type: 'loot', hero: WARRIOR, from: PALADIN, card: 'x' }], 750, 1, false)).toBe(750);
  expect(botCombatDelay([close], 750, 1, true)).toBeUndefined();
  expect(botCombatDelay([roll], 750, 1, true)).toBe(750);
 });
});

describe('the bots at the table', () => {
 it('wait while the player’s character has actions, and act without a click once he is done', async () => {
  seat(WARRIOR); planner.plan.mockImplementation(passing);
  await open();
  await wait(5000);
  expect(planner.plan).not.toHaveBeenCalled();
  expect(saved()).toEqual([]);
  // The player can let them go first; nothing asks him to run the AI.
  expect(screen.getByRole('button', { name: 'Allies first' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Run AI' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Pass 2 actions' }));
  expect(saved()).toEqual([pass(WARRIOR), pass(WARRIOR)]);
  expect(screen.getByText('Your AI allies are acting: 4 actions remaining.')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Pause AI' }).length).toBeGreaterThan(0);
  // Both allies use both actions by themselves, after the moment in which the pass can still be taken back.
  await wait(UNDO_GRACE_MS - 200);
  expect(saved()).toHaveLength(2);
  await wait(4000);
  const allies = ROSTER.filter(id => faction(p, id) === 'horde' && id !== WARRIOR);
  expect(saved().slice(2).map(c => c.type)).toEqual(['travel', 'travel', 'travel', 'travel']);
  expect(new Set(saved().slice(2).map(c => (c as { hero: string }).hero))).toEqual(new Set(allies));
  // The next step is the player's own, and waits for him.
  expect(screen.getByRole('button', { name: 'Manage equipment' })).toBeTruthy();
  const calls = planner.plan.mock.calls.length;
  await wait(5000);
  expect(planner.plan).toHaveBeenCalledTimes(calls);
 });
 it('leave the player the time to take his last action back', async () => {
  seat(WARRIOR, [pass(WARRIOR)]); planner.plan.mockImplementation(passing);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Pass' }));
  expect(saved()).toHaveLength(2);
  await wait(UNDO_GRACE_MS - 500);
  expect(planner.plan).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Undo pass/ }));
  expect(saved()).toHaveLength(1);
  // He has an action again: his allies wait for him as before.
  await wait(6000);
  expect(planner.plan).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Allies first' })).toBeTruthy();
 });
 it('go first when the player says so, for that turn', async () => {
  seat(WARRIOR); planner.plan.mockImplementation(passing);
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Allies first' }));
  await wait(4000);
  // The allies have acted while the warrior still has both actions.
  expect(saved().map(c => (c as { hero: string }).hero)).not.toContain(WARRIOR);
  expect(saved()).toHaveLength(4);
  expect(screen.getByRole('button', { name: 'Pass 2 actions' })).toBeTruthy();
 });
 it('play a faction that is all theirs without being asked', async () => {
  // The player's character is of the Alliance; the Horde begins.
  seat(PALADIN); planner.plan.mockImplementation(passing);
  await open();
  expect(screen.getByText('The AI is playing Horde’s turn')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Play AI turn/ })).toBeNull();
  await wait(12000);
  // Six actions, the end of the actions, three confirmations of equipment and the end of the turn: the Alliance is on.
  const done = saved();
  expect(done.filter(c => c.type === 'travel')).toHaveLength(6);
  expect(done.map(c => c.type)).toContain('endManagement');
  expect(screen.getByRole('button', { name: 'Pass 2 actions' })).toBeTruthy();
 });
 it('stay paused when the player pauses them, and the choice is kept', async () => {
  seat(WARRIOR, [pass(WARRIOR), pass(WARRIOR)]); planner.plan.mockImplementation(passing);
  await open();
  fireEvent.click(screen.getAllByRole('button', { name: 'Pause AI' }).at(-1)!);
  expect(localStorage.getItem('lordaeron-bots-auto-v1')).toBe('off');
  await wait(5000);
  expect(planner.plan).not.toHaveBeenCalled();
  expect(screen.getByText('Your AI allies have 4 actions left and wait for you to run them.')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: 'Run AI' }).at(-1)!);
  expect(localStorage.getItem('lordaeron-bots-auto-v1')).toBe('on');
  await wait(4000);
  expect(saved()).toHaveLength(6);
 });
});

describe('a decision that is only the bots’', () => {
 /** Passes and empty equipment for everyone until an Event card asks each character in turn for a choice (seed 7: Professions and Crafts). */
 function untilDecision() {
  let s = createGame(p, { ...DEFAULT_SETUP, seed: 7 }); const commands: Command[] = [];
  for (let guard = 0; guard < 2000 && !s.eventFlow?.steps.length; guard++) {
   const legal = legalActions(p, s), acting = s.heroes.find(h => faction(p, h.id) === s.faction && h.actions > 0);
   const c: Command = s.phase === 'actions' ? acting ? pass(acting.id) : { type: 'endActions' } : legal.find(c => c.type === 'endManagement') ?? legal.find(c => c.type === 'manage') ?? legal[0];
   s = apply(p, s, c); commands.push(c);
  }
  return { commands, deciding: s.eventFlow!.steps.map(step => step.hero) };
 }
 const dialog = () => screen.queryByRole('dialog', { name: 'Professions and Crafts' });
 it('is made by them without its dialog; the player’s own turn to choose opens it', async () => {
  const { commands, deciding } = untilDecision();
  // Two bots choose before the warrior does.
  expect(deciding.indexOf(WARRIOR)).toBe(2);
  seat(WARRIOR, commands, { seed: 7 }); planner.plan.mockImplementation(passing);
  await open();
  expect(dialog()).toBeNull();
  await wait(3000);
  expect(saved().slice(commands.length).map(c => (c as { hero: string }).hero)).toEqual(deciding.slice(0, 2));
  // Now it is the warrior's choice: the dialog is his, and the bots wait behind him.
  expect(dialog()).toBeTruthy();
  const calls = planner.plan.mock.calls.length;
  await wait(BOT_PATIENCE_MS + 2000);
  expect(planner.plan).toHaveBeenCalledTimes(calls);
  expect(saved()).toHaveLength(commands.length + 2);
 });
 it('shows its dialog after all when the bots take long over it', async () => {
  const { commands } = untilDecision();
  seat(WARRIOR, commands, { seed: 7 }); planner.plan.mockImplementation(() => new Promise(() => {}));
  await open();
  await wait(BOT_PATIENCE_MS - 100);
  expect(planner.plan).toHaveBeenCalledOnce();
  expect(dialog()).toBeNull();
  await wait(200);
  expect(dialog()!.textContent).toContain('An AI character is making this decision…');
 });
 it('waits in its dialog for a click while the bots are paused', async () => {
  const { commands } = untilDecision();
  seat(WARRIOR, commands, { seed: 7, auto: 'off' }); planner.plan.mockImplementation(passing);
  await open();
  expect(dialog()!.textContent).toContain('Another character makes this decision. Run their AI move.');
  await wait(5000);
  expect(planner.plan).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^Bot move/ }));
  await wait(100);
  expect(saved()).toHaveLength(commands.length + 1);
 });
});

describe('a quest reward', () => {
 /** Two Horde characters go to Brightwater Lake, defeat its Crusader and finish the quest: its reward lies on the table. */
 function untilReward(party: [string, string], before: Command[] = []) {
  let s = createGame(p, DEFAULT_SETUP); const commands: Command[] = [];
  const go = (c: Command) => { s = apply(p, s, c); commands.push(c); };
  before.forEach(go);
  for (const id of party) go({ type: 'travel', hero: id, path: ['brightwater'] });
  go(legalActions(p, s).find((c): c is Extract<Command, { type: 'challenge' }> => c.type === 'challenge' && c.hero === party[0] && c.allies.join() === party[1] && s.enemies.some(e => e.id === c.target && !!e.quest))!);
  for (let guard = 0; s.phase === 'combat' && guard < 400; guard++) { const legal = legalActions(p, s); go(decide(p, view(s), legal, 'balanced')?.command ?? legal[0]); }
  expect(s.phase).toBe('reward'); expect(s.reward!.offered).toHaveLength(2); expect(s.reward!.eligible).toEqual(party);
  return { commands, offered: s.reward!.offered.map(id => p.cards.find(c => c.id === id)!) };
 }
 const dialog = () => screen.queryByRole('dialog', { name: 'Party rewards' });
 const stage = () => screen.queryByRole('status', { name: 'What just happened at the table' });
 it('that the player’s character may claim waits for the player, and “Bot move” lets an ally take it', async () => {
  const { commands, offered } = untilReward([WARRIOR, MAGE]);
  seat(WARRIOR, commands); planner.plan.mockImplementation(passing);
  await open();
  expect(dialog()!.textContent).toContain('Your AI allies wait for your choice.');
  expect(screen.getByRole('button', { name: `Claim ${offered[0].name}` })).toBeTruthy();
  await wait(BOT_PATIENCE_MS + 3000);
  expect(planner.plan).not.toHaveBeenCalled();
  expect(saved()).toHaveLength(commands.length);
  fireEvent.click(screen.getByRole('button', { name: /^Bot move/ }));
  await wait(100);
  expect(saved().at(-1)).toMatchObject({ type: 'reward', hero: MAGE });
 });
 it('of the bots’ own party is taken without its dialog and shown as the card they took', async () => {
  const { commands, offered } = untilReward([MAGE, SHAMAN], [pass(WARRIOR), pass(WARRIOR)]);
  seat(WARRIOR, commands, { pace: 'normal' }); planner.plan.mockImplementation(passing);
  await open();
  expect(dialog()).toBeNull();
  await wait(700);
  const taken = saved().at(-1) as Extract<Command, { type: 'reward' }>, left = offered.find(c => c.id !== taken.card)!;
  expect(saved()).toHaveLength(commands.length + 1);
  expect(taken).toMatchObject({ type: 'reward' }); expect([MAGE, SHAMAN]).toContain(taken.hero);
  // The stage shows the card itself, who took it and what was left.
  const name = p.cards.find(c => c.id === taken.card)!.name;
  expect(stage()!.className).toContain('card');
  expect(stage()!.textContent).toContain(`takes ${name}`);
  expect(stage()!.textContent).toContain(`Also offered: ${left.name}, returned to its deck.`);
  expect(screen.getByRole('img', { name: new RegExp(`takes ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} card$`) })).toBeTruthy();
  expect(dialog()).toBeNull();
  // It moves on by itself, and the bots go on to what follows the reward.
  await wait(6000);
  expect(saved().length).toBeGreaterThan(commands.length + 1);
  expect(dialog()).toBeNull();
 });
});
