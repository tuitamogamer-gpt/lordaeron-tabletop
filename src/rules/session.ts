import { assert } from './common.js';
import { apply, createGame } from './game.js';
import { commandSchema, setupSchema } from '../multiplayer/protocol.js';
import type { Command, ContentPack, Setup, State } from './model.js';
export interface Session { format:'lordaeron-rules-session';version:2;pack:string;contentHash:string;setup:Setup;commands:Command[]; }
export const MAX_SESSION_SIZE=4_000_000;
export const MAX_SESSION_COMMANDS=20_000;
/** Limits for files from outside. The browser's own autosave has none: a campaign must never outgrow what loads it. */
export type SessionLimits={size?:number;commands?:number};
export const OWN_SAVE:SessionLimits={size:Infinity,commands:Infinity};
const contentHashes=new WeakMap<ContentPack,string>();
export function contentHash(p:ContentPack){let known=contentHashes.get(p);if(known===undefined){let hash=2166136261;for(const c of JSON.stringify(p)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}known=(hash>>>0).toString(16);contentHashes.set(p,known);}return known;}
// The pack ID also versions engine semantics, including combat pool replacement.
// Previous releases remain preserved under their own browser storage keys.
function compatibleHash(p:ContentPack,saved:string){return saved===contentHash(p);}
// The setup is written in one key order, so that two writers of the same game produce the same text.
export const newSession=(p:ContentPack,setup:Setup):Session=>({format:'lordaeron-rules-session',version:2,pack:p.id,contentHash:contentHash(p),setup:{seed:setup.seed,roster:[...setup.roster],overlord:setup.overlord,...(setup.variants?{variants:{...(setup.variants.deadlyPvp===undefined?{}:{deadlyPvp:setup.variants.deadlyPvp}),...(setup.variants.overlordOnly===undefined?{}:{overlordOnly:setup.variants.overlordOnly})}}:{})},commands:[]});
/** Validates saved moves and keeps them exactly as written, so that saving the game again produces the same text. */
function checked(raw:unknown[]):Command[]{for(const c of raw)commandSchema.parse(c);return raw as Command[];}
function readSession(p:ContentPack,text:string,limits:SessionLimits){
 assert(text.length<=(limits.size??MAX_SESSION_SIZE),"The game file is too large.");
 let parsed:unknown;
 try{parsed=JSON.parse(text);}catch{throw new Error('The game file is not valid JSON.');}
 assert(parsed!==null&&typeof parsed==='object'&&!Array.isArray(parsed),"This file is not a saved game.");
 const raw=parsed as Session;
 assert(raw.format==='lordaeron-rules-session'&&raw.version===2&&raw.pack===p.id&&compatibleHash(p,raw.contentHash),"This saved game requires a different version of the rules or cards.");
 const setup=setupSchema.parse(raw.setup);assert(Array.isArray(raw.commands)&&raw.commands.length<=(limits.commands??MAX_SESSION_COMMANDS),"Too many commands.");
 return{setup,commands:raw.commands as unknown[]};
}
export function importSession(p:ContentPack,text:string,limits:SessionLimits={}){
 const{setup,commands:raw}=readSession(p,text,limits);
 const commands=checked(raw);let state=createGame(p,setup);for(const c of commands)state=apply(p,state,c);
 return{state,session:{...newSession(p,setup),commands}};
}
/** Resumes a saved game from a state known to follow its first `count` moves, replaying only the moves after them. */
export function resumeSession(p:ContentPack,text:string,from:{state:State;count:number},limits:SessionLimits=OWN_SAVE){
 const{setup,commands:raw}=readSession(p,text,limits);assert(from.count<=raw.length,"The saved state is ahead of the saved moves.");
 let state=from.state;const tail=checked(raw.slice(from.count));for(const c of tail)state=apply(p,state,c);
 return{state,session:{...newSession(p,setup),commands:[...raw.slice(0,from.count) as Command[],...tail]}};
}
/** True when `text` is the saved game `mine` with more moves appended. Both come from JSON.stringify of a session. */
export const extendsSession=(mine:string,text:string)=>text.length>mine.length&&text.startsWith(mine.slice(0,-2))&&(mine.endsWith('[]}')||text[mine.length-2]===',');
