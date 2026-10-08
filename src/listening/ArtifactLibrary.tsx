"use client";

import { useEffect, useRef, useState } from "react";
import "@/workspace/story.css";
import type { ArtifactVocabularySource, CredentialStatus, LearningArtifact, SourceLanguage, VocabularyEntry } from "./desktop";

type Props = {
  artifacts: LearningArtifact[];
  artifact: LearningArtifact | null;
  selected: VocabularyEntry[];
  source: ArtifactVocabularySource | null;
  onBeforeChange: () => boolean;
  active?: boolean;
  generationOpen?: boolean;
  onGenerationClose?: () => void;
  onRequestGenerate?: () => void;
  onArtifactChange: (artifact: LearningArtifact | null) => void;
  onArtifactsChange: (artifacts: LearningArtifact[]) => void;
  credential: CredentialStatus;
  onOpenSettings: () => void;
};

function textOf(sentence: LearningArtifact["sentences"][number]) {
  return sentence.parts.map(part => part.text).join("");
}

export default function ArtifactLibrary({
  artifacts, artifact,
  selected, source, onBeforeChange, active = true, generationOpen = false,
  onGenerationClose, onRequestGenerate, onArtifactChange, onArtifactsChange,
  credential, onOpenSettings,
}: Props) {
  const [historyLanguage, setHistoryLanguage] = useState<"all" | SourceLanguage>("all");
  const [loaded, setLoaded] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeSentence, setActiveSentence] = useState(0);
  const [translations, setTranslations] = useState<Set<number>>(() => new Set());
  const job = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const mixedLanguageSelection = new Set(selected.map(entry => entry.language)).size > 1;

  useEffect(() => {
    let current = true;
    Promise.all([window.inflow!.listArtifacts(), window.inflow!.restoreArtifact()])
      .then(([items, restored]) => {
        if (!current) return;
        onArtifactsChange(items);
        onArtifactChange(restored);
        setLoaded(true);
      })
      .catch(failure => {
        if (current) {
          setError(failure instanceof Error ? failure.message : "Saved stories could not be loaded.");
          setLoaded(true);
        }
      });
    return () => {
      current = false;
      if (job.current) void window.inflow!.cancel(job.current).catch(() => {});
    };
  }, [onArtifactChange, onArtifactsChange]);

  useEffect(() => {
    if (!loaded || !source) return;
    const { artifactId, sentenceIndex } = source;
    let current = true;
    window.inflow!.openArtifact(artifactId).then(next => {
      if (!current || !onBeforeChange()) return;
      onArtifactChange(next);
      const index = Math.max(0, Math.min(sentenceIndex, Math.max(0, next.sentences.length - 1)));
      setActiveSentence(index);
      setTranslations(new Set());
      setError("");
      requestAnimationFrame(() => {
        if (current) document.getElementById("artifact-sentence-" + index)?.scrollIntoView({ block: "center" });
      });
    }).catch(failure => {
      if (current) setError(failure instanceof Error ? failure.message : "The source story could not be opened.");
    });
    return () => { current = false; };
  }, [loaded, source, onArtifactChange, onBeforeChange]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (active && generationOpen && !element.open) element.showModal();
    else if ((!active || !generationOpen) && element.open) element.close();
  }, [active, generationOpen]);

  async function generate() {
    if (mixedLanguageSelection) {
      setError("Choose vocabulary in one source language before generating. All selected words are preserved.");
      return;
    }
    if (selected.length < 1 || selected.length > 20 || !credential.configured || !onBeforeChange()) return;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    job.current = id;
    try {
      const next = await window.inflow!.generateArtifact(selected.map(entry => entry.id), topic, id);
      const items = [next, ...artifacts.filter(item => item.id !== next.id)];
      onArtifactsChange(items);
      onArtifactChange(next);
      setActiveSentence(0);
      setTranslations(new Set());
      if (dialog.current?.open) dialog.current.close();
      else onGenerationClose?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Story generation failed. Please try again.");
    } finally {
      job.current = null;
      setBusy(false);
    }
  }

  async function openStory(id: string) {
    if (!onBeforeChange()) return;
    try {
      const next = await window.inflow!.openArtifact(id);
      if (!onBeforeChange()) return;
      onArtifactChange(next);
      setActiveSentence(0);
      setTranslations(new Set());
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The saved story could not be opened.");
    }
  }

  function jump(index: number) {
    if (!artifact || index < 0 || index >= artifact.sentences.length || !onBeforeChange()) return;
    setActiveSentence(index);
    document.getElementById("artifact-sentence-" + index)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function jumpToTarget(id: string) {
    const index = artifact?.sentences.findIndex(sentence => sentence.parts.some(part => part.targetId === id)) ?? -1;
    if (index >= 0) jump(index);
  }

  function closeDialog() {
    if (dialog.current?.open) dialog.current.close();
    else onGenerationClose?.();
  }

  function cancelGeneration() {
    if (job.current) void window.inflow!.cancel(job.current).catch(failure => {
      setError(failure instanceof Error ? failure.message : "Generation could not be cancelled.");
    });
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
              <div className="story-dropdown-panel">{artifact.targets.map(target => <button type="button" key={target.id} onClick={() => jumpToTarget(target.id)}><span lang={artifact.language}>{target.lemma}</span><span lang="zh">{target.meaningZh}</span></button>)}</div>
            </details>
            <details className="story-dropdown story-options">
              <summary aria-label="Story options">⋮</summary>
              <div className="story-dropdown-panel">
                {onRequestGenerate && <button type="button" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onRequestGenerate(); }}>Generate a story</button>}
                  {!!artifacts.length && <>
                    <label>Filter saved stories
                      <select aria-label="Filter saved stories" value={historyLanguage} onChange={event => setHistoryLanguage(event.currentTarget.value as "all" | SourceLanguage)}>
                        <option value="all">All</option><option value="ko">Korean</option><option value="en">English</option>
                      </select>
                    </label>
                    <label>Open saved story
                  <select aria-label="Open saved story" value="" onChange={event => { const id = event.currentTarget.value; event.currentTarget.closest("details")?.removeAttribute("open"); if (id) void openStory(id); }}>
                    <option value="">Choose a saved story</option>{visibleArtifacts.map(item => <option key={item.id} value={item.id}>{languageName(item.language)} · {item.title}</option>)}
                  </select>
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
            <button type="button" lang={artifact.language} onClick={() => jumpToTarget(target.id)}>{target.lemma}</button><span lang="zh">{target.meaningZh}</span>
            <details><summary aria-label={"More actions for " + target.lemma}>…</summary><div className="story-disabled-actions">
              <button disabled title="Available in a later update">Dictionary</button><button disabled title="Available in a later update">Pronunciation</button><button disabled title="Available in a later update">Add context</button><button disabled title="Available in a later update">Notes</button><small>Available in a later update</small>
            </div></details>
          </div>)}</div>
        </section>
      </aside>

    </main> : <div className="story-empty-state">
      <h1>{loaded ? "Choose a story" : "Restoring your library…"}</h1>
      <p>{loaded ? "Saved stories remain available for offline reading." : "Reading saved stories from this device."}</p>
      {!!artifacts.length && <>
        <label>Filter saved stories
          <select aria-label="Filter saved stories" value={historyLanguage} onChange={event => setHistoryLanguage(event.currentTarget.value as "all" | SourceLanguage)}>
            <option value="all">All</option><option value="ko">Korean</option><option value="en">English</option>
          </select>
        </label>
        <label>Saved stories
        <select aria-label="Open saved story" value="" onChange={event => { const id = event.currentTarget.value; if (id) void openStory(id); }}>
          <option value="">Choose a saved story</option>{visibleArtifacts.map(item => <option key={item.id} value={item.id}>{languageName(item.language)} · {item.title}</option>)}
        </select>
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
