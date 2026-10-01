import type { Segment } from './processing';

export type LearningState = { position: number; index: number; rate: number; loop: boolean; duration: number };
export type SavedMedia = {
  id: string; name: string; video: boolean; missing: boolean;
  segments: (Segment & { id: string })[]; learning: LearningState;
};
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
};

declare global { interface Window { inflow?: DesktopBridge } }

export const managedMediaUrl = (id: string) => `inflow://app/media/${encodeURIComponent(id)}`;
