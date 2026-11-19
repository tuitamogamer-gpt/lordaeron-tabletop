import { BASE_PACK } from '../data/base/index.js';
import { counsel } from './council.js';
import type { Orders } from './orders.js';
import { decide, type Difficulty, type PlanOptions } from './planner.js';
import type { Command } from '../rules/model.js';
import type { GameView } from '../rules/view.js';

export interface PlannerRequest { id: number; state: GameView; legal: Command[]; difficulty: Difficulty; options?: PlanOptions; }
/** The council before a turn (ai/council.ts) is asked of the same worker, so that it shares the planner's caches. */
export interface CounselRequest { id: number; kind: 'counsel'; state: GameView; heroes: string[]; difficulty: Difficulty; options?: { independent?: string[]; orders?: Orders }; }
const scope=globalThis as unknown as {onmessage:((event:MessageEvent<PlannerRequest|CounselRequest>)=>void)|null;postMessage:(value:unknown)=>void};
scope.onmessage=({data})=>{
 try{
  if('kind'in data)scope.postMessage({id:data.id,counsel:counsel(BASE_PACK,data.state,data.heroes,data.difficulty,data.options)});
  else scope.postMessage({id:data.id,decision:decide(BASE_PACK,data.state,data.legal,data.difficulty,data.options)});
 }
 catch(error){scope.postMessage({id:data.id,error:error instanceof Error?error.message:'AI planning failed.'});}
};
