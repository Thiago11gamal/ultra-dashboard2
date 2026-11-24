import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle2, Save, Globe } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';
import { buildExamPacingData, normalizeExamPacingConfig } from '../../../utils/advancedChartHelpers';
import { useAppStore } from '../../../store/useAppStore';

const fmtMinutes = (mins) => {
  const m = Math.round(Math.abs(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h${String(rem).padStart(2, '0')}m` : `${rem}m`;
};

function PacingTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const isOver = item.deltaMinutes > 0;

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl min-w-[210px] text-xs">
      <p className="font-black text-white mb-2 border-b border-white/10 pb-1.5">{item.name}</p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Questões estimadas:</span>
          <span className="text-white font-bold">{item.allocatedQuestions}q</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Seu ritmo médio:</span>
          <span className="text-cyan-300 font-bold">{item.avgSecPerQ}s/q</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Tempo projetado:</span>
          <span className="text-indigo-300 font-bold">{item.projectedMinutes} min</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Orçamento ideal:</span>
          <span className="text-slate-300 font-bold">{item.budgetMinutes} min</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
          <span className="text-slate-400">Saldo:</span>
          <span className={`font-black ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isOver ? `+${item.deltaMinutes} min` : `${item.deltaMinutes} min`}
          </span>
        </div>
      </div>
      {!item.hasTimedData && (
        <p className="text-[10px] text-amber-400/90 mt-2">* Estimado pela média geral (sem cronômetro nesta matéria)</p>
      )}
    </div>
  );
}

export const ExamPacingChart = React.memo(function ExamPacingChart({
  categories = [],
  mcWeights = null,
  timeWindow = 'all',
  examDurationMinutes: propDuration = null,
  examTotalQuestions: propQuestions = null,
  showOnlyFocus = false,
  focusCategory = null,
}) {
  const patchData = useAppStore((s) => s.patchData);
  const setData = useAppStore((s) => s.setData);
  const normalizedProps = normalizeExamPacingConfig(propDuration, propQuestions);
  const normalizedPropDur = normalizedProps.examDurationMinutes;
  const normalizedPropQ = normalizedProps.examTotalQuestions;
  const [prevPropDur, setPrevPropDur] = useState(normalizedPropDur);
  const [prevPropQ, setPrevPropQ] = useState(normalizedPropQ);
  const [durationInput, setDurationInput] = useState(String(normalizedPropDur));
  const [questionsInput, setQuestionsInput] = useState(String(normalizedPropQ));
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [lastSavedKey, setLastSavedKey] = useState(null);
  const savedTimerRef = useRef(null);

  if (normalizedPropDur !== prevPropDur || normalizedPropQ !== prevPropQ) {
    const incomingKey = `${normalizedPropDur}|${normalizedPropQ}`;
    setPrevPropDur(normalizedPropDur);
    setPrevPropQ(normalizedPropQ);
    setDurationInput(String(normalizedPropDur));
    setQuestionsInput(String(normalizedPropQ));
    if (lastSavedKey === incomingKey) {
      setLastSavedKey(null);
    } else {
      setSavedFeedback(false);
    }
  }

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const parsedInputDur = Number(durationInput);
  const parsedInputQ = Number(questionsInput);
  const normalizedLive = normalizeExamPacingConfig(
    Number.isFinite(parsedInputDur) && parsedInputDur > 0 ? parsedInputDur : normalizedPropDur,
    Number.isFinite(parsedInputQ) && parsedInputQ > 0 ? parsedInputQ : normalizedPropQ
  );
  const safeDurationNum = normalizedLive.examDurationMinutes;
  const safeQuestionsNum = normalizedLive.examTotalQuestions;

  const data = useMemo(
    () =>
      buildExamPacingData(categories, {
        examDurationMinutes: safeDurationNum,
        examTotalQuestions: safeQuestionsNum,
        timeWindow,
        mcWeights,
      }),
    [categories, safeDurationNum, safeQuestionsNum, timeWindow, mcWeights]
  );

  const handleSaveExamConfig = () => {
    const { examDurationMinutes: safeDur, examTotalQuestions: safeQ } = normalizeExamPacingConfig(
      Number(durationInput) > 0 ? Number(durationInput) : 240,
      Number(questionsInput) > 0 ? Number(questionsInput) : 100
    );
    setDurationInput(String(safeDur));
    setQuestionsInput(String(safeQ));
    setLastSavedKey(`${safeDur}|${safeQ}`);
    if (typeof patchData === 'function') {
      patchData(() => ({
        examDurationMinutes: safeDur,
        examTotalQuestions: safeQ,
      }));
    } else if (typeof setData === 'function') {
      setData((prev) => ({
        ...(prev || {}),
        examDurationMinutes: safeDur,
        examTotalQuestions: safeQ,
      }));
    }
    setSavedFeedback(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      savedTimerRef.current = null;
      setSavedFeedback(false);
    }, 2000);
  };

  const roundedDelta = Math.round(data.deltaMinutes);
  const isOverTime = roundedDelta > 0;
  const isExactTime = roundedDelta === 0;
  const untimedCount = data.subjects.filter((s) => !s.hasTimedData).length;
  const barScaleMax = Math.max(data.examDurationMinutes, data.totalProjectedMinutes, 1);
  const chartMinWidth = Math.max(480, data.subjects.length * 64);

  return (
    <div className="w-full space-y-5">
      {showOnlyFocus && focusCategory && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-[11px] text-indigo-200">
          <Globe size={13} className="shrink-0 text-indigo-300" />
          <span>
            O ritmo de prova simula o edital completo ({data.subjects.length} disciplinas). <strong>{focusCategory.name}</strong> está destacada abaixo.
          </span>
        </div>
      )}
      {/* Configuração rápida da prova */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/55 p-3.5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-300 font-semibold">
            <span>Duração (min):</span>
            <input
              type="number"
              min={15}
              max={720}
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              onBlur={() => setDurationInput(String(safeDurationNum))}
              className="w-20 rounded-xl bg-slate-900/90 border border-white/[0.09] px-2.5 py-1 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
            />
          </label>
          <label className="flex items-center gap-2 text-slate-300 font-semibold">
            <span>Questões:</span>
            <input
              type="number"
              min={5}
              max={500}
              value={questionsInput}
              onChange={(e) => setQuestionsInput(e.target.value)}
              onBlur={() => setQuestionsInput(String(safeQuestionsNum))}
              className="w-20 rounded-xl bg-slate-900/90 border border-white/[0.09] px-2.5 py-1 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
            />
          </label>
          <span className="text-[11px] text-cyan-300 font-mono font-bold tabular-nums px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25">
            Alvo: {data.idealSecPerQuestion}s/questão
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveExamConfig}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold transition-all active:scale-[0.985]"
        >
          <Save size={13} />
          {savedFeedback ? 'Salvo no concurso!' : 'Salvar parâmetros'}
        </button>
      </div>

      {!data.hasData ? (
        <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/55 p-8 text-center">
          <Clock size={34} className="text-cyan-400/60" />
          <p className="text-sm font-bold text-slate-300">Sem dados cronometrados para simular o ritmo de prova</p>
          <p className="text-xs text-slate-400 max-w-md">
            Faça simulados com cronômetro ativo para estimar se você termina a prova inteira dentro de {safeDurationNum} minutos.
          </p>
        </div>
      ) : (
        <>
          <BenchmarkStrip
            currentLabel="Ritmo projetado"
            currentValue={`${fmtMinutes(data.totalProjectedMinutes)} (${Math.round(data.overallAvgSec)}s/q)`}
            targetLabel="Limite edital"
            targetValue={`${fmtMinutes(data.examDurationMinutes)} (${Math.round(data.idealSecPerQuestion)}s/q)`}
            gapLabel={isExactTime ? 'No limite exato ✓' : (isOverTime ? `+${fmtMinutes(roundedDelta)} acima` : `${fmtMinutes(Math.abs(roundedDelta))} de folga`)}
            status={isOverTime ? (roundedDelta > 15 ? 'danger' : 'warning') : 'success'}
            progressPct={Math.min(100, (data.examDurationMinutes / Math.max(1, data.totalProjectedMinutes)) * 100)}
            extra={untimedCount > 0 ? `${untimedCount} ${untimedCount === 1 ? 'matéria estimada' : 'matérias estimadas'} pela média geral` : null}
            compact
          />

          {/* Veredito + Barra de Orçamento Global */}
          <div className={`rounded-2xl border p-4 space-y-3 ${isOverTime ? 'border-rose-500/30 bg-rose-500/[0.07]' : 'border-emerald-500/30 bg-emerald-500/[0.07]'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isOverTime ? (
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                )}
                <p className="text-sm font-black text-white tabular-nums">
                  {isOverTime
                    ? `Estouro estimado de +${fmtMinutes(roundedDelta)} (~${data.estimatedUnanswered} ${data.estimatedUnanswered === 1 ? 'questão' : 'questões'} sem tempo)`
                    : isExactTime
                      ? `Tempo projetado no limite exato da prova (${fmtMinutes(data.examDurationMinutes)})`
                      : `Folga estimada de ${fmtMinutes(Math.abs(roundedDelta))} para revisão e gabarito`}
                </p>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums text-slate-300">
                Projetado: <strong className="text-white">{fmtMinutes(data.totalProjectedMinutes)}</strong> / Limite {fmtMinutes(data.examDurationMinutes)}
              </span>
            </div>

            {/* Barra empilhada com marcador de limite */}
            <div className="relative h-6 rounded-xl bg-slate-900/90 border border-white/10 overflow-hidden flex">
              {data.subjects.map((subj) => {
                const widthPct = (subj.projectedMinutes / barScaleMax) * 100;
                const isFocused = Boolean(showOnlyFocus && focusCategory?.id != null && String(subj.id) === String(focusCategory.id));
                return (
                  <div
                    key={subj.id}
                    style={{ width: `${widthPct}%`, backgroundColor: subj.color }}
                    className={`h-full border-r border-slate-950/60 transition-opacity ${isFocused ? 'opacity-100 ring-1 ring-inset ring-white/80' : 'opacity-85 hover:opacity-100'}`}
                    title={`${subj.name}: ${subj.projectedMinutes} min (${subj.allocatedQuestions}q)`}
                  />
                );
              })}
              {/* Linha do tempo limite da prova */}
              {(() => {
                const limitPct = Math.min(100, (data.examDurationMinutes / barScaleMax) * 100);
                return (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#fff]"
                    style={{ left: limitPct >= 99.5 ? 'calc(100% - 2px)' : `${limitPct}%` }}
                    title={`Limite da prova: ${data.examDurationMinutes} min`}
                  />
                );
              })()}
            </div>
          </div>

          {/* Comparativo por disciplina: Tempo Projetado vs Orçamento Ideal */}
          <ChartFrame minHeight={320} label="Simulando orçamento por disciplina">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <div className="h-[320px]" style={{ minWidth: `${chartMinWidth}px` }} role="img" aria-label="Comparativo de tempo projetado versus orçamento ideal por matéria">
                <ResponsiveContainer width="100%" height="100%" minHeight={280} minWidth={1}>
                  <BarChart data={data.subjects} margin={{ top: 8, right: 20, left: 4, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={10}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={58}
                      tickFormatter={(v) => (String(v).length > 16 ? `${String(v).slice(0, 15)}…` : v)}
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}m`} />
                    <Tooltip content={<PacingTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="budgetMinutes" name="Orçamento Ideal (min)" fill="#334155" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="projectedMinutes" name="Seu Tempo Projetado (min)" fill="#06b6d4" radius={[6, 6, 0, 0]}>
                      {data.subjects.map((subj) => {
                        const statusFill = subj.status === 'over'
                          ? '#f43f5e'
                          : subj.status === 'under'
                            ? '#10b981'
                            : '#06b6d4';
                        const isFocused = Boolean(showOnlyFocus && focusCategory?.id != null && String(subj.id) === String(focusCategory.id));
                        return (
                          <Cell
                            key={subj.id}
                            fill={statusFill}
                            fillOpacity={subj.hasTimedData ? 0.9 : 0.48}
                            stroke={isFocused ? '#fbbf24' : 'none'}
                            strokeWidth={isFocused ? 2 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartFrame>
        </>
      )}
    </div>
  );
});

export default ExamPacingChart;
