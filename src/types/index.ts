export interface ModelInfo {
  id: string;
  name: string;
  sizeLabel: string;
  expectedMinBytes: number;
  description: string;
  url: string;
  filename: string;
  quantization?: string;
  isCustom?: boolean;
}

export type ModelStatus = 'not_downloaded' | 'downloading' | 'verifying' | 'installed' | 'active';

export interface DownloadProgress {
  modelId: string;
  bytesWritten: number;
  contentLength: number;
  percent: number; // 0 - 100
  speedBytesPerSec: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
  tokensPerSecond?: number;
  totalTokens?: number;
  durationMs?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  modelId: string;
}

export interface GenerationSettings {
  systemPrompt: string;
  temperature: number;
  topP: number;
  contextSize: number;
  nPredict: number;
  nThreads: number;
}

export interface StorageTelemetry {
  totalDiskGB: number;
  freeDiskGB: number;
  appUsedMB: number;
  ramUsageMB: number;
  activeModelName: string | null;
}
