import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import type { GameView } from '../rules/view';
import { Icon } from '../components';

export default function Chronicle({log}: {log:GameView['log']}) {
 const [query,setQuery]=useState(''),[turn,setTurn]=useState('all'),[page,setPage]=useState(0);
 const nameText=(text:string)=>p.characters.reduce((value,c)=>value.replaceAll(c.id,c.name),text);
 const rows=[...log].reverse().map(row=>({...row,text:nameText(row.text)})).filter(row=>(turn==='all'||row.turn===Number(turn))&&row.text.toLowerCase().includes(query.toLowerCase()));
 const pages=Math.max(1,Math.ceil(rows.length/6)),current=Math.min(page,pages-1);
 const turns=[...new Set(log.map(row=>row.turn))].sort((a,b)=>b-a);
 return <section className="journal-page chronicle-flow">
  <div className="chronicle-heading"><div><span className="eyebrow">CHRONICLE OF LORDAERON</span><h2>Your party’s story</h2></div><span>{log.length} entries</span></div>
  <div className="chronicle-tools"><label><Icon name="search" size={16}/><input aria-label="Search the chronicle" placeholder="Search your party’s story…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><select aria-label="Filter chronicle by turn" value={turn} onChange={e=>{setTurn(e.target.value);setPage(0);}}><option value="all">All turns</option>{turns.map(value=><option key={value} value={value}>Turn {value}</option>)}</select>{(query||turn!=='all')&&<button className="quiet-button" onClick={()=>{setQuery('');setTurn('all');setPage(0);}}>Clear filters</button>}</div>
  <div className="chronicle-entries" key={`${query}-${turn}-${current}`}>{rows.slice(current*6,(current+1)*6).map(row=><article key={row.id}><span>TURN {row.turn}</span><p>{row.text}</p></article>)}{!rows.length&&<p className="flow-empty">{log.length?'No entries match your filters.':'Your story begins with your first move.'}</p>}</div>
  <nav className="flow-pagination" aria-label="Chronicle pages"><button className="quiet-button" disabled={!current} onClick={()=>setPage(current-1)}>Previous</button><span role="status">{rows.length?`${current*6+1}–${Math.min(rows.length,(current+1)*6)} of ${rows.length} entries`:'0 entries'} · {current+1} / {pages}</span><button className="quiet-button" disabled={current+1===pages} onClick={()=>setPage(current+1)}>Next</button></nav>
 </section>;
}
