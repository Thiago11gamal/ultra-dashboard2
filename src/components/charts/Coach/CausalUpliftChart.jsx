import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  ErrorBar,
} from 'recharts';
import { ChartFrame } from '../ChartFrame';

const ACTION_LABELS = {
  srs_review: 'Revisão SRS',
  mock_exam: 'Simulado',
  simulado: 'Simulado',
  error_review: 'Revisão de Erros',
  study_volume: 'Volume de Estudo',
  theory: 'Teoria / Base',
  general_review: 'Consolidação',
  weak_topic_practice: 'Prática de Tópicos Fracos',
  practice: 'Prática / Questões',
  agility_training: 'Treino de Agilidade',
  critical_rescue: 'Resgate Crítico',
  mode_questoes: 'Modo: Questões',
  mode_teoria: 'Modo: Teoria',
  mode_revisao: 'Modo: Revisão',
  mode_lei_seca: 'Modo: Lei Seca',
  mode_jurisprudencia: 'Modo: Jurisprudência',
  mode_simulado: 'Modo: Simulado',
  mode_flashcards: 'Modo: Flashcards',
  mode_resumo: 'Modo: Resumo',
};

function formatActionLabel(actionType) {
  if (!actionType) return 'Ação';
  if (ACTION_LABELS[actionType]) return ACTION_LABELS[actionType];
  const str = String(actionType);
  if (str.startsWith('mode_')) {
    const modeName = str
      .slice(5)
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return `Modo: ${modeName || 'Estudo'}`;
  }
  return str
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function UpliftTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const pos = item.uplift >= 0;

  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl text-xs min-w-[200px]">
      <p className="font-black text-white mb-1.5 border-b border-white/10 pb-1">{item.label}</p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Uplift estimado:</span>
          <span className={`font-black ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pos ? '+' : ''}{item.uplift.toFixed(2)} pts
          </span>
        </div>
        {item.hasCi && (
          <div className="flex justify-between gap-4 text-slate-400">
            <span>IC 95%:</span>
            <span>[{item.ciLow.toFixed(2)}, {item.ciHigh.toFixed(2)}]</span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Amostras:</span>
          <span className="text-white">{item.sampleSize}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-500 text-[10px]">
          <span>Método:</span>
          <span>{item.method}</span>
        </div>
      </div>
    </div>
  );
}

export const CausalUpliftChart = React.memo(function CausalUpliftChart({ causalModel = null }) {
  const chartData = useMemo(() => {
    const actions = causalModel?.actions;
    if (!actions || typeof actions !== 'object') return [];
    const isStrictNum = (v) =>
      v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v));
    return Object.entries(actions)
      .filter(([, est]) => est && typeof est === 'object' && isStrictNum(est.uplift))
      .map(([actionType, est]) => {
        const uplift = Number(est.uplift);
        const hasCi = isStrictNum(est?.ci?.low) && isStrictNum(est?.ci?.high);
        const low = hasCi ? Number(est.ci.low) : uplift;
        const high = hasCi ? Number(est.ci.high) : uplift;
        const errMinus = hasCi ? Math.max(0, uplift - low) : 0;
        const errPlus = hasCi ? Math.max(0, high - uplift) : 0;
        return {
          actionType,
          label: formatActionLabel(actionType),
          uplift: Number(uplift.toFixed(3)),
          errorBar: hasCi ? [Number(errMinus.toFixed(3)), Number(errPlus.toFixed(3))] : null,
          hasCi,
          ciLow: low,
          ciHigh: high,
          sampleSize: est.sampleSize ?? 0,
          method: est.method || 'observational',
        };
      })
      .sort((a, b) => b.uplift - a.uplift);
  }, [causalModel]);

  const hasAnyCi = useMemo(() => chartData.some((d) => d.hasCi), [chartData]);

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
        Treine o modelo causal para visualizar o gráfico de ganho real (uplift + IC 95%) por tipo de ação.
      </div>
    );
  }

  return (
    <ChartFrame minHeight={240} label="Carregando uplift causal">
      <div className="h-[240px] w-full" role="img" aria-label="Gráfico de Uplift Causal por Tipo de Ação">
        <ResponsiveContainer width="100%" height={240} minHeight={220} minWidth={1}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 28, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}`} />
            <YAxis type="category" dataKey="label" width={145} stroke="#94a3b8" fontSize={11} />
            <Tooltip content={<UpliftTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
            <Bar dataKey="uplift" radius={[4, 4, 4, 4]} barSize={20}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.actionType}
                  fill={entry.uplift >= 0 ? '#10b981' : '#f43f5e'}
                  fillOpacity={0.85}
                />
              ))}
              {hasAnyCi && (
                <ErrorBar dataKey="errorBar" width={6} strokeWidth={1.5} stroke="#e2e8f0" direction="x" />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
});

export default CausalUpliftChart;
