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
  RefreshCw,
  Edit3,
  UserCircle,
  Bot
} from 'lucide-react';

import Button from './components/Button';
import Card from './components/Card';
import HostConfig from './components/HostConfig';

export default function App() {
  const [activeTab, setActiveTab] = useState('setup'); // setup, generate, script
  const [blogText, setBlogText] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Host State - Host A is Author, Host B is AI
  const [hostA, setHostA] = useState({ name: 'Me (Author)', role: 'author', tone: 'Passionate and informative' });
  const [hostB, setHostB] = useState({ name: 'AI Co-Pilot', role: 'interviewer', tone: 'Curious and supportive' });

  // Demo Script State
  const [script, setScript] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

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
    const prompt = `
TASK: Create a podcast script where an Author (Host 1) discusses their blog post with an AI Co-Host (Host 2).

ROLES:
- HOST 1 (THE AUTHOR): ${hostA.name}. Tone: ${hostA.tone}.
  * They are the expert. Their lines should be based directly on the blog content but rephrased to sound like spoken, natural English.

- HOST 2 (THE AI ASSISTANT): ${hostB.name}. Role: ${hostB.role}. Tone: ${hostB.tone}.
  * Their job is to set the Author up for success. They ask leading questions, express amazement, or ask for clarification to help the Author shine.

GUIDELINES:
- Start with the AI Co-Host introducing the Author and the topic.
- Break the blog post into conversational chunks.
- The AI should not lecture; the AI should interview.
- Ensure the Author sounds confident but approachable.

SOURCE MATERIAL (BLOG POST):
"""
${blogText.substring(0, 300)}... [Truncated for preview, full text attached below]
"""
    `.trim();
    setGeneratedPrompt(prompt);
    setActiveTab('generate');
  };

  // Mock function to simulate "Receiving" a script
  const simulateScriptGeneration = () => {
    setIsSimulating(true);
    // Simulate API delay
    setTimeout(() => {
      setScript([
        { speaker: hostB.name, text: "Hey everyone! I am super excited for today's episode because we have the author here to talk about something that's been on everyone's mind.", type: 'intro' },
        { speaker: hostA.name, text: "Thanks! It's great to be here. I really wanted to unpack this idea that remote work is actually making us MORE social, not less.", type: 'content' },
        { speaker: hostB.name, text: "Wait, really? Because I feel like I just stare at my cat all day. How does that work?", type: 'question' },
        { speaker: hostA.name, text: "It sounds counterintuitive, right? But think about the office water cooler. You're forced to talk to whoever is there. When you're remote, you have to be INTENTIONAL about who you connect with.", type: 'content' },
        { speaker: hostB.name, text: "Ooh, I love that word: 'Intentional'. So it's quality over quantity?", type: 'reaction' },
        { speaker: hostA.name, text: "Exactly. In the blog post, I mention that we start curating our social lives rather than letting proximity dictate them.", type: 'content' },
      ]);
      setIsSimulating(false);
      setActiveTab('script');
    }, 1500);
  };

  const copyToClipboard = () => {
    const fullPrompt = generatedPrompt.replace('[Truncated for preview, full text attached below]', blogText);
    navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              Blog2Pod <span className="text-xs font-mono text-indigo-400 ml-1">CO-PILOT</span>
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
              <h2 className="text-3xl font-bold text-white">Turn your blog into a conversation.</h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Generate a script where YOU are the expert and an AI co-host helps you tell your story.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Col: Content */}
              <div className="space-y-4">
                <Card title="Your Blog Post" icon={FileText} className="h-full">
                  <textarea
                    ref={textareaRef}
                    value={blogText}
                    onChange={(e) => setBlogText(e.target.value)}
                    placeholder="Paste your blog post content here..."
                    className="w-full h-96 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none leading-relaxed"
                  />
                  <div className="mt-4 flex justify-between items-center text-sm text-slate-500">
                    <span>{blogText.length} characters</span>
                    {blogText.length === 0 && (
                      <button
                        onClick={() => setBlogText("Why Remote Work is Actually Making Us More Social\n\nMany people assume that working from home leads to isolation. However, recent studies suggest the opposite. By removing the forced social interactions of the office water cooler, we become more intentional about who we connect with. We curate our social lives rather than having them dictated by proximity...")}
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
                      label="Host A: YOU (The Author)"
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Your Co-Host Prompt</h2>
                <p className="text-slate-400">Copy this to ChatGPT or Claude to generate your script.</p>
              </div>
              <Button onClick={() => setActiveTab('setup')} variant="ghost">Back</Button>
            </div>

            <div className="bg-slate-900 rounded-xl border border-indigo-500/30 p-6 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={copyToClipboard}
                  variant="secondary"
                  icon={copied ? Check : Copy}
                  className="text-xs"
                >
                  {copied ? 'Copied!' : 'Copy Full Prompt'}
                </Button>
              </div>

              <div className="font-mono text-sm text-indigo-300 mb-2 uppercase tracking-wider">System Prompt Preview</div>
              <pre className="whitespace-pre-wrap text-slate-300 font-mono text-sm leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {generatedPrompt}
                {'\n\n[...Full Blog Text will be appended here...]'}
              </pre>
            </div>

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
              <Button onClick={simulateScriptGeneration} variant="primary" icon={ChevronRight}>
                Simulate Script
              </Button>
            </div>
          </div>
        )}

        {/* VIEW 3: SCRIPT VIEW */}
        {activeTab === 'script' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between mb-8">
               <div>
                <h2 className="text-2xl font-bold text-white">Script Preview</h2>
                <p className="text-slate-400">Read your lines (Host A) while the AI (Host B) guides you.</p>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" icon={RefreshCw} onClick={simulateScriptGeneration}>Regenerate</Button>
                 <Button variant="primary" icon={Download}>Export PDF</Button>
              </div>
            </div>

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
                    className={`flex gap-6 ${line.speaker === hostB.name ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-lg ${
                      line.speaker === hostA.name
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {line.speaker === hostA.name ? <UserCircle size={20} /> : <Bot size={20} />}
                    </div>

                    {/* Speech Bubble */}
                    <div className={`flex flex-col max-w-[80%] ${line.speaker === hostB.name ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider ml-1 mr-1">
                        {line.speaker}
                      </span>
                      <div className={`p-5 rounded-2xl text-slate-200 leading-relaxed shadow-sm group hover:ring-2 ring-indigo-500/50 transition-all cursor-text relative ${
                        line.speaker === hostA.name
                          ? 'bg-slate-800 rounded-tl-none border-l-4 border-l-indigo-500'
                          : 'bg-slate-800/60 rounded-tr-none border-r-4 border-r-emerald-500'
                      }`}>
                        {line.text}
                        <button className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-slate-700 p-1.5 rounded-full shadow-lg text-slate-300 hover:text-white transition-all">
                          <Edit3 size={12} />
                        </button>
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
