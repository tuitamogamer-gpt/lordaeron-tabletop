import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { contentHash, importSession, newSession, type Session } from '../src/rules/session';

// Preserve the previous production format as a compatibility regression.
const previous:Session={format:'lordaeron-rules-session',version:2,pack:'base-2005-faq-1.4-map-v4',contentHash:'3770cbda',setup:DEFAULT_SETUP,commands:[
 {type:'travel',hero:DEFAULT_SETUP.roster[0],path:['stillwater']},
 {type:'rest',hero:DEFAULT_SETUP.roster[0],health:0},
]};

describe('Rules release save compatibility',()=>{
 it('rejects v4 saves instead of replaying them with changed rules',()=>{
  expect(()=>importSession(p,JSON.stringify(previous))).toThrow(/different version/);
 });
 it('replays current saves with the same state and hash',()=>{
  const session={...newSession(p,DEFAULT_SETUP),commands:previous.commands};
  const restored=importSession(p,JSON.stringify(session));
  expect(restored.state).toEqual(session.commands.reduce((s,c)=>apply(p,s,c),createGame(p,DEFAULT_SETUP)));
  expect(restored.session.contentHash).toBe(contentHash(p));
 });
 it('rejects a current save when a gameplay value changes',()=>{
  const changed=structuredClone(p);changed.cards[0].price++;
  expect(()=>importSession(changed,JSON.stringify(newSession(p,DEFAULT_SETUP)))).toThrow(/different version/);
 });
 it('rejects unknown hashes and saves from the previous map',()=>{
  for(const changed of [{contentHash:'00000000'},{pack:'base-2005-faq-1.4-v3'},{pack:'base-2005-faq-1.4-v6'}]){
   expect(()=>importSession(p,JSON.stringify({...newSession(p,DEFAULT_SETUP),...changed}))).toThrow(/different version/);
  }
 });
});
