import { transcribeRecording } from '../transcription';
import { generateSpeech } from '../speech';
import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, Volume2, Mic, Square, RotateCcw, Check, Circle } from 'lucide-react';

// Audio status badge component
export function AudioStatusBadge({ hasAudio, isAuthor }) {
  if (hasAudio) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
        <Check size={10} />
        Ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
      <Circle size={10} />
      {isAuthor ? 'Needs Recording' : 'Not Generated'}
    </span>
  );
}

// Text-to-Speech button for AI Co-Host lines (audio stored in browser memory)
export function TTSButton({ text, lineIndex, audioBlob, onAudioChange }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // Create object URL when audioBlob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
      audioRef.current = null;
    }
  }, [audioBlob]);

  const handlePlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const generateTTS = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const blob = await generateSpeech(text);

      // Store in parent component's state (browser memory)
      onAudioChange(lineIndex, blob);
    } catch (error) {
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // If audio exists, show play button with regenerate option
  if (audioBlob) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {generationError && <span role="alert" className="w-full text-xs text-red-400">{generationError}</span>}
        <button
          onClick={handlePlay}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all text-xs font-medium"
          title="Play AI voice"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        {isGenerating ? (
          <div className="p-1.5 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : (
          <button
            onClick={generateTTS}
            className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all"
            title="Regenerate TTS"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    );
  }

  // No audio yet, show generate button
  return (
    <div>
      {generationError && <p role="alert" className="text-xs text-red-400 mb-1">{generationError}</p>}
      <button
        onClick={generateTTS}
        disabled={isGenerating}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all text-xs font-medium disabled:opacity-50"
        title="Generate AI voice"
      >
        {isGenerating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Volume2 size={14} />
        )}
        {isGenerating ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
}

// Recording button for Author lines (audio stored in browser memory)
export function RecordButton({ lineIndex, audioBlob, onAudioChange, onTranscriptChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState(null);
  const transcriptionAbortRef = useRef(null);
  const recordingRunRef = useRef(0);

  useEffect(() => () => {
    recordingRunRef.current += 1;
    transcriptionAbortRef.current?.abort();
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
      recorder.stream.getTracks().forEach(track => track.stop());
    }
    audioRef.current?.pause();
  }, []);

  // Create object URL when audioBlob changes
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  const transcribe = async (blob) => {
    transcriptionAbortRef.current?.abort();
    const controller = new AbortController();
    transcriptionAbortRef.current = controller;
    setIsTranscribing(true);
    setRecordingError(null);
    try {
      const transcript = await transcribeRecording(blob, { signal: controller.signal });
      if (!controller.signal.aborted) await onTranscriptChange?.(lineIndex, transcript);
    } catch (error) {
      if (!controller.signal.aborted) setRecordingError(error.message);
    } finally {
      if (transcriptionAbortRef.current === controller && !controller.signal.aborted) {
        setIsTranscribing(false);
      }
    }
  };

  const startRecording = async () => {
    let stream;
    const run = ++recordingRunRef.current;
    setRecordingError(null);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (run !== recordingRunRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        // Preserve the browser's actual format (WebM, MP4, etc.).
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        onAudioChange(lineIndex, blob);
        if (onTranscriptChange) void transcribe(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      setRecordingError(`Could not start recording: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (!audioUrl) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const resetRecording = () => {
    transcriptionAbortRef.current?.abort();
    setIsTranscribing(false);
    setRecordingError(null);
    audioRef.current?.pause();
    // Clear from parent component's state
    onAudioChange(lineIndex, null);
    setIsPlaying(false);
  };

  if (isRecording) {
    return (
      <button
        onClick={stopRecording}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all text-xs font-medium animate-pulse"
        title="Stop recording"
      >
        <Square size={14} fill="currentColor" />
        Stop
      </button>
    );
  }

  if (audioBlob) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {isTranscribing && <span role="status" className="flex items-center gap-1 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" />Transcribing and updating...</span>}
        {recordingError && <span role="alert" className="w-full text-xs text-red-400">{recordingError}</span>}
        {recordingError && <button onClick={() => transcribe(audioBlob)} disabled={isTranscribing} className="text-xs text-indigo-400 disabled:opacity-50">Retry transcription</button>}
        <button
          onClick={playRecording}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all text-xs font-medium"
          title="Play recording"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={resetRecording}
          disabled={isTranscribing}
          className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all"
          title="Re-record"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {recordingError && <p role="alert" className="text-xs text-red-400 mb-1">{recordingError}</p>}
      <button
        onClick={startRecording}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all text-xs font-medium"
        title="Record your voice"
      >
        <Mic size={14} />
        Record
      </button>
    </div>
  );
}
