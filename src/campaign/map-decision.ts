import { BASE_PACK as pack } from '../data/base';
import { card, character, contentFor } from '../rules/common';
import type { Command, Faction } from '../rules/model';
import type { GameView } from '../rules/view';
import { eventText, regionName } from './event-text';

/**
 * A decision that is made on the board. Which piece goes where cannot be chosen from a list of names: the player has to see
 * the regions. The map is opened for it, lights what may be picked up and where it may go, and sends the choice (Map.tsx).
 */
export type MapDecision = {
 kind: 'beasts' | 'zeppelin' | 'nefarian' | 'respawn';
 /** Changes whenever the question does: the map then forgets what was picked for the previous one. */
 key: string;
 /** The Event card that asks, where one does. */
 event?: string;
 title: string;
 /** Who decides. */
 hero: string;
 /** What the card says. */
 rule: string;
 /** Which of several such choices this is: "Horde · group 1 of 2". */
 progress?: string;
 /** The pieces that may be picked up. Without them one given piece moves: `piece`, standing in `from`. */
 sources?: MapSource[];
 from?: string;
 piece?: { name: string; token: string };
 targets: MapTarget[];
 /** The word on the button that sends the choice. */
 verb: string;
 skip?: { command: Command; label: string };
 /** Other ways out that are not a place on the board: a healing potion instead of the graveyard. */
 extras: { command: Command; card: string; label: string }[];
};
/** A group of blue creatures: every creature of one kind in one region moves together. */
export type MapSource = { key: string; creature: string; name: string; region: string; count: number };
export type MapTarget = { region: string; command: Command; source?: string };

const first = (id: string) => character(pack, id).name.split(' ')[0];
const factionWord = (f?: Faction) => f === 'horde' ? 'Horde' : f === 'alliance' ? 'Alliance' : '';

/** The decision to make on the board, when the player owns one now. Every command in `legal` has been tried by the rules. */
export function mapDecision(state: GameView, legal: Command[]): MapDecision | undefined {
 const p = contentFor(pack, state);
 const event = state.eventFlow ? p.events.find(e => e.id === state.eventFlow!.event) : undefined;
 const respawns = legal.filter((c): c is Extract<Command, { type: 'respawn' }> => c.type === 'respawn');
 if (respawns.length) {
  const hero = state.respawns.find(id => respawns.some(c => c.hero === id)) ?? respawns[0].hero, h = state.heroes.find(v => v.id === hero)!;
  const extras = legal.filter((c): c is Extract<Command, { type: 'ability' }> => c.type === 'ability').map(c => ({
   command: c, card: c.card,
   label: `${first(c.hero)}: use ${card(p, c.card).name}${c.args?.target && c.args.target !== c.hero ? ` on ${first(c.args.target)}` : ''}${c.args?.health !== undefined ? ` (${c.args.health} health)` : ''} and stay`,
  }));
  return {
   kind: 'respawn', key: `respawn:${hero}`, event: event?.id, title: 'Hero revival', hero,
   rule: `${first(hero)} was defeated. Choose where ${first(hero)} returns: the faction’s starting region or the nearest graveyard.${extras.length ? ' A healing potion can still save this character.' : ''}${event ? ` ${event.name}: ${eventText(event)}` : ''}`,
   from: h.location, piece: { name: first(hero), token: `h:${hero}` },
   targets: respawns.filter(c => c.hero === hero).map(c => ({ region: c.region, command: c })), verb: 'Revive here', extras,
  };
 }
 const step = state.eventFlow?.steps[0];
 if (!step || !event) return undefined;
 const choices = legal.filter((c): c is Extract<Command, { type: 'event-choice' }> => c.type === 'event-choice' && c.hero === step.hero);
 const skipCommand = choices.find(c => c.choice.mode === 'skip');
 const base = { event: event.id, title: event.name, hero: step.hero, rule: eventText(event), extras: [], key: `${event.id}:${state.eventFlow!.steps.length}:${step.hero}` };
 if (step.kind === 'beasts') {
  const moves = choices.filter(c => c.choice.enemy && c.choice.region);
  if (!moves.length) return undefined;
  const sources = new Map<string, MapSource>(), targets: MapTarget[] = [];
  for (const c of moves) {
   const enemy = state.enemies.find(e => e.id === c.choice.enemy);
   if (!enemy) continue;
   const key = `${enemy.creature}:${enemy.region}`;
   if (!sources.has(key)) sources.set(key, { key, creature: enemy.creature, name: p.creatures.find(v => v.id === enemy.creature)?.name ?? enemy.creature, region: enemy.region, count: state.enemies.filter(e => e.color === 'blue' && e.region === enemy.region && e.creature === enemy.creature).length });
   targets.push({ region: c.choice.region!, command: c, source: key });
  }
  const left = state.eventFlow!.steps.filter(v => v.kind === 'beasts' && v.faction === step.faction).length;
  return { ...base, kind: 'beasts', progress: `${factionWord(step.faction)} · group ${Math.max(1, 3 - left)} of 2`, sources: [...sources.values()], targets, verb: 'Move the group here', skip: skipCommand && { command: skipCommand, label: 'Move no group' } };
 }
 if (step.kind === 'zeppelin' || step.kind === 'nefarian') {
  const targets = choices.filter(c => c.choice.region).map(c => ({ region: c.choice.region!, command: c as Command }));
  if (!targets.length) return undefined;
  if (step.kind === 'zeppelin') return { ...base, kind: 'zeppelin', from: state.heroes.find(h => h.id === step.hero)!.location, piece: { name: first(step.hero), token: `h:${step.hero}` }, targets, verb: 'Fly here', skip: skipCommand && { command: skipCommand, label: `${first(step.hero)} stays` } };
  const boss = p.overlords.find(o => o.id === state.overlord.id)!;
  return { ...base, kind: 'nefarian', title: `${boss.name} advances`, rule: `Fate moves ${boss.name} toward the Bulwark. Several regions are equally close: choose where he lands. ${event.name}: ${eventText(event)}`, from: state.overlord.region, piece: { name: boss.name, token: 'overlord' }, targets, verb: `Move ${boss.name.split(' ')[0]} here` };
 }
 return undefined;
}

/** What the map says while the choice is being made: the next thing to do, in one sentence. */
export function decisionPrompt(d: MapDecision, source?: MapSource, target?: string): string {
 if (d.sources) {
  if (!source) return 'Pick a group of blue creatures on the map: the lit groups can still move.';
  const group = `${source.count} × ${source.name}`;
  if (!target) return `Now pick where ${group} ${source.count === 1 ? 'goes' : 'go'}: the lit regions, up to two regions from ${regionName(source.region)}.`;
  return target === source.region ? `${group} ${source.count === 1 ? 'stays' : 'stay'} in ${regionName(target)} and cannot be moved again by this card.` : `${group}: ${regionName(source.region)} → ${regionName(target)}.`;
 }
 const name = d.piece?.name ?? '';
 if (!target) return d.kind === 'respawn' ? `Pick one of the lit regions for ${name}.` : d.kind === 'zeppelin' ? `Pick one of the lit flight points for ${name}.` : `Pick one of the lit regions for ${name}.`;
 return `${name}: ${d.from ? `${regionName(d.from)} → ` : ''}${regionName(target)}.`;
}
