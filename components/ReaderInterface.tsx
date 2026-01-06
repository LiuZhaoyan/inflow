"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { LANGUAGE_OPTIONS, LanguageCode, normalizeLanguageCode, resolveLanguageLabel } from '@/lib/language';
import {
  getImageKey,
  normalizeChapters,
  pickBodyChapters,
  flattenChapterSentences,
  paragraphSentenceToFlatIndex,
  flatIndexToPosition,
  flatIndexToParagraphSentence,
  type Chapter,
} from '@/lib/readerUtils';
import { ChapterSidebar, MobileChapterList } from './readers/ChapterSidebar';
import { AISidebar } from './readers/AISidebar';

interface ReaderProps {
  bookId: string;
  chapters: { title: string; paragraphs?: string[][]; content?: string[] }[];
  initialLanguage?: string | null;
}

const LANGUAGE_SELECT_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'auto', label: 'Auto (match text)' },
  ...LANGUAGE_OPTIONS,
];

export default function ReaderInterface({ bookId, chapters, initialLanguage }: ReaderProps) {
  // 检查 AI-depict 功能开关
  const [isAIDepictAvailable, setIsAIDepictAvailable] = useState(true);
  useEffect(() => {
    fetch('/api/ai-depict/status')
      .then(res => res.json())
      .then(data => setIsAIDepictAvailable(!!data.enabled))
      .catch(() => setIsAIDepictAvailable(false));
  }, []);
  const normalizedChapters = useMemo(() => normalizeChapters(chapters), [chapters]);
  const bodyChapters = useMemo(() => pickBodyChapters(normalizedChapters), [normalizedChapters]);

  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);
  const [isChapterNavCollapsed, setIsChapterNavCollapsed] = useState(false);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const normalizedInitialLanguage = useMemo(() => normalizeLanguageCode(initialLanguage), [initialLanguage]);
  const languageStorageKey = useMemo(() => `language-${bookId}`, [bookId]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return normalizedInitialLanguage;
    const saved = window.localStorage.getItem(`language-${bookId}`);
    return saved ? normalizeLanguageCode(saved) : normalizedInitialLanguage;
  });
  
    // Explanation States
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // Image Generation States 
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [didCopySelection, setDidCopySelection] = useState(false);

  // Prevent stale in-flight AI responses from overwriting the UI after selection changes
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiRequestSeqRef = useRef(0);

  // Desktop AI panel width (resizable via splitter)
  const AI_PANEL_MIN = 320;
  const AI_PANEL_MAX = 560;
  const AI_PANEL_DEFAULT = 384;
  const aiWidthStorageKey = useMemo(() => `ai-panel-width-${bookId}`, [bookId]);
  const [aiPanelWidth, setAiPanelWidth] = useState<number>(AI_PANEL_DEFAULT);
  const aiPanelWidthRef = useRef<number>(AI_PANEL_DEFAULT);
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(AI_PANEL_DEFAULT);

  // Helper to check if any loading is active
  const isAnyLoading = isLoadingAI || isLoadingImage;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(languageStorageKey);
    if (saved) {
      setSelectedLanguage(normalizeLanguageCode(saved));
    } else {
      setSelectedLanguage(normalizedInitialLanguage);
    }
  }, [languageStorageKey, normalizedInitialLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(languageStorageKey, selectedLanguage);
  }, [languageStorageKey, selectedLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(aiWidthStorageKey);
    if (!saved) return;
    const parsed = parseInt(saved, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, parsed));
    setAiPanelWidth(clamped);
    aiPanelWidthRef.current = clamped;
  }, [aiWidthStorageKey]);

  // Progress Tracking... 
  useEffect(() => {
    const saved = localStorage.getItem(`progress-${bookId}`);
    if (!saved) return;

    // Back-compat: old format was a single integer (flat sentence index).
    if (/^\d+$/.test(saved)) {
      const flat = parseInt(saved, 10);
      const pos = flatIndexToPosition(flat, bodyChapters);
      setSelectedChapterIndex(pos.chapterIndex);
      setSelectedParagraphIndex(pos.paragraphIndex);
      setSelectedSentenceIndex(pos.sentenceIndex);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const c = typeof parsed?.chapterIndex === 'number' ? parsed.chapterIndex : 0;
      const clampedChapter = Math.min(Math.max(0, c), Math.max(0, bodyChapters.length - 1));
      setSelectedChapterIndex(clampedChapter);

      // New format: paragraph+sentence
      if (typeof parsed?.paragraphIndex === 'number' && typeof parsed?.sentenceIndex === 'number') {
        const chapter = bodyChapters[clampedChapter];
        const maxP = Math.max(0, (chapter?.paragraphs?.length || 1) - 1);
        const p = Math.min(Math.max(0, parsed.paragraphIndex), maxP);
        const maxS = Math.max(0, (chapter?.paragraphs?.[p]?.length || 1) - 1);
        const s = Math.min(Math.max(0, parsed.sentenceIndex), maxS);
        setSelectedParagraphIndex(p);
        setSelectedSentenceIndex(s);
        return;
      }

      // Back-compat (v1): stored {chapterIndex, sentenceIndex} where sentenceIndex was within the chapter's flat sentence list.
      if (typeof parsed?.sentenceIndex === 'number') {
        const chapter = bodyChapters[clampedChapter];
        const pos = flatIndexToParagraphSentence(parsed.sentenceIndex, chapter?.paragraphs || []);
        setSelectedParagraphIndex(pos.paragraphIndex);
        setSelectedSentenceIndex(pos.sentenceIndex);
        return;
      }

      setSelectedParagraphIndex(null);
      setSelectedSentenceIndex(null);
    } catch {
      // ignore
    }
  }, [bookId, bodyChapters]);

  // Persist chapter nav collapsed state per book
  useEffect(() => {
    const saved = localStorage.getItem(`chapters-collapsed-${bookId}`);
    if (saved === '1') setIsChapterNavCollapsed(true);
    if (saved === '0') setIsChapterNavCollapsed(false);
  }, [bookId]);

  useEffect(() => {
    localStorage.setItem(`chapters-collapsed-${bookId}`, isChapterNavCollapsed ? '1' : '0');
  }, [bookId, isChapterNavCollapsed]);

  useEffect(() => {
    if (selectedParagraphIndex === null || selectedSentenceIndex === null) return;
    localStorage.setItem(
      `progress-${bookId}`,
      JSON.stringify({
        chapterIndex: selectedChapterIndex,
        paragraphIndex: selectedParagraphIndex,
        sentenceIndex: selectedSentenceIndex,
      })
    );
  }, [selectedSentenceIndex, selectedParagraphIndex, selectedChapterIndex, bookId]);

  const abortAIExplain = () => {
    if (aiAbortRef.current) {
      try {
        aiAbortRef.current.abort();
      } catch {
        // ignore
      }
      aiAbortRef.current = null;
    }
  };

  const fetchAIExplanation = async (
    chapterIndex: number,
    paragraphIndex: number,
    sentenceIndex: number,
    languageOverride?: LanguageCode
  ) => {
    if (isLoadingImage) return; // don't compete with image generation

    const currentChapter = bodyChapters[chapterIndex];
    const currentSentence = currentChapter?.paragraphs?.[paragraphIndex]?.[sentenceIndex] || '';
    if (!currentSentence) return;

    // cancel previous request and start a new one
    abortAIExplain();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    const reqId = ++aiRequestSeqRef.current;

    setIsLoadingAI(true);
    setAiExplanation(null);
    setGeneratedImage(null); // keep output area single-mode

    try {
      const flatSentenceIndex = paragraphSentenceToFlatIndex(currentChapter, paragraphIndex, sentenceIndex);
      const flat = flattenChapterSentences(currentChapter);
      const contextSentences = flat.filter(s => !/^<<<IMAGE:[^>]+>>>.$/.test(s)).slice(Math.max(0, flatSentenceIndex - 2), flatSentenceIndex);
      const prevContext = contextSentences.join(" ");
      const languageForRequest = languageOverride ?? selectedLanguage;

      // Debug aid: verify what we actually send to the API.
      console.debug('[ai-explain] request', {
        bookId,
        chapterIndex,
        chapterTitle: currentChapter?.title,
        paragraphIndex,
        sentenceIndex,
        textPreview: currentSentence.slice(0, 160),
        contextPreview: prevContext.slice(0, 160),
        difficulty,
        targetLanguage: languageForRequest,
      });

      const res = await fetch('/api/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({
          text: currentSentence,
          context: prevContext,
          difficulty,
          targetLanguage: languageForRequest,
          // Debug toggle: set true temporarily while diagnosing language mismatches.
          debug: process.env.NODE_ENV !== 'production',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'API request failed');

      // Only apply if this is still the latest request and selection still matches.
      if (reqId !== aiRequestSeqRef.current) return;
      if (selectedChapterIndex !== chapterIndex) return;
      if (selectedParagraphIndex !== paragraphIndex) return;
      if (selectedSentenceIndex !== sentenceIndex) return;

      setAiExplanation(data.explanation);
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error(error);
      // Only apply error if still latest and selection still matches.
      if (reqId !== aiRequestSeqRef.current) return;
      if (selectedChapterIndex !== chapterIndex) return;
      if (selectedParagraphIndex !== paragraphIndex) return;
      if (selectedSentenceIndex !== sentenceIndex) return;
      setAiExplanation(error.message || "Sorry, I couldn't reach the AI teacher right now.");
    } finally {
      if (reqId === aiRequestSeqRef.current) setIsLoadingAI(false);
    }
  };

  // Handle Selection Change
  const handleSentenceClick = (pIndex: number, sIndex: number) => {
    // switching sentence invalidates any in-flight explain request
    abortAIExplain();
    setIsLoadingAI(false);

    setSelectedParagraphIndex(pIndex);
    setSelectedSentenceIndex(sIndex);
    setGeneratedImage(null);
    // Keep existing explanation visible until the user explicitly requests a new one
  };

  // 3. AI Explain Function 
  const askAI = async () => {
    if (isAnyLoading || selectedParagraphIndex === null || selectedSentenceIndex === null) return;
    await fetchAIExplanation(selectedChapterIndex, selectedParagraphIndex, selectedSentenceIndex, selectedLanguage);
  };

  // 4. AI Depict Function 
  const depictAI = async () => {
    if (isAnyLoading || selectedParagraphIndex === null || selectedSentenceIndex === null) return;

    // Depict is a different mode; cancel any in-flight explain request.
    if (!isAIDepictAvailable) {
      setAiExplanation("AI-depict feature is not available.");
      return;
    }
    abortAIExplain();
    setIsLoadingImage(true);
    setGeneratedImage(null);
    setAiExplanation(null); // Clear previous explanation if any
    try {
      const currentChapter = bodyChapters[selectedChapterIndex];
      const currentSentence = currentChapter?.paragraphs?.[selectedParagraphIndex]?.[selectedSentenceIndex] || '';
      const res = await fetch('/api/ai-depict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentSentence }),
      });
      if (!res.ok) throw new Error('Image API request failed');
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        throw new Error("No image URL in response");
      }
    } catch (error) {
      console.error(error);
      setAiExplanation("Sorry, I couldn't generate an image right now."); // Fallback message to explanation area
    } finally {
      setIsLoadingImage(false);
    }
  };

  const currentChapterTitle = bodyChapters[selectedChapterIndex]?.title || 'Chapter';
  const selectedSentenceText =
    selectedParagraphIndex === null || selectedSentenceIndex === null
      ? null
      : (bodyChapters[selectedChapterIndex]?.paragraphs?.[selectedParagraphIndex]?.[selectedSentenceIndex] || null);
  const detectedLanguageLabel = resolveLanguageLabel(normalizedInitialLanguage);

  const handleChapterSelect = (index: number) => {
    abortAIExplain();
    setIsLoadingAI(false);
    setSelectedChapterIndex(index);
    setSelectedParagraphIndex(null);
    setSelectedSentenceIndex(null);
    setAiExplanation(null);
    setGeneratedImage(null);
  };

  const copySelectedSentence = async () => {
    if (!selectedSentenceText) return;
    try {
      await navigator.clipboard.writeText(selectedSentenceText);
      setDidCopySelection(true);
      window.setTimeout(() => setDidCopySelection(false), 900);
    } catch {
      // ignore
    }
  };

  const handleLanguageChange = (value: string) => {
    const normalized = normalizeLanguageCode(value);
    setSelectedLanguage(normalized);
    abortAIExplain();
    setIsLoadingAI(false);
    setAiExplanation(null);
    setGeneratedImage(null);
    if (selectedParagraphIndex !== null && selectedSentenceIndex !== null) {
      void fetchAIExplanation(selectedChapterIndex, selectedParagraphIndex, selectedSentenceIndex, normalized);
    }
  };

  const startResize = (clientX: number) => {
    isResizingRef.current = true;
    resizeStartXRef.current = clientX;
    resizeStartWidthRef.current = aiPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const endResize = () => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try {
      window.localStorage.setItem(aiWidthStorageKey, String(aiPanelWidthRef.current));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isResizingRef.current) return;
      // Moving splitter to the RIGHT makes the reader wider (AI panel narrower).
      const deltaX = e.clientX - resizeStartXRef.current;
      const next = Math.min(AI_PANEL_MAX, Math.max(AI_PANEL_MIN, resizeStartWidthRef.current - deltaX));
      setAiPanelWidth(next);
      aiPanelWidthRef.current = next;
    };
    const onUp = () => endResize();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [aiWidthStorageKey]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <BookOpen className="w-5 h-5 text-blue-600" /> Inflow
        </h1>
        <select 
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as any)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="beginner">Level: Beginner</option>
          <option value="intermediate">Level: Intermediate</option>
          <option value="advanced">Level: Advanced</option>
        </select>
      </header>

      {/* Main Layout: Split View */}
      <main className="flex-grow w-full py-8 pr-4 lg:pr-6 pl-4 flex flex-col lg:flex-row gap-6">

        {/* Desktop Chapters Sidebar */}
        <ChapterSidebar
          bodyChapters={bodyChapters}
          selectedChapterIndex={selectedChapterIndex}
          isCollapsed={isChapterNavCollapsed}
          onToggleCollapse={() => setIsChapterNavCollapsed(!isChapterNavCollapsed)}
          onSelectChapter={handleChapterSelect}
        />

        {/* LEFT: Reader (mobile includes an inline chapter list) */}
        <div className="flex-1 min-w-0">
          {/* Mobile Chapters */}
          <MobileChapterList
            bodyChapters={bodyChapters}
            selectedChapterIndex={selectedChapterIndex}
            onSelectChapter={handleChapterSelect}
          />

          {/* Reader */}
          <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100 lg:h-[calc(100vh-8rem)] overflow-y-auto min-w-0">
            <div className="prose sm:prose-lg max-w-none text-gray-800 leading-relaxed font-serif pb-16">
              {bodyChapters.length === 0 ? (
                <div className="text-sm text-gray-500">No readable chapters found.</div>
              ) : (
                <div className="mx-auto max-w-[72ch]">
                  <h2 className="text-2xl font-bold mb-6 mt-0">
                    {currentChapterTitle}
                  </h2>
                  {(bodyChapters[selectedChapterIndex]?.paragraphs || []).map((paragraph, pIndex) => (
                    <p key={pIndex} className="mb-4 last:mb-0">
                      {(paragraph || []).map((sentence, sIndex) => {
                        const imageKey = getImageKey(sentence);
                        if (imageKey) {
                          return (
                            <span key={`${pIndex}-${sIndex}`} className="block my-4 text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={`/uploads/images/${bookId}/${imageKey}`} 
                                alt="Book illustration" 
                                className="max-w-full h-auto rounded-lg shadow-sm max-h-[500px] mx-auto"
                              />
                            </span>
                          );
                        }
                        return (
                        <React.Fragment key={`${pIndex}-${sIndex}`}>
                          <span
                            onClick={() => handleSentenceClick(pIndex, sIndex)}
                            className={`
                              cursor-pointer transition-colors duration-200 py-1 px-0.5 rounded select-none
                              ${selectedParagraphIndex === pIndex && selectedSentenceIndex === sIndex
                                ? 'bg-blue-100 text-blue-900 font-semibold border-b-2 border-blue-400'
                                : 'hover:bg-slate-100 hover:text-gray-900'}
                            `}
                          >
                            {sentence}
                          </span>
                          {" "}
                        </React.Fragment>
                      )})}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop splitter */}
        <div className="hidden lg:flex items-stretch">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize AI panel"
            tabIndex={0}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              startResize(e.clientX);
            }}
            className="w-2 -mx-1 cursor-col-resize flex items-center justify-center group select-none"
          >
            <div className="h-full w-[2px] rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors" />
          </div>
        </div>

        {/* RIGHT COLUMN: AI Sidebar */}
        <AISidebar
          selectedSentenceText={selectedSentenceText}
          selectedLanguage={selectedLanguage}
          languageOptions={LANGUAGE_SELECT_OPTIONS}
          detectedLanguageLabel={detectedLanguageLabel}
          showDetectedLanguage={normalizedInitialLanguage !== 'auto'}
          aiExplanation={aiExplanation}
          generatedImage={generatedImage}
          isLoadingAI={isLoadingAI}
          isLoadingImage={isLoadingImage}
          isAIDepictAvailable={isAIDepictAvailable}
          didCopySelection={didCopySelection}
          aiPanelWidth={aiPanelWidth}
          onCopySelectedSentence={copySelectedSentence}
          onLanguageChange={handleLanguageChange}
          onAskAI={askAI}
          onDepictAI={depictAI}
          hasSelection={selectedParagraphIndex !== null && selectedSentenceIndex !== null}
          isAnyLoading={isAnyLoading}
        />

      </main>
    </div>
  );
}