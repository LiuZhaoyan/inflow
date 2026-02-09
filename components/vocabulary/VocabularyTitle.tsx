import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface VocabularyTitleProps {
  title: string;
  highlight: string;
}

export default function VocabularyTitle({ title, highlight }: VocabularyTitleProps) {
  return (
    <div>
      <Link
        href="/"
        className="group mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        Back to Home
      </Link>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
        {title}
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          {highlight}
        </span>
      </h1>
    </div>
  );
}
