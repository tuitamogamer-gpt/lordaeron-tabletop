import { createServer, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { allowedOrigin } from './http';
import { authenticate, readRoom, snapshot as roomSnapshot } from './rooms';
import { getStore, type RoomStore } from './store';
interface Subscription { room:string;token:string;revision:number;busy:boolean; }
/** The socket is an ephemeral delivery channel; authoritative room state lives in Redis. */
export function attachWebSockets(server:Server,storeProvider:()=>RoomStore=getStore){
 const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
 const clients=new Map<WebSocket,Subscription>();
 server.on('upgrade',(req,socket,head)=>{
  if(!allowedOrigin(req)||!req.url?.startsWith('/api/ws')){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  let authenticating=false;
  const authDeadline=setTimeout(()=>ws.close(1008,'Authentication required'),5000);
  // Reconnect before the function lifetime ends; clients reload the durable revision.
  const lifetime=setTimeout(()=>ws.close(1012,'Reconnect'),240000);
  ws.on('message',async raw=>{
   if(authenticating||clients.has(ws)){ws.close(1008,'Already subscribed');return;}
   authenticating=true;
   try{const msg=JSON.parse(raw.toString()) as {room?:unknown;token?:unknown};
    if(typeof msg.room!=='string'||!/^[A-Z0-9]{12}$/.test(msg.room)||typeof msg.token!=='string'||msg.token.length>128)throw new Error();
    const snapshot=await readRoom(storeProvider(),msg.room,msg.token);
    if(ws.readyState!==1)return;
    clearTimeout(authDeadline);clients.set(ws,{room:msg.room,token:msg.token,revision:snapshot.revision,busy:false});
    ws.send(JSON.stringify(snapshot));
   }catch{ws.close(1008,'Invalid session');}
  });
  ws.on('close',()=>{clearTimeout(authDeadline);clearTimeout(lifetime);clients.delete(ws);});
  ws.on('error',()=>ws.close());
 });
 // Reconcile across separate Vercel instances; no assumption of room/session affinity.
 const interval=setInterval(()=>{for(const[ws,sub]of clients){if(sub.busy||ws.readyState!==1)continue;sub.busy=true;
  void storeProvider().get(sub.room).then(room=>{if(!room)throw new Error('Missing room');if(room.revision!==sub.revision&&ws.readyState===1){const snapshot=roomSnapshot(room,authenticate(room,sub.token));sub.revision=snapshot.revision;ws.send(JSON.stringify(snapshot));}}).catch(()=>{if(ws.readyState===1)ws.close(1013,'Retry later');}).finally(()=>sub.busy=false);
 }},1500);
 interval.unref();wss.on('close',()=>clearInterval(interval));return wss;
}
export function websocketServer(){const server=createServer((_req,res)=>{res.writeHead(426,{'Content-Type':'text/plain'});res.end('WebSocket upgrade required');});attachWebSockets(server);return server;}
