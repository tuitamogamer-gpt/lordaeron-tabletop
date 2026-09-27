import { describe, expect, it } from 'vitest';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { apply, createGame } from '../src/rules/game';
import { contentHash, importSession, type Session } from '../src/rules/session';

// A save from the last production release, before six card descriptions were
// translated. Commands and every gameplay field use the same v4 rules.
const previous:Session={format:'lordaeron-rules-session',version:2,pack:'base-2005-faq-1.4-map-v4',contentHash:'3770cbda',setup:DEFAULT_SETUP,commands:[
 {type:'travel',hero:DEFAULT_SETUP.roster[0],path:['stillwater']},
 {type:'rest',hero:DEFAULT_SETUP.roster[0],health:0},
]};

describe('English release save compatibility',()=>{
 it('replays a previous v4 save and exports it with the current content hash',()=>{
  const {state,session}=importSession(p,JSON.stringify(previous));
  const expected=previous.commands.reduce((s,c)=>apply(p,s,c),createGame(p,DEFAULT_SETUP));
  expect(state).toEqual(expected);
  expect(state.heroes[0]).toMatchObject({location:'stillwater',actions:0});
  expect(session.commands).toEqual(previous.commands);
  expect(session.contentHash).toBe(contentHash(p));
  expect(session.contentHash).not.toBe(previous.contentHash);
  expect(importSession(p,JSON.stringify(session)).state).toEqual(state);
 });
 it('still rejects an old save when a gameplay value changes',()=>{
  const changed=structuredClone(p);changed.cards[0].price++;
  expect(()=>importSession(changed,JSON.stringify(previous))).toThrow(/different version/);
 });
 it('rejects unknown hashes and saves from the previous map',()=>{
  for(const changed of [{contentHash:'00000000'},{pack:'base-2005-faq-1.4-v3'}]){
   expect(()=>importSession(p,JSON.stringify({...previous,...changed}))).toThrow(/different version/);
  }
 });
});
