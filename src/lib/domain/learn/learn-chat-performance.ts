export type LearnChatPerformanceAction = 'init' | 'explain' | 'translate' | 'understand';

export const LEARN_CHAT_MAX_TOKENS_BY_ACTION: Record<LearnChatPerformanceAction, number> = {
  init: 150,
  understand: 150,
  explain: 200,
  translate: 100,
};

export function getLearnChatMaxTokens(action: LearnChatPerformanceAction): number {
  return LEARN_CHAT_MAX_TOKENS_BY_ACTION[action];
}

interface ScheduleMasteredSentenceTtsParams {
  sentenceId: string;
  sentence: string;
  userId: string;
  languageCode: string;
  requestId?: string;
  endpoint: string;
}

interface ScheduleMasteredSentenceTtsDeps {
  requestTtsPersistent: (
    text: string,
    options: { voiceId: string; speed: number },
    userId: string,
  ) => Promise<string>;
  updateMasteredSentenceAudioPath: (
    sentenceId: string,
    audioPath: string,
    userId: string,
    languageCode: string,
  ) => Promise<unknown>;
  warn: (message: string, meta: Record<string, unknown>) => void;
}

export function scheduleMasteredSentenceTts(
  params: ScheduleMasteredSentenceTtsParams,
  deps: ScheduleMasteredSentenceTtsDeps,
): void {
  void deps.requestTtsPersistent(params.sentence, {
    voiceId: 'audiobook_female_1',
    speed: 1.0,
  }, params.userId)
    .then((audioPath) =>
      deps.updateMasteredSentenceAudioPath(
        params.sentenceId,
        audioPath,
        params.userId,
        params.languageCode,
      ),
    )
    .catch(() => {
      deps.warn('Auto-TTS failed for mastered sentence', {
        requestId: params.requestId,
        userId: params.userId,
        endpoint: params.endpoint,
      });
    });
}
