export interface ParsedThinkResponse {
  thinking: string;
  answer: string;
  isThinkingActive: boolean;
  hasThinkBlock: boolean;
}

/**
 * Parses assistant responses containing DeepSeek-R1 reasoning tags (<think>...</think>).
 * Robust to streaming chunks where </think> might not be arrived yet.
 */
export function parseThinkBlocks(rawText: string): ParsedThinkResponse {
  if (!rawText) {
    return {
      thinking: '',
      answer: '',
      isThinkingActive: false,
      hasThinkBlock: false,
    };
  }

  const openTag = '<think>';
  const closeTag = '</think>';

  const openIndex = rawText.indexOf(openTag);

  // If no open <think> tag found
  if (openIndex === -1) {
    return {
      thinking: '',
      answer: rawText,
      isThinkingActive: false,
      hasThinkBlock: false,
    };
  }

  const afterOpen = rawText.slice(openIndex + openTag.length);
  const closeIndex = afterOpen.indexOf(closeTag);

  // If </think> has arrived
  if (closeIndex !== -1) {
    const thinking = afterOpen.slice(0, closeIndex).trim();
    const prefix = rawText.slice(0, openIndex).trim();
    const suffix = afterOpen.slice(closeIndex + closeTag.length).trim();
    const answer = [prefix, suffix].filter(Boolean).join('\n\n');

    return {
      thinking,
      answer,
      isThinkingActive: false,
      hasThinkBlock: true,
    };
  }

  // <think> is open, but </think> hasn't arrived yet (still streaming thinking tokens)
  const thinking = afterOpen;
  const prefix = rawText.slice(0, openIndex).trim();

  return {
    thinking,
    answer: prefix,
    isThinkingActive: true,
    hasThinkBlock: true,
  };
}

/**
 * Formats bytes into human-readable string (e.g. 510 МБ / 1.12 ГБ)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes <= 0) return '0 Б';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${num} ${sizes[i]}`;
}

/**
 * Formats download speed in MB/s
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 МБ/с';
  const mbPerSec = bytesPerSec / (1024 * 1024);
  return `${mbPerSec.toFixed(1)} МБ/с`;
}
