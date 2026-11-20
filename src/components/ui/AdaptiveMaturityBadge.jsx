import React, { useEffect, useMemo } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  evaluateContestMaturity,
  syncAdaptiveFeatureFlags,
  ADAPTIVE_STAGES,
} from '../../engine/adaptive/adaptiveMaturityEngine';

const STAGE_STYLE = [
  'border-slate-600/40 bg-slate-800/40 text-slate-300',
  'border-sky-500/30 bg-sky-500/10 text-sky-300',
  'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  'border-violet-500/30 bg-violet-500/10 text-violet-300',
  'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
];

/**
 * Selo vivo de maturidade adaptativa (N0 → N5).
 * Sincroniza automaticamente as feature flags do Coach conforme novos dados são lançados
 * (sempre respeitando overrides manuais do Control Center).
 */
export const AdaptiveMaturityBadge = React.memo(function AdaptiveMaturityBadge({
  compact = false,
  autoSync = true,
}) {
  const { activeId, contest } = useAppStore(
    useShallow((state) => {
      const id = state.appState?.activeId || 'default';
      return {
        activeId: id,
        contest: state.appState?.contests?.[id] || null,
      };
    })
  );

  const patchData = useAppStore((state) => state.patchData);
  const maturity = useMemo(() => evaluateContestMaturity(contest || {}), [contest]);

  useEffect(() => {
    if (!autoSync || !contest) return;
    const syncRes = syncAdaptiveFeatureFlags(contest, activeId, { respectOverrides: true });
    if (syncRes?.finalFlags && Object.keys(syncRes.finalFlags).length > 0 && typeof patchData === 'function') {
      const prevCloud = contest.coachFeatureFlags || {};
      const differs = Object.entries(syncRes.finalFlags).some(([k, v]) => prevCloud[k] !== v);
      if (differs) {
        patchData(() => ({
          coachFeatureFlags: { ...prevCloud, ...syncRes.finalFlags },
        }));
      }
    }
  }, [autoSync, contest, activeId, patchData, maturity.stage, maturity.metrics.simuladoCount, maturity.metrics.studySessionsCount]);

  const cls = STAGE_STYLE[maturity.stage] || STAGE_STYLE[0];

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold ${cls}`}
        title={`${maturity.description} ${maturity.nextHint}`}
      >
        <Sparkles size={12} />
        <span>Motor Adaptativo {maturity.code} · {maturity.name}</span>
        {maturity.unlockedFlagCount > 0 && (
          <span className="text-[10px] opacity-75 font-mono">({maturity.unlockedFlagCount} ativos)</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${cls}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-black/30 border border-white/10 shrink-0">
            {maturity.stage >= 5 ? <ShieldCheck size={18} /> : <Sparkles size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-black/30 border border-white/10 font-mono">
                {maturity.code} / N5
              </span>
              <h3 className="text-sm font-black text-white">{maturity.name}</h3>
              <span className="text-[11px] opacity-80">· {maturity.shortLabel}</span>
            </div>
            <p className="text-xs text-slate-300/90 mt-1">{maturity.description}</p>
            <p className="text-[11px] text-slate-400 mt-1">{maturity.nextHint}</p>
          </div>
        </div>

        <div className="sm:w-44 shrink-0 space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span>{maturity.nextStage ? `Próx: ${maturity.nextStage.code}` : 'Nível Máximo'}</span>
            <span className="font-bold">{maturity.progressToNextPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-current transition-all duration-700"
              style={{ width: `${maturity.progressToNextPct}%` }}
            />
          </div>
          <div className="flex justify-between gap-0.5 pt-0.5">
            {ADAPTIVE_STAGES.map((st) => (
              <span
                key={st.code}
                className={`h-1 flex-1 rounded-full ${st.stage <= maturity.stage ? 'bg-current' : 'bg-white/10'}`}
                title={`${st.code}: ${st.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AdaptiveMaturityBadge;
