import { capacity, card, character, faction } from '../rules/common';
import type { Command, ContentPack, Faction } from '../rules/model';
import type { GameView } from '../rules/view';

/** What the stage reads of a game: public fields only, so the engine's state and a player's view both fit. */
export type StageView = Pick<GameView, 'pack' | 'revision' | 'phase' | 'faction' | 'turn' | 'lap' | 'variants' | 'winner' | 'heroes' | 'enemies' | 'log' | 'completed' | 'quests' | 'eventDiscard' | 'overlord' | 'wars' | 'merchant'> & { eventFlow?: { steps: unknown[] }; auction?: unknown };
import type { Sfx, Voice } from './audio';
import { eventText, regionName, rewardText } from './event-text';
import { foeName } from './hints';

/** Short sounds made in the browser for the steps that have no recording: see audio.tsx › stinger. */
export type Stinger = 'steps' | 'horn' | 'drum' | 'chime' | 'page' | 'omen' | 'thud';
export type BeatArt = { kind: 'event' | 'quest' | 'hero' | 'overlord' | 'faction' | 'card'; id: string };
/**
 * One thing that happened at the table, shown by itself before the next one: an Event card turned over, a character's
 * journey, a new quest, the hand-over of the turn. `card` beats stand in the middle with the printed card; `banner`
 * beats run along the top of the board and leave the map visible.
 */
export interface Beat {
 id: string;
 kind: 'event' | 'war' | 'new-quest' | 'quest-done' | 'level' | 'fallen' | 'overlord' | 'turn' | 'travel' | 'pass' | 'rest' | 'train' | 'town' | 'challenge' | 'power' | 'talent' | 'loot' | 'merchant';
 size: 'card' | 'banner';
 eyebrow: string; title: string; lines: string[];
 art?: BeatArt;
 /** Where on the map it happened, and for a journey the way there. */
 region?: string; from?: string; path?: string[];
 cue: { sfx?: Sfx; voice?: Voice; stinger?: Stinger };
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

/** What a bot's own action looks like to the people watching. A player's own action needs no announcement: he just did it. */
function action(p: ContentPack, prev: StageView, next: StageView, c: Command): Omit<Beat, 'id'> | undefined {
 if (!('hero' in c)) return;
 const name = first(p, c.hero), before = prev.heroes.find(h => h.id === c.hero), after = next.heroes.find(h => h.id === c.hero);
 if (!before || !after) return;
 const art: BeatArt = { kind: 'hero', id: c.hero }, eyebrow = `${side(faction(p, c.hero))} · ${name}’s action`;
 switch (c.type) {
  case 'travel': {
   if (!c.path.length) return { kind: 'pass', size: 'banner', eyebrow, title: `${name} passes`, lines: ['No action is taken.'], art, region: before.location, cue: {}, hold: 1100 };
   const to = c.path.at(-1)!, flew = [before.location, ...c.path].some((id, i, all) => i > 0 && !p.regions.find(r => r.id === all[i - 1])?.neighbors.includes(id));
   const blue = next.enemies.some(e => e.region === to && e.color === 'blue');
   return { kind: 'travel', size: 'banner', eyebrow, title: `${name} travels to ${regionName(to)}`, art, region: to, from: before.location, path: c.path, cue: { stinger: 'steps' }, hold: 1900,
    lines: [c.power ? `With ${card(p, c.power).name}.` : flew ? 'By flight path.' : c.path.length > 1 ? `Through ${regionName(c.path[0])}.` : `From ${regionName(before.location)}.`, ...(blue ? ['Blue creatures stop the journey: the next action must be a Challenge.'] : [])] };
  }
  case 'rest': {
   const health = after.health - before.health, energy = after.energy - before.energy;
   return { kind: 'rest', size: 'banner', eyebrow, title: `${name} rests`, art, region: after.location, cue: { stinger: 'chime' }, hold: 1700,
    lines: [[health > 0 ? `+${health} health` : '', energy > 0 ? `+${energy} energy` : '', c.food ? `eats ${card(p, c.food).name}` : ''].filter(Boolean).join(' · ') || 'Nothing to recover.'] };
  }
  case 'train': return { kind: 'train', size: 'banner', eyebrow, title: `${name} trains`, art, region: after.location, cue: { stinger: 'page' }, hold: 2000,
   lines: [`Learns ${listed(c.cards.map(id => card(p, id).name))}${before.gold > after.gold ? ` for ${before.gold - after.gold} gold` : ''}.`] };
  case 'town': {
   const done = c.operations.map(o => `${o.op === 'buy' ? 'buys' : o.op === 'sell' ? 'sells' : 'learns'} ${card(p, o.card).name}`), health = after.health - before.health, energy = after.energy - before.energy;
   return { kind: 'town', size: 'banner', eyebrow, title: `${name} visits the town`, art, region: after.location, cue: { sfx: 'coins' }, hold: 2200,
    lines: [[...done, health > 0 ? `recovers ${health} health` : '', energy > 0 ? `recovers ${energy} energy` : ''].filter(Boolean).join(' · ') || 'Looks around and leaves.'] };
  }
  case 'challenge': return { kind: 'challenge', size: 'banner', eyebrow: `${side(faction(p, c.hero))} · Challenge`, art, region: before.location, cue: {}, hold: 2000,
   title: `${listed([c.hero, ...c.allies].map(id => first(p, id)))} ${c.allies.length ? 'challenge' : 'challenges'} ${foeName(p, prev, c)}`, lines: [`In ${regionName(before.location)}.`] };
  case 'power-action': return { kind: 'power', size: 'banner', eyebrow, title: `${name} uses ${card(p, c.card).name}`, lines: [], art, region: after.location, cue: { stinger: 'chime' }, hold: 1700 };
  case 'portal': return { kind: 'power', size: 'banner', eyebrow, title: `${name} opens a Portal`, lines: [`To ${regionName(after.location)}${c.allies.length ? `, with ${listed(c.allies.map(id => first(p, id)))}` : ''}.`], art, region: after.location, from: before.location, cue: { stinger: 'chime' }, hold: 1900 };
  case 'summon': return { kind: 'power', size: 'banner', eyebrow, title: `${name} summons ${first(p, c.target)}`, lines: [`To ${regionName(after.location)}.`], art, region: after.location, cue: { stinger: 'chime' }, hold: 1900 };
  case 'talent': return { kind: 'talent', size: 'banner', eyebrow: `${side(faction(p, c.hero))} · New talent`, title: `${name} learns ${card(p, c.card).name}`, lines: [], art: { kind: 'card', id: c.card }, cue: { stinger: 'page' }, hold: 1800 };
  case 'reward': return { kind: 'loot', size: 'banner', eyebrow: `${side(faction(p, c.hero))} · Reward`, title: `${name} takes ${card(p, c.card).name}`, lines: [], art: { kind: 'card', id: c.card }, cue: { stinger: 'page' }, hold: 1700 };
 }
}

/**
 * The steps to show for one change of the game, in the order they happened. Nothing for a change that is not a step
 * forward (a new or loaded campaign, an undo), and nothing inside a combat: the combat window has its own staging.
 * `watching` is false for the player's own command: his action is not announced back to him, its consequences are.
 */
export function beats(p: ContentPack, prev: StageView | undefined, next: StageView, command: Command | undefined, watching: boolean): Beat[] {
 if (!prev || prev === next || next.pack !== prev.pack || next.revision <= prev.revision || next.revision - prev.revision > 30) return [];
 if (prev.phase === 'combat' && next.phase === 'combat') return [];
 const out: Omit<Beat, 'id'>[] = [], was = (id: string) => prev.heroes.find(h => h.id === id);
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
  out.push({ kind: 'level', size: 'banner', eyebrow: `${side(faction(p, h.id))} · Level up`, title: `${first(p, h.id)} reaches level ${h.level}`, lines: [`Capacity ${cap.health} health and ${cap.energy} energy, restored in full. A talent follows.`], art: { kind: 'hero', id: h.id }, region: h.location, cue: { sfx: 'levelup', voice: 'level' }, hold: 2800 });
 }

 // Event cards turned over in this step, each with what it set in motion.
 const drawn = next.eventDiscard.slice(prev.eventDiscard.length), moved = next.overlord.region !== prev.overlord.region, boss = p.overlords.find(o => o.id === next.overlord.id);
 drawn.forEach((id, i) => {
  const e = p.events.find(e => e.id === id); if (!e) return;
  const last = i === drawn.length - 1, waiting = last && (!!next.eventFlow?.steps.length || !!next.auction);
  out.push({ kind: 'event', size: 'card', eyebrow: `Event card · end of the ${side(prev.faction)}’s turn`, title: e.name, art: { kind: 'event', id }, region: e.boss?.region, cue: { sfx: 'card', voice: 'event', stinger: 'drum' }, hold: 6200,
   lines: [eventText(e), ...(e.bonus && !last ? ['Bonus card: another Event follows.'] : []), ...(last && moved && boss ? [`${boss.name} moves to ${regionName(next.overlord.region)}.`] : []), ...(waiting ? ['A decision follows.'] : [])] });
 });
 if (moved && boss && !drawn.length) out.push({ kind: 'overlord', size: 'banner', eyebrow: 'The Overlord', title: `${boss.name} moves to ${regionName(next.overlord.region)}`, lines: [], art: { kind: 'overlord', id: boss.id }, region: next.overlord.region, cue: { stinger: 'omen' }, hold: 2600 });
 for (const text of notes.filter(text => / wins (The|the) .*War/.test(text) || text.includes('wins the War'))) {
  const f = text.startsWith('The Horde') ? 'horde' : 'alliance', war = prev.wars.find(w => !next.wars.some(v => v.id === w.id));
  out.push({ kind: 'war', size: 'card', eyebrow: `${side(f)} wins a War`, title: p.events.find(e => e.id === war?.id)?.name ?? 'The War', lines: [text.replace(/^.*?, holding /, 'Holding ')], art: war ? { kind: 'event', id: war.id } : { kind: 'faction', id: f }, region: war?.regions[0], cue: { stinger: 'horn', sfx: 'coins' }, hold: 4600 });
 }

 const fresh = next.merchant.filter(id => !prev.merchant.includes(id));
 if (fresh.length && next.turn !== prev.turn) out.push({ kind: 'merchant', size: 'banner', eyebrow: 'The merchant', title: `${plural(fresh.length, 'new item')} at the merchant`, lines: [listed(fresh.slice(0, 4).map(id => card(p, id).name)) + (fresh.length > 4 ? ` and ${fresh.length - 4} more` : '') + '.'], art: { kind: 'card', id: fresh[0] }, cue: { sfx: 'coins' }, hold: 2400 });
 for (const id of next.quests.filter(id => !prev.quests.includes(id))) {
  const q = p.quests.find(q => q.id === id); if (!q) continue;
  const where = [...new Set(q.spawns.map(s => regionName(s.region)))];
  out.push({ kind: 'new-quest', size: 'card', eyebrow: `New ${side(q.faction)} quest · ${q.tier}`, title: q.name, art: { kind: 'quest', id }, region: q.spawns.find(s => s.color !== 'blue')?.region ?? q.spawns[0]?.region, cue: { sfx: 'card', voice: 'new-quest' }, hold: 4200,
   lines: [q.spawns.map(s => `${s.count} × ${p.creatures.find(c => c.id === s.creature)?.name ?? s.creature} (${s.color})`).join(' · '), `Creatures appear in ${listed(where)}.`, `Reward: ${rewardText(q.reward)}.`] });
 }

 if (next.phase === 'actions' && !next.winner && (next.faction !== prev.faction || next.turn !== prev.turn)) {
  const lap = (next.lap ?? 1) > (prev.lap ?? 1);
  out.push({ kind: 'turn', size: 'banner', eyebrow: lap ? `Campaign lap ${next.lap}` : 'Faction turn', title: `${side(next.faction)} · turn ${next.turn}${next.variants?.overlordOnly ? '' : ' of 30'}`, lines: ['Each character takes two actions.'], art: { kind: 'faction', id: next.faction }, cue: { voice: `turn-${next.faction}` as Voice, stinger: 'horn' }, hold: 2400 });
 }
 return out.map((beat, i) => ({ ...beat, id: `${next.revision}:${i}` }));
}

/** The cues the stage plays with its own beats; the immediate cue of the same change leaves them out. */
export const STAGED_VOICES: Voice[] = ['event', 'new-quest', 'quest', 'level', 'fallen', 'turn-horde', 'turn-alliance'];
