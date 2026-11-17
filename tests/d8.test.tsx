// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import D8 from '../src/campaign/D8';
import RulesText from '../src/campaign/RulesText';
import { camera, faces, facetColor, glyphFaces, pitch, rollOf, seen, side, spinOf } from '../src/campaign/dice-geometry';
import type { Die } from '../src/rules/model';

afterEach(cleanup);
const die: Die = { id: 1, color: 'blue', value: 8, removed: false, rerolled: false, spotted: false };
const matrixOf = (el: HTMLElement) => el.style.transform.match(/matrix3d\(([^)]+)\)/)![1].split(',').map(Number);
const transform = (m: number[], p: number[], translate = false) => [0, 1, 2].map(i => m[i] * p[0] + m[i + 4] * p[1] + m[i + 8] * p[2] + (translate ? m[i + 12] : 0));
const vertexKey = (v: number[]) => v.map(n => Math.round(n * 1000) / 1000).join(',');

describe('physical eight-sided dice', () => {
 it('forms one closed regular octahedron, with eight numbered triangles and opposite faces summing to nine', () => {
  const { container } = render(<D8 die={die} animate={false} />);
  const faces = [...container.querySelectorAll<HTMLElement>('.d8-face')];
  const vertices = new Set<string>(), edges = new Map<string, number>();
  expect(faces.map(f => Number(f.dataset.face)).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  for (const face of faces) {
   const matrix = matrixOf(face), width = parseFloat(face.style.width), height = parseFloat(face.style.height);
   const triangle = [[width / 2, 0, 0], [0, height, 0], [width, height, 0]].map(v => transform(matrix, v, true));
   triangle.forEach(v => vertices.add(vertexKey(v)));
   for (let i = 0; i < 3; i++) {
    const a = triangle[i], b = triangle[(i + 1) % 3], edge = [vertexKey(a), vertexKey(b)].sort().join('|');
    expect(Math.hypot(...a.map((n, j) => n - b[j]))).toBeCloseTo(width, 3);
    edges.set(edge, (edges.get(edge) ?? 0) + 1);
   }
   const opposite = faces.find(other => {
    const otherMatrix = matrixOf(other);
    return [8, 9, 10].every(i => Math.abs(matrix[i] + otherMatrix[i]) < .00001);
   });
   expect(Number(face.dataset.face) + Number(opposite?.dataset.face)).toBe(9);
  }
  expect(vertices.size).toBe(6);
  expect(edges.size).toBe(12);
  expect([...edges.values()].every(count => count === 2)).toBe(true);
 });

 it.each([1, 2, 3, 4, 5, 6, 7, 8])('puts result %i on the upward-facing plane, keeping the readable result and mesh consistent', value => {
  const { container } = render(<D8 die={{ ...die, value }} animate={false} />);
  const up = container.querySelector<HTMLElement>('.d8-face.up')!;
  const body = container.querySelector<HTMLElement>('.d8-body')!;
  expect(up.dataset.face).toBe(String(value));
  expect(up.querySelector('text')?.textContent).toBe(String(value));
  const normal = transform(matrixOf(body), matrixOf(up).slice(8, 11));
  expect(normal[0]).toBeCloseTo(0, 5);
  expect(normal[1]).toBeCloseTo(0, 5);
  expect(normal[2]).toBeCloseTo(1, 5);
  // A tabletop camera must show a sloped top instead of a face-on triangle.
  const pitch = Number(body.style.transform.match(/rotateX\(([-\d.]+)deg\)/)![1]);
  expect(pitch).toBeGreaterThanOrEqual(35);
  expect(pitch).toBeLessThanOrEqual(55);
  // The number is on the die; under it stands whether it hit.
  expect(screen.getByRole('button', { name: `blue D8 ${value}, miss` }).querySelector('.d8-result')?.textContent).toBe('MISS');
 });

 it('keeps the numbers on prepared dice without presenting them as a rolled result', () => {
  const { container } = render(<D8 die={{ ...die, value: 0 }} />);
  expect([...container.querySelectorAll('.d8-face text')].map(n => n.textContent).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  expect(container.querySelector('.d8-result')?.textContent).toBe('D8');
  expect(screen.getByRole('button', { name: 'blue D8 prepared, ready' })).toBeTruthy();
  expect(container.querySelector('.rolling')).toBeNull();
 });

 it('preserves selection, reroll animation, removal and accessible labels', () => {
  const onSelect = vi.fn();
  const { container, rerender } = render(<D8 die={die} hit disabled={false} onSelect={onSelect} selected selectionOrder={2} />);
  const button = screen.getByRole('button', { name: 'blue D8 8, hit' });
  expect(button.getAttribute('aria-description')).toBe('Die #1 · selection 2');
  fireEvent.click(button); expect(onSelect).toHaveBeenCalledOnce();
  const firstTumble = container.querySelector('.d8-tumble');
  rerender(<D8 die={{ ...die, rerolled: true }} disabled={false} onSelect={onSelect} />);
  expect(container.querySelector('.d8-tumble')).not.toBe(firstTumble);
  expect(container.querySelector('.rolling')).toBeTruthy();
  rerender(<D8 die={{ ...die, removed: true }} disabled={false} onSelect={onSelect} animate={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'blue D8 8, removed' }));
  expect(onSelect).toHaveBeenCalledOnce();
  expect(container.querySelector('.rolling')).toBeNull();
 });

 it('uses matching triangular dice icons without adding numbers to the rules sentence', () => {
  const { container } = render(<RulesText>Roll 2 red/blue dice and remove one die of any color.</RulesText>);
  expect(screen.getByRole('img', { name: 'red/blue dice' })).toBeTruthy();
  expect(container.textContent).toBe('Roll 2 /dice and remove one die of any color.');
  const icons = [...container.querySelectorAll('.rule-die')];
  expect(icons.map(icon => icon.getAttribute('data-die-color'))).toEqual(['red', 'blue']);
  expect(container.querySelector('.rule-die image')).toBeNull();
  for (const icon of icons) {
   // The icon is the die at rest, square to the reader: its result face and the face under it.
   expect(icon.querySelectorAll('.die-facet')).toHaveLength(2);
   for (const face of icon.querySelectorAll('polygon')) expect(face.getAttribute('points')?.split(' ')).toHaveLength(3);
   expect(icon.querySelectorAll('.die-numeral')).toHaveLength(1);
  }
 });
});

/**
 * How a die at rest looks (docs/DICE-2026-11-17.md). The mesh was a true octahedron, but it was turned so that it showed a
 * slanted wedge with three numbers of equal weight; a player could not tell it was a d8.
 */
describe('a die at rest is seen as a d8 is', () => {
 const rgb = (color: string) => color.match(/\d+/g)!.map(Number), spread = (c: number[]) => Math.max(...c) - Math.min(...c), sum = (c: number[]) => c[0] + c[1] + c[2];
 it.each([1, 2, 3, 4, 5, 6, 7, 8])('lies on a face with result %i level with the table, whichever way it has turned', value => {
  const up = faces.find(f => f.value === value)!, lean = [0, -Math.sin(pitch * Math.PI / 180), Math.cos(pitch * Math.PI / 180)];
  for (let index = 0; index < 5; index++) {
   // Turning on the table is a turn about the result face's own upright, so that face stays level: it only leans back by the camera's pitch.
   const normal = seen(up.normal, up, spinOf(index), 0);
   normal.forEach((n, i) => expect(n).toBeCloseTo(lean[i], 6));
   // The lean of the picture turns the die in the plane of the screen and leaves its depth alone.
   expect(seen(up.normal, up, spinOf(index), rollOf(index))[2]).toBeCloseTo(lean[2], 6);
   expect(Math.abs(spinOf(index))).toBeLessThanOrEqual(12);
   expect(Math.abs(rollOf(index))).toBeLessThanOrEqual(5);
  }
 });

 it('is a diamond: the result face an upright triangle, the face under it one that points down', () => {
  for (const up of faces) {
   const corners = new Map<string, number[]>();
   for (const f of faces) for (const v of f.vertices) corners.set(v.join(), seen(v, up));
   const points = [...corners.values()], xs = points.map(p => p[0]), ys = points.map(p => p[1]);
   // As wide as one edge, as tall as the die is from corner to corner, and the same above and below its middle.
   expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(side, 1);
   expect(Math.max(...ys)).toBeCloseTo(34, 0); expect(Math.min(...ys)).toBeCloseTo(-34, 0);
   // Four corners lie on the middle line, two at each side: the die has no slanted waist.
   const waist = points.filter(p => Math.abs(p[1]) < 2);
   expect(waist).toHaveLength(4);
   expect(waist.filter(p => p[0] < 0)).toHaveLength(2);
   // The result face: its point at the top, its base on the middle line.
   const [apex, left, right] = up.vertices.map(v => seen(v, up));
   expect(apex[0]).toBeCloseTo(0, 6); expect(apex[1]).toBeLessThan(-33);
   expect(Math.abs(left[1])).toBeLessThan(2); expect(Math.abs(right[1])).toBeLessThan(2);
   // Exactly two faces are in plain view, the result face and the one that shares its base and points down.
   const inView = faces.filter(f => seen(f.normal, up)[2] > .1);
   expect(inView).toHaveLength(2);
   const under = inView.find(f => f !== up)!, tip = under.vertices.map(v => seen(v, up)).sort((a, b) => b[1] - a[1])[0];
   expect(tip[0]).toBeCloseTo(0, 6); expect(tip[1]).toBeGreaterThan(33);
   // The light is on the result face.
   expect(sum(rgb(facetColor(up.normal, up, 0, 0, 'red')))).toBeGreaterThan(sum(rgb(facetColor(under.normal, up, 0, 0, 'red'))) * 1.3);
  }
 });

 it('draws the body under that camera', () => {
  const { container } = render(<><D8 die={die} animate={false} index={0} /><D8 die={{ ...die, id: 2 }} animate={false} index={1} /></>);
  const [first, second] = [...container.querySelectorAll<HTMLElement>('.d8-body')];
  expect(first.style.transform.startsWith(camera(0, 0))).toBe(true);
  expect(first.style.transform).toContain(`rotateX(${pitch}deg)`);
  // The next die in the row has turned a little, as dice do.
  expect(second.style.transform.startsWith(camera(spinOf(1), rollOf(1)))).toBe(true);
  expect(second.style.transform).not.toBe(first.style.transform);
  // Nothing tips the result face sideways.
  expect(first.style.transform).not.toContain('rotateY');
 });

 it('has one number that counts, and says under the die whether it hit', () => {
  const { container, rerender } = render(<D8 die={{ ...die, value: 6 }} hit animate={false} />);
  const button = () => container.querySelector<HTMLElement>('.combat-d8')!;
  expect(button().classList.contains('hit')).toBe(true);
  expect(container.querySelectorAll('.d8-face.up')).toHaveLength(1);
  expect(container.querySelector('.d8-face.up text')?.textContent).toBe('6');
  expect(container.querySelector('.d8-result')?.textContent).toBe('HIT');
  rerender(<D8 die={{ ...die, value: 3 }} animate={false} />);
  expect(button().classList.contains('miss')).toBe(true);
  expect(container.querySelector('.d8-face.up text')?.textContent).toBe('3');
  expect(container.querySelector('.d8-result')?.textContent).toBe('MISS');
  // A die that is only prepared has no result: the stylesheet inks a number only on a die that is not `ready`.
  rerender(<D8 die={{ ...die, value: 0 }} animate={false} source="Dire Wand" />);
  expect(button().classList.contains('ready')).toBe(true);
  expect(container.querySelector('.d8-result')?.textContent).toBe('Dire Wand');
 });

 it('gives every face its full colour and the dull one of a die that missed, for the stylesheet to choose', () => {
  const { container } = render(<D8 die={{ ...die, value: 2, color: 'blue' }} animate={false} />);
  const resin = [...container.querySelectorAll<SVGPathElement>('.d8-resin')];
  expect(resin).toHaveLength(8);
  for (const path of resin) {
   const full = rgb(path.style.getPropertyValue('--facet')), dull = rgb(path.style.getPropertyValue('--facet-dull'));
   expect(full).toHaveLength(3); expect(dull).toHaveLength(3);
   // Dull is grey: far less colour than the face in its own colour.
   expect(spread(dull)).toBeLessThan(spread(full) * .55);
  }
  // In every colour, also in blue, where a darker blue once passed for dull.
  const up = faces[0];
  for (const color of ['red', 'blue', 'green'] as const) expect(spread(rgb(facetColor(up.normal, up, 0, 0, color, true)))).toBeLessThan(spread(rgb(facetColor(up.normal, up, 0, 0, color))) * .55);
 });

 it('uses the same die for the icons in rules text', () => {
  expect(glyphFaces.map(f => f.value)).toContain(8);
  expect(glyphFaces).toHaveLength(2);
  const [top, under] = [glyphFaces.find(f => f.value === 8)!, glyphFaces.find(f => f.value !== 8)!].map(f => f.points.split(' ').map(pair => pair.split(',').map(Number)));
  // An upright triangle over one that points down, sharing the middle line of a 72 by 76 box.
  expect(Math.min(...top.map(p => p[1]))).toBeCloseTo(4, 0);
  expect(Math.max(...under.map(p => p[1]))).toBeCloseTo(72, 0);
  expect(top.filter(p => Math.abs(p[1] - 38) < 2)).toHaveLength(2);
  expect(under.filter(p => Math.abs(p[1] - 38) < 2)).toHaveLength(2);
 });
});
