import { Wllama, type WllamaChatMessage } from '@wllama/wllama';
import singleThreadWasmUrl from '@wllama/wllama/esm/single-thread/wllama.wasm?url';
import multiThreadWasmUrl from '@wllama/wllama/esm/multi-thread/wllama.wasm?url';
import { GenerationSettings } from '../types';

/**
 * Converts relative Vite asset URL to an absolute URL so Web Worker (blob:)
 * can fetch .wasm files without 'Invalid URL' errors inside WebView and browsers.
 */
const resolveWasmUrl = (viteAssetUrl: string): string => {
  if (typeof window !== 'undefined' && window.location) {
    try {
      return new URL(viteAssetUrl, window.location.href).href;
    } catch {
      return viteAssetUrl;
    }
  }
  return viteAssetUrl;
};

export const getWllamaConfigPaths = () => ({
  'single-thread/wllama.wasm': resolveWasmUrl(singleThreadWasmUrl),
  'multi-thread/wllama.wasm': resolveWasmUrl(multiThreadWasmUrl),
});

export interface TokenCallbackData {
  token: string;
  totalTokens: number;
  tokensPerSecond: number;
}

export class LlamaService {
  private static instance: LlamaService | null = null;
  private wllamaInstance: Wllama | null = null;
  private currentModelUrl: string | null = null;
  private isGenerating = false;
  private abortController: AbortController | null = null;

  private constructor() {}

  public static getInstance(): LlamaService {
    if (!LlamaService.instance) {
      LlamaService.instance = new LlamaService();
    }
    return LlamaService.instance;
  }

  /**
   * Initializes or returns existing Wllama instance with absolute WASM paths
   */
  public async getWllama(): Promise<Wllama> {
    if (!this.wllamaInstance) {
      this.wllamaInstance = new Wllama(getWllamaConfigPaths(), {
        allowOffline: true,
        suppressNativeLog: false,
      });
    }
    return this.wllamaInstance;
  }

  /**
   * Loads model from Hugging Face / Direct GGUF URL with persistent caching in OPFS
   */
  public async loadModel(
    modelUrl: string,
    options?: {
      n_ctx?: number;
      n_threads?: number;
      onProgress?: (loaded: number, total: number) => void;
    }
  ): Promise<boolean> {
    try {
      if (this.isLoaded()) {
        await this.releaseCurrentModel();
      }

      const isMultiThreadAvailable = typeof window !== 'undefined' && window.crossOriginIsolated === true;
      const defaultThreads = isMultiThreadAvailable
        ? Math.min(navigator.hardwareConcurrency || 4, 6)
        : 1;
      const effectiveThreads = options?.n_threads || defaultThreads;
      const effectiveCtx = options?.n_ctx || 1024;

      const wllama = await this.getWllama();

      await wllama.loadModelFromUrl(modelUrl, {
        useCache: true,
        allowOffline: true,
        parallelDownloads: 1, // Required for stable download in mobile WebView without OOM
        n_ctx: effectiveCtx,
        n_batch: 128,
        n_threads: effectiveThreads,
        progressCallback: (opts) => {
          if (options?.onProgress) {
            options.onProgress(opts.loaded, opts.total);
          }
        },
      } as any);

      this.currentModelUrl = modelUrl;
      return true;
    } catch (err: any) {
      console.error('[LlamaService] Failed to loadModel:', err);
      this.currentModelUrl = null;
      throw new Error(err?.message || 'Не удалось загрузить GGUF модель в память');
    }
  }

  /**
   * Stream chat completion with live token metrics via real Wllama engine
   */
  public async streamCompletion(
    messages: Array<{ role: string; content: string }>,
    settings: GenerationSettings,
    onToken: (data: TokenCallbackData) => void
  ): Promise<{ fullText: string; tokensPerSecond: number; totalTokens: number }> {
    if (!this.isLoaded()) {
      throw new Error('Модель не загружена. Скачайте или выберите модель в Менеджере моделей.');
    }

    const wllama = await this.getWllama();
    if (!wllama.isModelLoaded()) {
      throw new Error('Модель не смонтирована в памяти WASM. Пожалуйста, активируйте модель снова.');
    }

    this.isGenerating = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    let generationStartTime = 0;
    let tokenCount = 0;
    let accumulatedText = '';

    try {
      const formattedMessages: WllamaChatMessage[] = [
        { role: 'system', content: settings.systemPrompt },
        ...messages.map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
      ];

      await wllama.createChatCompletion(formattedMessages, {
        useCache: true, // Retain KV-cache to avoid re-evaluating prompt history every turn
        nPredict: settings.nPredict,
        sampling: {
          temp: settings.temperature,
          top_p: settings.topP,
        },
        abortSignal: this.abortController.signal,
        onNewToken: (_token: any, _piece: any, currentText: string, optionals?: any) => {
          if (this.abortController?.signal.aborted) {
            if (optionals && typeof optionals.abortSignal === 'function') {
              optionals.abortSignal();
            }
            return;
          }

          tokenCount++;
          if (tokenCount === 1) {
            generationStartTime = Date.now();
          }

          const newChunk = currentText.slice(accumulatedText.length);
          accumulatedText = currentText;

          // Accurately measure tok/s starting from the arrival of the first generated token
          const genDuration = Math.max((Date.now() - (generationStartTime || startTime)) / 1000, 0.05);
          const tokensPerSecond = parseFloat((tokenCount / genDuration).toFixed(1));

          onToken({
            token: newChunk,
            totalTokens: tokenCount,
            tokensPerSecond,
          });
        },
      } as any);

      this.isGenerating = false;
      const totalGenDuration = Math.max((Date.now() - (generationStartTime || startTime)) / 1000, 0.05);
      const finalTokSec = parseFloat((tokenCount / totalGenDuration).toFixed(1));

      return {
        fullText: accumulatedText,
        tokensPerSecond: finalTokSec,
        totalTokens: tokenCount,
      };
    } catch (err: any) {
      this.isGenerating = false;
      if (err?.name === 'WllamaAbortError' || this.abortController?.signal.aborted) {
        const totalGenDuration = Math.max((Date.now() - (generationStartTime || startTime)) / 1000, 0.05);
        return {
          fullText: accumulatedText,
          tokensPerSecond: parseFloat((tokenCount / totalGenDuration).toFixed(1)),
          totalTokens: tokenCount,
        };
      }
      console.error('[LlamaService] Real inference error:', err);
      throw new Error(err?.message || 'Ошибка генерации ответа локальной нейросетью');
    }
  }

  /**
   * Immediately stops active text completion
   */
  public async stopCompletion(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isGenerating = false;
  }

  /**
   * Releases model from RAM
   */
  public async releaseCurrentModel(): Promise<void> {
    if (this.wllamaInstance) {
      try {
        if (this.wllamaInstance.isModelLoaded()) {
          await this.wllamaInstance.exit();
        }
      } catch (e) {
        console.warn('[LlamaService] exit error:', e);
      }
    }
    this.currentModelUrl = null;
    this.isGenerating = false;
    this.abortController = null;
  }

  public isLoaded(): boolean {
    return this.currentModelUrl !== null && (this.wllamaInstance ? this.wllamaInstance.isModelLoaded() : false);
  }

  public getLoadedModelPath(): string | null {
    return this.currentModelUrl;
  }

  public getIsGenerating(): boolean {
    return this.isGenerating;
  }
}

export const llamaService = LlamaService.getInstance();
