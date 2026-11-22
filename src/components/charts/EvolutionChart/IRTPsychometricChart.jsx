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
import { Brain, AlertTriangle, Scale, Save, Star } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import {
  estimateIRTAbility,
  computeGuessingStrategy,
  EXAM_BOARDS,
} from '../../../engine/adaptive/irtEngine';
import { useAppStore } from '../../../store/useAppStore';
import { normalize, isSubjectMatch } from '../../../utils/normalization';
import { getDateKey, toDateMs } from '../../../utils/dateHelper';
import { parseNoonLocal, addDaysNoon } from '../../../utils/parseNoonLocal';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const isStrictNum = (v) =>
  v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));

function getThetaBand(theta) {
  if (theta >= 1.2) return { label: 'Alto domínio', cls: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' };
  if (theta >= 0.4) return { label: 'Competitivo', cls: 'bg-sky-500/15 border-sky-500/35 text-sky-300' };
  if (theta >= -0.4) return { label: 'Intermediário', cls: 'bg-amber-500/15 border-amber-500/35 text-amber-300' };
  return { label: 'Base inicial', cls: 'bg-rose-500/15 border-rose-500/35 text-rose-300' };
}

function IccTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-xl text-xs min-w-[185px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1 mb-1.5">
        Dificuldade b = {pt.b >= 0 ? `+${pt.b}` : pt.b}
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-3">
          <span className="text-violet-300">P(Acerto) TRI:</span>
          <span className="font-black text-white">{pt.predictedPct}%</span>
        </div>
        {pt.informationPct != null && (
          <div className="flex justify-between gap-3 text-[10px] text-slate-400">
            <span>Informação TRI:</span>
            <span>{pt.informationPct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TierTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-xl text-xs min-w-[190px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1 mb-1.5">
        Nível: {pt.label} (n={pt.total})
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-3">
          <span className="text-sky-300">Acerto Real:</span>
          <span className="font-black text-white">{pt.observedPct != null ? `${pt.observedPct}%` : '—'}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-violet-300">Previsto TRI:</span>
          <span className="font-bold text-violet-200">{pt.predictedPct}%</span>
        </div>
      </div>
    </div>
  );
}

export const IRTPsychometricChart = React.memo(function IRTPsychometricChart({
  categories = [],
  simuladoRows = [],
  focusCategory = null,
  showOnlyFocus = false,
  timeWindow = 'all',
  minScore = 0,
  maxScore = 100,
  examBoard: propBoard = 'PADRAO',
  penaltyPerWrong: propPenalty = 0,
}) {
  const patchData = useAppStore((s) => s.patchData);
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

  const rowMatchesFocus = (r) => {
    if (!showOnlyFocus || !focusCategory) return true;
    if (r.categoryId != null && focusCategory.id != null) {
      return String(r.categoryId) === String(focusCategory.id);
    }
    const rSubj = r.subject || r.categoryName || r.materia || '';
    const fName = focusCategory.name || '';
    return Boolean(rSubj && fName && isSubjectMatch(rSubj, fName));
  };

  const cutoffMs = useMemo(() => {
    if (!timeWindow || timeWindow === 'all') return null;
    const days = Number.parseInt(String(timeWindow), 10);
    if (!Number.isFinite(days) || days <= 0) return null;
    const todayKey = getDateKey(new Date());
    const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
    const cutoffNoon = todayNoon ? addDaysNoon(todayNoon, -days) : null;
    const cutoffKey = cutoffNoon ? getDateKey(cutoffNoon) : null;
    return cutoffKey ? toDateMs(cutoffKey) : null;
  }, [timeWindow]);

  const filterByWindow = (list) => {
    if (!cutoffMs) return list;
    return list.filter((item) => {
      const dk = getDateKey(item?.date || item?.createdAt);
      if (!dk) return true;
      const ms = toDateMs(dk);
      return !Number.isFinite(ms) || ms >= cutoffMs;
    });
  };

  const irtEntries = useMemo(() => {
    const safeCats = safeArr(categories);
    const targetCats = showOnlyFocus && focusCategory ? [focusCategory] : safeCats;
    const gMin = isStrictNum(minScore) ? Number(minScore) : 0;
    const gMax = isStrictNum(maxScore) && Number(maxScore) > gMin ? Number(maxScore) : Math.max(gMin + 1, 100);

    const resolveCatForRow = (r) => {
      if (r.categoryId != null) {
        const byId = safeCats.find((c) => c?.id != null && String(c.id) === String(r.categoryId));
        if (byId) return byId;
      }
      const subj = r.subject || r.categoryName || r.materia || '';
      if (!subj) return null;
      return safeCats.find((c) => c?.name && isSubjectMatch(subj, c.name)) || null;
    };

    const withCatScale = (entry, cat) => {
      const cMin = isStrictNum(cat?.minScore) ? Number(cat.minScore) : gMin;
      const cMax = isStrictNum(cat?.maxScore) && Number(cat.maxScore) > cMin ? Number(cat.maxScore) : gMax;
      return {
        ...entry,
        minScore: isStrictNum(entry?.minScore) ? Number(entry.minScore) : cMin,
        maxScore: isStrictNum(entry?.maxScore) && Number(entry.maxScore) > cMin ? Number(entry.maxScore) : cMax,
      };
    };

    const fromRows = filterByWindow(
      safeArr(simuladoRows).filter(
        (r) => r && r.valid !== false && r.validated !== false && rowMatchesFocus(r)
      )
    ).map((r) => withCatScale(r, resolveCatForRow(r)));

    const rowCoveredCats = new Set(
      fromRows.map((r) => {
        const matched = resolveCatForRow(r);
        return matched?.id != null ? String(matched.id) : normalize(r.subject || r.categoryName || r.materia || '');
      }).filter(Boolean)
    );

    const fromHist = targetCats.flatMap((c) => {
      const catKey = c?.id != null ? String(c.id) : normalize(c?.name || '');
      const hasRowsForCat = Boolean(catKey && rowCoveredCats.has(catKey));
      return filterByWindow(
        safeArr(c?.simuladoStats?.history).filter((h) => h && h.valid !== false && h.validated !== false)
      )
        .filter((h) => !hasRowsForCat || Boolean(h.difficulty || h.dificuldade))
        .map((h) => withCatScale(h, c));
    });

    if (fromRows.length === 0) return fromHist;
    if (fromHist.length === 0) return fromRows;
    // Deduplicate overlapping (dateKey, total, score) entries already in fromRows
    const rowSigs = new Set(
      fromRows.map((r) => `${getDateKey(r.date || r.createdAt) || ''}|${r.total ?? ''}|${r.correct ?? ''}|${r.score ?? ''}`)
    );
    const extraHist = fromHist.filter((h) => {
      const sig = `${getDateKey(h.date || h.createdAt) || ''}|${h.total ?? ''}|${h.correct ?? ''}|${h.score ?? ''}`;
      return !rowSigs.has(sig);
    });
    return [...fromRows, ...extraHist];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, simuladoRows, focusCategory, showOnlyFocus, cutoffMs, minScore, maxScore]);

  const irt = useMemo(() => estimateIRTAbility(irtEntries, { minScore, maxScore }), [irtEntries, minScore, maxScore]);
  const thetaBand = getThetaBand(irt.theta);
  const iccDomain = useMemo(() => {
    const xMin = Math.min(-2.2, Math.floor((irt.theta - 0.4) * 5) / 5);
    const xMax = Math.max(2.4, Math.ceil((irt.theta + 0.4) * 5) / 5);
    return [Number(xMin.toFixed(1)), Number(xMax.toFixed(1))];
  }, [irt.theta]);

  const allQuestionTelemetry = useMemo(() => {
    return filterByWindow(
      safeArr(simuladoRows).filter((r) => r && r.valid !== false && r.validated !== false && rowMatchesFocus(r))
    ).flatMap((r) => safeArr(r?.questionTelemetry));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simuladoRows, focusCategory, showOnlyFocus, cutoffMs]);

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
    const safePenalty = Math.max(0, Math.min(2, Number(penalty) || 0));
    if (typeof patchData === 'function') {
      patchData(() => ({
        examBoard: selectedBoard,
        penaltyPerWrong: safePenalty,
      }));
    } else if (typeof setData === 'function') {
      setData((prev) => ({
        ...(prev || {}),
        examBoard: selectedBoard,
        penaltyPerWrong: safePenalty,
      }));
    }
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
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Curva Característica TRI / IRT (Habilidade θ)
            </h4>
          </div>
          {irt.hasData && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
              <span className="px-2.5 py-1 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-200 font-black" title="Escala TRI vai de -3 (iniciante) a +3 (domínio avançado)">
                θ = {irt.theta >= 0 ? '+' : ''}{irt.theta} (±{irt.thetaSe})
              </span>
              <span className={`px-2.5 py-1 rounded-xl border font-sans font-bold ${thetaBand.cls}`}>
                {thetaBand.label}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-bold capitalize">
                Zona Proximal: {irt.recommendedDifficulty}
              </span>
            </div>
          )}
        </div>

        {irt.hasData && (
          <p className="text-[11px] text-slate-400">
            Como ler θ (escala −3 a +3): &lt; −0.4 Base inicial · −0.4 a +0.4 Intermediário · +0.4 a +1.2 Competitivo · &gt; +1.2 Alto domínio. A faixa verde (65%–78%) marca sua zona ideal de treino.
          </p>
        )}

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
                  <ComposedChart data={irt.iccCurve} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <ReferenceArea y1={65} y2={78} fill="#10b981" fillOpacity={0.08} />
                    <XAxis
                      type="number"
                      domain={iccDomain}
                      dataKey="b"
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={(v) => (v > 0 ? `+${v}` : String(v))}
                      label={{ value: 'Dificuldade do item (b)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
                    />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<IccTooltip />} />
                    <ReferenceLine
                      x={irt.theta}
                      stroke="#a78bfa"
                      strokeDasharray="4 4"
                      label={{ value: `θ=${irt.theta >= 0 ? '+' : ''}${irt.theta}`, position: 'top', fill: '#c4b5fd', fontSize: 10 }}
                    />
                    <Line type="monotone" dataKey="predictedPct" name="P(Acerto) TRI" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartFrame>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-end gap-3 px-1 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" />Acerto Real (%)</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400 inline-block" />Previsto TRI (%)</span>
              </div>
              <ChartFrame minHeight={240} label="Comparando acerto por dificuldade">
                <div className="h-[240px] w-full" role="img" aria-label="Acerto observado versus previsto por nível de dificuldade">
                  <ResponsiveContainer width="100%" height="100%" minHeight={210} minWidth={1}>
                    <ComposedChart data={irt.tierBreakdown} margin={{ top: 16, right: 16, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                      <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<TierTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="observedPct" name="Acerto Real (%)" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={28} />
                      <Line type="monotone" dataKey="predictedPct" name="Previsto TRI (%)" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartFrame>
            </div>
          </div>
        )}
      </div>

      {/* Parte B — Simulador de Banca & Valor Esperado de Chute (Cebraspe/Penalidade) */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-4">
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
              className="rounded-xl bg-slate-900/90 border border-white/[0.09] px-2.5 py-1.5 text-slate-200 text-xs outline-none focus:border-amber-400"
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
                className="w-16 rounded-xl bg-slate-900/90 border border-white/[0.09] px-2 py-1 text-white font-mono tabular-nums text-xs"
              />
            </label>
            <button
              type="button"
              onClick={handleSaveBoard}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-bold transition-all active:scale-[0.985]"
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
          <p className="text-xs text-slate-400 py-4 text-center">
            Marque seu nível de confiança (<em>Certeza / Dúvida / Chute</em>) no Simulado IA para calcular seu saldo líquido real por estratégia.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {guessing.levels.map((lv) => (
                <div key={lv.key} className="flex items-center justify-between rounded-xl bg-slate-900/70 border border-white/[0.08] px-3 py-2 text-xs font-mono tabular-nums">
                  <span className="font-sans font-bold text-slate-200">{lv.label} <span className="text-slate-400">(n={lv.total})</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-sky-300">{lv.accuracyPct != null ? `${lv.accuracyPct}%` : '—'}</span>
                    <span className={`px-2 py-0.5 rounded-lg font-bold ${lv.shouldAnswer ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
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
                    idx === 0 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.08] bg-slate-900/55 text-slate-300'
                  }`}
                >
                  <span className="font-bold inline-flex items-center gap-1.5">
                    {idx === 0 && <Star size={12} className="text-emerald-300 fill-emerald-300 shrink-0" />}
                    <span>{st.label}</span>
                  </span>
                  <span className="font-mono font-black tabular-nums">{st.netPoints >= 0 ? '+' : ''}{st.netPoints} pts líq.</span>
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
