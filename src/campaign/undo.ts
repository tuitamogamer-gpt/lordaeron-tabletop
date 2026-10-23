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
 return UNDOABLE.has(c.type) && before.rng === after.rng && !after.battle && !after.eventFlow && !after.auction && !after.reward && after.phase !== 'finished' && hidden(before) === hidden(after);
}

export const undoLabel: Record<string, string> = { travel: 'travel', rest: 'rest', train: 'training', town: 'town visit', trade: 'trade', manage: 'equipment' };
