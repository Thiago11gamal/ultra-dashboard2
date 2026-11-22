import React from 'react';
import { Compass, ChevronDown, ChevronUp } from 'lucide-react';

const TONES = {
  success: {
    chip: 'bg-emerald-500/[0.09] text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/15 hover:border-emerald-400/45',
    card: 'bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-400/45',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    value: 'text-emerald-300',
    dot: 'bg-emerald-400'
  },
  warning: {
    chip: 'bg-amber-500/[0.09] text-amber-300 border-amber-500/25 hover:bg-amber-500/15 hover:border-amber-400/45',
    card: 'bg-amber-500/[0.06] border-amber-500/25 hover:border-amber-400/45',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    value: 'text-amber-300',
    dot: 'bg-amber-400'
  },
  danger: {
    chip: 'bg-rose-500/[0.09] text-rose-300 border-rose-500/25 hover:bg-rose-500/15 hover:border-rose-400/45',
    card: 'bg-rose-500/[0.06] border-rose-500/25 hover:border-rose-400/45',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    value: 'text-rose-300',
    dot: 'bg-rose-400'
  },
  info: {
    chip: 'bg-indigo-500/[0.09] text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/15 hover:border-indigo-400/45',
    card: 'bg-indigo-500/[0.06] border-indigo-500/25 hover:border-indigo-400/45',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    value: 'text-indigo-300',
    dot: 'bg-indigo-400'
  },
  neutral: {
    chip: 'bg-slate-500/[0.09] text-slate-300 border-slate-500/25 hover:bg-slate-500/15 hover:border-slate-400/40',
    card: 'bg-slate-800/45 border-white/10 hover:border-white/20',
    badge: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
    value: 'text-slate-200',
    dot: 'bg-slate-400'
  },
  critical: {
    chip: 'bg-rose-600/15 text-rose-200 border-rose-500/40 hover:bg-rose-600/20 hover:border-rose-400/60',
    card: 'bg-rose-600/10 border-rose-500/40 hover:border-rose-400/60',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
    value: 'text-rose-200',
    dot: 'bg-rose-500'
  },
  progress: {
    chip: 'bg-sky-500/[0.09] text-sky-300 border-sky-500/25 hover:bg-sky-500/15 hover:border-sky-400/45',
    card: 'bg-sky-500/[0.06] border-sky-500/25 hover:border-sky-400/45',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    value: 'text-sky-300',
    dot: 'bg-sky-400'
  },
  time: {
    chip: 'bg-cyan-500/[0.09] text-cyan-300 border-cyan-500/25 hover:bg-cyan-500/15 hover:border-cyan-400/45',
    card: 'bg-cyan-500/[0.06] border-cyan-500/25 hover:border-cyan-400/45',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    value: 'text-cyan-300',
    dot: 'bg-cyan-400'
  },
  focus: {
    chip: 'bg-purple-500/[0.09] text-purple-300 border-purple-500/25 hover:bg-purple-500/15 hover:border-purple-400/45',
    card: 'bg-purple-500/[0.06] border-purple-500/25 hover:border-purple-400/45',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    value: 'text-purple-300',
    dot: 'bg-purple-400'
  }
};

export const StatusPill = React.memo(function StatusPill({
  label,
  value,
  tone = 'neutral',
  icon,
  help,
  statusText,
  scopeLabel,
  howToRead,
  scaleGuide,
  actionHint,
  variant = 'pill',
  isSelected = false,
  onClick
}) {
  const styles = TONES[tone] || TONES.neutral;
  const tooltipText = howToRead ? `${howToRead}${scaleGuide ? ` ${scaleGuide}` : ''}` : help;

  if (variant === 'card') {
    const Wrapper = typeof onClick === 'function' ? 'button' : 'div';
    return (
      <Wrapper
        type={typeof onClick === 'function' ? 'button' : undefined}
        onClick={onClick}
        aria-expanded={typeof onClick === 'function' ? isSelected : undefined}
        title={tooltipText}
        className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 backdrop-blur-sm flex flex-col justify-between gap-2.5 ${styles.card} ${
          isSelected ? 'ring-2 ring-indigo-400/60 shadow-lg' : ''
        } ${typeof onClick === 'function' ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} />
              {icon ? <span aria-hidden="true" className="text-xs shrink-0">{icon}</span> : null}
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-100 truncate">
                {label}
              </span>
            </div>
            {scopeLabel && (
              <span className="inline-block mt-1 text-[11px] font-medium text-slate-400 truncate max-w-full">
                {scopeLabel}
              </span>
            )}
          </div>
          {statusText && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${styles.badge}`}>
              {statusText}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          {value != null && value !== '' ? (
            <strong className={`text-lg font-black font-mono tabular-nums tracking-tight leading-none ${styles.value}`}>
              {value}
            </strong>
          ) : null}
          {typeof onClick === 'function' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
              {isSelected ? (
                <>Ocultar dica <ChevronUp size={12} /></>
              ) : (
                <>Ver ação <ChevronDown size={12} /></>
              )}
            </span>
          )}
        </div>

        {(howToRead || help) && (
          <p className="text-xs leading-relaxed text-slate-300/90">
            <span className="font-bold text-slate-100">Como ler: </span>
            {howToRead || help}
          </p>
        )}

        {scaleGuide && (
          <p className="text-[11px] leading-snug text-slate-400 bg-slate-950/45 border border-white/[0.06] rounded-xl px-2.5 py-1.5">
            {scaleGuide}
          </p>
        )}

        {isSelected && actionHint && (
          <p className="text-xs leading-relaxed text-indigo-200 bg-indigo-500/10 border border-indigo-400/25 rounded-xl px-3 py-2 flex items-start gap-2">
            <Compass size={14} className="text-indigo-300 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <span className="font-bold text-indigo-300">O que fazer: </span>
              {actionHint}
            </span>
          </p>
        )}
      </Wrapper>
    );
  }

  const PillTag = typeof onClick === 'function' ? 'button' : 'div';

  return (
    <PillTag
      type={typeof onClick === 'function' ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={typeof onClick === 'function' ? isSelected : undefined}
      title={tooltipText}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold backdrop-blur-sm transition-all ${styles.chip} ${
        isSelected ? 'ring-2 ring-indigo-400/60 brightness-110 shadow-sm' : ''
      } ${typeof onClick === 'function' ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400' : ''}`}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} />
      <span className="tracking-wide text-slate-200/90">{label}</span>
      {value != null && value !== '' ? (
        <strong className="font-black font-mono tabular-nums">{value}</strong>
      ) : null}
    </PillTag>
  );
});
