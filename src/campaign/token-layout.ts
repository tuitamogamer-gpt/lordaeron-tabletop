// Where the tokens of a region stand on the map.
// Tokens used to sit at fixed offsets from the region's label: heroes above it, creatures below, quest markers to the right. In small
// regions that put them outside their own border: a hero in Nightmare Vale stood on the creatures of Stillwater Pond, and it was hard to
// tell which region a creature was in. Each token now takes the free spot inside its region's border that is nearest to its usual place.
import { BOARD, pointInRegion, type Board, type BoardShape, type MapPoint } from '../data/board-geometry';
import type { ContentPack } from '../rules/model';
import type { GameView } from '../rules/view';
import type { QuestMarker } from './map-state';
import { creatureStacks } from './MapTokens';
import { SERVICE_BOX, serviceRow, servicesOf, type Service } from './map-services';

export interface TokenSpec {
 key: string;
 /** Radius of the token, in map units. */
 r: number;
 /** Its usual place, relative to the region's centre: used when there is room, and as the tie-breaker otherwise. */
 prefer: MapPoint;
}
/** The region's name and the marks under it around its centre, which tokens avoid covering when they can. */
export interface LabelBox { halfWidth: number; top: number; bottom: number }
/** A circle of the board that is taken before any token is placed: a town, flight path or graveyard mark. */
export interface Taken { x: number; y: number; r: number }

const STEP = 6;
type Spot = { x: number; y: number; clear: number };
// Keyed by the shape itself: the same region is drawn differently on the two boards (board-geometry.ts).
const spots = new WeakMap<BoardShape, Spot[]>();

function edgeDistance([px, py]: MapPoint, [ax, ay]: MapPoint, [bx, by]: MapPoint) {
 const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
 return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
/** Distance from a point inside the region to its border; negative outside. */
export function clearance(shape: BoardShape, point: MapPoint) {
 const d = Math.min(...shape.points.map((a, i) => edgeDistance(point, a, shape.points[(i + 1) % shape.points.length])));
 return pointInRegion(point, shape.points) ? d : -d;
}
/** Every grid point inside the region with its distance to the border, computed once per region. */
function candidates(shape: BoardShape) {
 let list = spots.get(shape);
 if (!list) {
  const xs = shape.points.map(p => p[0]), ys = shape.points.map(p => p[1]);
  list = [];
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += STEP) for (let y = Math.min(...ys); y <= Math.max(...ys); y += STEP) {
   const clear = clearance(shape, [x, y]);
   if (clear >= 0) list.push({ x, y, clear });
  }
  if (!list.length) list.push({ x: shape.center[0], y: shape.center[1], clear: 0 });
  spots.set(shape, list);
 }
 return list;
}

/**
 * What a spot costs, per map unit: reaching over the region's border, standing so close to it that most of the token is outside,
 * overlapping a token already placed, covering the region's name, and distance from the token's usual place.
 */
export const WEIGHTS = { border: 2, deep: 6, overlap: 8, label: 5, distance: 0.04 };

/**
 * Places the tokens in order (the first ones get the best spots), each on the cheapest spot by WEIGHTS. A region too small for its
 * tokens still gets the least bad arrangement, and every token's centre stays inside the region. What is `taken` counts as placed
 * already: a token keeps off it as it keeps off another token, which is more than it keeps off the region's name.
 */
export function layoutTokens(shape: BoardShape, tokens: TokenSpec[], label?: LabelBox, taken: Taken[] = []): Record<string, MapPoint> {
 const [cx, cy] = shape.center, placed: Taken[] = [...taken], result: Record<string, MapPoint> = {};
 for (const token of tokens) {
  const wantX = cx + token.prefer[0], wantY = cy + token.prefer[1];
  let best: Spot | undefined, bestCost = Infinity;
  for (const spot of candidates(shape)) {
   let cost = WEIGHTS.border * Math.max(0, token.r + 1 - spot.clear) + WEIGHTS.deep * Math.max(0, token.r * 0.45 - spot.clear) + WEIGHTS.distance * Math.hypot(spot.x - wantX, spot.y - wantY);
   if (cost >= bestCost) continue;
   for (const other of placed) cost += WEIGHTS.overlap * Math.max(0, token.r + other.r + 3 - Math.hypot(spot.x - other.x, spot.y - other.y));
   if (label && cost < bestCost) cost += WEIGHTS.label * labelCover(label, cx, cy, spot.x, spot.y, token.r);
   if (cost < bestCost) { bestCost = cost; best = spot; }
  }
  const at = best ?? { x: wantX, y: wantY };
  placed.push({ x: at.x, y: at.y, r: token.r });
  result[token.key] = [at.x, at.y];
 }
 return result;
}
/** How far a token of radius `r` at (x, y) reaches into the box of the region's name. */
export function labelCover(label: LabelBox, cx: number, cy: number, x: number, y: number, r: number) {
 const dx = Math.max(0, Math.abs(x - cx) - label.halfWidth), dy = y < cy + label.top ? cy + label.top - y : y > cy + label.bottom ? y - cy - label.bottom : 0;
 return Math.max(0, r - Math.hypot(dx, dy));
}
/** The box of a region's name, relative to the region's centre. */
export function labelBox(name: string): LabelBox {
 const lines = labelLines(name);
 return { halfWidth: Math.max(...lines.map(l => l.length)) * 3.3 + 3, top: -(lines.length - 1) * 6 - 11, bottom: (lines.length - 1) * 7 + 5 };
}

export interface ServiceMark extends Service { dx: number; dy: number }
const marks = new WeakMap<BoardShape, Map<string, ServiceMark[]>>();
/**
 * Where a region's town, flight path and graveyard marks stand, relative to its centre (map-services.ts draws them as a row).
 * Their place is under the name. Five regions have no room there: the cross of the Ruins of Andorhal stood across the border,
 * half on Sorrow Hill, and most of the larger headstone would stand there. In those regions the row takes the place near the
 * name that is deepest inside the region's own border: under the name but to one side, then beside the name, then above it.
 * The place depends on the region alone, so a mark never moves during a game.
 */
export function serviceMarks(shape: BoardShape, name: string, services: Service[]): ServiceMark[] {
 if (!services.length) return [];
 const key = `${name}:${services.map(s => `${s.kind}/${s.side}`).join()}`, known = marks.get(shape)?.get(key);
 if (known) return known;
 const label = labelBox(name), row = serviceRow(services, labelLines(name).length), [cx, cy] = shape.center, w = row.width / 2, h = row.height / 2;
 /** How deep inside the border the row's box is with its centre at (x, y): negative where a corner is outside. */
 const depth = (x: number, y: number) => Math.min(...[[-w, -h], [w, -h], [-w, h], [w, h], [0, -h], [0, h]].map(([dx, dy]) => clearance(shape, [cx + x + dx, cy + y + dy])));
 const under = row.top + h, shifts = [0, 6, -6, 12, -12, 18, -18, 24, -24, 30, -30, 36, -36], beside = label.halfWidth + 4 + w, middle = (label.top + label.bottom) / 2;
 // In order of preference: a place that is as good as an earlier one does not replace it.
 const places: [number, number][] = [...shifts.map(x => [x, under] as [number, number]), [beside, middle], [-beside, middle], ...shifts.map(x => [x, label.top - 3 - h] as [number, number])];
 const ROOM = 3;
 let best = places[0], deepest = depth(...best);
 for (const place of places) { if (deepest >= ROOM) break; const d = depth(...place); if (d > deepest + 1) { best = place; deepest = d; } }
 const placed = row.marks.map(m => ({ ...m, dx: m.dx + best[0], dy: best[1] }));
 if (!marks.has(shape)) marks.set(shape, new Map());
 marks.get(shape)!.set(key, placed);
 return placed;
}
/** The largest size at which a computer's overview draws the marks, compared with the fullscreen map (map.css). */
export const MARK_ROOM = 1.4;
/**
 * The marks as circles of the board that tokens keep off: a town and a graveyard are one circle, a flight path with its wings
 * two. The circles cover the marks at the size the overview draws them, as a row grown about its middle, so that a token
 * placed clear of them is clear in both views.
 */
export function takenByServices(shape: BoardShape, name: string, services: Service[]): Taken[] {
 const placed = serviceMarks(shape, name, services);
 if (!placed.length) return [];
 const [cx, cy] = shape.center, first = placed[0], last = placed.at(-1)!, middle = (first.dx - SERVICE_BOX[first.kind].w / 2 + last.dx + SERVICE_BOX[last.kind].w / 2) / 2;
 return placed.flatMap(m => {
  const x = cx + middle + (m.dx - middle) * MARK_ROOM, y = cy + m.dy, box = SERVICE_BOX[m.kind];
  return m.kind === 'flight' ? [-1, 1].map(side => ({ x: x + side * box.w * MARK_ROOM / 4, y, r: box.h * MARK_ROOM / 2 })) : [{ x, y, r: (box.w + box.h) * MARK_ROOM / 4 }];
 });
}

/** A region's name as it is broken into lines on the map. */
export function labelLines(name: string) {
 const words = name.replace(/^The /,'').split(' '), lines: string[] = [];
 for(const word of words){if(lines.length && `${lines.at(-1)} ${word}`.length<=16)lines[lines.length-1]+=` ${word}`;else lines.push(word);}
 return lines;
}

/** Radii used for spacing, a little larger than the drawn tokens so that names and count badges stay clear. */
export const TOKEN_RADIUS = { hero: 23, overlord: 27, creature: 20, quest: 21, world: 13 } as const;

/**
 * The place of every token on the board, by key: `h:<hero>`, `overlord`, `c:<region>:<creature>:<color>`, `q:<region>:<quest>` and
 * `w:<region>:<event>`. Heroes are placed first, then the Overlord, creatures, quest markers and world markers.
 */
export function boardTokenPositions(p: ContentPack, state: Pick<GameView, 'heroes' | 'enemies' | 'overlord' | 'world'>, markers: QuestMarker[], on: Board = BOARD): Record<string, MapPoint> {
 const at: Record<string, MapPoint> = {};
 for (const r of p.regions) {
  const shape = on.byId[r.id];
  if (!shape) continue;
  const people = state.heroes.filter(h => h.location === r.id), stacks = creatureStacks(state.enemies.filter(e => e.region === r.id)), quests = markers.filter(m => m.region === r.id);
  const world = (state.world ?? []).filter(w => !w.cleared).filter(w => { const e = p.events.find(e => e.id === w.id); return e?.boss ? e.boss.region === r.id : e?.script === 'plague' && w.tokens.includes(r.id); });
  const specs: TokenSpec[] = [
   ...people.map((h, i) => ({ key: `h:${h.id}`, r: TOKEN_RADIUS.hero, prefer: [(i - (people.length - 1) / 2) * 49, -38] as const })),
   ...(state.overlord.region === r.id ? [{ key: 'overlord', r: TOKEN_RADIUS.overlord, prefer: [people.length ? 52 : 0, -38] as const }] : []),
   ...stacks.map((stack, i) => ({ key: `c:${r.id}:${stack.creature}:${stack.color}`, r: TOKEN_RADIUS.creature, prefer: [(i % 4 - (Math.min(stacks.length, 4) - 1) / 2) * 42, 36 + Math.floor(i / 4) * 40] as const })),
   ...quests.map((m, i) => ({ key: `q:${r.id}:${m.quest.id}`, r: TOKEN_RADIUS.quest, prefer: [44, -14 + i * 26] as const })),
   ...world.map(w => ({ key: `w:${r.id}:${w.id}`, r: TOKEN_RADIUS.world, prefer: [-34, 22] as const })),
  ];
  if (!specs.length) continue;
  const services = servicesOf(r);
  Object.assign(at, layoutTokens(shape, specs, labelBox(r.name), takenByServices(shape, r.name, services)));
 }
 return at;
}
