import type { ChatHistoryRow, DerivedSentenceState } from '@/lib/types/learnChat';

export function deriveCurrentSentence(rows: ChatHistoryRow[]): DerivedSentenceState {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
        const row = rows[i];
        if (row.role !== 'ai') continue;
        if (row.messageType === 'sentence' && row.content.trim()) {
            return { sentence: row.content, messageId: row.id };
        }
        if (row.originalSentence && row.originalSentence.trim()) {
            return { sentence: row.originalSentence, messageId: null };
        }
    }
    return { sentence: '', messageId: null };
}
