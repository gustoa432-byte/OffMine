import React from 'react';
import { MessageSquare, Plus, Trash2, X, Clock, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const HistoryDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    setDrawerOpen,
    sessions,
    currentSessionId,
    selectSession,
    deleteSession,
    createSession,
  } = useAppStore();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer content */}
      <div className="relative z-10 flex h-full w-full max-w-xs flex-col border-r border-white/10 bg-[#12141D] text-[#F5F7FA] shadow-2xl transition-transform">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#7C86FF]" />
            <h2 className="text-sm font-semibold tracking-wide text-white">История чатов</h2>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1 text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть историю"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => createSession()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#7C86FF] py-2.5 text-xs font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Новый диалог</span>
          </button>
        </div>

        {/* Cached sessions list */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {sessions.map((session) => {
            const isSelected = session.id === currentSessionId;
            const msgCount = session.messages.length;
            const dateStr = new Date(session.updatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`group flex cursor-pointer items-center justify-between rounded-xl p-2.5 text-xs transition ${
                  isSelected
                    ? 'border border-[#5E6AD2]/50 bg-white/[0.08] text-white shadow-sm'
                    : 'text-[#8E93A6] hover:bg-white/[0.04] hover:text-[#F5F7FA]'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isSelected ? 'text-[#7C86FF]' : 'text-white/40'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white/90">{session.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{msgCount} сообщ.</span>
                    </div>
                  </div>
                </div>

                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="ml-2 rounded p-1 text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-[#FF453A]"
                    title="Удалить диалог"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Cache Badge */}
        <div className="border-t border-white/10 p-3.5 bg-[#090A0F]/60">
          <div className="flex items-center gap-2 text-[11px] text-[#30D158]">
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span>Локальный кэш: синхронизирован</span>
          </div>
          <p className="mt-1 text-[10px] text-[#8E93A6]">
            Все диалоги хранятся офлайн на устройстве и моментально восстанавливаются при запуске.
          </p>
        </div>
      </div>
    </div>
  );
};
