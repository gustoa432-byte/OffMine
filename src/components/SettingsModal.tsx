import React from 'react';
import { X, Sliders, RotateCcw, Cpu } from 'lucide-react';
import { DEFAULT_GENERATION_SETTINGS } from '../constants/models';
import { useAppStore } from '../store/useAppStore';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, settings, updateSettings } = useAppStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setSettingsOpen(false)}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#12141D] text-[#F5F7FA] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#5E6AD2] to-[#7C86FF] text-white">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Параметры инференса</h2>
              <p className="text-xs text-[#8E93A6]">Настройка локального движка LLaMA C++</p>
            </div>
          </div>

          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-xl p-1.5 text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть настройки"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* System Prompt */}
          <div>
            <label className="block text-xs font-semibold text-white/90">
              Системный промпт (System Prompt)
            </label>
            <p className="mb-2 text-[11px] text-[#8E93A6]">
              Задает роль и базовые инструкции модели перед началом диалога
            </p>
            <textarea
              rows={3}
              value={settings.systemPrompt}
              onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#090A0F] p-3 text-xs text-white placeholder-white/30 focus:border-[#5E6AD2] focus:outline-none"
            />
          </div>

          {/* Temperature */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/90">
                Температура (Temperature): {settings.temperature}
              </label>
              <span className="text-[10px] text-[#7C86FF]">
                {settings.temperature < 0.4 ? 'Точный / Логичный' : settings.temperature > 0.8 ? 'Креативный' : 'Сбалансированный'}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="mt-2 w-full accent-[#5E6AD2]"
            />
          </div>

          {/* Top-P */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/90">
                Top-P (Nucleus Sampling): {settings.topP}
              </label>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.topP}
              onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
              className="mt-2 w-full accent-[#5E6AD2]"
            />
          </div>

          {/* Context Size */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <label className="text-xs font-semibold text-white/90">
              Размер контекста токенов (Context Size)
            </label>
            <p className="mb-2 text-[11px] text-[#8E93A6]">
              2048 оптимально для мобильных телефонов с 4–8 ГБ RAM
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[1024, 2048, 4096, 8192].map((size) => (
                <button
                  key={size}
                  onClick={() => updateSettings({ contextSize: size })}
                  className={`rounded-xl py-2 text-xs font-medium transition ${
                    settings.contextSize === size
                      ? 'border border-[#5E6AD2]/50 bg-[#5E6AD2]/20 text-[#7C86FF]'
                      : 'border border-white/10 bg-white/5 text-[#8E93A6] hover:bg-white/10'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Threads count */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#30D158]" />
                Потоки процессора (n_threads): {settings.nThreads}
              </label>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[2, 4, 6, 8].map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ nThreads: t })}
                  className={`rounded-xl py-2 text-xs font-medium transition ${
                    settings.nThreads === t
                      ? 'border border-[#30D158]/50 bg-[#30D158]/20 text-[#30D158]'
                      : 'border border-white/10 bg-white/5 text-[#8E93A6] hover:bg-white/10'
                  }`}
                >
                  {t} ядра
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#090A0F]/60 px-5 py-3.5">
          <button
            onClick={() => updateSettings(DEFAULT_GENERATION_SETTINGS)}
            className="flex items-center gap-1.5 text-xs text-[#8E93A6] transition hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Сбросить по умолчанию</span>
          </button>

          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded-xl bg-[#5E6AD2] px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#7C86FF]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
