import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlannerClient } from '../src/ai/client';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { view } from '../src/rules/view';

afterEach(()=>vi.unstubAllGlobals());
function worker(){
 const fake={onmessage:undefined as Worker['onmessage']|undefined,onerror:undefined as Worker['onerror']|undefined,postMessage:vi.fn(),terminate:vi.fn()};
 vi.stubGlobal('Worker',class{});
 return {fake,client:new PlannerClient(()=>fake as unknown as Worker)};
}
describe('asynchronous AI',()=>{
 it('correlates concurrent results without exposing secret state to the worker',async()=>{
  const {fake,client}=worker(),s=createGame(p,DEFAULT_SETUP),v=view(s);
  const a=client.plan(v,[],'balanced'),b=client.plan(v,[],'cautious');
  const [first,second]=fake.postMessage.mock.calls.map(([r])=>r);
  expect(first.state.rng).toBeUndefined();expect(first.state.questDecks).toBeUndefined();
  const decision={command:{type:'endActions'},score:0,reason:'Continue',alternatives:1,considered:[]};
  fake.onmessage!.call(fake as unknown as Worker,{data:{id:second.id,decision}} as MessageEvent);
  expect(await b).toEqual(decision);
  fake.onmessage!.call(fake as unknown as Worker,{data:{id:first.id}} as MessageEvent);
  expect(await a).toBeUndefined();client.dispose();
 });
 it('cancels outstanding requests when the game is unmounted or ownership changes',async()=>{
  const {fake,client}=worker();const result=client.plan(view(createGame(p,DEFAULT_SETUP)),[],'balanced');
  client.dispose();expect(await result).toBeUndefined();expect(fake.terminate).toHaveBeenCalledOnce();
  expect(()=>fake.onmessage!.call(fake as unknown as Worker,{data:{id:1,decision:{command:{type:'endActions'}}}} as MessageEvent)).not.toThrow();
 });
 it('surfaces worker failures and permits a fresh worker on the next request',async()=>{
  const {fake,client}=worker();const result=client.plan(view(createGame(p,DEFAULT_SETUP)),[],'balanced');
  const rejection=expect(result).rejects.toThrow('AI planning failed');fake.onerror!.call(fake as unknown as Worker,{} as ErrorEvent);await rejection;
  expect(fake.terminate).toHaveBeenCalledOnce();client.dispose();
 });
});
