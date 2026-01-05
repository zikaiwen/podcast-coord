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

// Text-to-Speech button for AI Co-Host lines with server persistence
export function TTSButton({ text, lineIndex, sessionId, onStatusChange }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(!!audioUrl);
  }, [audioUrl, onStatusChange]);

  // Load existing TTS on mount
  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const loadTTS = async () => {
      try {
        const response = await fetch(`/api/tts/${lineIndex}?sessionId=${sessionId}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => setIsPlaying(false);
          audio.onpause = () => setIsPlaying(false);
          audio.onplay = () => setIsPlaying(true);
        }
      } catch (error) {
        // No TTS exists, that's fine
      } finally {
        setIsLoading(false);
      }
    };

    loadTTS();
  }, [lineIndex, sessionId]);

  const saveTTS = async (audioBlob) => {
    if (!sessionId) return;

    try {
      await fetch(`/api/tts/${lineIndex}?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: audioBlob,
      });
    } catch (error) {
      console.error('Error saving TTS:', error);
    }
  };

  const handlePlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      audioRef.current?.play();
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
      const url = URL.createObjectURL(blob);

      // Clean up old URL if exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);

      // Save to server for persistence
      await saveTTS(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);

      audio.play();
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
      </div>
    );
  }

  // If audio exists, show play button with regenerate option
  if (audioUrl) {
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

// Recording button for Author lines with server persistence
export function RecordButton({ lineIndex, sessionId, onStatusChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(hasRecording);
  }, [hasRecording, onStatusChange]);

  // Load existing recording on mount
  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const loadRecording = async () => {
      try {
        const response = await fetch(`/api/recordings/${lineIndex}?sessionId=${sessionId}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setHasRecording(true);
        }
      } catch (error) {
        // No recording exists, that's fine
      } finally {
        setIsLoading(false);
      }
    };

    loadRecording();
  }, [lineIndex, sessionId]);

  const saveRecording = async (audioBlob) => {
    if (!sessionId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/recordings/${lineIndex}?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/webm' },
        body: audioBlob,
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecording = async () => {
    if (!sessionId) return;

    try {
      await fetch(`/api/recordings/${lineIndex}?sessionId=${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setHasRecording(true);
        stream.getTracks().forEach(track => track.stop());

        // Save to server
        await saveRecording(audioBlob);
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

  const resetRecording = async () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setHasRecording(false);
    setIsPlaying(false);

    // Delete from server
    await deleteRecording();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" />
      </div>
    );
  }

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

  if (hasRecording) {
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
        {isSaving ? (
          <div className="p-1.5 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : (
          <button
            onClick={resetRecording}
            className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 transition-all"
            title="Re-record"
          >
            <RotateCcw size={14} />
          </button>
        )}
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