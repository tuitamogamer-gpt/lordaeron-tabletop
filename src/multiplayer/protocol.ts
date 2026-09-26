import { z } from 'zod';
import type { Command, Setup } from '../rules/model.js';
export const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9:-]+$/);
const ids = z.array(id).max(40);
const n = z.number().int().min(0).max(10000);
const dieIds = z.array(z.number().int().min(0).max(1000)).max(21);
const slots = z.array(z.object({ card: id.optional(), addons: ids }).strict()).max(7);
const pool = z.object({ red: n, blue: n, green: n }).strict();
const op = z.discriminatedUnion('op', [z.object({ op:z.literal('buy'),card:id,discard:id.optional() }).strict(),z.object({ op:z.literal('sell'),card:id }).strict(),z.object({ op:z.literal('train'),card:id }).strict()]);
const schema = z.discriminatedUnion('type', [
 z.object({type:z.literal('travel'),hero:id,path:z.array(id).max(2)}).strict(),
 z.object({type:z.literal('rest'),hero:id,health:n}).strict(),
 z.object({type:z.literal('train'),hero:id,cards:ids}).strict(),
 z.object({type:z.literal('town'),hero:id,health:n,operations:z.array(op).max(100)}).strict(),
 z.object({type:z.literal('challenge'),hero:id,target:id,allies:z.array(id).max(2)}).strict(),
 z.object({type:z.literal('trade'),hero:id,to:id,items:ids,gold:n,receiveItems:ids,receiveGold:n}).strict(),
 z.object({type:z.literal('endActions')}).strict(), z.object({type:z.literal('endManagement')}).strict(),
 z.object({type:z.literal('manage'),hero:id,slots,discard:ids}).strict(),
 z.object({type:z.literal('talent'),hero:id,card:id}).strict(), z.object({type:z.literal('attacker'),hero:id}).strict(),
 z.object({type:z.literal('ability'),hero:id,card:id,ability:id,args:z.object({dice:dieIds,target:id.optional(),color:z.enum(['red','blue','green']).optional()}).partial().strict().optional()}).strict(),
 z.object({type:z.literal('roll'),omit:pool.optional()}).strict(),
 z.object({type:z.literal('penalty'),dice:dieIds}).strict(),z.object({type:z.literal('reroll'),dice:dieIds}).strict(),
 z.object({type:z.literal('advance'),targets:ids.optional()}).strict(), z.object({type:z.literal('monster'),unequip:ids.optional()}).strict(),
 z.object({type:z.literal('tokens'),toAttrition:dieIds.optional()}).strict(),
 z.object({type:z.literal('armor'),faction:z.enum(['horde','alliance']),damage:n,defense:n}).strict(),
 z.object({type:z.literal('wound'),hero:id,pet:id.optional()}).strict(),z.object({type:z.literal('respawn'),hero:id,region:id}).strict(),
 z.object({type:z.literal('reward'),hero:id,card:id,discard:id.optional()}).strict(),
 z.object({type:z.literal('quest'),tier:z.enum(['green','yellow','red'])}).strict(),
 z.object({type:z.literal('bid'),hero:id,amount:n}).strict(),
 z.object({type:z.literal('loot'),hero:id,from:id,card:id,discard:id.optional()}).strict(),
 z.object({type:z.literal('closeBattle')}).strict(),
]);
export const commandSchema: z.ZodType<Command> = schema;
export const setupSchema: z.ZodType<Setup> = z.object({seed:z.number().int().min(1).max(0xffffffff),roster:z.array(id).min(4).max(6),overlord:id}).strict();
export const requestSchema = z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create'),name:z.string().trim().min(1).max(32),setup:setupSchema,heroes:z.array(id).min(1).max(3)}).strict(),
 z.object({kind:z.literal('join'),room:id,name:z.string().trim().min(1).max(32),heroes:z.array(id).min(1).max(3)}).strict(),
 z.object({kind:z.literal('command'),room:id,revision:n,requestId:z.string().min(8).max(80),command:commandSchema}).strict(),
 z.object({kind:z.literal('configure'),room:id,revision:n,bots:z.array(id).max(6)}).strict(),
 z.object({kind:z.literal('start'),room:id,revision:n}).strict(),
 z.object({kind:z.literal('consent'),room:id,revision:n,accept:z.boolean()}).strict(),
 z.object({kind:z.literal('tick'),room:id,revision:n}).strict(),
]);
export type RoomRequest = z.infer<typeof requestSchema>;
