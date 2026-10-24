import React from 'react';
import { Bot, User, Zap } from 'lucide-react';
import { ChatMessage } from '../types';
import { parseThinkBlocks } from '../utils/thinkParser';
import { CodeBlock } from './CodeBlock';
import { ThinkAccordion } from './ThinkAccordion';

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const { thinking, answer, hasThinkBlock, isThinkingActive } = parseThinkBlocks(message.content);

  // Render markdown-like sections (code blocks vs regular paragraphs)
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    // Split by triple backticks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        elements.push(
          <div key={`txt-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
            {renderInlineStyles(textBefore)}
          </div>
        );
      }

      const lang = match[1] || 'text';
      const code = match[2];
      elements.push(<CodeBlock key={`code-${match.index}`} code={code} language={lang} />);
      lastIndex = match.index + match[0].length;
    }

    let remainingText = text.slice(lastIndex);
    
    // Check if remainingText has an unclosed code block during active streaming
    const unclosedMatch = remainingText.match(/```([a-zA-Z0-9_-]*)\n?([\s\S]*)$/);
    if (unclosedMatch && unclosedMatch.index !== undefined) {
      const beforeUnclosed = remainingText.slice(0, unclosedMatch.index);
      if (beforeUnclosed.trim()) {
        elements.push(
          <div key={`txt-pre-unclosed`} className="whitespace-pre-wrap leading-relaxed">
            {renderInlineStyles(beforeUnclosed)}
          </div>
        );
      }
      const lang = unclosedMatch[1] || 'code';
      const code = unclosedMatch[2];
      elements.push(
        <CodeBlock key="code-unclosed" code={code} language={lang} />
      );
      remainingText = '';
    }

    if (remainingText.trim() || elements.length === 0) {
      elements.push(
        <div key={`txt-end`} className="whitespace-pre-wrap leading-relaxed">
          {renderInlineStyles(remainingText)}
        </div>
      );
    }

    return elements;
  };

  const renderInlineStyles = (text: string) => {
    // Basic bold **text** and bullet items
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold replacement
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={pIdx}
              className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-[#7C86FF]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      return (
        <span key={idx} className="block min-h-[1.25rem]">
          {formattedLine}
        </span>
      );
    });
  };

  return (
    <div
      className={`group flex w-full gap-3 py-3 transition-opacity ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#12141D] text-[#7C86FF] shadow-md">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`relative max-w-[85%] rounded-[20px] px-4 py-3 text-sm text-[#F5F7FA] shadow-lg ${
          isUser
            ? 'border border-[#7C86FF]/30 bg-gradient-to-br from-[#5E6AD2] to-[#4853B0] text-white'
            : 'border border-white/10 bg-[#12141D]/90 backdrop-blur-xl'
        }`}
      >
        {/* Model Reasoning Accordion (DeepSeek R1 think tags) */}
        {!isUser && hasThinkBlock && (
          <ThinkAccordion thinking={thinking} isStreaming={isThinkingActive || isStreaming} />
        )}

        {/* Answer Content */}
        <div className="space-y-1">
          {renderFormattedContent(answer)}
          {isStreaming && !isThinkingActive && (
            <span className="inline-block h-3.5 w-1.5 ml-0.5 animate-pulse rounded-sm bg-[#5E6AD2] align-middle" />
          )}
        </div>

        {/* Message Telemetry Badge */}
        {!isUser && (message.tokensPerSecond || message.totalTokens) && (
          <div className="mt-2.5 flex items-center gap-3 border-t border-white/5 pt-1.5 text-[10px] text-[#8E93A6]">
            {message.tokensPerSecond && (
              <span className="flex items-center gap-1 font-mono text-[#30D158]">
                <Zap className="h-3 w-3" />
                {message.tokensPerSecond} tok/s
              </span>
            )}
            {message.totalTokens && (
              <span className="font-mono text-white/50">{message.totalTokens} токенов</span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#12141D] text-white/80 shadow-md">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
