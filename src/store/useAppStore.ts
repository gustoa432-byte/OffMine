import { create } from 'zustand';
import { DEFAULT_GENERATION_SETTINGS, PRESET_MODELS } from '../constants/models';
import { llamaService } from '../services/LlamaService';
import { modelManager } from '../services/ModelManager';
import {
  ChatMessage,
  ChatSession,
  DownloadProgress,
  GenerationSettings,
  ModelInfo,
  ModelStatus,
  StorageTelemetry,
} from '../types';

interface AppState {
  // Chat state
  sessions: ChatSession[];
  currentSessionId: string;
  isGenerating: boolean;
  currentTokensPerSecond: number;
  totalTokensGenerated: number;

  // Model state
  models: ModelInfo[];
  activeModelId: string | null;
  downloadProgress: Record<string, DownloadProgress>;
  downloadingModels: Set<string>;
  verifyingModels: Set<string>;
  installedModelIds: Set<string>;
  telemetry: StorageTelemetry | null;

  // Settings
  settings: GenerationSettings;

  // UI Navigation Modals
  isDrawerOpen: boolean;
  isModelHubOpen: boolean;
  isSettingsOpen: boolean;
  isApkModalOpen: boolean;
  confirmDeleteModel: ModelInfo | null;

  // Actions
  initApp: () => Promise<void>;
  createSession: () => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  clearCurrentChat: () => void;

  // Model operations
  downloadModel: (model: ModelInfo) => Promise<void>;
  cancelDownload: (modelId: string) => Promise<void>;
  activateModel: (model: ModelInfo) => Promise<void>;
  deleteModel: (model: ModelInfo) => Promise<void>;
  addCustomModel: (name: string, url: string) => void;

  // Settings & UI
  updateSettings: (newSettings: Partial<GenerationSettings>) => void;
  setDrawerOpen: (open: boolean) => void;
  setModelHubOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setApkModalOpen: (open: boolean) => void;
  setConfirmDeleteModel: (model: ModelInfo | null) => void;
  refreshTelemetry: () => Promise<void>;
  getModelStatus: (modelId: string) => ModelStatus;
}

// Memory caching for ultra-fast startup before disk read
let memoryChatCache: ChatSession[] | null = null;

const SESSIONS_STORAGE_KEY = 'pocketcore_chat_sessions_v1';
const SETTINGS_STORAGE_KEY = 'pocketcore_settings_v1';
const CUSTOM_MODELS_STORAGE_KEY = 'pocketcore_custom_models_v1';

const initialSessionId = 'session-default-1';
const defaultInitialSession: ChatSession = {
  id: initialSessionId,
  title: 'Новый диалог',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  modelId: PRESET_MODELS[0].id,
  messages: [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Добро пожаловать в **PocketCore AI** — полноценную автономную LLM прямо на вашем устройстве.\n\nЗдесь нет облачных серверов: модели формата **GGUF** скачиваются напрямую и работают без интернета с аппаратным ускорением.\n\nВыберите готовую модель в **Менеджере моделей** вверху, чтобы начать диалог.',
      timestamp: Date.now(),
    },
  ],
};

export const useAppStore = create<AppState>((set, get) => ({
  sessions: memoryChatCache || [defaultInitialSession],
  currentSessionId: initialSessionId,
  isGenerating: false,
  currentTokensPerSecond: 0,
  totalTokensGenerated: 0,

  models: PRESET_MODELS,
  activeModelId: null,
  downloadProgress: {},
  downloadingModels: new Set<string>(),
  verifyingModels: new Set<string>(),
  installedModelIds: new Set<string>(),
  telemetry: null,

  settings: DEFAULT_GENERATION_SETTINGS,

  isDrawerOpen: false,
  isModelHubOpen: false,
  isSettingsOpen: false,
  isApkModalOpen: false,
  confirmDeleteModel: null,

  initApp: async () => {
    try {
      // 1. Instant Cache Hydration for Chats
      const savedSessionsStr = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (savedSessionsStr) {
        try {
          const parsed = JSON.parse(savedSessionsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryChatCache = parsed;
            set({
              sessions: parsed,
              currentSessionId: parsed[0].id,
            });
          }
        } catch (e) {
          console.warn('Failed parsing cached sessions:', e);
        }
      }

      // 2. Load custom models
      const customStr = localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
      let allModels = [...PRESET_MODELS];
      if (customStr) {
        try {
          const parsedCustom = JSON.parse(customStr);
          if (Array.isArray(parsedCustom)) {
            allModels = [...PRESET_MODELS, ...parsedCustom];
            set({ models: allModels });
          }
        } catch (e) {}
      }

      // 3. Hydrate settings first so activateModel uses configured contextSize
      const savedSettingsStr = localStorage.getItem(SETTINGS_STORAGE_KEY);
      let effectiveSettings = DEFAULT_GENERATION_SETTINGS;
      if (savedSettingsStr) {
        try {
          effectiveSettings = { ...DEFAULT_GENERATION_SETTINGS, ...JSON.parse(savedSettingsStr) };
        } catch (e) {}
      }
      set({ settings: effectiveSettings });

      // 4. Hydrate installed models check
      const installed = new Set<string>();
      for (const m of allModels) {
        const isInst = await modelManager.isModelInstalled(m);
        if (isInst) {
          installed.add(m.id);
        }
      }

      // 5. Restore active model with effective settings
      const activeId = await modelManager.getActiveModelId();
      let effectiveActiveId = activeId;
      if (activeId && installed.has(activeId)) {
        const found = allModels.find((m) => m.id === activeId);
        if (found) {
          await modelManager.activateModel(found, effectiveSettings);
        }
      } else if (installed.size > 0) {
        // Fallback to first installed
        const first = Array.from(installed)[0];
        const found = allModels.find((m) => m.id === first);
        if (found) {
          await modelManager.activateModel(found, effectiveSettings);
          effectiveActiveId = first;
        }
      }

      const telemetry = await modelManager.getStorageTelemetry();

      set({
        installedModelIds: installed,
        activeModelId: effectiveActiveId,
        telemetry,
      });
    } catch (err) {
      console.error('initApp error:', err);
    }
  },

  createSession: () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'Новый диалог',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelId: get().activeModelId || PRESET_MODELS[0].id,
      messages: [],
    };

    set((state) => {
      const updated = [newSession, ...state.sessions];
      memoryChatCache = updated;
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return {
        sessions: updated,
        currentSessionId: newSessionId,
        isDrawerOpen: false,
      };
    });

    return newSessionId;
  },

  selectSession: (id: string) => {
    set({ currentSessionId: id, isDrawerOpen: false });
  },

  deleteSession: (id: string) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      const remaining = filtered.length > 0 ? filtered : [defaultInitialSession];
      memoryChatCache = remaining;
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(remaining));

      const nextId = state.currentSessionId === id ? remaining[0].id : state.currentSessionId;
      return {
        sessions: remaining,
        currentSessionId: nextId,
      };
    });
  },

  clearCurrentChat: () => {
    const { currentSessionId, sessions } = get();
    const updated = sessions.map((s) => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [],
          title: 'Новый диалог',
          updatedAt: Date.now(),
        };
      }
      return s;
    });

    memoryChatCache = updated;
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    set({ sessions: updated });
  },

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isGenerating) return;

    const { currentSessionId, sessions, activeModelId, models, settings } = get();
    const currentSession = sessions.find((s) => s.id === currentSessionId);
    if (!currentSession) return;

    // Check if a model is loaded in memory
    if (!llamaService.isLoaded()) {
      if (activeModelId) {
        const modelToLoad = models.find((m) => m.id === activeModelId);
        if (modelToLoad) {
          await modelManager.activateModel(modelToLoad, settings);
        }
      } else {
        // Open Model Hub so user can pick / download a model
        set({ isModelHubOpen: true });
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const assistantMsgId = `msg-asst-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelId: activeModelId || undefined,
    };

    // Auto title for the first user message in session
    let updatedTitle = currentSession.title;
    if (currentSession.messages.filter((m) => m.role === 'user').length === 0) {
      updatedTitle = trimmed.slice(0, 32) + (trimmed.length > 32 ? '...' : '');
    }

    const updatedMessages = [...currentSession.messages, userMessage, assistantMessage];

    // Optimistically update UI
    set((state) => {
      const updatedSessions = state.sessions.map((s) => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            title: updatedTitle,
            updatedAt: Date.now(),
            messages: updatedMessages,
          };
        }
        return s;
      });
      return {
        sessions: updatedSessions,
        isGenerating: true,
        currentTokensPerSecond: 0,
      };
    });

    try {
      // Build history for completion, filtering out UI welcome banner to prevent massive prefill delay
      const historyPayload = currentSession.messages
        .filter((m) => m.id !== 'welcome-msg' && m.content.trim().length > 0)
        .slice(-6)
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content }));

      let currentStreamText = '';

      const completionResult = await llamaService.streamCompletion(
        historyPayload,
        settings,
        (tokenData) => {
          currentStreamText += tokenData.token;
          set((state) => {
            const nextSessions = state.sessions.map((s) => {
              if (s.id === currentSessionId) {
                const nextMsgs = s.messages.map((m) => {
                  if (m.id === assistantMsgId) {
                    return {
                      ...m,
                      content: currentStreamText,
                      tokensPerSecond: tokenData.tokensPerSecond,
                      totalTokens: tokenData.totalTokens,
                    };
                  }
                  return m;
                });
                return { ...s, messages: nextMsgs };
              }
              return s;
            });
            return {
              sessions: nextSessions,
              currentTokensPerSecond: tokenData.tokensPerSecond,
              totalTokensGenerated: tokenData.totalTokens,
            };
          });
        }
      );

      // Finalize message with metrics
      set((state) => {
        const finalSessions = state.sessions.map((s) => {
          if (s.id === currentSessionId) {
            const finalMsgs = s.messages.map((m) => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  content: completionResult.fullText,
                  tokensPerSecond: completionResult.tokensPerSecond,
                  totalTokens: completionResult.totalTokens,
                };
              }
              return m;
            });
            return { ...s, messages: finalMsgs };
          }
          return s;
        });

        // Persist to offline storage
        memoryChatCache = finalSessions;
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(finalSessions));

        return {
          sessions: finalSessions,
          isGenerating: false,
          currentTokensPerSecond: completionResult.tokensPerSecond,
        };
      });
    } catch (err: any) {
      console.error('Error in completion:', err);
      set((state) => {
        const errorSessions = state.sessions.map((s) => {
          if (s.id === currentSessionId) {
            const errorMsgs = s.messages.map((m) => {
              if (m.id === assistantMsgId) {
                return {
                  ...m,
                  content:
                    m.content ||
                    `⚠️ Ошибка инференса: ${err?.message || 'Не удалось сгенерировать ответ.'}`,
                };
              }
              return m;
            });
            return { ...s, messages: errorMsgs };
          }
          return s;
        });
        return {
          sessions: errorSessions,
          isGenerating: false,
          currentTokensPerSecond: 0,
        };
      });
    }
  },

  stopGeneration: async () => {
    await llamaService.stopCompletion();
    set({ isGenerating: false, currentTokensPerSecond: 0 });
  },

  downloadModel: async (model: ModelInfo) => {
    set((state) => {
      const downloading = new Set(state.downloadingModels);
      downloading.add(model.id);
      return { downloadingModels: downloading };
    });

    try {
      await modelManager.downloadModel(
        model,
        (progress) => {
          set((state) => ({
            downloadProgress: {
              ...state.downloadProgress,
              [model.id]: progress,
            },
          }));
        },
        get().settings
      );

      // Verification state
      set((state) => {
        const verifying = new Set(state.verifyingModels);
        verifying.add(model.id);
        const downloading = new Set(state.downloadingModels);
        downloading.delete(model.id);
        return { verifyingModels: verifying, downloadingModels: downloading };
      });

      // Brief delay to showcase verify & mount
      await new Promise((r) => setTimeout(r, 600));

      set((state) => {
        const installed = new Set(state.installedModelIds);
        installed.add(model.id);
        const verifying = new Set(state.verifyingModels);
        verifying.delete(model.id);
        const nextProgress = { ...state.downloadProgress };
        delete nextProgress[model.id];

        return {
          installedModelIds: installed,
          verifyingModels: verifying,
          downloadProgress: nextProgress,
          activeModelId: model.id,
        };
      });

      await get().refreshTelemetry();
    } catch (err: any) {
      console.error('Download error:', err);
      set((state) => {
        const downloading = new Set(state.downloadingModels);
        downloading.delete(model.id);
        const verifying = new Set(state.verifyingModels);
        verifying.delete(model.id);
        const nextProgress = { ...state.downloadProgress };
        delete nextProgress[model.id];
        return {
          downloadingModels: downloading,
          verifyingModels: verifying,
          downloadProgress: nextProgress,
        };
      });
    }
  },

  cancelDownload: async (modelId: string) => {
    await modelManager.cancelDownload(modelId);
    set((state) => {
      const downloading = new Set(state.downloadingModels);
      downloading.delete(modelId);
      const nextProgress = { ...state.downloadProgress };
      delete nextProgress[modelId];
      return {
        downloadingModels: downloading,
        downloadProgress: nextProgress,
      };
    });
  },

  activateModel: async (model: ModelInfo) => {
    await modelManager.activateModel(model, get().settings);
    set({ activeModelId: model.id });
    await get().refreshTelemetry();
  },

  deleteModel: async (model: ModelInfo) => {
    await modelManager.deleteModel(model);
    set((state) => {
      const installed = new Set(state.installedModelIds);
      installed.delete(model.id);
      return {
        installedModelIds: installed,
        activeModelId: state.activeModelId === model.id ? null : state.activeModelId,
        confirmDeleteModel: null,
      };
    });
    await get().refreshTelemetry();
  },

  addCustomModel: (name: string, url: string) => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;

    const filename = trimmedUrl.split('/').pop()?.split('?')[0] || `model-${Date.now()}.gguf`;

    const newModel: ModelInfo = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      sizeLabel: 'Пользовательская',
      expectedMinBytes: 300000000,
      description: 'Пользовательская модель GGUF с HuggingFace или прямого URL.',
      url: trimmedUrl,
      filename,
      quantization: 'GGUF',
      isCustom: true,
    };

    set((state) => {
      const updated = [...state.models, newModel];
      const customOnly = updated.filter((m) => m.isCustom);
      localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(customOnly));
      return { models: updated };
    });
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return { settings: updated };
    });
  },

  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setModelHubOpen: (open) => set({ isModelHubOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setApkModalOpen: (open) => set({ isApkModalOpen: open }),
  setConfirmDeleteModel: (model) => set({ confirmDeleteModel: model }),

  refreshTelemetry: async () => {
    const telemetry = await modelManager.getStorageTelemetry();
    set({ telemetry });
  },

  getModelStatus: (modelId: string): ModelStatus => {
    const { activeModelId, installedModelIds, downloadingModels, verifyingModels } = get();
    if (activeModelId === modelId) return 'active';
    if (verifyingModels.has(modelId)) return 'verifying';
    if (downloadingModels.has(modelId)) return 'downloading';
    if (installedModelIds.has(modelId)) return 'installed';
    return 'not_downloaded';
  },
}));
