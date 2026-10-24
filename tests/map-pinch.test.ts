import { describe, expect, it } from 'vitest';
import { OVERVIEW_CAMERA, pinchCamera } from '../src/campaign/map-state';

const W = 390, H = 300, RATIO = 1380 / 920;

describe('two-finger map gesture', () => {
 it('zooms by the change in finger spread and keeps the start point under the fingers', () => {
  const start = { camera: OVERVIEW_CAMERA, mid: { x: 0, y: 0 }, distance: 100 };
  expect(pinchCamera(start, { x: 0, y: 0 }, 200, W, H, RATIO)).toEqual({ zoom: 2, x: 0, y: 0 });
  const off = pinchCamera({ ...start, mid: { x: 60, y: 0 } }, { x: 60, y: 0 }, 200, W, H, RATIO);
  expect(off.zoom).toBe(2);
  expect(off.x).toBeCloseTo(-60);
 });

 it('pans when both fingers move together and clamps to the board', () => {
  const start = { camera: { zoom: 2, x: 0, y: 0 }, mid: { x: 0, y: 0 }, distance: 120 };
  expect(pinchCamera(start, { x: 40, y: -30 }, 120, W, H, RATIO)).toEqual({ zoom: 2, x: 40, y: -30 });
  const far = pinchCamera(start, { x: 5000, y: 0 }, 120, W, H, RATIO);
  expect(far.x).toBeLessThan(5000);
  expect(pinchCamera(start, { x: 0, y: 0 }, 10, W, H, RATIO)).toEqual({ zoom: 1, x: 0, y: 0 });
  expect(pinchCamera(start, { x: 0, y: 0 }, 1000, W, H, RATIO).zoom).toBe(4);
 });
});
