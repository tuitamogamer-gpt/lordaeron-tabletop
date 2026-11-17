import type { Color } from '../rules/model';

type Vec = [number, number, number];
const r = 34;
export const side = r * Math.SQRT2, height = side * Math.sqrt(3) / 2;
const equator: Vec[] = [[-r, 0, 0], [0, 0, r], [r, 0, 0], [0, 0, -r]];
const matrix = (values: number[]) => `matrix3d(${values.map(n => Math.abs(n) < 1e-8 ? 0 : +n.toFixed(6)).join(',')})`;
// Eight real triangular planes form a regular octahedron. Opposite faces sum to nine.
export const faces = [1, 2, 3, 4, 6, 5, 8, 7].map((value, i) => {
 const a: Vec = [0, i < 4 ? -r : r, 0], j = i % 4;
 const b = equator[i < 4 ? j : (j + 1) % 4], c = equator[i < 4 ? (j + 1) % 4 : j];
 const u = c.map((n, k) => (n - b[k]) / side) as Vec;
 const v = a.map((n, k) => ((b[k] + c[k]) / 2 - n) / height) as Vec;
 const w: Vec = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
 const t = a.map((n, k) => n - side / 2 * u[k]) as Vec;
 return { value, u, v, normal: w, origin: t, vertices: [a, b, c],
  transform: matrix([...u, 0, ...v, 0, ...w, 0, ...t, 1]),
  facing: matrix([u[0], v[0], w[0], 0, u[1], v[1], w[1], 0, u[2], v[2], w[2], 0, 0, 0, 0, 1]),
 };
});
export type Face = typeof faces[number];

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (degrees: number) => degrees * Math.PI / 180;
/**
 * How a die at rest is seen. An eight-sided die lies on one face, so the face that shows its result is level with the table, and
 * a player looks down at it from his chair. Seen from 53 degrees above the table with one edge of that face toward the player,
 * an octahedron is the shape everyone knows a d8 by: an upright triangle, the result, over a darker triangle that points down,
 * the two together a diamond. (Earlier the die was also turned 17 degrees about the upright of the screen, which tipped its
 * result face sideways as no die at rest lies, and leaned up to 14 degrees: a slanted wedge with three numbers of equal weight.)
 */
export const pitch = 37;
/** A die does not land square to the player: each turns a little on the table and leans a little in the picture, by its place in the row. */
export const spinOf = (index: number) => [0, -9, 7, -4, 11][index % 5], rollOf = (index: number) => [0, 3, -4, 2, -2][index % 5];
/** The camera as a transform of the die's body, written before the matrix that turns the result face to the viewer. */
export const camera = (spin: number, roll: number) => `rotateZ(${roll}deg) rotateX(${pitch}deg) rotateZ(${spin}deg)`;
/**
 * A direction or a point of the die as the camera sees it, by the same turns as the drawing: the result face toward the viewer,
 * turned on the table by `spin`, laid back by the pitch, leaned by `roll`. X is to the right, y down, z toward the viewer.
 */
export function seen(vector: readonly number[], up: Face, spin = 0, roll = 0): Vec {
 let x = dot(vector, up.u), y = dot(vector, up.v), z = dot(vector, up.normal);
 [x, y] = [x * Math.cos(angle(spin)) - y * Math.sin(angle(spin)), x * Math.sin(angle(spin)) + y * Math.cos(angle(spin))];
 [y, z] = [y * Math.cos(angle(pitch)) - z * Math.sin(angle(pitch)), y * Math.sin(angle(pitch)) + z * Math.cos(angle(pitch))];
 [x, y] = [x * Math.cos(angle(roll)) - y * Math.sin(angle(roll)), x * Math.sin(angle(roll)) + y * Math.cos(angle(roll))];
 return [x, y, z];
}

const resin: Record<Color, Vec> = { blue: [30, 124, 214], red: [200, 40, 48], green: [38, 160, 66] }, plain: Vec = [161, 169, 170];
/**
 * A die that missed keeps a memory of its colour but loses its shine: three fifths of the way to a cool grey of its own
 * lightness, and a little darker. (Mixing toward one dark slate left a missed blue die a deeper blue than one that hit.)
 */
const spent = (c: Vec): Vec => { const grey = .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; return c.map((n, i) => (n * .4 + (grey + [-6, 0, 6][i]) * .6) * .85) as Vec; };
/**
 * The colour of a face under a light from the upper left, in front of the table: the result face, which looks up, is lit fully,
 * the face under it at about three fifths. `dull` is a die that did not hit.
 */
export function facetColor(normal: Vec, up: Face, spin: number, roll: number, color?: Color, dull = false) {
 const light = .5 + .52 * Math.max(0, dot(seen(normal, up, spin, roll), [-.35, -.6, .72])), base = color ? resin[color] : plain;
 return `rgb(${(dull ? spent(base) : base).map(n => Math.round(Math.min(255, n * light))).join(' ')})`;
}

// The inline rules icon is the same die at rest, square to the reader: the result face and the face under it.
const glyphUp = faces.find(f => f.value === 8)!;
export const glyphFaces = faces.filter(f => seen(f.normal, glyphUp)[2] > .1).map(f => {
 const u = seen(f.u, glyphUp), v = seen(f.v, glyphUp), origin = seen(f.origin, glyphUp);
 return {
  value: f.value,
  points: f.vertices.map(point => { const p = seen(point, glyphUp); return `${+(p[0] + 36).toFixed(2)},${+(p[1] + 38).toFixed(2)}`; }).join(' '),
  plane: `matrix(${u[0]},${u[1]},${v[0]},${v[1]},${origin[0] + 36},${origin[1] + 38})`,
  fill: (color?: Color) => facetColor(f.normal, glyphUp, 0, 0, color),
 };
});
