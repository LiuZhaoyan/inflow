export type RevealChoice = 'little' | 'more' | 'all';

export function revealedGroupCount(groups: readonly string[], choice: RevealChoice): number {
  if (choice === 'all') return groups.length;
  if (choice === 'little') return Math.min(groups.length, 1);
  return Math.min(groups.length, Math.max(2, Math.ceil(groups.length * 2 / 3)));
}
