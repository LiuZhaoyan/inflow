import type { Segment } from './processing';
import type { GeneratedPassage, GenerationTarget } from '../generation';

export type PlaybackMode = 'full' | 'sentence';
export type LearningState = { position: number; index: number; rate: number; loop: boolean; duration: number; mode: PlaybackMode };
export type LearningStateInput = Omit<LearningState, 'mode'> & { mode?: PlaybackMode };
export type SavedMedia = {
  id: string; name: string; video: boolean; missing: boolean;
  segments: (Segment & { id: string })[]; learning: LearningState;
};
export type VocabularyContext = {
  id: string; surface: string; sentence: string;
  source:
    | { type: 'media'; mediaId: string; segmentId: string; name: string; start: number }
    | { type: 'artifact'; artifactId: string; sentenceIndex: number; name: string };
};
export type MediaVocabularySource = Extract<VocabularyContext['source'], { type: 'media' }>;
export type ArtifactVocabularySource = Extract<VocabularyContext['source'], { type: 'artifact' }>;
export type VocabularyEntry = { id: string; lemma: string; meaningZh: string; selected: boolean; contexts: VocabularyContext[] };
export type SaveVocabularyInput = { id?: string; lemma: string; meaningZh: string; context?: Omit<VocabularyContext, 'id'> };
export type LearningArtifact = GeneratedPassage & { id: string; createdAt: string; elapsedMs: number; targets: GenerationTarget[]; topic?: string };
export type CredentialStatus = { configured: boolean; error?: string };
export type DesktopBridge = {
  list(): Promise<SavedMedia[]>;
  restore(): Promise<SavedMedia | null>;
  open(id: string): Promise<SavedMedia>;
  importMedia(): Promise<SavedMedia | null>;
  relink(id: string): Promise<SavedMedia | null>;
  transcribe(id: string, job: string): Promise<SavedMedia>;
  translate(text: string, job: string): Promise<string>;
  cancel(job: string): Promise<void>;
  saveLearning(id: string, state: LearningStateInput): Promise<void>;
  listVocabulary(): Promise<VocabularyEntry[]>;
  saveVocabulary(input: SaveVocabularyInput): Promise<VocabularyEntry>;
  selectVocabulary(ids: string[]): Promise<VocabularyEntry[]>;
  credentialStatus(): Promise<CredentialStatus>;
  configureCredential(key: string): Promise<CredentialStatus>;
  generateArtifact(ids: string[], topic: string, job: string): Promise<LearningArtifact>;
  listArtifacts(): Promise<LearningArtifact[]>;
  restoreArtifact(): Promise<LearningArtifact | null>;
  openArtifact(id: string): Promise<LearningArtifact>;
};

declare global { interface Window { inflow?: DesktopBridge } }

export const managedMediaUrl = (id: string) => `inflow://app/media/${encodeURIComponent(id)}`;
