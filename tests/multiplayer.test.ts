import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { WebSocket, type WebSocketServer } from 'ws';
import { DEFAULT_SETUP } from '../src/data/development-pack';
import { commandSchema } from '../src/multiplayer/protocol';
import { handleRoom, readRoom, type RoomSnapshot } from '../server/rooms';
import { MemoryStore } from '../server/store';
import { createHandler } from '../server/http';
import { attachWebSockets } from '../server/websocket';
const warrior=DEFAULT_SETUP.roster[0],mage=DEFAULT_SETUP.roster[1];
type Login=RoomSnapshot&{token:string};
async function fixture(){
 const store=new MemoryStore();
 const host=await handleRoom(store,{kind:'create',name:'Domaćin',setup:DEFAULT_SETUP,heroes:[warrior]}) as Login;
 const guest=await handleRoom(store,{kind:'join',name:'Gost',room:host.id,heroes:[mage]}) as Login;
 let s=await handleRoom(store,{kind:'configure',room:host.id,revision:guest.revision,bots:DEFAULT_SETUP.roster.filter(id=>![warrior,mage].includes(id))},host.token) as RoomSnapshot;
 s=await handleRoom(store,{kind:'start',room:s.id,revision:s.revision},host.token) as RoomSnapshot;
 return {store,host,guest,s};
}
describe('authoritative multiplayer',()=>{
 it('redacts seeds, deck order, credentials and other sealed bids',async()=>{
  const {store,host,guest}=await fixture();const raw=(await store.get(host.id))!;
  raw.state.phase='event';raw.state.auction={event:'auction',item:'auction-charm',bids:{[warrior]:4}};
  await store.compareSwap(raw.id,raw.revision,raw);
  const v=await readRoom(store,host.id,guest.token);
  expect(v.state).not.toHaveProperty('rng');expect(v).not.toHaveProperty('setup');expect(v).not.toHaveProperty('token');
  expect(v.state).not.toHaveProperty('itemDecks');expect(v.state.auction?.ownBids).not.toHaveProperty(warrior);
  expect(v.state.auction?.submitted).toContain(warrior);
  expect(v.members.every(m=>!('tokenHash' in m))).toBe(true);
 });
 it('authenticates every read and rejects a command for someone else’s hero',async()=>{
  const {store,host,guest,s}=await fixture();
  await expect(readRoom(store,s.id,'wrong-token')).rejects.toMatchObject({status:401});
  await expect(handleRoom(store,{kind:'command',room:s.id,revision:s.revision,requestId:'unauthorized-1',command:{type:'rest',hero:mage,health:0}},host.token)).rejects.toThrow(/upravljaš/);
  expect((await readRoom(store,s.id,guest.token)).revision).toBe(s.revision);
 });
 it('retries a request id without charging a second action and rejects reuse with a different command',async()=>{
  const {store,host,s}=await fixture();const request={kind:'command' as const,room:s.id,revision:s.revision,requestId:'retry-command-1',command:{type:'rest' as const,hero:warrior,health:0}};
  const first=await handleRoom(store,request,host.token) as RoomSnapshot, retry=await handleRoom(store,request,host.token) as RoomSnapshot;
  expect(retry.revision).toBe(first.revision);expect(retry.state.heroes.find(h=>h.id===warrior)?.actions).toBe(1);
  await expect(handleRoom(store,{...request,command:{...request.command,health:1}},host.token)).rejects.toThrow(/request ID/);
 });
 it('accepts exactly one concurrent command at a revision, then allows the loser to resync',async()=>{
  const {store,host,guest,s}=await fixture();const results=await Promise.allSettled([
   handleRoom(store,{kind:'command',room:s.id,revision:s.revision,requestId:'race-host-1',command:{type:'rest',hero:warrior,health:0}},host.token),
   handleRoom(store,{kind:'command',room:s.id,revision:s.revision,requestId:'race-guest-1',command:{type:'rest',hero:mage,health:0}},guest.token),
  ]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const rejected=results.find(r=>r.status==='rejected');expect(rejected?.status==='rejected'&&rejected.reason.status).toBe(409);
  const latest=await readRoom(store,s.id,guest.token);expect(latest.revision).toBe(s.revision+1);expect(latest.state.heroes.filter(h=>[warrior,mage].includes(h.id)).reduce((n,h)=>n+h.actions,0)).toBe(3);
 });
 it('holds a trade until both human owners agree and applies it once',async()=>{
  const {store,host,guest,s}=await fixture();let v=await handleRoom(store,{kind:'command',room:s.id,revision:s.revision,requestId:'open-trade-1',command:{type:'rest',hero:warrior,health:0}},host.token) as RoomSnapshot;
  v=await handleRoom(store,{kind:'command',room:s.id,revision:v.revision,requestId:'offer-trade-1',command:{type:'trade',hero:warrior,to:mage,items:[],receiveItems:[],gold:2,receiveGold:0}},host.token) as RoomSnapshot;
  expect(v.pending?.required).toHaveLength(2);expect(v.state.heroes.find(h=>h.id===warrior)?.gold).toBe(5);
  v=await handleRoom(store,{kind:'consent',room:s.id,revision:v.revision,accept:true},guest.token) as RoomSnapshot;
  expect(v.pending).toBeUndefined();expect(v.state.heroes.find(h=>h.id===warrior)?.gold).toBe(3);expect(v.state.heroes.find(h=>h.id===mage)?.gold).toBe(7);
 });
 it('cannot claim another person’s seat or change bots after start',async()=>{
  const {store,host,s}=await fixture();
  await expect(handleRoom(store,{kind:'join',room:s.id,name:'Treći',heroes:[warrior]})).rejects.toThrow();
  await expect(handleRoom(store,{kind:'configure',room:s.id,revision:s.revision,bots:[warrior]},host.token)).rejects.toThrow();
 });
 it('allows server bot decisions while keeping the human action budget untouched',async()=>{
  const {store,host,s}=await fixture();const v=await handleRoom(store,{kind:'tick',room:s.id,revision:s.revision},host.token) as RoomSnapshot;
  expect(v.revision).toBe(s.revision+1);expect(v.state.heroes.find(h=>h.id===warrior)?.actions).toBe(2);
 });
 it('rejects extra payloads, negative bids and oversized dice lists',()=>{
  expect(commandSchema.safeParse({type:'rest',hero:warrior,health:0,script:'arbitrary code'}).success).toBe(false);
  expect(commandSchema.safeParse({type:'bid',hero:warrior,amount:-1}).success).toBe(false);
  expect(commandSchema.safeParse({type:'reroll',dice:Array(22).fill(0)}).success).toBe(false);
 });
});

describe('HTTP and live WebSocket transport',()=>{
 let server:Server,wss:WebSocketServer,url:string;const store=new MemoryStore(),sockets:WebSocket[]=[];
 beforeAll(async()=>{server=createServer(createHandler(()=>store));wss=attachWebSockets(server,()=>store);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const a=server.address();url=`http://127.0.0.1:${typeof a==='object'&&a?a.port:0}`;});
 afterAll(async()=>{sockets.forEach(s=>s.terminate());await new Promise<void>(resolve=>wss.close(()=>resolve()));server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
 async function post(body:unknown,token=''){return fetch(`${url}/api/game`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});}
 function listen(room:string,token:string){const ws=new WebSocket(url.replace('http:','ws:')+'/api/ws');sockets.push(ws);const messages:RoomSnapshot[]=[];ws.on('message',data=>messages.push(JSON.parse(data.toString())));const ready=new Promise<void>((resolve,reject)=>{ws.on('error',reject);ws.once('open',()=>ws.send(JSON.stringify({room,token})));ws.once('message',()=>resolve());});return {ws,messages,ready};}
 it('delivers the same durable revision to two authenticated clients after an HTTP mutation',async()=>{
  const response=await post({kind:'create',name:'HTTP host',setup:DEFAULT_SETUP,heroes:[warrior]});expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');const host=await response.json() as Login;
  const guest=await(await post({kind:'join',room:host.id,name:'HTTP guest',heroes:[mage]})).json() as Login;
  const a=listen(host.id,host.token),b=listen(host.id,guest.token);await Promise.all([a.ready,b.ready]);
  const next=await(await post({kind:'configure',room:host.id,revision:guest.revision,bots:DEFAULT_SETUP.roster.slice(2)},host.token)).json() as RoomSnapshot;
  await expect.poll(()=>a.messages.at(-1)?.revision,{timeout:4500}).toBe(next.revision);expect(b.messages.at(-1)?.revision).toBe(next.revision);
  expect(a.messages.at(-1)?.controlled).toEqual([warrior]);expect(b.messages.at(-1)?.controlled).toEqual([mage]);
  a.ws.close();b.ws.close();const reconnect=listen(host.id,guest.token);await reconnect.ready;expect(reconnect.messages.at(-1)?.revision).toBe(next.revision);reconnect.ws.close();
 },10000);
 it('rejects a cross-origin mutation and malformed JSON without exposing state',async()=>{
  const cross=await fetch(url+'/api/game',{method:'POST',headers:{Origin:'https://unrelated.invalid'},body:'{}'});expect(cross.status).toBe(403);
  const malformed=await fetch(url+'/api/game',{method:'POST',body:'{broken'});expect(malformed.status).toBe(400);
 });
});
