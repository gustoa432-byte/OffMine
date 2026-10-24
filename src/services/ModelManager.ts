import { PRESET_MODELS } from '../constants/models';
import { DownloadProgress, ModelInfo, StorageTelemetry } from '../types';
import { llamaService } from './LlamaService';

export class ModelManagerService {
  private static instance: ModelManagerService | null = null;
  private activeJobs = new Map<string, { jobId: number; partPath: string; abortController?: AbortController }>();
  private installedModels = new Set<string>();
  private storageDirectory = '/data/user/0/com.pocketcore.ai/files/models';

  private constructor() {
    this.initStorage();
  }

  public static getInstance(): ModelManagerService {
    if (!ModelManagerService.instance) {
      ModelManagerService.instance = new ModelManagerService();
    }
    return ModelManagerService.instance;
  }

  private async initStorage(): Promise<void> {
    try {
      const rnfs = await this.getRNFS();
      if (rnfs) {
        this.storageDirectory = `${rnfs.DocumentDirectoryPath}/models`;
        const dirExists = await rnfs.exists(this.storageDirectory);
        if (!dirExists) {
          await rnfs.mkdir(this.storageDirectory);
        }
      } else {
        // Web storage initialization
        const stored = localStorage.getItem('pocketcore_installed_models');
        if (stored) {
          try {
            const list: string[] = JSON.parse(stored);
            list.forEach((id) => this.installedModels.add(id));
          } catch (e) {
            console.warn('Failed to parse installed models from localStorage', e);
          }
        }
      }
    } catch (e) {
      console.warn('Error in initStorage:', e);
    }
  }

  private async getRNFS(): Promise<any> {
    try {
      const pkg = 'react-native-fs';
      const mod = await import(/* @vite-ignore */ pkg);
      return mod.default || mod;
    } catch {
      return null;
    }
  }

  private async getAsyncStorage(): Promise<any> {
    try {
      const pkg = '@react-native-async-storage/async-storage';
      const mod = await import(/* @vite-ignore */ pkg);
      return mod.default || mod;
    } catch {
      return null;
    }
  }

  /**
   * Returns models directory path
   */
  public getModelsDirectory(): string {
    return this.storageDirectory;
  }

  /**
   * Checks if a model file is physically present and verified
   */
  public async isModelInstalled(model: ModelInfo): Promise<boolean> {
    const rnfs = await this.getRNFS();
    if (rnfs) {
      const finalPath = `${this.storageDirectory}/${model.filename}`;
      const exists = await rnfs.exists(finalPath);
      if (!exists) return false;
      const stat = await rnfs.stat(finalPath);
      return stat.size >= model.expectedMinBytes;
    }
    return this.installedModels.has(model.id);
  }

  /**
   * Downloads model file using chunked streaming directly to disk (.part)
   */
  public async downloadModel(
    model: ModelInfo,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<string> {
    const rnfs = await this.getRNFS();
    const finalPath = `${this.storageDirectory}/${model.filename}`;
    const partPath = `${finalPath}.part`;

    let lastBytes = 0;
    let lastTime = Date.now();

    if (rnfs) {
      // Real React Native File System download stream
      await rnfs.mkdir(this.storageDirectory);

      // Clean existing part if left from interrupted download
      if (await rnfs.exists(partPath)) {
        await rnfs.unlink(partPath);
      }

      return new Promise<string>((resolve, reject) => {
        let currentJobId = 0;

        const downloadTask = rnfs.downloadFile({
          fromUrl: model.url,
          toFile: partPath,
          background: true,
          progressInterval: 250,
          progressDivider: 1,
          begin: (res: any) => {
            currentJobId = res.jobId;
            this.activeJobs.set(model.id, { jobId: res.jobId, partPath });
          },
          progress: (res: any) => {
            const now = Date.now();
            const timeDelta = Math.max((now - lastTime) / 1000, 0.1);
            const bytesDelta = res.bytesWritten - lastBytes;
            const speed = Math.max(bytesDelta / timeDelta, 0);

            lastBytes = res.bytesWritten;
            lastTime = now;

            const total = res.contentLength > 0 ? res.contentLength : model.expectedMinBytes;
            const percent = Math.min(Math.round((res.bytesWritten / total) * 100), 100);

            onProgress({
              modelId: model.id,
              bytesWritten: res.bytesWritten,
              contentLength: total,
              percent,
              speedBytesPerSec: speed,
            });
          },
        });

        downloadTask.promise
          .then(async (result: any) => {
            this.activeJobs.delete(model.id);
            if (result.statusCode !== 200) {
              await rnfs.unlink(partPath).catch(() => {});
              return reject(new Error(`Download failed with HTTP status ${result.statusCode}`));
            }

            // Stat check to prevent corrupt / truncated files
            const stat = await rnfs.stat(partPath);
            if (stat.size < model.expectedMinBytes) {
              await rnfs.unlink(partPath).catch(() => {});
              return reject(
                new Error(
                  `Файл не прошел проверку целостности (скачано ${stat.size} байт, ожидалось >= ${model.expectedMinBytes})`
                )
              );
            }

            // Move .part to final .gguf file
            await rnfs.moveFile(partPath, finalPath);
            this.installedModels.add(model.id);

            // Auto mount model into llama.rn
            await llamaService.loadModel(finalPath);
            await this.saveActiveModelId(model.id);

            resolve(finalPath);
          })
          .catch(async (err: any) => {
            this.activeJobs.delete(model.id);
            await rnfs.unlink(partPath).catch(() => {});
            reject(err);
          });
      });
    }

    // Web preview simulated stream directly mimicking device download performance
    const abortCtrl = new AbortController();
    this.activeJobs.set(model.id, { jobId: Date.now(), partPath, abortController: abortCtrl });

    const totalBytes = model.expectedMinBytes;
    const chunkSize = 25 * 1024 * 1024; // 25 MB steps
    let currentBytes = 0;

    while (currentBytes < totalBytes) {
      if (abortCtrl.signal.aborted) {
        throw new Error('Загрузка отменена пользователем');
      }

      await new Promise((r) => setTimeout(r, 120));
      currentBytes = Math.min(currentBytes + chunkSize, totalBytes);

      const now = Date.now();
      const timeDelta = Math.max((now - lastTime) / 1000, 0.05);
      const bytesDelta = currentBytes - lastBytes;
      const speed = bytesDelta / timeDelta;
      lastBytes = currentBytes;
      lastTime = now;

      const percent = Math.min(Math.round((currentBytes / totalBytes) * 100), 100);

      onProgress({
        modelId: model.id,
        bytesWritten: currentBytes,
        contentLength: totalBytes,
        percent,
        speedBytesPerSec: speed,
      });
    }

    this.activeJobs.delete(model.id);
    this.installedModels.add(model.id);
    this.persistWebInstalled();

    // Auto mount into llama engine
    await llamaService.loadModel(finalPath);
    await this.saveActiveModelId(model.id);

    return finalPath;
  }

  /**
   * Cancels download and purges partial temporary file
   */
  public async cancelDownload(modelId: string): Promise<void> {
    const job = this.activeJobs.get(modelId);
    if (!job) return;

    if (job.abortController) {
      job.abortController.abort();
    }

    const rnfs = await this.getRNFS();
    if (rnfs) {
      try {
        rnfs.stopDownload(job.jobId);
        if (await rnfs.exists(job.partPath)) {
          await rnfs.unlink(job.partPath);
        }
      } catch (e) {
        console.warn('Error while cancelling download:', e);
      }
    }

    this.activeJobs.delete(modelId);
  }

  /**
   * Removes model completely from disk and releases memory if loaded
   */
  public async deleteModel(model: ModelInfo): Promise<void> {
    const finalPath = `${this.storageDirectory}/${model.filename}`;

    // Release from RAM if active
    if (llamaService.getLoadedModelPath() === finalPath) {
      await llamaService.releaseCurrentModel();
    }

    const rnfs = await this.getRNFS();
    if (rnfs) {
      if (await rnfs.exists(finalPath)) {
        await rnfs.unlink(finalPath);
      }
    }

    this.installedModels.delete(model.id);
    this.persistWebInstalled();

    const activeId = await this.getActiveModelId();
    if (activeId === model.id) {
      await this.saveActiveModelId(null);
    }
  }

  /**
   * Activates an already installed model into RAM
   */
  public async activateModel(model: ModelInfo): Promise<void> {
    const finalPath = `${this.storageDirectory}/${model.filename}`;
    await llamaService.loadModel(finalPath);
    await this.saveActiveModelId(model.id);
  }

  public async getStorageTelemetry(): Promise<StorageTelemetry> {
    const rnfs = await this.getRNFS();
    if (rnfs && typeof rnfs.getFSInfo === 'function') {
      try {
        const info = await rnfs.getFSInfo();
        const freeGB = parseFloat((info.freeSpace / (1024 * 1024 * 1024)).toFixed(1));
        const totalGB = parseFloat((info.totalSpace / (1024 * 1024 * 1024)).toFixed(1));

        return {
          totalDiskGB: totalGB || 128,
          freeDiskGB: freeGB || 54.2,
          appUsedMB: Math.round(this.calculateAppStorage()),
          ramUsageMB: llamaService.isLoaded() ? 920 : 180,
          activeModelName: this.getActiveModelName(),
        };
      } catch (e) {
        console.warn('Failed getFSInfo:', e);
      }
    }

    // Web simulation telemetry based on installed models
    const usedMB = this.calculateAppStorage();
    return {
      totalDiskGB: 128.0,
      freeDiskGB: parseFloat((64.5 - usedMB / 1024).toFixed(1)),
      appUsedMB: Math.round(usedMB),
      ramUsageMB: llamaService.isLoaded() ? 920 : 180,
      activeModelName: this.getActiveModelName(),
    };
  }

  private calculateAppStorage(): number {
    let mb = 120; // base app size
    for (const m of PRESET_MODELS) {
      if (this.installedModels.has(m.id)) {
        mb += m.expectedMinBytes / (1024 * 1024);
      }
    }
    return mb;
  }

  private getActiveModelName(): string | null {
    const path = llamaService.getLoadedModelPath();
    if (!path) return null;
    const found = PRESET_MODELS.find((m) => path.includes(m.filename));
    return found ? found.name : 'Пользовательская GGUF';
  }

  public async saveActiveModelId(id: string | null): Promise<void> {
    const asyncStorage = await this.getAsyncStorage();
    if (asyncStorage) {
      if (id) {
        await asyncStorage.setItem('pocketcore_active_model_id', id);
      } else {
        await asyncStorage.removeItem('pocketcore_active_model_id');
      }
    } else {
      if (id) {
        localStorage.setItem('pocketcore_active_model_id', id);
      } else {
        localStorage.removeItem('pocketcore_active_model_id');
      }
    }
  }

  public async getActiveModelId(): Promise<string | null> {
    const asyncStorage = await this.getAsyncStorage();
    if (asyncStorage) {
      return await asyncStorage.getItem('pocketcore_active_model_id');
    }
    return localStorage.getItem('pocketcore_active_model_id');
  }

  private persistWebInstalled(): void {
    try {
      localStorage.setItem(
        'pocketcore_installed_models',
        JSON.stringify(Array.from(this.installedModels))
      );
    } catch {}
  }
}

export const modelManager = ModelManagerService.getInstance();
