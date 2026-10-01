# Podcast AI Co-Host

Turn written content into a dialogue podcast with an AI co-host. Start with a generated script, record your own lines naturally, and let the next AI response adapt to what you actually said.

## Features

- **Script generation**: Turn an article, blog post, or other source material into a conversation with configurable host names, roles, and tones.
- **Adaptive responses**: After you stop a recording, Boson transcribes your take and Claude rewrites the next AI co-host line using your actual words and the surrounding script.
- **Recording and speech**: Record your voice in the browser and generate the AI co-host's speech with Boson.
- **Script editing**: Edit individual lines, choose which host starts, and use **Add Round** to extend the conversation by two lines.
- **Audio export**: Combine available recordings and generated speech into a downloadable WAV file.
- **Episode metadata**: Generate a summary and chapter markers using the durations of available audio.

Adaptation happens after each recorded take. Review the rewritten AI line and generate its speech before continuing.

## Screenshots

### Setup Tab

![Setup Tab](screenshots/setup.png)

Paste your source material and configure the two hosts with their names, roles, and tones.

### Script Tab

![Script Tab](screenshots/script.png)

Work through the script one line at a time. Recording your take triggers transcription and adaptation of the next AI response; review that response before generating its audio.

## Quick Start

### Prerequisites

- Node.js 20.19 or later. The repository's `.nvmrc` selects Node 24.
- An [Anthropic API key](https://console.anthropic.com/settings/keys) for script generation, adaptation, and metadata.
- A [Boson AI API key](https://www.boson.ai/workspace) with access to Higgs TTS 3 and Higgs Realtime for speech and transcription.
- A browser supporting microphone capture, MediaRecorder, Web Audio, and WebSocket connections. Allow microphone access when prompted. Microphone capture requires localhost or HTTPS.

### Installation

Run these commands from the repository directory:

```bash
# If using nvm, install and select the repository's Node version
nvm install
nvm use

npm install

# Create the environment file only if you do not already have one
cp .env.example .env
```

Edit `.env` with your keys:

```dotenv
ANTHROPIC_API_KEY=your_anthropic_key
BOSON_API_KEY=your_boson_key
```

### Configuration

| Variable | Required | Purpose / default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude requests for scripts, rewrites, and metadata |
| `BOSON_API_KEY` | Yes | Boson speech generation and transcription credentials |
| `ANTHROPIC_WORKSPACE_ID` | For Anthropic keys not scoped to one workspace | Actual workspace ID beginning with `wrkspc_` |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-opus-4-6` |
| `BOSON_VOICE` | No | Defaults to `oliver`; accepts a Boson preset or custom voice ID |

Keep `.env` private. API keys are read by the backend; do not prefix them with `VITE_`. Restart the backend after changing the file.

### Running the App

```bash
npm run dev:all
```

Open the URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

Alternatively, start the backend and frontend in separate terminals:

```bash
npm run server   # Express backend on port 3001
npm run dev      # Vite frontend, normally on port 5173
```

To restart both processes, press **Ctrl+C** and run `npm run dev:all` again. If running separately, restart `npm run server` to reload backend code or environment variables.

## How It Works

1. **Setup**: Paste your content, configure your host and the AI co-host, and choose who starts.
2. **Prompt**: Review and optionally edit the generated prompt before generating the script.
3. **Record your take**: In the Script tab, click **Record** on your line, speak naturally, and click **Stop**.
4. **Wait for adaptation**: The app shows **Transcribing and updating...**. Boson transcribes the recording. Once Boson confirms the transcript is complete, Claude rewrites the next AI co-host line. The transcript appears beneath your line.
5. **Review and generate speech**: Review or edit the adapted AI line, then click **Generate** to create its speech. A successful rewrite clears any audio from the previous version of that line. Manual text edits also clear that line's audio.
6. **Continue the episode**: Record the next author line and repeat. Use **Add Round** to append another exchange when needed.
7. **Export and metadata**: Finish recording and generating the desired lines, then use **Export Audio** for WAV and **Meta Info** for a summary and chapters.

If there is no later AI line, your recording is still transcribed, but no response is rewritten. AI lines can also be generated directly from the original script.

Export skips lines without audio and clips that cannot be decoded. To export the full dialogue, make sure every desired line has playable audio. Metadata timing uses available audio durations; regenerate metadata after changing audio.

## Saved Data and Audio

Source text, host settings, the starting speaker, and the script are saved in your browser's localStorage.

Recordings, generated audio, and recording transcripts are held in browser memory. Refreshing or closing the page discards them. Export your audio before leaving the page.

Recorded audio is sent to Boson for transcription. AI dialogue text is sent to Boson for speech generation. Source material, script context, and recording transcripts are sent to Anthropic for generation and adaptation. Audio is not saved on the Express server.

## Troubleshooting

| Problem | What to check |
|---|---|
| Anthropic requires `anthropic-workspace-id` | Set `ANTHROPIC_WORKSPACE_ID` to the actual `wrkspc_...` ID, or use a key scoped to a workspace. Restart the backend. |
| Boson rejects transcription access | Check `BOSON_API_KEY` and your account's Higgs Realtime access. Restart after changing the key. |
| Recording will not start | Allow microphone access, check the selected microphone, and use localhost or HTTPS in a browser supporting recording. |
| Transcription fails, times out, or disconnects | Your recording remains available. Check the connection and click **Retry transcription**. If no speech was detected, record a new take. |
| Claude cannot rewrite the next line | Read the rewrite error and check Anthropic configuration. You can edit the AI line manually or record another take after resolving the error. **Retry transcription** appears for transcription failures. |
| Boson reports a rate limit | Wait briefly and retry the failed transcription or speech generation. |
| Saved script returns but audio is missing | Scripts persist locally; audio does not survive a page refresh. Record or generate the clips again. |
| Export is shorter than expected | Missing or undecodable clips are skipped. Check each desired line's playback before exporting. |

## Architecture

```text
Author recording → Boson transcription → Claude adapts the next AI line
                                              ↓
                                      Review / edit the line
                                              ↓
                                      Boson speech generation
                                              ↓
                           Browser combines audio for WAV export
```

The browser converts a stopped recording to 24 kHz mono PCM and connects to Boson Realtime using a short-lived credential minted by the backend. A manual audio commit requests transcription; the app waits for `conversation.item.input_audio_transcription.completed` before asking Claude to rewrite. The permanent Boson API key stays on the backend.

Speech generation uses Higgs TTS 3. Long lines are split into requests of at most 300 characters and joined in browser memory. Playback, duration calculation, and WAV assembly happen in the browser.

### Project Structure

```text
podcast-coord/
├── src/
│   ├── App.jsx                   # Three-tab workflow, script state, export
│   ├── index.jsx                 # React entry point
│   ├── index.css                 # Tailwind styles
│   ├── speech.js                 # TTS requests, chunking, audio assembly
│   ├── transcription.js          # PCM conversion and Boson transcription
│   └── components/
│       ├── AudioControls.jsx     # Speech playback and recording controls
│       ├── Button.jsx
│       ├── Card.jsx
│       └── HostConfig.jsx
├── server.js                     # Anthropic/Boson API endpoints
├── model-response.js             # Claude response text extraction
├── scripts/dev-all.sh            # Starts frontend and backend
├── tests/                        # Response and transcription regression tests
├── vite.config.js                # Frontend dev server and API proxy
├── .env.example                  # Configuration template
└── .env                          # Private API keys (gitignored)
```

### Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, lucide-react.
- **Backend**: Express with the Anthropic SDK and HTTP requests to Boson.
- **Script and adaptation**: Claude for script generation, recorded-take rewrites, extra rounds, and metadata.
- **Transcription**: Boson Higgs Realtime with `higgs-stt-3.1`.
- **Speech**: Boson Higgs TTS 3.
- **Browser audio**: MediaRecorder for capture; Web Audio for decoding, conversion, and WAV export.

### Development Checks

```bash
node --test tests/model-response.test.js tests/transcription.test.js
npm run build
```

The build produces frontend files in `dist/`. The Express backend is still required for API calls; production hosting must also route `/api` requests to it.

## License

Application code is licensed under [MIT](LICENSE).
