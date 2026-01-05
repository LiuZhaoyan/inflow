'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Sparkles,
  Brain,
  Lightbulb,
  Target,
  Upload,
  MousePointerClick,
  Layers,
  Rocket,
  Shield,
  Info,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';


const Callout = ({
  children,
  type = 'info',
  title,
}: {
  children: ReactNode;
  type?: 'info' | 'tip' | 'warning';
  title?: string;
}) => {
  const styles = {
    info: 'bg-blue-50 border-blue-100 text-blue-900',
    tip: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    warning: 'bg-amber-50 border-amber-100 text-amber-900',
  };
  const icon = {
    info: <Info size={18} className="text-blue-600 mt-0.5" />,
    tip: <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />,
    warning: <AlertCircle size={18} className="text-amber-600 mt-0.5" />,
  };

  return (
    <div className={`my-4 rounded-xl border p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        {icon[type]}
        <div className="space-y-1">
          {title && <div className="font-semibold">{title}</div>}
          <div className="text-sm leading-relaxed opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
};

const StepItem = ({ number, title, children }: { number: number; title: string; children: ReactNode }) => (
  <div className="relative pl-8 pb-8 last:pb-0">
    <div className="absolute left-[11px] top-8 bottom-0 w-px bg-gray-200 last:hidden"></div>
    <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 ring-4 ring-white">
      {number}
    </div>
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <div className="text-gray-600">{children}</div>
    </div>
  </div>
);

type DocSection = {
  id: string;
  title: string;
  icon: ReactNode;
  description?: string;
  content: ReactNode;
};

export default function DocsHome() {
  const sections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Sparkles className="text-blue-600" size={20} />,
      description: 'Just three simple steps to start your acquisition journey.',
      content: (
        <div className="mt-4">
          <p className="mb-6 text-gray-600">
            Inflow's goal is to let you acquire language through <strong>Comprehensible Input</strong>.
            You don't need to memorize vocabulary lists, just read, understand, and keep reading.
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <StepItem number={1} title="Upload Content">
              Supports PDF, EPUB, TXT formats. It is recommended to start with materials that interest you and are of moderate difficulty.
            </StepItem>
            <StepItem number={2} title="Immersive Reading">
              Open the reading page, and the system will automatically segment the text by sentences. Focus on the content itself.
            </StepItem>
            <StepItem number={3} title="Explain on Demand">
              Encounter something you don't understand? Click it. AI will provide an explanation based on the <strong>current context</strong>, rather than a rigid dictionary definition.
            </StepItem>
          </div>
        </div>
      ),
    },
    {
      id: 'reading-and-explanations',
      title: 'Reading & Explanations',
      icon: <MousePointerClick className="text-blue-600" size={20} />,
      description: 'Clicking for explanation is the key mechanism to "keep it comprehensible".',
      content: (
        <div className="space-y-4">
          <p>
            Inflow encourages you to prioritize understanding <strong>meaning</strong> over rote memorization. When you click on a word or phrase, we provide a short explanation combined with the context.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">Context First</h4>
              <p className="text-sm text-gray-600">The same word can mean completely different things in different sentences. We only explain the "current meaning".</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">Minimalist Explanation</h4>
              <p className="text-sm text-gray-600">Long explanations feel like "class", which can easily take you out of the reading state. We strive to be short and to the point.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'difficulty-and-i-plus-one',
      title: 'Difficulty & i+1',
      icon: <Layers className="text-blue-600" size={20} />,
      description: 'Understand Stephen Krashen\'s core theory.',
      content: (
        <div className="space-y-4">
          <p>
            When the input is slightly above your current level (i+1), you are most likely to absorb new vocabulary and structures in a real context.
          </p>
          <Callout type="info" title="Quick Self-Test: Is this content suitable?">
            <ul className="list-disc list-inside space-y-1">
              <li>You can understand <strong>70%~90%</strong> of the meaning (even if you don't know every word).</li>
              <li>You stop occasionally to click for explanations, rather than looking up every sentence.</li>
              <li>You can "keep reading" without frequently losing patience.</li>
            </ul>
          </Callout>
        </div>
      ),
    },
    {
      id: 'philosophy',
      title: 'Project Philosophy',
      icon: <Lightbulb className="text-blue-600" size={20} />,
      description: 'Acquire language, don’t memorize it.',
      content: (
        <div className="space-y-6">
          <div className="text-center py-6">
            <p className="text-2xl font-serif text-gray-800 italic">
              &quot;Acquire language,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold not-italic">
                don&apos;t memorize it.
              </span>&quot;
            </p>
          </div>
          <p>
            We put "acquisition" first: you gradually form intuition by encountering the same expressions repeatedly in real contexts through <strong>massive comprehensible input</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-semibold text-blue-900 mb-2">
                <Target className="text-blue-600" size={18} />
                Keep Immersion
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Explanations should try to use the target language to reduce "translationese", allowing you to keep thinking in the target language environment.
              </p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-semibold text-purple-900 mb-2">
                <Sparkles className="text-purple-600" size={18} />
                Meaning over Rules
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Prioritize explaining "what this sentence means here" rather than abstract grammar lectures; once understanding is stable, grammar will naturally internalize.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'advice-for-beginners',
      title: 'Advice For Beginner',
      icon: <GraduationCap className="text-blue-600" size={20} />,
      description: 'Introductory advice for language learners based on Comprehensible Input Theory.',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            If this is your first time trying to master a language through "acquisition" rather than "learning", the following advice can help you avoid detours:
          </p>
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
              <h4 className="font-semibold text-blue-900 mb-2">1. Tolerate Ambiguity</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Don't try to understand every single word. If a word you don't know doesn't affect your understanding of the general idea, <strong>skip it</strong>. Only click for an explanation when you feel it appears repeatedly and hinders understanding.
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">2. Start Simple</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Don't start with classics. Children's books, graded readers, or books you have already read in your native language are the best starting materials. You need <strong>i+1</strong> (slightly above current level), not i+10.
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">3. Quantity {'>'} Precision</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Reading 10 simple books is more useful than intensive reading of 1 difficult book. You need to "see" the word in different scenarios extensively, rather than digging into its 10 usages.
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">4. Consistency</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                15 minutes a day is more useful than 2 hours of cramming on weekends. The brain needs sleep to organize and internalize language patterns.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'guide-for-beginner',
      title: 'Guide For Beginner',
      icon: <Brain className="text-blue-600" size={20} />,
      description: 'How to start from scratch? A practical guide based on comprehensible input.',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            Based on Comprehensible Input (CI) theory, we have compiled an action guide for you to quickly get started with a new language.
          </p>
          
          <div className="space-y-8">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
                Find "Comprehensible" Materials (The Input)
              </h3>
              <p className="text-gray-600 mb-3">
                This is the most critical step. You need to find content where you can understand <strong>more than 80%</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                <li><strong>Zero/Beginner:</strong> Look for Graded Readers designed for learners, or children's picture books.</li>
                <li><strong>Elementary:</strong> Simple podcasts (Slow Podcast), YouTube tutorial videos (with subtitles).</li>
                <li><strong>Intermediate:</strong> Young adult novels, non-fiction articles of interest.</li>
              </ul>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
                Build "Sound-Meaning" Connection (Mapping)
              </h3>
              <p className="text-gray-600 mb-3">
                Language is primarily sound. While reading, try to listen as much as possible.
              </p>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-blue-900">
                  <strong>Inflow Tip:</strong> Even when reading, try to "play" the sound in your mind, or find audiobooks to accompany your reading.
                </p>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
                Don't Memorize, "Encounter" Words (Acquisition)
              </h3>
              <p className="text-gray-600">
                Mechanically memorized words are "dead". Only by repeatedly encountering the same word in different contexts can you truly master it.
                <br/>
                When you click a word in Inflow to see the explanation, <strong>don't try to remember it immediately</strong>. Keep reading. The next time you see it, you might click it again, until one day you suddenly realize: "Oh, I don't need to click, I know what it means." That is the moment acquisition happens.
              </p>
            </div>
            
             <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">4</span>
                Keep it Low Stress (Low Affective Filter)
              </h3>
              <p className="text-gray-600">
                Anxiety is the enemy of language acquisition. If reading gives you a headache or looking up words is too tiring, it means the material is too hard. <strong>Switch to a simpler book, or take a break.</strong> The brain is more willing to absorb new language when you are in a good mood.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      icon: <Shield className="text-blue-600" size={20} />,
      description: 'How is your uploaded content handled?',
      content: (
        <div className="space-y-3">
          <p>
            The project is currently in an early stage, and features will iterate quickly. This is the start of a "transparency statement":
          </p>
          <Callout type="warning">
            <ul className="list-disc list-inside space-y-1">
              <li>Uploaded text will be parsed and segmented for reading experience processing on the browser and server side.</li>
              <li>When you request an explanation/depiction, the relevant sentence will be sent to AI interfaces (such as OpenAI/Claude, etc.) to generate the explanation.</li>
            </ul>
          </Callout>
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState(sections[0].id);

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto w-full px-6 lg:px-12 flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
          >
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
              <BookOpen size={20} />
            </div>
            Inflow
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">Beta v0.1</span>
          </nav>
        </div>
      </header>

      <main className="w-full px-6 lg:px-12 pb-20 pt-10">
        <div className="mb-12 max-w-3xl">
          <Link href="/" className="group mb-6 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
          
          <h1 className="mb-6 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Documentation & <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Learning Guide
            </span>
          </h1>
        </div>

        {/* Mobile TOC */}
        <details className="lg:hidden mb-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm group">
          <summary className="cursor-pointer select-none font-semibold text-gray-900 flex items-center justify-between">
            Table of contents
            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-4 space-y-1 border-t border-gray-100 pt-3">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  // Optional: Close details after selection if desired, or let user close it.
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left ${
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.icon}
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 pl-3">
                On this page
              </div>
              <nav className="space-y-0.5 border-l border-gray-200">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`group flex w-full items-center gap-3 px-4 py-2 text-sm transition-all text-left ${
                      activeSection === s.id
                        ? 'border-l-2 border-blue-600 -ml-[2px] bg-blue-50/50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:border-l-2 hover:border-blue-600 hover:-ml-[2px] hover:bg-blue-50/50 hover:text-blue-700'
                    }`}
                  >
                    <span className={`transition-opacity scale-90 ${activeSection === s.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                      {s.icon}
                    </span>
                    <span className="font-medium">{s.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content Area */}
          <div className="space-y-12">
            {currentSection && (
              <section
                key={currentSection.id}
                id={currentSection.id}
                className="animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                    {currentSection.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {currentSection.title}
                  </h2>
                </div>
                
                {currentSection.description && (
                  <p className="mb-6 text-lg text-gray-500 leading-relaxed border-l-2 border-gray-100 pl-4">
                    {currentSection.description}
                  </p>
                )}

                <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-p:leading-7 prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl">
                  {currentSection.content}
                </div>
                
                <hr className="mt-12 border-gray-100" />
              </section>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
