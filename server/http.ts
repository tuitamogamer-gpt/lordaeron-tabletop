import type { IncomingMessage, ServerResponse } from 'node:http';
import { requestSchema } from '../src/multiplayer/protocol.js';
import { RuleError } from '../src/rules/common.js';
import { handleRoom, readRoom, RoomError } from './rooms.js';
import { getStore, type RoomStore } from './store.js';
export const allowedOrigin=(req:IncomingMessage)=>{
 const origin=req.headers.origin;if(!origin)return true;
 try { const u=new URL(origin),host=req.headers['x-forwarded-host']??req.headers.host;
  return u.host===host||(!process.env.VERCEL&&process.env.NODE_ENV!=='production'&&['http://127.0.0.1:5173','http://localhost:5173'].includes(origin));
 }catch{return false;}
};
const limits=new Map<string,{time:number;count:number}>();
function rateLimit(req:IncomingMessage){
 const key=String(req.headers['x-real-ip']??req.socket.remoteAddress??'unknown'),now=Date.now();
 if(limits.size>2000)for(const[k,v]of limits)if(now-v.time>60000)limits.delete(k);
 const current=limits.get(key);if(!current||now-current.time>60000){limits.set(key,{time:now,count:1});return;}
 if(++current.count>300)throw new RoomError("Too many requests. Try again shortly.",429);
}
export function createHandler(storeProvider:()=>RoomStore=getStore){ return async function handler(req:IncomingMessage & {body?:unknown},res:ServerResponse){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!allowedOrigin(req))throw new RoomError("This request origin is not allowed.",403);rateLimit(req);
  const store=storeProvider(),token=String(req.headers.authorization??'').replace(/^Bearer /,'');
  let result:unknown;
  if(req.method==='GET'){
   const url=new URL(req.url??'/','http://localhost'),room=url.searchParams.get('room')??'';
   if(!/^[A-Z0-9]{12}$/.test(room))throw new RoomError("Invalid room code.");
   if(token)result=await readRoom(store,room,token);
   else{const r=await store.get(room);if(!r)throw new RoomError("Room not found.",404);result={id:r.id,started:r.started,roster:r.setup.roster,members:r.members.map(m=>({name:m.name,heroes:m.heroes})),bots:r.bots};}
  }else if(req.method==='POST'){
   let body=req.body;
   if(body===undefined){const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){const b=Buffer.from(chunk);bytes+=b.length;if(bytes>64000)throw new RoomError("The request is too large.",413);chunks.push(b);}body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
   if(typeof body==='string')body=JSON.parse(body);
   if(JSON.stringify(body).length>64000)throw new RoomError("The request is too large.",413);
   const parsed=requestSchema.safeParse(body);if(!parsed.success)throw new RoomError("Invalid request format.");
   result=await handleRoom(store,parsed.data,token);
  }else throw new RoomError("Method not supported.",405);
  res.statusCode=200;res.end(JSON.stringify(result));
 }catch(e){
  const expected=e instanceof RoomError||e instanceof RuleError||e instanceof SyntaxError;
  res.statusCode=e instanceof RoomError?e.status:expected?400:503;
  res.end(JSON.stringify({error:expected?(e as Error).message:"The network service is unavailable. Check the connection and storage configuration."}));
 }
}

}
export const handler=createHandler();
