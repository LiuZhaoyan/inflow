import Link from 'next/link';

export default function VocabularyHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
        >
          <img src="/icon.svg" alt="Inflow" className="h-6 w-6" />
          Inflow
        </Link>
        <nav className="text-sm text-gray-500 font-medium">
          <span>Beta v0.1</span>
        </nav>
      </div>
    </header>
  );
}
