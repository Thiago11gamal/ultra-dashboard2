import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Sliders, RotateCcw, ShieldAlert, TrendingUp } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { runTornadoSensitivity } from '../../../engine/monteCarlo';
import { getSafeScore } from '../../../utils/scoreHelper';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

function TornadoTooltip({ active, payload, deltaPct }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl text-xs min-w-[215px]">
      <p className="font-black text-white border-b border-white/10 pb-1.5 mb-2">{item.name}</p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-emerald-400">Se subir +{deltaPct}%:</span>
          <span className="font-bold text-white">{item.probUp}% ({item.upside >= 0 ? '+' : ''}{item.upside}pp)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-rose-400">Se cair -{deltaPct}%:</span>
          <span className="font-bold text-white">{item.probDown}% ({item.downside >= 0 ? '+' : ''}{item.downside}pp)</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-white/10 text-slate-400">
          <span>Impacto total (swing):</span>
          <span className="text-indigo-300 font-black">{item.swing}pp</span>
        </div>
      </div>
    </div>
  );
}

export const TornadoWhatIfChart = React.memo(function TornadoWhatIfChart({
  categories = [],
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  historicalCutoffs = [],
  examGroupCutoffs = null,
  onSaveGroupCutoffs = null,
}) {
  const [deltaPct, setDeltaPct] = useState(10);
  const [overrides, setOverrides] = useState({});
  const cutoffsPropKey = JSON.stringify({
    basicos: examGroupCutoffs?.basicos ?? '',
    especificos: examGroupCutoffs?.especificos ?? '',
    discursiva: examGroupCutoffs?.discursiva ?? '',
  });
  const categoriesPropKey = safeArr(categories).map((c) => c?.id || c?.name || '').join('|');
  const [prevCutoffsKey, setPrevCutoffsKey] = useState(cutoffsPropKey);
  const [prevCategoriesKey, setPrevCategoriesKey] = useState(categoriesPropKey);
  const [draftGroupCutoffs, setDraftGroupCutoffs] = useState(() => ({
    basicos: examGroupCutoffs?.basicos ?? '',
    especificos: examGroupCutoffs?.especificos ?? '',
    discursiva: examGroupCutoffs?.discursiva ?? '',
  }));

  if (cutoffsPropKey !== prevCutoffsKey) {
    setPrevCutoffsKey(cutoffsPropKey);
    setDraftGroupCutoffs({
      basicos: examGroupCutoffs?.basicos ?? '',
      especificos: examGroupCutoffs?.especificos ?? '',
      discursiva: examGroupCutoffs?.discursiva ?? '',
    });
  }

  if (categoriesPropKey !== prevCategoriesKey) {
    setPrevCategoriesKey(categoriesPropKey);
    setOverrides({});
  }

  const effectiveGroupCutoffs = useMemo(() => {
    const merged = {};
    ['basicos', 'especificos', 'discursiva'].forEach((grp) => {
      const raw = draftGroupCutoffs[grp];
      if (raw !== '' && raw !== null && raw !== undefined && Number.isFinite(Number(raw)) && Number(raw) > 0) {
        merged[grp] = Number(raw);
      }
    });
    return merged;
  }, [draftGroupCutoffs]);

  const subjects = useMemo(() => {
    const gRange = Math.max(1e-6, maxScore - minScore);
    return safeArr(categories)
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
        const hasCutoff = cat.minCutoff !== null && cat.minCutoff !== undefined && Number(cat.minCutoff) > cMin;
        return {
          id: cat.id || cat.name,
          name: cat.name,
          weight: Math.max(0.5, Number(cat.weight) || 10),
          mean,
          sd,
          minScore: cMin,
          maxScore: cMax,
          minCutoff: hasCutoff ? Number(cat.minCutoff) : null,
          examGroup: cat.examGroup || null,
        };
      })
      .filter(Boolean)
      .filter((s) => Number.isFinite(s.mean) && gRange > 0);
  }, [categories, minScore, maxScore]);

  const result = useMemo(() => {
    if (!subjects.length) return null;
    return runTornadoSensitivity({
      subjects,
      targetScore,
      minScore,
      maxScore,
      historicalCutoffs,
      examGroupCutoffs: effectiveGroupCutoffs,
      deltaPct,
      simulations: 1200,
      overrides,
    });
  }, [subjects, targetScore, minScore, maxScore, historicalCutoffs, effectiveGroupCutoffs, deltaPct, overrides]);

  const hasOverrides = Object.values(overrides).some((v) => Number(v) !== 0);

  if (!result || !result.items.length) {
    return (
      <div className="min-h-[280px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-8 text-center">
        <TrendingUp size={34} className="text-indigo-400/50" />
        <p className="text-sm font-bold text-slate-300">Sem simulados suficientes para o Tornado & Simulador &quot;E Se?&quot;</p>
        <p className="text-xs text-slate-500">Cadastre simulados em pelo menos 1 disciplina para simular sensibilidade e causas de eliminação.</p>
      </div>
    );
  }

  const risk = result.baseRisk || { passedAllPct: result.baseProbability, failedGlobalOnlyPct: 0, failedMinCutoffOnlyPct: 0, failedBothPct: 0, subjectEliminationRates: [] };

  return (
    <div className="w-full space-y-5">
      {/* Decomposição do Risco de Eliminação (Monte Carlo Multi-Restrição) */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Decomposição do Risco de Eliminação
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">Nota projetada: <strong className="text-white">{result.baseMean}</strong></span>
            <span className="text-emerald-300 font-black">Aprovação: {result.baseProbability}%</span>
          </div>
        </div>

        {/* Barra empilhada de destino das simulações */}
        <div className="h-5 rounded-xl overflow-hidden flex bg-slate-900 border border-white/10 text-[9px] font-black">
          {risk.passedAllPct > 0 && (
            <div style={{ width: `${risk.passedAllPct}%` }} className="bg-emerald-500/80 text-emerald-950 flex items-center justify-center truncate px-1" title={`Aprovado: ${risk.passedAllPct}%`}>
              {risk.passedAllPct >= 10 ? `${risk.passedAllPct}%` : ''}
            </div>
          )}
          {risk.failedGlobalOnlyPct > 0 && (
            <div style={{ width: `${risk.failedGlobalOnlyPct}%` }} className="bg-amber-500/80 text-amber-950 flex items-center justify-center truncate px-1" title={`Reprovado só pela nota global: ${risk.failedGlobalOnlyPct}%`}>
              {risk.failedGlobalOnlyPct >= 10 ? `${risk.failedGlobalOnlyPct}%` : ''}
            </div>
          )}
          {risk.failedMinCutoffOnlyPct > 0 && (
            <div style={{ width: `${risk.failedMinCutoffOnlyPct}%` }} className="bg-rose-500/85 text-white flex items-center justify-center truncate px-1" title={`Eliminado só pelo minCutoff/bloco: ${risk.failedMinCutoffOnlyPct}%`}>
              {risk.failedMinCutoffOnlyPct >= 10 ? `${risk.failedMinCutoffOnlyPct}%` : ''}
            </div>
          )}
          {risk.failedBothPct > 0 && (
            <div style={{ width: `${risk.failedBothPct}%` }} className="bg-rose-900/90 text-rose-200 flex items-center justify-center truncate px-1" title={`Abaixo global + mínimo: ${risk.failedBothPct}%`}>
              {risk.failedBothPct >= 10 ? `${risk.failedBothPct}%` : ''}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />Aprovado ({risk.passedAllPct}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80" />Corte Global ({risk.failedGlobalOnlyPct}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/85" />Eliminado por Mínimo ({risk.failedMinCutoffOnlyPct}%)</span>
          {risk.failedBothPct > 0 && (
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-900" />Ambos ({risk.failedBothPct}%)</span>
          )}
        </div>

        {risk.subjectEliminationRates?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {risk.subjectEliminationRates.slice(0, 4).map((item) => (
              <span key={item.id} className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-200">
                {item.name}: <strong>{item.eliminationPct}%</strong> abaixo do corte ({item.minCutoff})
              </span>
            ))}
          </div>
        )}

        {risk.groupEliminationRates?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {risk.groupEliminationRates.map((g) => (
              <span key={g.group} className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200">
                Bloco {g.group}: <strong>{g.eliminationPct}%</strong> abaixo do corte ({g.minCutoff})
              </span>
            ))}
          </div>
        )}

        {/* Editor rápido de cortes mínimos por bloco (Conhecimentos Básicos / Específicos / Discursiva) */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Cortes mínimos por bloco (edital):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'basicos', label: 'Básicos' },
              { id: 'especificos', label: 'Específicos' },
              { id: 'discursiva', label: 'Discursiva' },
            ].map((grp) => (
              <label key={grp.id} className="inline-flex items-center gap-1.5 bg-slate-900/70 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300">
                <span>{grp.label} ≥</span>
                <input
                  type="number"
                  min={0}
                  max={maxScore}
                  step={1}
                  placeholder="—"
                  value={draftGroupCutoffs[grp.id]}
                  onChange={(e) => setDraftGroupCutoffs((prev) => ({ ...prev, [grp.id]: e.target.value }))}
                  className="w-12 bg-transparent text-right font-mono font-bold text-white outline-none"
                />
              </label>
            ))}
            {typeof onSaveGroupCutoffs === 'function' && (
              <button
                type="button"
                onClick={() => onSaveGroupCutoffs(effectiveGroupCutoffs || {})}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold transition-colors"
              >
                Salvar cortes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Diagrama de Tornado */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-300">
            Sensibilidade (Tornado): impacto na aprovação variando cada matéria em ±{deltaPct}%
          </p>
          <div className="flex items-center gap-1 bg-slate-950/70 border border-white/10 p-1 rounded-xl text-[10px] font-bold">
            {[5, 10, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setDeltaPct(pct)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${deltaPct === pct ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' : 'text-slate-400 hover:text-white'}`}
              >
                ±{pct}%
              </button>
            ))}
          </div>
        </div>

        <ChartFrame minHeight={Math.max(220, Math.min(380, result.items.length * 42))} label="Calculando Tornado de Sensibilidade">
          <div style={{ height: Math.max(220, Math.min(380, result.items.length * 42)) }} className="w-full" role="img" aria-label="Diagrama de Tornado de sensibilidade da aprovação">
            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={1}>
              <BarChart data={result.items.slice(0, 10)} layout="vertical" stackOffset="sign" margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}pp`} />
                <YAxis type="category" dataKey="name" width={125} stroke="#94a3b8" fontSize={10} tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 17)}…` : v)} />
                <Tooltip content={<TornadoTooltip deltaPct={deltaPct} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1.5} />
                <Bar dataKey="downside" name={`Queda -${deltaPct}%`} fill="#f43f5e" fillOpacity={0.8} stackId="tornado" radius={[4, 0, 0, 4]} barSize={18} />
                <Bar dataKey="upside" name={`Ganho +${deltaPct}%`} fill="#10b981" fillOpacity={0.85} stackId="tornado" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      {/* Sliders interativos "E Se?" */}
      <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-300">
            <Sliders size={14} />
            Simulador &quot;E Se?&quot; em Tempo Real
          </div>
          {hasOverrides && (
            <button
              type="button"
              onClick={() => setOverrides({})}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={12} /> Resetar cenários
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.items.slice(0, 6).map((item) => {
            const val = Number(overrides[item.id] || 0);
            return (
              <label key={item.id} className="flex flex-col gap-1 bg-slate-900/60 rounded-xl p-2.5 border border-white/5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-200 truncate">{item.name}</span>
                  <span className={`font-mono font-black ${val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {val > 0 ? `+${val}%` : `${val}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={25}
                  step={1}
                  value={val}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default TornadoWhatIfChart;
