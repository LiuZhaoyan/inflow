import type { LearningArtifact, VocabularyEntry } from '@/listening/desktop';

export default function StorySentence({ artifact, index, vocabulary }: {
  artifact: LearningArtifact; index: number; vocabulary: VocabularyEntry[];
}) {
  let offset = 0;
  const parts = artifact.sentences[index].parts.map(part => {
    const start = offset; offset += part.text.length;
    return { ...part, start, end: offset };
  });
  const text = parts.map(part => part.text).join('');
  const collected = vocabulary.flatMap(entry => entry.contexts.flatMap(context => {
    if (context.source.type !== 'artifact' || context.source.artifactId !== artifact.id ||
      context.source.sentenceIndex !== index || context.sentence !== text) return [];
    // shortcut: legacy contexts use the first match, recollect for exact occurrence positions.
    const starts = context.surfaceStarts ?? [context.surfaceStart ?? text.indexOf(context.surface)];
    return starts.filter(start => start >= 0 && context.surface && text.slice(start, start + context.surface.length) === context.surface)
      .map(start => ({ start, end: start + context.surface.length, entry }));
  }));
  const boundaries = [...new Set([0, text.length, ...parts.flatMap(part => [part.start, part.end]),
    ...collected.flatMap(range => [range.start, range.end])])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, n) => {
    const end = boundaries[n + 1];
    const targetId = parts.find(part => part.start <= start && part.end >= end)?.targetId;
    const entry = collected.find(range => range.start <= start && range.end >= end)?.entry;
    return targetId || entry
      ? <mark key={start} data-target-id={targetId ?? undefined} data-vocabulary-id={entry?.id}
          title={entry?.meaningZh ?? artifact.targets.find(target => target.id === targetId)?.meaningZh}>{text.slice(start, end)}</mark>
      : <span key={start}>{text.slice(start, end)}</span>;
  });
}
