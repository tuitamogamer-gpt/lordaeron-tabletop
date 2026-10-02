import { useId, type CSSProperties } from 'react';
import type { Die } from '../rules/model';
import { faces, side, height, pitch, yaw, facetColor } from './dice-geometry';

export default function D8({ die, hit = false, selected = false, selectionOrder, disabled = true, animate = true, index = 0, onSelect }: {
 die: Die; hit?: boolean; selected?: boolean; selectionOrder?: number; disabled?: boolean; animate?: boolean; index?: number; onSelect?: () => void;
}) {
 const result = die.removed ? 'removed' : die.value ? hit ? 'hit' : 'miss' : 'ready';
 const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
 const face = faces.find(f => f.value === (die.value || [8, 5, 3][index % 3])) ?? faces[0];
 const label = `${die.color} D8 ${die.value || 'prepared'}, ${result}${die.rerolled ? ', rerolled' : ''}${die.spotted ? ', spotted' : ''}`;
 const tilt = (index % 5 - 2) * 7;
 const style = { '--die-tilt': `${tilt}deg`, '--die-delay': `${index % 7 * 20}ms` } as CSSProperties;
 return <button type="button" className={`combat-d8 physical-d8 ${die.color} ${result} ${selected ? 'selected' : ''}`} style={style}
  aria-label={label} aria-description={`Die #${die.id}${selected && selectionOrder ? ` · selection ${selectionOrder}` : ''}`} aria-pressed={selected} disabled={disabled || die.removed} onClick={onSelect} title={`${label} · #${die.id}`}>
  <span className="d8-ground" aria-hidden="true" />
  <span key={`${die.value}:${die.rerolled}`} className={`d8-tumble ${animate && die.value ? 'rolling' : ''}`} aria-hidden="true">
   <span className="d8-body" style={{ transform: `rotateZ(var(--die-tilt)) rotateX(${pitch}deg) rotateY(${yaw}deg) ${face.facing}` }}>
    {faces.map(f => <span key={f.value} className={`d8-face ${f.value === face.value ? 'up' : ''}`} data-face={f.value} style={{ width: side, height, transform: f.transform }}>
     <svg viewBox={`0 0 ${side} ${height}`}>
      <defs><linearGradient id={`${id}-facet-${f.value}`} x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stopColor="#ffffff" stopOpacity=".27" /><stop offset=".48" stopColor="#ffffff" stopOpacity=".015" /><stop offset="1" stopColor="#000000" stopOpacity=".16" />
      </linearGradient></defs>
      <path className="d8-resin" d={`M${side / 2},.4 L${side - .4},${height - .3} L.4,${height - .3} Z`} style={{ fill: facetColor(f.normal, face, tilt, die.color) }} />
      <path className="d8-lustre" d={`M${side / 2},1 L${side - 1},${height - .7} L1,${height - .7} Z`} style={{ fill: `url(#${id}-facet-${f.value})` }} />
      <path className="d8-bevel" d={`M1.7,${height - 1.2} L${side / 2},1.7 L${side - 1.7},${height - 1.2}`} />
      <text x={side / 2} y={height * .72}>{f.value}</text>
      {f.value === 6 && <path className="d8-six-mark" d={`M${side / 2 - 3},${height * .79} h6`} />}
     </svg>
    </span>)}
   </span>
  </span>
  <span className="d8-result" aria-hidden="true">{die.removed ? 'Removed' : die.value ? `${die.value} · ${hit ? 'HIT' : 'MISS'}` : 'D8'}</span>
  {(die.spotted || die.rerolled) && <span className="d8-mark" aria-hidden="true">{die.spotted ? '✦' : '↻'}</span>}
  {selected && selectionOrder && <span className="d8-selection-order" aria-hidden="true">{selectionOrder}</span>}
 </button>;
}
