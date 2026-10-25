import { ModelInfo } from '../types';

export const PRESET_MODELS: ModelInfo[] = [
  {
    id: 'qwen2.5-0.5b-instruct',
    name: 'Qwen 2.5 (0.5B) Instruct',
    sizeLabel: '352 МБ',
    expectedMinBytes: 310000000,
    description: 'Молниеносная модель (15–30 tok/s на CPU). Формат Q4_0 оптимизирован под SIMD WebAssembly.',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf',
    filename: 'qwen2.5-0.5b-instruct-q4_0.gguf',
    quantization: 'Q4_0 (Fast SIMD)',
  },
  {
    id: 'llama-3.2-1b-instruct',
    name: 'Llama 3.2 (1.0B) Instruct',
    sizeLabel: '808 МБ',
    expectedMinBytes: 750000000,
    description: 'Золотая середина скорости и интеллекта. Отлично держит контекст диалога.',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    quantization: 'Q4_K_M',
  },
  {
    id: 'deepseek-r1-distill-qwen-1.5b',
    name: 'DeepSeek-R1 Distill (1.5B)',
    sizeLabel: '1.12 ГБ',
    expectedMinBytes: 1050000000,
    description: 'Модель с цепочкой рассуждений (<think>). Лучшая для логики, анализа и сложных задач.',
    url: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    filename: 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    quantization: 'Q4_K_M',
  },
  {
    id: 'qwen2.5-1.5b-instruct',
    name: 'Qwen 2.5 (1.5B) Instruct',
    sizeLabel: '935 МБ',
    expectedMinBytes: 850000000,
    description: 'Топовое качество текста и грамотный русский язык. Формат Q4_0 ускорен под SIMD.',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_0.gguf',
    filename: 'qwen2.5-1.5b-instruct-q4_0.gguf',
    quantization: 'Q4_0 (Fast SIMD)',
  },
  {
    id: 'qwen2.5-coder-1.5b-instruct',
    name: 'Qwen 2.5 Coder (1.5B)',
    sizeLabel: '1.12 ГБ',
    expectedMinBytes: 1050000000,
    description: 'Специализированная модель для кода (TypeScript, Python, верстка, поиск багов офлайн).',
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    quantization: 'Q4_K_M',
  },
];

export const DEFAULT_GENERATION_SETTINGS = {
  systemPrompt: 'Ты — умный ИИ-ассистент. Отвечай кратко, точно и по делу на русском языке.',
  temperature: 0.6,
  topP: 0.9,
  contextSize: 1024,
  nPredict: 512,
  nThreads: 4,
};

export const LLAMA_STOP_TOKENS = [
  '<|im_end|>',
  '<|endoftext|>',
  '<|eot_id|>',
  '</s>',
  '[DONE]',
];
