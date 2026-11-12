import type { Command, State } from '../rules/model';

/** Party choices a player may take back. Everything else either hands the turn over or resolves an encounter. */
const UNDOABLE: ReadonlySet<Command['type']> = new Set(['travel', 'rest', 'train', 'town', 'trade', 'manage']);
export const UNDO_DEPTH = 12;

const hidden = (s: State) => JSON.stringify([s.questDecks, s.itemDecks, s.eventDeck, s.eventSeen, s.enemies, s.kazzak ?? null, s.quests]);

/**
 * A command can be taken back only when it revealed nothing and rolled nothing: the random state, every hidden deck
 * and the creatures on the map are unchanged, and it did not open a combat, an event, an auction or a reward.
 * Undoing then never lets a player retry a roll or act on a card they were not meant to see yet.
 */
export function undoable(before: State, after: State, c: Command) {
 if (before.rng !== after.rng || after.eventFlow || after.auction || after.reward || after.phase === 'finished' || hidden(before) !== hidden(after)) return false;
 return UNDOABLE.has(c.type) ? !after.battle : powerTakenBack(before, after, c);
}
/**
 * A power used in combat may be taken back while it only spent energy and prepared dice, as a player at the table may
 * put a card back before the dice are thrown. Any power that rolls (a die added after the roll, an independent reroll)
 * moves the random state and stays played, and so does one that ends the step, the round or a creature.
 */
function powerTakenBack(before: State, after: State, c: Command) {
 const was = before.battle, now = after.battle;
 return c.type === 'ability' && !!was && !!now && was.stage === now.stage && was.round === now.round && now.stage !== 'over'
  && was.active?.heroId === now.active?.heroId && before.respawns.length === after.respawns.length && was.defeated.length === now.defeated.length;
}

export const undoLabel: Record<string, string> = { travel: 'travel', rest: 'rest', train: 'training', town: 'town visit', trade: 'trade', manage: 'equipment', ability: 'power' };
/** What the Undo button takes back; a Travel that goes nowhere is a passed action. */
export const undoName = (c: Command) => c.type === 'travel' && !c.path.length ? 'pass' : undoLabel[c.type] ?? 'move';
