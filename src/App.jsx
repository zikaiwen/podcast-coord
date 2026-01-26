import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Settings,
  FileText,
  Copy,
  Play,
  User,
  Sparkles,
  Download,
  Check,
  ChevronRight,
  Edit3,
  UserCircle,
  Bot,
  Loader2,
  X,
  ListOrdered
} from 'lucide-react';

import Button from './components/Button';
import Card from './components/Card';
import HostConfig from './components/HostConfig';
import { TTSButton, RecordButton, AudioStatusBadge } from './components/AudioControls';

// Storage keys
const STORAGE_KEYS = {
  blogText: 'podcast-coord-blogText',
  hostA: 'podcast-coord-hostA',
  hostB: 'podcast-coord-hostB',
  script: 'podcast-coord-script',
  startingSpeaker: 'podcast-coord-startingSpeaker',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('setup'); // setup, generate, script
  const [blogText, setBlogText] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Host State - Host A is You, Host B is AI
  const [hostA, setHostA] = useState({ name: 'Your Name', role: 'expert', tone: 'Passionate and informative' });
  const [hostB, setHostB] = useState({ name: 'AI Co-Pilot', role: 'interviewer', tone: 'Curious and supportive' });

  // Starting speaker preference: 'ai' or 'author'
  const [startingSpeaker, setStartingSpeaker] = useState('ai');

  // Demo Script State
  const [script, setScript] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Audio blobs stored in browser memory (index -> Blob)
  const [audioBlobs, setAudioBlobs] = useState({});

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Editing state - which line index is being edited (-1 = none)
  const [editingIdx, setEditingIdx] = useState(-1);
  const [editingText, setEditingText] = useState('');

  // Meta-info state
  const [metaInfo, setMetaInfo] = useState('');
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [showMetaInfo, setShowMetaInfo] = useState(false);
  const [metaCopied, setMetaCopied] = useState(false);

  // Update audio blob for a specific line (stored in browser memory)
  const handleAudioChange = (idx, blob) => {
    setAudioBlobs(prev => {
      const updated = { ...prev };
      if (blob) {
        updated[idx] = blob;
      } else {
        delete updated[idx];
      }
      return updated;
    });
  };

  // Export audio - stitch all available audio blobs from browser memory
  const exportAudio = async () => {
    if (script.length === 0) return;

    setIsExporting(true);
    try {
      const audioContext = new AudioContext();
      const audioBuffers = [];

      // Decode each blob in order
      for (let i = 0; i < script.length; i++) {
        const blob = audioBlobs[i];
        if (!blob) continue;

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioBuffers.push(audioBuffer);
        } catch (err) {
          console.warn(`Skipping line ${i}:`, err);
        }
      }

      if (audioBuffers.length === 0) {
        alert('No audio files available to export. Generate TTS or record your lines first.');
        return;
      }

      // Calculate total length
      const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
      const outputBuffer = audioContext.createBuffer(
        1, // mono output
        totalLength,
        audioContext.sampleRate
      );

      // Concatenate all audio
      let offset = 0;
      for (const buf of audioBuffers) {
        // Mix down to mono if stereo
        const channelData = buf.numberOfChannels > 1
          ? buf.getChannelData(0).map((v, i) => (v + buf.getChannelData(1)[i]) / 2)
          : buf.getChannelData(0);

        outputBuffer.copyToChannel(new Float32Array(channelData), 0, offset);
        offset += buf.length;
      }

      // Convert to WAV
      const wavBlob = audioBufferToWav(outputBuffer);

      // Download
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcast-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audio: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper: Convert AudioBuffer to WAV Blob
  function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const samples = buffer.getChannelData(0);
    const dataLength = samples.length * bytesPerSample;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Load persisted data on mount
  useEffect(() => {
    const savedBlogText = localStorage.getItem(STORAGE_KEYS.blogText);
    const savedHostA = localStorage.getItem(STORAGE_KEYS.hostA);
    const savedHostB = localStorage.getItem(STORAGE_KEYS.hostB);
    const savedScript = localStorage.getItem(STORAGE_KEYS.script);

    if (savedBlogText) setBlogText(savedBlogText);
    if (savedHostA) setHostA(JSON.parse(savedHostA));
    if (savedHostB) setHostB(JSON.parse(savedHostB));

    const savedStartingSpeaker = localStorage.getItem(STORAGE_KEYS.startingSpeaker);
    if (savedStartingSpeaker) setStartingSpeaker(savedStartingSpeaker);

    // If we have a saved script, load it and go directly to script view
    if (savedScript) {
      const parsedScript = JSON.parse(savedScript);
      if (parsedScript.length > 0) {
        setScript(parsedScript);
        setActiveTab('script');
      }
    }
  }, []);

  // Persist blogText when it changes
  useEffect(() => {
    if (blogText) {
      localStorage.setItem(STORAGE_KEYS.blogText, blogText);
    }
  }, [blogText]);

  // Persist hosts when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.hostA, JSON.stringify(hostA));
  }, [hostA]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.hostB, JSON.stringify(hostB));
  }, [hostB]);

  // Persist starting speaker preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.startingSpeaker, startingSpeaker);
  }, [startingSpeaker]);

  // Persist script when it changes
  useEffect(() => {
    if (script.length > 0) {
      localStorage.setItem(STORAGE_KEYS.script, JSON.stringify(script));
    }
  }, [script]);

  // Auto-resize textarea
  const textareaRef = useRef(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [blogText]);

  // Generate the "System Prompt" based on config
  const generateSystemPrompt = () => {
    const startingInstruction = startingSpeaker === 'ai'
      ? `- Start with ${hostB.name} introducing ${hostA.name} and the topic.`
      : `- Start with ${hostA.name} introducing themselves and the topic, with ${hostB.name} responding.`;

    const prompt = `
TASK: Create a dialogue podcast script featuring a conversation between two hosts.

ROLES:
- HOST A: ${hostA.name}. Role: ${hostA.role}. Tone: ${hostA.tone}.

- HOST B: ${hostB.name}. Role: ${hostB.role}. Tone: ${hostB.tone}.

GUIDELINES:
${startingInstruction}
- Create a natural back-and-forth dialogue between the two hosts.
- Break the source content into conversational segments.
- Each host should embody their role and tone.
- Create 6-10 dialogue exchanges.

SOURCE MATERIAL:
"""
${blogText}
"""
    `.trim();
    setGeneratedPrompt(prompt);
    setActiveTab('generate');
  };

  // State for API errors
  const [apiError, setApiError] = useState(null);

  // State for editing prompt
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  // Generate script using Claude API
  const generateScript = async () => {
    setIsSimulating(true);
    setApiError(null);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: generatedPrompt,
          blogText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate script');
      }

      const data = await response.json();
      setScript(data.script);
      setAudioBlobs({}); // Clear audio blobs for new script
      setActiveTab('script');
    } catch (error) {
      console.error('Error generating script:', error);
      setApiError(error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to determine if a line is from the author (Host A)
  // Compares speaker name to hostA.name to identify author lines
  const isAuthorLine = (line) => {
    if (script.length === 0) return false;
    // Match speaker name to hostA (the author)
    return line.speaker === hostA.name;
  };

  // Start editing a line
  const startEditing = (idx) => {
    setEditingIdx(idx);
    setEditingText(script[idx].text);
  };

  // Save edited line
  const saveEdit = (idx) => {
    if (editingText.trim() === '') return;
    setScript(prev => prev.map((line, i) =>
      i === idx ? { ...line, text: editingText } : line
    ));
    // Clear audio blob since text changed
    handleAudioChange(idx, null);
    setEditingIdx(-1);
    setEditingText('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIdx(-1);
    setEditingText('');
  };

  // Generate meta-info/chapter markers based on actual audio in browser memory
  const generateMetaInfo = async () => {
    if (script.length === 0) return;

    // Check if any audio exists
    const hasAnyAudio = Object.keys(audioBlobs).length > 0;
    if (!hasAnyAudio) {
      alert('No audio available. Please generate TTS or record your lines first.');
      return;
    }

    setIsGeneratingMeta(true);
    try {
      const audioContext = new AudioContext();
      const audioDurations = [];

      // Get duration from each audio blob in memory
      for (let i = 0; i < script.length; i++) {
        const blob = audioBlobs[i];
        if (!blob) {
          audioDurations.push(0);
          continue;
        }

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioDurations.push(audioBuffer.duration);
        } catch (err) {
          console.warn(`Could not get duration for line ${i}:`, err);
          audioDurations.push(0);
        }
      }

      // Call API to generate meta-info with summary and chapter markers
      const response = await fetch('/api/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, audioDurations }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate meta-info');
      }

      const data = await response.json();
      setMetaInfo(data.metaInfo);
      setShowMetaInfo(true);
    } catch (error) {
      console.error('Error generating meta-info:', error);
      alert('Failed to generate meta-info: ' + error.message);
    } finally {
      setIsGeneratingMeta(false);
    }
  };

  // Copy meta-info to clipboard
  const copyMetaInfo = () => {
    navigator.clipboard.writeText(metaInfo);
    setMetaCopied(true);
    setTimeout(() => setMetaCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg text-white">
              <Mic size={20} />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Podcast <span className="text-xs font-mono text-indigo-400 ml-1">AI CO-HOST</span>
            </h1>
          </div>

          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700/50">
            {[
              { id: 'setup', icon: Settings, label: 'Setup' },
              { id: 'generate', icon: Sparkles, label: 'Prompt' },
              { id: 'script', icon: FileText, label: 'Script' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* VIEW 1: SETUP */}
        {activeTab === 'setup' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-3xl font-bold text-white">Create a dialogue podcast with your AI co-host.</h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Turn your content into an engaging conversation where YOU are the expert and AI helps you shine.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Col: Content */}
              <div className="space-y-4">
                <Card title="Your Content" icon={FileText} className="h-full">
                  <textarea
                    ref={textareaRef}
                    value={blogText}
                    onChange={(e) => setBlogText(e.target.value)}
                    placeholder="Paste your content here..."
                    className="w-full h-96 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none leading-relaxed"
                  />
                  <div className="mt-4 flex justify-between items-center text-sm text-slate-500">
                    <span>{blogText.length} characters</span>
                    {blogText.length === 0 && (
                      <button
                        onClick={() => setBlogText("Supporting Family Discussions About Digital Privacy Through Perspective-Taking\n\nPublished in IEEE Symposium on Security and Privacy (S&P), 2025\nAuthors: Zikai Wen, Lanjing Liu, Yaxing Yao\n\nDigital privacy conversations between parents and children often break down due to differing perspectives and communication gaps. In this study, we conducted a structured activity with 13 parent-child dyads to promote perspective-taking in privacy discussions.\n\nOur findings reveal key communication challenges that families face when discussing online privacy. Through scaffolded, moderated conversations, we helped parents and children understand each other's viewpoints better. The results show that families benefit from treating privacy as a spectrum rather than a binary concept, and recognizing that privacy needs are highly context-dependent.\n\nThis research provides practical insights for designing tools and interventions that can support healthier family dialogues about digital privacy.")}
                        className="text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Paste sample text
                      </button>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Col: Hosts */}
              <div className="space-y-6">
                <Card title="Cast Configuration" icon={User}>
                  <div className="grid gap-8">
                    <HostConfig
                      label="Host A: You"
                      host={hostA}
                      onChange={setHostA}
                      isAi={false}
                    />
                    <div className="h-px bg-slate-700/50" />
                    <HostConfig
                      label="Host B: AI Co-Host"
                      host={hostB}
                      onChange={setHostB}
                      isAi={true}
                    />
                    <div className="h-px bg-slate-700/50" />
                    <div className="space-y-2">
                      <label className="block text-sm text-slate-400">Who starts the conversation?</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStartingSpeaker('ai')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                            startingSpeaker === 'ai'
                              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <Bot size={16} />
                          AI Co-Host
                        </button>
                        <button
                          onClick={() => setStartingSpeaker('author')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                            startingSpeaker === 'author'
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <UserCircle size={16} />
                          You
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Button
                  onClick={generateSystemPrompt}
                  disabled={!blogText}
                  className="w-full py-4 text-lg shadow-indigo-500/20 shadow-xl"
                  icon={Sparkles}
                >
                  Generate Script Prompt
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: PROMPT GENERATION */}
        {activeTab === 'generate' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Co-Host Prompt</h2>
              <p className="text-slate-400">Review before generation.</p>
            </div>

            <div className="bg-slate-900 rounded-xl border border-indigo-500/30 p-6 relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isEditingPrompt && (
                  <button
                    onClick={() => setIsEditingPrompt(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-medium transition-all"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600 text-xs font-medium transition-all"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Full Prompt'}
                </button>
              </div>

              <div className="font-mono text-sm text-indigo-300 mb-2 uppercase tracking-wider">Script Generation Prompt</div>
              {!generatedPrompt ? (
                <div className="text-center py-12">
                  <div className="text-slate-500 mb-4">
                    <Sparkles size={48} className="mx-auto opacity-30" />
                  </div>
                  <p className="text-slate-400 mb-2">No prompt generated yet</p>
                  <p className="text-slate-500 text-sm">Go to Setup to add your content and configure hosts first.</p>
                </div>
              ) : isEditingPrompt ? (
                <>
                  <textarea
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-300 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    rows={16}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-700/50">
                    <button
                      onClick={() => {
                        generateSystemPrompt();
                        setIsEditingPrompt(false);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs"
                    >
                      <X size={12} />
                      Reset
                    </button>
                    <button
                      onClick={() => setIsEditingPrompt(false)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                    >
                      <Check size={12} />
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <pre className="whitespace-pre-wrap text-slate-300 font-mono text-sm leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {generatedPrompt}
                </pre>
              )}
            </div>

            {generatedPrompt ? (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                    <Play size={24} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Preview the Dynamic</h3>
                    <p className="text-sm text-slate-400">See a simulation of how the AI will interview you.</p>
                  </div>
                </div>
                <Button onClick={generateScript} variant="primary" icon={ChevronRight} disabled={isSimulating}>
                  {isSimulating ? 'Generating...' : 'Generate Script'}
                </Button>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-700/50 text-slate-400 rounded-lg">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Setup Required</h3>
                    <p className="text-sm text-slate-400">Add your content and configure hosts to generate a prompt.</p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab('setup')} variant="secondary" icon={ChevronRight}>
                  Go to Setup
                </Button>
              </div>
            )}

            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                <strong>Error:</strong> {apiError}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SCRIPT VIEW */}
        {activeTab === 'script' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between mb-6">
               <div>
                <h2 className="text-2xl font-bold text-white">Script Preview</h2>
                <p className="text-slate-400">Edit and generate the show line by line.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateMetaInfo}
                  disabled={isGeneratingMeta || script.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingMeta ? <Loader2 size={18} className="animate-spin" /> : <ListOrdered size={18} />}
                  {isGeneratingMeta ? 'Generating...' : 'Meta Info'}
                </button>
                <button
                  onClick={exportAudio}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isExporting ? 'Exporting...' : 'Export Audio'}
                </button>
              </div>
            </div>

            {/* Meta Info Panel */}
            {showMetaInfo && metaInfo && (
              <div className="mb-8 bg-slate-900 rounded-xl border border-purple-500/30 p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListOrdered size={16} className="text-purple-400" />
                    <span className="font-mono text-sm text-purple-300 uppercase tracking-wider">Episode Meta Info</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyMetaInfo}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-medium transition-all"
                    >
                      {metaCopied ? <Check size={12} /> : <Copy size={12} />}
                      {metaCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setShowMetaInfo(false)}
                      className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed font-mono">
                  {metaInfo}
                </pre>
              </div>
            )}

            {isSimulating ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-1/4" />
                      <div className="h-16 bg-slate-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                {script.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-6 ${!isAuthorLine(line) ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-lg ${
                      isAuthorLine(line)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {isAuthorLine(line) ? <UserCircle size={20} /> : <Bot size={20} />}
                    </div>

                    {/* Speech Bubble */}
                    <div className={`flex flex-col ${editingIdx === idx ? 'max-w-[95%] w-full' : 'max-w-[80%]'} ${!isAuthorLine(line) ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 ml-1 mr-1">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                          {line.speaker}
                        </span>
                        <AudioStatusBadge hasAudio={!!audioBlobs[idx]} isAuthor={isAuthorLine(line)} />
                      </div>
                      <div className={`p-5 rounded-2xl text-slate-200 leading-relaxed shadow-sm group hover:ring-2 ring-indigo-500/50 transition-all relative ${
                        editingIdx === idx ? 'w-full' : ''
                      } ${
                        isAuthorLine(line)
                          ? 'bg-slate-800 rounded-tl-none border-l-4 border-l-indigo-500'
                          : 'bg-slate-800/60 rounded-tr-none border-r-4 border-r-emerald-500'
                      }`}>
                        {editingIdx === idx ? (
                          <>
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-transparent text-slate-200 leading-relaxed outline-none resize-none"
                              autoFocus
                              rows={Math.max(3, editingText.split('\n').length)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.metaKey) {
                                  saveEdit(idx);
                                } else if (e.key === 'Escape') {
                                  cancelEdit();
                                }
                              }}
                            />
                            <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-700/50">
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs"
                              >
                                <X size={12} />
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(idx)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs"
                              >
                                <Check size={12} />
                                Save
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {line.text}
                            <button
                              onClick={() => startEditing(idx)}
                              className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-slate-700 p-1.5 rounded-full shadow-lg text-slate-300 hover:text-white transition-all"
                            >
                              <Edit3 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="mt-2 ml-1 mr-1">
                        {isAuthorLine(line) ? (
                          <RecordButton
                            lineIndex={idx}
                            audioBlob={audioBlobs[idx]}
                            onAudioChange={handleAudioChange}
                          />
                        ) : (
                          <TTSButton
                            text={line.text}
                            lineIndex={idx}
                            audioBlob={audioBlobs[idx]}
                            onAudioChange={handleAudioChange}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-center pt-8 opacity-50">
                  <span className="text-sm text-slate-500 italic">End of Preview</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
