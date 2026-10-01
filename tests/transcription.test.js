import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePcm16, transcribePcm } from '../src/transcription.js';

class MockSocket {
  static instances = [];
  sent = [];
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    MockSocket.instances.push(this);
    queueMicrotask(() => this.onopen?.());
  }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.closed = true; }
  emit(message) { this.onmessage({ data: JSON.stringify(message) }); }
}

const withSocket = async fn => {
  const original = globalThis.WebSocket;
  globalThis.WebSocket = MockSocket;
  try { await fn(); } finally { globalThis.WebSocket = original; }
};

test('PCM encoding clips and uses signed little-endian samples', () => {
  const view = new DataView(encodePcm16(new Float32Array([-2, -0.5, 0, 0.5, 2])).buffer);
  assert.deepEqual(Array.from({ length: 5 }, (_, i) => view.getInt16(i * 2, true)), [-32768, -16384, 0, 16384, 32767]);
});

test('manual transcription waits for session, chunks audio, commits once, and never generates a reply', () => withSocket(async () => {
  const pending = transcribePcm(new Uint8Array(96002), 'bai-eph-test');
  const socket = MockSocket.instances.at(-1);
  await Promise.resolve();
  assert.equal(socket.sent.length, 1);
  assert.equal(socket.sent[0].session.audio.input.turn_detection, null);
  assert.equal(socket.sent[0].session.audio.input.transcription.model, 'higgs-stt-3.1');
  socket.emit({ type: 'session.created' });
  socket.emit({ type: 'session.updated' });
  assert.equal(socket.sent.filter(event => event.type === 'input_audio_buffer.append').length, 3);
  assert.equal(socket.sent.filter(event => event.type === 'input_audio_buffer.commit').length, 1);
  assert(!socket.sent.some(event => event.type === 'response.create'));
  socket.emit({ type: 'input_audio_buffer.committed', item_id: 'recording' });
  socket.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'other', transcript: 'Wrong take' });
  assert(!socket.closed);
  socket.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'recording', transcript: ' Hello world. ' });
  assert.equal(await pending, 'Hello world.');
  assert(socket.closed);
}));

test('empty speech and provider failures are retryable errors', () => withSocket(async () => {
  for (const event of [
    { type: 'conversation.item.input_audio_transcription.completed', transcript: '' },
    { type: 'error', error: { message: 'Access denied' } },
  ]) {
    const pending = transcribePcm(new Uint8Array(4800), 'bai-eph-test');
    const check = assert.rejects(pending, event.type === 'error' ? /Access denied/ : /No speech/);
    MockSocket.instances.at(-1).emit(event);
    await check;
  }
}));

test('cancellation and timeout close the socket', () => withSocket(async () => {
  const controller = new AbortController();
  const pending = transcribePcm(new Uint8Array(4800), 'bai-eph-test', { signal: controller.signal });
  const socket = MockSocket.instances.at(-1);
  const check = assert.rejects(pending, { name: 'AbortError' });
  controller.abort();
  await check;
  assert(socket.closed);
  await assert.rejects(transcribePcm(new Uint8Array(4800), 'bai-eph-test', { timeoutMs: 5 }), /timed out/);
  assert(MockSocket.instances.at(-1).closed);
}));
