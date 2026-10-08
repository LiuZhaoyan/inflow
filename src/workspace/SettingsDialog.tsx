"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApplicationSettings, CredentialStatus } from '@/listening/desktop';
import { initialVideoMask } from '@/listening/video-mask';

export default function SettingsDialog({ settings, credential, onSettingsChange, onCredentialChange, onClose }: {
  settings: ApplicationSettings;
  credential: CredentialStatus;
  onSettingsChange: (settings: ApplicationSettings) => void;
  onCredentialChange: (credential: CredentialStatus) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<'llm' | 'subtitles'>('llm');
  const [key, setKey] = useState('');
  const [color, setColor] = useState(settings.videoMaskColor);
  const [busy, setBusy] = useState(false);
  const [keyResult, setKeyResult] = useState('');
  const [colorResult, setColorResult] = useState('');
  const [keyError, setKeyError] = useState('');
  const [colorError, setColorError] = useState('');
  const host = typeof window === 'undefined' ? undefined : window.inflow;

  useEffect(() => {
    const element = dialog.current!;
    const invoker = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (invoker instanceof HTMLElement && invoker.isConnected) invoker.focus();
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !host) return;
    setBusy(true); setKeyError(''); setColorError('');
    let failedCategory: 'llm' | 'subtitles' | undefined;
    if (key) {
      try {
        onCredentialChange(await host.configureCredential(key));
        setKey(''); setKeyResult('API key saved.');
      } catch (failure) {
        failedCategory = 'llm';
        setKeyError(failure instanceof Error ? failure.message : 'The API key could not be saved. Retry.');
      }
    }
    if (color !== settings.videoMaskColor) {
      try {
        onSettingsChange(await host.saveSettings({ videoMaskColor: color }));
        setColorResult('Mask color saved.');
      } catch (failure) {
        failedCategory ??= 'subtitles';
        setColorError(failure instanceof Error ? failure.message : 'The mask color could not be saved. Retry.');
      }
    }
    setBusy(false);
    if (failedCategory) setCategory(failedCategory);
    else onClose();
  }

  return <dialog ref={dialog} className="workspace-settings-dialog" aria-labelledby="workspace-settings-title"
    onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}>
    <form onSubmit={event => void save(event)}>
      <header><h2 id="workspace-settings-title">Settings</h2><button type="button" className="workspace-icon-button" aria-label="Close settings" disabled={busy} onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div className="workspace-settings-body">
        <nav className="workspace-settings-sidebar" aria-label="Settings categories">
          <button type="button" aria-current={category === 'llm' ? 'page' : undefined} aria-controls="settings-llm-panel" disabled={busy} onClick={() => setCategory('llm')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4Z"/><path d="M9 8h6M9 12h4"/></svg><span>LLM</span>
            {(keyError || keyResult) && <small className={keyError ? 'workspace-settings-error' : 'workspace-settings-result'}>{keyError ? 'Error' : 'Saved'}</small>}
          </button>
          <button type="button" aria-current={category === 'subtitles' ? 'page' : undefined} aria-controls="settings-subtitles-panel" disabled={busy} onClick={() => setCategory('subtitles')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h4M14 11h3M7 15h10"/></svg><span>Subtitle mask</span>
            {(colorError || colorResult) && <small className={colorError ? 'workspace-settings-error' : 'workspace-settings-result'}>{colorError ? 'Error' : 'Saved'}</small>}
          </button>
        </nav>
        <fieldset className="workspace-settings-content" disabled={busy}>
        {!host && <p className="workspace-settings-help">Settings are saved in the Inflow desktop app.</p>}
        <section id="settings-llm-panel" hidden={category !== 'llm'} aria-labelledby="settings-key-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-key-heading">LLM</h3><span>{credential.configured ? 'Configured' : 'Not configured'}</span></div>
          <p className="workspace-settings-description">Manage the shared DeepSeek API key for translation, word meanings, and stories.</p>
          <label htmlFor="settings-api-key">{credential.configured ? 'Replace API key' : 'API key'}</label>
          <input id="settings-api-key" type="password" name="apiKey" value={key} autoComplete="off" maxLength={512} disabled={!host}
            aria-describedby={`settings-key-help${keyError ? ' settings-key-error' : ''}`} aria-invalid={!!keyError} onChange={event => { setKey(event.currentTarget.value); setKeyResult(''); setKeyError(''); }}/>
          <p id="settings-key-help" className="workspace-settings-help">Stored encrypted on this device. Leave blank to keep the current key.</p>
          {credential.error && <p className="workspace-settings-error" role="alert">{credential.error}</p>}
          {keyResult && <p className="workspace-settings-result" role="status">{keyResult}</p>}
          {keyError && <p id="settings-key-error" className="workspace-settings-error" role="alert">{keyError}</p>}
        </section>
        <section id="settings-subtitles-panel" hidden={category !== 'subtitles'} aria-labelledby="settings-mask-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-mask-heading">Video subtitle mask</h3><span>All videos</span></div>
          <p className="workspace-settings-description">Choose the color used to cover subtitles in the video picture.</p>
          <div className="workspace-settings-color"><label htmlFor="settings-mask-color">Mask color</label><input id="settings-mask-color" type="color" value={color} aria-describedby={`settings-mask-help${colorError ? ' settings-mask-error' : ''}`} aria-invalid={!!colorError}
            onChange={event => { setColor(event.currentTarget.value); setColorResult(''); setColorError(''); }}/><span>{color.toUpperCase()}</span></div>
          <figure className="workspace-settings-preview">
            <figcaption>Preview</figcaption>
            <div className="workspace-settings-picture" role="img" aria-label={`Sample video with a ${color} subtitle mask`}>
              <svg viewBox="0 0 640 360" aria-hidden="true"><circle cx="490" cy="85" r="32"/><path d="M0 250 160 110 315 270 450 160 640 320V360H0Z"/><path d="M0 300 220 205 390 325 535 255 640 300V360H0Z"/></svg>
              <span className="workspace-settings-sample-subtitle" aria-hidden="true">Sample subtitles</span>
              <div className="workspace-video-mask" style={{ left: `${initialVideoMask.x * 100}%`, top: `${initialVideoMask.y * 100}%`, width: `${initialVideoMask.width * 100}%`, height: `${initialVideoMask.height * 100}%`, backgroundColor: color }}/>
            </div>
          </figure>
          <p id="settings-mask-help" className="workspace-settings-help">Preview updates immediately. Save to apply the color to all videos; adjust each mask region in the player.</p>
          {colorResult && <p className="workspace-settings-result" role="status">{colorResult}</p>}
          {colorError && <p id="settings-mask-error" className="workspace-settings-error" role="alert">{colorError}</p>}
        </section>
        </fieldset>
      </div>
      <footer><button type="button" className="workspace-settings-cancel" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="workspace-primary-button" disabled={busy || !host}>{busy ? 'Saving…' : 'Save'}</button></footer>
    </form>
  </dialog>;
}
