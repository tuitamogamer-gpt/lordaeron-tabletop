import { assert } from './common.js';
import { apply, createGame } from './game.js';
import { commandSchema, setupSchema } from '../multiplayer/protocol.js';
import type { Command, ContentPack, Setup } from './model.js';
export interface Session { format:'lordaeron-rules-session';version:2;pack:string;contentHash:string;setup:Setup;commands:Command[]; }
export function contentHash(p:ContentPack){let hash=2166136261;for(const c of JSON.stringify(p)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(16);}
export const newSession=(p:ContentPack,setup:Setup):Session=>({format:'lordaeron-rules-session',version:2,pack:p.id,contentHash:contentHash(p),setup,commands:[]});
export function importSession(p:ContentPack,text:string){
 assert(text.length<=4_000_000,'Partija je prevelika.');const raw=JSON.parse(text) as Session;
 assert(raw.format==='lordaeron-rules-session'&&raw.version===2&&raw.pack===p.id&&raw.contentHash===contentHash(p),'Sačuvana partija traži drugu verziju pravila ili karata.');
 const setup=setupSchema.parse(raw.setup);assert(Array.isArray(raw.commands)&&raw.commands.length<=20000,'Previše naredbi.');
 const commands=raw.commands.map(c=>commandSchema.parse(c));let state=createGame(p,setup);for(const c of commands)state=apply(p,state,c);
 return{state,session:{...newSession(p,setup),commands}};
}
