import type { ContentPack, Quest } from '../rules/model';
import type { GameView } from '../rules/view';

export interface QuestMarker { quest: Quest; label: string; region: string; remaining: number; }
/** Stable reference shared by the quest card and every one of its live map tokens. */
export function questLabel(p: ContentPack, id: string): string {
 const q = p.quests.find(q => q.id === id)!;
 return `${q.faction === 'horde' ? 'H' : 'A'}${String(p.quests.filter(v => v.faction === q.faction).findIndex(v => v.id === id) + 1).padStart(2, '0')}`;
}
export function questMarkers(p: ContentPack, state: Pick<GameView, 'quests' | 'enemies'>): QuestMarker[] {
 return state.quests.flatMap(id => {
  const quest = p.quests.find(q => q.id === id)!;
  const enemies = state.enemies.filter(e => e.quest === id && e.color !== 'blue');
  return [...new Set(enemies.map(e => e.region))].map(region => ({
   quest, label: questLabel(p, id), region, remaining: enemies.filter(e => e.region === region).length,
  }));
 });
}

export interface MapCamera { zoom: number; x: number; y: number; }
export const OVERVIEW_CAMERA: MapCamera = { zoom: 1, x: 0, y: 0 };
export function clampCamera(camera: MapCamera, width: number, height: number, ratio: number): MapCamera {
 const zoom = Math.max(1, Math.min(4, camera.zoom));
 const fittedWidth = Math.min(width, height * ratio), fittedHeight = fittedWidth / ratio;
 const maxX = Math.max(0, (fittedWidth * zoom - width) / 2), maxY = Math.max(0, (fittedHeight * zoom - height) / 2);
 return { zoom, x: maxX===0?0:Math.max(-maxX, Math.min(maxX, camera.x)), y: maxY===0?0:Math.max(-maxY, Math.min(maxY, camera.y)) };
}
export function zoomCamera(camera: MapCamera, zoom: number, cursor: { x: number; y: number }, width: number, height: number, ratio: number): MapCamera {
 zoom = Math.max(1, Math.min(4, zoom));
 const factor = zoom / camera.zoom;
 return clampCamera({ zoom, x: cursor.x - (cursor.x - camera.x) * factor, y: cursor.y - (cursor.y - camera.y) * factor }, width, height, ratio);
}
/** Wheel deltas move the viewport through the board, with both axes clamped. */
export function panCamera(camera: MapCamera, delta: { x: number; y: number }, width: number, height: number, ratio: number): MapCamera {
 return clampCamera({ ...camera, x: camera.x - delta.x, y: camera.y - delta.y }, width, height, ratio);
}
