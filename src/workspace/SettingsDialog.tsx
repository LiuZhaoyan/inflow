"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApplicationSettings, CredentialStatus, ModelStatus } from '@/listening/desktop';
import { initialVideoMask } from '@/listening/video-mask';

export default function SettingsDialog({ settings, credential, onSettingsChange, onCredentialChange, onClose }: {
  settings: ApplicationSettings;
  credential: CredentialStatus;
  onSettingsChange: (settings: ApplicationSettings) => void;
  onCredentialChange: (credential: CredentialStatus) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<'llm' | 'subtitles' | 'models'>('llm');
  const [key, setKey] = useState('');
  const [color, setColor] = useState(settings.videoMaskColor);
  const [busy, setBusy] = useState(false);
  const [keyResult, setKeyResult] = useState('');
  const [colorResult, setColorResult] = useState('');
  const [keyError, setKeyError] = useState('');
  const [colorError, setColorError] = useState('');
  const host = typeof window === 'undefined' ? undefined : window.inflow;

  const [models, setModels] = useState<ModelStatus | null>(null);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const modelsJob = useRef('');

  useEffect(() => {
    if (category !== 'models' || !host || models) return;
    let current = true;
    host.modelStatus().then(status => { if (current) setModels(status); })
      .catch(failure => { if (current) setModelsError(failure instanceof Error ? failure.message : 'Could not read model status. Retry.'); });
    return () => { current = false; };
  }, [category, host, models]);

  async function downloadModels() {
    if (!host || modelsBusy) return;
    const missing = models ? [
      ...(!models.whisper ? ['whisper'] : []),
      ...(!models.translate['ko-en'] || !models.translate['en-zh'] ? ['translate'] : []),
      ...(!models.englishParser ? ['english-parser'] : []),
    ] : [];
    setModelsBusy(true); setModelsError('');
    modelsJob.current = crypto.randomUUID();
    try {
      setModels(await host.setupModels(modelsJob.current, missing));
    } catch (failure) {
      setModelsError(failure instanceof Error ? failure.message : 'The model download failed. Retry.');
    } finally { setModelsBusy(false); }
  }

  function cancelModelDownload() {
    if (modelsJob.current) void host?.cancel(modelsJob.current).catch(() => {});
  }

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
          {host && <button type="button" aria-current={category === 'models' ? 'page' : undefined} aria-controls="settings-models-panel" disabled={busy} onClick={() => setCategory('models')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg><span>Processing models</span>
            {modelsError && <small className="workspace-settings-error">Error</small>}
          </button>}
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
        {host && <section id="settings-models-panel" hidden={category !== 'models'} aria-labelledby="settings-models-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-models-heading">Processing models</h3><span>{models ? `${[models.whisper, ...Object.values(models.translate), models.englishParser].filter(Boolean).length}/4 installed` : 'Checking…'}</span></div>
          <p className="workspace-settings-description">Local models used for transcription, translation, and word analysis. They download once and then work fully offline.</p>
          <ul className="workspace-settings-models">
            {[
              { label: 'Speech recognition · Whisper large-v3-turbo', ok: models?.whisper },
              { label: 'Translation · Korean to English', ok: models?.translate['ko-en'] },
              { label: 'Translation · English to Chinese', ok: models?.translate['en-zh'] },
              { label: 'English word analysis · spaCy', ok: models?.englishParser },
            ].map(item => <li key={item.label} data-state={item.ok === undefined ? 'checking' : item.ok ? 'ready' : 'missing'}>
              <span aria-hidden="true">{item.ok === undefined ? '…' : item.ok ? '✓' : '—'}</span>{item.label}
              <small>{item.ok === undefined ? 'Checking' : item.ok ? 'Installed' : 'Not installed'}</small>
            </li>)}
          </ul>
          {models && ![models.whisper, ...Object.values(models.translate), models.englishParser].every(Boolean) && <div className="workspace-settings-models-actions">
            {modelsBusy
              ? <><button type="button" className="workspace-settings-cancel" onClick={cancelModelDownload}>Cancel download</button><span role="status">Downloading missing models…</span></>
              : <button type="button" className="workspace-primary-button" onClick={() => void downloadModels()}>Download missing models</button>}
          </div>}
          {models && [models.whisper, ...Object.values(models.translate), models.englishParser].every(Boolean) && <p className="workspace-settings-result" role="status">All models are installed. Processing runs fully offline.</p>}
          {modelsError && <p className="workspace-settings-error" role="alert">{modelsError}</p>}
        </section>}
        </fieldset>
      </div>
      <footer><button type="button" className="workspace-settings-cancel" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="workspace-primary-button" disabled={busy || !host}>{busy ? 'Saving…' : 'Save'}</button></footer>
    </form>
  </dialog>;
}
