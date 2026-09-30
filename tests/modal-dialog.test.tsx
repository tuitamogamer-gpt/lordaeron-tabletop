// @vitest-environment jsdom
import { StrictMode, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Modal, useModalDialog } from '../src/components';

beforeEach(()=>{
 HTMLDialogElement.prototype.showModal=vi.fn(function(this:HTMLDialogElement){
  if(this.open)throw new DOMException('Already open','InvalidStateError');
  this.open=true;
  this.querySelector<HTMLElement>('button')?.focus();
 });
 HTMLDialogElement.prototype.close=vi.fn(function(this:HTMLDialogElement){this.open=false;});
});
afterEach(()=>{cleanup();document.body.style.overflow='';vi.restoreAllMocks();});

function ToggleDialog({active}:{active:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useModalDialog(ref,active);
 return <dialog ref={ref} aria-label="Map"><button>Map control</button></dialog>;
}

describe('shared dialog lifecycle',()=>{
 it('closes before a Strict Mode remount and restores the original scroll style and opener',()=>{
  render(<button>Open sheet</button>);
  const opener=screen.getByRole('button',{name:'Open sheet'});
  opener.focus();document.body.style.overflow='scroll';
  const sheet=render(<StrictMode><Modal title="Sheet" onClose={()=>{}}>Content</Modal></StrictMode>);
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(2);
  expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
  expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  sheet.unmount();
  expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(2);
  expect(document.body.style.overflow).toBe('scroll');
  expect(document.activeElement).toBe(opener);
 });

 it('closes a still-mounted dialog when deactivated and can open it again',()=>{
  render(<button>Open map</button>);
  const opener=screen.getByRole('button',{name:'Open map'});opener.focus();
  const map=render(<ToggleDialog active/>),dialog=screen.getByRole('dialog') as HTMLDialogElement;
  map.rerender(<ToggleDialog active={false}/>);
  expect(dialog.isConnected).toBe(true);expect(dialog.open).toBe(false);
  expect(document.body.style.overflow).toBe('');expect(document.activeElement).toBe(opener);
  map.rerender(<ToggleDialog active/>);
  expect(dialog.open).toBe(true);expect(document.body.style.overflow).toBe('hidden');
 });

 it('restores focus to the underlying dialog before returning to the page opener',()=>{
  render(<button>Open party</button>);
  const opener=screen.getByRole('button',{name:'Open party'});opener.focus();
  const parent=render(<Modal title="Party" onClose={()=>{}}><button>Inspect hero</button></Modal>);
  const inspect=screen.getByRole('button',{name:'Inspect hero'});inspect.focus();
  const child=render(<Modal title="Hero" onClose={()=>{}}>Hero</Modal>);
  const focus=vi.spyOn(inspect,'focus');
  child.unmount();
  expect(document.activeElement).toBe(inspect);
  expect(focus).toHaveBeenLastCalledWith({preventScroll:true});
  expect(document.body.style.overflow).toBe('hidden');
  parent.unmount();expect(document.activeElement).toBe(opener);
 });

 it('keeps focus in the surviving modal when its opener dialog closes first',()=>{
  render(<button>Open party</button>);
  const opener=screen.getByRole('button',{name:'Open party'});opener.focus();
  const parent=render(<Modal title="Party" onClose={()=>{}}>Party</Modal>);
  const child=render(<Modal title="Hero" onClose={()=>{}}>Hero</Modal>);
  const childClose=within(screen.getByRole('dialog',{name:'Hero'})).getByRole('button',{name:'Close'});
  parent.unmount();
  expect(document.activeElement).toBe(childClose);expect(document.body.style.overflow).toBe('hidden');
  child.unmount();
  expect(document.activeElement).toBe(opener);expect(document.body.style.overflow).toBe('');
 });
});

describe('intentional dialog dismissal',()=>{
 it('dismisses only a primary click that starts and ends on the backdrop',()=>{
  const close=vi.fn();render(<Modal title="Sheet" onClose={close}><p>Card rules</p></Modal>);
  const dialog=screen.getByRole('dialog');
  vi.spyOn(dialog,'getBoundingClientRect').mockReturnValue({left:100,right:500,top:100,bottom:500,width:400,height:400,x:100,y:100,toJSON:()=>({})});
  // Padding and empty areas are still part of the dialog.
  fireEvent.pointerDown(dialog,{button:0,clientX:200,clientY:200});
  fireEvent.click(dialog,{clientX:200,clientY:200});
  expect(close).not.toHaveBeenCalled();
  // Selecting text or dragging from content must not dismiss the sheet.
  fireEvent.pointerDown(screen.getByText('Card rules'),{button:0,clientX:200,clientY:200});
  fireEvent.click(dialog,{clientX:20,clientY:20});
  expect(close).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog,{button:0,clientX:20,clientY:20});
  fireEvent.click(dialog,{clientX:200,clientY:200});
  expect(close).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog,{button:2,clientX:20,clientY:20});
  fireEvent.click(dialog,{clientX:20,clientY:20});
  expect(close).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog,{button:0,clientX:20,clientY:20});
  fireEvent.pointerCancel(dialog);
  fireEvent.click(dialog,{clientX:20,clientY:20});
  expect(close).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog,{button:0,clientX:20,clientY:20});
  fireEvent.click(dialog,{clientX:20,clientY:20});
  expect(close).toHaveBeenCalledOnce();
 });

 it('prevents native Escape dismissal until the owner updates and never submits an enclosing form',()=>{
  const close=vi.fn(),submit=vi.fn();
  render(<form onSubmit={submit}><Modal title="Sheet" onClose={close}>Content</Modal></form>);
  const dialog=screen.getByRole('dialog'),cancel=new Event('cancel',{cancelable:true});
  act(()=>{dialog.dispatchEvent(cancel);});
  expect(cancel.defaultPrevented).toBe(true);expect(close).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Close'}));
  expect(close).toHaveBeenCalledTimes(2);expect(submit).not.toHaveBeenCalled();
 });
});
