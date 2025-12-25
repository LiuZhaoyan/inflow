"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, MessageSquare, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReaderProps {
  bookId: string;
  content: string[];
}

export default function ReaderInterface({ bookId, content }: ReaderProps) {
  // 状态改为记录“当前选中的句子索引”，默认为 null (未选中)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // 1. Progress Tracking: Load saved position (Optional: Restore last clicked sentence)
  useEffect(() => {
    const saved = localStorage.getItem(`progress-${bookId}`);
    if (saved) setSelectedIndex(parseInt(saved));
  }, [bookId]);

  // 2. Progress Tracking: Save position
  useEffect(() => {
    if (selectedIndex !== null) {
      localStorage.setItem(`progress-${bookId}`, selectedIndex.toString());
    }
  }, [selectedIndex, bookId]);

  // 3. AI Support Function
  const askAI = async () => {
    if (isLoadingAI || selectedIndex === null) return;

    setIsLoadingAI(true);
    setAiExplanation(null);
    
    try {
      const currentSentence = content[selectedIndex];
      // 获取上下文：当前选中句子的前两句
      const prevContext = content.slice(Math.max(0, selectedIndex - 2), selectedIndex).join(" ");

      const res = await fetch('/api/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: currentSentence, 
          context: prevContext,
          difficulty 
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      
      const data = await res.json();
      setAiExplanation(data.explanation);
    } catch (error) {
      console.error(error);
      setAiExplanation("Sorry, I couldn't reach the AI teacher right now.");
    } finally {
      setIsLoadingAI(false);
    }
  };

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
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: Document Flow Reader Area */}
        <div className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="prose prose-lg max-w-none text-gray-800 leading-loose font-serif">
            {content.map((sentence, index) => (
              <React.Fragment key={index}>
                <span
                  onClick={() => {
                    setSelectedIndex(index);
                    setAiExplanation(null); // Reset explanation when changing selection
                  }}
                  className={`
                    cursor-pointer transition-colors duration-200 py-1 px-0.5 rounded
                    ${selectedIndex === index 
                      ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-200 font-medium' 
                      : 'hover:bg-yellow-100 hover:text-gray-900'}
                  `}
                >
                  {sentence}
                </span>
                {/* Add a space between sentences so they don't collapse */}
                {" "}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Sidebar */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="sticky top-28 space-y-4">
            
            {/* AI Control Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-600">
                <MessageSquare size={16} />
                AI Assistant
              </div>
              
              <div className="p-5 flex flex-col h-full">
                
                {/* The "Explain" Button */}
                <button
                  onClick={askAI}
                  disabled={selectedIndex === null || isLoadingAI}
                  className={`
                    w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mb-6
                    ${selectedIndex === null 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95'}
                  `}
                >
                  {isLoadingAI ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search size={18} />
                      Explain Selected
                    </>
                  )}
                </button>

                {/* Explanation Output */}
                <div className="flex-grow">
                  <AnimatePresence mode="wait">
                    {isLoadingAI ? (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center text-center space-y-3 pt-4"
                      >
                        <p className="text-sm text-blue-600 font-medium animate-pulse">Consulting teacher...</p>
                      </motion.div>
                    ) : aiExplanation ? (
                      <motion.div
                        key="explanation"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-100"
                      >
                        <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                          Insight
                        </div>
                        <p className="text-gray-800 leading-relaxed text-sm">
                          {aiExplanation}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center text-center text-gray-400 p-4 pt-8"
                      >
                        <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-sm">
                          Click a sentence on the left,<br/>then click "Explain Selected".
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Hint Box (Optional UX improvement) */}
            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-100">
              <strong>Tip:</strong> Select sentences to highlight them. The AI uses the surrounding text to understand the context.
            </div>

          </div>
        </aside>

      </main>
    </div>
  );
}