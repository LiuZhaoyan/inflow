import Link from 'next/link';
import { BookOpen, Sparkles, ArrowRight, Info } from 'lucide-react';

export default function Home() {
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
              don&apos;t memorize it.
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
            Immerse yourself in stories slightly above your level. 
            Click to translate contextually. Master vocabulary naturally.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/user"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Enter your library
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Info size={18} />
              Learn about our philosophy
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
