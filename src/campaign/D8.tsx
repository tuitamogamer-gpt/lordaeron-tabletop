import { useId, type CSSProperties } from 'react';
import type { Die } from '../rules/model';
import { faces, side, height, camera, spinOf, rollOf, facetColor } from './dice-geometry';

/** A card name under a die: the first word on one line, the rest on the next, each cut with an ellipsis if it is too long. */
const sourceLines = (name: string) => { const [first, ...rest] = name.split(' '); return <><i>{first}</i>{rest.length > 0 && <> <i>{rest.join(' ')}</i></>}</>; };

/**
 * An eight-sided die as it lies on the table (dice-geometry.ts): the face with its result is an upright triangle, the face
 * under it a darker one that points down. A rolled die has one number that counts, in white on its result face; the numbers
 * of the other faces are the engraving of a real die, dark and faint. A die that is only prepared has no result, so all its
 * numbers are engraving. Under a rolled die stands whether it hit: its number is on the die. A die that missed is dull, one
 * that hit keeps its full colour and stands in a glow (dice.css).
 */
export default function D8({ die, hit = false, selected = false, selectionOrder, disabled = true, animate = true, index = 0, source, onSelect }: {
 die: Die; hit?: boolean; selected?: boolean; selectionOrder?: number; disabled?: boolean; animate?: boolean; index?: number; onSelect?: () => void;
 /** The card this die was taken for: named under the die until it is rolled, as each die on the table lies by its card. */
 source?: string;
}) {
 const result = die.removed ? 'removed' : die.value ? hit ? 'hit' : 'miss' : 'ready';
 const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
 const face = faces.find(f => f.value === (die.value || [8, 5, 3][index % 3])) ?? faces[0];
 const label = `${die.color} D8 ${die.value || 'prepared'}, ${result}${die.rerolled ? ', rerolled' : ''}${die.spotted ? ', spotted' : ''}`;
 const spin = spinOf(index), roll = rollOf(index), named = !die.removed && !die.value && !!source;
 const style = { '--die-delay': `${index % 7 * 20}ms` } as CSSProperties;
 return <button type="button" className={`combat-d8 physical-d8 ${die.color} ${result} ${named ? 'named' : ''} ${selected ? 'selected' : ''}`} style={style}
  aria-label={label} aria-description={`Die #${die.id}${source ? ` · from ${source}` : ''}${selected && selectionOrder ? ` · selection ${selectionOrder}` : ''}`} aria-pressed={selected} disabled={disabled || die.removed} onClick={onSelect} title={`${label} · #${die.id}${source ? ` · from ${source}` : ''}`}>
  <span className="d8-ground" aria-hidden="true" />
  <span key={`${die.value}:${die.rerolled}`} className={`d8-tumble ${animate && die.value ? 'rolling' : ''}`} aria-hidden="true">
   <span className="d8-body" style={{ transform: `${camera(spin, roll)} ${face.facing}` }}>
    {faces.map(f => <span key={f.value} className={`d8-face ${f.value === face.value ? 'up' : ''}`} data-face={f.value} style={{ width: side, height, transform: f.transform }}>
     <svg viewBox={`0 0 ${side} ${height}`}>
      <defs><linearGradient id={`${id}-facet-${f.value}`} x1=".2" y1="0" x2=".8" y2="1">
       <stop offset="0" stopColor="#ffffff" stopOpacity=".3" /><stop offset=".5" stopColor="#ffffff" stopOpacity=".02" /><stop offset="1" stopColor="#000000" stopOpacity=".2" />
      </linearGradient></defs>
      {/* Both colours of the face: the stylesheet shows the dull one once a die that missed has come to rest (dice.css). */}
      <path className="d8-resin" d={`M${side / 2},.4 L${side - .4},${height - .3} L.4,${height - .3} Z`} style={{ '--facet': facetColor(f.normal, face, spin, roll, die.color), '--facet-dull': facetColor(f.normal, face, spin, roll, die.color, true) } as CSSProperties} />
      <path className="d8-lustre" d={`M${side / 2},1 L${side - 1},${height - .7} L1,${height - .7} Z`} style={{ fill: `url(#${id}-facet-${f.value})` }} />
      <path className="d8-bevel" d={`M2.6,${height - 1.9} L${side / 2},2.9 L${side - 2.6},${height - 1.9}`} />
      <text x={side / 2} y={height * .83}>{f.value}</text>
      {f.value === 6 && <path className="d8-six-mark" d={`M${side / 2 - 4},${height * .9} h8`} />}
     </svg>
    </span>)}
   </span>
  </span>
  <span className={`d8-result ${named ? 'd8-source' : ''}`} aria-hidden="true">{die.removed ? 'Removed' : die.value ? hit ? 'HIT' : 'MISS' : source ? sourceLines(source) : 'D8'}</span>
  {(die.spotted || die.rerolled) && <span className="d8-mark" aria-hidden="true">{die.spotted ? '✦' : '↻'}</span>}
  {selected && selectionOrder && <span className="d8-selection-order" aria-hidden="true">{selectionOrder}</span>}
 </button>;
}
