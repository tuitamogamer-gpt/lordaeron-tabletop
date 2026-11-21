import { useState } from 'react';
import { BASE_PACK as p } from '../data/base';
import type { GameView } from '../rules/view';
import { Icon } from '../components';

/** Entries on one page: a page is read at a glance, and every entry stays reachable through the pages. */
export const CHRONICLE_PAGE = 12;
/** What kind of thing an entry records, from the words the rules write it in: the icon it is found by. */
const KINDS: [RegExp, string, string][] = [
 [/begins faction turn|Setup complete|campaign lap|final PvP battle/i, 'turn', 'flag'],
 [/^Event: |Event card/i, 'event', 'scroll'],
 [/ is defeated| are defeated/, 'defeat', 'skull'],
 [/ wins|completed|completes/, 'victory', 'trophy'],
 [/ challenges? /, 'combat', 'swords'],
 [/ travels to | opens a Portal| summons /, 'travel', 'walk'],
 [/ rests/, 'rest', 'tent'],
 [/ visits town| learns /, 'town', 'coins'],
 [/\+\d+ XP|level \d/, 'growth', 'spark'],
 [/ takes | gives | receives |auction/, 'item', 'layers'],
];
const kindOf = (text: string) => KINDS.find(([test]) => test.test(text)) ?? [/./, 'note', 'book'];
const NAMES = new RegExp(`(${p.characters.map(c => c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);

/**
 * The campaign's log as a story: newest first, gathered under the turn it happened in, each entry with the sign of its kind
 * (a journey, a fight, a fall, a reward) and the characters' names set apart. It used to be six tall boxes to a page.
 */
export default function Chronicle({log}: {log:GameView['log']}) {
 const [query,setQuery]=useState(''),[turn,setTurn]=useState('all'),[page,setPage]=useState(0);
 const nameText=(text:string)=>p.characters.reduce((value,c)=>value.replaceAll(c.id,c.name),text);
 const rows=[...log].reverse().map(row=>({...row,text:nameText(row.text)})).filter(row=>(turn==='all'||row.turn===Number(turn))&&row.text.toLowerCase().includes(query.toLowerCase()));
 const pages=Math.max(1,Math.ceil(rows.length/CHRONICLE_PAGE)),current=Math.min(page,pages-1);
 const turns=[...new Set(log.map(row=>row.turn))].sort((a,b)=>b-a);
 const shown=rows.slice(current*CHRONICLE_PAGE,(current+1)*CHRONICLE_PAGE);
 // The entries of this page, gathered under their turns in the order they are read.
 const groups=shown.reduce<{turn:number;rows:typeof shown}[]>((all,row)=>{const last=all.at(-1);if(last?.turn===row.turn)last.rows.push(row);else all.push({turn:row.turn,rows:[row]});return all;},[]);
 return <section className="journal-page chronicle-flow">
  <div className="chronicle-heading"><div><span className="eyebrow">CHRONICLE OF LORDAERON</span><h2>Your party’s story</h2></div><span>{log.length} entries{turns.length?` · ${turns.length} ${turns.length===1?'turn':'turns'}`:''}</span></div>
  <div className="chronicle-tools"><label><Icon name="search" size={16}/><input aria-label="Search the chronicle" placeholder="Search your party’s story…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><select aria-label="Filter chronicle by turn" value={turn} onChange={e=>{setTurn(e.target.value);setPage(0);}}><option value="all">All turns</option>{turns.map(value=><option key={value} value={value}>Turn {value}</option>)}</select>{(query||turn!=='all')&&<button className="quiet-button" onClick={()=>{setQuery('');setTurn('all');setPage(0);}}>Clear filters</button>}</div>
  <div className="chronicle-entries" key={`${query}-${turn}-${current}`}>{groups.map(group=><section className="chronicle-turn" key={group.turn} aria-label={`Turn ${group.turn}`}>
   <h3><span>Turn {group.turn}</span><small>{group.rows.length} {group.rows.length===1?'entry':'entries'}{rows.filter(row=>row.turn===group.turn).length>group.rows.length?' on this page':''}</small></h3>
   {group.rows.map(row=>{const [,kind,icon]=kindOf(row.text);return <article key={row.id} className={`chronicle-${kind}`}><Icon name={icon} size={16}/><p>{row.text.split(NAMES).map((part,i)=>i%2?<b key={i}>{part}</b>:part)}</p></article>;})}
  </section>)}{!rows.length&&<p className="flow-empty">{log.length?'No entries match your filters.':'Your story begins with your first move.'}</p>}</div>
  <nav className="flow-pagination" aria-label="Chronicle pages"><button className="quiet-button" disabled={!current} onClick={()=>setPage(current-1)}>Previous</button><span role="status">{rows.length?`${current*CHRONICLE_PAGE+1}–${Math.min(rows.length,(current+1)*CHRONICLE_PAGE)} of ${rows.length} entries`:'0 entries'} · {current+1} / {pages}</span><button className="quiet-button" disabled={current+1===pages} onClick={()=>setPage(current+1)}>Next</button></nav>
 </section>;
}
