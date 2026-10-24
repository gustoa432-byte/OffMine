import React from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  Trash2,
  XCircle,
  HardDrive,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ModelInfo } from '../types';
import { formatBytes, formatSpeed } from '../utils/thinkParser';

interface ModelCardProps {
  model: ModelInfo;
}

export const ModelCard: React.FC<ModelCardProps> = ({ model }) => {
  const {
    downloadProgress,
    getModelStatus,
    downloadModel,
    cancelDownload,
    activateModel,
    setConfirmDeleteModel,
  } = useAppStore();

  const status = getModelStatus(model.id);
  const progress = downloadProgress[model.id];

  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] p-4.5 shadow-lg backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06]">
      {/* Top row: Model title & badges */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[#F5F7FA] text-base">{model.name}</h3>
            {model.quantization && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono font-medium text-[#7C86FF]">
                {model.quantization}
              </span>
            )}
            {status === 'active' && (
              <span className="flex items-center gap-1 rounded-md border border-[#30D158]/40 bg-[#30D158]/15 px-2 py-0.5 text-[10px] font-medium text-[#30D158]">
                <CheckCircle2 className="h-3 w-3" />
                Активна в RAM
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#8E93A6] leading-relaxed">{model.description}</p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-white/90">{model.sizeLabel}</span>
        </div>
      </div>

      {/* Progress Bar state for downloading */}
      {status === 'downloading' && progress && (
        <div className="mt-3.5 space-y-1.5 rounded-xl border border-[#0A84FF]/20 bg-[#0A84FF]/5 p-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#0A84FF] font-semibold">{progress.percent}%</span>
            <span className="text-white/60">
              {formatBytes(progress.bytesWritten, 1)} из {formatBytes(progress.contentLength, 1)}
            </span>
            <span className="text-white/70 font-medium">
              {formatSpeed(progress.speedBytesPerSec)}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] to-[#7C86FF] transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => cancelDownload(model.id)}
              className="flex items-center gap-1 text-[11px] font-medium text-[#FF453A] hover:underline"
            >
              <XCircle className="h-3 w-3" />
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Verifying & Mounting into engine state */}
      {status === 'verifying' && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-[#5E6AD2]/30 bg-[#5E6AD2]/10 p-3 text-xs text-[#7C86FF]">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Проверка целостности и монтирование в движок...</span>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="mt-4 flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-[11px] text-[#8E93A6]">
          <HardDrive className="h-3.5 w-3.5" />
          <span className="truncate max-w-[160px] font-mono text-[10px]">{model.filename}</span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'not_downloaded' && (
            <button
              onClick={() => downloadModel(model)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#7C86FF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition hover:brightness-110 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Скачать ({model.sizeLabel})</span>
            </button>
          )}

          {(status === 'installed' || status === 'active') && (
            <>
              <button
                onClick={() => activateModel(model)}
                disabled={status === 'active'}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  status === 'active'
                    ? 'border border-[#30D158]/50 bg-[#30D158]/20 text-[#30D158] cursor-default'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {status === 'active' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Выбрана</span>
                  </>
                ) : (
                  <>
                    <Cpu className="h-3.5 w-3.5 text-[#7C86FF]" />
                    <span>Активировать</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setConfirmDeleteModel(model)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-[#FF453A] transition hover:bg-red-500/25 active:scale-95"
                title="Удалить файл модели с устройства"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
