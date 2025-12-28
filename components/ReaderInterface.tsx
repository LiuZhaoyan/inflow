"use client";

import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, MessageSquare, Search, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReaderProps {
  bookId: string;
  content: string[];
}

export default function ReaderInterface({ bookId, content }: ReaderProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  
  // Explanation States
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // Image Generation States (新增)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Helper to check if any loading is active
  const isAnyLoading = isLoadingAI || isLoadingImage;

  // Progress Tracking... (保持不变)
  useEffect(() => {
    const saved = localStorage.getItem(`progress-${bookId}`);
    if (saved) setSelectedIndex(parseInt(saved));
  }, [bookId]);

  useEffect(() => {
    if (selectedIndex !== null) {
      localStorage.setItem(`progress-${bookId}`, selectedIndex.toString());
    }
  }, [selectedIndex, bookId]);

  // Handle Selection Change
  const handleSentenceClick = (index: number) => {
    setSelectedIndex(index);
    // Reset results when changing selection
    setAiExplanation(null);
    setGeneratedImage(null);
  };

  // 3. AI Explain Function (修改：调用时清空图片结果)
  const askAI = async () => {
    if (isAnyLoading || selectedIndex === null) return;

    setIsLoadingAI(true);
    setAiExplanation(null);
    setGeneratedImage(null); // Clear previous image if any
    
    try {
      const currentSentence = content[selectedIndex];
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

      const data = await res.json().catch(() => ({})); 

      if (!res.ok) {
         throw new Error(data.error || 'API request failed');
      }
      
      setAiExplanation(data.explanation);
    } catch (error: any) {
      console.error(error);
      setAiExplanation(error.message || "Sorry, I couldn't reach the AI teacher right now.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // 4. AI Depict Function (新增：调用画图 API)
  const depictAI = async () => {
    if (isAnyLoading || selectedIndex === null) return;

    setIsLoadingImage(true);
    setGeneratedImage(null);
    setAiExplanation(null); // Clear previous explanation if any
    
    try {
      const currentSentence = content[selectedIndex];
      // 这里我们直接用当前句子作为 prompt，也可以加上上下文
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header (保持不变) */}
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
        
        {/* LEFT COLUMN: Document Flow Reader Area (保持不变) */}
        <div className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="prose prose-lg max-w-none text-gray-800 leading-loose font-serif pb-20">
            {content.map((sentence, index) => (
              <React.Fragment key={index}>
                <span
                  onClick={() => handleSentenceClick(index)}
                  className={`
                    cursor-pointer transition-colors duration-200 py-1 px-0.5 rounded select-none
                    ${selectedIndex === index 
                      ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-200 font-medium' 
                      : 'hover:bg-yellow-100 hover:text-gray-900'}
                  `}
                >
                  {sentence}
                </span>
                {" "}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Sidebar */}
        <aside className="w-full lg:w-96 shrink-0">
          <div className="sticky top-28 space-y-4">
            
            {/* AI Control Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-h-[400px] max-h-[calc(100vh-8rem)]">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-600">
                <MessageSquare size={16} />
                AI Assistant
              </div>
              
              <div className="p-5 flex flex-col h-full overflow-hidden">
                
                {/* Buttons Container (修改：改为 Flex Row 放置两个按钮) */}
                <div className="flex gap-3 mb-6 shrink-0">
                  {/* Explain Button */}
                  <button
                    onClick={askAI}
                    disabled={selectedIndex === null || isAnyLoading}
                    className={`
                      flex-1 py-3 px-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
                      ${selectedIndex === null || isAnyLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow hover:shadow-md active:scale-95'}
                    `}
                  >
                    <Search size={16} /> Explain
                  </button>

                  {/* Depict Button (新增) */}
                  <button
                    onClick={depictAI}
                    disabled={selectedIndex === null || isAnyLoading}
                    className={`
                      flex-1 py-3 px-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm
                      ${selectedIndex === null || isAnyLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow hover:shadow-md active:scale-95'}
                    `}
                  >
                    <ImageIcon size={16} /> Depict
                  </button>
                </div>

                {/* Output Area (修改：支持显示文本或图片) */}
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
                      // Case 3: Image Result (新增)
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
            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-100">
              <strong>Tip:</strong> "Depict" works best on descriptive sentences.
            </div>

          </div>
        </aside>

      </main>
    </div>
  );
}