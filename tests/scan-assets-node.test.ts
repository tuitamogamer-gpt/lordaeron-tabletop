import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('the scan layer outside the bundler', () => {
 // check:render, render:map and other scripts import the interface under plain Node (tsx), without Vite's import.meta.glob.
 it('loads under Node and falls back to the illustrated faces', () => {
  const run = spawnSync('npx', ['tsx', '-e', "import('./src/campaign/scan-assets.ts').then(m => console.log(JSON.stringify({ cards: Object.keys(m.SCANS.cards).length, hasScans: m.hasScans, counters: Object.keys(m.SCANS.counters).length })))"], { encoding: 'utf8', timeout: 60000 });
  expect(run.stderr).not.toMatch(/Error/);
  expect(JSON.parse(run.stdout.trim().split('\n').at(-1)!)).toEqual({ cards: 0, hasScans: false, counters: 0 });
 }, 90000);
});
