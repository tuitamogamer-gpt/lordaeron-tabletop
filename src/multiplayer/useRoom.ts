import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '../../server/rooms';
import type { Command, Setup } from '../rules/model';
type Credentials={room:string;token:string};
const storage='lordaeron-online-session-v2';
const archiveStorage='lordaeron-saved-rooms-v2';
function savedCredentials():Record<string,Credentials>{try{return JSON.parse(localStorage.getItem(archiveStorage)??'{}');}catch{return {};}}
export function useRoom(){
 const[credentials,setCredentials]=useState<Credentials|null>(()=>{try{return JSON.parse(localStorage.getItem(storage)??'null');}catch{return null;}});
 const[snapshot,setSnapshot]=useState<RoomSnapshot|null>(null),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const[savedRooms,setSavedRooms]=useState(()=>Object.keys(savedCredentials()));
 const current=useRef(snapshot);current.current=snapshot;
 const cred=useRef(credentials);cred.current=credentials;
 const accept=useCallback((s:RoomSnapshot)=>setSnapshot(old=>!old||old.id!==s.id||s.revision>=old.revision?s:old),[]);
 const refresh=useCallback(async()=>{const c=cred.current;if(!c)return;const r=await fetch(`/api/game?room=${encodeURIComponent(c.room)}`,{headers:{Authorization:`Bearer ${c.token}`}});const data=await r.json();if(!r.ok)throw new Error(data.error??'Veza nije uspjela.');if(cred.current?.room===c.room)accept(data);},[accept]);
 useEffect(()=>{if(!credentials){setSnapshot(null);setConnected(false);localStorage.removeItem(storage);return;}
  localStorage.setItem(storage,JSON.stringify(credentials));const saved={...savedCredentials(),[credentials.room]:credentials};localStorage.setItem(archiveStorage,JSON.stringify(saved));setSavedRooms(Object.keys(saved));let stopped=false,socket:WebSocket|undefined,retry:ReturnType<typeof setTimeout>|undefined,attempt=0;
  const connect=()=>{if(stopped)return;socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/ws`);
   socket.onopen=()=>{socket?.send(JSON.stringify(credentials));};
   socket.onmessage=e=>{if(stopped)return;try{const data=JSON.parse(String(e.data)) as RoomSnapshot;accept(data);setConnected(true);setError('');attempt=0;}catch{setError('Neispravan odgovor mrežnog servisa.');}};
   socket.onerror=()=>setConnected(false);
   socket.onclose=()=>{setConnected(false);if(!stopped)retry=setTimeout(connect,Math.min(15000,1000*2**attempt++));};
  };
  void refresh().catch(e=>setError(e.message));connect();
  // Resync also covers a missing/disabled WebSocket beta endpoint; commands remain authoritative.
  const fallback=setInterval(()=>{if(socket?.readyState!==WebSocket.OPEN)void refresh().catch(e=>setError(e.message));},4000);
  return()=>{stopped=true;clearInterval(fallback);if(retry)clearTimeout(retry);socket?.close();};
 },[credentials,refresh,accept]);
 const request=useCallback(async(body:Record<string,unknown>,token=cred.current?.token)=>{
  setBusy(true);setError('');try{
   let response:Response;
   try{response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});}
   catch(e){if(body.kind!=='command')throw e;response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});}
   const data=await response.json();if(!response.ok){if(response.status===409)await refresh();throw new Error(data.error??'Zahtjev nije uspio.');}
   if(data.token)setCredentials({room:data.id,token:data.token});accept(data);return true;
  }catch(e){setError(e instanceof Error?e.message:'Veza nije uspjela.');return false;}finally{setBusy(false);}
 },[accept,refresh]);
 const mutate=useCallback((body:Record<string,unknown>)=>{const s=current.current;if(!s)return Promise.resolve(false);return request({...body,room:s.id,revision:s.revision});},[request]);
 return {snapshot,connected,busy,error,credentials,savedRooms,resume:(id:string)=>{const c=savedCredentials()[id];if(c)setCredentials(c);},
  create:(name:string,setup:Setup,heroes:string[])=>request({kind:'create',name,setup,heroes},''),
  join:(room:string,name:string,heroes:string[])=>request({kind:'join',room,name,heroes},''),
  command:(command:Command)=>mutate({kind:'command',command,requestId:crypto.randomUUID()}),
  configure:(bots:string[])=>mutate({kind:'configure',bots}),start:()=>mutate({kind:'start'}),consent:(accept:boolean)=>mutate({kind:'consent',accept}),tick:()=>mutate({kind:'tick'}),
  leave:()=>{cred.current=null;setCredentials(null);setError('');},refresh,clearError:()=>setError(''),
 };
}
