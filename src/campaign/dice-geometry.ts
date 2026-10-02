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

const dot = (a: Vec, b: Vec) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const angle = (degrees: number) => degrees * Math.PI / 180;
export const pitch = 42, yaw = -17;
const resin: Record<Color, Vec> = { blue: [27, 135, 204], red: [190, 38, 48], green: [41, 157, 64] };
// Light the actual outward normals after the same rotations used by the mesh.
// The settled view looks down onto the top face and exposes the sloping sides.
function orient(normal: Vec, up: typeof faces[number], tilt: number) {
 const x = dot(normal, up.u), y = dot(normal, up.v), z = dot(normal, up.normal);
 const x1 = x * Math.cos(angle(yaw)) + z * Math.sin(angle(yaw));
 const z1 = -x * Math.sin(angle(yaw)) + z * Math.cos(angle(yaw));
 const y1 = y * Math.cos(angle(pitch)) - z1 * Math.sin(angle(pitch));
 const z2 = y * Math.sin(angle(pitch)) + z1 * Math.cos(angle(pitch));
 const litNormal: Vec = [x1 * Math.cos(angle(tilt)) - y1 * Math.sin(angle(tilt)), x1 * Math.sin(angle(tilt)) + y1 * Math.cos(angle(tilt)), z2];
 return litNormal;
}
export function facetColor(normal: Vec, up: typeof faces[number], tilt: number, color?: Color) {
 const light = .48 + .57 * Math.max(0, dot(orient(normal, up, tilt), [-.35, -.6, .72]));
 return `rgb(${(color ? resin[color] : [161, 169, 170]).map(n => Math.round(n * light)).join(' ')})`;
}

// The inline rules icon uses the same mesh and camera as a resting combat die.
const glyphUp = faces.find(f => f.value === 8)!;
export const glyphFaces = faces.filter(f => orient(f.normal, glyphUp, 0)[2] > 0).map(f => {
 const u = orient(f.u, glyphUp, 0), v = orient(f.v, glyphUp, 0), origin = orient(f.origin, glyphUp, 0);
 return {
  value: f.value,
  points: f.vertices.map(point => { const p = orient(point, glyphUp, 0); return `${p[0] + 36},${p[1] + 38}`; }).join(' '),
  plane: `matrix(${u[0]},${u[1]},${v[0]},${v[1]},${origin[0] + 36},${origin[1] + 38})`,
  fill: (color?: Color) => facetColor(f.normal, glyphUp, 0, color),
 };
});
