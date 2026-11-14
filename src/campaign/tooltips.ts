import { useEffect } from 'react';

/**
 * The game's own tooltip. Controls explain themselves through `title`; the browser shows that as a plain system label
 * after a long second, different on every machine. This shows the same text in the game's own style, sooner, and puts
 * the `title` back when the pointer leaves, so the markup and what a screen reader finds stay as they are.
 *
 * Only where a pointer can hover: a finger has no hover, and a touch screen keeps the browser's long-press behaviour.
 */
const DELAY_MS = 350, GAP = 9, EDGE = 8;

export function installTooltips(doc: Document = document): () => void {
 const view = doc.defaultView;
 if (!view?.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return () => {};
 let tip: HTMLElement | undefined, owner: HTMLElement | undefined, text = '', timer: ReturnType<typeof setTimeout> | undefined;
 const hide = () => {
  clearTimeout(timer);
  // The title goes back unless something set a new one meanwhile.
  if (owner && text && !owner.getAttribute('title')) owner.setAttribute('title', text);
  owner = undefined; text = '';
  tip?.remove(); tip = undefined;
 };
 const show = () => {
  if (!owner?.isConnected) { hide(); return; }
  const el = doc.createElement('div');
  el.className = 'game-tooltip'; el.setAttribute('role', 'tooltip'); el.textContent = text;
  // A window opened as a modal is drawn above the rest of the page: the tooltip joins it there.
  const top = typeof el.showPopover === 'function';
  if (top) el.setAttribute('popover', 'manual');
  (top ? doc.body : owner.closest('dialog[open]') ?? doc.body).appendChild(el);
  if (top) try { el.showPopover(); } catch { /* shown in place instead */ }
  const at = owner.getBoundingClientRect(), box = el.getBoundingClientRect(), width = view.innerWidth, height = view.innerHeight;
  const above = at.top - box.height - GAP >= EDGE || at.bottom + GAP + box.height > height - EDGE;
  el.style.left = `${Math.round(Math.max(EDGE, Math.min(width - box.width - EDGE, at.left + at.width / 2 - box.width / 2)))}px`;
  el.style.top = `${Math.round(Math.max(EDGE, above ? at.top - box.height - GAP : at.bottom + GAP))}px`;
  el.dataset.side = above ? 'above' : 'below';
  tip = el;
 };
 const point = (target: EventTarget | null, wait: number) => {
  const el = target instanceof Element ? target.closest<HTMLElement>('[title]') : null;
  if (el && el === owner) return;
  // Still inside the control whose title is held back: leave its tooltip up.
  if (!el && owner && target instanceof Node && owner.contains(target)) return;
  hide();
  const label = el?.getAttribute('title')?.trim();
  if (!el || !label) return;
  owner = el; text = label; el.removeAttribute('title');
  timer = setTimeout(show, wait);
 };
 const over = (e: Event) => point(e.target, DELAY_MS);
 const focus = (e: Event) => { if (e.target instanceof Element && e.target.matches(':focus-visible')) point(e.target, 0); };
 doc.addEventListener('pointerover', over, true);
 doc.addEventListener('focusin', focus, true);
 doc.addEventListener('focusout', hide, true);
 doc.addEventListener('pointerdown', hide, true);
 doc.addEventListener('keydown', hide, true);
 view.addEventListener('scroll', hide, true);
 view.addEventListener('blur', hide);
 return () => {
  hide();
  doc.removeEventListener('pointerover', over, true);
  doc.removeEventListener('focusin', focus, true);
  doc.removeEventListener('focusout', hide, true);
  doc.removeEventListener('pointerdown', hide, true);
  doc.removeEventListener('keydown', hide, true);
  view.removeEventListener('scroll', hide, true);
  view.removeEventListener('blur', hide);
 };
}

/** Installs the game's tooltip for as long as the component is on the page. */
export function useTooltips() { useEffect(() => installTooltips(), []); }
