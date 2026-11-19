// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import CampaignCombat from '../src/campaign/Combat';
import { combatCue } from '../src/campaign/combat-flow';
import { carryWords, forecastLines, forecastNote, forecastSentence, roundForecast } from '../src/campaign/combat-forecast';
import { sceneWords } from '../src/campaign/combat-report';
import { continueMs } from '../src/campaign/table-time';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { beginBattle } from '../src/rules/combat';
import { apply, createGame } from '../src/rules/game';
import { legalActions } from '../src/rules/legal';
import type { State } from '../src/rules/model';
import { view } from '../src/rules/view';

/**
 * What an audit of the fight as a player sees it found (19. 11. 2026): a round summary that promised a win the party could
 * not reach, an outcome shown while the dice were still in the air, a defeat announced as a heal, a power announced as the
 * hits of the roll, an attack called a ranged volley, and four empty steps of over a second each after every roll.
 */
const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall';
afterEach(cleanup);
/** One or two Horde characters against a green Crusader (Threat 5, Attack 4, Health 3). */
function fight(party = [WARRIOR], change: (s: State) => void = () => {}) {
 const s = createGame(p, DEFAULT_SETUP);
 s.enemies = [{ id: 'enemy-0', creature: 'crusader', color: 'green', region: 'brill' }];
 beginBattle(s, 'pve', party, ['enemy-0'], 'horde', 'brill');
 change(s);
 return s;
}
const hero = (s: State, id: string) => s.heroes.find(h => h.id === id)!;
const tokens = (s: State, damage: number, defense: number, armor: number, attrition: number, stage: NonNullable<State['battle']>['stage'] = 'defense') => { s.battle!.boxes.horde = { damage, defense, armor, attrition }; s.battle!.stage = stage; s.battle!.acted = [...s.battle!.participants]; delete s.battle!.active; return s; };

describe('a round that the party does not live through', () => {
 it('is not called a win: the wounds fall before the party strikes', () => {
  // He has 2 Health; 4 Attack less 1 hit and 1 armor leaves 2 wounds, and his 3 hits would have felled the Crusader.
  const s = tokens(fight([WARRIOR], s => { hero(s, WARRIOR).health = 2; }), 1, 1, 1, 1), f = roundForecast(p, view(s))!;
  expect(f).toMatchObject({ wounds: 2, damage: 3, health: 3, wipe: 'Grumbaz' });
  expect(forecastSentence(f)).toBe('2 wounds incoming: Grumbaz falls unless healed · the fight is lost before the party strikes');
  const [incoming, outgoing] = forecastLines(f);
  expect(incoming).toMatchObject({ result: '2 wounds · Grumbaz falls', tone: 'bad' });
  expect(outgoing).toMatchObject({ result: '3 of 3 · not struck', tone: 'bad' });
  expect(forecastNote(p, f)).toBe('');
  expect(carryWords(f)).toBe('Unless Grumbaz is healed, the wounds fall first and the fight is lost.');
 });

 it('names the party when more than one character falls with it', () => {
  const s = tokens(fight([WARRIOR, MAGE], s => { hero(s, WARRIOR).health = 1; hero(s, MAGE).health = 1; }), 0, 1, 1, 0), f = roundForecast(p, view(s))!;
  expect(f.wipe).toBe('the party');
  expect(carryWords(f)).toBe('Unless someone is healed, the wounds fall first and the fight is lost.');
 });

 it('is not declared while someone has still to roll: his hits and armor may stop the wounds', () => {
  const s = fight([WARRIOR], s => { hero(s, WARRIOR).health = 2; }), f = roundForecast(p, view(s))!;
  expect(s.battle!.stage).toBe('attacker');
  expect(f.wounds).toBe(4); expect(f.waiting).toEqual([WARRIOR]); expect(f.wipe).toBeUndefined();
  expect(forecastSentence(f)).toBe('4 wounds incoming · 0 of 3 damage');
 });

 it('stays a win when the party survives the wounds', () => {
  const s = tokens(fight([WARRIOR]), 0, 2, 1, 1), f = roundForecast(p, view(s))!;
  expect(f.wipe).toBeUndefined();
  expect(forecastSentence(f)).toBe('1 wound incoming · 3 of 3 damage: Crusader falls');
 });

 it('says so in the scene when the wounds are being assigned', () => {
  const s = tokens(fight([WARRIOR], s => { hero(s, WARRIOR).health = 2; }), 1, 1, 1, 1, 'wounds');
  s.battle!.wounds.horde = 2;
  const v = view(s);
  expect(sceneWords(p, v, roundForecast(p, v)).detail).toBe('2 wounds to assign · Grumbaz falls unless healed');
 });
});

describe('what an exchange is called', () => {
 const after = (s: State, change: (next: State) => void) => { const next = structuredClone(s); next.revision++; change(next); return combatCue(view(s), view(next))!; };

 it('a character who leaves the fight is a loss, whatever Health he returns with', () => {
  const s = tokens(fight([WARRIOR, MAGE], s => { hero(s, MAGE).health = 0; }), 0, 0, 0, 0, 'wounds');
  const cue = after(s, next => { next.battle!.defeated.push(MAGE); hero(next, MAGE).health = 1; hero(next, MAGE).location = 'brill'; });
  expect(cue).toMatchObject({ kind: 'hurt', title: 'Sofeea falls', heroId: MAGE });
  expect(cue.detail).toBe('Sofeea leaves the fight and returns to Brill');
  expect(cue.title).not.toMatch(/Restoring/);
 });

 it('a power that lays a token is named as the power, with what it laid', () => {
  const s = fight([WARRIOR]); s.battle!.stage = 'pool'; s.battle!.active = { heroId: WARRIOR, dice: [], used: [], threat: 5, reroll: 0, attrition: 0 } as unknown as NonNullable<State['battle']>['active'];
  const card = p.cards.find(c => c.kind === 'item')!;
  const cue = after(s, next => { next.battle!.active!.used.push(`${card.id}:a`); next.battle!.boxes.horde.armor += 1; });
  expect(cue).toMatchObject({ kind: 'power', title: card.name, detail: '+1 armor' });
  // The hits of the roll keep their own words.
  const placed = after(s, next => { next.battle!.boxes.horde.defense += 2; next.battle!.boxes.horde.damage += 1; });
  expect(placed).toMatchObject({ kind: 'bank', title: 'Hits placed', detail: '+3 tokens in the Combat Area' });
 });

 it('the opponents’ attack is called their attack, not a ranged volley', () => {
  // One carried damage token and the attack all but stopped: nothing ranged decides this exchange.
  const s = tokens(fight([WARRIOR]), 1, 2, 1, 0), cue = after(s, next => { next.battle!.stage = 'wounds'; next.battle!.wounds.horde = 1; });
  expect(cue.title).toBe('Crusader attacks');
  expect(cue.kind).toBe('defend');
  expect(cue.detail).toBe('Crusader attacks for 4 · 3 stopped · 1 wound to assign');
 });
});

describe('the player’s own steps that continue by themselves', () => {
 it('look at the roll once, nod at the empty steps after it, and give the totals time before a blow', () => {
  expect(continueMs('after-pool', 'advance')).toBeGreaterThanOrEqual(1200);
  for (const stage of ['reroll', 'after-reroll', 'after-tokens'] as const) expect(continueMs(stage, 'advance')).toBeLessThanOrEqual(500);
  // Four steps after a roll used to take about five seconds with nothing changing.
  expect(continueMs('after-pool', 'advance') + continueMs('reroll', 'advance') + continueMs('after-reroll', 'monster') + continueMs('tokens', 'tokens')).toBeLessThan(4000);
  expect(continueMs('defense', 'advance')).toBeGreaterThan(continueMs('after-pool', 'advance'));
  expect(continueMs('resolution', 'advance')).toBeGreaterThan(continueMs('tokens', 'tokens'));
  expect(continueMs('wounds', 'wound')).toBeLessThan(continueMs('defense', 'advance'));
 });
});

describe('the combat window', () => {
 const noop = () => {};
 const room = (s: State, props: Partial<Parameters<typeof CampaignCombat>[0]> = {}) => render(<CampaignCombat state={view(s)} legal={legalActions(p, s)} send={noop} busy={false} botStep={noop} botReady={false} auto={false} toggleBots={noop} {...props} />);
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

 it('reads nothing off dice that are still in the air', () => {
  // The engine's own roll: the warrior's two red dice and one green die against the Crusader's Threat 5.
  const before = apply(p, fight([WARRIOR]), { type: 'attacker', hero: WARRIOR }), rolled = apply(p, before, { type: 'roll' });
  expect(before.battle!.stage).toBe('pool'); expect(rolled.battle!.active!.dice.every(d => d.value > 0)).toBe(true);
  const after = roundForecast(p, view(rolled))!;
  expect(after.wounds).toBeLessThan(4);
  const { rerender } = room(before, { legal: [] });
  const summary = () => screen.getByRole('group', { name: 'The round as it stands' }).textContent;
  const standing = summary();
  expect(standing).toContain('4 wounds');
  rerender(<CampaignCombat state={view(rolled)} legal={[]} send={noop} busy botStep={noop} botReady={false} auto={false} toggleBots={noop} />);
  // The die shows an 8, but it has not landed: the summary is still the one from before the throw.
  expect(summary()).toBe(standing);
  expect(screen.getByRole('heading', { name: 'Rolling' })).toBeTruthy();
  expect(screen.getByText('The dice are in the air. They count once they lie still.')).toBeTruthy();
  rerender(<CampaignCombat state={view(rolled)} legal={[]} send={noop} busy={false} botStep={noop} botReady={false} auto={false} toggleBots={noop} />);
  expect(summary()).not.toBe(standing);
  expect(summary()).toContain(after.wounds ? `${after.wounds} wound` : 'No wounds');
  expect(screen.queryByRole('heading', { name: 'Rolling' })).toBeNull();
 });

 it('says who has fallen and what each place to return to is', () => {
  const s = tokens(fight([WARRIOR], s => { hero(s, WARRIOR).health = 0; }), 0, 0, 0, 0, 'wounds');
  s.respawns = [WARRIOR];
  const legal = legalActions(p, s).filter(c => c.type === 'respawn');
  expect(legal.length).toBeGreaterThan(0);
  room(s, { legal });
  expect(screen.getByRole('heading', { name: 'Grumbaz has fallen' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toMatch(/Grumbaz has fallen\. Heal now with a power, or choose where Grumbaz returns/);
  const buttons = screen.getAllByRole('button', { name: /^Grumbaz returns to / });
  expect(buttons).toHaveLength(legal.length);
  for (const button of buttons) expect(button.textContent).toMatch(/(Starting region|Graveyard) · with 1 health and 1 energy/);
  expect(screen.queryByRole('button', { name: /Revive/ })).toBeNull();
 });

 it('does not call a fight it only watches the player’s decision', () => {
  const s = fight([WARRIOR]);
  room(s, { legal: [], bots: [WARRIOR] });
  expect(screen.getByText(/^Watching/)).toBeTruthy();
  expect(screen.queryByText(/^Your decision$/)).toBeNull();
 });
});
