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
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const blob = await response.blob();

      // Store in parent component's state (browser memory)
      onAudioChange(lineIndex, blob);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // If audio exists, show play button with regenerate option
  if (audioBlob) {
    return (
      <div className="flex items-center gap-1">
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
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const finalTranscriptRef = useRef('');
  const manualRecordingRef = useRef(false);
  const flushedTranscriptRef = useRef(false);

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

  const flushTranscript = () => {
    if (!onTranscriptChange || flushedTranscriptRef.current) return;
    flushedTranscriptRef.current = true;
    onTranscriptChange(lineIndex, transcriptRef.current.trim());
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptRef.current = '';
      finalTranscriptRef.current = '';
      manualRecordingRef.current = true;
      flushedTranscriptRef.current = false;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && onTranscriptChange) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
            } else {
              interimTranscript += transcript;
            }
          }

          transcriptRef.current = `${finalTranscriptRef.current} ${interimTranscript}`.trim();
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
          if (!manualRecordingRef.current) {
            flushTranscript();
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (error) {
          console.warn('Speech recognition could not start:', error);
          recognitionRef.current = null;
        }
      } else {
        recognitionRef.current = null;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        manualRecordingRef.current = false;

        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (error) {
            console.warn('Speech recognition could not stop:', error);
          }
        }

        // Store in parent component's state (browser memory)
        onAudioChange(lineIndex, blob);

        if (onTranscriptChange) {
          if (recognitionRef.current) {
            window.setTimeout(flushTranscript, 250);
          } else {
            flushTranscript();
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
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
      <div className="flex items-center gap-1">
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
          className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all"
          title="Re-record"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all text-xs font-medium"
      title="Record your voice"
    >
      <Mic size={14} />
      Record
    </button>
  );
}
