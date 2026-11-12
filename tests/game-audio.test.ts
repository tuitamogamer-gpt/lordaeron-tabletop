import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { AudioDirector, battleOutcome, combatSounds, cues, eventVoice, pick, VOICES, type Voice } from '../src/campaign/audio';
import type { CombatCue } from '../src/campaign/combat-flow';
import { actionCue } from '../src/campaign/stage';
import { legalActions } from '../src/rules/legal';
import type { Command } from '../src/rules/model';
import { faction } from '../src/rules/common';
import { apply, createGame } from '../src/rules/game';
import { view, type GameView } from '../src/rules/view';

const start = (overlord = 'kelthuzad') => view(createGame(p, { ...DEFAULT_SETUP, overlord }));
const step = (v: GameView, change: (n: GameView) => void) => { const n = structuredClone(v); n.revision = v.revision + 1; change(n); return n; };
const battle = (participants: string[], boss?: string) => ({ kind: 'pve', region: 'brill', participants, defeated: [], enemies: [], boss, round: 1, stage: 'attacker' }) as unknown as NonNullable<GameView['battle']>;

describe('the sound of the game state', () => {
 it('stays silent for a new or imported campaign and for an undo', () => {
  const a = start(), later = step(a, n => { n.heroes[0].level = 2; });
  expect(cues(p, undefined, a)).toEqual([]);
  expect(cues(p, later, a)).toEqual([]);
  expect(cues(p, a, { ...later, revision: a.revision + 200 })).toEqual([]);
  expect(cues(p, a, a)).toEqual([]);
 });

 it('puts a new level ahead of the gold that came with it, one effect and one voice at a time', () => {
  const a = start(), b = step(a, n => { n.heroes[0].level = 2; n.heroes[0].gold += 4; n.completed.push(n.quests[0]); });
  expect(cues(p, a, b).map(c => c.sfx ?? c.voice)).toEqual(['levelup', 'quest', 'coins']);
  expect(pick(cues(p, a, b))).toEqual({ sfx: 'levelup', voice: 'level' });
 });

 it('opens a battle with the side’s battle cry, or with the Overlord’s own line', () => {
  const a = start('nefarian'), horde = a.heroes.find(h => faction(p, h.id) === 'horde')!.id, alliance = a.heroes.find(h => faction(p, h.id) === 'alliance')!.id;
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([horde]); })))).toEqual({ sfx: 'sword', voice: 'horde' });
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([alliance]); })))).toEqual({ sfx: 'sword', voice: 'alliance' });
  expect(pick(cues(p, a, step(a, n => { n.battle = battle([horde], 'nefarian'); })))).toEqual({ sfx: 'sword', voice: 'overlord-nefarian' });
 });

 it('rolls dice when a roll or a reroll changes them, not when they are spent', () => {
  const a = step(start(), n => { n.battle = battle([n.heroes[0].id]); });
  const rolled = step(a, n => { n.battle!.active = { heroId: n.heroes[0].id, dice: [{ id: 'd1', color: 'red', value: 3 }, { id: 'd2', color: 'blue', value: 7 }] } as never; });
  expect(pick(cues(p, a, rolled)).sfx).toBe('dice');
  const rerolled = step(rolled, n => { n.battle!.active!.dice[0] = { ...n.battle!.active!.dice[0], value: 6, rerolled: true }; });
  expect(pick(cues(p, rolled, rerolled)).sfx).toBe('dice');
  expect(pick(cues(p, rerolled, step(rerolled, n => { n.battle!.active!.dice.pop(); }))).sfx).toBeUndefined();
 });

 it('announces events, new quests, auctions and the next faction’s turn', () => {
  const a = start();
  // Spread the Plague is one of Kel'Thuzad's own cards: he speaks over it.
  expect(pick(cues(p, a, step(a, n => { n.eventDiscard.push('event-11'); })))).toEqual({ sfx: 'card', voice: 'taunt-kelthuzad' });
  expect(pick(cues(p, a, step(a, n => { n.quests = [...n.quests.slice(1), 'a-new-quest']; })))).toEqual({ sfx: 'card', voice: 'new-quest' });
  expect(pick(cues(p, a, step(a, n => { n.auction = { event: 'auction-house', item: 'x', submitted: [], ownBids: {} }; }))).voice).toBe('auction');
  const next = step(a, n => { n.faction = n.faction === 'horde' ? 'alliance' : 'horde'; n.phase = 'actions'; });
  expect(pick(cues(p, a, next)).voice).toBe(`turn-${next.faction}`);
 });

 it('is heard for an Event card that resolves without any decision, at the end of a real turn', () => {
  // Turn 3 is the Horde’s and space 4 draws an Event card; a War needs no decision, so the whole Event step passes within one command.
  const s = createGame(p, DEFAULT_SETUP); s.turn = 3; s.eventDeck = ['event-24', ...s.eventDeck.filter(id => id !== 'event-24')];
  for (const h of s.heroes) h.actions = 0;
  let last = apply(p, s, { type: 'endActions' });
  for (const h of last.heroes.filter(h => faction(p, h.id) === last.faction)) last = apply(p, last, { type: 'manage', hero: h.id, slots: h.slots, discard: [] });
  const next = apply(p, last, { type: 'endManagement' });
  expect(next.eventDiscard).toEqual(['event-24']);
  expect(pick(cues(p, view(last), view(next)))).toEqual({ sfx: 'card', voice: 'event-war' });
 });

 it('ends with the winner’s fanfare, or with the draw line when Nefarian outlasts both', () => {
  const a = start();
  expect(pick(cues(p, a, step(a, n => { n.winner = 'alliance'; n.phase = 'finished'; })))).toEqual({ sfx: 'victory', voice: 'victory-alliance' });
  expect(pick(cues(p, a, step(a, n => { n.winner = 'draw'; n.phase = 'finished'; })))).toEqual({ sfx: 'victory', voice: 'draw' });
 });
});

describe('the lines of the table', () => {
 const drawn = (a: GameView, id: string, earlier: string[] = []) => pick(cues(p, step(a, n => { n.eventDiscard = [...earlier]; }), step(a, n => { n.revision++; n.eventDiscard = [...earlier, id]; }))).voice;
 const named = (name: string) => p.events.filter(e => e.name === name).map(e => e.id);
 it('announce an Event card by its kind the first time its name is drawn, and by a line about fate when it returns', () => {
  const a = start(), [first, second] = named('New Horizons'), [bounty] = named('Bounty'), [war, other] = [named('The Andorhal War')[0], named('The Silverpine War')[0]];
  expect(drawn(a, first)).toBe('event-horizons');
  expect(drawn(a, second, [first])).toBe('event');
  expect(drawn(a, bounty, [first])).toBe('event-bounty');
  // Two Wars are two different cards: each is announced as a War.
  expect(drawn(a, war)).toBe('event-war'); expect(drawn(a, other, [war])).toBe('event-war');
  expect(drawn(a, named('The Old Snake')[0])).toBe('event-boss');
  expect(drawn(a, named('Auction House')[0])).toBe('auction');
  expect(drawn(a, named('Goblin Merchant')[0])).toBe('event-traders'); expect(drawn(a, named('Traveling Merchants')[0])).toBe('event-traders');
 });
 it('let Kel’Thuzad speak over his own five cards, world bosses included', () => {
  const own = p.events.filter(e => e.overlord === 'kelthuzad');
  expect(own.map(e => e.name).sort()).toEqual(['Arcane Corruption', 'Light of Ages', 'Scourge Cauldrons', 'Soul Taint', 'Spread the Plague']);
  for (const e of own) expect(eventVoice(p, e.id, []), e.name).toBe('taunt-kelthuzad');
 });
 it('have a line of its own kind for every Event card of the game', () => {
  for (const e of p.events) { const voice = eventVoice(p, e.id, []); expect(voice in VOICES, e.name).toBe(true); expect(voice, e.name).not.toBe('event'); }
  expect(eventVoice(p, 'no-such-card', [])).toBe('event');
 });
 it('greet level 5 differently from the levels before it', () => {
  const a = start();
  expect(pick(cues(p, a, step(a, n => { n.heroes[0].level = 4; })))).toEqual({ sfx: 'levelup', voice: 'level' });
  expect(pick(cues(p, a, step(a, n => { n.heroes[0].level = 5; })))).toEqual({ sfx: 'levelup', voice: 'level-5' });
 });
 it('give the Overlord a remark when he moves, and Nefarian his own at the Bulwark', () => {
  const a = start('nefarian'), horde = a.heroes.filter(h => faction(p, h.id) === 'horde').map(h => h.id);
  expect(pick(cues(p, a, step(a, n => { n.overlord.region = 'andorhal'; }))).voice).toBe('taunt-nefarian');
  const arrival = step(a, n => { n.overlord.region = 'bulwark'; n.battle = { ...battle(horde, 'nefarian'), region: 'bulwark' }; });
  expect(pick(cues(p, a, arrival))).toEqual({ sfx: 'sword', voice: 'nefarian-arrives' });
  // The second faction's turn against him opens with his battle line.
  const beaten = step(a, n => { n.overlord.region = 'bulwark'; n.nefarianFinal = ['horde']; });
  expect(pick(cues(p, beaten, step(beaten, n => { n.battle = { ...battle(horde, 'nefarian'), region: 'bulwark' }; }))).voice).toBe('overlord-nefarian');
 });
 it('tell a false trail from Kazzak’s hiding place', () => {
  const a = start('kazzak'), tokens = a.kazzak!, hordeHero = a.heroes.find(h => faction(p, h.id) === 'horde')!.id;
  expect(tokens).toHaveLength(5);
  // A challenged decoy leaves the board.
  expect(pick(cues(p, a, step(a, n => { n.kazzak = n.kazzak!.slice(1); }))).voice).toBe('kazzak-decoy');
  // A clue looked at: the faction learns whether he is there.
  expect(pick(cues(p, a, step(a, n => { n.kazzak![0] = { ...n.kazzak![0], real: false }; }))).voice).toBe('kazzak-decoy');
  expect(pick(cues(p, a, step(a, n => { n.kazzak![0] = { ...n.kazzak![0], real: true }; }))).voice).toBe('taunt-kazzak');
  // The challenge that finds him opens with the line for that, later ones with his battle line.
  const found = step(a, n => { n.kazzak![0] = { ...n.kazzak![0], revealed: true, real: true }; n.battle = { ...battle([hordeHero], 'kazzak'), region: tokens[0].region }; });
  expect(pick(cues(p, a, found))).toEqual({ sfx: 'sword', voice: 'kazzak-found' });
  const known = step(a, n => { n.kazzak![0] = { ...n.kazzak![0], revealed: true, real: true }; });
  expect(pick(cues(p, known, step(known, n => { n.battle = { ...battle([hordeHero], 'kazzak'), region: tokens[0].region }; }))).voice).toBe('overlord-kazzak');
 });
 it('announce a War won, the merchant’s new wares and a new lap of the track', () => {
  const a = start();
  const won = step(a, n => { n.log = [...n.log, { id: (n.log.at(-1)?.id ?? 0) + 1, turn: n.turn, text: 'The Alliance wins The Andorhal War, holding Ruins of Andorhal and Hearthglen: 5 gold and 2 XP for each of its characters.' }]; });
  expect(pick(cues(p, a, won)).voice).toBe('war-won-alliance');
  const stocked = step(a, n => { n.turn++; n.merchant = [...n.merchant, 'a-new-item']; });
  expect(cues(p, a, stocked).map(c => c.voice)).toContain('merchant');
  // The merchant is not announced for a purchase, which changes his wares within a turn.
  expect(cues(p, a, step(a, n => { n.merchant = n.merchant.slice(1); })).map(c => c.voice)).not.toContain('merchant');
  const last = step(a, n => { n.turn = 30; n.faction = 'alliance'; });
  expect(cues(p, last, step(last, n => { n.lap = 2; n.turn = 1; n.phase = 'actions'; n.faction = 'horde'; })).map(c => c.voice)).toContain('lap');
  expect(cues(p, last, step(last, n => { n.turn = 31; n.phase = 'actions'; n.faction = 'horde'; })).map(c => c.voice)).toContain('turn-horde');
 });
});

describe('the recordings of a cue', () => {
 it('take turns from wherever chance begins, so no line is heard twice running', () => {
  const director = new AudioDirector(() => 0.5);
  expect([1, 2, 3, 4].map(() => director.take('horde'))).toEqual(['horde-2', 'horde-3', 'horde', 'horde-2']);
  expect([1, 2, 3].map(() => director.take('battle-lost'))).toEqual(['battle-lost-2', 'battle-lost', 'battle-lost-2']);
  expect([1, 2].map(() => director.take('lap'))).toEqual(['lap', 'lap']);
  expect(new AudioDirector(() => 0).take('turn-alliance')).toBe('turn-alliance');
  expect(new AudioDirector(() => 0.999).take('turn-alliance')).toBe('turn-alliance-3');
 });
 it('all come round before one returns', () => {
  const director = new AudioDirector(() => 0.37);
  for (const voice of Object.keys(VOICES) as Voice[]) {
   const heard = Array.from({ length: VOICES[voice] * 2 }, () => director.take(voice));
   expect(new Set(heard.slice(0, VOICES[voice])).size, voice).toBe(VOICES[voice]);
   expect(heard.slice(VOICES[voice]), voice).toEqual(heard.slice(0, VOICES[voice]));
   if (VOICES[voice] > 1) for (let i = 1; i < heard.length; i++) expect(heard[i], voice).not.toBe(heard[i - 1]);
  }
 });
});

describe('the sound of a combat', () => {
 const WARRIOR = 'grumbaz-crowsblood', MAGE = 'sofeea-icecall', HUNTER = 'burbon-fang';
 const exchange = (kind: CombatCue['kind'], heroId = WARRIOR, more: { kills?: number; boss?: string; pvp?: boolean } = {}) =>
  ({ kind, heroId, kills: more.kills, before: { battle: { kind: more.pvp ? 'pvp' : 'pve', boss: more.boss } } }) as unknown as CombatCue;
 const heard = (cue: CombatCue) => Object.fromEntries((['anticipation', 'action', 'impact', 'recovery'] as const).map(phase => [phase, combatSounds(p, cue, phase)]).filter(([, sounds]) => (sounds as unknown[]).length));
 it('is the enemy first and the shields after when the enemy strikes', () => {
  expect(heard(exchange('defend'))).toEqual({ anticipation: [{ sfx: 'roar' }], impact: [{ sfx: 'block' }] });
  // Kel'Thuzad casts rather than roars, and another character's blade rings.
  expect(heard(exchange('defend', WARRIOR, { boss: 'kelthuzad' })).anticipation).toEqual([{ sfx: 'spell', stinger: 'spark' }]);
  expect(heard(exchange('defend', WARRIOR, { boss: 'nefarian' })).anticipation).toEqual([{ sfx: 'roar' }]);
  expect(heard(exchange('defend', WARRIOR, { pvp: true })).anticipation).toEqual([{ sfx: 'sword' }]);
 });
 it('looses ranged damage and then lands it: a bowstring for a fighter, a spell for a caster', () => {
  expect(heard(exchange('ranged', HUNTER))).toEqual({ action: [{ stinger: 'volley' }], impact: [{ sfx: 'hit' }] });
  expect(heard(exchange('ranged', MAGE))).toEqual({ action: [{ sfx: 'spell', stinger: 'spark' }], impact: [{ sfx: 'hit' }] });
 });
 it('lets an enemy that falls be heard falling, a moment after the blow', () => {
  expect(heard(exchange('melee', WARRIOR, { kills: 1 }))).toEqual({ impact: [{ sfx: 'hit' }, { sfx: 'slain', delay: 0.28 }] });
  expect(heard(exchange('ranged', HUNTER, { kills: 2 })).impact).toEqual([{ sfx: 'hit' }, { sfx: 'slain', delay: 0.28 }]);
  expect(heard(exchange('melee'))).toEqual({ impact: [{ sfx: 'hit' }] });
 });
 it('sounds a power as it is played, a wound, a healing and hits put aside', () => {
  expect(heard(exchange('power', WARRIOR))).toEqual({ anticipation: [{ stinger: 'power' }] });
  expect(heard(exchange('power', MAGE))).toEqual({ anticipation: [{ sfx: 'spell', stinger: 'spark' }] });
  expect(heard(exchange('hurt'))).toEqual({ impact: [{ sfx: 'hurt' }] });
  expect(heard(exchange('heal'))).toEqual({ impact: [{ stinger: 'heal' }] });
  expect(heard(exchange('bank'))).toEqual({ impact: [{ stinger: 'tokens' }] });
  expect(heard(exchange('prepare'))).toEqual({});
 });
 it('announces how the fight ended, and lets the Overlord have the last word when he won it', () => {
  type Ended = Pick<GameView, 'battle' | 'winner'>;
  const over = (winner: string, first = 'horde', more: object = {}) => ({ battle: { kind: 'pve', stage: 'over', first, winner, ...more } }) as unknown as Ended;
  expect(battleOutcome(p, over('horde'))).toEqual([{ stinger: 'triumph', voice: 'battle-won' }]);
  expect(battleOutcome(p, over('alliance'))).toEqual([{ stinger: 'defeat', voice: 'battle-lost' }]);
  expect(battleOutcome(p, over('alliance', 'horde', { boss: 'kelthuzad' }))).toEqual([{ stinger: 'defeat', voice: 'taunt-kelthuzad' }]);
  expect(battleOutcome(p, over('alliance', 'horde', { boss: 'kazzak' }))).toEqual([{ stinger: 'defeat', voice: 'taunt-kazzak' }]);
  // A world boss that is not the Overlord has no remark of its own.
  expect(battleOutcome(p, over('alliance', 'horde', { boss: 'the-old-snake' }))).toEqual([{ stinger: 'defeat', voice: 'battle-lost' }]);
  expect(battleOutcome(p, over('alliance', 'horde', { kind: 'pvp' }))).toEqual([{ stinger: 'triumph', voice: 'battle-won' }]);
  expect(battleOutcome(p, over('draw'))).toEqual([{ stinger: 'defeat' }]);
  // Not while it lasts, and not when it ended the campaign: that has its fanfare.
  expect(battleOutcome(p, { battle: { kind: 'pve', stage: 'defense', first: 'horde' } } as never)).toEqual([]);
  expect(battleOutcome(p, { ...over('horde'), winner: 'horde' })).toEqual([]);
  expect(battleOutcome(p, {} as never)).toEqual([]);
 });
});

describe('the sound of a character’s own action', () => {
 const WARRIOR = 'grumbaz-crowsblood';
 const play = (change: (s: ReturnType<typeof createGame>) => void, find: (c: Command) => boolean) => {
  const s = createGame(p, DEFAULT_SETUP); change(s);
  const c = legalActions(p, s).find(find)!; expect(c, 'a legal command').toBeDefined();
  return actionCue(p, s, apply(p, s, c), c);
 };
 it('is steps on the road and wings on a flight path', () => {
  expect(play(() => {}, c => c.type === 'travel' && c.hero === WARRIOR && c.path.length === 1)).toEqual({ stinger: 'steps' });
  // Brill and Caer Darrow share no border: the Horde flies between them.
  expect(play(() => {}, c => c.type === 'travel' && c.hero === WARRIOR && c.path.at(-1) === 'caer')).toEqual({ stinger: 'wings' });
  expect(play(() => {}, c => c.type === 'travel' && c.hero === WARRIOR && !c.path.length)).toBeUndefined();
 });
 it('is rising notes for a rest, a page and the trainer for training, the bell and the merchant in town', () => {
  expect(play(s => { s.heroes.find(h => h.id === WARRIOR)!.health = 1; }, c => c.type === 'rest' && c.hero === WARRIOR)).toEqual({ stinger: 'heal' });
  expect(play(() => {}, c => c.type === 'train' && c.hero === WARRIOR && c.cards.length === 1)).toEqual({ stinger: 'page', voice: 'train' });
  expect(play(() => {}, c => c.type === 'town' && c.hero === WARRIOR && c.operations.length > 0)).toEqual({ stinger: 'bell', sfx: 'coins', voice: 'town' });
  // A visit that buys and sells nothing has no word from the merchant.
  expect(play(s => { s.heroes.find(h => h.id === WARRIOR)!.health = 1; }, c => c.type === 'town' && c.hero === WARRIOR && !c.operations.length)).toEqual({ stinger: 'bell' });
 });
 it('is a buckle when equipment changes and nothing when it does not', () => {
  const s = createGame(p, DEFAULT_SETUP), h = s.heroes.find(h => h.id === WARRIOR)!, same: Command = { type: 'manage', hero: WARRIOR, slots: h.slots, discard: [] };
  const changed = structuredClone(s); changed.revision++; changed.heroes.find(v => v.id === WARRIOR)!.slots = h.slots.map((slot, i) => i === 1 ? { ...slot, card: 'something-new' } : slot);
  expect(actionCue(p, s, changed, same)).toEqual({ stinger: 'equip' });
  expect(actionCue(p, s, structuredClone(s), same)).toBeUndefined();
  expect(actionCue(p, s, s, { type: 'endActions' })).toBeUndefined();
 });
});

