import type { ChatMessage } from './aiClient';
import type { LearnAction } from './types/learnChat';

export interface LearnActionTexts {
  displayText: string;
  modelText: string;
}

interface ContextEntry {
  role?: string;
  content?: string;
  userAction?: LearnAction;
}

export function mapActionTexts(
  action: LearnAction,
  currentSentence?: string,
  context?: string,
  level?: number,
): LearnActionTexts {
  if (action === 'init') {
    return {
      displayText: '',
      modelText: context
        ? `Start the session. The user chose the context: "${context}". Generate a sentence relevant to this context at difficulty level ${level ?? 3}/10.`
        : `Start the session. Generate a sentence at difficulty level ${level ?? 3}/10.`,
    };
  }

  if (action === 'explain') {
    return {
      displayText: 'Explain please',
      modelText: `Explain this sentence: "${currentSentence || ''}"`,
    };
  }

  if (action === 'translate') {
    return {
      displayText: 'Translate please',
      modelText: `Translate this sentence: "${currentSentence || ''}"`,
    };
  }

  return {
    displayText: 'I got it!',
    modelText: `I understand this sentence: "${currentSentence || ''}". Give me the next one at the appropriate difficulty level.`,
  };
}

export function buildLearnChatContextMessages(
  systemPrompt: string,
  history: ContextEntry[],
  limit = 10,
): ChatMessage[] {
  const safeHistory = Array.isArray(history) ? history : [];
  const filtered: ContextEntry[] = [];

  for (let i = 0; i < safeHistory.length - 1; i += 1) {
    const current = safeHistory[i];
    const next = safeHistory[i + 1];
    if (current?.role === 'user' && current.userAction === 'understand' && next?.content) {
      filtered.push(next);
    }
  }

  return [
    { role: 'system', content: systemPrompt },
    ...filtered.slice(-limit).map((entry) => {
      let role: 'user' | 'system' | 'assistant' = 'user';
      if (entry.role === 'ai') role = 'assistant';
      else if (entry.role === 'system') role = 'system';
      else if (entry.role === 'user') role = 'user';
      return {
        role,
        content: entry.content || '',
      };
    }),
  ];
}
