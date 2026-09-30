// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BASE_PACK as p, DEFAULT_SETUP } from '../src/data/base';
import { createGame } from '../src/rules/game';
import { view } from '../src/rules/view';
import Chronicle from '../src/campaign/Chronicle';
import EncounterPanel from '../src/campaign/EncounterPanel';
import RulesGuide from '../src/campaign/RulesGuide';
afterEach(cleanup);
beforeAll(()=>{
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});

describe('bounded chronicle browsing',()=>{
 it('keeps every entry reachable, filters named characters and resets paging',()=>{
  const log=Array.from({length:19},(_,id)=>({id,turn:Math.floor(id/4)+1,text:`${DEFAULT_SETUP.roster[0]} · entry ${id}`}));
  const r=render(<Chronicle log={log}/>),seen:string[]=[];
  do{
   const entries=r.container.querySelectorAll('.chronicle-entries article');
   expect(entries.length).toBeLessThanOrEqual(6);
   entries.forEach(entry=>seen.push(entry.textContent!));
   const next=screen.getByRole('button',{name:'Next'}) as HTMLButtonElement;
   if(next.disabled)break;fireEvent.click(next);
  }while(true);
  expect(seen).toHaveLength(log.length);expect(new Set(seen).size).toBe(log.length);
  fireEvent.change(screen.getByRole('combobox',{name:'Filter chronicle by turn'}),{target:{value:'3'}});
  expect(r.container.querySelectorAll('.chronicle-entries article')).toHaveLength(4);
  expect(screen.getByRole('button',{name:'Previous'}).hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByRole('textbox',{name:'Search the chronicle'}),{target:{value:p.characters.find(c=>c.id===DEFAULT_SETUP.roster[0])!.name}});
  expect(r.container.querySelectorAll('.chronicle-entries article')).toHaveLength(4);
  fireEvent.change(screen.getByRole('textbox',{name:'Search the chronicle'}),{target:{value:'unmatched'}});
  expect(screen.getByText('No entries match your filters.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
  expect(screen.getByRole('status').textContent).toContain('1–6 of 19');
 });
});
describe('encounter sections',()=>{
 it('shows the entire discard pile through three-card pages without changing game state',()=>{
  const state=createGame(p,DEFAULT_SETUP);state.eventDiscard=p.events.slice(0,8).map(e=>e.id);
  const before=structuredClone(state),r=render(<EncounterPanel state={view(state)}/>);
  expect(screen.getByText('cards remain')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/^Discard pile/}));
  const seen:string[]=[];
  do{const entries=r.container.querySelectorAll('.encounter-read-card');expect(entries.length).toBeLessThanOrEqual(3);entries.forEach(e=>seen.push(e.getAttribute('aria-label')!));const next=screen.getByRole('button',{name:'Next'}) as HTMLButtonElement;if(next.disabled)break;fireEvent.click(next);}while(true);
  expect(seen).toHaveLength(8);expect(new Set(seen).size).toBe(8);
  fireEvent.click(screen.getAllByRole('button',{name:/^Inspect/})[0]);
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Close'}));
  expect(screen.getByRole('status').textContent).toContain('7–8 of 8');
  fireEvent.click(screen.getByRole('button',{name:'Turn track'}));
  expect(r.container.querySelectorAll('.campaign-track-grid>div')).toHaveLength(30);
  expect(r.container.querySelector('[aria-current=step]')?.textContent).toContain('1');
  expect(state).toEqual(before);
 });
});
it('keeps content sources reachable from the quick rules guide',()=>{
 const setup=vi.fn(),design=vi.fn();render(<RulesGuide onSetup={setup} onDesign={design}/>);
 fireEvent.click(screen.getByRole('button',{name:/Open setup guide/}));expect(setup).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Content & sources'}));
 expect(screen.getByRole('link',{name:'Official rulebook'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Design system'}));expect(design).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Quick guide'}));expect(screen.getByText('Travel through Lordaeron')).toBeTruthy();
});
