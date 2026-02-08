
export type Language = 'ar' | 'en';
export type AppMode = 'repurpose' | 'generate';

export enum ToneType {
  PROFESSIONAL = 'PROFESSIONAL',
  FRIENDLY = 'FRIENDLY',
  WITTY = 'WITTY',
  URGENT = 'URGENT'
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GeneratedContent {
  platform: string;
  title: string;
  hook: string;
  body: string;
  psychologicalTrigger: string;
  strategyReasoning: string;
  hashtags: string[];
}

export interface ProcessingResult {
  content: GeneratedContent[];
  sources: GroundingSource[];
  agentThoughtLog: string[];
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

// Fixed missing type: ImageState
export interface ImageState {
  loading: boolean;
  url: string | null;
  error: string | null;
}
