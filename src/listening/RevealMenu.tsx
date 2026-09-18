"use client";

import { useEffect, useRef, useState } from 'react';
import type { RevealChoice } from './reveal';

const choices: [RevealChoice, string][] = [['little', '少量意群'], ['more', '更多意群'], ['all', '全句']];

export default function RevealMenu({ disabled, onSelect }: { disabled: boolean; onSelect: (choice: RevealChoice) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; held: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<RevealChoice | null>(null);

  useEffect(() => {
    function stop() { if (timer.current) clearTimeout(timer.current); timer.current = null; gesture.current = null; }
    function hit(x: number, y: number) {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-reveal-option]');
      return el && root.current?.contains(el) ? el.dataset.revealOption as RevealChoice : null;
    }
    function move(event: PointerEvent) {
      const g = gesture.current;
      if (!g || event.pointerId !== g.id) return;
      if (g.held) setHover(hit(event.clientX, event.clientY));
      else if (Math.hypot(event.clientX-g.x, event.clientY-g.y)>12) { suppressClick.current = true; stop(); }
    }
    function up(event: PointerEvent) {
      const g = gesture.current;
      if (!g || event.pointerId !== g.id) return;
      if (g.held) {
        const choice = hit(event.clientX,event.clientY);
        if (choice) onSelect(choice);
        setOpen(false); setHover(null); suppressClick.current = true;
      }
      stop();
    }
    function cancel() { if (gesture.current) { stop(); setOpen(false); setHover(null); suppressClick.current = true; } }
    function touchmove(event: TouchEvent) { if (gesture.current?.held) event.preventDefault(); }
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('pointerdown', outside);
    window.addEventListener('touchmove', touchmove, { passive: false });
    return () => {
      stop();
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('pointerdown', outside);
      window.removeEventListener('touchmove', touchmove);
    };
  }, [onSelect]);

  return <div ref={root} className={`reveal-root ${open ? 'is-open' : ''}`} onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className="reveal-trigger" disabled={disabled} aria-label="揭晓原文" aria-expanded={open} aria-haspopup="menu"
      onPointerDown={event => {
        suppressClick.current = false;
        if (event.pointerType === 'mouse') return;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, held: false };
        timer.current = setTimeout(() => { if (gesture.current) { gesture.current.held = true; setOpen(true); setHover(null); } }, 360);
      }}
      onContextMenu={event => event.preventDefault()}
      onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(value => !value); }}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()); } }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg> reveal
    </button>
    {open && <div className="fan" role="menu" aria-label="选择揭晓程度">
      {choices.map(([choice,label], index) => <button key={choice} role="menuitem" data-reveal-option={choice} className={hover===choice ? 'hovered' : ''}
        onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); const buttons = root.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]');
            buttons?.[(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3]?.focus();
          }
        }}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onSelect(choice); setOpen(false); trigger.current?.focus(); }}>
        <span aria-hidden="true">{['▤','▥','▣'][index]}</span>{label}
      </button>)}
    </div>}
  </div>;
}
