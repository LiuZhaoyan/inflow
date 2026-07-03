export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  contextSentence?: string;
  translation?: string;
  imagePath?: string;
  audioPath?: string;
  language?: string;
  createdAt: number;
}
