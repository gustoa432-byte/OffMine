import React from 'react';
import { Menu, Plus, Sliders, Smartphone, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Header: React.FC = () => {
  const {
    activeModelId,
    models,
    isGenerating,
    currentTokensPerSecond,
    settings,
    setDrawerOpen,
    createSession,
    setModelHubOpen,
    setSettingsOpen,
    setApkModalOpen,
  } = useAppStore();

  const activeModel = models.find((m) => m.id === activeModelId);
  const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated === true;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#090A0F]/80 px-3.5 backdrop-blur-xl sm:px-6">
      {/* Left zone: Drawer toggle and New Chat */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
          title="История диалогов"
          aria-label="Открыть историю диалогов"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          onClick={() => createSession()}
          className="flex items-center gap-1.5 rounded-xl border border-[#5E6AD2]/40 bg-[#5E6AD2]/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#5E6AD2]/25"
          title="Создать новый чат"
        >
          <Plus className="h-3.5 w-3.5 text-[#7C86FF]" />
          <span className="hidden sm:inline">Новый чат</span>
        </button>
      </div>

      {/* Center zone: Active Model Pill (Click to open Model Hub) */}
      <div className="flex items-center">
        <button
          onClick={() => setModelHubOpen(true)}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-[#F5F7FA] shadow-sm transition hover:border-[#5E6AD2]/50 hover:bg-white/[0.08]"
          title="Менеджер моделей (нажмите для смены или скачивания)"
        >
          {activeModel ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#30D158] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#30D158]"></span>
              </span>
              <span className="max-w-[150px] truncate sm:max-w-[220px]">
                {activeModel.name}
              </span>
              <span className="hidden rounded bg-white/10 px-1 py-0.2 text-[10px] text-white/70 sm:inline">
                Готова
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-[#8E93A6]"></span>
              <span className="text-[#8E93A6]">Модель не выбрана</span>
              <span className="text-[10px] text-[#7C86FF] underline underline-offset-2">
                Выбрать
              </span>
            </>
          )}
        </button>
      </div>

      {/* Right zone: Live Telemetry + Engine Mode + Settings + APK Builder */}
      <div className="flex items-center gap-2">
        {/* Engine Multi-Thread status indicator */}
        <div
          className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            isIsolated
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }`}
          title={
            isIsolated
              ? 'SharedArrayBuffer активен: используется многопоточный WASM SIMD'
              : 'SharedArrayBuffer не активен: однопоточный режим (требуются заголовки COOP/COEP)'
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isIsolated ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          <span>{isIsolated ? `Multi-Thread (${settings.nThreads} потоков)` : 'Single-Thread'}</span>
        </div>

        {/* Live Generation Telemetry Badge */}
        {isGenerating && currentTokensPerSecond > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-[#30D158]/30 bg-[#30D158]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#30D158]">
            <Zap className="h-3 w-3 animate-bounce" />
            <span>{currentTokensPerSecond} tok/s</span>
          </div>
        )}

        <button
          onClick={() => setApkModalOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 text-xs font-medium text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
          title="Android APK & Сборка GitHub Actions"
        >
          <Smartphone className="h-4 w-4 text-[#7C86FF]" />
          <span className="hidden md:inline text-[11px]">APK Сборка</span>
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
          title="Параметры инференса (System Prompt, Temperature, Context)"
          aria-label="Настройки генерации"
        >
          <Sliders className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
