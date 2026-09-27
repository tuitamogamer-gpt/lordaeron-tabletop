import { faction, region } from './common.js';
import type { ContentPack, EventScript, State } from './model.js';
export const worldEvent=(s:State,id:string)=>s.world?.find(e=>e.id===id);
export const activeEvent=(p:ContentPack,s:Pick<State,'world'>,script:EventScript)=>s.world?.find(e=>p.events.find(c=>c.id===e.id)?.script===script);
export const eventBoss=(p:ContentPack,s:Pick<State,'battle'>)=>p.events.find(e=>e.id===s.battle?.boss)?.boss;
export const plagued=(p:ContentPack,at:string)=>region(p,at).zone.includes('Plaguelands');
export function distances(p:ContentPack,from:string):Record<string,number>{
 const d:Record<string,number>={[from]:0},q=[from];while(q.length){const at=q.shift()!;for(const next of region(p,at).neighbors)if(d[next]===undefined){d[next]=d[at]+1;q.push(next);}}return d;
}
export function nefarianDestinations(p:ContentPack,s:State,steps:number){
 const toGoal=distances(p,'bulwark');if(toGoal[s.overlord.region]<=steps)return ['bulwark'];
 let choices=[s.overlord.region];for(let i=0;i<steps;i++)choices=[...new Set(choices.flatMap(id=>region(p,id).neighbors))];
 const closest=Math.min(...choices.map(id=>toGoal[id]??Infinity));return choices.filter(id=>toGoal[id]===closest);
}
export function worldAttack(p:ContentPack,s:Pick<State,'world'|'battle'>,at:string){
 let attack=activeEvent(p,s,'plague')&&plagued(p,at)?2:0;
 if(s.battle?.boss==='kelthuzad'){
  const cauldrons=s.world?.find(e=>p.events.find(c=>c.id===e.id)?.boss?.combat==='cauldrons');
  if(cauldrons&&!cauldrons.tokens.some(id=>faction(p,id)===s.battle?.first))attack+=4;
 }return attack;
}
export function retainedFigures(s:State,creature:string,color:string){return (s.world??[]).reduce((n,e)=>n+[...e.trophies.horde,...e.trophies.alliance].filter(v=>v.creature===creature&&v.color===color).length,0);}
