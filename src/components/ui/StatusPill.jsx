import React from 'react';

const TONES = {
  success: {
    chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  warning: {
    chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400'
  },
  danger: {
    chip: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400'
  },
  info: {
    chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400'
  },
  neutral: {
    chip: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400'
  },
  critical: {
    chip: 'bg-rose-600/15 text-rose-200 border-rose-500/50',
    dot: 'bg-rose-500'
  },
  progress: {
    chip: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400'
  },
  time: {
    chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400'
  },
  focus: {
    chip: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400'
  }
};

export const StatusPill = React.memo(function StatusPill({
  label,
  value,
  tone = 'neutral',
  icon,
  help
}) {
  const styles = TONES[tone] || TONES.neutral;

  return (
    <div
      title={help}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[10px] font-bold backdrop-blur-sm ${styles.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {icon ? <span aria-hidden="true" className="text-xs">{icon}</span> : null}
      <span className="uppercase tracking-wider">{label}</span>
      {value != null && value !== '' ? (
        <strong className="font-black normal-case tracking-normal">{value}</strong>
      ) : null}
    </div>
  );
});
