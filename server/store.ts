import { Redis } from '@upstash/redis';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Room } from './rooms.js';
export interface RoomStore { get(id:string):Promise<Room|null>; create(room:Room):Promise<boolean>; compareSwap(id:string,revision:number,room:Room):Promise<boolean>; }
export class MemoryStore implements RoomStore {
 private rooms = new Map<string, Room>();
 async get(id:string) { return structuredClone(this.rooms.get(id) ?? null); }
 async create(room:Room) { if (this.rooms.has(room.id)) return false; this.rooms.set(room.id, structuredClone(room)); return true; }
 async compareSwap(id:string,revision:number,room:Room) { if (this.rooms.get(id)?.revision !== revision) return false; this.rooms.set(id,structuredClone(room)); return true; }
}
/** Single local dev server. Production must use Redis CAS across all function instances. */
export class FileStore implements RoomStore {
 private queue: Promise<unknown> = Promise.resolve();
 constructor(private directory=resolve('.local-data/rooms')) {}
 private path(id:string) { if (!/^[A-Z0-9]{12}$/.test(id)) throw new Error('Neispravan ID sobe.'); return join(this.directory,`${id}.json`); }
 async get(id:string):Promise<Room|null> { try { return JSON.parse(await readFile(this.path(id),'utf8')) as Room; } catch(e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; } }
 private async write(room:Room) { await mkdir(this.directory,{recursive:true}); const tmp=join(this.directory,`${room.id}-${randomUUID()}.tmp`); await writeFile(tmp,JSON.stringify(room),'utf8'); await rename(tmp,this.path(room.id)); }
 private locked<T>(fn:()=>Promise<T>):Promise<T> { const next=this.queue.then(fn,fn); this.queue=next.catch(()=>{}); return next; }
 create(room:Room) { return this.locked(async()=>{if(await this.get(room.id))return false;await this.write(room);return true;}); }
 compareSwap(id:string,revision:number,room:Room) { return this.locked(async()=>{if((await this.get(id))?.revision!==revision)return false;await this.write(room);return true;}); }
}
export class RedisStore implements RoomStore {
 constructor(private redis:Redis,private ttl=60*60*24*30) {}
 private key(id:string) { return `lordaeron:room:${id}`; }
 async get(id:string) { return await this.redis.get<Room>(this.key(id)); }
 async create(room:Room) { return await this.redis.set(this.key(room.id),room,{nx:true,ex:this.ttl}) === 'OK'; }
 async compareSwap(id:string,revision:number,room:Room) {
  const script = "local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local old=cjson.decode(raw); if old.revision~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1";
  return await this.redis.eval<[number,string,number],number>(script,[this.key(id)],[revision,JSON.stringify(room),this.ttl])===1;
 }
}
let singleton:RoomStore|undefined;
export function getStore():RoomStore {
 if (singleton) return singleton;
 if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) singleton=new RedisStore(Redis.fromEnv());
 else if (process.env.VERCEL || process.env.NODE_ENV==='production') throw new Error("For online games, connect Upstash Redis and configure UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.");
 else singleton=new FileStore();
 return singleton;
}
