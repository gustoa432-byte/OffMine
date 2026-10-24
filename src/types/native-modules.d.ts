// Ambient type definitions for React Native native modules
declare module 'react-native-fs' {
  export const DocumentDirectoryPath: string;
  export const CachesDirectoryPath: string;
  export function mkdir(filepath: string): Promise<void>;
  export function exists(filepath: string): Promise<boolean>;
  export function stat(filepath: string): Promise<{ size: number; isFile: () => boolean }>;
  export function unlink(filepath: string): Promise<void>;
  export function moveFile(filepath: string, destPath: string): Promise<void>;
  export function getFSInfo(): Promise<{ freeSpace: number; totalSpace: number }>;
  export interface DownloadFileOptions {
    fromUrl: string;
    toFile: string;
    background?: boolean;
    progressInterval?: number;
    progressDivider?: number;
    begin?: (res: { jobId: number; statusCode: number; contentLength: number }) => void;
    progress?: (res: { jobId: number; bytesWritten: number; contentLength: number }) => void;
  }
  export function downloadFile(options: DownloadFileOptions): {
    jobId: number;
    promise: Promise<{ jobId: number; statusCode: number; bytesWritten: number }>;
  };
  export function stopDownload(jobId: number): void;
}

declare module 'llama.rn' {
  export interface LlamaContextOptions {
    model: string;
    use_mlock?: boolean;
    n_ctx?: number;
    n_threads?: number;
  }

  export interface CompletionParams {
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
    n_predict?: number;
    temperature?: number;
    top_p?: number;
    stop?: string[];
  }

  export interface CompletionResult {
    text: string;
    timings?: {
      predicted_per_second?: number;
      predicted_ms?: number;
      predicted_n?: number;
    };
  }

  export interface LlamaContext {
    completion(
      params: CompletionParams,
      callback?: (data: { token: string }) => void
    ): Promise<CompletionResult>;
    stopCompletion(): Promise<void>;
    release(): Promise<void>;
  }

  export function initLlama(options: LlamaContextOptions): Promise<LlamaContext>;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
  };
  export default AsyncStorage;
}
