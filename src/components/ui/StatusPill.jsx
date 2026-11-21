import React from 'react';

const TONES = {
  success: {
    chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    card: 'bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-400/45',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    value: 'text-emerald-300',
    dot: 'bg-emerald-400'
  },
  warning: {
    chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    card: 'bg-amber-500/[0.06] border-amber-500/25 hover:border-amber-400/45',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    value: 'text-amber-300',
    dot: 'bg-amber-400'
  },
  danger: {
    chip: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    card: 'bg-rose-500/[0.06] border-rose-500/25 hover:border-rose-400/45',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    value: 'text-rose-300',
    dot: 'bg-rose-400'
  },
  info: {
    chip: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    card: 'bg-indigo-500/[0.06] border-indigo-500/25 hover:border-indigo-400/45',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    value: 'text-indigo-300',
    dot: 'bg-indigo-400'
  },
  neutral: {
    chip: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    card: 'bg-slate-800/40 border-white/10 hover:border-white/20',
    badge: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
    value: 'text-slate-200',
    dot: 'bg-slate-400'
  },
  critical: {
    chip: 'bg-rose-600/15 text-rose-200 border-rose-500/50',
    card: 'bg-rose-600/10 border-rose-500/45 hover:border-rose-400/65',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-400/45',
    value: 'text-rose-200',
    dot: 'bg-rose-500'
  },
  progress: {
    chip: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    card: 'bg-sky-500/[0.06] border-sky-500/25 hover:border-sky-400/45',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    value: 'text-sky-300',
    dot: 'bg-sky-400'
  },
  time: {
    chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    card: 'bg-cyan-500/[0.06] border-cyan-500/25 hover:border-cyan-400/45',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    value: 'text-cyan-300',
    dot: 'bg-cyan-400'
  },
  focus: {
    chip: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
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
        className={`w-full text-left rounded-2xl border p-3 transition-all duration-200 backdrop-blur-sm flex flex-col justify-between gap-2 ${styles.card} ${
          isSelected ? 'ring-2 ring-indigo-400/60 shadow-lg' : ''
        } ${typeof onClick === 'function' ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} />
              {icon ? <span aria-hidden="true" className="text-xs shrink-0">{icon}</span> : null}
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 truncate">
                {label}
              </span>
            </div>
            {scopeLabel && (
              <span className="inline-block mt-1 text-[9px] font-semibold text-slate-400 truncate max-w-full">
                {scopeLabel}
              </span>
            )}
          </div>
          {statusText && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-bold whitespace-nowrap ${styles.badge}`}>
              {statusText}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          {value != null && value !== '' ? (
            <strong className={`text-base sm:text-lg font-black font-mono tracking-tight leading-none ${styles.value}`}>
              {value}
            </strong>
          ) : null}
          {typeof onClick === 'function' && (
            <span className="text-[9px] font-bold text-slate-500">
              {isSelected ? 'Ocultar dica ▲' : 'Ver ação ▼'}
            </span>
          )}
        </div>

        {(howToRead || help) && (
          <p className="text-[11px] leading-relaxed text-slate-300/90">
            <span className="font-bold text-slate-200">Como ler: </span>
            {howToRead || help}
          </p>
        )}

        {scaleGuide && (
          <p className="text-[10px] leading-snug text-slate-400 bg-black/25 border border-white/5 rounded-xl px-2.5 py-1.5">
            {scaleGuide}
          </p>
        )}

        {isSelected && actionHint && (
          <p className="text-[11px] leading-relaxed text-indigo-200 bg-indigo-500/10 border border-indigo-400/25 rounded-xl px-2.5 py-1.5">
            <span className="font-bold text-indigo-300">🧭 O que fazer: </span>
            {actionHint}
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[10px] font-bold backdrop-blur-sm transition-all ${styles.chip} ${
        isSelected ? 'ring-2 ring-white/40 scale-[1.02]' : ''
      } ${typeof onClick === 'function' ? 'cursor-pointer hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400' : ''}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />
      {icon ? <span aria-hidden="true" className="text-xs">{icon}</span> : null}
      <span className="uppercase tracking-wider">{label}</span>
      {value != null && value !== '' ? (
        <strong className="font-black normal-case tracking-normal font-mono">{value}</strong>
      ) : null}
      {statusText ? (
        <span className="hidden sm:inline opacity-75 normal-case font-semibold">· {statusText}</span>
      ) : null}
    </PillTag>
  );
});
