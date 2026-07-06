export function normalizeChallengeIndex(level: unknown, fallback = 1): number {
  const numeric = typeof level === 'number' ? level : Number(level);
  if (!Number.isFinite(numeric)) {
    return Math.max(1, Math.round(fallback));
  }
  return Math.max(1, Math.round(numeric));
}

export function isValidChallengeIndex(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 1;
}
