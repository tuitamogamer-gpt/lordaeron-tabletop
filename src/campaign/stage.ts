import { capacity, card, character, faction } from '../rules/common';
import type { Card, Command, ContentPack, Faction } from '../rules/model';
import type { GameView } from '../rules/view';

/** What the stage reads of a game: public fields only, so the engine's state and a player's view both fit. */
export type StageView = Pick<GameView, 'pack' | 'revision' | 'phase' | 'faction' | 'turn' | 'lap' | 'variants' | 'winner' | 'heroes' | 'enemies' | 'log' | 'completed' | 'quests' | 'eventDiscard' | 'overlord' | 'wars' | 'merchant'> & { eventFlow?: { event?: string; steps: unknown[] }; auction?: { item?: string }; reward?: { offered: string[] } };
import { eventVoice, taunt, warWinner, type Cue, type Voice } from './audio';
import { eventText, regionName, rewardText } from './event-text';
import { foeName } from './hints';

/** Short sounds made in the browser for the steps that have no recording: see audio.tsx › stinger. */
export type Stinger = 'steps' | 'horn' | 'drum' | 'chime' | 'page' | 'omen' | 'thud'
 | 'heal' | 'tokens' | 'volley' | 'power' | 'spark' | 'triumph' | 'defeat' | 'wings' | 'bell' | 'portal' | 'wardrums' | 'equip';
export type BeatArt = { kind: 'event' | 'quest' | 'hero' | 'overlord' | 'faction' | 'card'; id: string };
/**
 * One thing that happened at the table, shown by itself before the next one: an Event card turned over, a character's
 * journey, a new quest, the hand-over of the turn. `card` beats stand in the middle with the printed card; `banner`
 * beats run along the top of the board and leave the map visible.
 */
export interface Beat {
 id: string;
 kind: 'event' | 'war' | 'new-quest' | 'quest-done' | 'level' | 'fallen' | 'overlord' | 'turn' | 'travel' | 'pass' | 'rest' | 'train' | 'town' | 'challenge' | 'power' | 'talent' | 'loot' | 'merchant' | 'choice';
 size: 'card' | 'banner';
 eyebrow: string; title: string; lines: string[];
 art?: BeatArt;
 /** Where on the map it happened, and for a journey the way there. */
 region?: string; from?: string; path?: string[];
 cue: Cue;
 /** Milliseconds on screen at the normal pace. */
 hold: number;
}

export type Pace = 'relaxed' | 'normal' | 'brisk' | 'off';
export const PACES: { id: Pace; label: string; note: string; factor: number }[] = [
 { id: 'relaxed', label: 'Relaxed', note: 'Every step stays longer', factor: 1.5 },
 { id: 'normal', label: 'Normal', note: 'Each step is shown in turn', factor: 1 },
 { id: 'brisk', label: 'Brisk', note: 'Short notices', factor: 0.55 },
 { id: 'off', label: 'Off', note: 'Nothing is announced', factor: 0 },
];
export const paceFactor = (pace: Pace) => PACES.find(v => v.id === pace)?.factor ?? 1;
const PACE_KEY = 'lordaeron-pace-v1';
// Tests of the rest of the table run without announcements unless they ask for them, as they run without the scans.
const DEFAULT_PACE: Pace = import.meta.env?.MODE === 'test' ? 'off' : 'normal';
export function loadPace(): Pace { try { const saved = localStorage.getItem(PACE_KEY); return PACES.some(v => v.id === saved) ? saved as Pace : DEFAULT_PACE; } catch { return DEFAULT_PACE; } }
export function savePace(pace: Pace) { try { localStorage.setItem(PACE_KEY, pace); } catch { /* the choice lasts until the tab closes */ } }

const side = (f: Faction | string) => f === 'horde' ? 'Horde' : 'Alliance';
const first = (p: ContentPack, id: string) => character(p, id).name.split(' ')[0];
const listed = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** What kind of card it is, in a few words: "Wand · ranged weapon", "Leather · armor". The printed face beside it has the rest. */
const ITEM_KINDS: Record<string, string> = { melee: 'melee weapon', ranged: 'ranged weapon', armor: 'armor', bag: 'bag item', general: 'item' };
const cardKind = (c: Card) => [c.trait, c.kind === 'item' ? ITEM_KINDS[c.type] ?? 'item' : c.kind === 'talent' ? `level ${c.level} talent` : `level ${c.level} power`].filter(Boolean).join(' · ');

/** Whether a journey used a flight path: one of its legs joins two regions that share no border. */
const flew = (p: ContentPack, from: string, path: string[]) => [from, ...path].some((id, i, all) => i > 0 && !p.regions.find(r => r.id === all[i - 1])?.neighbors.includes(id));
/**
 * What a character's own action sounds like, whoever took it: steps or wings for a journey, rising notes for a rest, a page and
 * the trainer's word for training, the town's bell (with coins and the merchant's word when something was bought or sold),
 * a portal, a buckle for changed equipment. A bot's action is heard with its announcement, a player's own at once.
 */
export function actionCue(p: ContentPack, prev: StageView, next: StageView, c: Command): Cue | undefined {
 if (!('hero' in c)) return;
 const before = prev.heroes.find(h => h.id === c.hero), after = next.heroes.find(h => h.id === c.hero);
 if (!before || !after) return;
 switch (c.type) {
  case 'travel': return c.path.length ? { stinger: flew(p, before.location, c.path) ? 'wings' : 'steps' } : undefined;
  case 'rest': return { stinger: 'heal' };
  case 'train': return { stinger: 'page', voice: 'train' };
  case 'town': return c.operations.length ? { stinger: 'bell', sfx: 'coins', voice: 'town' } : { stinger: 'bell' };
  case 'power-action': return { stinger: 'chime' };
  case 'portal': case 'summon': return { stinger: 'portal' };
  case 'talent': case 'reward': return { stinger: 'page' };
  case 'manage': return JSON.stringify(before.slots) !== JSON.stringify(after.slots) ? { stinger: 'equip' } : undefined;
 }
}

/** A step that is about one card stands in the middle with that card's printed face; without a card it is a banner with the character. */
const shown = (id: string | undefined, fallback: BeatArt): Pick<Beat, 'size' | 'art'> => id ? { size: 'card', art: { kind: 'card', id } } : { size: 'banner', art: fallback };
/** What a bot's own action looks like to the people watching. A player's own action needs no announcement: he just did it. */
function action(p: ContentPack, prev: StageView, next: StageView, c: Command): Omit<Beat, 'id'> | undefined {
 if (!('hero' in c)) return;
 const name = first(p, c.hero), before = prev.heroes.find(h => h.id === c.hero), after = next.heroes.find(h => h.id === c.hero);
 if (!before || !after) return;
 const art: BeatArt = { kind: 'hero', id: c.hero }, eyebrow = `${side(faction(p, c.hero))} · ${name}’s action`, cue = actionCue(p, prev, next, c) ?? {};
 switch (c.type) {
  case 'travel': {
   if (!c.path.length) return { kind: 'pass', size: 'banner', eyebrow, title: `${name} passes`, lines: ['No action is taken.'], art, region: before.location, cue: {}, hold: 1100 };
   const to = c.path.at(-1)!, flown = flew(p, before.location, c.path);
   const blue = next.enemies.some(e => e.region === to && e.color === 'blue');
   return { kind: 'travel', size: 'banner', eyebrow, title: `${name} travels to ${regionName(to)}`, art, region: to, from: before.location, path: c.path, cue, hold: 1900,
    lines: [c.power ? `With ${card(p, c.power).name}.` : flown ? 'By flight path.' : c.path.length > 1 ? `Through ${regionName(c.path[0])}.` : `From ${regionName(before.location)}.`, ...(blue ? ['Blue creatures stop the journey: the next action must be a Challenge.'] : [])] };
  }
  case 'rest': {
   const health = after.health - before.health, energy = after.energy - before.energy;
   return { kind: 'rest', size: 'banner', eyebrow, title: `${name} rests`, art, region: after.location, cue, hold: 1700,
    lines: [[health > 0 ? `+${health} health` : '', energy > 0 ? `+${energy} energy` : '', c.food ? `eats ${card(p, c.food).name}` : ''].filter(Boolean).join(' · ') || 'Nothing to recover.'] };
  }
  // What a bot learns or buys is shown as the card itself, so that the people watching can read it.
  case 'train': return { kind: 'train', ...shown(c.cards[0], art), eyebrow, title: `${name} trains`, region: after.location, cue, hold: c.cards.length ? 3600 : 2000,
   lines: [`Learns ${listed(c.cards.map(id => card(p, id).name))}${before.gold > after.gold ? ` for ${before.gold - after.gold} gold` : ''}.`] };
  case 'town': {
   const done = c.operations.map(o => `${o.op === 'buy' ? 'buys' : o.op === 'sell' ? 'sells' : 'learns'} ${card(p, o.card).name}`), health = after.health - before.health, energy = after.energy - before.energy;
   const got = c.operations.find(o => o.op !== 'sell')?.card;
   return { kind: 'town', ...shown(got, art), eyebrow, title: `${name} visits the town`, region: after.location, cue, hold: got ? 3600 : 2200,
    lines: [[...done, health > 0 ? `recovers ${health} health` : '', energy > 0 ? `recovers ${energy} energy` : ''].filter(Boolean).join(' · ') || 'Looks around and leaves.'] };
  }
  case 'challenge': return { kind: 'challenge', size: 'banner', eyebrow: `${side(faction(p, c.hero))} · Challenge`, art, region: before.location, cue: {}, hold: 2000,
   title: `${listed([c.hero, ...c.allies].map(id => first(p, id)))} ${c.allies.length ? 'challenge' : 'challenges'} ${foeName(p, prev, c)}`, lines: [`In ${regionName(before.location)}.`] };
  case 'power-action': return { kind: 'power', size: 'banner', eyebrow, title: `${name} uses ${card(p, c.card).name}`, lines: [], art, region: after.location, cue, hold: 1700 };
  case 'portal': return { kind: 'power', size: 'banner', eyebrow, title: `${name} opens a Portal`, lines: [`To ${regionName(after.location)}${c.allies.length ? `, with ${listed(c.allies.map(id => first(p, id)))}` : ''}.`], art, region: after.location, from: before.location, cue, hold: 1900 };
  case 'summon': return { kind: 'power', size: 'banner', eyebrow, title: `${name} summons ${first(p, c.target)}`, lines: [`To ${regionName(after.location)}.`], art, region: after.location, cue, hold: 1900 };
  case 'talent': return { kind: 'talent', size: 'card', eyebrow: `${side(faction(p, c.hero))} · New talent`, title: `${name} learns ${card(p, c.card).name}`, lines: [`${cardKind(card(p, c.card))}, kept for the rest of the campaign.`], art: { kind: 'card', id: c.card }, cue, hold: 3800 };
  case 'reward': {
   // The cards the party could choose from lay face up until this choice: say which were left.
   const others = (prev.reward?.offered ?? []).filter(id => id !== c.card).map(id => card(p, id).name);
   return { kind: 'loot', size: 'card', eyebrow: `${side(faction(p, c.hero))} · Quest reward`, title: `${name} takes ${card(p, c.card).name}`, art: { kind: 'card', id: c.card }, cue, hold: 4200,
    lines: [`${cardKind(card(p, c.card))}.`, ...(others.length ? [`Also offered: ${listed(others)}, returned to ${others.length > 1 ? 'their' : 'its'} deck.`] : []), ...(c.discard ? [`${card(p, c.discard).name} is discarded to make room in the bag.`] : [])] };
  }
  case 'event-choice': {
   // What a bot answers to an Event card that asks each character in turn: in a few words, with what it brought him.
   const a = c.choice, quest = p.quests.find(q => q.id === a.quest), moved = next.enemies.find(e => e.id === a.enemy), creature = moved && p.creatures.find(v => v.id === moved.creature);
   const what = a.mode === 'skip' ? 'declines' : a.mode === 'gold' ? 'takes the gold' : a.mode === 'recover' ? 'recovers' : a.mode === 'talents' ? 'replaces talents'
    : quest ? `replaces ${quest.name} with a ${a.tier} quest` : creature && a.region ? `moves the ${creature.name} to ${regionName(a.region)}` : a.card ? `chooses ${card(p, a.card).name}` : a.region ? `chooses ${regionName(a.region)}` : 'decides';
   const gains = [[after.gold - before.gold, 'gold'], [after.health - before.health, 'health'], [after.energy - before.energy, 'energy']] as const;
   return { kind: 'choice', size: 'banner', eyebrow: `${side(faction(p, c.hero))} · ${p.events.find(e => e.id === prev.eventFlow?.event)?.name ?? 'Event'}`, title: `${name} ${what}`, art, region: after.location, cue: {}, hold: 1500,
    lines: [gains.filter(([n]) => n).map(([n, word]) => `${n > 0 ? '+' : '−'}${Math.abs(n)} ${word}`).join(' · ')].filter(Boolean) };
  }
  case 'loot': return { kind: 'loot', size: 'card', eyebrow: `${side(faction(p, c.hero))} · Spoils of the battle`, title: `${name} takes ${card(p, c.card).name} from ${first(p, c.from)}`, art: { kind: 'card', id: c.card }, cue: { stinger: 'equip' }, hold: 3800,
   lines: [`${cardKind(card(p, c.card))}.`, ...(c.discard ? [`${card(p, c.discard).name} is discarded to make room in the bag.`] : [])] };
 }
}

/**
 * The steps to show for one change of the game, in the order they happened. Nothing for a change that is not a step
 * forward (a new or loaded campaign, an undo), and nothing inside a combat: the combat window has its own staging.
 * `watching` is false for the player's own command: his action is not announced back to him, its consequences are.
 */
export function beats(p: ContentPack, prev: StageView | undefined, next: StageView, command: Command | undefined, watching: boolean): Beat[] {
 if (!prev || prev === next || next.pack !== prev.pack || next.revision <= prev.revision || next.revision - prev.revision > 30) return [];
 const out: Omit<Beat, 'id'>[] = [], was = (id: string) => prev.heroes.find(h => h.id === id);
 // Inside a combat only the spoils a bot takes from a defeated character are announced here; the rest is the combat window's.
 if (prev.phase === 'combat' && next.phase === 'combat') {
  const spoils = command?.type === 'loot' && watching ? action(p, prev, next, command) : undefined;
  return spoils ? [{ ...spoils, id: `${next.revision}:0` }] : [];
 }
 if (command && watching && prev.phase !== 'combat') { const done = action(p, prev, next, command); if (done) out.push(done); }

 // What the chronicle recorded since: a defeat on the way, a War won.
 const since = prev.log.at(-1)?.id ?? 0, notes = next.log.filter(entry => entry.id > since).map(entry => entry.text);
 for (const h of next.heroes) {
  if (!notes.some(text => text.startsWith(`${character(p, h.id).name} is defeated`))) continue;
  out.push({ kind: 'fallen', size: 'banner', eyebrow: `${side(faction(p, h.id))} · Defeat`, title: `${first(p, h.id)} is defeated`, lines: [`Returns to ${regionName(h.location)} with 1 health and 1 energy.`], art: { kind: 'hero', id: h.id }, region: h.location, cue: { voice: 'fallen', stinger: 'thud' }, hold: 2600 });
 }
 for (const id of next.completed.filter(id => !prev.completed.includes(id))) {
  const q = p.quests.find(q => q.id === id); if (!q) continue;
  out.push({ kind: 'quest-done', size: 'card', eyebrow: `${side(q.faction)} quest complete`, title: q.name, lines: [`Reward: ${rewardText(q.reward)}.`], art: { kind: 'quest', id }, cue: { voice: 'quest', stinger: 'chime' }, hold: 3200 });
 }
 for (const h of next.heroes) {
  const old = was(h.id); if (!old || h.level <= old.level) continue;
  const cap = capacity(p, h);
  out.push({ kind: 'level', size: 'banner', eyebrow: `${side(faction(p, h.id))} · Level up`, title: `${first(p, h.id)} reaches level ${h.level}`, lines: [`Capacity ${cap.health} health and ${cap.energy} energy, restored in full. A talent follows.`], art: { kind: 'hero', id: h.id }, region: h.location, cue: { sfx: 'levelup', voice: h.level === 5 ? 'level-5' : 'level' }, hold: 2800 });
 }

 // Event cards turned over in this step, each with what it set in motion.
 const drawn = next.eventDiscard.slice(prev.eventDiscard.length), moved = next.overlord.region !== prev.overlord.region, boss = p.overlords.find(o => o.id === next.overlord.id);
 drawn.forEach((id, i) => {
  const e = p.events.find(e => e.id === id); if (!e) return;
  const last = i === drawn.length - 1, waiting = last && (!!next.eventFlow?.steps.length || !!next.auction);
  out.push({ kind: 'event', size: 'card', eyebrow: `Event card · end of the ${side(prev.faction)}’s turn`, title: e.name, art: { kind: 'event', id }, region: e.boss?.region, hold: 6200,
   // The card is announced by the line of its kind, a War by its drums.
   cue: { sfx: 'card', voice: eventVoice(p, id, [...prev.eventDiscard, ...drawn.slice(0, i)]), stinger: e.script === 'war' ? 'wardrums' : 'drum' },
   lines: [eventText(e), ...(e.bonus && !last ? ['Bonus card: another Event follows.'] : []), ...(last && moved && boss ? [`${boss.name} moves to ${regionName(next.overlord.region)}.`] : []), ...(waiting ? ['A decision follows.'] : [])] });
 });
 if (moved && boss && !drawn.length) out.push({ kind: 'overlord', size: 'banner', eyebrow: 'The Overlord', title: `${boss.name} moves to ${regionName(next.overlord.region)}`, lines: [], art: { kind: 'overlord', id: boss.id }, region: next.overlord.region, cue: { stinger: 'omen', voice: taunt(p, boss.id) }, hold: 2600 });
 for (const text of notes.filter(text => / wins (The|the) .*War/.test(text) || text.includes('wins the War'))) {
  const f = warWinner(text) ?? (text.startsWith('The Horde') ? 'horde' : 'alliance'), war = prev.wars.find(w => !next.wars.some(v => v.id === w.id));
  out.push({ kind: 'war', size: 'card', eyebrow: `${side(f)} wins a War`, title: p.events.find(e => e.id === war?.id)?.name ?? 'The War', lines: [text.replace(/^.*?, holding /, 'Holding ')], art: war ? { kind: 'event', id: war.id } : { kind: 'faction', id: f }, region: war?.regions[0], cue: { stinger: 'horn', sfx: 'coins', voice: `war-won-${f}` }, hold: 4600 });
 }

 // The auction's end: the bids were sealed, so who won, and for how much, is news to everyone.
 const sold = notes.map(text => /^(.+) wins the auction for .+ with (\d+) gold\.$/.exec(text)).find(Boolean), lot = prev.auction?.item, winner = sold && next.heroes.find(h => character(p, h.id).name === sold[1]);
 if (sold && lot && winner) out.push({ kind: 'loot', size: 'card', eyebrow: 'Auction house', title: `${first(p, winner.id)} wins ${card(p, lot).name}`, lines: [`For ${sold[2]} gold. The other bidders pay nothing.`], art: { kind: 'card', id: lot }, region: winner.location, cue: { sfx: 'coins' }, hold: 4200 });

 const fresh = next.merchant.filter(id => !prev.merchant.includes(id));
 if (fresh.length && next.turn !== prev.turn) out.push({ kind: 'merchant', size: 'banner', eyebrow: 'The merchant', title: `${plural(fresh.length, 'new item')} at the merchant`, lines: [listed(fresh.slice(0, 4).map(id => card(p, id).name)) + (fresh.length > 4 ? ` and ${fresh.length - 4} more` : '') + '.'], art: { kind: 'card', id: fresh[0] }, cue: { sfx: 'coins', voice: 'merchant' }, hold: 2400 });
 for (const id of next.quests.filter(id => !prev.quests.includes(id))) {
  const q = p.quests.find(q => q.id === id); if (!q) continue;
  const where = [...new Set(q.spawns.map(s => regionName(s.region)))];
  out.push({ kind: 'new-quest', size: 'card', eyebrow: `New ${side(q.faction)} quest · ${q.tier}`, title: q.name, art: { kind: 'quest', id }, region: q.spawns.find(s => s.color !== 'blue')?.region ?? q.spawns[0]?.region, cue: { sfx: 'card', voice: 'new-quest' }, hold: 4200,
   lines: [q.spawns.map(s => `${s.count} × ${p.creatures.find(c => c.id === s.creature)?.name ?? s.creature} (${s.color})`).join(' · '), `Creatures appear in ${listed(where)}.`, `Reward: ${rewardText(q.reward)}.`] });
 }

 if (next.phase === 'actions' && !next.winner && (next.faction !== prev.faction || next.turn !== prev.turn)) {
  const lap = (next.lap ?? 1) > (prev.lap ?? 1);
  out.push({ kind: 'turn', size: 'banner', eyebrow: lap ? `Campaign lap ${next.lap}` : 'Faction turn', title: `${side(next.faction)} · turn ${next.turn}${next.variants?.overlordOnly ? '' : ' of 30'}`, lines: ['Each character takes two actions.'], art: { kind: 'faction', id: next.faction }, cue: { voice: lap ? 'lap' : `turn-${next.faction}` as Voice, stinger: 'horn' }, hold: 2400 });
 }
 return out.map((beat, i) => ({ ...beat, id: `${next.revision}:${i}` }));
}

/**
 * The cues the stage plays with its own beats; the immediate cue of the same change leaves them out. Kazzak's remark is not
 * among them: it also answers a look at one of his clues, which has no beat.
 */
export const STAGED_VOICES: Voice[] = ['event', 'auction', 'event-war', 'event-boss', 'event-bounty', 'event-hatreds', 'event-horizons', 'event-zeppelin', 'event-traders', 'event-beasts',
 'event-professions', 'event-retrain', 'event-subterfuge', 'event-ears', 'event-cleanse', 'event-winds', 'taunt-kelthuzad', 'taunt-nefarian', 'war-won-horde', 'war-won-alliance',
 'merchant', 'lap', 'new-quest', 'quest', 'level', 'level-5', 'fallen', 'turn-horde', 'turn-alliance'];
