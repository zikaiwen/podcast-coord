import { Bot, UserCircle } from 'lucide-react';

const HostConfig = ({ host, onChange, label, isAi }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
           {isAi ? <Bot size={14} /> : <UserCircle size={14} />}
           {label}
        </span>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Name</label>
          <input
            type="text"
            value={host.name}
            onChange={(e) => onChange({...host, name: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="e.g. Alex"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Role / Archetype</label>
          <select
            value={host.role}
            onChange={(e) => onChange({...host, role: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
          >
            <option value="expert">The Expert (Source of knowledge)</option>
            <option value="interviewer">The Interviewer (Asks guiding questions)</option>
            <option value="hype">The Hype Person (Excited & Agreeable)</option>
            <option value="student">The Student (Needs explanation)</option>
            <option value="skeptic">The Friendly Skeptic (Plays devil's advocate)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Tone</label>
          <input
            type="text"
            value={host.tone}
            onChange={(e) => onChange({...host, tone: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder={isAi ? "e.g. Curious, Peppy" : "e.g. Passionate, Calm"}
          />
        </div>
      </div>
    </div>
  );
};

export default HostConfig;
