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
 /**
  * How much more than a plain mark it costs this token to reach over its region's border. A figure says where something
  * is: a creature or a character that stands across a border reads as standing in the region next door.
  */
 hold?: number;
 /** How far inside the border its edge keeps, beyond its radius. */
 margin?: number;
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
export const WEIGHTS = { border: 2, margin: 3.5, deep: 6, overlap: 18, mark: 12, label: 4, distance: 0.04 };
/**
 * A figure keeps inside its region before it keeps off the region's name. Until 19. 11. 2026 it was the other way round, and
 * a quarter of the creatures stood across a border: every region has room for a creature (the narrowest is 23 map units deep,
 * a creature 17 across its radius), but the name lies in the middle of that room, and the name won.
 */
export const HOLD = { figure: 8, mark: 2.5 };
/**
 * How far inside the border a figure's edge keeps (map units). The borders are drawn at a fixed width on the screen, which on
 * the overview of the whole board is some eight units: a counter that only just clears the border's line still stands on its ink.
 */
export const FIGURE_MARGIN = 7;

/**
 * Places the tokens in order (the first ones get the best spots), each on the cheapest spot by WEIGHTS. A region too small for its
 * tokens still gets the least bad arrangement, and every token's centre stays inside the region. What is `taken` counts as placed
 * already: a token keeps off it as it keeps off another token, which is more than it keeps off the region's name.
 */
export function layoutTokens(shape: BoardShape, tokens: TokenSpec[], label?: LabelBox, taken: Taken[] = []): Record<string, MapPoint> {
 // A mark of the board (a town, a flight path) says what the region offers: a figure keeps off it before it keeps its margin from the border.
 const [cx, cy] = shape.center, placed: (Taken & { mark?: boolean })[] = taken.map(t => ({ ...t, mark: true })), result: Record<string, MapPoint> = {};
 for (const token of tokens) {
  const wantX = cx + token.prefer[0], wantY = cy + token.prefer[1], pull = WEIGHTS.distance;
  let best: Spot | undefined, bestCost = Infinity;
  for (const spot of candidates(shape)) {
   // Reaching over the border costs a figure most; standing closer to it than its margin costs it little, less than covering the name.
   let cost = WEIGHTS.border * (token.hold ?? 1) * Math.max(0, token.r + (token.margin ? 0 : 1) - spot.clear) + WEIGHTS.margin * Math.max(0, token.r + (token.margin ?? 0) - spot.clear) + WEIGHTS.deep * Math.max(0, token.r * 0.45 - spot.clear) + pull * Math.hypot(spot.x - wantX, spot.y - wantY);
   if (cost >= bestCost) continue;
   for (const other of placed) cost += (other.mark ? WEIGHTS.mark : WEIGHTS.overlap) * Math.max(0, token.r + other.r + 3 - Math.hypot(spot.x - other.x, spot.y - other.y));
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

/**
 * A quest's marker as it is drawn on the map: a tag on the counter of the creatures it is about, at one of three corners (the
 * fourth holds the count). Until 19. 11. 2026 it was a token of its own, as large as a character's counter, and five times in
 * six it stood across a border: a marker between Stillwater Pond and Deathknell said nothing about where the quest was.
 */
export const TAG = { w: 30, h: 24 } as const;
const TAG_CORNERS: MapPoint[] = [[-19, -17], [19, -17], [-19, 17]], TAG_CLOSE: MapPoint[] = [[0, -16], [-12, -10], [12, -10], [0, 14], [0, 0]];
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
  /** The creatures of this region that a quest's marker is about: the counter that carries it. */
  const carrier = (m: QuestMarker) => stacks.find(stack => stack.color !== 'blue' && state.enemies.some(e => e.region === r.id && e.quest === m.quest.id && e.creature === stack.creature && e.color === stack.color));
  const specs: TokenSpec[] = [
   ...people.map((h, i) => ({ key: `h:${h.id}`, r: TOKEN_RADIUS.hero, prefer: [(i - (people.length - 1) / 2) * 49, -38] as const, hold: HOLD.figure, margin: FIGURE_MARGIN })),
   ...(state.overlord.region === r.id ? [{ key: 'overlord', r: TOKEN_RADIUS.overlord, prefer: [people.length ? 52 : 0, -38] as const, hold: HOLD.figure, margin: FIGURE_MARGIN }] : []),
   ...stacks.map((stack, i) => ({ key: `c:${r.id}:${stack.creature}:${stack.color}`, r: TOKEN_RADIUS.creature, prefer: [(i % 4 - (Math.min(stacks.length, 4) - 1) / 2) * 42, 36 + Math.floor(i / 4) * 40] as const, hold: HOLD.figure, margin: FIGURE_MARGIN })),
   // A quest's marker is a tag on the creatures it is about (below); one whose creatures are not in sight is laid out by itself.
   ...quests.filter(m => !carrier(m)).map((m, i) => ({ key: `q:${r.id}:${m.quest.id}`, r: TOKEN_RADIUS.quest, prefer: [44, -14 + i * 26] as const, hold: HOLD.mark })),
   ...world.map(w => ({ key: `w:${r.id}:${w.id}`, r: TOKEN_RADIUS.world, prefer: [-34, 22] as const, hold: HOLD.mark })),
  ];
  if (!specs.length && !quests.length) continue;
  const services = servicesOf(r), label = labelBox(r.name), marks = takenByServices(shape, r.name, services);
  Object.assign(at, layoutTokens(shape, specs, label, marks));
  // The tags: each at the corner of its creature's counter where it is deepest inside the region and covers least.
  const tagged = new Map<string, number>(), others = Object.entries(at).filter(([key]) => specs.some(v => v.key === key));
  for (const m of quests) {
   const own = carrier(m); if (!own) continue;
   const key = `c:${r.id}:${own.creature}:${own.color}`, base = at[key]; if (!base) continue;
   const nth = tagged.get(key) ?? 0; tagged.set(key, nth + 1);
   // The fourth corner holds the count of a stack of two or more; a single creature leaves it free. Where no corner is inside
   // the region (a creature in a region barely larger than itself), the tag sits closer on the counter.
   const places = [...TAG_CORNERS, ...(own.count > 1 ? [] : [[19, 17] as MapPoint]), ...TAG_CLOSE].map(([dx, dy]): MapPoint => [base[0] + dx, base[1] + dy + Math.sign(dy) * nth * TAG.h]);
   const worth = ([x, y]: MapPoint, i: number) => { const clear = clearance(shape, [x, y]); return Math.min(clear, 8) - (clear < 0 ? 100 : 0) - (i >= places.length - TAG_CLOSE.length ? 14 : 0)
    - 5 * labelCover(label, shape.center[0], shape.center[1], x, y, TAG.w / 2) - marks.reduce((n, mark) => n + 2 * Math.max(0, TAG.h / 2 + mark.r - Math.hypot(x - mark.x, y - mark.y)), 0)
    - others.reduce((n, [other, [ox, oy]]) => n + (other === key ? 0 : Math.max(0, TAG.w / 2 + 17 - Math.hypot(x - ox, y - oy))), 0); };
   at[`q:${r.id}:${m.quest.id}`] = places.map((place, i) => ({ place, worth: worth(place, i) })).reduce((best, next) => next.worth > best.worth + .5 ? next : best).place;
  }
 }
 return at;
}
