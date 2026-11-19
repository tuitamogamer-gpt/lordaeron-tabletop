// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { counsel } from '../src/ai/council';
import { partyOrders } from '../src/ai/orders';
import { audio } from '../src/campaign/audio';
import { UNDO_GRACE_MS } from '../src/campaign/bot-turns';
import PartyPlan from '../src/campaign/PartyPlan';
import { loadPartyPlan, ORDER_WORDS, savePartyPlan } from '../src/campaign/party-plan';
import { beats, thinking } from '../src/campaign/stage';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command } from '../src/rules/model';
import { newSession } from '../src/rules/session';
import { view } from '../src/rules/view';

/**
 * The party plan (19. 11. 2026). The request: "the AI often just follows me. Let us have a choice before each of our turns,
 * so that we can agree: you go alone, you go with me, or I go with you." And a bot's move now waits a moment, with the
 * table showing who is about to act, as a player looks at the board before he reaches for his figure.
 */
const planner = vi.hoisted(() => ({ plan: vi.fn(), counsel: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/ai/client', () => ({ PlannerClient: class { plan = planner.plan; counsel = planner.counsel; dispose = planner.dispose; } }));

const [WARRIOR, MAGE, SHAMAN] = DEFAULT_SETUP.roster, ROSTER = DEFAULT_SETUP.roster, BOTS = ROSTER.filter(id => id !== WARRIOR);
const pass = (hero: string): Command => ({ type: 'travel', hero, path: [] });
const passing = async (_view: unknown, candidates: Command[]) => ({ command: candidates.find(c => c.type === 'travel' && !c.path.length) ?? candidates[0], reason: 'Nothing better to do.' });
/** What the real planner says in council, so that the dialog is tested with the lines it will show. */
const said = async (v: Parameters<typeof counsel>[1], heroes: string[], difficulty: Parameters<typeof counsel>[3], options: Parameters<typeof counsel>[4]) => counsel(p, v, heroes, difficulty, options);
beforeEach(() => {
 localStorage.clear(); planner.plan.mockReset(); planner.counsel.mockReset(); planner.dispose.mockReset();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {}); vi.spyOn(audio, 'cue').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function seat(commands: Command[] = [], { pace = 'off', plan = { modes: {}, ask: true } as object | undefined, auto = 'on' } = {}) {
 localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, DEFAULT_SETUP), commands }));
 localStorage.setItem('lordaeron-base-bots-v3', JSON.stringify(BOTS));
 localStorage.setItem('lordaeron-pace-v1', pace); localStorage.setItem('lordaeron-bots-auto-v1', auto);
 if (plan) localStorage.setItem('lordaeron-party-plan-v1', JSON.stringify(plan));
}
const saved = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];
const open = async () => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await act(async () => { render(<Campaign />); }); };
const wait = async (ms: number) => { for (let t = 0; t < ms; t += 100) await act(async () => { await vi.advanceTimersByTimeAsync(100); }); };
const council = () => screen.queryByRole('dialog', { name: 'Party plan' });
const stage = () => screen.queryByRole('status', { name: 'What just happened at the table' });

describe('the plan that is kept', () => {
 it('is empty at first, is remembered, and is not asked for in tests unless they ask', () => {
  expect(loadPartyPlan()).toEqual({ modes: {}, ask: false });
  savePartyPlan({ modes: { [MAGE]: 'lead', [SHAMAN]: 'follow' }, ask: true });
  expect(loadPartyPlan()).toEqual({ modes: { [MAGE]: 'lead', [SHAMAN]: 'follow' }, ask: true });
  // A value from another version is dropped, not obeyed.
  localStorage.setItem('lordaeron-party-plan-v1', JSON.stringify({ modes: { [MAGE]: 'charge', [SHAMAN]: 'alone' }, ask: 'yes' }));
  expect(loadPartyPlan()).toEqual({ modes: { [SHAMAN]: 'alone' }, ask: false });
  localStorage.setItem('lordaeron-party-plan-v1', '{broken'); expect(loadPartyPlan()).toEqual({ modes: {}, ask: false });
 });
 it('has a name for each of the three agreements', () => {
  expect(Object.keys(ORDER_WORDS)).toEqual(['alone', 'follow', 'lead']);
  for (const words of Object.values(ORDER_WORDS)) { expect(words.label).toBeTruthy(); expect(words.short).toBeTruthy(); expect(words.note.length).toBeGreaterThan(30); }
 });
});

describe('the council', () => {
 const s = createGame(p, DEFAULT_SETUP), v = view(s, [WARRIOR]), orders = partyOrders(p, s.heroes, BOTS, { [MAGE]: 'lead' });
 const lines = counsel(p, view(s, BOTS), [MAGE, SHAMAN], 'balanced', { independent: [WARRIOR], orders });
 const show = (props: Partial<Parameters<typeof PartyPlan>[0]> = {}) => { const handlers = { onChoose: vi.fn(), onLook: vi.fn(), onAsk: vi.fn(), onPlay: vi.fn(), onAlliesFirst: vi.fn() }; render(<PartyPlan state={v} orders={orders} counsel={lines} ask holding {...handlers} {...props} />); return handlers; };

 it('lists each ally with what it would do alone, with the player, and leading him', () => {
  show();
  for (const id of [MAGE, SHAMAN]) {
   const group = screen.getByRole('radiogroup', { name: new RegExp(`Plan for ${p.characters.find(c => c.id === id)!.name.split(' ')[0]}`) });
   const options = within(group).getAllByRole('radio');
   expect(options.map(o => o.textContent)).toEqual([expect.stringContaining('Go your own way'), expect.stringContaining('Come with me'), expect.stringContaining('Lead, I follow')]);
   // Each option carries the planner's own line for that agreement.
   for (const mode of ['alone', 'follow', 'lead'] as const) expect(group.textContent).toContain(lines.find(c => c.hero === id)!.proposals.find(o => o.mode === mode)!.text);
  }
  // What is agreed is marked, and the ally's own wish is named.
  const mage = within(screen.getByRole('radiogroup', { name: /Plan for Sofeea/ })).getAllByRole('radio');
  expect(mage.map(o => o.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
  expect(screen.getAllByText(/suggests$/).length).toBe(2);
 });

 it('hands on the choice, one ally at a time or all at once', () => {
  const { onChoose, onPlay, onAlliesFirst, onAsk } = show();
  fireEvent.click(within(screen.getByRole('radiogroup', { name: /Plan for Zowka/ })).getByRole('radio', { name: /Come with me/ }));
  expect(onChoose).toHaveBeenLastCalledWith([SHAMAN], 'follow');
  fireEvent.click(screen.getByRole('button', { name: 'They lead' }));
  expect(onChoose).toHaveBeenLastCalledWith([MAGE, SHAMAN], 'lead');
  fireEvent.click(screen.getByRole('button', { name: 'All alone' }));
  expect(onChoose).toHaveBeenLastCalledWith([MAGE, SHAMAN], 'alone');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ask me before every turn' })); expect(onAsk).toHaveBeenCalledWith(false);
  fireEvent.click(screen.getByRole('button', { name: 'Allies first' })); expect(onAlliesFirst).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: /Play the turn/ })); expect(onPlay).toHaveBeenCalledOnce();
 });

 it('shows on the map the region an option is about while it is looked at', () => {
  const { onLook } = show(), lead = lines.find(c => c.hero === MAGE)!.proposals.find(o => o.mode === 'lead')!;
  const option = within(screen.getByRole('radiogroup', { name: /Plan for Sofeea/ })).getByRole('radio', { name: /Lead, I follow/ });
  fireEvent.pointerEnter(option); expect(onLook).toHaveBeenLastCalledWith({ region: lead.region, hero: MAGE });
  fireEvent.pointerLeave(option); expect(onLook).toHaveBeenLastCalledWith();
  fireEvent.focus(option); expect(onLook).toHaveBeenLastCalledWith({ region: lead.region, hero: MAGE });
 });

 it('says that an ally is still thinking until its lines arrive, and hides "Allies first" once the player has played', () => {
  show({ counsel: undefined, holding: false });
  expect(screen.getAllByText(/is thinking it over…/).length).toBe(6);
  expect(screen.queryByRole('button', { name: 'Allies first' })).toBeNull();
 });
});

describe('before the player’s turn', () => {
 it('the council opens by itself, with the planner’s lines, and the bots wait while it is open', async () => {
  seat(); planner.counsel.mockImplementation(said); planner.plan.mockImplementation(passing);
  await open(); await wait(300);
  const dialog = council()!;
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('Who goes where?');
  expect(planner.counsel).toHaveBeenCalled();
  const [, heroes, , options] = planner.counsel.mock.calls.at(-1)!;
  expect(heroes).toEqual([MAGE, SHAMAN]);
  expect(options).toMatchObject({ independent: [WARRIOR], orders: { [MAGE]: { mode: 'alone', partners: [WARRIOR] } } });
  expect(within(dialog).getAllByText(/^Joins Grumbaz in /).length).toBe(2);
  await wait(5000);
  expect(planner.plan).not.toHaveBeenCalled();
 });

 it('what is chosen is kept and told to the planner; the council does not come back in the same turn', async () => {
  seat(); planner.counsel.mockImplementation(said); planner.plan.mockResolvedValue(undefined);
  await open(); await wait(300);
  fireEvent.click(within(within(council()!).getByRole('radiogroup', { name: /Plan for Sofeea/ })).getByRole('radio', { name: /Lead, I follow/ }));
  await wait(100);
  expect(JSON.parse(localStorage.getItem('lordaeron-party-plan-v1')!)).toEqual({ modes: { [MAGE]: 'lead' }, ask: true });
  fireEvent.click(within(council()!).getByRole('button', { name: /Play the turn/ }));
  expect(council()).toBeNull();
  // A leader sets off while the player still has his actions: the planner is asked for the moves the plan calls for.
  await wait(1200);
  expect(planner.plan).toHaveBeenCalled();
  expect(planner.plan.mock.calls.at(-1)![3]).toMatchObject({ early: true, independent: [WARRIOR], orders: { [MAGE]: { mode: 'lead' }, [SHAMAN]: { mode: 'alone' } } });
  await wait(3000);
  expect(council()).toBeNull();
  // The table's own button brings it back.
  fireEvent.click(screen.getByRole('button', { name: 'Party plan' }));
  expect(council()).toBeTruthy();
 });

 it('does not open when the player asked not to be asked, and the plan still holds', async () => {
  seat([], { plan: { modes: { [MAGE]: 'follow', [SHAMAN]: 'follow' }, ask: false } }); planner.plan.mockResolvedValue(undefined);
  await open(); await wait(1500);
  expect(council()).toBeNull();
  // Followers wait for the player's first move where nothing is to be fought beside him: asked, the planner finds no early move.
  expect(planner.plan.mock.calls.every(call => call[3].early === true)).toBe(true);
  expect(saved()).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Party plan' }).getAttribute('title')).toMatch(/Sofeea comes with you · Zowka comes with you/);
 });

 it('with everyone going alone the bots are not asked for anything until the player has played', async () => {
  seat([], { plan: { modes: {}, ask: false } }); planner.plan.mockImplementation(passing);
  await open(); await wait(4000);
  expect(planner.plan).not.toHaveBeenCalled();
  // His last action spent, his allies go on by themselves, each by its own plan.
  fireEvent.click(screen.getByRole('button', { name: /^Pass/ }));
  await wait(UNDO_GRACE_MS + 800);
  expect(planner.plan).toHaveBeenCalled();
  expect(planner.plan.mock.calls.at(-1)![3]).not.toHaveProperty('early');
  expect(planner.plan.mock.calls.at(-1)![3].orders[MAGE]).toEqual({ mode: 'alone', partners: [WARRIOR] });
 });

 it('is not held for a faction the player has no character in', async () => {
  const allHorde = [...ROSTER.filter(id => p.characters.find(c => c.id === id)!.faction === 'horde').flatMap(id => [pass(id), pass(id)]), { type: 'endActions' } as Command];
  let s = createGame(p, DEFAULT_SETUP); for (const c of allHorde) s = apply(p, s, c);
  const rest: Command[] = []; while (s.faction === 'horde') { const c = legalActions(p, s).find(c => c.type === 'manage' || c.type === 'endManagement')!; s = apply(p, s, c); rest.push(c); if (s.phase !== 'management') break; }
  seat([...allHorde, ...rest]); planner.plan.mockResolvedValue(undefined); planner.counsel.mockImplementation(said);
  await open(); await wait(1500);
  expect(council()).toBeNull();
  expect(planner.counsel).not.toHaveBeenCalled();
 });
});

describe('a bot’s move at the table’s pace', () => {
 const hordeDone = [pass(WARRIOR), pass(WARRIOR)];
 it('is preceded by a moment in which the table shows who is about to act', async () => {
  seat(hordeDone, { pace: 'normal', plan: { modes: {}, ask: false } });
  const s = hordeDone.reduce((state, c) => apply(p, state, c), createGame(p, DEFAULT_SETUP));
  const travel = legalActions(p, s).find((c): c is Extract<Command, { type: 'travel' }> => c.type === 'travel' && c.hero === MAGE && c.path.length > 0)!;
  planner.plan.mockResolvedValueOnce({ command: travel, reason: 'Heading for the quest.' }).mockResolvedValue(undefined);
  await open(); await wait(900);
  // The bot has decided, but its figure has not moved: the table says whose move it is.
  expect(stage()!.textContent).toMatch(/Sofeea is thinking…/);
  expect(stage()!.className).toContain('kind-think');
  expect(saved()).toHaveLength(hordeDone.length);
  await wait(1700);
  expect(saved().at(-1)).toEqual(travel);
  // An ally says why it moves.
  expect(stage()!.textContent).toMatch(/Sofeea travels to/);
  expect(stage()!.textContent).toContain('— Heading for the quest.');
 });

 it('is made at once when the player moves the notice on', async () => {
  seat(hordeDone, { pace: 'normal', plan: { modes: {}, ask: false } }); planner.plan.mockImplementationOnce(passing).mockResolvedValue(undefined);
  await open(); await wait(900);
  expect(stage()!.className).toContain('kind-think');
  fireEvent.click(stage()!);
  await wait(100);
  expect(saved()).toHaveLength(hordeDone.length + 1);
 });

 it('has no such moment with the pace off or step by step', async () => {
  for (const pace of ['off', 'step']) {
   cleanup(); vi.useRealTimers(); localStorage.clear();
   seat(hordeDone, { pace, plan: { modes: {}, ask: false } }); planner.plan.mockReset(); planner.plan.mockImplementationOnce(passing).mockResolvedValue(undefined);
   await open(); await wait(900);
   expect(saved()).toHaveLength(hordeDone.length + 1);
  }
 });
});

describe('what the stage says of a bot’s move', () => {
 const s = createGame(p, DEFAULT_SETUP);
 const travel = legalActions(p, s).find((c): c is Extract<Command, { type: 'travel' }> => c.type === 'travel' && c.hero === MAGE && c.path.length === 2 && !c.power)!;
 it('names who is about to act and where that character stands, and gives nothing away', () => {
  const beat = thinking(p, s, travel)!;
  expect(beat).toMatchObject({ kind: 'think', size: 'banner', title: 'Sofeea is thinking…', region: s.heroes.find(h => h.id === MAGE)!.location, art: { kind: 'hero', id: MAGE } });
  expect(beat.hold).toBeGreaterThanOrEqual(1000);
  expect(JSON.stringify(beat)).not.toContain(travel.path.at(-1)!);
  expect(thinking(p, s, { type: 'endActions' })).toBeUndefined();
 });
 it('keeps a journey up for as long as the figure walks, and adds an ally’s reason to it', () => {
  const next = apply(p, s, travel), [plain] = beats(p, s, next, travel, true), [spoken] = beats(p, s, next, travel, true, 'Heading for the quest.');
  expect(plain.kind).toBe('travel');
  expect(plain.hold).toBeGreaterThanOrEqual(1400 + 2 * 600);
  expect(plain.lines.some(line => line.startsWith('—'))).toBe(false);
  expect(spoken.lines.at(-1)).toBe('— Heading for the quest.');
  expect(spoken.hold).toBeGreaterThan(plain.hold);
  // The player's own move is not announced back to him, with or without a reason.
  expect(beats(p, s, next, travel, false, 'Heading for the quest.').some(b => b.kind === 'travel')).toBe(false);
 });
});

describe('a figure on its way', () => {
 it('is the same counter in every region it crosses, so that it can be seen walking', async () => {
  const { default: CampaignMap } = await import('../src/campaign/Map');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  const s = createGame(p, DEFAULT_SETUP), travel = legalActions(p, s).find((c): c is Extract<Command, { type: 'travel' }> => c.type === 'travel' && c.hero === WARRIOR && c.path.length === 2 && !c.power)!;
  const from = s.heroes.find(h => h.id === WARRIOR)!.location, after = apply(p, s, travel);
  const map = (state: typeof s, standing?: Record<string, string>) => <CampaignMap state={view(state)} standing={standing} heroId={WARRIOR} selected={from} legal={[]} focused={false} onToggleFocus={() => {}} onSelect={() => {}} onMove={() => {}} />;
  const counter = () => screen.getByRole('button', { name: /^Grumbaz Crowsblood · level 1 · / });
  const { rerender } = render(map(s));
  const first = counter(), start = first.getAttribute('style');
  expect(first.getAttribute('aria-label')).toContain(p.regions.find(r => r.id === from)!.name);
  // The game has him at the journey's end; the board still shows him where the hand has him.
  rerender(map(after, { [WARRIOR]: from }));
  expect(counter()).toBe(first); expect(counter().getAttribute('style')).toBe(start);
  rerender(map(after, { [WARRIOR]: travel.path[0] }));
  expect(counter()).toBe(first);
  expect(counter().getAttribute('aria-label')).toContain(p.regions.find(r => r.id === travel.path[0])!.name);
  const midway = counter().getAttribute('style');
  expect(midway).not.toBe(start);
  rerender(map(after));
  expect(counter()).toBe(first);
  expect(counter().getAttribute('aria-label')).toContain(p.regions.find(r => r.id === travel.path[1])!.name);
  expect(counter().getAttribute('style')).not.toBe(midway);
 });
});
