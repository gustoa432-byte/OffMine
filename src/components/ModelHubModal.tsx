import React, { useState } from 'react';
import {
  X,
  HardDrive,
  Cpu,
  Layers,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  FolderDown,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ModelCard } from './ModelCard';

export const ModelHubModal: React.FC = () => {
  const {
    isModelHubOpen,
    setModelHubOpen,
    models,
    telemetry,
    refreshTelemetry,
    addCustomModel,
    confirmDeleteModel,
    setConfirmDeleteModel,
    deleteModel,
  } = useAppStore();

  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isModelHubOpen) return null;

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customUrl.trim()) return;
    addCustomModel(customName, customUrl);
    setCustomName('');
    setCustomUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setModelHubOpen(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#12141D] text-[#F5F7FA] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#5E6AD2] to-[#7C86FF] text-white">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Менеджер Моделей</h2>
              <p className="text-xs text-[#8E93A6]">
                Офлайн каталог GGUF квантованных нейросетей (0.5B – 1.5B)
              </p>
            </div>
          </div>

          <button
            onClick={() => setModelHubOpen(false)}
            className="rounded-xl p-1.5 text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть каталог моделей"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Telemetry Card: Disk Free + RAM status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-xs text-[#8E93A6]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HardDrive className="h-4 w-4 text-[#7C86FF]" />
                  Память устройства (Диск)
                </span>
                <button
                  onClick={() => refreshTelemetry()}
                  className="rounded p-1 hover:text-white"
                  title="Обновить"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {telemetry?.freeDiskGB ?? '54.2'} ГБ
                </span>
                <span className="text-xs text-[#8E93A6]">
                  свободно из {telemetry?.totalDiskGB ?? '128'} ГБ
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#30D158]">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>Модели сохраняются в изолированный внутренний каталог приложения</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-xs text-[#8E93A6]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="h-4 w-4 text-[#30D158]" />
                  Статус ОЗУ (RAM)
                </span>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/70">
                  {telemetry?.ramUsageMB ?? '180'} МБ
                </span>
              </div>
              <div className="mt-2">
                <div className="text-sm font-semibold text-white">
                  {telemetry?.activeModelName ? (
                    <span className="text-[#30D158]">🟢 {telemetry.activeModelName}</span>
                  ) : (
                    <span className="text-[#8E93A6]">⚪ Нет активной модели в памяти</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[#8E93A6]">
                  {telemetry?.activeModelName
                    ? 'Модель готова к мгновенной генерации офлайн'
                    : 'Активируйте скачанную модель для запуска инференса'}
                </p>
              </div>
            </div>
          </div>

          {/* Preset Models list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E93A6]">
                Рекомендованные мобильные модели (HuggingFace)
              </h3>
              <span className="text-xs text-[#7C86FF]">{models.length} моделей</span>
            </div>

            <div className="space-y-3">
              {models.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          </div>

          {/* Add Custom Model Field */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-xs font-semibold text-[#8E93A6] transition hover:border-[#5E6AD2] hover:text-white"
              >
                <PlusCircle className="h-4 w-4 text-[#7C86FF]" />
                <span>+ Добавить свою модель по прямой ссылке (.gguf)</span>
              </button>
            ) : (
              <form onSubmit={handleAddCustom} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white">
                    Добавление модели с HuggingFace или любого URL
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-[#8E93A6] hover:text-white"
                  >
                    Отмена
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Название модели (например, SmolLM2 1.7B Instruct)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#090A0F] px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#5E6AD2] focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Прямой URL на файл .gguf (например, https://huggingface.co/.../model-q4_k_m.gguf)"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#090A0F] px-3 py-2 text-xs text-white placeholder-white/30 focus:border-[#5E6AD2] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#5E6AD2] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#7C86FF]"
                  >
                    Сохранить в каталог
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Delete Confirmation Sub-modal */}
        {confirmDeleteModel && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-5">
            <div className="w-full max-w-sm rounded-[20px] border border-red-500/30 bg-[#12141D] p-5 text-center shadow-2xl">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-[#FF453A]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">Удалить файл модели?</h3>
              <p className="mt-1.5 text-xs text-[#8E93A6]">
                Файл модели <strong className="text-white">{confirmDeleteModel.name}</strong> ({confirmDeleteModel.sizeLabel}) будет полностью удален из памяти телефона.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirmDeleteModel(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  onClick={() => deleteModel(confirmDeleteModel)}
                  className="flex-1 rounded-xl bg-[#FF453A] py-2 text-xs font-semibold text-white hover:brightness-110"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
