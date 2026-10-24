import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThinkBlocks, formatBytes, formatSpeed } from './thinkParser';

test('parseThinkBlocks with standard text without thinking tags', () => {
  const result = parseThinkBlocks('Привет, как дела?');
  assert.equal(result.hasThinkBlock, false);
  assert.equal(result.isThinkingActive, false);
  assert.equal(result.thinking, '');
  assert.equal(result.answer, 'Привет, как дела?');
});

test('parseThinkBlocks with closed think block', () => {
  const input = '<think>\nСначала подумаем о структуре алгоритма.\nВремя O(N).\n</think>\nВот готовый ответ: используйте хеш-таблицу.';
  const result = parseThinkBlocks(input);
  assert.equal(result.hasThinkBlock, true);
  assert.equal(result.isThinkingActive, false);
  assert.equal(result.thinking, 'Сначала подумаем о структуре алгоритма.\nВремя O(N).');
  assert.equal(result.answer, 'Вот готовый ответ: используйте хеш-таблицу.');
});

test('parseThinkBlocks during active streaming (unclosed think tag)', () => {
  const input = '<think>\nМодель сейчас активно рассуждает в процессе...';
  const result = parseThinkBlocks(input);
  assert.equal(result.hasThinkBlock, true);
  assert.equal(result.isThinkingActive, true);
  assert.equal(result.thinking, '\nМодель сейчас активно рассуждает в процессе...');
  assert.equal(result.answer, '');
});

test('formatBytes correctly formats MB and GB', () => {
  assert.equal(formatBytes(0), '0 Б');
  assert.equal(formatBytes(510 * 1024 * 1024, 0), '510 МБ');
  assert.equal(formatBytes(1.12 * 1024 * 1024 * 1024, 2), '1.12 ГБ');
});

test('formatSpeed correctly formats megabytes per second', () => {
  assert.equal(formatSpeed(0), '0 МБ/с');
  assert.equal(formatSpeed(8.4 * 1024 * 1024), '8.4 МБ/с');
});
