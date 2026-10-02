// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import D8 from '../src/campaign/D8';
import RulesText from '../src/campaign/RulesText';
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
  expect(screen.getByRole('button', { name: `blue D8 ${value}, miss` }).textContent).toContain(`${value} · MISS`);
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
   expect(icon.querySelectorAll('.die-facet')).toHaveLength(4);
   for (const face of icon.querySelectorAll('polygon')) expect(face.getAttribute('points')?.split(' ')).toHaveLength(3);
   expect(icon.querySelectorAll('.die-numeral')).toHaveLength(1);
  }
 });
});
