import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp, BookOpen, FileText } from 'lucide-react';
import { AdaptiveMaturityBadge } from '../ui/AdaptiveMaturityBadge';
import { computeACWR } from '../../engine/adaptive/workloadACWR';
import { runTornadoSensitivity } from '../../engine/monteCarlo';
import { getFlashcardDueTodayCount } from '../../utils/analytics';
import { getSafeScore } from '../../utils/scoreHelper';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

/**
 * Faixa executiva de pulso adaptativo no topo do Dashboard:
 * mostra maturidade N0–N5, status ACWR, matéria #1 de alavancagem (Tornado),
 * flashcards vencidos hoje e atalho de importação de edital.
 */
export const AdaptivePulseStrip = React.memo(function AdaptivePulseStrip({
  categories = [],
  studyLogs = [],
  flashcardDecks = [],
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  onOpenSyllabusImporter = null,
}) {
  const navigate = useNavigate();

  const acwr = useMemo(() => computeACWR(studyLogs), [studyLogs]);
  const dueFlashcards = useMemo(() => getFlashcardDueTodayCount(flashcardDecks), [flashcardDecks]);

  const topLeverage = useMemo(() => {
    const subjects = safeArr(categories)
      .map((cat) => {
        const cMin = Number.isFinite(Number(cat.minScore)) ? Number(cat.minScore) : minScore;
        const cMax = Number(cat.maxScore) > cMin ? Number(cat.maxScore) : maxScore;
        const cRange = Math.max(1e-6, cMax - cMin);
        const hist = safeArr(cat?.simuladoStats?.history)
          .filter((h) => h && h.valid !== false && h.validated !== false)
          .map((h) => getSafeScore(h, cMax, cMin))
          .filter(Number.isFinite);
        if (!hist.length) return null;
        const mean = hist.slice(-6).reduce((a, b) => a + b, 0) / Math.min(6, hist.length);
        const sd = hist.length >= 2
          ? Math.max(cRange * 0.03, Math.sqrt(hist.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (hist.length - 1)))
          : cRange * 0.1;
        return {
          id: cat.id || cat.name,
          name: cat.name,
          weight: Math.max(0.5, Number(cat.weight) || 10),
          mean,
          sd,
          minScore: cMin,
          maxScore: cMax,
          minCutoff: Number.isFinite(Number(cat.minCutoff)) && Number(cat.minCutoff) > cMin ? Number(cat.minCutoff) : null,
        };
      })
      .filter(Boolean);

    if (subjects.length < 2) return null;
    const res = runTornadoSensitivity({ subjects, targetScore, minScore, maxScore, deltaPct: 10, simulations: 400 });
    return res?.items?.[0] || null;
  }, [categories, targetScore, minScore, maxScore]);

  const acwrChipCls = acwr.zone === 'burnout_risk'
    ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
    : acwr.zone === 'elevated'
      ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <AdaptiveMaturityBadge compact />

        {acwr.totalValidLogs > 0 && (
          <button
            type="button"
            onClick={() => navigate('/activity')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all hover:brightness-110 ${acwrChipCls}`}
            title={acwr.advice}
          >
            <Flame size={12} />
            <span>
              {acwr.zone === 'burnout_risk'
                ? `Alerta Burnout ACWR ${acwr.acwr.toFixed(2)}×`
                : `ACWR ${acwr.acwr.toFixed(2)}× · ${acwr.recommendedBlockMinutes}m`}
            </span>
          </button>
        )}

        {topLeverage && topLeverage.swing > 0 && (
          <button
            type="button"
            onClick={() => navigate('/evolution')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 text-[11px] font-bold hover:bg-indigo-500/20 transition-colors"
            title="Matéria de maior impacto na probabilidade de aprovação (Diagrama de Tornado)"
          >
            <TrendingUp size={12} />
            <span className="truncate max-w-[200px]">
              Alavanca #1: {topLeverage.name} (+{topLeverage.upside}pp)
            </span>
          </button>
        )}

        {dueFlashcards > 0 && (
          <button
            type="button"
            onClick={() => navigate('/flashcards')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 text-[11px] font-bold hover:bg-amber-500/20 transition-colors"
          >
            <BookOpen size={12} />
            <span>{dueFlashcards} flashcard{dueFlashcards === 1 ? '' : 's'} FSRS hoje</span>
          </button>
        )}
      </div>

      {typeof onOpenSyllabusImporter === 'function' && (
        <button
          type="button"
          onClick={onOpenSyllabusImporter}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-400/35 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 text-[11px] font-black transition-colors shrink-0"
        >
          <FileText size={13} />
          Importar Edital
        </button>
      )}
    </div>
  );
});

export default AdaptivePulseStrip;
