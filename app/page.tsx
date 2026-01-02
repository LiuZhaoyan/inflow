import Link from 'next/link';
import { BookOpen, Sparkles, Brain, ArrowRight, BarChart, Info } from 'lucide-react';
import { getBooks } from '@/lib/db';
import UploadArea from '@/components/UploadArea';

export default async function Home() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      
      {/* 1. Header: 极其简单，只保留 Logo */}
      <header className="px-6 py-6 max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <BookOpen size={20} />
          </div>
          Inflow
        </div>
        <nav className="text-sm text-gray-500 font-medium">
          {/* 这里预留位置，暂时不放复杂菜单 */}
          <span>Beta v0.1</span>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        
        {/* 2. Hero Section: 强调理念，弱化装饰 */}
        <section className="py-16 md:py-24 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={12} />
            Comprehensible Input
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Acquire language, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              don't memorize it.
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
            Immerse yourself in stories slightly above your level. 
            Click to translate contextually. Master vocabulary naturally.
          </p>
          <Link 
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Info size={18} />
            Learn about our philosophy
            <ArrowRight size={18} />
          </Link>
        </section>

        {/* 3. Library Grid: 核心功能区 */}
        <section>
          <UploadArea />
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="text-gray-400" size={24} />
              Your Library
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => (
              <Link 
                key={book.id} 
                href={`/read/${book.id}`}
                className="group relative bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col items-start"
              >
                {/* 难度标签 */}
                <span className={`
                  mb-4 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide
                  ${book.level === 'Beginner' ? 'bg-green-100 text-green-700' : ''}
                  ${book.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${book.level === 'Advanced' ? 'bg-red-100 text-red-700' : ''}
                  ${!['Beginner', 'Intermediate', 'Advanced'].includes(book.level) ? 'bg-gray-100 text-gray-700' : ''}
                `}>
                  {book.level}
                </span>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {book.title}
                </h3>
                
                {/* 预览文本 (取前两句) */}
                <p className="text-gray-500 text-sm line-clamp-3 mb-6 leading-relaxed">
                  {book.preview?.join(' ') || book.chapters?.[0]?.content.slice(0, 2).join(' ') || "No preview available"}...
                </p>

                <div className="mt-auto w-full flex items-center justify-between border-t border-gray-50 pt-4">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <BarChart size={12} />
                    {book.metadata?.sentenceCount || book.chapters?.reduce((acc, c) => acc + c.content.length, 0) || 0} Sentences
                  </span>
                  <span className="text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read Now <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}

            {/* Placeholder Card (模拟更多内容) */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 gap-2 min-h-[200px]">
              <span className="text-sm font-medium">More books coming soon</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
