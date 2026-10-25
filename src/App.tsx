import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Square,
  Sparkles,
  Layers,
  Sliders,
  Trash2,
  Code2,
  Brain,
  Zap,
} from 'lucide-react';
import { ApkExportModal } from './components/ApkExportModal';
import { ChatMessageItem } from './components/ChatMessageItem';
import { Header } from './components/Header';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ModelHubModal } from './components/ModelHubModal';
import { SettingsModal } from './components/SettingsModal';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const {
    initApp,
    sessions,
    currentSessionId,
    activeModelId,
    models,
    isGenerating,
    settings,
    sendMessage,
    stopGeneration,
    clearCurrentChat,
    setModelHubOpen,
  } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];
  const activeModel = models.find((m) => m.id === activeModelId);
  const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated === true;

  // Auto-scroll to bottom as streaming tokens arrive
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages, isGenerating]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;
    const text = inputPrompt;
    setInputPrompt('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    {
      title: 'Рассуждение (Reasoning)',
      text: 'Объясни парадокс Монти Холла пошагово с расчетом вероятностей',
      icon: Brain,
    },
    {
      title: 'Код на TypeScript',
      text: 'Напиши функцию deepClone с поддержкой циклических ссылок',
      icon: Code2,
    },
    {
      title: 'Быстрый анализ',
      text: 'В чем разница между квантованиями Q4_K_M и Q8_0 в llama.cpp?',
      icon: Zap,
    },
  ];

  return (
    <div className="flex h-screen w-screen flex-col bg-[#090A0F] text-[#F5F7FA] font-sans antialiased overflow-hidden selection:bg-[#5E6AD2]/30 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Chat Workspace */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 md:px-12 lg:px-24 xl:px-44">
          {!currentSession || currentSession.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
                <Sparkles className="h-8 w-8 text-[#7C86FF]" />
              </div>

              <h2 className="mt-4 text-xl font-bold text-white">PocketCore AI</h2>
              <p className="mt-1.5 max-w-md text-xs text-[#8E93A6]">
                Автономный мобильный LLM движок для Android. Полная приватность: инференс 0.5B – 1.5B
                моделей GGUF без подключения к интернету.
              </p>

              {!activeModel && (
                <div className="mt-5 rounded-2xl border border-[#5E6AD2]/30 bg-[#5E6AD2]/10 p-3.5 max-w-sm">
                  <p className="text-xs text-[#7C86FF] font-medium">
                    Модель еще не выбрана в память
                  </p>
                  <button
                    onClick={() => setModelHubOpen(true)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#7C86FF] py-2 text-xs font-semibold text-white shadow-md hover:brightness-110"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Открыть каталог моделей</span>
                  </button>
                </div>
              )}

              {/* Quick Prompts */}
              <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-3">
                {quickPrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputPrompt(item.text);
                        inputRef.current?.focus();
                      }}
                      className="group flex flex-col items-start rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-[#5E6AD2]/50 hover:bg-white/[0.06]"
                    >
                      <Icon className="h-4 w-4 text-[#7C86FF] transition group-hover:scale-110" />
                      <span className="mt-2 text-xs font-semibold text-white/90">{item.title}</span>
                      <span className="mt-1 text-[11px] text-[#8E93A6] line-clamp-2">
                        {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-1 pb-6">
              {currentSession.messages.map((msg, index) => {
                const isLastAssistant =
                  isGenerating &&
                  index === currentSession.messages.length - 1 &&
                  msg.role === 'assistant';
                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isStreaming={isLastAssistant}
                  />
                );
              })}
              <div ref={chatBottomRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Bar Section */}
        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-[#090A0F]/85 p-3 backdrop-blur-2xl sm:p-5">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={handleSend}
              className="relative flex items-end overflow-hidden rounded-[24px] border border-white/15 bg-white/[0.05] p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-[#5E6AD2] focus-within:bg-white/[0.07]"
            >
              <textarea
                ref={inputRef}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeModel
                    ? `Сообщение для ${activeModel.name}... (Enter для отправки)`
                    : 'Выберите модель вверху или напишите вопрос...'
                }
                rows={1}
                className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none sm:text-sm"
              />

              <div className="flex items-center gap-1.5 pb-1 pr-1">
                {currentSession && currentSession.messages.length > 0 && !isGenerating && (
                  <button
                    type="button"
                    onClick={clearCurrentChat}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/10 hover:text-white"
                    title="Очистить текущий диалог"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {/* Stop button (■) directly in input bar during generation calling stopCompletion() */}
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-[#FF453A] px-3 text-xs font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-95 animate-pulse"
                    title="Остановить генерацию (stopCompletion)"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Стоп</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputPrompt.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#7C86FF] text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Отправить сообщение"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            <div className="mt-1.5 flex items-center justify-between px-2 text-[10px] text-[#8E93A6]">
              <span className="flex items-center gap-1.5 truncate">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isIsolated ? 'bg-[#30D158]' : 'bg-[#FFD60A]'}`}></span>
                <span className="truncate">
                  {isIsolated
                    ? `🟢 Multi-Thread WASM (${settings.nThreads} потоков) • SIMD`
                    : '🟡 Single-Thread режим'}
                </span>
              </span>
              <span className="hidden sm:inline">Shift+Enter для новой строки</span>
            </div>
          </div>
        </div>
      </main>

      {/* Overlay Modals & Drawers */}
      <HistoryDrawer />
      <ModelHubModal />
      <SettingsModal />
      <ApkExportModal />
    </div>
  );
}
