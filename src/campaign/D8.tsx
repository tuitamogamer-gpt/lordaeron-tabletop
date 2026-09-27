import type { CSSProperties } from 'react';
import type { Die } from '../rules/model';

type Vec = [number, number, number];
const r = 34, side = r * Math.SQRT2, height = side * Math.sqrt(3) / 2;
const equator: Vec[] = [[-r, 0, 0], [0, 0, r], [r, 0, 0], [0, 0, -r]];
const matrix = (values: number[]) => `matrix3d(${values.map(n => Math.abs(n) < 1e-8 ? 0 : +n.toFixed(6)).join(',')})`;
// Eight real triangular planes form a regular octahedron. Opposite faces sum to nine.
const faces = [1, 2, 3, 4, 6, 5, 8, 7].map((value, i) => {
 const a: Vec = [0, i < 4 ? -r : r, 0], j = i % 4;
 const b = equator[i < 4 ? j : (j + 1) % 4], c = equator[i < 4 ? (j + 1) % 4 : j];
 const u = c.map((n, k) => (n - b[k]) / side) as Vec;
 const v = a.map((n, k) => ((b[k] + c[k]) / 2 - n) / height) as Vec;
 const w: Vec = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
 const t = a.map((n, k) => n - side / 2 * u[k]) as Vec;
 return { value,
  transform: matrix([...u, 0, ...v, 0, ...w, 0, ...t, 1]),
  facing: matrix([u[0], v[0], w[0], 0, u[1], v[1], w[1], 0, u[2], v[2], w[2], 0, 0, 0, 0, 1]),
 };
});

export default function D8({ die, hit = false, selected = false, disabled = true, animate = true, index = 0, onSelect }: {
 die: Die; hit?: boolean; selected?: boolean; disabled?: boolean; animate?: boolean; index?: number; onSelect?: () => void;
}) {
 const result = die.removed ? 'removed' : die.value ? hit ? 'hit' : 'miss' : 'ready';
 const face = faces.find(f => f.value === die.value) ?? faces[0];
 const label = `${die.color} D8 ${die.value || 'prepared'}, ${result}${die.rerolled ? ', rerolled' : ''}${die.spotted ? ', spotted' : ''}`;
 const style = { '--die-tilt': `${(index % 3 - 1) * 9}deg`, '--die-delay': `${index % 7 * 20}ms` } as CSSProperties;
 return <button type="button" className={`combat-d8 ${die.color} ${result} ${selected ? 'selected' : ''}`} style={style}
  aria-label={label} aria-pressed={selected} disabled={disabled || die.removed} onClick={onSelect} title={label}>
  <span className="d8-ground" aria-hidden="true" />
  <span key={`${die.value}:${die.rerolled}`} className={`d8-tumble ${animate && die.value ? 'rolling' : ''}`} aria-hidden="true">
   <span className="d8-body" style={{ transform: `rotateX(-13deg) rotateY(16deg) rotateZ(var(--die-tilt)) ${face.facing}` }}>
    {faces.map(f => <span key={f.value} className={`d8-face ${f.value === die.value ? 'up' : ''}`} style={{ width: side, height, transform: f.transform }}>
     <svg viewBox={`0 0 ${side} ${height}`}><path d={`M${side / 2},.65 L${side - .7},${height - .5} L.7,${height - .5} Z`} />
      <text x={side / 2} y={height * .72}>{die.value ? f.value : '·'}</text></svg>
    </span>)}
   </span>
  </span>
  <span className="d8-result" aria-hidden="true">{die.removed ? 'Removed' : die.value ? `${die.value} · ${hit ? 'HIT' : 'MISS'}` : 'D8'}</span>
  {(die.spotted || die.rerolled) && <span className="d8-mark" aria-hidden="true">{die.spotted ? '✦' : '↻'}</span>}
 </button>;
}
