import { PRESET_MODELS } from '../constants/models';
import { DownloadProgress, ModelInfo, StorageTelemetry } from '../types';
import { llamaService } from './LlamaService';

export class ModelManagerService {
  private static instance: ModelManagerService | null = null;
  private activeJobs = new Map<string, { abortController: AbortController }>();
  private installedModels = new Set<string>();

  private constructor() {
    this.initStorage();
  }

  public static getInstance(): ModelManagerService {
    if (!ModelManagerService.instance) {
      ModelManagerService.instance = new ModelManagerService();
    }
    return ModelManagerService.instance;
  }

  private initStorage(): void {
    try {
      const stored = localStorage.getItem('pocketcore_installed_models');
      if (stored) {
        const list: string[] = JSON.parse(stored);
        list.forEach((id) => this.installedModels.add(id));
      }
    } catch (e) {
      console.warn('[ModelManager] Failed to read installed models from localStorage:', e);
    }
  }

  /**
   * Returns models directory description
   */
  public getModelsDirectory(): string {
    return 'OPFS (Origin Private File System) / Local Cache';
  }

  /**
   * Checks if a model file is physically present in local OPFS storage
   */
  public async isModelInstalled(model: ModelInfo): Promise<boolean> {
    try {
      const wllama = await llamaService.getWllama();
      if (wllama?.modelManager) {
        const models = await wllama.modelManager.getModels();
        const found = models.some(
          (m) => m.url === model.url && m.size >= model.expectedMinBytes * 0.8
        );
        if (found) {
          if (!this.installedModels.has(model.id)) {
            this.installedModels.add(model.id);
            this.persistInstalled();
          }
          return true;
        }
      }
    } catch {
      // Fall back to stored metadata if OPFS query fails temporarily
    }

    return this.installedModels.has(model.id);
  }

  /**
   * Real streaming download directly from HuggingFace into OPFS via @wllama/wllama
   */
  public async downloadModel(
    model: ModelInfo,
    onProgress: (progress: DownloadProgress) => void,
    settings?: import('../types').GenerationSettings
  ): Promise<string> {
    const abortCtrl = new AbortController();
    this.activeJobs.set(model.id, { abortController: abortCtrl });

    let lastBytes = 0;
    let lastTime = Date.now();

    try {
      // Directly invoke Wllama's loadModelFromUrl which writes chunks directly to OPFS
      await llamaService.loadModel(model.url, {
        n_ctx: settings?.contextSize || 1024,
        n_threads: settings?.nThreads || 4,
        onProgress: (loaded, total) => {
          if (abortCtrl.signal.aborted) {
            throw new Error('Загрузка отменена пользователем');
          }

          const now = Date.now();
          const timeDelta = Math.max((now - lastTime) / 1000, 0.05);
          const bytesDelta = loaded - lastBytes;
          const speed = Math.max(bytesDelta / timeDelta, 0);

          lastBytes = loaded;
          lastTime = now;

          const totalBytes = total > 0 ? total : model.expectedMinBytes;
          const percent = Math.min(Math.round((loaded / totalBytes) * 100), 100);

          onProgress({
            modelId: model.id,
            bytesWritten: loaded,
            contentLength: totalBytes,
            percent,
            speedBytesPerSec: speed,
          });
        },
      });

      // Model is fully downloaded and loaded into WASM RAM
      this.activeJobs.delete(model.id);
      this.installedModels.add(model.id);
      this.persistInstalled();
      await this.saveActiveModelId(model.id);

      return model.url;
    } catch (err: any) {
      this.activeJobs.delete(model.id);
      console.error('[ModelManager] Download failed:', err);
      // Ensure failed/aborted download does NOT get marked as installed
      this.installedModels.delete(model.id);
      this.persistInstalled();
      throw new Error(err?.message || 'Не удалось скачать модель с HuggingFace. Проверьте интернет-соединение.');
    }
  }

  /**
   * Cancels download and frees active job
   */
  public async cancelDownload(modelId: string): Promise<void> {
    const job = this.activeJobs.get(modelId);
    if (!job) return;

    job.abortController.abort();
    this.activeJobs.delete(modelId);
  }

  /**
   * Removes model completely from OPFS disk and releases RAM
   */
  public async deleteModel(model: ModelInfo): Promise<void> {
    // Release from RAM if currently loaded
    if (llamaService.getLoadedModelPath() === model.url) {
      await llamaService.releaseCurrentModel();
    }

    try {
      const wllama = await llamaService.getWllama();
      if (wllama?.modelManager) {
        const models = await wllama.modelManager.getModels({ includeInvalid: true });
        const target = models.find((m) => m.url === model.url);
        if (target) {
          await target.remove();
        }
      }
    } catch (e) {
      console.warn('[ModelManager] Error removing model from OPFS:', e);
    }

    this.installedModels.delete(model.id);
    this.persistInstalled();

    const activeId = await this.getActiveModelId();
    if (activeId === model.id) {
      await this.saveActiveModelId(null);
    }
  }

  /**
   * Activates an already installed model from OPFS into RAM
   */
  public async activateModel(model: ModelInfo, settings?: import('../types').GenerationSettings): Promise<void> {
    await llamaService.loadModel(model.url, {
      n_ctx: settings?.contextSize || 1024,
      n_threads: settings?.nThreads || 4,
    });
    await this.saveActiveModelId(model.id);
  }

  public async getStorageTelemetry(): Promise<StorageTelemetry> {
    let freeDiskGB = 64.5;
    let totalDiskGB = 128.0;

    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) {
          totalDiskGB = parseFloat((estimate.quota / (1024 * 1024 * 1024)).toFixed(1));
        }
        if (estimate.quota && estimate.usage !== undefined) {
          freeDiskGB = parseFloat(((estimate.quota - estimate.usage) / (1024 * 1024 * 1024)).toFixed(1));
        }
      } catch {
        // Fallback to estimation
      }
    }

    const usedMB = this.calculateAppStorage();
    return {
      totalDiskGB: totalDiskGB || 128.0,
      freeDiskGB: parseFloat(Math.max(freeDiskGB - usedMB / 1024, 1.0).toFixed(1)),
      appUsedMB: Math.round(usedMB),
      ramUsageMB: llamaService.isLoaded() ? 920 : 180,
      activeModelName: this.getActiveModelName(),
    };
  }

  private calculateAppStorage(): number {
    let mb = 120; // base app assets + wasm binaries
    for (const m of PRESET_MODELS) {
      if (this.installedModels.has(m.id)) {
        mb += m.expectedMinBytes / (1024 * 1024);
      }
    }
    return mb;
  }

  private getActiveModelName(): string | null {
    const url = llamaService.getLoadedModelPath();
    if (!url) return null;
    const found = PRESET_MODELS.find((m) => m.url === url || url.includes(m.filename));
    return found ? found.name : 'Локальная GGUF';
  }

  public async saveActiveModelId(id: string | null): Promise<void> {
    if (id) {
      localStorage.setItem('pocketcore_active_model_id', id);
    } else {
      localStorage.removeItem('pocketcore_active_model_id');
    }
  }

  public async getActiveModelId(): Promise<string | null> {
    return localStorage.getItem('pocketcore_active_model_id');
  }

  private persistInstalled(): void {
    try {
      localStorage.setItem(
        'pocketcore_installed_models',
        JSON.stringify(Array.from(this.installedModels))
      );
    } catch {}
  }
}

export const modelManager = ModelManagerService.getInstance();
