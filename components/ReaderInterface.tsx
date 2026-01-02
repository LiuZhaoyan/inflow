"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, MessageSquare, Search, Image as ImageIcon, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LANGUAGE_OPTIONS, LanguageCode, normalizeLanguageCode, resolveLanguageLabel } from '@/lib/language';

interface ReaderProps {
  bookId: string;
  chapters: { title: string; content: string[] }[];
  initialLanguage?: string | null;
}

const LANGUAGE_SELECT_OPTIONS: { value: LanguageCode; label: string }[] = [
  { value: 'auto', label: 'Auto (match text)' },
  ...LANGUAGE_OPTIONS,
];

function sanitizeSentences(sentences: string[], chapterTitle?: string): string[] {
  const titleLower = (chapterTitle || '').trim().toLowerCase();
  const cleaned = sentences
    .map(s => (s ?? '').trim())
    .filter(Boolean)
    // common separators / markers from some EPUBs
    .filter(s => s !== '***' && s !== '* END *' && s !== 'END' && s !== '*** * END * ***');

  // If the chapter repeats its title as the first line, drop it to reduce noise.
  if (cleaned.length > 0 && titleLower && cleaned[0].toLowerCase() === titleLower) {
    return cleaned.slice(1);
  }

  return cleaned;
}

function pickBodyChapters(chapters: { title: string; content: string[] }[]) {
  const normalized = chapters.map(c => ({
    title: c.title?.trim() || 'Untitled',
    content: sanitizeSentences(c.content || [], c.title),
  }));

  // Heuristic 1 (strong): If the book has explicit "Chapter N" chapters, treat only those as正文.
  const chapterNumberRe = /^\s*chapter\s+\d+\s*$/i;
  const numbered = normalized.filter(c => chapterNumberRe.test(c.title));
  if (numbered.length >= 3) return numbered; // avoid false positives on random headings

  // Heuristic 2 (fallback): filter out common front-matter/metadata sections
  const noiseTitleRe = /(contents|table of contents|copyright|isbn|publisher|preface|foreword|about|introduction|title page)/i;
  return normalized.filter(c => {
    if (!c.content?.length) return false;
    if (noiseTitleRe.test(c.title)) return false;
    // very short sections are usually not body
    if (c.content.length < 10) return false;
    return true;
  });
}

function flatIndexToPosition(flatIndex: number, chapters: { title: string; content: string[] }[]) {
  let idx = Math.max(0, flatIndex);
  for (let c = 0; c < chapters.length; c++) {
    const len = chapters[c].content.length;
    if (idx < len) return { chapterIndex: c, sentenceIndex: idx };
    idx -= len;
  }
  // fallback to last sentence of last chapter
  const lastChapterIndex = Math.max(0, chapters.length - 1);
  const lastSentenceIndex = Math.max(0, (chapters[lastChapterIndex]?.content.length || 1) - 1);
  return { chapterIndex: lastChapterIndex, sentenceIndex: lastSentenceIndex };
}

export default function ReaderInterface({ bookId, chapters, initialLanguage }: ReaderProps) {
  const bodyChapters = useMemo(() => pickBodyChapters(chapters), [chapters]);

  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
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
      setSelectedSentenceIndex(pos.sentenceIndex);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const c = typeof parsed?.chapterIndex === 'number' ? parsed.chapterIndex : 0;
      const s = typeof parsed?.sentenceIndex === 'number' ? parsed.sentenceIndex : null;
      setSelectedChapterIndex(Math.min(Math.max(0, c), Math.max(0, bodyChapters.length - 1)));
      setSelectedSentenceIndex(s);
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
    if (selectedSentenceIndex === null) return;
    localStorage.setItem(
      `progress-${bookId}`,
      JSON.stringify({ chapterIndex: selectedChapterIndex, sentenceIndex: selectedSentenceIndex })
    );
  }, [selectedSentenceIndex, selectedChapterIndex, bookId]);

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
    sentenceIndex: number,
    languageOverride?: LanguageCode
  ) => {
    if (isLoadingImage) return; // don't compete with image generation

    const currentChapter = bodyChapters[chapterIndex];
    const currentSentence = currentChapter?.content[sentenceIndex] || '';
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
      const prevContext = (currentChapter?.content || [])
        .slice(Math.max(0, sentenceIndex - 2), sentenceIndex)
        .join(" ");
      const languageForRequest = languageOverride ?? selectedLanguage;

      // Debug aid: verify what we actually send to the API.
      // (This is the fastest way to disprove "cached previous book content".)
      console.debug('[ai-explain] request', {
        bookId,
        chapterIndex,
        chapterTitle: currentChapter?.title,
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
      if (selectedSentenceIndex !== sentenceIndex) return;

      setAiExplanation(data.explanation);
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error(error);
      // Only apply error if still latest and selection still matches.
      if (reqId !== aiRequestSeqRef.current) return;
      if (selectedChapterIndex !== chapterIndex) return;
      if (selectedSentenceIndex !== sentenceIndex) return;
      setAiExplanation(error.message || "Sorry, I couldn't reach the AI teacher right now.");
    } finally {
      if (reqId === aiRequestSeqRef.current) setIsLoadingAI(false);
    }
  };

  // Handle Selection Change
  const handleSentenceClick = (index: number) => {
    const shouldAutoRefreshExplain = isLoadingAI || aiExplanation !== null;

    // switching sentence invalidates any in-flight explain request
    abortAIExplain();
    setIsLoadingAI(false);

    setSelectedSentenceIndex(index);
    setGeneratedImage(null);
    setAiExplanation(null);

    // If the user was already using "Explain", refresh for the new sentence automatically.
    if (shouldAutoRefreshExplain) {
      // Use explicit indices to avoid races with state updates.
      void fetchAIExplanation(selectedChapterIndex, index, selectedLanguage);
    }
  };

  // 3. AI Explain Function 
  const askAI = async () => {
    if (isAnyLoading || selectedSentenceIndex === null) return;
    await fetchAIExplanation(selectedChapterIndex, selectedSentenceIndex, selectedLanguage);
  };

  // 4. AI Depict Function 
  const depictAI = async () => {
    if (isAnyLoading || selectedSentenceIndex === null) return;

    // Depict is a different mode; cancel any in-flight explain request.
    abortAIExplain();
    setIsLoadingImage(true);
    setGeneratedImage(null);
    setAiExplanation(null); // Clear previous explanation if any
    
    try {
      const currentChapter = bodyChapters[selectedChapterIndex];
      const currentSentence = currentChapter?.content[selectedSentenceIndex] || '';
      const res = await fetch('/api/ai-depict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentSentence,
        }),
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
    selectedSentenceIndex === null
      ? null
      : (bodyChapters[selectedChapterIndex]?.content?.[selectedSentenceIndex] || null);
  const chapterNavWidthClass = isChapterNavCollapsed ? 'w-12' : 'w-52'; // 48px vs 208px
  const detectedLanguageLabel = resolveLanguageLabel(normalizedInitialLanguage);

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
    if (selectedSentenceIndex !== null) {
      void fetchAIExplanation(selectedChapterIndex, selectedSentenceIndex, normalized);
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

        {/* Desktop Chapters Sidebar (scrolls with page) */}
        <nav
          className={`hidden lg:flex bg-white border border-gray-100 shadow-sm overflow-hidden flex-col ${chapterNavWidthClass} rounded-2xl`}
          aria-label="Chapters"
        >
          <div className={`border-b border-gray-100 bg-gray-50 flex items-center gap-2 ${isChapterNavCollapsed ? 'px-2 py-2' : 'px-3 py-3'}`}>
            <button
              onClick={() => setIsChapterNavCollapsed(v => !v)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
              title={isChapterNavCollapsed ? 'Expand chapters' : 'Collapse chapters'}
              aria-label={isChapterNavCollapsed ? 'Expand chapters' : 'Collapse chapters'}
            >
              {isChapterNavCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            {!isChapterNavCollapsed && (
              <div className="text-sm font-semibold text-gray-600">Chapters</div>
            )}

            {/* When collapsed, show current chapter next to the toggle without consuming layout width */}
            {isChapterNavCollapsed && (
              <div className="relative">
                <div className="absolute left-10 top-1/2 -translate-y-1/2">
                  <div className="max-w-56 bg-white/95 backdrop-blur px-2 py-1 rounded-full border border-gray-200 shadow-sm text-xs font-semibold text-gray-700 truncate">
                    {currentChapterTitle}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isChapterNavCollapsed && (
            <div className="p-2">
              {bodyChapters.length === 0 ? (
                <div className="text-sm text-gray-500 px-2 py-2">No chapters</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {bodyChapters.map((c, idx) => {
                    const active = idx === selectedChapterIndex;
                    return (
                      <button
                        key={`${c.title}-${idx}`}
                        onClick={() => {
                          abortAIExplain();
                          setIsLoadingAI(false);
                          setSelectedChapterIndex(idx);
                          setSelectedSentenceIndex(null);
                          setAiExplanation(null);
                          setGeneratedImage(null);
                        }}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition border
                          ${active
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'}
                        `}
                        title={c.title}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-200'}`} />
                          <span className="truncate">{c.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* LEFT: Reader (mobile includes an inline chapter list) */}
        <div className="flex-1 min-w-0">
          {/* Mobile Chapters (no fixed nav) */}
          <nav className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-700">
              Chapters
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {bodyChapters.length === 0 ? (
                <div className="text-sm text-gray-500 px-2 py-2">No chapters</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {bodyChapters.map((c, idx) => {
                    const active = idx === selectedChapterIndex;
                    return (
                      <button
                        key={`${c.title}-${idx}`}
                        onClick={() => {
                          abortAIExplain();
                          setIsLoadingAI(false);
                          setSelectedChapterIndex(idx);
                          setSelectedSentenceIndex(null);
                          setAiExplanation(null);
                          setGeneratedImage(null);
                        }}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition border
                          ${active
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-white text-gray-700 border-transparent hover:bg-gray-50 hover:border-gray-200'}
                        `}
                        title={c.title}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-1.5 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-200'}`} />
                          <span className="truncate">{c.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

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
                  {(bodyChapters[selectedChapterIndex]?.content || []).map((sentence, index) => (
                    <React.Fragment key={index}>
                      <span
                        onClick={() => handleSentenceClick(index)}
                        className={`
                          cursor-pointer transition-colors duration-200 py-1 px-0.5 rounded select-none
                          ${selectedSentenceIndex === index 
                            ? 'bg-blue-100 text-blue-900 font-semibold border-b-2 border-blue-400' 
                            : 'hover:bg-slate-100 hover:text-gray-900'}
                        `}
                      >
                        {sentence}
                      </span>
                      {" "}
                    </React.Fragment>
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
              // only left button
              if (e.button !== 0) return;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              startResize(e.clientX);
            }}
            className="
              w-2 -mx-1 cursor-col-resize
              flex items-center justify-center
              group select-none
            "
          >
            <div className="h-full w-[2px] rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors" />
          </div>
        </div>

        {/* RIGHT COLUMN: AI Sidebar */}
        <aside
          className="w-full shrink-0"
          // min(100%, Xpx) keeps mobile full-width while allowing a fixed px width on desktop
          style={{ width: `min(100%, ${aiPanelWidth}px)` }}
        >
          <div className="sticky top-28 space-y-4">
            
            {/* AI Control Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-[520px] lg:h-[calc(100vh-8rem)]">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MessageSquare size={16} />
                  AI Assistant
                </div>
                <button
                  type="button"
                  onClick={copySelectedSentence}
                  disabled={!selectedSentenceText}
                  className={`
                    mt-2 w-full text-left text-xs leading-relaxed
                    ${selectedSentenceText ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400'}
                  `}
                  title={selectedSentenceText ? 'Click to copy selected sentence' : 'Select a sentence to enable'}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-gray-500 shrink-0">Selected:</span>
                    {didCopySelection && (
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200">
                        Copied
                      </span>
                    )}
                  </div>
                  <div className={`mt-1 whitespace-normal break-words ${selectedSentenceText ? 'text-gray-700' : 'text-gray-400'}`}>
                    {selectedSentenceText ?? 'None'}
                  </div>
                </button>
              </div>
              
              <div className="p-5 flex flex-col h-full overflow-hidden">
                
                {/* Language Selector */}
                <div className="mb-4 flex flex-col gap-1 shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold tracking-wide">
                    <span>Explanation language</span>
                    {normalizedInitialLanguage !== 'auto' && (
                      <span className="text-[10px] font-normal text-gray-400">
                        Detected: {detectedLanguageLabel}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {LANGUAGE_SELECT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      ▼
                    </span>
                  </div>
                </div>

                {/* Buttons Container */}
                <div className="flex gap-3 mb-6 shrink-0">
                  {/* Explain Button */}
                  <button
                    onClick={askAI}
                    disabled={selectedSentenceIndex === null || isAnyLoading}
                    className={`
                      flex-1 py-3 px-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
                      ${selectedSentenceIndex === null || isAnyLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow hover:shadow-md active:scale-95'}
                    `}
                  >
                    {isLoadingAI ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    Explain
                  </button>

                  {/* Depict Button */}
                  <button
                    onClick={depictAI}
                    disabled={selectedSentenceIndex === null || isAnyLoading}
                    className={`
                      flex-1 py-3 px-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
                      ${selectedSentenceIndex === null || isAnyLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow hover:shadow-md active:scale-95'}
                    `}
                  >
                    {isLoadingImage ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ImageIcon size={16} />
                    )}
                    Depict
                  </button>
                </div>

                {/* Output Area  */}
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence mode="wait">
                    {/* Case 1: Loading State */}
                    {isAnyLoading ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center text-center space-y-3 pt-10 h-full"
                      >
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500 font-medium animate-pulse">
                          {isLoadingAI ? "Consulting teacher..." : "Generating visualization..."}
                        </p>
                      </motion.div>
                    ) : aiExplanation ? (
                      // Case 2: Text Explanation Result
                      <motion.div
                        key="explanation"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-100"
                      >
                        <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                          Insight
                        </div>
                        <p className="text-gray-800 leading-relaxed text-sm">
                          {aiExplanation}
                        </p>
                      </motion.div>
                    ) : generatedImage ? (
                      // Case 3: Image Result
                      <motion.div
                        key="image"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-2"
                      >
                        <div className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2 px-1">
                          Visualization
                        </div>
                        <div className="rounded-lg overflow-hidden border border-purple-100 shadow-sm bg-gray-100 relative min-h-[200px]">
                          {/* 使用 next/image 需要配置域名，这里暂时用 img 标签演示 */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={generatedImage} 
                            alt="AI generated depiction of the text"
                            className="w-full h-auto object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-2">
                          AI-generated image based on selection.
                        </p>
                      </motion.div>
                    ) : (
                      // Case 4: Empty State
                      <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center text-center text-gray-400 p-4 pt-8 h-full"
                      >
                        <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-sm">
                          Select a sentence, then choose to <br/>
                          <strong>Explain</strong> or <strong>Depict</strong> it.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-2xl border border-yellow-100">
              <strong>Tip:</strong> "Depict" works best on descriptive sentences.
            </div>

          </div>
        </aside>

      </main>
    </div>
  );
}