import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Brain, AlertTriangle, Scale, Save } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import {
  estimateIRTAbility,
  computeGuessingStrategy,
  EXAM_BOARDS,
} from '../../../engine/adaptive/irtEngine';
import { useAppStore } from '../../../store/useAppStore';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

export const IRTPsychometricChart = React.memo(function IRTPsychometricChart({
  categories = [],
  simuladoRows = [],
  focusCategory = null,
  showOnlyFocus = false,
  minScore = 0,
  maxScore = 100,
  examBoard: propBoard = 'PADRAO',
  penaltyPerWrong: propPenalty = 0,
}) {
  const setData = useAppStore((s) => s.setData);
  const normalizedPropBoard = propBoard || 'PADRAO';
  const normalizedPropPenalty = Number.isFinite(Number(propPenalty)) ? Number(propPenalty) : 0;
  const [prevPropBoard, setPrevPropBoard] = useState(normalizedPropBoard);
  const [prevPropPenalty, setPrevPropPenalty] = useState(normalizedPropPenalty);
  const [selectedBoard, setSelectedBoard] = useState(normalizedPropBoard);
  const [penalty, setPenalty] = useState(normalizedPropPenalty);
  const [savedBoard, setSavedBoard] = useState(false);
  const savedTimerRef = useRef(null);

  if (normalizedPropBoard !== prevPropBoard || normalizedPropPenalty !== prevPropPenalty) {
    setPrevPropBoard(normalizedPropBoard);
    setPrevPropPenalty(normalizedPropPenalty);
    setSelectedBoard(normalizedPropBoard);
    setPenalty(normalizedPropPenalty);
    setSavedBoard(false);
  }

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const irtEntries = useMemo(() => {
    const targetCats = showOnlyFocus && focusCategory ? [focusCategory] : safeArr(categories);
    const fromHist = targetCats.flatMap((c) => safeArr(c?.simuladoStats?.history));
    const fromRows = safeArr(simuladoRows).filter(
      (r) => !showOnlyFocus || !focusCategory || r.categoryId === focusCategory.id
    );
    return fromRows.length > 0 ? fromRows : fromHist;
  }, [categories, simuladoRows, focusCategory, showOnlyFocus]);

  const irt = useMemo(() => estimateIRTAbility(irtEntries, { minScore, maxScore }), [irtEntries, minScore, maxScore]);

  const allQuestionTelemetry = useMemo(() => {
    return safeArr(simuladoRows).flatMap((r) => safeArr(r?.questionTelemetry));
  }, [simuladoRows]);

  const guessing = useMemo(
    () => computeGuessingStrategy(allQuestionTelemetry, { penaltyPerWrong: penalty }),
    [allQuestionTelemetry, penalty]
  );

  const handleBoardChange = (boardId) => {
    setSelectedBoard(boardId);
    const found = EXAM_BOARDS.find((b) => b.id === boardId);
    if (found) setPenalty(found.penaltyPerWrong);
  };

  const handleSaveBoard = () => {
    setData((prev) => ({
      ...(prev || {}),
      examBoard: selectedBoard,
      penaltyPerWrong: Math.max(0, Math.min(2, Number(penalty) || 0)),
    }));
    setSavedBoard(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      savedTimerRef.current = null;
      setSavedBoard(false);
    }, 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Parte A — TRI / IRT 2PL */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Curva Característica TRI / IRT (Habilidade θ)
            </h4>
          </div>
          {irt.hasData && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-200 font-black">
                θ = {irt.theta >= 0 ? '+' : ''}{irt.theta} (±{irt.thetaSe})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-bold capitalize">
                Zona Proximal: {irt.recommendedDifficulty}
              </span>
            </div>
          )}
        </div>

        {irt.pedagogicalIncoherence && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
            <span>{irt.incoherenceMessage}</span>
          </div>
        )}

        {!irt.hasData ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Cadastre simulados para estimar sua habilidade latente θ e a curva característica por dificuldade.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartFrame minHeight={240} label="Estimando curva TRI">
              <div className="h-[240px] w-full" role="img" aria-label="Curva Característica do Item TRI 2PL">
                <ResponsiveContainer width="100%" height="100%" minHeight={210} minWidth={1}>
                  <ComposedChart data={irt.iccCurve} margin={{ top: 10, right: 16, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <ReferenceArea y1={65} y2={78} fill="#10b981" fillOpacity={0.08} />
                    <XAxis dataKey="b" stroke="#64748b" fontSize={10} label={{ value: 'Dificuldade do item (b)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(val, name) => [`${val}%`, name]} />
                    <ReferenceLine x={irt.theta} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: `θ=${irt.theta}`, position: 'top', fill: '#c4b5fd', fontSize: 10 }} />
                    <Line type="monotone" dataKey="predictedPct" name="P(Acerto) TRI" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>

            <ChartFrame minHeight={240} label="Comparando acerto por dificuldade">
              <div className="h-[240px] w-full" role="img" aria-label="Acerto observado versus previsto por nível de dificuldade">
                <ResponsiveContainer width="100%" height="100%" minHeight={210} minWidth={1}>
                  <ComposedChart data={irt.tierBreakdown} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v) => (v == null ? '—' : `${v}%`)} />
                    <Bar dataKey="observedPct" name="Acerto Real (%)" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={28} />
                    <Line type="monotone" dataKey="predictedPct" name="Previsto TRI (%)" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>
          </div>
        )}
      </div>

      {/* Parte B — Simulador de Banca & Valor Esperado de Chute (Cebraspe/Penalidade) */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-amber-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Banca & Estratégia Ótima de Chute (Valor Esperado)
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              aria-label="Selecionar banca examinadora"
              value={selectedBoard}
              onChange={(e) => handleBoardChange(e.target.value)}
              className="rounded-lg bg-slate-900 border border-white/10 px-2.5 py-1.5 text-slate-200 text-xs outline-none focus:border-amber-400"
            >
              {EXAM_BOARDS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-slate-300">
              <span>Penalidade:</span>
              <input
                type="number"
                min={0}
                max={2}
                step={0.25}
                value={penalty}
                onChange={(e) => setPenalty(Math.max(0, Math.min(2, Number(e.target.value) || 0)))}
                className="w-16 rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-white font-mono text-xs"
              />
            </label>
            <button
              type="button"
              onClick={handleSaveBoard}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-bold"
            >
              <Save size={12} /> {savedBoard ? 'Salvo!' : 'Salvar banca'}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Com penalidade <strong className="text-white">-{guessing.penaltyPerWrong}</strong> por erro, o ponto de equilíbrio é{' '}
          <strong className="text-amber-300">{guessing.breakEvenPct}% de acerto</strong> (abaixo disso, deixar em branco gera mais pontos líquidos).
        </p>

        {!guessing.hasData ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Marque seu nível de confiança (<em>Certeza / Dúvida / Chute</em>) no Simulado IA para calcular seu saldo líquido real por estratégia.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {guessing.levels.map((lv) => (
                <div key={lv.key} className="flex items-center justify-between rounded-xl bg-slate-900/70 border border-white/5 px-3 py-2 text-xs font-mono">
                  <span className="font-sans font-bold text-slate-200">{lv.label} <span className="text-slate-500">(n={lv.total})</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-sky-300">{lv.accuracyPct != null ? `${lv.accuracyPct}%` : '—'}</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold ${lv.shouldAnswer ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {lv.shouldAnswer ? 'Marcar' : 'Deixar em branco'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {guessing.strategies.map((st, idx) => (
                <div
                  key={st.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                    idx === 0 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/5 bg-slate-900/50 text-slate-300'
                  }`}
                >
                  <span className="font-bold">{idx === 0 ? '★ ' : ''}{st.label}</span>
                  <span className="font-mono font-black">{st.netPoints >= 0 ? '+' : ''}{st.netPoints} pts líq.</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default IRTPsychometricChart;
