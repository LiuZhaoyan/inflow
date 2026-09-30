import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { GenerationError, generatePassage, type GeneratePassageInput, type GeneratedPassage } from '../src/generation';

const cases: Array<{ id: string; purpose: string; input: GeneratePassageInput }> = [
  {
    id: '01-everyday-words',
    purpose: 'Five everyday targets with an optional topic.',
    input: {
      topic: '주말의 하루',
      targets: [
        { id: 'everyday-park', lemma: '공원', meaningZh: '公园', sourceSentence: '주말에는 집 근처 공원에 간다.' },
        { id: 'everyday-friend', lemma: '친구', meaningZh: '朋友', sourceSentence: '친구와 함께 영화를 봤다.' },
        { id: 'everyday-coffee', lemma: '커피', meaningZh: '咖啡', sourceSentence: '아침마다 커피를 마신다.' },
        { id: 'everyday-walk', lemma: '산책하다', meaningZh: '散步', sourceSentence: '저녁에 강가를 산책했다.' },
        { id: 'everyday-promise', lemma: '약속', meaningZh: '约定', sourceSentence: '내일 친구와 약속이 있다.' },
      ],
    },
  },
  {
    id: '02-korean-inflection',
    purpose: 'Mixed verbs, adjectives and a noun that need natural inflection.',
    input: {
      targets: [
        { id: 'inflection-walk', lemma: '걷다', meaningZh: '走路', sourceSentence: '매일 학교까지 걷는다.' },
        { id: 'inflection-cold', lemma: '춥다', meaningZh: '冷', sourceSentence: '오늘은 바람이 불어서 춥다.' },
        { id: 'inflection-wait', lemma: '기다리다', meaningZh: '等待', sourceSentence: '친구를 역 앞에서 기다렸다.' },
        { id: 'inflection-forget', lemma: '잊다', meaningZh: '忘记', sourceSentence: '중요한 약속을 잊지 말자.' },
        { id: 'inflection-warm', lemma: '따뜻하다', meaningZh: '温暖', sourceSentence: '봄바람이 따뜻하게 불었다.' },
        { id: 'inflection-meal', lemma: '먹다', meaningZh: '吃', sourceSentence: '점심으로 김밥을 먹었다.' },
      ],
    },
  },
  {
    id: '03-specified-senses',
    purpose: 'Ambiguous Korean forms with a source sentence specifying the intended sense.',
    input: {
      targets: [
        { id: 'sense-ship', lemma: '배', meaningZh: '船', sourceSentence: '큰 배가 항구를 떠났다.' },
        { id: 'sense-apology', lemma: '사과', meaningZh: '道歉', sourceSentence: '그는 약속을 잊은 일에 대해 사과했다.' },
        { id: 'sense-night', lemma: '밤', meaningZh: '夜晚', sourceSentence: '밤이 깊어지자 거리가 조용해졌다.' },
        { id: 'sense-snow', lemma: '눈', meaningZh: '雪', sourceSentence: '밤사이 눈이 많이 내렸다.' },
      ],
    },
  },
  {
    id: '04-unrelated-targets',
    purpose: 'A larger selection of unrelated words that may strain coherence.',
    input: {
      targets: [
        { id: 'unrelated-camel', lemma: '낙타', meaningZh: '骆驼', sourceSentence: '동물원에서 낙타를 봤다.' },
        { id: 'unrelated-bulb', lemma: '전구', meaningZh: '灯泡', sourceSentence: '방의 전구를 새것으로 바꿨다.' },
        { id: 'unrelated-umbrella', lemma: '우산', meaningZh: '雨伞', sourceSentence: '비가 올 것 같아서 우산을 챙겼다.' },
        { id: 'unrelated-swim', lemma: '수영하다', meaningZh: '游泳', sourceSentence: '여름에는 바다에서 수영한다.' },
        { id: 'unrelated-calculate', lemma: '계산하다', meaningZh: '计算', sourceSentence: '가격을 다시 계산했다.' },
        { id: 'unrelated-move', lemma: '이사하다', meaningZh: '搬家', sourceSentence: '다음 달에 새집으로 이사한다.' },
      ],
    },
  },
];

type CaseStatus = { id: string; status: 'pending' | 'generated' | 'failed' | 'not_run'; elapsedMs?: number; responseId?: string; usage?: GeneratedPassage['usage']; error?: { code: string; message: string } };

function sampleMarkdown(testCase: typeof cases[number], result: GeneratedPassage, elapsedMs: number): string {
  const sentences = result.sentences.map((sentence) => {
    const korean = sentence.parts.map((part) => part.targetId ? `**${part.text}**` : part.text).join('');
    return `${korean}\n\n> Chinese: ${sentence.translationZh}`;
  }).join('\n\n');
  const targets = testCase.input.targets.map((target) => `- ${target.lemma} — ${target.meaningZh}${target.sourceSentence ? `\n  - Source: ${target.sourceSentence}` : ''}`).join('\n');
  const usage = result.usage
    ? `${result.usage.inputTokens} input / ${result.usage.outputTokens} output / ${result.usage.totalTokens} total tokens`
    : 'Not reported';
  return `# ${testCase.id}\n\n- Status: response received; owner semantic review pending\n- Purpose: ${testCase.purpose}\n- Requested model: ${result.requestedModel}\n- Response model: ${result.model ?? 'Not reported'}\n- Response ID: ${result.responseId ?? 'Not reported'}\n- Latency: ${elapsedMs} ms\n- Usage: ${usage}\n- Semantic review: target-ID annotations do not prove the intended lemma or meaning.\n\n## Selected vocabulary\n\n${targets}\n\n## Korean passage\n\n## ${result.title}\n\n${sentences}\n`;
}

const outputBase = join(process.cwd(), '.scratch', 'desktop-learning', 'generated-samples');
const runDirectory = join(outputBase, `run-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
const manifest: { createdAt: string; requestedModel: string; mode: 'prepared_only' | 'live'; status: string; note: string; cases: CaseStatus[] } = {
  createdAt: new Date().toISOString(),
  requestedModel: 'deepseek-flash',
  mode: process.env.DEEPSEEK_API_KEY?.trim() ? 'live' : 'prepared_only',
  status: 'running',
  note: 'Structural validation is not semantic Korean quality evidence.',
  cases: cases.map(({ id }) => ({ id, status: 'pending' })),
};

async function saveManifest(): Promise<void> {
  await writeFile(join(runDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function run(): Promise<void> {
  await mkdir(outputBase, { recursive: true });
  await mkdir(runDirectory, { recursive: false });
  if (manifest.mode === 'prepared_only') {
    manifest.status = 'live_evaluation_not_run';
    manifest.note = 'Live evaluation not run because DEEPSEEK_API_KEY is not configured. These are prepared inputs only; no generated samples or semantic evidence are claimed.';
    manifest.cases = cases.map(({ id }) => ({ id, status: 'not_run' }));
    await writeFile(join(runDirectory, 'prepared-inputs.json'), `${JSON.stringify(cases, null, 2)}\n`, 'utf8');
    await saveManifest();
    process.stdout.write(`Live evaluation not run: DEEPSEEK_API_KEY is not configured. Prepared inputs saved to ${runDirectory}\n`);
    return;
  }

  await saveManifest();
  for (let index = 0; index < cases.length; index += 1) {
    const testCase = cases[index];
    const startedAt = Date.now();
    try {
      const result = await generatePassage(testCase.input, { apiKey: process.env.DEEPSEEK_API_KEY! });
      const elapsedMs = Date.now() - startedAt;
      await writeFile(join(runDirectory, `${testCase.id}.md`), sampleMarkdown(testCase, result, elapsedMs), 'utf8');
      manifest.cases[index] = { id: testCase.id, status: 'generated', elapsedMs, responseId: result.responseId, ...(result.usage ? { usage: result.usage } : {}) };
      await saveManifest();
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const failure = error instanceof GenerationError
        ? { code: error.code, message: error.message }
        : { code: 'unexpected', message: 'Unexpected generation failure; details were omitted.' };
      manifest.cases[index] = { id: testCase.id, status: 'failed', elapsedMs, error: failure };
      for (let remaining = index + 1; remaining < cases.length; remaining += 1) {
        manifest.cases[remaining] = { id: cases[remaining].id, status: 'not_run' };
      }
      manifest.status = 'failed';
      await writeFile(join(runDirectory, `${testCase.id}.md`), `# ${testCase.id}\n\n- Status: failed\n- Purpose: ${testCase.purpose}\n- Error: ${failure.message}\n- Error code: ${failure.code}\n`, 'utf8');
      await saveManifest();
      process.stderr.write(`Generation evaluation stopped at ${testCase.id}: ${failure.message}\n`);
      process.exitCode = 1;
      return;
    }
  }

  manifest.status = 'responses_received_semantic_review_pending';
  manifest.note = 'All four provider responses were saved. Owner review is still required for genuine target meaning, natural Korean, common supporting vocabulary and translation.';
  await saveManifest();
  process.stdout.write(`Four generation samples saved for owner review: ${runDirectory}\n`);
}

void run().catch((error: unknown) => {
  process.stderr.write(`Could not save generation evaluation: ${error instanceof Error ? error.message : 'unexpected file error'}\n`);
  process.exitCode = 1;
});
