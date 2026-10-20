import { BASE_PACK } from '../data/base/index.js';
import { decide, type Decision, type Difficulty } from './planner.js';
import type { Command } from '../rules/model.js';
import type { GameView } from '../rules/view.js';

export const AI_PLAN_TIMEOUT_MS=30_000;

/** Persistent worker keeps the board responsive and reuses bounded profile caches. */
export class PlannerClient {
 private worker?: Worker;
 private sequence=0;
 private pending=new Map<number,{resolve:(d:Decision|undefined)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
 constructor(private factory=()=>new Worker(new URL('./worker.ts',import.meta.url),{type:'module'})){}
 private fail(worker:Worker,error:Error){
  if(this.worker!==worker)return;
  for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(error);}
  this.pending.clear();worker.terminate();this.worker=undefined;
 }
 async plan(state:GameView,legal:Command[],difficulty:Difficulty):Promise<Decision|undefined>{
  if(typeof Worker==='undefined')return Promise.resolve(decide(BASE_PACK,state,legal,difficulty));
  if(!this.worker){
   const worker=this.factory();this.worker=worker;
   worker.onmessage=({data}:{data:{id:number;decision?:Decision;error?:string}})=>{
    if(this.worker!==worker)return;
    const request=this.pending.get(data.id);if(!request)return;this.pending.delete(data.id);clearTimeout(request.timer);
    if(data.error)request.reject(new Error(data.error));else request.resolve(data.decision);
   };
   worker.onerror=()=>this.fail(worker,new Error('AI planning failed. Try Step bot again.'));
   worker.onmessageerror=()=>this.fail(worker,new Error('The AI response could not be read. Try Step bot again.'));
  }
  const id=++this.sequence,worker=this.worker;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>this.fail(worker,new Error('AI planning timed out. Try Step bot again.')),AI_PLAN_TIMEOUT_MS);
   this.pending.set(id,{resolve,reject,timer});
   try{worker.postMessage({id,state,legal,difficulty});}
   catch{this.fail(worker,new Error('AI planning could not start. Try Step bot again.'));}
  });
 }
 dispose(){for(const r of this.pending.values()){clearTimeout(r.timer);r.resolve(undefined);}this.pending.clear();this.worker?.terminate();this.worker=undefined;}
}
