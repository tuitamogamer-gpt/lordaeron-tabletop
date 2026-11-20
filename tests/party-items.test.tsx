// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Campaign from '../src/Campaign';
import { decide } from '../src/ai/planner';
import { audio } from '../src/campaign/audio';
import RewardResolution from '../src/campaign/RewardResolution';
import { beats } from '../src/campaign/stage';
import { itemFit, tradeDesk } from '../src/campaign/trade';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { DEVELOPMENT_PACK, DEFAULT_SETUP as ROOM_SETUP } from '../src/data/development-pack';
import { botOwns, decisionOwners } from '../src/multiplayer/ownership';
import { card, character } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { Command, State } from '../src/rules/model';
import { startRewards } from '../src/rules/reward-engine';
import { newSession } from '../src/rules/session';
import { view } from '../src/rules/view';
import { handleRoom, type RoomSnapshot } from '../server/rooms';
import { MemoryStore } from '../server/store';

/**
 * Items changing hands inside a party (20. 11. 2026). A quest reward is the party's to hand out: the player gives each item to
 * his own character or to the ally who fought beside him, where before he could only take it himself. Trading between allies in
 * the same region had its rules and its window, but no button opened it.
 */
const planner = vi.hoisted(() => ({ plan: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/ai/client', () => ({ PlannerClient: class { plan = planner.plan; dispose = planner.dispose; } }));

const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall', SHAMAN = 'zowka-shattertusk', PALADIN = 'brandon-lightstone', ROSTER = DEFAULT_SETUP.roster;
const first = (id: string) => character(p, id).name.split(' ')[0];
const item = (test: (c: (typeof p.cards)[number]) => boolean) => p.cards.find(c => c.kind === 'item' && !c.printed && !c.soulbound && test(c))!;
const MAIL = item(c => c.trait === 'Mail' && !c.addon && c.level === 1), WAND = item(c => c.trait === 'Wand' && c.level === 1), POTION = item(c => c.trait === 'Potion');
const MAIL_LATER = item(c => c.trait === 'Mail' && !c.addon && c.level > 1);

beforeEach(() => {
 localStorage.clear(); planner.plan.mockReset(); planner.dispose.mockReset();
 window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = vi.fn();
 vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
 vi.spyOn(audio, 'play').mockResolvedValue(undefined); vi.spyOn(audio, 'stinger').mockImplementation(() => {}); vi.spyOn(audio, 'cue').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/** A reward on the table for a party, with exactly these cards to choose among. */
function rewardFor(party: string[], offered: string[], alive = party) {
 const s = createGame(p, DEFAULT_SETUP); s.phase = 'reward';
 startRewards(p, s, party, alive, { xp: 0, gold: 0, items: [{ deck: 'triangle', draw: 1 }] });
 s.reward!.offered = offered;
 return s;
}

describe('a quest reward is the party’s to hand out', () => {
 it('gives every surviving participant a say, so a bot does not take it while a player stands in the party', () => {
  const s = rewardFor([WARRIOR, MAGE], [MAIL.id]);
  const toAlly: Command = { type: 'reward', hero: MAGE, card: MAIL.id };
  expect(decisionOwners(p, s, toAlly)).toEqual([WARRIOR, MAGE]);
  // With the warrior played by a person, the mage's bot may not take the item; with both bots, it may.
  expect(botOwns(p, s, toAlly, [MAGE])).toBe(false);
  expect(botOwns(p, s, toAlly, [WARRIOR, MAGE])).toBe(true);
  // The rules accept the gift: the item is in the ally's bag.
  expect(apply(p, s, toAlly).heroes.find(h => h.id === MAGE)!.bag).toEqual([MAIL.id]);
 });
 it('leaves it to the survivors: a defeated character has no say', () => {
  const s = rewardFor([WARRIOR, MAGE], [MAIL.id], [MAGE]);
  expect(decisionOwners(p, s, { type: 'reward', hero: MAGE, card: MAIL.id })).toEqual([MAGE]);
  expect(botOwns(p, s, { type: 'reward', hero: MAGE, card: MAIL.id }, [MAGE])).toBe(true);
 });
 it('names everyone who can receive the item, says what it is worth to each, and offers the one who can wear it', () => {
  const s = rewardFor([MAGE, WARRIOR], [MAIL.id]), send = vi.fn();
  render(<RewardResolution state={view(s)} legal={legalActions(p, s)} send={send} inspect={() => {}} bots={[WARRIOR]} />);
  const rows = within(screen.getByRole('radiogroup', { name: 'Reward recipient' })).getAllByRole('radio');
  expect(rows.map(r => r.textContent)).toEqual([expect.stringContaining('Cannot equip Mail'), expect.stringContaining('Can equip now')]);
  expect(rows[1].textContent).toContain('AI ally');
  // Mail is of no use to the mage: the warrior is offered first, although he is listed second and played by the AI.
  expect(rows[1].getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: `Give ${MAIL.name} to ${first(WARRIOR)}` }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'reward', hero: WARRIOR, card: MAIL.id });
 });
 it('offers the player’s own character when the item serves both alike, and follows the card when another is picked', () => {
  const s = rewardFor([WARRIOR, MAGE], [POTION.id, WAND.id]), send = vi.fn();
  render(<RewardResolution state={view(s)} legal={legalActions(p, s)} send={send} inspect={() => {}} bots={[WARRIOR]} />);
  // A potion is carried by either: the player's mage before the AI's warrior.
  expect(screen.getByRole('button', { name: `Give ${POTION.name} to ${first(MAGE)}` })).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(character(p, WARRIOR).name) }));
  expect(screen.getByRole('button', { name: `Give ${POTION.name} to ${first(WARRIOR)}` })).toBeTruthy();
  // Another card is another question: the wand goes to the one who can hold it.
  fireEvent.click(screen.getByRole('button', { name: `Select reward ${WAND.name}` }));
  fireEvent.click(screen.getByRole('button', { name: `Give ${WAND.name} to ${first(MAGE)}` }));
  expect(send).toHaveBeenCalledExactlyOnceWith({ type: 'reward', hero: MAGE, card: WAND.id });
 });
 it('in a room, an item handed to another person’s character waits for that person', async () => {
  const [warrior, mage] = ROOM_SETUP.roster, store = new MemoryStore();
  type Login = RoomSnapshot & { token: string };
  const host = await handleRoom(store, { kind: 'create', name: 'Host', setup: ROOM_SETUP, heroes: [warrior] }) as Login;
  const guest = await handleRoom(store, { kind: 'join', name: 'Guest', room: host.id, heroes: [mage] }) as Login;
  let v = await handleRoom(store, { kind: 'configure', room: host.id, revision: guest.revision, bots: ROOM_SETUP.roster.filter(id => ![warrior, mage].includes(id)) }, host.token) as RoomSnapshot;
  v = await handleRoom(store, { kind: 'start', room: v.id, revision: v.revision }, host.token) as RoomSnapshot;
  const raw = (await store.get(host.id))!; raw.state.phase = 'reward';
  startRewards(DEVELOPMENT_PACK, raw.state, [warrior, mage], [warrior, mage], { xp: 0, gold: 0, items: [{ deck: 'triangle', draw: 2 }] });
  const [one, two] = raw.state.reward!.offered;
  await store.compareSwap(raw.id, raw.revision, raw);
  // The host may name the guest's mage, but nothing lands in her bag before the guest agrees.
  v = await handleRoom(store, { kind: 'command', room: v.id, revision: v.revision, requestId: 'give-reward-1', command: { type: 'reward', hero: mage, card: one } }, host.token) as RoomSnapshot;
  // Only the one whose character receives it is asked.
  expect(v.pending?.required).toEqual([guest.me]);
  expect(v.state.heroes.find(h => h.id === mage)!.bag).toEqual([]);
  v = await handleRoom(store, { kind: 'consent', room: v.id, revision: v.revision, accept: true }, guest.token) as RoomSnapshot;
  expect(v.pending).toBeUndefined();
  expect(v.state.heroes.find(h => h.id === mage)!.bag).toEqual([one]);
  expect(two).toBeTruthy();
 });
});

describe('what an item is worth to a character', () => {
 const hero = (id: string, level = 1) => ({ ...createGame(p, DEFAULT_SETUP).heroes.find(h => h.id === id)!, level });
 it('says whether he can wear it now, later, never, or only carries it', () => {
  expect(itemFit(p, hero(WARRIOR), MAIL.id)).toMatchObject({ fit: 'equip' });
  expect(itemFit(p, hero(WARRIOR), MAIL.id).text).toMatch(/^Can equip now · (free slot|in place of .+)$/);
  expect(itemFit(p, hero(WARRIOR), MAIL_LATER.id)).toEqual({ fit: 'level', text: `Can equip at level ${MAIL_LATER.level}` });
  expect(itemFit(p, hero(WARRIOR, MAIL_LATER.level), MAIL_LATER.id).fit).toBe('equip');
  expect(itemFit(p, hero(MAGE, 5), MAIL.id)).toEqual({ fit: 'none', text: 'Cannot equip Mail' });
  expect(itemFit(p, hero(MAGE), POTION.id)).toEqual({ fit: 'carry', text: 'Used from the bag' });
 });
 it('never promises a slot the rules would refuse', () => {
  // Whatever it calls wearable now can be put on in management by the rules themselves.
  const s = createGame(p, DEFAULT_SETUP);
  for (const h of s.heroes) for (const c of p.cards.filter(c => c.kind === 'item' && !c.printed)) {
   const fit = itemFit(p, h, c.id);
   if (fit.fit !== 'equip') continue;
   const next = structuredClone(s), me = next.heroes.find(v => v.id === h.id)!; me.bag = [c.id]; next.phase = 'management'; next.faction = s.factions![h.id];
   expect(legalActions(p, next).some(cmd => cmd.type === 'manage' && cmd.hero === h.id && cmd.slots.some(slot => slot.card === c.id || slot.addons.includes(c.id))), `${h.id} · ${c.name}`).toBe(true);
  }
 });
});

describe('trading between allies standing in the same region', () => {
 const acted = () => apply(p, createGame(p, DEFAULT_SETUP), { type: 'rest', hero: WARRIOR, health: 0 });
 it('opens once an action has been taken, for a character the player controls, with the allies standing beside him', () => {
  const start = createGame(p, DEFAULT_SETUP), horde = start.heroes.filter(h => start.factions![h.id] === 'horde').map(h => h.id);
  // The whole faction starts in one region: there is someone to trade with, but nothing has been done yet.
  expect(tradeDesk(p, view(start), WARRIOR, [WARRIOR])).toMatchObject({ open: false, short: 'after an action', partners: [expect.objectContaining({ id: horde[1] }), expect.objectContaining({ id: horde[2] })] });
  const s = acted();
  expect(tradeDesk(p, view(s), WARRIOR, [WARRIOR])).toMatchObject({ open: true, reason: '' });
  expect(tradeDesk(p, view(s), WARRIOR, [WARRIOR]).short).toBe(`with ${horde.slice(1).map(first).join(' or ')} · free`);
  expect(tradeDesk(p, view(s), MAGE, [WARRIOR])).toMatchObject({ open: false, short: 'AI character' });
  expect(tradeDesk(p, view(s), PALADIN, [PALADIN])).toMatchObject({ open: false, short: 'on your turn' });
  // Alone in a region there is no one to trade with, and no button is shown at all.
  const away = apply(p, s, { type: 'travel', hero: WARRIOR, path: ['brightwater'] });
  expect(tradeDesk(p, view(away), WARRIOR, [WARRIOR])).toMatchObject({ open: false, partners: [] });
 });
 it('is open exactly when the rules accept a trade', () => {
  for (const s of [createGame(p, DEFAULT_SETUP), acted()]) {
   const desk = tradeDesk(p, view(s), WARRIOR, [WARRIOR]), trade: Command = { type: 'trade', hero: WARRIOR, to: MAGE, items: [], receiveItems: [], gold: 1, receiveGold: 0 };
   let accepted = true; try { apply(p, s, trade); } catch { accepted = false; }
   expect(desk.open).toBe(accepted);
  }
 });
 it('is written into the chronicle with what changed hands', () => {
  const s = acted(), a = s.heroes.find(h => h.id === WARRIOR)!, b = s.heroes.find(h => h.id === MAGE)!; a.bag = [WAND.id]; b.bag = [MAIL.id];
  const both = apply(p, s, { type: 'trade', hero: WARRIOR, to: MAGE, items: [WAND.id], receiveItems: [MAIL.id], gold: 2, receiveGold: 0 });
  expect(both.log.at(-1)!.text).toBe(`${character(p, WARRIOR).name} gives ${WAND.name} and 2 gold to ${character(p, MAGE).name} and receives ${MAIL.name}.`);
  const taken = apply(p, s, { type: 'trade', hero: WARRIOR, to: MAGE, items: [], receiveItems: [MAIL.id], gold: 0, receiveGold: 1 });
  expect(taken.log.at(-1)!.text).toBe(`${character(p, WARRIOR).name} receives ${MAIL.name} and 1 gold from ${character(p, MAGE).name}.`);
 });
 it('between two bots is shown at the table as the card that changed hands', () => {
  const s = acted(), a = s.heroes.find(h => h.id === SHAMAN)!; a.bag = [WAND.id];
  const trade: Command = { type: 'trade', hero: SHAMAN, to: MAGE, items: [WAND.id], receiveItems: [], gold: 0, receiveGold: 0 }, next = apply(p, s, trade);
  const shown = beats(p, view(s), view(next), trade, true);
  expect(shown).toHaveLength(1);
  expect(shown[0]).toMatchObject({ size: 'card', art: { kind: 'card', id: WAND.id }, title: `${first(SHAMAN)} trades with ${first(MAGE)}`, lines: [`Gives ${WAND.name}.`] });
 });
});

describe('at the table', () => {
 const seat = (human: string, commands: Command[]) => {
  localStorage.setItem('lordaeron-base-save-v7', JSON.stringify({ ...newSession(p, DEFAULT_SETUP), commands }));
  localStorage.setItem('lordaeron-base-bots-v3', JSON.stringify(ROSTER.filter(id => id !== human)));
  localStorage.setItem('lordaeron-pace-v1', 'off'); localStorage.setItem('lordaeron-bots-auto-v1', 'off');
 };
 const saved = () => JSON.parse(localStorage.getItem('lordaeron-base-save-v7')!).commands as Command[];
 const open = async () => { await act(async () => { render(<Campaign />); }); };
 /** The warrior and the mage finish a quest together; the warrior takes the first item and a new quest is drawn. */
 function afterReward() {
  let s: State = createGame(p, DEFAULT_SETUP); const commands: Command[] = [];
  const go = (c: Command) => { s = apply(p, s, c); commands.push(c); };
  for (const id of [WARRIOR, MAGE]) go({ type: 'travel', hero: id, path: ['brightwater'] });
  go(legalActions(p, s).find((c): c is Extract<Command, { type: 'challenge' }> => c.type === 'challenge' && c.hero === WARRIOR && c.allies.join() === MAGE && s.enemies.some(e => e.id === c.target && !!e.quest))!);
  for (let guard = 0; s.phase === 'combat' && guard < 400; guard++) { const legal = legalActions(p, s); go(decide(p, view(s), legal, 'balanced')?.command ?? legal[0]); }
  const taken = s.reward!.offered[0];
  go({ type: 'reward', hero: WARRIOR, card: taken });
  for (let guard = 0; s.phase !== 'actions' && guard < 10; guard++) { const legal = legalActions(p, s); go(legal.find(c => c.type === 'quest') ?? legal.find(c => c.type === 'talent') ?? legal[0]); }
  expect(s.phase).toBe('actions'); expect(s.tradeWindow).toBe(true);
  return { commands, taken };
 }
 it('the Trade button waits beside the actions until one has been taken, and says why', async () => {
  seat(WARRIOR, []);
  await open();
  const button = screen.getByRole('button', { name: /^Trade with an ally · free/ }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(button.textContent).toContain('after an action');
  expect(button.title).toBe('Trading opens once a character of your faction has taken an action this turn.');
 });
 it('the Trade button opens the trade table, and the pressed card goes to the ally', async () => {
  const { commands, taken } = afterReward();
  seat(WARRIOR, commands);
  await open();
  const button = screen.getByRole('button', { name: 'Trade with an ally · free' }) as HTMLButtonElement;
  expect(button.disabled).toBe(false);
  expect(button.textContent).toContain(`with ${first(MAGE)} · free`);
  fireEvent.click(button);
  expect(screen.getByRole('heading', { name: 'Trade with an ally' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: `You give: ${card(p, taken).name}` }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Trade with ${first(MAGE)}` })); });
  expect(saved().at(-1)).toEqual({ type: 'trade', hero: WARRIOR, to: MAGE, items: [taken], receiveItems: [], gold: 0, receiveGold: 0 });
  // The table closes with the trade; it costs no action.
  expect(screen.queryByRole('heading', { name: 'Trade with an ally' })).toBeNull();
 });
 it('the character sheet offers the same trade', async () => {
  const { commands } = afterReward();
  seat(WARRIOR, commands);
  await open();
  fireEvent.click(screen.getByRole('button', { name: /^Characters/ }));
  const sheet = within(screen.getByRole('dialog', { name: 'Characters' }));
  fireEvent.click(sheet.getByRole('button', { name: 'Trade with an ally · free' }));
  expect(screen.getByRole('heading', { name: 'Trade with an ally' })).toBeTruthy();
 });
});
