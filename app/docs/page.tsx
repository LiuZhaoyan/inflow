import Link from 'next/link';
import type { ReactNode } from 'react';
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
} from 'lucide-react';

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
      icon: <Sparkles className="text-blue-600" size={18} />,
      description: '用最少的步骤开始阅读与习得。',
      content: (
        <div className="space-y-3">
          <p>
            Inflow 的目标是让你通过<strong>可理解输入</strong>（Comprehensible Input）进行语言习得：你阅读真实内容，遇到不懂的
            部分点击查看解释，并继续沉浸在目标语言里。
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>上传一本书/一篇文章（TXT / PDF / EPUB）。</li>
            <li>打开阅读页，按句子阅读。</li>
            <li>遇到不理解的词/短语，点击获取解释（尽量保持目标语言解释）。</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'uploading-content',
      title: 'Uploading Content',
      icon: <Upload className="text-blue-600" size={18} />,
      description: '把你想读的材料导入到 Library。',
      content: (
        <div className="space-y-3">
          <p>
            在首页的 <strong>Upload</strong> 区域拖拽或选择文件上传。上传后内容会被分句，出现在 <strong>Your Library</strong>。
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>建议从你“能大致看懂”的内容开始，这样更符合 i+1。</li>
            <li>如果文本太难，你会频繁中断查词，沉浸感会被破坏。</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'reading-and-explanations',
      title: 'Reading & Explanations',
      icon: <MousePointerClick className="text-blue-600" size={18} />,
      description: '阅读时的点击解释，是“保持可理解”的关键。',
      content: (
        <div className="space-y-3">
          <p>
            Inflow 鼓励你优先理解<strong>含义</strong>而不是死记：当你点击某个词或短语时，我们会结合上下文给出简短解释，帮助你
            在不离开语境的情况下继续阅读。
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>上下文优先</strong>：同一个词在不同句子里可能意思不同。
            </li>
            <li>
              <strong>短解释</strong>：解释越长越像“上课”，越容易让你脱离阅读状态。
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'difficulty-and-i-plus-one',
      title: 'Difficulty & i+1',
      icon: <Layers className="text-blue-600" size={18} />,
      description: '选择“刚刚好”的难度，学习效率最高。',
      content: (
        <div className="space-y-3">
          <p>
            Stephen Krashen 的 i+1 理论认为：当输入略高于你现有水平时（i+1），你最容易在真实语境中吸收新的词汇与结构。
          </p>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <Brain className="text-blue-600 mt-0.5" size={18} />
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">快速自测：这篇内容是否适合？</div>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>你能理解 70%~90% 的意思（即使不认识所有词）。</li>
                  <li>你会偶尔停下来点击解释，而不是每一句都要查。</li>
                  <li>你能“继续读下去”，而不是频繁失去耐心。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'philosophy',
      title: 'Project Philosophy',
      icon: <Lightbulb className="text-blue-600" size={18} />,
      description: 'Acquire language, don’t memorize it.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-900 font-semibold">
            Acquire language,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              don&apos;t memorize it.
            </span>
          </p>
          <p>
            我们把“习得”放在第一位：你通过<strong>大量可理解输入</strong>，在真实语境中反复遇到同样的表达，逐渐形成直觉。记忆会发生，
            但它是副产物，而不是任务本身。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                <Target className="text-blue-600" size={18} />
                Keep immersion
              </div>
              <p className="text-gray-700">
                点击解释尽量用目标语言表达，减少“翻译腔”，让你保持在目标语言环境中思考。
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                <Sparkles className="text-blue-600" size={18} />
                Prefer meaning over rules
              </div>
              <p className="text-gray-700">
                我们优先解释“这句话在这里什么意思”，而不是抽象语法讲解；理解稳定后，语法会自然内化。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'roadmap',
      title: 'Roadmap',
      icon: <Rocket className="text-blue-600" size={18} />,
      description: '接下来会逐步把简介迁移进更完整的文档系统。',
      content: (
        <div className="space-y-3">
          <ul className="list-disc list-inside space-y-2">
            <li>更完整的 Docs 信息架构（多页面：/docs/...）。</li>
            <li>更强的阅读标注与生词管理（不打断阅读）。</li>
            <li>更细粒度的“难度控制”：按段落/句子自动调节解释风格。</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      icon: <Shield className="text-blue-600" size={18} />,
      description: '你上传的内容如何被处理？',
      content: (
        <div className="space-y-3">
          <p>
            目前项目处于早期阶段，功能会快速迭代。你可以把这里当作一个“透明说明”的开始：我们会逐步补齐更完整的隐私与数据处理文档。
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>上传的文本会被解析与分句，用于阅读体验。</li>
            <li>当你请求解释/描写时，内容可能会被发送到 AI 接口以生成解释。</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="px-6 py-6 w-full flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-900 hover:text-blue-700 transition-colors"
        >
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <BookOpen size={20} />
          </div>
          Inflow
        </Link>
        <nav className="text-sm text-gray-500 font-medium">
          <span>Beta v0.1</span>
        </nav>
      </header>

      <main className="w-full px-6 pb-20">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>

        {/* Header / Intro */}
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Inflow Documentation
          </h1>
        </section>

        {/* Mobile TOC */}
        <details className="lg:hidden mb-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer select-none font-semibold text-gray-900">
            Table of contents
          </summary>
          <div className="mt-4 space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {s.icon}
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Table of contents
                </div>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <span className="opacity-90 group-hover:opacity-100">{s.icon}</span>
                      <span className="font-medium">{s.title}</span>
                    </a>
                  ))}
                </nav>
              </div>

            </div>
          </aside>

          {/* Content */}
          <div className="space-y-6">
            {sections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      {s.icon}
                      {s.title}
                    </h2>
                    {s.description && (
                      <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                    )}
                  </div>
                  <a
                    href={`#${s.id}`}
                    className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label={`Link to ${s.title}`}
                  >
                    #{s.id}
                  </a>
                </div>

                <div className="prose prose-gray max-w-none prose-p:leading-relaxed prose-li:leading-relaxed">
                  {s.content}
                </div>
              </section>
            ))}

            <section className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Start Learning
                <ArrowLeft size={18} className="rotate-180" />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}


