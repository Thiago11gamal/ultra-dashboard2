import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp, BookOpen, FileText } from 'lucide-react';
import { AdaptiveMaturityBadge } from '../ui/AdaptiveMaturityBadge';
import { computeACWR } from '../../engine/adaptive/workloadACWR';
import { runTornadoSensitivity } from '../../engine/monteCarlo';
import { getFlashcardDueTodayCount } from '../../utils/analytics';
import { getSafeScore } from '../../utils/scoreHelper';
import { toDateMs } from '../../utils/dateHelper';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const isStrictNum = (v) =>
  v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

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
  dayTick = null,
}) {
  const navigate = useNavigate();

  const acwr = useMemo(() => {
    void dayTick;
    return computeACWR(studyLogs);
  }, [studyLogs, dayTick]);

  const dueFlashcards = useMemo(() => {
    void dayTick;
    return getFlashcardDueTodayCount(flashcardDecks);
  }, [flashcardDecks, dayTick]);

  // Fingerprint apenas dos campos de simulado/peso/escala: evita re-executar 400 simulações
  // de Tornado na thread principal toda vez que uma tarefa do Checklist é marcada/editada.
  const tornadoInputs = useMemo(() => {
    const safeGlobalMin = isStrictNum(minScore) ? Number(minScore) : 0;
    const safeGlobalMax = isStrictNum(maxScore) && Number(maxScore) > safeGlobalMin ? Number(maxScore) : Math.max(safeGlobalMin + 1, 100);
    const subjects = safeArr(categories)
      .map((cat) => {
        const weight = isStrictNum(cat.weight)
          ? (Number(cat.weight) <= 0 ? 0 : Math.max(0.5, Number(cat.weight)))
          : 10;
        if (weight <= 0) return null;
        const cMin = isStrictNum(cat.minScore) ? Number(cat.minScore) : safeGlobalMin;
        const cMax = isStrictNum(cat.maxScore) && Number(cat.maxScore) > cMin ? Number(cat.maxScore) : safeGlobalMax;
        const cRange = Math.max(1e-6, cMax - cMin);
        const hist = safeArr(cat?.simuladoStats?.history)
          .filter((h) => h && h.valid !== false && h.validated !== false)
          .map((h, idx) => ({
            score: getSafeScore(h, cMax, cMin),
            ms: toDateMs(h.date || h.createdAt),
            idx,
          }))
          .filter((e) => Number.isFinite(e.score))
          .sort((a, b) => {
            const ta = Number.isFinite(a.ms) ? a.ms : -Infinity;
            const tb = Number.isFinite(b.ms) ? b.ms : -Infinity;
            return ta !== tb ? ta - tb : a.idx - b.idx;
          })
          .map((e) => e.score);
        if (!hist.length) return null;
        const recent = hist.slice(-6);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const sd = recent.length >= 2
          ? Math.max(cRange * 0.03, Math.sqrt(recent.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (recent.length - 1)))
          : cRange * 0.1;
        return {
          id: cat.id || cat.name,
          name: cat.name,
          weight,
          mean,
          sd,
          minScore: cMin,
          maxScore: cMax,
          minCutoff: isStrictNum(cat.minCutoff) && Number(cat.minCutoff) > cMin ? Number(cat.minCutoff) : null,
        };
      })
      .filter(Boolean);

    const signature = subjects
      .map((s) => `${s.id}|${s.name}|${s.weight}|${s.mean.toFixed(4)}|${s.sd.toFixed(4)}|${s.minScore}|${s.maxScore}|${s.minCutoff ?? ''}`)
      .join(';');

    return { subjects, signature, safeGlobalMin, safeGlobalMax };
  }, [categories, minScore, maxScore]);

  const tornadoSubjectsRef = React.useRef(tornadoInputs.subjects);
  tornadoSubjectsRef.current = tornadoInputs.subjects;

  const topLeverage = useMemo(() => {
    const subjects = tornadoSubjectsRef.current;
    if (!tornadoInputs.signature || subjects.length < 2) return null;
    const res = runTornadoSensitivity({
      subjects,
      targetScore,
      minScore: tornadoInputs.safeGlobalMin,
      maxScore: tornadoInputs.safeGlobalMax,
      deltaPct: 10,
      simulations: 400,
    });
    return res?.items?.[0] || null;
  }, [tornadoInputs.signature, tornadoInputs.safeGlobalMin, tornadoInputs.safeGlobalMax, targetScore]);

  const acwrChipCls = acwr.zone === 'burnout_risk'
    ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
    : acwr.zone === 'elevated'
      ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
      : acwr.zone === 'detraining'
        ? 'border-sky-500/35 bg-sky-500/10 text-sky-200'
        : acwr.zone === 'inactive'
          ? 'border-slate-500/35 bg-slate-800/70 text-slate-300'
          : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';

  const acwrChipText = acwr.zone === 'burnout_risk'
    ? `Alerta Burnout ACWR ${acwr.acwr.toFixed(2)}×`
    : acwr.zone === 'inactive'
      ? `ACWR 0.00× · retomar ${acwr.recommendedBlockMinutes}m`
      : acwr.zone === 'detraining'
        ? `ACWR ${acwr.acwr.toFixed(2)}× · baixa carga`
        : `ACWR ${acwr.acwr.toFixed(2)}× · ${acwr.recommendedBlockMinutes}m`;

  const leverageImpactText = topLeverage
    ? (Number(topLeverage.upside) > 0
      ? `+${topLeverage.upside}pp`
      : Number(topLeverage.downside) > 0
        ? `proteger -${topLeverage.downside}pp`
        : `±${topLeverage.swing}pp`)
    : '';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/coach')}
          className="cursor-pointer rounded-full transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
          aria-label="Abrir Coach IA e Central de Maturidade Adaptativa"
        >
          <AdaptiveMaturityBadge compact />
        </button>

        {acwr.totalValidLogs > 0 && (
          <button
            type="button"
            onClick={() => navigate('/heatmap')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all hover:brightness-110 cursor-pointer ${acwrChipCls}`}
            title={`${acwr.zoneLabel}: ${acwr.advice}`}
          >
            <Flame size={12} />
            <span>{acwrChipText}</span>
          </button>
        )}

        {topLeverage && topLeverage.swing > 0 && (
          <button
            type="button"
            onClick={() => {
              const focusParam = topLeverage.id ? `&focus=${encodeURIComponent(topLeverage.id)}` : '';
              navigate(`/evolution?engine=tornado_whatif${focusParam}`);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 text-[11px] font-bold hover:bg-indigo-500/20 transition-colors cursor-pointer"
            title="Matéria de maior impacto na probabilidade de aprovação (Diagrama de Tornado)"
          >
            <TrendingUp size={12} />
            <span className="truncate max-w-[220px]">
              Alavanca #1: {topLeverage.name} ({leverageImpactText})
            </span>
          </button>
        )}

        {dueFlashcards > 0 && (
          <button
            type="button"
            onClick={() => navigate('/flashcards', { state: { autoStartReview: true } })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 text-[11px] font-bold hover:bg-amber-500/20 transition-colors cursor-pointer"
            title="Abrir revisões espaçadas (FSRS) pendentes para hoje"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-400/35 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 text-[11px] font-black transition-colors shrink-0 cursor-pointer"
        >
          <FileText size={13} />
          Importar Edital
        </button>
      )}
    </div>
  );
});

export default AdaptivePulseStrip;
