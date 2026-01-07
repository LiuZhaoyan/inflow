import React from 'react';
import { MessageSquare, Search, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageCode } from '@/lib/language';

interface AISidebarProps {
  // State
  selectedSentenceText: string | null;
  selectedLanguage: LanguageCode;
  languageOptions: { value: LanguageCode; label: string }[];
  detectedLanguageLabel: string;
  showDetectedLanguage: boolean;
  aiExplanation: string | null;
  generatedImage: string | null;
  isLoadingAI: boolean;
  isLoadingImage: boolean;
  isAIDepictAvailable: boolean;
  didCopySelection: boolean;
  aiPanelWidth: number;
  pendingImageTaskId?: string | null;  // Background image task ID
  
  // Callbacks
  onCopySelectedSentence: () => void;
  onLanguageChange: (value: string) => void;
  onAskAI: () => void;
  onDepictAI: () => void;
  
  // Control
  hasSelection: boolean;
  isAnyLoading: boolean;  // only refers to AI explain loading
}

export function AISidebar({
  selectedSentenceText,
  selectedLanguage,
  languageOptions,
  detectedLanguageLabel,
  showDetectedLanguage,
  aiExplanation,
  generatedImage,
  isLoadingAI,
  isLoadingImage,
  isAIDepictAvailable,
  didCopySelection,
  aiPanelWidth,
  pendingImageTaskId,
  onCopySelectedSentence,
  onLanguageChange,
  onAskAI,
  onDepictAI,
  hasSelection,
  isAnyLoading,
}: AISidebarProps) {
  return (
    <aside
      className="w-full shrink-0"
      style={{ width: `min(100%, ${aiPanelWidth}px)` }}
    >
      <div className="sticky top-28 space-y-4">
        {/* AI Control Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-[520px] lg:h-[calc(100vh-8rem)]">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MessageSquare size={16} />
              AI Assistant
            </div>
            <button
              type="button"
              onClick={onCopySelectedSentence}
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

          {/* Body */}
          <div className="p-5 flex flex-col h-full overflow-hidden">
            {/* Language Selector */}
            <div className="mb-4 flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold tracking-wide">
                <span>Explanation language</span>
                {showDetectedLanguage && (
                  <span className="text-[10px] font-normal text-gray-400">
                    Detected: {detectedLanguageLabel}
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {languageOptions.map(option => (
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
              {/* Explain Button - only disabled during explain loading, NOT image loading */}
              <button
                onClick={onAskAI}
                disabled={!hasSelection || isAnyLoading}
                className={`
                  flex-1 py-3 px-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
                  ${!hasSelection || isAnyLoading
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

              {/* Depict Button - disabled only during image loading */}
              {isAIDepictAvailable && (
                <button
                  onClick={onDepictAI}
                  disabled={!hasSelection || isLoadingImage}
                  className={`
                    flex-1 py-3 px-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
                    ${!hasSelection || isLoadingImage
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
              )}
            </div>

            {/* Background Image Generation Indicator */}
            {isLoadingImage && !isLoadingAI && (
              <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-purple-600" />
                <span className="text-xs text-purple-700">Generating image in background...</span>
              </div>
            )}

            {/* Output Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
              <AnimatePresence mode="wait">
                {/* Case 1: AI Explain Loading State */}
                {isLoadingAI ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center space-y-3 pt-10 h-full"
                  >
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-500 font-medium animate-pulse">
                      Consulting teacher...
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
                      Select a sentence, then choose to <br />
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
  );
}
