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
      description: '只需简单的三步，开启你的习得之旅。',
      content: (
        <div className="mt-4">
          <p className="mb-6 text-gray-600">
            Inflow 的目标是让你通过<strong>可理解输入</strong>（Comprehensible Input）进行语言习得。
            你不需要背诵单词表，只需要阅读、理解、并继续阅读。
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <StepItem number={1} title="上传内容">
              支持 PDF, EPUB, TXT 格式。建议从你感兴趣且难度适中的材料开始。
            </StepItem>
            <StepItem number={2} title="沉浸阅读">
              打开阅读页，系统会自动将文本按句子切分。专注阅读内容本身。
            </StepItem>
            <StepItem number={3} title="按需解惑">
              遇到不懂的地方？点击它。AI 会根据<strong>当前上下文</strong>给出解释，而不是生硬的词典定义。
            </StepItem>
          </div>
        </div>
      ),
    },
    {
      id: 'reading-and-explanations',
      title: 'Reading & Explanations',
      icon: <MousePointerClick className="text-blue-600" size={20} />,
      description: '点击解释是“保持可理解”的关键机制。',
      content: (
        <div className="space-y-4">
          <p>
            Inflow 鼓励你优先理解<strong>含义</strong>而不是死记硬背。当你点击某个词或短语时，我们会结合上下文给出简短解释。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">上下文优先</h4>
              <p className="text-sm text-gray-600">同一个词在不同句子里意思可能完全不同。我们只解释“当下的含义”。</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">极简解释</h4>
              <p className="text-sm text-gray-600">解释越长越像“上课”，容易让你脱离阅读状态。我们力求简短、直击要害。</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'difficulty-and-i-plus-one',
      title: 'Difficulty & i+1',
      icon: <Layers className="text-blue-600" size={20} />,
      description: '理解 Stephen Krashen 的核心理论。',
      content: (
        <div className="space-y-4">
          <p>
            当输入略高于你现有水平时（i+1），你最容易在真实语境中吸收新的词汇与结构。
          </p>
          <Callout type="info" title="快速自测：这篇内容是否适合？">
            <ul className="list-disc list-inside space-y-1">
              <li>你能理解 <strong>70%~90%</strong> 的意思（即使不认识所有词）。</li>
              <li>你会偶尔停下来点击解释，而不是每一句都要查。</li>
              <li>你能“继续读下去”，而不是频繁失去耐心。</li>
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
            我们把“习得”放在第一位：你通过<strong>大量可理解输入</strong>，在真实语境中反复遇到同样的表达，逐渐形成直觉。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-semibold text-blue-900 mb-2">
                <Target className="text-blue-600" size={18} />
                Keep Immersion
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                点击解释尽量用目标语言表达，减少“翻译腔”，让你保持在目标语言环境中思考。
              </p>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-semibold text-purple-900 mb-2">
                <Sparkles className="text-purple-600" size={18} />
                Meaning over Rules
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                优先解释“这句话在这里什么意思”，而不是抽象语法讲解；理解稳定后，语法会自然内化。
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
      description: '为语言学习入门者提供基于 Comprehensible Input Theory 的入门建议。',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600">
            如果这是你第一次尝试通过“习得”而非“学习”来掌握一门语言，以下建议可以帮助你少走弯路：
          </p>
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
              <h4 className="font-semibold text-blue-900 mb-2">1. 忍受模糊 (Tolerate Ambiguity)</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                不要试图搞懂每一个单词。遇到不认识的词，如果它不影响你理解整句话的大意，<strong>请直接跳过</strong>。只有当你觉得它反复出现且阻碍理解时，再点击查看解释。
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">2. 从简单的开始</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                不要一开始就挑战名著。童书、分级读物、或者你已经读过中文版的书是最好的起步材料。你需要的是 <strong>i+1</strong>（略高于当前水平），而不是 i+10。
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">3. 数量 {'>'} 精度</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                读懂 10 本简单的书，比精读 1 本难懂的书更有用。你需要的是大量的“见过”这个词在不同场景下的样子，而不是深挖它的 10 种用法。
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-2">4. 保持一致性</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                每天 15 分钟比周末突击 2 小时更有用。大脑需要睡眠来整理和内化输入的语言模式。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'roadmap',
      title: 'Roadmap',
      icon: <Rocket className="text-blue-600" size={20} />,
      description: '未来的开发计划。',
      content: (
        <ul className="space-y-3">
          {[
            '更完整的 Docs 信息架构（多页面：/docs/...）。',
            '更强的阅读标注与生词管理（不打断阅读）。',
            '更细粒度的“难度控制”：按段落/句子自动调节解释风格。'
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      icon: <Shield className="text-blue-600" size={20} />,
      description: '你上传的内容如何被处理？',
      content: (
        <div className="space-y-3">
          <p>
            目前项目处于早期阶段，功能会快速迭代。这是一个“透明说明”的开始：
          </p>
          <Callout type="warning">
            <ul className="list-disc list-inside space-y-1">
              <li>上传的文本会被解析与分句，用于在浏览器端和服务器端处理阅读体验。</li>
              <li>当你请求解释/描写时，相关句子会被发送到 AI 接口（如 OpenAI/Claude 等）以生成解释。</li>
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
