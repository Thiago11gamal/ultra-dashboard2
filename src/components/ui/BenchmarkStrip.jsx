import React from 'react';
import { ArrowRight, CheckCircle2, Target } from 'lucide-react';

const STATUS_STYLES = {
  success: {
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]',
    badge: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
    bar: 'from-emerald-500 to-teal-400',
    border: 'border-emerald-500/20',
  },
  warning: {
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]',
    badge: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
    bar: 'from-amber-500 to-yellow-400',
    border: 'border-amber-500/20',
  },
  danger: {
    dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.65)]',
    badge: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
    bar: 'from-rose-500 to-orange-400',
    border: 'border-rose-500/20',
  },
  neutral: {
    dot: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.65)]',
    badge: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-200',
    bar: 'from-indigo-500 to-sky-400',
    border: 'border-white/[0.08]',
  },
};

/**
 * BenchmarkStrip
 *
 * Faixa compacta de referência ("Onde você está -> Onde chegar") exibida nos gráficos
 * para dar contexto imediato de distância até a meta / referência ideal.
 */
export const BenchmarkStrip = React.memo(function BenchmarkStrip({
  currentLabel = 'Onde está',
  currentValue,
  targetLabel = 'Meta',
  targetValue,
  gapLabel = null,
  status = 'neutral',
  progressPct = null,
  extra = null,
  action = null,
  compact = false,
  className = '',
}) {
  if (currentValue == null && targetValue == null) return null;
  const st = STATUS_STYLES[status] || STATUS_STYLES.neutral;
  const hasProgress = progressPct !== null && progressPct !== undefined && Number.isFinite(Number(progressPct));
  const clampedProgress = hasProgress ? Math.max(0, Math.min(100, Number(progressPct))) : 0;

  return (
    <div
      data-testid="benchmark-strip"
      className={`rounded-xl border ${st.border} bg-slate-950/60 ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} flex flex-col gap-2 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-xs">
          <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} aria-hidden="true" />
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {currentLabel}:
            </span>
            <strong className="font-mono font-black tabular-nums text-white">
              {currentValue ?? '—'}
            </strong>
          </span>

          <ArrowRight size={12} className="text-slate-500 shrink-0" aria-hidden="true" />

          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
              <Target size={10} className="text-emerald-400 shrink-0" aria-hidden="true" />
              {targetLabel}:
            </span>
            <strong className="font-mono font-black tabular-nums text-emerald-300">
              {targetValue ?? '—'}
            </strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {gapLabel && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold font-mono tabular-nums ${st.badge}`}>
              {status === 'success' && <CheckCircle2 size={11} className="shrink-0" aria-hidden="true" />}
              <span>{gapLabel}</span>
            </span>
          )}
          {extra && (
            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
              {extra}
            </span>
          )}
          {action}
        </div>
      </div>

      {hasProgress && (
        <div className="w-full h-1.5 rounded-full bg-slate-800/85 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${st.bar} transition-all duration-500`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
    </div>
  );
});

export default BenchmarkStrip;
