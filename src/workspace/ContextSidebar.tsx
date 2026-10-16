"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocale } from '@/i18n/context';
import './context-sidebar.css';

const maximum = (sidebar: HTMLDivElement | null) => Math.min(480, Math.max(240, (sidebar?.parentElement?.clientWidth ?? 1000) - 520));

export default function ContextSidebar({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const id = useId();
  const sidebar = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; width: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState<number>();
  const [size, setSize] = useState({ width: 280, max: 480 });
  const resize = useCallback((next: number) => {
    setCollapsed(next < 120);
    if (next >= 120) setWidth(Math.max(240, Math.min(maximum(sidebar.current), next)));
  }, []);
  const stopDrag = useCallback(() => { drag.current = null; setResizing(false); }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = drag.current;
      if (current?.id === event.pointerId) resize(current.width + current.x - event.clientX);
    };
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', stopDrag, true);
    document.addEventListener('pointercancel', stopDrag, true);
    window.addEventListener('blur', stopDrag);
    return () => {
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', stopDrag, true);
      document.removeEventListener('pointercancel', stopDrag, true);
      window.removeEventListener('blur', stopDrag);
    };
  }, [resize, stopDrag]);

  useEffect(() => {
    const element = sidebar.current!;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth) setSize({ width: element.clientWidth, max: maximum(element) });
    });
    observer.observe(element);
    observer.observe(element.parentElement!);
    return () => observer.disconnect();
  }, []);

  return <div ref={sidebar} className={`workspace-context-sidebar${collapsed ? ' is-collapsed' : ''}${resizing ? ' is-resizing' : ''}`} style={{ '--workspace-context-width': width === undefined ? undefined : `${width}px` } as CSSProperties}>
    <div className="workspace-context-divider" role="separator" tabIndex={0} aria-label={t('Resize Context panel')} aria-controls={id} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={Math.max(size.max, size.width)} aria-valuenow={collapsed ? 0 : size.width}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, width: sidebar.current!.clientWidth };
        setResizing(true);
      }}
      onLostPointerCapture={stopDrag}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = sidebar.current!.clientWidth;
        const step = event.shiftKey ? 40 : 10;
        let next = current + (event.key === 'ArrowLeft' ? step : -step);
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = maximum(sidebar.current);
        else if (collapsed) next = event.key === 'ArrowLeft' ? 240 : 0;
        else if (event.key === 'ArrowRight' && current <= 240) next = 0;
        resize(next);
      }}/>
    <div id={id} className="workspace-context-sidebar-body" hidden={collapsed}>{children}</div>
  </div>;
}
