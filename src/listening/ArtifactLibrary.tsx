"use client";

import Dropdown from "@/workspace/Dropdown";
import Notice from "@/workspace/Notice";
import { useLocale } from '@/i18n/context';
import StorySentence from "@/workspace/StorySentence";
import { useEffect, useRef, useState } from "react";
import "@/workspace/story.css";
import type { CredentialStatus, LearningArtifact, SourceLanguage, VocabularyEntry } from "./desktop";
import type { LearningArtifacts } from "@/workspace/useLearningArtifacts";

type Props = {
  learning: LearningArtifacts;
  selected: VocabularyEntry[];
  vocabularyEntries: VocabularyEntry[];
  onBeforeChange: () => boolean;
  onOpenVocabulary: (id: string) => void;
  active?: boolean;
  generationOpen?: boolean;
  onGenerationClose?: () => void;
  onRequestGenerate?: () => void;
  credential: CredentialStatus;
  onOpenSettings: () => void;
};

function textOf(sentence: LearningArtifact["sentences"][number]) {
  return sentence.parts.map(part => part.text).join("");
}

export default function ArtifactLibrary({
  learning,
  selected, vocabularyEntries, onBeforeChange, onOpenVocabulary, active = true, generationOpen = false,
  onGenerationClose, onRequestGenerate,
  credential, onOpenSettings,
}: Props) {
  const { locale, t, error: localize } = useLocale();
  const { artifacts, selection, loaded, error, busy, open, cancelGeneration } = learning;
  const { artifact, source } = selection;
  const artifactId = artifact?.id;
  const [collection, setCollection] = useState<{ id: string; entries: VocabularyEntry[] } | null>(null);
  const [collectionError, setCollectionError] = useState("");
  const collectedVocabulary = collection && collection.id === artifactId ? collection.entries : [];
  const initialSentence = Math.max(0, Math.min(source?.sentenceIndex ?? 0, Math.max(0, (artifact?.sentences.length ?? 0) - 1)));
  const [previousSelection, setPreviousSelection] = useState(selection);
  const [historyLanguage, setHistoryLanguage] = useState<"all" | SourceLanguage>("all");
  const [topic, setTopic] = useState("");
  const [activeSentence, setActiveSentence] = useState(initialSentence);
  const [translations, setTranslations] = useState<Set<number>>(() => new Set());
  const dialog = useRef<HTMLDialogElement>(null);
  const mixedLanguageSelection = new Set(selected.map(entry => entry.language)).size > 1;

  useEffect(() => {
    if (!artifactId) return;
    let current = true;
    window.inflow!.listArtifactVocabulary(artifactId).then(entries => {
      if (current) { setCollection({ id: artifactId, entries }); setCollectionError(""); }
    }).catch(failure => {
      if (current) setCollectionError(failure instanceof Error ? failure.message : "Collected vocabulary could not be loaded.");
    });
    return () => { current = false; };
  }, [artifactId, vocabularyEntries]);

  if (previousSelection !== selection) {
    setPreviousSelection(selection);
    setActiveSentence(initialSentence);
    setTranslations(new Set());
  }

  useEffect(() => {
    if (!source) return;
    const frame = requestAnimationFrame(() => document.getElementById("artifact-sentence-" + initialSentence)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [selection, source, initialSentence]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (active && generationOpen && !element.open) {
      element.showModal();
      element.focus({ preventScroll: true });
    }
    else if ((!active || !generationOpen) && element.open) element.close();
  }, [active, generationOpen]);

  async function generate() {
    if (!credential.configured) return;
    if (await learning.generate(selected, topic)) {
      closeDialog();
    }
  }

  function jump(index: number) {
    if (!artifact || index < 0 || index >= artifact.sentences.length || !onBeforeChange()) return;
    setActiveSentence(index);
    document.getElementById("artifact-sentence-" + index)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function closeDialog() {
    if (dialog.current?.open) dialog.current.close();
    onGenerationClose?.();
  }

  const wordCount = artifact ? artifact.sentences.map(textOf).join(" ").trim().split(/\s+/u).filter(Boolean).length : 0;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 170));
  const dateLabel = artifact && new Date(artifact.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  const visibleArtifacts = artifacts.filter(item => historyLanguage === "all" || item.language === historyLanguage);
  const languageName = (language: SourceLanguage) => language === "en" ? t("English") : t("Korean");

  return <section className="story-workspace" id="artifacts" aria-label={t("Story reader")} hidden={!active}>
    {artifact ? <main className="story-layout">
      <section className="story-reader-panel">
        <header className="story-hero">
          <div className="story-hero-controls">
            <details className="story-dropdown">
              <summary aria-label={t(artifact.targets.length === 1 ? '{count} target word' : '{count} target words', { count: artifact.targets.length })}><svg className="story-inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v15M12 6C9 3 5 3 2 4v14c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2z"/></svg>{t(artifact.targets.length === 1 ? '{count} target word' : '{count} target words', { count: artifact.targets.length })} ⌄</summary>
              <div className="story-dropdown-panel">{artifact.targets.map(target => <button type="button" key={target.id} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onOpenVocabulary(target.id); }}><span lang={artifact.language}>{target.lemma}</span><span lang="zh">{target.meaningZh}</span></button>)}</div>
            </details>
            <details className="story-dropdown story-options">
              <summary aria-label={t("Story options")}>⋮</summary>
              <div className="story-dropdown-panel">
                {onRequestGenerate && <button type="button" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onRequestGenerate(); }}>{t("Generate a story")}</button>}
                  {!!artifacts.length && <>
                    <label>{t("Filter saved stories")}
                      <Dropdown label={t("Filter saved stories")} value={historyLanguage} options={[{ value: "all", label: t("All") }, { value: "ko", label: t("Korean") }, { value: "en", label: t("English") }]} onChange={setHistoryLanguage}/>
                    </label>
                    <label>{t("Open saved story")}
                  <Dropdown label={t("Open saved story")} value="" placeholder={t("Choose a saved story")} options={visibleArtifacts.map(item => ({ value: item.id, label: languageName(item.language) + " · " + item.title }))} onChange={id => { if (id) { void open(id); document.querySelector<HTMLDetailsElement>(".story-options[open]")?.removeAttribute("open"); } }}/>
                    </label>
                  </>}
              </div>
            </details>
          </div>
          <div className="story-hero-copy">
            <h1 lang={artifact.language}>{artifact.title}</h1>
            <p><svg className="story-inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/></svg>{t(artifact.targets.length === 1 ? 'Generated from {count} vocabulary word' : 'Generated from {count} vocabulary words', { count: artifact.targets.length })} <span className="story-language-badge">{languageName(artifact.language)}</span><span>•</span> {t('~{minutes} min read', { minutes: readMinutes })} <span>•</span> <time dateTime={artifact.createdAt}>{dateLabel}</time></p>
          </div>
        </header>

        <div className="story-reading-pane">
          <article className="story-sentences" data-artifact-id={artifact.id}>
            {artifact.sentences.map((sentence, index) => <div className="story-sentence" key={index}>
              <p className="artifact-korean" id={"artifact-sentence-" + index} data-sentence-index={index} lang={artifact.language} tabIndex={0} aria-current={activeSentence === index ? "location" : undefined} onFocus={() => { if (index !== activeSentence && onBeforeChange()) setActiveSentence(index); }} onClick={() => { if (index !== activeSentence && onBeforeChange()) setActiveSentence(index); }}>
                <StorySentence artifact={artifact} index={index} vocabulary={collectedVocabulary}/>
              </p>
              {translations.has(index) && <p className="story-translation" lang="zh">{sentence.translationZh}</p>}
            </div>)}
          </article>
        </div>
        {collectionError && <Notice message={localize(collectionError, 'The operation failed. Please retry.')} onDismiss={() => setCollectionError('')}/>}
        <footer className="story-reader-footer">
          <button type="button" aria-label={t("Previous sentence")} disabled={activeSentence <= 0} onClick={() => jump(activeSentence - 1)}>← &nbsp;{t('Previous')}</button>
          <button type="button" aria-label={translations.has(activeSentence) ? t("Hide Chinese translation") : t("Show Chinese translation")} aria-pressed={translations.has(activeSentence)} onClick={() => setTranslations(current => { const next = new Set(current); if (next.has(activeSentence)) next.delete(activeSentence); else next.add(activeSentence); return next; })}>{t("中文")}</button>
          <span>{t(artifact.sentences.length === 1 ? '{current} / {total} sentence' : '{current} / {total} sentences', { current: artifact.sentences.length ? activeSentence + 1 : 0, total: artifact.sentences.length })}</span>
          <button type="button" aria-label={t("Next sentence")} disabled={activeSentence >= artifact.sentences.length - 1} onClick={() => jump(activeSentence + 1)}>{t('Next')} &nbsp;→</button>
        </footer>
      </section>

      <aside className="story-sidebar">
        <section className="story-context-panel">
          <header><h2>{t("Context")}</h2><span>{t(artifact.sentences.length === 1 ? '{count} sentence' : '{count} sentences', { count: artifact.sentences.length })}</span></header>
          <div className="story-context-list">{artifact.sentences.map((sentence, index) => <button type="button" key={index} aria-current={activeSentence === index ? "location" : undefined} onClick={() => jump(index)}>
            <span>{String(index + 1).padStart(2, "0")}</span><span lang={artifact.language}>{textOf(sentence)}</span>{activeSentence === index && <i aria-hidden="true" />}
          </button>)}</div>
        </section>
        <section className="story-vocabulary-panel">
          <header><h2>{t("Target Vocabulary")}</h2><span>{t(artifact.targets.length === 1 ? '{count} word' : '{count} words', { count: artifact.targets.length })}</span></header>
          <div className="story-vocabulary-list">{artifact.targets.map(target => <div className="story-vocabulary-row" key={target.id}>
            <button type="button" aria-label={t('Open {word} in vocabulary', { word: target.lemma })} onClick={() => onOpenVocabulary(target.id)}><span lang={artifact.language}>{target.lemma}</span></button><span lang="zh">{target.meaningZh}</span>
          </div>)}
            {!!collectedVocabulary.length && <section className="story-collected-vocabulary" aria-label={t("Collected vocabulary")}>
              <header><h3>{t("Collected Vocabulary")}</h3><span>{t(collectedVocabulary.length === 1 ? '{count} word' : '{count} words', { count: collectedVocabulary.length })}</span></header>
              {collectedVocabulary.map(entry => <div className="story-vocabulary-row" key={entry.id}>
                <button type="button" aria-label={t('Open {word} in vocabulary', { word: entry.lemma })} onClick={() => onOpenVocabulary(entry.id)}><span lang={entry.language}>{entry.lemma}</span></button><span lang="zh">{entry.meaningZh}</span>
              </div>)}
            </section>}
          </div>
        </section>
      </aside>

    </main> : <div className="story-empty-state">
      <h1>{loaded ? t("Choose a story") : t("Restoring your library…")}</h1>
      <p>{loaded ? t("Saved stories remain available for offline reading.") : t("Reading saved stories from this device.")}</p>
      {!!artifacts.length && <>
        <label>{t("Filter saved stories")}
          <Dropdown label={t("Filter saved stories")} value={historyLanguage} options={[{ value: "all", label: t("All") }, { value: "ko", label: t("Korean") }, { value: "en", label: t("English") }]} onChange={setHistoryLanguage}/>
        </label>
        <label>{t("Saved stories")}
        <Dropdown label={t("Open saved story")} value="" placeholder={t("Choose a saved story")} options={visibleArtifacts.map(item => ({ value: item.id, label: languageName(item.language) + " · " + item.title }))} onChange={id => { if (id) { void open(id); document.querySelector<HTMLDetailsElement>(".story-options[open]")?.removeAttribute("open"); } }}/>
        </label>
      </>}
      {onRequestGenerate && <button type="button" onClick={onRequestGenerate}>{t("Generate a story")}</button>}
    </div>}

    <dialog className="story-generation-dialog" ref={dialog} tabIndex={-1} aria-labelledby="story-generation-title" onClose={event => { if (!event.currentTarget.open) onGenerationClose?.(); }} onCancel={event => { if (busy) { event.preventDefault(); cancelGeneration(); } }}>
      <div className="story-dialog-content">
        <div className="story-dialog-heading"><h2 id="story-generation-title">{t("Generate a story")}</h2><button type="button" aria-label={t("Close generation dialog")} onClick={closeDialog}>×</button></div>
        <p>{t("The story uses selected saved vocabulary and remains available for offline reading.")}</p>
        <section className="story-selected-targets" aria-label={t("Selected vocabulary")}>
          <header><h3>{t("Selected vocabulary")}</h3><span>{selected.length} / 20</span></header>
          {selected.length ? <ul>{selected.map(entry => <li key={entry.id}><strong lang={entry.language}>{entry.lemma}<small className="story-language-badge" lang={locale}>{languageName(entry.language)}</small></strong><span lang="zh">{entry.meaningZh}</span></li>)}</ul> : <p>{t("No vocabulary selected.")}</p>}
          {(selected.length < 1 || selected.length > 20) && <p className="story-hint">{t("Select 1–20 existing vocabulary items to continue.")}</p>}
          {mixedLanguageSelection && <Notice message={t("Choose vocabulary in one source language. Return to vocabulary selection to adjust your choices; all selected words are preserved.")}/>}
        </section>
        <label className="story-topic">{t("Topic")} <span>{t("Optional")}</span><input name="topic" value={topic} maxLength={200} disabled={busy} onChange={event => setTopic(event.currentTarget.value)} /></label>
        <section className="story-credential" aria-label={t("Cloud configuration")}>
          <button type="button" disabled={busy} onClick={onOpenSettings}>{credential.configured ? t("API key configured · Open settings") : t("Configure API key in Settings")}</button>
          {credential.error && <Notice message={localize(credential.error, 'The operation failed. Please retry.')}/>}
        </section>
        {error && <Notice message={localize(error, 'The operation failed. Please retry.')} onDismiss={() => learning.setError('')}/>}
        <footer>{busy && <button type="button" onClick={cancelGeneration}>{t("Cancel generation")}</button>}{!busy && <button type="button" onClick={closeDialog}>{t("Cancel")}</button>}<button type="button" disabled={busy || !credential.configured || mixedLanguageSelection || selected.length < 1 || selected.length > 20} onClick={() => void generate()}>{busy ? t("Generating…") : error ? t("Retry generation") : t("Generate story")}</button></footer>
      </div>
    </dialog>
  </section>;
}
