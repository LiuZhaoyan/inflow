"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApplicationSettings, CredentialStatus, ModelStatus } from '@/listening/desktop';
import { initialVideoMask } from '@/listening/video-mask';
import { useLocale } from '@/i18n/context';
import type { InterfaceLocale } from '@/i18n';

export default function SettingsDialog({ settings, credential, onSettingsChange, onCredentialChange, onClose }: {
  settings: ApplicationSettings;
  credential: CredentialStatus;
  onSettingsChange: (settings: ApplicationSettings) => void;
  onCredentialChange: (credential: CredentialStatus) => void;
  onClose: () => void;
}) {
  const { locale, t, error, saveLocale } = useLocale();
  const [language, setLanguage] = useState(locale);
  const [languageResult, setLanguageResult] = useState('');
  const [languageError, setLanguageError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<'llm' | 'subtitles' | 'models' | 'language'>(typeof window !== 'undefined' && window.inflow ? 'llm' : 'language');
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
      .catch(failure => { if (current) setModelsError(failure instanceof Error ? failure.message : 'settings.modelsReadFailed'); });
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
      setModelsError(failure instanceof Error ? failure.message : 'settings.modelsDownloadFailed');
    } finally { setModelsBusy(false); }
  }

  function cancelModelDownload() {
    if (modelsJob.current) void host?.cancel(modelsJob.current).catch(() => {});
  }

  useEffect(() => {
    const element = dialog.current!;
    const invoker = document.activeElement;
    element.showModal();
    element.focus({ preventScroll: true });
    return () => {
      element.close();
      if (invoker instanceof HTMLElement && invoker.isConnected) invoker.focus();
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setKeyError(''); setColorError(''); setLanguageError('');
    let failedCategory: 'llm' | 'subtitles' | 'language' | undefined;
    if (key && host) {
      try {
        onCredentialChange(await host.configureCredential(key));
        setKey(''); setKeyResult('settings.keySaved');
      } catch (failure) {
        failedCategory = 'llm';
        setKeyError(failure instanceof Error ? failure.message : 'settings.keyFailed');
      }
    }
    if (color !== settings.videoMaskColor && host) {
      try {
        onSettingsChange(await host.saveSettings({ videoMaskColor: color }));
        setColorResult('settings.maskSaved');
      } catch (failure) {
        failedCategory ??= 'subtitles';
        setColorError(failure instanceof Error ? failure.message : 'settings.maskFailed');
      }
    }
    if (language !== locale) {
      try {
        const preferences = await saveLocale(language);
        if (preferences) onSettingsChange(preferences);
        setLanguageResult('settings.languageSaved');
      } catch (failure) {
        failedCategory ??= 'language';
        setLanguageError(failure instanceof Error ? failure.message : 'settings.saveFailed');
      }
    }
    setBusy(false);
    if (failedCategory) setCategory(failedCategory);
    else onClose();
  }

  return <dialog ref={dialog} tabIndex={-1} className="workspace-settings-dialog" aria-labelledby="workspace-settings-title"
    onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}>
    <form onSubmit={event => void save(event)}>
      <header><h2 id="workspace-settings-title">{t('settings.title')}</h2><button type="button" className="workspace-icon-button" aria-label={t('settings.close')} disabled={busy} onClick={onClose}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
      <div className="workspace-settings-body">
        <nav className="workspace-settings-sidebar" aria-label={t('settings.categories')}>
          <button type="button" aria-current={category === 'language' ? 'page' : undefined} aria-controls="settings-language-panel" disabled={busy} onClick={() => setCategory('language')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h12M9 3v2M5 5c0 6 4 9 9 11M13 5c0 5-4 10-10 12M14 21l4-11 4 11M16 17h4"/></svg><span>{t('settings.language')}</span>
            {(languageError || languageResult) && <small className={languageError ? 'workspace-settings-error' : 'workspace-settings-result'}>{t(languageError ? 'settings.error' : 'settings.saved')}</small>}
          </button>
          <button type="button" aria-current={category === 'llm' ? 'page' : undefined} aria-controls="settings-llm-panel" disabled={busy} onClick={() => setCategory('llm')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4Z"/><path d="M9 8h6M9 12h4"/></svg><span>{t('settings.llm')}</span>
            {(keyError || keyResult) && <small className={keyError ? 'workspace-settings-error' : 'workspace-settings-result'}>{t(keyError ? 'settings.error' : 'settings.saved')}</small>}
          </button>
          <button type="button" aria-current={category === 'subtitles' ? 'page' : undefined} aria-controls="settings-subtitles-panel" disabled={busy} onClick={() => setCategory('subtitles')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h4M14 11h3M7 15h10"/></svg><span>{t('settings.subtitles')}</span>
            {(colorError || colorResult) && <small className={colorError ? 'workspace-settings-error' : 'workspace-settings-result'}>{t(colorError ? 'settings.error' : 'settings.saved')}</small>}
          </button>
          {host && <button type="button" aria-current={category === 'models' ? 'page' : undefined} aria-controls="settings-models-panel" disabled={busy} onClick={() => setCategory('models')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg><span>{t('settings.models')}</span>
            {modelsError && <small className="workspace-settings-error">{t('settings.error')}</small>}
          </button>}
        </nav>
        <fieldset className="workspace-settings-content" disabled={busy}>
        {!host && <p className="workspace-settings-help">{t('settings.browserHelp')}</p>}
        <section id="settings-language-panel" hidden={category !== 'language'} aria-labelledby="settings-language-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-language-heading">{t('settings.language')}</h3></div>
          <p className="workspace-settings-description">{t('settings.languageHelp')}</p>
          <label htmlFor="settings-interface-language">{t('settings.language')}</label>
          <select id="settings-interface-language" value={language} aria-describedby={`settings-language-help${languageError ? ' settings-language-error' : ''}`} aria-invalid={!!languageError}
            onChange={event => { setLanguage(event.currentTarget.value as InterfaceLocale); setLanguageError(''); setLanguageResult(''); }}>
            <option value="zh-CN" lang="zh-CN">简体中文</option><option value="en" lang="en">English</option>
          </select>
          <p id="settings-language-help" className="workspace-settings-help">{t('settings.languageSaveHelp')}</p>
          {languageResult && <p className="workspace-settings-result" role="status">{t(languageResult)}</p>}
          {languageError && <p id="settings-language-error" className="workspace-settings-error" role="alert">{error(languageError, 'settings.saveFailed')}</p>}
        </section>
        <section id="settings-llm-panel" hidden={category !== 'llm'} aria-labelledby="settings-key-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-key-heading">{t('settings.llm')}</h3><span>{t(credential.configured ? 'settings.configured' : 'settings.notConfigured')}</span></div>
          <p className="workspace-settings-description">{t('settings.keyDescription')}</p>
          <label htmlFor="settings-api-key">{t(credential.configured ? 'settings.replaceKey' : 'settings.apiKey')}</label>
          <input id="settings-api-key" type="password" name="apiKey" value={key} autoComplete="off" maxLength={512} disabled={!host}
            aria-describedby={`settings-key-help${keyError ? ' settings-key-error' : ''}`} aria-invalid={!!keyError} onChange={event => { setKey(event.currentTarget.value); setKeyResult(''); setKeyError(''); }}/>
          <p id="settings-key-help" className="workspace-settings-help">{t('settings.keyHelp')}</p>
          {credential.error && <p className="workspace-settings-error" role="alert">{error(credential.error, 'settings.keyFailed')}</p>}
          {keyResult && <p className="workspace-settings-result" role="status">{t(keyResult)}</p>}
          {keyError && <p id="settings-key-error" className="workspace-settings-error" role="alert">{error(keyError, 'settings.keyFailed')}</p>}
        </section>
        <section id="settings-subtitles-panel" hidden={category !== 'subtitles'} aria-labelledby="settings-mask-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-mask-heading">{t('settings.maskHeading')}</h3><span>{t('settings.allVideos')}</span></div>
          <p className="workspace-settings-description">{t('settings.maskDescription')}</p>
          <div className="workspace-settings-color"><label htmlFor="settings-mask-color">{t('settings.maskColor')}</label><input id="settings-mask-color" type="color" disabled={!host} value={color} aria-describedby={`settings-mask-help${colorError ? ' settings-mask-error' : ''}`} aria-invalid={!!colorError}
            onChange={event => { setColor(event.currentTarget.value); setColorResult(''); setColorError(''); }}/><span>{color.toUpperCase()}</span></div>
          <figure className="workspace-settings-preview">
            <figcaption>{t('settings.preview')}</figcaption>
            <div className="workspace-settings-picture" role="img" aria-label={t('settings.maskPreview', { color })}>
              <svg viewBox="0 0 640 360" aria-hidden="true"><circle cx="490" cy="85" r="32"/><path d="M0 250 160 110 315 270 450 160 640 320V360H0Z"/><path d="M0 300 220 205 390 325 535 255 640 300V360H0Z"/></svg>
              <span className="workspace-settings-sample-subtitle" aria-hidden="true">{t('settings.sampleSubtitles')}</span>
              <div className="workspace-video-mask" style={{ left: `${initialVideoMask.x * 100}%`, top: `${initialVideoMask.y * 100}%`, width: `${initialVideoMask.width * 100}%`, height: `${initialVideoMask.height * 100}%`, backgroundColor: color }}/>
            </div>
          </figure>
          <p id="settings-mask-help" className="workspace-settings-help">{t('settings.maskHelp')}</p>
          {colorResult && <p className="workspace-settings-result" role="status">{t(colorResult)}</p>}
          {colorError && <p id="settings-mask-error" className="workspace-settings-error" role="alert">{error(colorError, 'settings.maskFailed')}</p>}
        </section>
        {host && <section id="settings-models-panel" hidden={category !== 'models'} aria-labelledby="settings-models-heading">
          <div className="workspace-settings-section-heading"><h3 id="settings-models-heading">{t('settings.models')}</h3><span>{models ? t('settings.modelsInstalled', { count: [models.whisper, ...Object.values(models.translate), models.englishParser].filter(Boolean).length }) : t('settings.checking')}</span></div>
          <p className="workspace-settings-description">{t('settings.modelsDescription')}</p>
          <ul className="workspace-settings-models">
            {[
              { label: t('settings.whisper'), ok: models?.whisper },
              { label: t('settings.koEn'), ok: models?.translate['ko-en'] },
              { label: t('settings.enZh'), ok: models?.translate['en-zh'] },
              { label: t('settings.parser'), ok: models?.englishParser },
            ].map(item => <li key={item.label} data-state={item.ok === undefined ? 'checking' : item.ok ? 'ready' : 'missing'}>
              <span aria-hidden="true">{item.ok === undefined ? '…' : item.ok ? '✓' : '—'}</span>{item.label}
              <small>{t(item.ok === undefined ? 'settings.checking' : item.ok ? 'settings.installed' : 'settings.notInstalled')}</small>
            </li>)}
          </ul>
          {models && ![models.whisper, ...Object.values(models.translate), models.englishParser].every(Boolean) && <div className="workspace-settings-models-actions">
            {modelsBusy
              ? <><button type="button" className="workspace-settings-cancel" onClick={cancelModelDownload}>{t('settings.cancelDownload')}</button><span role="status">{t('settings.downloading')}</span></>
              : <button type="button" className="workspace-primary-button" onClick={() => void downloadModels()}>{t('settings.download')}</button>}
          </div>}
          {models && [models.whisper, ...Object.values(models.translate), models.englishParser].every(Boolean) && <p className="workspace-settings-result" role="status">{t('settings.allModels')}</p>}
          {modelsError && <p className="workspace-settings-error" role="alert">{error(modelsError, 'settings.modelsDownloadFailed')}</p>}
        </section>}
        </fieldset>
      </div>
      <footer><button type="button" className="workspace-settings-cancel" disabled={busy} onClick={onClose}>{t('settings.cancel')}</button><button type="submit" className="workspace-primary-button" disabled={busy}>{t(busy ? 'settings.saving' : 'settings.save')}</button></footer>
    </form>
  </dialog>;
}
