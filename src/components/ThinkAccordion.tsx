import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Brain } from 'lucide-react';

interface ThinkAccordionProps {
  thinking: string;
  isStreaming?: boolean;
}

export const ThinkAccordion: React.FC<ThinkAccordionProps> = ({ thinking, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(isStreaming || false);

  if (!thinking) return null;

  return (
    <div className="my-2.5 overflow-hidden rounded-2xl border border-white/10 bg-[#12141D]/90 backdrop-blur-md transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-[#8E93A6] hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#7C86FF] animate-pulse" />
          <span className="text-white/80">
            💭 Процесс рассуждения {isStreaming ? '(модель думает...)' : '(нажмите, чтобы развернуть)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <span className="text-[10px] uppercase tracking-wider">{thinking.length} симв.</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-white/5 px-3.5 py-3 text-xs leading-relaxed text-[#8E93A6] italic font-mono whitespace-pre-wrap bg-[#090A0F]/50">
          {thinking}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#7C86FF] animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  );
};
