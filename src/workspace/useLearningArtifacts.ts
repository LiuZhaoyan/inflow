"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtifactVocabularySource, LearningArtifact, VocabularyEntry } from "@/listening/desktop";

export function useLearningArtifacts(enabled: boolean, beforeChange: () => boolean, onGenerated: () => void, onAccepted: () => void) {
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
  const [selection, setSelection] = useState<{ artifact: LearningArtifact | null; source: ArtifactVocabularySource | null }>({ artifact: null, source: null });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const intent = useRef(0);
  const pending = useRef<number | null>(null);
  const job = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    const restoringIntent = intent.current;
    Promise.all([window.inflow!.listArtifacts(), window.inflow!.restoreArtifact()])
      .then(([items, restored]) => {
        if (!current) return;
        setArtifacts(previous => [...previous, ...items.filter(item => !previous.some(existing => existing.id === item.id))]);
        if (intent.current === restoringIntent) setSelection({ artifact: restored, source: null });
        setLoaded(true);
      })
      .catch(failure => {
        if (current) {
          if (intent.current === restoringIntent) setError(failure instanceof Error ? failure.message : "Saved stories could not be loaded.");
          setLoaded(true);
        }
      });
    return () => {
      current = false;
      pending.current = null;
      if (job.current) void window.inflow!.cancel(job.current).catch(() => {});
    };
  }, [enabled]);

  function cancelNavigation(dirty = false) {
    if (pending.current === null) return;
    intent.current++;
    pending.current = null;
    setOpening(false);
    if (dirty) setNotice({ id: intent.current, message: 'Story navigation canceled. Your unsaved vocabulary draft is preserved.' });
  }

  function begin() {
    const token = ++intent.current;
    pending.current = token;
    setOpening(false);
    setError("");
    return token;
  }

  function accept(token: number, next: LearningArtifact, source: ArtifactVocabularySource | null) {
    if (token !== pending.current) return false;
    if (!beforeChange()) { cancelNavigation(true); return false; }
    const artifact = window.inflow!.acceptArtifact(next.id);
    setSelection({ artifact, source });
    onAccepted();
    setError("");
    return true;
  }

  function openSource(next: ArtifactVocabularySource) {
    if (!beforeChange()) return false;
    void open(next.artifactId, next);
    return true;
  }

  async function open(id: string, source: ArtifactVocabularySource | null = null) {
    if (!beforeChange()) return;
    const token = begin();
    setOpening(true);
    try {
      const next = await window.inflow!.openArtifact(id);
      accept(token, next, source);
    } catch (failure) {
      if (token === pending.current) setError(failure instanceof Error ? failure.message : "The saved story could not be opened.");
    } finally {
      if (token === pending.current) { pending.current = null; setOpening(false); }
    }
  }

  async function generate(selected: VocabularyEntry[], topic: string) {
    if (new Set(selected.map(entry => entry.language)).size > 1) {
      setError("Choose vocabulary in one source language before generating. All selected words are preserved.");
      return false;
    }
    if (busy || selected.length < 1 || selected.length > 20 || !beforeChange()) return false;
    const token = begin();
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    job.current = id;
    try {
      const next = await window.inflow!.generateArtifact(selected.map(entry => entry.id), topic, id);
      setArtifacts(previous => [next, ...previous.filter(item => item.id !== next.id)]);
      onGenerated();
      accept(token, next, null);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Story generation failed. Please try again.");
      return false;
    } finally {
      job.current = null;
      setBusy(false);
      if (token === pending.current) { pending.current = null; setOpening(false); }
    }
  }

  function cancelGeneration() {
    cancelNavigation();
    if (job.current) void window.inflow!.cancel(job.current).catch(failure => {
      setError(failure instanceof Error ? failure.message : "Generation could not be cancelled.");
    });
  }

  return { artifacts, selection, loaded, error, setError, busy, opening, notice, setNotice, cancelNavigation, openSource, open, generate, cancelGeneration };
}

export type LearningArtifacts = ReturnType<typeof useLearningArtifacts>;
