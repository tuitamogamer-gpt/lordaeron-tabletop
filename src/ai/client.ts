import { BASE_PACK } from '../data/base/index.js';
import { decide, type Decision, type Difficulty } from './planner.js';
import type { Command } from '../rules/model.js';
import type { GameView } from '../rules/view.js';

/** Persistent worker keeps the board responsive and reuses bounded profile caches. */
export class PlannerClient {
 private worker?: Worker;
 private sequence=0;
 private pending=new Map<number,{resolve:(d:Decision|undefined)=>void;reject:(error:Error)=>void}>();
 constructor(private factory=()=>new Worker(new URL('./worker.ts',import.meta.url),{type:'module'})){}
 plan(state:GameView,legal:Command[],difficulty:Difficulty):Promise<Decision|undefined>{
  if(typeof Worker==='undefined')return Promise.resolve(decide(BASE_PACK,state,legal,difficulty));
  if(!this.worker){
   this.worker=this.factory();
   this.worker.onmessage=({data}:{data:{id:number;decision?:Decision;error?:string}})=>{
    const request=this.pending.get(data.id);if(!request)return;this.pending.delete(data.id);
    if(data.error)request.reject(new Error(data.error));else request.resolve(data.decision);
   };
   this.worker.onerror=()=>{
    for(const request of this.pending.values())request.reject(new Error('AI planning failed. Try Step bot again.'));
    this.pending.clear();this.worker?.terminate();this.worker=undefined;
   };
  }
  const id=++this.sequence;
  return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker!.postMessage({id,state,legal,difficulty});});
 }
 dispose(){for(const r of this.pending.values())r.resolve(undefined);this.pending.clear();this.worker?.terminate();this.worker=undefined;}
}
