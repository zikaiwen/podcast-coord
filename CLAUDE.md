# CLAUDE.md - AI Assistant Guide for podcast-coord

## Project Overview

**podcast-coord** is a podcast AI co-host tool that transforms written content into engaging dialogue podcasts. Users provide source material, configure two hosts (the human author and an AI co-host), and the system generates a conversational script with text-to-speech and recording capabilities.

- **License**: MIT
- **Author**: Zikai Alex Wen

## Repository Structure

```
podcast-coord/
├── src/
│   ├── App.jsx              # Main React application with 3-tab workflow
│   ├── main.jsx             # React entry point
│   ├── index.css            # Tailwind CSS styles
│   └── components/
│       ├── AudioControls.jsx # TTS and recording controls (TTSButton, RecordButton, AudioStatusBadge)
│       ├── Button.jsx        # Reusable button component with variants
│       ├── Card.jsx          # Card container component
│       └── HostConfig.jsx    # Host configuration form
├── server.js                 # Express backend with API endpoints
├── audio/                    # Server-side audio storage (gitignored)
├── vite.config.js            # Vite config with API proxy
├── tailwind.config.js        # Tailwind configuration
├── package.json              # Dependencies and scripts
└── .env                      # API keys (gitignored)
```

## Technology Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js (Node.js)
- **AI**: Claude API (Anthropic) for script generation and metadata
- **TTS**: ElevenLabs API for AI co-host voice synthesis
- **Audio**: Web Audio API for recording, playback, and export

## Commands Reference

```bash
# Install dependencies
npm install

# Start both frontend and backend (recommended)
npm run dev:all

# Or run separately:
npm run dev      # Start Vite dev server (port 5173)
npm run server   # Start Express server (port 3001)

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file (see `.env.example`):
```
ANTHROPIC_API_KEY=your_anthropic_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Architecture Notes

### Application Flow

1. **Setup Tab**: User pastes source content and configures two hosts (Author + AI Co-Host)
2. **Prompt Tab**: System generates a script prompt, user can edit before generation
3. **Script Tab**: Displays generated dialogue, allows editing, TTS generation, recording, and export

### Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-script` | POST | Generate podcast script using Claude |
| `/api/text-to-speech` | POST | Generate TTS audio via ElevenLabs |
| `/api/generate-meta` | POST | Generate episode summary + chapter markers |
| `/api/tts/:lineIndex` | GET/POST/DELETE | Manage TTS audio files |
| `/api/recordings/:lineIndex` | GET/POST/DELETE | Manage user recordings |
| `/api/audio-status` | GET | Get audio status for all lines |

### Data Persistence

- **LocalStorage**: Script, host config, blog text, session ID
- **Server**: Audio files stored in `audio/` directory with session-based naming
- **Session ID**: Generated per script to isolate audio files

### Audio Processing

- TTS audio: MP3 format from ElevenLabs
- Recordings: WebM format from browser MediaRecorder
- Export: WAV format, concatenates all audio in order
- Meta-info: Calculates real timestamps from audio durations

## Code Style Conventions

- React functional components with hooks
- Tailwind CSS for styling (dark theme)
- ES modules throughout
- Async/await for API calls
- lucide-react for icons

## AI Assistant Instructions

### Before Making Changes

1. **Read before editing**: Always read files before modifying them
2. **Understand context**: Review related files to understand the broader codebase
3. **Check API contracts**: Ensure frontend/backend changes stay in sync

### Key Files to Understand

- `src/App.jsx`: Main application state and workflow logic
- `src/components/AudioControls.jsx`: Complex audio state management
- `server.js`: All API endpoints and Claude/ElevenLabs integrations

### What to Avoid

- Don't add features beyond what was requested
- Don't refactor unrelated code while fixing bugs
- Don't commit `.env` or `audio/` directory
- Don't change the 3-tab workflow structure without explicit request

### Security Considerations

- API keys stored in `.env` (never commit)
- Audio files stored server-side with session isolation
- No user authentication (local tool only)