"use client";

import Dropdown from "@/workspace/Dropdown";
import { useEffect, useRef, useState } from "react";
import "@/workspace/story.css";
import type { CredentialStatus, LearningArtifact, SourceLanguage, VocabularyEntry } from "./desktop";
import type { LearningArtifacts } from "@/workspace/useLearningArtifacts";

type Props = {
  learning: LearningArtifacts;
  selected: VocabularyEntry[];
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
  selected, onBeforeChange, onOpenVocabulary, active = true, generationOpen = false,
  onGenerationClose, onRequestGenerate,
  credential, onOpenSettings,
}: Props) {
  const { artifacts, selection, loaded, error, busy, open, cancelGeneration } = learning;
  const { artifact, source } = selection;
  const initialSentence = Math.max(0, Math.min(source?.sentenceIndex ?? 0, Math.max(0, (artifact?.sentences.length ?? 0) - 1)));
  const [previousSelection, setPreviousSelection] = useState(selection);
  const [historyLanguage, setHistoryLanguage] = useState<"all" | SourceLanguage>("all");
  const [topic, setTopic] = useState("");
  const [activeSentence, setActiveSentence] = useState(initialSentence);
  const [translations, setTranslations] = useState<Set<number>>(() => new Set());
  const dialog = useRef<HTMLDialogElement>(null);
  const mixedLanguageSelection = new Set(selected.map(entry => entry.language)).size > 1;

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
    if (active && generationOpen && !element.open) element.showModal();
    else if ((!active || !generationOpen) && element.open) element.close();
  }, [active, generationOpen]);

  async function generate() {
    if (!credential.configured) return;
    if (await learning.generate(selected, topic)) {
      if (dialog.current?.open) dialog.current.close();
      else onGenerationClose?.();
    }
  }

  function jump(index: number) {
    if (!artifact || index < 0 || index >= artifact.sentences.length || !onBeforeChange()) return;
    setActiveSentence(index);
    document.getElementById("artifact-sentence-" + index)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function closeDialog() {
    if (dialog.current?.open) dialog.current.close();
    else onGenerationClose?.();
  }

  const wordCount = artifact ? artifact.sentences.map(textOf).join(" ").trim().split(/\s+/u).filter(Boolean).length : 0;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 170));
  const dateLabel = artifact && new Date(artifact.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const visibleArtifacts = artifacts.filter(item => historyLanguage === "all" || item.language === historyLanguage);
  const languageName = (language: SourceLanguage) => language === "en" ? "English" : "Korean";

  return <section className="story-workspace" id="artifacts" aria-label="Story reader" hidden={!active}>
    {artifact ? <main className="story-layout">
      <section className="story-reader-panel">
        <header className="story-hero">
          <div className="story-hero-controls">
            <details className="story-dropdown">
              <summary aria-label={artifact.targets.length + " target words"}><svg className="story-inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v15M12 6C9 3 5 3 2 4v14c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2z"/></svg>{artifact.targets.length} target {artifact.targets.length === 1 ? "word" : "words"} ⌄</summary>
              <div className="story-dropdown-panel">{artifact.targets.map(target => <button type="button" key={target.id} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onOpenVocabulary(target.id); }}><span lang={artifact.language}>{target.lemma}</span><span lang="zh">{target.meaningZh}</span></button>)}</div>
            </details>
            <details className="story-dropdown story-options">
              <summary aria-label="Story options">⋮</summary>
              <div className="story-dropdown-panel">
                {onRequestGenerate && <button type="button" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onRequestGenerate(); }}>Generate a story</button>}
                  {!!artifacts.length && <>
                    <label>Filter saved stories
                      <Dropdown label="Filter saved stories" value={historyLanguage} options={[{ value: "all", label: "All" }, { value: "ko", label: "Korean" }, { value: "en", label: "English" }]} onChange={setHistoryLanguage}/>
                    </label>
                    <label>Open saved story
                  <Dropdown label="Open saved story" value="" placeholder="Choose a saved story" options={visibleArtifacts.map(item => ({ value: item.id, label: languageName(item.language) + " · " + item.title }))} onChange={id => { if (id) { void open(id); document.querySelector<HTMLDetailsElement>(".story-options[open]")?.removeAttribute("open"); } }}/>
                    </label>
                  </>}
              </div>
            </details>
          </div>
          <div className="story-hero-copy">
            <h1 lang={artifact.language}>{artifact.title}</h1>
            <p><svg className="story-inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/></svg>Generated from {artifact.targets.length} vocabulary {artifact.targets.length === 1 ? "word" : "words"} <span className="story-language-badge">{languageName(artifact.language)}</span><span>•</span> ~{readMinutes} min read <span>•</span> <time dateTime={artifact.createdAt}>{dateLabel}</time></p>
          </div>
        </header>

        <div className="story-reading-pane">
          <article className="story-sentences" data-artifact-id={artifact.id}>
            {artifact.sentences.map((sentence, index) => <div className="story-sentence" key={index}>
              <p className="artifact-korean" id={"artifact-sentence-" + index} data-sentence-index={index} lang={artifact.language} tabIndex={0} aria-current={activeSentence === index ? "location" : undefined} onFocus={() => { if (index !== activeSentence && onBeforeChange()) setActiveSentence(index); }} onClick={() => { if (index !== activeSentence && onBeforeChange()) setActiveSentence(index); }}>
                {sentence.parts.map((part, n) => part.targetId
                  ? <mark key={n} data-target-id={part.targetId} title={artifact.targets.find(target => target.id === part.targetId)?.meaningZh}>{part.text}</mark>
                  : <span key={n}>{part.text}</span>)}
              </p>
              {translations.has(index) && <p className="story-translation" lang="zh">{sentence.translationZh}</p>}
            </div>)}
          </article>
        </div>
        {error && !generationOpen && <p className="story-notice" role="alert">{error}</p>}
        <footer className="story-reader-footer">
          <button type="button" aria-label="Previous sentence" disabled={activeSentence <= 0} onClick={() => jump(activeSentence - 1)}>← &nbsp;Previous</button>
          <button type="button" aria-label={translations.has(activeSentence) ? "Hide Chinese translation" : "Show Chinese translation"} aria-pressed={translations.has(activeSentence)} onClick={() => setTranslations(current => { const next = new Set(current); if (next.has(activeSentence)) next.delete(activeSentence); else next.add(activeSentence); return next; })}>中文</button>
          <span>{artifact.sentences.length ? activeSentence + 1 : 0} / {artifact.sentences.length} sentences</span>
          <button type="button" aria-label="Next sentence" disabled={activeSentence >= artifact.sentences.length - 1} onClick={() => jump(activeSentence + 1)}>Next &nbsp;→</button>
        </footer>
      </section>

      <aside className="story-sidebar">
        <section className="story-context-panel">
          <header><h2>Context</h2><span>{artifact.sentences.length} sentences</span></header>
          <div className="story-context-list">{artifact.sentences.map((sentence, index) => <button type="button" key={index} aria-current={activeSentence === index ? "location" : undefined} onClick={() => jump(index)}>
            <span>{String(index + 1).padStart(2, "0")}</span><span lang={artifact.language}>{textOf(sentence)}</span>{activeSentence === index && <i aria-hidden="true" />}
          </button>)}</div>
        </section>
        <section className="story-vocabulary-panel">
          <header><h2>Target Vocabulary</h2><span>{artifact.targets.length} words</span></header>
          <div className="story-vocabulary-list">{artifact.targets.map(target => <div className="story-vocabulary-row" key={target.id}>
            <button type="button" lang={artifact.language} aria-label={`Open ${target.lemma} in vocabulary`} onClick={() => onOpenVocabulary(target.id)}>{target.lemma}</button><span lang="zh">{target.meaningZh}</span>
          </div>)}</div>
        </section>
      </aside>

    </main> : <div className="story-empty-state">
      <h1>{loaded ? "Choose a story" : "Restoring your library…"}</h1>
      <p>{loaded ? "Saved stories remain available for offline reading." : "Reading saved stories from this device."}</p>
      {!!artifacts.length && <>
        <label>Filter saved stories
          <Dropdown label="Filter saved stories" value={historyLanguage} options={[{ value: "all", label: "All" }, { value: "ko", label: "Korean" }, { value: "en", label: "English" }]} onChange={setHistoryLanguage}/>
        </label>
        <label>Saved stories
        <Dropdown label="Open saved story" value="" placeholder="Choose a saved story" options={visibleArtifacts.map(item => ({ value: item.id, label: languageName(item.language) + " · " + item.title }))} onChange={id => { if (id) { void open(id); document.querySelector<HTMLDetailsElement>(".story-options[open]")?.removeAttribute("open"); } }}/>
        </label>
      </>}
      {onRequestGenerate && <button type="button" onClick={onRequestGenerate}>Generate a story</button>}
      {error && <p className="story-notice" role="alert">{error}</p>}
    </div>}

    <dialog className="story-generation-dialog" ref={dialog} aria-labelledby="story-generation-title" onClose={() => onGenerationClose?.()} onCancel={event => { if (busy) { event.preventDefault(); cancelGeneration(); } }}>
      <div className="story-dialog-content">
        <div className="story-dialog-heading"><h2 id="story-generation-title">Generate a story</h2><button type="button" aria-label="Close generation dialog" disabled={busy} onClick={closeDialog}>×</button></div>
        <p>The story uses selected saved vocabulary and remains available for offline reading.</p>
        <section className="story-selected-targets" aria-label="Selected vocabulary">
          <header><h3>Selected vocabulary</h3><span>{selected.length} / 20</span></header>
          {selected.length ? <ul>{selected.map(entry => <li key={entry.id}><strong lang={entry.language}>{entry.lemma}<small className="story-language-badge">{languageName(entry.language)}</small></strong><span lang="zh">{entry.meaningZh}</span></li>)}</ul> : <p>No vocabulary selected.</p>}
          {(selected.length < 1 || selected.length > 20) && <p className="story-hint">Select 1–20 existing vocabulary items to continue.</p>}
          {mixedLanguageSelection && <p className="story-hint" role="alert">Choose vocabulary in one source language. Return to vocabulary selection to adjust your choices; all selected words are preserved.</p>}
        </section>
        <label className="story-topic">Topic <span>Optional</span><input name="topic" value={topic} maxLength={200} disabled={busy} onChange={event => setTopic(event.currentTarget.value)} /></label>
        <section className="story-credential" aria-label="Cloud configuration">
          <button type="button" disabled={busy} onClick={onOpenSettings}>{credential.configured ? "API key configured · Open settings" : "Configure API key in Settings"}</button>
          {credential.error && <p role="alert">{credential.error}</p>}
        </section>
        {error && <p className="story-notice" role="alert">{error}</p>}
        <footer>{busy && <button type="button" onClick={cancelGeneration}>Cancel generation</button>}{!busy && <button type="button" onClick={closeDialog}>Cancel</button>}<button type="button" disabled={busy || !credential.configured || mixedLanguageSelection || selected.length < 1 || selected.length > 20} onClick={() => void generate()}>{busy ? "Generating…" : error ? "Retry generation" : "Generate story"}</button></footer>
      </div>
    </dialog>
  </section>;
}
