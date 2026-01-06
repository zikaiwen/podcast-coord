import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/generate-script', async (req, res) => {
  const { systemPrompt, blogText } = req.body;

  if (!blogText) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!systemPrompt) {
    return res.status(400).json({ error: 'System prompt is required' });
  }

  // Combine the user's prompt with output format instructions
  const fullSystemPrompt = `${systemPrompt}

OUTPUT FORMAT:
Return a JSON array of dialogue objects with this exact structure:
[
  { "speaker": "Host Name", "text": "What they say", "type": "intro|content|question|reaction" }
]

Return ONLY the JSON array, no markdown or explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: 'Generate the podcast script based on the source material provided above.',
        },
      ],
      system: fullSystemPrompt,
    });

    const responseText = message.content[0].text;

    // Parse the JSON response
    let script;
    try {
      script = JSON.parse(responseText);
    } catch {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse script from response');
      }
    }

    res.json({ script });
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({
      error: 'Failed to generate script',
      details: error.message
    });
  }
});

// ElevenLabs Text-to-Speech endpoint
app.post('/api/text-to-speech', async (req, res) => {
  const { text, voiceId } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  // Default to "George" voice if not specified
  const voice = voiceId || 'JBFqnCBsd6RMkjVDRZzb';

  try {
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const audio = await elevenlabs.textToSpeech.convert(voice, {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });

    // Collect chunks from the ReadableStream
    const reader = audio.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const audioBuffer = Buffer.concat(chunks);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength,
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      details: error.message,
    });
  }
});

// Generate episode summary
app.post('/api/generate-summary', async (req, res) => {
  const { scriptText, speakers, totalDuration } = req.body;

  if (!scriptText) {
    return res.status(400).json({ error: 'Script text is required' });
  }

  const systemPrompt = `You are a podcast episode summarizer. Given a podcast script, write a 2-3 sentence summary describing what the episode is about.

GUIDELINES:
- Write in third person (e.g., "In this episode, [host] discusses...")
- Mention the main topic and key points covered
- Keep it concise and engaging
- Do not include timestamps or technical details

Return ONLY the summary text, no additional formatting or explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Summarize this podcast episode (${totalDuration} long, featuring ${speakers.join(' and ')}):\n\n${scriptText}`,
        },
      ],
      system: systemPrompt,
    });

    const summary = message.content[0].text;
    res.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message,
    });
  }
});

// Generate meta-info/chapter markers for podcast based on actual audio
app.post('/api/generate-meta', async (req, res) => {
  const { script, audioDurations } = req.body;

  if (!script || !Array.isArray(script) || script.length === 0) {
    return res.status(400).json({ error: 'Script is required' });
  }

  if (!audioDurations || audioDurations.length === 0) {
    return res.status(400).json({ error: 'No audio available. Please generate TTS or record your lines first.' });
  }

  // Filter script to only include lines with audio and calculate timestamps
  const linesWithAudio = [];
  let cumulativeTime = 0;

  for (let i = 0; i < script.length; i++) {
    const duration = audioDurations[i];
    if (duration && duration > 0) {
      linesWithAudio.push({
        index: i,
        speaker: script[i].speaker,
        text: script[i].text,
        startTime: cumulativeTime,
        duration: duration,
      });
      cumulativeTime += duration;
    }
  }

  if (linesWithAudio.length === 0) {
    return res.status(400).json({ error: 'No audio available. Please generate TTS or record your lines first.' });
  }

  // Format timestamp as HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format script with actual timestamps for the prompt
  const scriptText = linesWithAudio.map(line =>
    `[${formatTime(line.startTime)}] ${line.speaker}: ${line.text}`
  ).join('\n\n');

  const totalDuration = formatTime(cumulativeTime);

  const systemPrompt = `You are a podcast metadata generator. Given a podcast script WITH ACTUAL TIMESTAMPS, generate episode metadata with chapter markers.

The timestamps provided are REAL - use them exactly as given when creating chapter markers.

OUTPUT FORMAT:
Generate metadata in this exact format:

In this episode, [hosts] discuss [topic summary in 1-2 sentences].

(00:00:00) Introduction
(HH:MM:SS) [Chapter title based on dialogue at that timestamp]
...

Total Duration: ${totalDuration}

GUIDELINES:
- Start with a brief summary sentence describing who discusses what
- Create 3-6 chapter markers based on topic transitions
- USE THE EXACT TIMESTAMPS from the script - do not estimate
- Chapter titles should be concise (2-5 words) and descriptive
- First chapter should always be "Introduction" at 00:00:00

Return ONLY the metadata text, no additional explanation.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate podcast metadata and chapter markers for this script:\n\n${scriptText}`,
        },
      ],
      system: systemPrompt,
    });

    const metaInfo = message.content[0].text;
    res.json({ metaInfo });
  } catch (error) {
    console.error('Error generating meta-info:', error);
    res.status(500).json({
      error: 'Failed to generate meta-info',
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
