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
} from 'recharts';
import { Clock, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';
import { buildExamPacingData } from '../../../utils/advancedChartHelpers';
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
}) {
  const patchData = useAppStore((s) => s.patchData);
  const setData = useAppStore((s) => s.setData);
  const normalizedPropDur = Number(propDuration) > 0 ? Number(propDuration) : 240;
  const normalizedPropQ = Number(propQuestions) > 0 ? Number(propQuestions) : 100;
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

  const safeDurationNum = Math.max(15, Math.min(720, Math.round(Number(durationInput) || normalizedPropDur)));
  const safeQuestionsNum = Math.max(5, Math.min(500, Math.round(Number(questionsInput) || normalizedPropQ)));

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
    const safeDur = Math.max(15, Math.min(720, Math.round(Number(durationInput) || 240)));
    const safeQ = Math.max(5, Math.min(500, Math.round(Number(questionsInput) || 100)));
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

  const isOverTime = data.deltaMinutes > 0;
  const barScaleMax = Math.max(data.examDurationMinutes, data.totalProjectedMinutes, 1);

  return (
    <div className="w-full space-y-5">
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
            gapLabel={Math.round(data.deltaMinutes) === 0 ? 'No limite exato ✓' : (isOverTime ? `+${fmtMinutes(data.deltaMinutes)} acima` : `${fmtMinutes(Math.abs(data.deltaMinutes))} de folga`)}
            status={isOverTime ? (data.deltaMinutes > 15 ? 'danger' : 'warning') : 'success'}
            progressPct={Math.min(100, (data.examDurationMinutes / Math.max(1, data.totalProjectedMinutes)) * 100)}
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
                    ? `Estouro estimado de +${fmtMinutes(data.deltaMinutes)} (~${data.estimatedUnanswered} questões sem tempo)`
                    : `Folga estimada de ${fmtMinutes(Math.abs(data.deltaMinutes))} para revisão e gabarito`}
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
                return (
                  <div
                    key={subj.id}
                    style={{ width: `${widthPct}%`, backgroundColor: subj.color }}
                    className="h-full border-r border-slate-950/60 opacity-85 hover:opacity-100 transition-opacity"
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
          <ChartFrame minHeight={300} label="Simulando orçamento por disciplina">
            <div className="h-[300px] w-full" role="img" aria-label="Comparativo de tempo projetado versus orçamento ideal por matéria">
              <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={1}>
                <BarChart data={data.subjects} margin={{ top: 12, right: 20, left: 4, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={55}
                    tickFormatter={(v) => (String(v).length > 16 ? `${String(v).slice(0, 15)}…` : v)}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}m`} />
                  <Tooltip content={<PacingTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="budgetMinutes" name="Orçamento Ideal (min)" fill="#334155" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="projectedMinutes" name="Seu Tempo Projetado (min)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </>
      )}
    </div>
  );
});

export default ExamPacingChart;
