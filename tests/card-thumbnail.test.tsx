// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CardThumbnail } from '../src/campaign/parts';
import { BASE_PACK as p } from '../src/data/base';
import { card } from '../src/rules/common';

afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});

describe('compact card previews',()=>{
 it('keeps all rules out of the slot and reveals every strength on keyboard focus',()=>{
  const inspect=vi.fn(),r=render(<div style={{overflow:'hidden'}}><CardThumbnail card={card(p,'warrior-execute')} onClick={inspect}/></div>);
  expect(r.container.querySelector('.folio-card')).toBeNull();
  const trigger=screen.getByRole('button',{name:'Inspect Execute'});
  fireEvent.focus(trigger);
  const tooltip=screen.getByRole('tooltip',{name:'Execute full card'});
  expect(r.container.contains(tooltip)).toBe(false);
  expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  expect(tooltip.querySelectorAll('.power-strength-option')).toHaveLength(5);
  for(let n=1;n<=5;n++)expect(tooltip.textContent).toContain(`${n} energy`);
  fireEvent.click(trigger);
  expect(inspect).toHaveBeenCalledOnce();
  expect(screen.queryByRole('tooltip')).toBeNull();
 });

 it('portals into the active native dialog and consumes Escape before the dialog closes',()=>{
  const keydown=vi.fn();
  const r=render(<dialog open aria-label="Character sheet" onKeyDown={keydown}><section><CardThumbnail card={card(p,'mage-fireball')}/></section></dialog>);
  const trigger=screen.getByRole('button',{name:'Preview Fireball'});
  fireEvent.focus(trigger);
  expect(screen.getByRole('tooltip').parentElement).toBe(r.container.querySelector('dialog'));
  fireEvent.keyDown(trigger,{key:'Escape'});
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(keydown).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeTruthy();
 });

 it('allows the pointer to move into the preview without collapsing it',()=>{
  vi.useFakeTimers();
  render(<CardThumbnail card={card(p,'mage-fireball')}/>);
  const trigger=screen.getByRole('button',{name:'Preview Fireball'});
  fireEvent.pointerEnter(trigger,{pointerType:'mouse'});
  act(()=>vi.advanceTimersByTime(180));
  const tooltip=screen.getByRole('tooltip');
  fireEvent.pointerLeave(trigger,{pointerType:'mouse'});
  fireEvent.pointerEnter(tooltip,{pointerType:'mouse'});
  act(()=>vi.advanceTimersByTime(150));
  expect(screen.getByRole('tooltip')).toBe(tooltip);
  fireEvent.pointerLeave(tooltip,{pointerType:'mouse'});
  act(()=>vi.advanceTimersByTime(120));
  expect(screen.queryByRole('tooltip')).toBeNull();
 });

 it('shows a single preview when focus moves between cards',()=>{
  render(<><CardThumbnail card={card(p,'mage-fireball')}/><CardThumbnail card={card(p,'mage-frostbolt')}/></>);
  fireEvent.focus(screen.getByRole('button',{name:'Preview Fireball'}));
  fireEvent.focus(screen.getByRole('button',{name:'Preview Frostbolt'}));
  expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  expect(screen.getByRole('tooltip',{name:'Frostbolt full card'})).toBeTruthy();
 });

 it('places a preview to the left of a right-edge card and keeps its bottom in the viewport',()=>{
  vi.spyOn(window,'innerWidth','get').mockReturnValue(1366);
  vi.spyOn(window,'innerHeight','get').mockReturnValue(768);
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
   const values=this.classList.contains('card-thumbnail')?{left:1220,right:1340,top:650,bottom:750,width:120,height:100}:{left:0,right:306,top:0,bottom:570,width:306,height:570};
   return {...values,x:values.left,y:values.top,toJSON:()=>values} as DOMRect;
  });
  render(<CardThumbnail card={card(p,'mage-fireball')}/>);
  fireEvent.focus(screen.getByRole('button',{name:'Preview Fireball'}));
  const preview=screen.getByRole('tooltip');
  expect(preview.style.left).toBe('902px');
  expect(preview.style.top).toBe('186px');
 });

 it('lets unavailable cards explain their rules without activating an action',()=>{
  const inspect=vi.fn();render(<CardThumbnail card={card(p,'mage-fireball')} disabled onClick={inspect}/>);
  const trigger=screen.getByRole('button',{name:'Inspect Fireball'});
  expect(trigger.getAttribute('aria-disabled')).toBe('true');
  fireEvent.focus(trigger);
  expect(within(screen.getByRole('tooltip')).getAllByRole('img',{name:'blue dice'}).length).toBeGreaterThan(0);
  fireEvent.click(trigger);
  expect(inspect).not.toHaveBeenCalled();
 });
});
