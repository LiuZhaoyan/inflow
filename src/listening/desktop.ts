import type { Segment } from './processing';
import type { GeneratedPassage, GenerationTarget } from '../generation';

export type LearningState = { position: number; index: number; rate: number; loop: boolean; duration: number };
export type SavedMedia = {
  id: string; name: string; video: boolean; missing: boolean;
  segments: (Segment & { id: string })[]; learning: LearningState;
};
export type MediaVocabularySource = {
  id: string; segmentId: string; mediaId: string; mediaName: string;
  surface: string; sentence: string; start: number;
};
export type ArtifactVocabularySource = { id: string; artifactId: string; artifactTitle: string; sentenceIndex: number; surface: string; sentence: string };
export type VocabularySource = MediaVocabularySource | ArtifactVocabularySource;
export type VocabularyEntry = { id: string; lemma: string; meaningZh: string; selected: boolean; sources: VocabularySource[] };
export type SaveVocabularyInput = { id?: string; lemma: string; meaningZh: string; source?: { segmentId: string; surface: string } | { artifactId: string; sentenceIndex: number; surface: string } };
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
  saveLearning(id: string, state: LearningState): Promise<void>;
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
