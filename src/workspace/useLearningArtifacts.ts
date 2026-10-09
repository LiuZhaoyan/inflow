"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtifactVocabularySource, LearningArtifact, VocabularyEntry } from "@/listening/desktop";

export function useLearningArtifacts(enabled: boolean, beforeChange: () => boolean) {
  const [source, setSource] = useState<ArtifactVocabularySource | null>(null);
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
  const [selection, setSelection] = useState<{ artifact: LearningArtifact | null; source: ArtifactVocabularySource | null }>({ artifact: null, source: null });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const job = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    Promise.all([window.inflow!.listArtifacts(), window.inflow!.restoreArtifact()])
      .then(([items, restored]) => {
        if (!current) return;
        setArtifacts(items);
        setSelection({ artifact: restored, source: null });
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
  }, [enabled]);

  useEffect(() => {
    if (!loaded || !source) return;
    let current = true;
    window.inflow!.openArtifact(source.artifactId).then(next => {
      if (!current || !beforeChange()) return;
      setSelection({ artifact: next, source });
      setError("");
    }).catch(failure => {
      if (current) setError(failure instanceof Error ? failure.message : "The source story could not be opened.");
    });
    return () => { current = false; };
  }, [loaded, source, beforeChange]);

  function openSource(next: ArtifactVocabularySource) {
    if (!beforeChange()) return false;
    setSource({ ...next });
    return true;
  }

  async function open(id: string) {
    if (!beforeChange()) return;
    try {
      const next = await window.inflow!.openArtifact(id);
      if (!beforeChange()) return;
      setSelection({ artifact: next, source: null });
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The saved story could not be opened.");
    }
  }

  async function generate(selected: VocabularyEntry[], topic: string) {
    if (new Set(selected.map(entry => entry.language)).size > 1) {
      setError("Choose vocabulary in one source language before generating. All selected words are preserved.");
      return false;
    }
    if (selected.length < 1 || selected.length > 20 || !beforeChange()) return false;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    job.current = id;
    try {
      const next = await window.inflow!.generateArtifact(selected.map(entry => entry.id), topic, id);
      setArtifacts([next, ...artifacts.filter(item => item.id !== next.id)]);
      setSelection({ artifact: next, source: null });
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Story generation failed. Please try again.");
      return false;
    } finally {
      job.current = null;
      setBusy(false);
    }
  }

  function cancelGeneration() {
    if (job.current) void window.inflow!.cancel(job.current).catch(failure => {
      setError(failure instanceof Error ? failure.message : "Generation could not be cancelled.");
    });
  }

  return { artifacts, selection, loaded, error, busy, openSource, open, generate, cancelGeneration };
}

export type LearningArtifacts = ReturnType<typeof useLearningArtifacts>;
