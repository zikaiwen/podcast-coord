// Keep requests within Boson's recommended input size, preferring sentence boundaries.
export function splitSpeechText(text, limit = 300) {
  const chunks = [];
  let remaining = Array.from(text.trim());
  while (remaining.length) {
    let end = Math.min(limit, remaining.length);
    if (remaining.length > limit) {
      const prefix = remaining.slice(0, limit).join('');
      const boundaries = [...prefix.matchAll(/[.!?。！？]\s*|\s+/gu)];
      const sentence = boundaries.filter(match => /[.!?。！？]/u.test(match[0])).pop();
      const boundary = sentence || boundaries.pop();
      if (boundary) end = Array.from(prefix.slice(0, boundary.index + boundary[0].length)).length;
    }
    const chunk = remaining.slice(0, end).join('').trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(end);
  }
  return chunks;
}

// Decode each clip separately: concatenating MP3 files can lose audio during export.
export async function joinSpeechAudio(blobs) {
  if (blobs.length === 1) return blobs[0];
  const context = new AudioContext();
  try {
    const buffers = [];
    for (const blob of blobs) buffers.push(await context.decodeAudioData(await blob.arrayBuffer()));
    const frames = buffers.reduce((total, buffer) => total + buffer.length, 0);
    const wav = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(wav);
    const label = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
    label(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true);
    label(8, 'WAVE'); label(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, context.sampleRate, true); view.setUint32(28, context.sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    label(36, 'data'); view.setUint32(40, frames * 2, true);
    let offset = 44;
    for (const buffer of buffers) {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
      for (let i = 0; i < buffer.length; i++) {
        const sample = Math.max(-1, Math.min(1, channels.reduce((sum, channel) => sum + channel[i], 0) / channels.length));
        view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true);
        offset += 2;
      }
    }
    return new Blob([wav], { type: 'audio/wav' });
  } finally {
    await context.close();
  }
}

export async function generateSpeech(text) {
  const chunks = splitSpeechText(text);
  if (!chunks.length) throw new Error('Enter text before generating speech.');
  const blobs = [];
  for (const chunk of chunks) {
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to generate speech');
    }
    const blob = await response.blob();
    if (!blob.size) throw new Error('Boson returned empty audio. Please retry.');
    blobs.push(blob);
  }
  return joinSpeechAudio(blobs);
}
