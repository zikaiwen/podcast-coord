const SAMPLE_RATE = 24000;

export function encodePcm16(samples) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return bytes;
}

async function recordingToPcm(blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const frames = Math.ceil(decoded.duration * SAMPLE_RATE);
    if (frames < SAMPLE_RATE / 10) throw new Error('Record at least a short spoken sentence.');
    const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return encodePcm16((await offline.startRendering()).getChannelData(0));
  } finally {
    await context.close();
  }
}

// A manual commit requests transcription only; we never send response.create.
export function transcribePcm(pcm, secret, { signal, language, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    const socket = new WebSocket('wss://api.boson.ai/v1/realtime', ['realtime', `bai-client-secret.${secret}`]);
    let settled = false;
    let sentAudio = false;
    let committedItemId;
    const finish = (error, transcript) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      socket.close();
      if (error) reject(error);
      else resolve(transcript);
    };
    const cancel = () => finish(new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Boson transcription timed out. Retry transcription.')), timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'session.update',
        session: {
          model: 'higgs-realtime',
          output_modalities: ['text'],
          audio: { input: {
            format: { type: 'audio/pcm', rate: SAMPLE_RATE },
            transcription: { model: 'higgs-stt-3.1', ...(language ? { language } : {}) },
            turn_detection: null,
          } },
        },
      }));
    };
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if ((message.type === 'session.created' || message.type === 'session.updated') && !sentAudio) {
          sentAudio = true;
          // One second per frame, comfortably below Boson's per-event limit.
          for (let offset = 0; offset < pcm.length; offset += SAMPLE_RATE * 2) {
            const bytes = pcm.subarray(offset, offset + SAMPLE_RATE * 2);
            let binary = '';
            for (const byte of bytes) binary += String.fromCharCode(byte);
            socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: btoa(binary) }));
          }
          socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        } else if (message.type === 'input_audio_buffer.committed') {
          committedItemId = message.item_id;
        } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
          if (committedItemId && message.item_id !== committedItemId) return;
          const transcript = typeof message.transcript === 'string' ? message.transcript.trim() : '';
          finish(transcript ? null : new Error('No speech was detected. Try recording again.'), transcript);
        } else if (message.type === 'error' || message.type === 'conversation.item.input_audio_transcription.failed') {
          finish(new Error(message.error?.message || 'Boson transcription failed. Retry transcription.'));
        }
      } catch (error) {
        finish(error);
      }
    };
    socket.onerror = () => finish(new Error('Unable to connect to Boson transcription. Check your connection and Realtime access.'));
    socket.onclose = () => finish(new Error('Boson disconnected before transcription finished. Retry transcription.'));
  });
}

export async function transcribeRecording(blob, { signal } = {}) {
  const pcm = await recordingToPcm(blob);
  const response = await fetch('/api/transcription-session', { method: 'POST', signal });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Unable to start Boson transcription.');
  }
  const { value } = await response.json();
  if (typeof value !== 'string' || !value.startsWith('bai-eph-')) {
    throw new Error('Invalid Boson transcription session.');
  }
  return transcribePcm(pcm, value, { signal, language: navigator.language?.split('-')[0] });
}
