import Link from 'next/link';
import { BookOpen, Sparkles, ArrowRight, Info } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      
      {/* 1. Header: 极其简单，只保留 Logo */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
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
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 pb-20">
        
        {/* 2. Hero Section: 强调理念，弱化装饰 */}
        <section className="py-16 md:py-24 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Acquire language, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              don&apos;t memorize it.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
            Immerse yourself in stories slightly above your level. 
            Click to translate contextually. Master vocabulary naturally.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/user"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
            >
              Enter your library
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-300 shadow-sm text-lg"
            >
              <Info size={20} />
              Learn the philosophy
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
             <h2 className="text-xl font-semibold text-gray-900 mb-4">New Features</h2>
             <div className="flex flex-col sm:flex-row gap-4">
                 <Link
                    href="/vocabulary"
                    className="group flex flex-col p-5 rounded-2xl bg-white border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 w-full sm:w-64"
                 >
                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                       <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">Vocabulary</h3>
                        <p className="text-sm text-gray-500">AI Flashcards & Stories</p>
                    </div>
                 </Link>
             </div>
          </div>
        </section>

      </main>
    </div>
  );
}
