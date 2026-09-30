import { BASE_PACK as p } from '../data/base';
import type { Color, Faction } from '../rules/model';
import type { GameView } from '../rules/view';

export type QuestState = Pick<GameView, 'quests' | 'enemies' | 'completed' | 'revision' | 'turn'>;
export interface QuestPlacement {
 creature: string;
 color: Color;
 region: string;
 requested: number;
 placed: number;
}
export interface QuestReceipt {
 kind: 'setup' | 'draw' | 'overview';
 turn: number;
 revision: number;
 quests: string[];
 placements: Record<string, QuestPlacement[]>;
}

/** Blue figures have no quest ownership. Their stable spawn ID records their origin. */
export function questOrigin(enemy: GameView['enemies'][number]): string | undefined {
 return enemy.quest ?? p.quests.find(q => enemy.id.startsWith(`${q.id}:`))?.id;
}

/** Read only public figures that were actually placed, including blue supply shortages. */
export function questReceipt(state: QuestState, kind: QuestReceipt['kind'] = 'overview', ids = state.quests, previous?: QuestState): QuestReceipt {
 const before = new Set(previous?.enemies.map(e => e.id) ?? []);
 const figures = state.enemies.filter(e => !previous || !before.has(e.id));
 const placements = Object.fromEntries(ids.map(id => {
  const q = p.quests.find(q => q.id === id)!;
  const groups = new Map<string, QuestPlacement>();
  for (const spawn of q.spawns) {
   const key = `${spawn.creature}:${spawn.region}:${spawn.color}`;
   const group = groups.get(key);
   if (group) group.requested += spawn.count;
   else groups.set(key, { creature: spawn.creature, color: spawn.color, region: spawn.region, requested: spawn.count, placed: 0 });
  }
  for (const group of groups.values()) group.placed = figures.filter(e => questOrigin(e) === id && e.creature === group.creature && e.color === group.color && e.region === group.region).length;
  return [id, [...groups.values()]];
 }));
 return { kind, turn: state.turn, revision: state.revision, quests: [...ids], placements };
}

/** Observe public state transitions; neither previewing nor replaying performs a draw. */
export function questDrawReceipt(before: QuestState, after: QuestState): QuestReceipt | undefined {
 const oldFigures = new Set(before.enemies.map(e => e.id));
 const spawnedFor = new Set(after.enemies.filter(e => !oldFigures.has(e.id)).map(questOrigin));
 const ids = after.quests.filter(id => !before.quests.includes(id) || spawnedFor.has(id));
 return ids.length ? questReceipt(after, 'draw', ids, before) : undefined;
}

export function placementTotals(receipt: QuestReceipt, side?: Faction) {
 const ids = receipt.quests.filter(id => !side || p.quests.find(q => q.id === id)?.faction === side);
 const rows = ids.flatMap(id => receipt.placements[id]);
 return {
  quests: ids.length,
  creatures: rows.reduce((sum, row) => sum + row.placed, 0),
  objectives: rows.filter(row => row.color !== 'blue').reduce((sum, row) => sum + row.placed, 0),
  blue: rows.filter(row => row.color === 'blue').reduce((sum, row) => sum + row.placed, 0),
  tokens: ids.reduce((sum, id) => sum + new Set(receipt.placements[id].filter(row => row.color !== 'blue' && row.placed > 0).map(row => row.region)).size, 0),
 };
}
