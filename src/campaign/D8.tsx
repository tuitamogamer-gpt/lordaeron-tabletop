import type { Die } from '../rules/model';

type V = [number, number, number];
function rotate([x,y,z]:V):V {
 const a=.38,b=-.48,c=.13;
 const y1=y*Math.cos(a)-z*Math.sin(a),z1=y*Math.sin(a)+z*Math.cos(a);
 const x2=x*Math.cos(b)+z1*Math.sin(b),z2=-x*Math.sin(b)+z1*Math.cos(b);
 return [x2*Math.cos(c)-y1*Math.sin(c),x2*Math.sin(c)+y1*Math.cos(c),z2];
}
/** A projection of an actual octahedron: 6 vertices, 8 triangular faces. */
const facets = [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>{
 const normal=rotate([x,y,z]),vertices:V[]=[[x,0,0],[0,y,0],[0,0,z]];
 const points=vertices.map(v=>{const p=rotate(v);return [50+p[0]*47,50-p[1]*47];});
 return {normal,points,center:[points.reduce((s,p)=>s+p[0],0)/3,points.reduce((s,p)=>s+p[1],0)/3]};
}))).filter(f=>f.normal[2]>0).sort((a,b)=>a.normal[2]-b.normal[2]);
const face=facets.at(-1)!;
export function D8({die:d,selected=false,disabled=false,onSelect}:{die:Die;selected?:boolean;disabled?:boolean;onSelect:()=>void}) {
 const status=[d.removed?'removed':'',d.rerolled?'rerolled':'',d.spotted?'spotted':'',selected?'selected':''].filter(Boolean).join(', ');
 return <button className={`d8-die ${d.color} ${selected?'selected':''} ${d.removed?'removed':''}`} type="button" aria-label={`D8 · ${d.color} · ${d.value||'prepared'}${status?` · ${status}`:''}`} aria-pressed={selected} title={`${d.color==='blue'?'Ranged':d.color==='red'?'Melee':'Armor'} · eight-sided die${d.value?` · result ${d.value}`:''}`} disabled={disabled||d.removed} onClick={onSelect}>
  <svg viewBox="0 0 100 104" aria-hidden="true"><ellipse className="d8-shadow" cx="51" cy="96" rx="29" ry="5"/>{facets.map((f,i)=><polygon key={i} className={`d8-facet facet-${i}`} points={f.points.map(p=>p.join(',')).join(' ')} style={{filter:`brightness(${.45+i*.24})`}}/>)}<text className="d8-value" x={face.center[0]} y={face.center[1]+9} textAnchor="middle">{d.value||'+'}</text></svg>
  <span className="d8-status">{d.spotted?'✦':d.rerolled?'↻':selected?'✓':'d8'}</span>
 </button>;
}
