import { BASE_PACK } from '../data/base/index.js';
import { decide, type Difficulty } from './planner.js';
import type { Command } from '../rules/model.js';
import type { GameView } from '../rules/view.js';

export interface PlannerRequest { id: number; state: GameView; legal: Command[]; difficulty: Difficulty; }
const scope=globalThis as unknown as {onmessage:((event:MessageEvent<PlannerRequest>)=>void)|null;postMessage:(value:unknown)=>void};
scope.onmessage=({data})=>{
 try{scope.postMessage({id:data.id,decision:decide(BASE_PACK,data.state,data.legal,data.difficulty)});}
 catch(error){scope.postMessage({id:data.id,error:error instanceof Error?error.message:'AI planning failed.'});}
};
