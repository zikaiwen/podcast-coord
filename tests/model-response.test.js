import test from 'node:test';
import assert from 'node:assert/strict';
import { extractModelText } from '../model-response.js';

test('extracts rewrite JSON after a non-text block', () => {
  const text = extractModelText({ content: [
    { type: 'thinking', thinking: 'Consider the transcript.' },
    { type: 'text', text: '{"text":"That is interesting.","type":"reaction"}' },
  ] });
  assert.equal(JSON.parse(text).text, 'That is interesting.');
});

test('collects all text blocks and ignores other content', () => {
  assert.equal(extractModelText({ content: [
    { type: 'text', text: '{"text":' },
    { type: 'tool_use', id: 'example' },
    { type: 'text', text: '"Hello"}' },
  ] }), '{"text":"Hello"}');
});

test('missing or empty text produces a useful error instead of trim crash', () => {
  for (const message of [undefined, {}, { content: [] }, { content: [{ type: 'thinking' }] }, { content: [{ type: 'text', text: ' ' }] }]) {
    assert.throws(() => extractModelText(message), /did not include any text/);
  }
});

test('rejects truncated responses before parsing incomplete JSON', () => {
  assert.throws(() => extractModelText({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"text":' }] }), /output limit/);
});
