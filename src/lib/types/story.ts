export interface Story {
  id: string;
  content: string;
  translation?: string;
  words: string[];
  language?: string;
  translationLanguage?: string;
  audioPath?: string;
  createdAt: number;
}
