const Card = ({ children, className = '', title, icon: Icon }) => (
  <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm ${className}`}>
    {(title || Icon) && (
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3 bg-slate-800/80">
        {Icon && <div className="p-1.5 bg-indigo-500/20 rounded text-indigo-400"><Icon size={18} /></div>}
        <h3 className="font-semibold text-slate-200">{title}</h3>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

export default Card;
