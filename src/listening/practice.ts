export type Rating = 'clear' | 'partial' | 'unclear';
export type Attempt = {
  text: string; submitted: string | null; hint: number; plays: number;
  rating: Rating | ''; notes: string; score: number | null;
  status: 'new' | 'review' | 'independent'; due: number | null;
};
export type Progress = { version: 1; lesson: string; index: number; phase: 'listen' | 'practice'; impression: string; items: Record<string, Attempt> };
export const freshAttempt = (): Attempt => ({ text: '', submitted: null, hint: 0, plays: 0, rating: '', notes: '', score: null, status: 'new', due: null });
export const normalize = (text: string) => text.normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '');

export function compare(input: string, expected: string) {
  const a = Array.from(normalize(input).slice(0, 500));
  const b = Array.from(normalize(expected).slice(0, 500));
  // ponytail: quadratic alignment capped at 500 characters; long-form dictation needs a different matcher.
  const d = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
  }
  const parts: { text: string; kind: 'correct' | 'missing' | 'extra' | 'wrong' }[] = [];
  let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && d[i][j] === d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])) {
      parts.unshift({ text: a[i - 1], kind: a[i - 1] === b[j - 1] ? 'correct' : 'wrong' }); i--; j--;
    } else if (j && d[i][j] === d[i][j - 1] + 1) {
      parts.unshift({ text: '□', kind: 'missing' }); j--;
    } else { parts.unshift({ text: a[i - 1], kind: 'extra' }); i--; }
  }
  return { score: Math.round(100 * (1 - d[a.length][b.length] / Math.max(a.length, b.length, 1))), parts };
}

export function assess(score: number, hint: number, rating: string): Attempt['status'] {
  return score === 100 && hint === 0 && rating === 'clear' ? 'independent' : 'review';
}

export function restore(raw: string): Progress | null {
  try {
    const p = JSON.parse(raw);
    if (!p || p.version !== 1 || typeof p.lesson !== 'string' || !Number.isInteger(p.index) || p.index < 0 || !['listen', 'practice'].includes(p.phase) || typeof p.impression !== 'string' || !p.items || typeof p.items !== 'object' || Array.isArray(p.items)) return null;
    for (const item of Object.values(p.items) as Attempt[]) {
      if (!item || typeof item.text !== 'string' || item.text.length > 500 || (item.submitted !== null && (typeof item.submitted !== 'string' || item.submitted.length > 500)) || !Number.isInteger(item.hint) || item.hint < 0 || item.hint > 4 || !Number.isInteger(item.plays) || item.plays < 0 || typeof item.notes !== 'string' || !['', 'clear', 'partial', 'unclear'].includes(item.rating) || !['new', 'review', 'independent'].includes(item.status) || (item.score !== null && (!Number.isFinite(item.score) || item.score < 0 || item.score > 100)) || (item.due !== null && (!Number.isFinite(item.due) || item.due < 0))) return null;
    }
    return p;
  } catch { return null; }
}
