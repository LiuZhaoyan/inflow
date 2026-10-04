import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GenerationError, generatePassage, type GeneratePassageInput } from '../../src/generation';

const cases: { id: string; purpose: string; input: GeneratePassageInput }[] = [
  {
    id: 'contextual-polysemy',
    purpose: 'Use bank for a river edge and run for managing a business.',
    input: {
      language: 'en',
      topic: 'A bakery beside a river',
      targets: [
        { id: 'river-bank', lemma: 'bank', meaningZh: '河岸；河边', sourceSentence: 'They sat on the bank of the river and watched the water.' },
        { id: 'manage-run', lemma: 'run', meaningZh: '经营；管理', sourceSentence: 'Her aunt runs a small bakery in town.' },
      ],
    },
  },
  {
    id: 'common-inflections-and-forms',
    purpose: 'Check child to children, meet, friend, well-known, and the complete contraction don\'t.',
    input: {
      language: 'en',
      topic: 'An afternoon at the library',
      targets: [
        { id: 'child', lemma: 'child', meaningZh: '孩子', sourceSentence: 'The child waved to the teacher.' },
        { id: 'meet', lemma: 'meet', meaningZh: '见面；会面', sourceSentence: 'I will meet my friend after class.' },
        { id: 'friend', lemma: 'friend', meaningZh: '朋友', sourceSentence: 'My friend likes reading.' },
        { id: 'well-known', lemma: 'well-known', meaningZh: '著名的', sourceSentence: 'She is a well-known writer.' },
        { id: 'dont', lemma: "don't", meaningZh: '不；不要', sourceSentence: "We don't leave until the story ends." },
      ],
    },
  },
  {
    id: 'past-event-inflection-follow-up',
    purpose: 'Check target use and Chinese translation in a past scene with child, meet, friend, and exercise-sense run inflections.',
    input: {
      language: 'en',
      topic: 'Yesterday, several children met their friends and ran home after school.',
      targets: [
        { id: 'child', lemma: 'child', meaningZh: '孩子', sourceSentence: 'A child is playing in the park.' },
        { id: 'meet', lemma: 'meet', meaningZh: '遇见；会面', sourceSentence: 'I meet my friends at the park.' },
        { id: 'friend', lemma: 'friend', meaningZh: '朋友', sourceSentence: 'A friend comes over to play.' },
        { id: 'run-exercise', lemma: 'run', meaningZh: '跑步；奔跑', sourceSentence: 'I run in the park after school.' },
      ],
    },
  },
];

const selectedCases = process.argv.includes('--inflection-follow-up')
  ? cases.filter(({ id }) => id === 'past-event-inflection-follow-up')
  : cases;

const apiKey = process.env.DEEPSEEK_API_KEY;
const createdAt = new Date().toISOString();
const samplesDirectory = join(process.cwd(), '.scratch', 'desktop-learning', 'generated-samples');
const filename = `english-quality-${createdAt.replace(/[:.]/g, '-')}.json`;

async function run(): Promise<void> {
  if (!apiKey?.trim()) {
    throw new Error('No DEEPSEEK_API_KEY was available to this process; live quality review was not run.');
  }

  await mkdir(samplesDirectory, { recursive: true });
  const outcomes: Record<string, unknown>[] = [];

  for (const testCase of selectedCases) {
    const startedAt = Date.now();
    try {
      const result = await generatePassage(testCase.input, { apiKey });
      outcomes.push({ id: testCase.id, status: 'generated', elapsedMs: Date.now() - startedAt, input: testCase.input, result });
    } catch (error) {
      const failure = error instanceof GenerationError
        ? { code: error.code, message: error.message }
        : { code: 'unexpected', message: 'Unexpected generation failure; details were omitted.' };
      outcomes.push({ id: testCase.id, status: 'failed', elapsedMs: Date.now() - startedAt, input: testCase.input, error: failure });
      if (failure.code === 'missing_key' || failure.code === 'unauthorized' || failure.code === 'quota') break;
    }
  }

  const status = outcomes.length === selectedCases.length && outcomes.every((outcome) => outcome.status === 'generated')
    ? 'responses_received_semantic_review_pending'
    : 'incomplete';
  const evidence = {
    createdAt,
    status,
    requestedModel: 'deepseek-flash',
    mode: 'live_provider',
    cases: outcomes,
  };
  const outputPath = join(samplesDirectory, filename);
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${status}: ${outputPath}\n`);
  if (status !== 'responses_received_semantic_review_pending') process.exitCode = 1;
}

void run().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unexpected quality-check failure.'}\n`);
  process.exitCode = 1;
});
