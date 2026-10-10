import type { Segment } from './processing';
import type { VideoMask } from './video-mask';
import type { GeneratedPassage, GenerationTarget } from '../generation';

export type SourceLanguage = 'ko' | 'en';
export type LookupVocabularyInput = { surface: string; sentence: string; start: number; language: SourceLanguage; lemma?: string; source?: VocabularyContext['source'] };
export type VocabularyLookup = { surface: string; lemma: string; language: SourceLanguage; candidates: string[]; meaningZh?: string };
export type SentenceTranslationInput = { mediaId: string; segmentId: string };
export type TranslationOptions = { refresh?: boolean; local?: boolean };
export type PlaybackMode = 'full' | 'sentence';
export type LearningState = { position: number; index: number; rate: number; loop: boolean; duration: number; mode: PlaybackMode; masks?: Record<string, number[]>; videoMask?: VideoMask };
export type LearningStateInput = Omit<LearningState, 'mode'> & { mode?: PlaybackMode };
export type SavedMedia = {
  id: string; name: string; language: SourceLanguage; video: boolean; missing: boolean;
  segments: (Segment & { id: string })[]; learning: LearningState;
};
export type VocabularyContext = {
  id: string; surface: string; sentence: string; surfaceStart?: number; surfaceStarts?: number[];
  source:
    | { type: 'media'; mediaId: string; segmentId: string; name: string; start: number }
    | { type: 'artifact'; artifactId: string; sentenceIndex: number; name: string };
};
export type MediaVocabularySource = Extract<VocabularyContext['source'], { type: 'media' }>;
export type ArtifactVocabularySource = Extract<VocabularyContext['source'], { type: 'artifact' }>;
export type VocabularyEntry = { id: string; language: SourceLanguage; lemma: string; meaningZh: string; note?: string; selected: boolean; contexts: VocabularyContext[] };
export type SaveVocabularyInput = { id?: string; language?: SourceLanguage; lemma: string; meaningZh: string; note?: string; context?: Omit<VocabularyContext, 'id' | 'surfaceStarts'> };
export type LearningArtifact = GeneratedPassage & { id: string; language: SourceLanguage; createdAt: string; elapsedMs: number; targets: GenerationTarget[]; topic?: string };
export type CredentialStatus = { configured: boolean; error?: string };
export type ModelStatus = { whisper: boolean; translate: { 'ko-en': boolean; 'en-zh': boolean }; englishParser: boolean };
export type ApplicationSettings = { videoMaskColor: string };
export type DesktopBridge = {
  list(): Promise<SavedMedia[]>;
  restore(): Promise<SavedMedia | null>;
  open(id: string): Promise<SavedMedia>;
  importMedia(): Promise<SavedMedia | null>;
  relink(id: string): Promise<SavedMedia | null>;
  transcribe(id: string, job: string): Promise<SavedMedia>;
  translate(input: SentenceTranslationInput, job: string, options?: TranslationOptions): Promise<string>;
  cancel(job: string): Promise<void>;
  saveLearning(id: string, state: LearningStateInput): Promise<void>;
  listVocabulary(): Promise<VocabularyEntry[]>;
  lookupVocabulary(input: LookupVocabularyInput, job: string): Promise<VocabularyLookup>;
  glossVocabulary(input: LookupVocabularyInput & { lemma: string }, job: string): Promise<string>;
  saveVocabulary(input: SaveVocabularyInput): Promise<VocabularyEntry>;
  deleteVocabulary(id: string): Promise<void>;
  selectVocabulary(ids: string[]): Promise<VocabularyEntry[]>;
  credentialStatus(): Promise<CredentialStatus>;
  configureCredential(key: string): Promise<CredentialStatus>;
  modelStatus(): Promise<ModelStatus>;
  setupModels(job: string, components?: string[]): Promise<ModelStatus>;
  getSettings(): Promise<ApplicationSettings>;
  saveSettings(settings: ApplicationSettings): Promise<ApplicationSettings>;
  generateArtifact(ids: string[], topic: string, job: string): Promise<LearningArtifact>;
  listArtifacts(): Promise<LearningArtifact[]>;
  restoreArtifact(): Promise<LearningArtifact | null>;
  openArtifact(id: string): Promise<LearningArtifact>;
};

declare global { interface Window { inflow?: DesktopBridge } }

export const managedMediaUrl = (id: string) => `inflow://app/media/${encodeURIComponent(id)}`;
