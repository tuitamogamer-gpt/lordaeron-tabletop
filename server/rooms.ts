import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { decide } from '../src/ai/planner.js';
import { DEVELOPMENT_PACK as pack } from '../src/data/development-pack.js';
import { assert, faction, unique } from '../src/rules/common.js';
import { apply, createGame } from '../src/rules/game.js';
import { decisionOwners } from '../src/multiplayer/ownership.js';
import { legalActions } from '../src/rules/legal.js';
import type { Command, Setup, State } from '../src/rules/model.js';
import { view } from '../src/rules/view.js';
import type { RoomRequest } from '../src/multiplayer/protocol.js';
import type { RoomStore } from './store.js';
export class RoomError extends Error { constructor(message:string,public status=400){super(message);} }
interface Member { id:string; name:string; heroes:string[]; tokenHash:string; }
export interface Room { id:string; revision:number; host:string; started:boolean; setup:Setup; state:State; members:Member[]; bots:string[]; receipts: {id:string;by:string;hash:string}[]; pending?:{command:Command;requestId:string;by:string;approvals:string[];required:string[]}; commands:Command[]; updatedAt:number; }
export type RoomSnapshot = ReturnType<typeof snapshot>;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const credential=()=>randomBytes(32).toString('base64url');
export function authenticate(room:Room,token:string):Member {
 if(!token || token.length>128)throw new RoomError('Prijavi se ključem svoje sesije.',401);
 const digest=Buffer.from(hash(token),'hex');
 const member=room.members.find(m=>timingSafeEqual(Buffer.from(m.tokenHash,'hex'),digest));
 if(!member)throw new RoomError('Sesija ne pripada ovoj sobi.',401);return member;
}
export const ownersFor=(s:State,c:Command)=>decisionOwners(pack,s,c);
function requiredFor(c:Command):string[]{if(c.type==='challenge')return[c.hero,...c.allies];if(c.type==='trade')return[c.hero,c.to];return[];}
function botCan(room:Room,c:Command){const owners=ownersFor(room.state,c);return owners.length>0&&owners.every(id=>room.bots.includes(id))&&requiredFor(c).every(id=>room.bots.includes(id));}
function memberCan(room:Room,m:Member,c:Command){return ownersFor(room.state,c).some(id=>m.heroes.includes(id));}
export function snapshot(room:Room,member:Member){
 if(room.state.pack!==pack.id)throw new RoomError('Ova soba koristi prethodnu verziju sadržaja. Kreiraj novu sobu za aktuelnu kampanju.',409);
 const all=room.started&&!room.pending?legalActions(pack,room.state):[],legal=all.filter(c=>memberCan(room,member,c));
 return {id:room.id,revision:room.revision,host:room.host,started:room.started,me:member.id,controlled:member.heroes,members:room.members.map(({tokenHash:_tokenHash,...m})=>m),bots:room.bots,state:view(room.state,member.heroes),legal,botReady:all.some(c=>botCan(room,c)),pending:room.pending?{command:room.pending.command,required:room.pending.required,approvals:room.pending.approvals}:undefined,updatedAt:room.updatedAt};
}
export async function readRoom(store:RoomStore,id:string,token:string){const room=await store.get(id);if(!room)throw new RoomError('Soba nije pronađena.',404);return snapshot(room,authenticate(room,token));}
export async function handleRoom(store:RoomStore,input:RoomRequest,token=''):Promise<unknown> {
 if(input.kind==='create'){
  assert(unique(input.heroes)&&input.heroes.every(id=>input.setup.roster.includes(id))&&new Set(input.heroes.map(id=>faction(pack,id))).size===1,'Odaberi svoje likove iz jedne frakcije.');
  const key=credential(),member:Member={id:randomUUID(),name:input.name,heroes:input.heroes,tokenHash:hash(key)};
  // The client cannot select a predictable multiplayer dice/deck seed.
  const setup={...input.setup,seed:randomInt(1,0x100000000)};
  const room:Room={id:randomBytes(6).toString('hex').toUpperCase(),revision:0,host:member.id,started:false,setup,state:createGame(pack,setup),members:[member],bots:[],receipts:[],commands:[],updatedAt:Date.now()};
  if(!await store.create(room))throw new RoomError('Ponovi kreiranje sobe.',409);
  return {...snapshot(room,member),token:key};
 }
 const room=await store.get(input.room);if(!room)throw new RoomError('Soba nije pronađena.',404);
 if(input.kind==='join'){
  assert(!room.started,'Partija je već počela; koristi sačuvani ključ za ponovno spajanje.');
  assert(room.members.length<6&&unique(input.heroes)&&input.heroes.every(id=>room.setup.roster.includes(id)&&!room.members.some(m=>m.heroes.includes(id)))&&new Set(input.heroes.map(id=>faction(pack,id))).size===1,'Odabrana mjesta nisu dostupna.');
  const key=credential(),m:Member={id:randomUUID(),name:input.name,heroes:input.heroes,tokenHash:hash(key)};room.members.push(m);room.bots=room.bots.filter(id=>!m.heroes.includes(id));
  const before=room.revision;room.revision++;room.updatedAt=Date.now();if(!await store.compareSwap(room.id,before,room))throw new RoomError('Soba se promijenila; ponovi pristupanje.',409);
  return {...snapshot(room,m),token:key};
 }
 const m=authenticate(room,token);
 if(input.kind==='command'){
  const receipt=room.receipts.find(r=>r.id===input.requestId&&r.by===m.id);
  if(receipt){assert(receipt.hash===hash(JSON.stringify(input.command)),'Isti request ID je već korišten za drugi potez.');return snapshot(room,m);}
 }
 if(room.revision!==input.revision)throw new RoomError('Stanje se promijenilo. Učitaj posljednju verziju pa ponovi potez.',409);
 const before=room.revision;
 if(input.kind==='configure'){
  assert(m.id===room.host&&!room.started,'Samo domaćin uređuje lobby.');
  assert(unique(input.bots)&&input.bots.every(id=>room.setup.roster.includes(id)&&!room.members.some(m=>m.heroes.includes(id))),'Bot ne može preuzeti zauzeto mjesto.');room.bots=input.bots;
 }else if(input.kind==='start'){
  assert(m.id===room.host&&!room.started,'Partiju pokreće domaćin.');
  assert(room.setup.roster.every(id=>room.bots.includes(id)||room.members.some(m=>m.heroes.includes(id))),'Svako mjesto mora imati igrača ili bota.');room.started=true;
 }else if(input.kind==='consent'){
  const pending=room.pending;assert(pending&&pending.required.includes(m.id),'Nema zahtjeva za tvoju potvrdu.');
  if(!input.accept)delete room.pending;
  else{if(!pending.approvals.includes(m.id))pending.approvals.push(m.id);if(pending.required.every(id=>pending.approvals.includes(id))){room.state=apply(pack,room.state,pending.command);room.commands.push(pending.command);delete room.pending;}}
 }else if(input.kind==='command'){
  assert(room.started&&!room.pending,'Partija nije počela ili čeka odgovor saveznika.');
  assert(memberCan(room,m,input.command),'Ne upravljaš junakom koji sada odlučuje.');
  // Validate before asking anyone for consent. No partial mutation on rejection.
  const next=apply(pack,room.state,input.command);
  const required=[...new Set(requiredFor(input.command).flatMap(id=>room.members.filter(m=>m.heroes.includes(id)).map(m=>m.id)))];
  if(required.some(id=>id!==m.id))room.pending={command:input.command,requestId:input.requestId,by:m.id,approvals:[m.id],required};
  else{room.state=next;room.commands.push(input.command);}
  room.receipts.push({id:input.requestId,by:m.id,hash:hash(JSON.stringify(input.command))});room.receipts=room.receipts.slice(-128);
 }else if(input.kind==='tick'){
  if(!room.started||room.pending)return snapshot(room,m);
  const legal=legalActions(pack,room.state).filter(c=>botCan(room,c));
  const decision=decide(pack,view(room.state,room.bots),legal);
  if(!decision)return snapshot(room,m);
  room.state=apply(pack,room.state,decision.command);room.commands.push(decision.command);
 }
 assert(room.commands.length<=20000,'Partija je dostigla ograničenje zapisa poteza.');
 room.revision++;room.updatedAt=Date.now();
 if(!await store.compareSwap(room.id,before,room))throw new RoomError('Drugi potez je već prihvaćen. Osvježi stanje.',409);
 return snapshot(room,m);
}
