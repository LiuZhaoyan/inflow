"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { useLocale } from '@/i18n/context';
import './notice.css';

export default function Notice({ message, id, placement = 'inline', tone = 'error', transient = false, onDismiss }: {
  message: string; id?: string; placement?: 'inline' | 'floating'; tone?: 'error' | 'success' | 'status';
  transient?: boolean; onDismiss?: () => void;
}) {
  const { t, error: localize } = useLocale();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const detailsId = useId();
  const details = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const text = localize(message, '');
  const dismiss = useEffectEvent(() => { setDismissed(message); onDismiss?.(); });
  useEffect(() => {
    if (!transient) return;
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, transient]);

  if (!message || dismissed === message) return null;
  return <div id={id} className={`app-notice app-notice-${placement} app-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span className="app-notice-icon" aria-hidden="true">{tone === 'success' ? '✓' : '!'}</span>
    <button ref={trigger} type="button" className="app-notice-message" aria-label={t('View notice details')} aria-describedby={detailsId + '-text'} aria-haspopup="dialog" onClick={() => { details.current?.showPopover(); details.current?.focus(); }}>{text}</button>
    <button type="button" className="app-notice-close" aria-label={t('Dismiss notice')} onClick={() => { setDismissed(message); onDismiss?.(); }}>×</button>
    <div ref={details} id={detailsId} popover="auto" tabIndex={-1} role="dialog" aria-label={t('Notice details')} className="app-notice-details">
      <button type="button" aria-label={t('Close notice details')} onClick={() => { details.current?.hidePopover(); trigger.current?.focus(); }}>×</button>
      <p id={detailsId + '-text'}>{text}</p>
    </div>
  </div>;
}
