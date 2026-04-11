import Link from "next/link";
import Header from "@/components/Header";
import SectionTitle from "@/components/SectionTitle";

const usageGuides = [
  {
    title: "Learn Chat：按掌握度推进句子学习",
    steps: [
      "进入 Learn Chat 后，先完成基础画像与分级。",
      "系统会根据你的掌握情况动态给出下一句（尽量保持可理解但有新信息）。",
      "对当前句子使用 Explain / Translate / Understand，立刻补足理解缺口。",
      "把已掌握句子沉淀到历史中，持续形成“理解 -> 吸收 -> 下一句”的节奏。",
    ],
  },
  {
    title: "Vocabulary：用闪卡巩固，并用词汇生成故事",
    steps: [
      "在词汇页用 flash card 方式复习，优先处理高频与易混词。",
      "按语言筛选，集中攻克当前学习目标。",
      "勾选词汇后生成故事，把离散单词放回可理解语境里。",
      "配合音频与图像功能做多模态复现，提升长期记忆稳定性。",
    ],
  },
];

const coreIdeas = [
  "核心不是“背单词数量”，而是持续获得可理解输入。",
  "学习闭环是 词 -> 句 -> 段：词汇巩固服务于句子理解，句子理解服务于真实内容输入。",
  "AI 的职责是“搭桥”而不是“替代学习”：在你快要不懂时提供最小但足够的解释。",
  "难度应随表现动态调整，让输入长期处于“可懂但有挑战”的区间。",
];

export default function DocsPage() {
  return (
    <div className="page-surface page-surface-reading text-[var(--foreground)] selection:bg-[#f1d6bd] selection:text-[#2d231c]">
      <Header rightText="Docs" />

      <main className="w-full px-6 lg:px-12 pb-20">
        <div className="mx-auto max-w-4xl reveal-up">
          <SectionTitle
            eyebrow="Documentation"
            title="Inflow"
            highlight="使用说明"
            description="这是一款 AI 驱动的可理解输入学习工具。"
          />
        </div>

        <section className="mx-auto max-w-4xl space-y-6">
          <article className="paper-card-soft p-6 md:p-8 reveal-up stagger-1">
            <h2 className="paper-title text-2xl">使用说明</h2>
            <div className="mt-5 grid gap-5">
              {usageGuides.map((guide) => (
                <div key={guide.title} className="paper-panel-flat border border-[var(--line-0)] p-5 md:p-6">
                  <h3 className="paper-title text-xl">{guide.title}</h3>
                  <ol className="mt-3 space-y-2 text-[var(--ink-2)] list-decimal pl-5">
                    {guide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </article>

          <article className="paper-card-soft p-6 md:p-8 reveal-up stagger-2">
            <h2 className="paper-title text-2xl">项目核心观点</h2>
            <ul className="mt-4 space-y-3 text-[var(--ink-2)]">
              {coreIdeas.map((idea) => (
                <li key={idea} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent-0)] shrink-0" />
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </article>

        </section>
      </main>
    </div>
  );
}
