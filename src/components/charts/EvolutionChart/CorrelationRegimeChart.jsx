import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from 'recharts';
import { Network, Activity, Target, Info } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';
import { computeWeeklyCategoryCorrelation, buildRegimeMapData } from '../../../engine/diagnostics';

function corrCellStyle(r, self) {
  if (self) return 'bg-slate-800/80 text-slate-500 border-white/5';
  if (r === null || r === undefined) return 'bg-slate-900/50 text-slate-600 border-white/5';
  if (r <= -0.45) return 'bg-rose-500/65 text-white border-rose-400/70 font-black';
  if (r <= -0.2) return 'bg-rose-500/25 text-rose-200 border-rose-500/30';
  if (r >= 0.55) return 'bg-emerald-500/65 text-emerald-950 border-emerald-300/70 font-black';
  if (r >= 0.25) return 'bg-emerald-500/25 text-emerald-200 border-emerald-500/30';
  return 'bg-slate-800/40 text-slate-400 border-white/5';
}

function RegimeTooltip({ active, payload, unit = '%' }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  const velUnit = unit === '%' ? '%/sem' : ` ${unit}/sem`;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl text-xs min-w-[220px]">
      <p className="font-black text-white border-b border-white/10 pb-1.5 mb-2">{pt.name}</p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Hurst (H):</span>
          <span className="text-sky-300 font-bold tabular-nums">
            {pt.hurstH}
            {pt.sampleSize < 10 && <span className="text-[10px] text-slate-400 font-sans ml-1">(calibrando)</span>}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Velocidade:</span>
          <span className={pt.velocity >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {pt.velocity >= 0 ? '+' : ''}{pt.velocity}{velUnit}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Consistência:</span>
          <span className="text-white">{Math.round(pt.consistency * 100)}%</span>
        </div>
        <div className="flex justify-between gap-4 text-[10px] text-slate-500">
          <span>Amostra:</span>
          <span>n={pt.sampleSize} simulados</span>
        </div>
        <div className="pt-1 border-t border-white/10 text-indigo-300 font-sans font-bold">{pt.regimeLabel}</div>
      </div>
    </div>
  );
}

export const CorrelationRegimeChart = React.memo(function CorrelationRegimeChart({
  categories = [],
  studyLogs = [],
  simuladoRows = [],
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
  unit = '%',
  focusSubjectId = null,
  timeWindow = 'all',
}) {
  const corr = useMemo(
    () => computeWeeklyCategoryCorrelation(categories, maxScore, minScore, { timeWindow }),
    [categories, maxScore, minScore, timeWindow]
  );

  const regimes = useMemo(
    () => buildRegimeMapData(categories, studyLogs, simuladoRows, maxScore, minScore, targetScore, { timeWindow }),
    [categories, studyLogs, simuladoRows, maxScore, minScore, targetScore, timeWindow]
  );

  const yExtent = useMemo(() => {
    if (!regimes.length) return 5;
    const maxAbs = Math.max(1, ...regimes.map((r) => Math.abs(Number(r.velocity) || 0)));
    return Math.ceil(maxAbs * 1.35);
  }, [regimes]);

  const hasCalibratingHurst = useMemo(
    () => regimes.some((r) => Number(r.sampleSize) < 10),
    [regimes]
  );

  const crowdingPairs = corr.pairs.filter((p) => p.type === 'crowding_out');
  const synergyPairs = corr.pairs.filter((p) => p.type === 'synergy');
  const consolidatedCount = regimes.filter((r) => Number(r.hurstH) >= 0.58 && Number(r.velocity) > 0).length;
  const positiveVelCount = regimes.filter((r) => Number(r.velocity) > 0).length;

  return (
    <div className="w-full space-y-6">
      {(regimes.length > 0 || corr.pairs.length > 0) && (
        <BenchmarkStrip
          currentLabel="Na zona consolidada"
          currentValue={regimes.length > 0 ? `${consolidatedCount}/${regimes.length} matérias` : `${positiveVelCount} em alta`}
          targetLabel="Zona alvo"
          targetValue="H ≥ 0.58 · vel. > 0"
          gapLabel={crowdingPairs.length > 0
            ? `${crowdingPairs.length} ${crowdingPairs.length === 1 ? 'par em gangorra' : 'pares em gangorra'}`
            : (regimes.length > 0 && consolidatedCount === regimes.length ? 'Todas consolidadas ✓' : `${positiveVelCount}/${regimes.length} em evolução`)}
          status={crowdingPairs.length > 0 ? 'warning' : (regimes.length > 0 && consolidatedCount > 0 ? 'success' : 'neutral')}
          progressPct={regimes.length > 0 ? (consolidatedCount / regimes.length) * 100 : null}
          extra={`Efeito gangorra: ${crowdingPairs.length} (alvo: 0)`}
          compact
        />
      )}
      {/* Parte A — Matriz Semanal de Correlação */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Network size={16} className="text-indigo-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Matriz de Correlação Semanal (Matéria × Matéria)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Verde (r ≥ +0.25): sobem juntas · Vermelho (r ≤ −0.20): efeito gangorra / negligência
          </span>
        </div>

        {corr.categories.length < 2 || !corr.matrix.length ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Cadastre simulados em pelo menos 2 disciplinas ao longo de ≥3 semanas comuns para montar a matriz de correlação.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-[11px] font-mono tabular-nums">
              <thead>
                <tr>
                  <th className="p-1.5 text-left text-slate-400 font-sans">Disciplina</th>
                  {corr.categories.map((c) => (
                    <th
                      key={c.id}
                      className={`p-1.5 text-center truncate max-w-[72px] ${focusSubjectId && String(c.id) === String(focusSubjectId) ? 'text-indigo-300 font-black' : 'text-slate-400'
                        }`}
                      title={c.name}
                    >
                      {c.name.slice(0, 7)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corr.categories.map((catRow, i) => {
                  const isFocusedRow = focusSubjectId && String(catRow.id) === String(focusSubjectId);
                  return (
                    <tr key={catRow.id}>
                      <td
                        className={`p-1.5 font-sans font-bold whitespace-nowrap max-w-[140px] truncate ${isFocusedRow ? 'text-indigo-300' : 'text-slate-200'
                          }`}
                        title={catRow.name}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {isFocusedRow && <Target size={11} className="text-indigo-300 shrink-0" />}
                          <span className="truncate">{catRow.name}</span>
                        </span>
                      </td>
                      {corr.matrix[i].map((cell, j) => (
                        <td
                          key={`${catRow.id}-${j}`}
                          className={`p-1.5 text-center rounded-md border ${corrCellStyle(cell.r, cell.self)}`}
                          title={`${catRow.name} × ${corr.categories[j].name}: r=${cell.r ?? 'n/a'} (${cell.n} sem)`}
                        >
                          {cell.self ? '—' : (cell.r !== null ? cell.r.toFixed(2) : '·')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {crowdingPairs.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            <strong>Efeito gangorra detectado:</strong>{' '}
            {crowdingPairs.slice(0, 2).map((p) => `${p.catA} × ${p.catB} (r=${Number(p.r).toFixed(2)})`).join(' · ')} — intercale essas disciplinas na semana para evitar queda por esquecimento.
          </div>
        )}

        {synergyPairs.length > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            <strong>Sinergia positiva:</strong>{' '}
            {synergyPairs.slice(0, 2).map((p) => `${p.catA} × ${p.catB} (r=+${Number(p.r).toFixed(2)})`).join(' · ')} — evoluem juntas quando estudadas na mesma semana.
          </div>
        )}
      </div>

      {/* Parte B — Mapa de Regimes (Hurst H × Velocidade) */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Mapa de Regimes Estatísticos (Hurst H × Velocidade)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            H &gt; 0.58: tendência persistente · H &lt; 0.42: oscilação / reversão à média · Acima de 0: ganhando pontos/sem
          </span>
        </div>

        {hasCalibratingHurst && (
          <p className="text-[11px] text-slate-400 bg-slate-900/75 border border-white/[0.08] rounded-xl px-3 py-2 flex items-center gap-2">
            <Info size={13} className="text-indigo-400 shrink-0" />
            <span>Disciplinas com menos de 10 simulados permanecem em <strong className="text-slate-200">H = 0.50</strong> até acumular amostra suficiente para separar persistência de reversão.</span>
          </p>
        )}

        {regimes.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Necessário ao menos 3 simulados em uma disciplina para calcular Expoente de Hurst e Velocidade.
          </p>
        ) : (
          <ChartFrame minHeight={270} label="Calculando regimes Hurst × Velocidade">
            <div className="h-[270px] w-full" role="img" aria-label="Mapa de Regimes Hurst versus Velocidade">
              <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={1}>
                <ScatterChart margin={{ top: 16, right: 20, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <ReferenceArea
                    x1={0.58}
                    x2={1}
                    y1={0}
                    y2={yExtent}
                    fill="#10b981"
                    fillOpacity={0.09}
                    stroke="#10b981"
                    strokeOpacity={0.35}
                    strokeDasharray="3 3"
                    label={{ value: 'Zona Alvo', position: 'insideTopRight', fill: '#34d399', fontSize: 10, fontWeight: 700 }}
                  />
                  <ReferenceArea x1={0} x2={0.42} y1={-yExtent} y2={yExtent} fill="#f59e0b" fillOpacity={0.05} />
                  <ReferenceArea x1={0} x2={1} y1={-yExtent} y2={0} fill="#f43f5e" fillOpacity={0.04} />
                  <XAxis
                    type="number"
                    dataKey="hurstH"
                    domain={[0, 1]}
                    stroke="#64748b"
                    fontSize={10}
                    label={{ value: 'Expoente de Hurst (H)', position: 'insideBottom', offset: -14, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="velocity"
                    domain={[-yExtent, yExtent]}
                    stroke="#64748b"
                    fontSize={10}
                    width={54}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}${unit === '%' ? '%' : ''}`}
                  />
                  <ReferenceLine x={0.5} stroke="#94a3b8" strokeDasharray="4 4" />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Tooltip content={<RegimeTooltip unit={unit} />} />
                  <Scatter data={regimes} name="Disciplinas">
                    {regimes.map((pt) => {
                      const isFocused = focusSubjectId && String(pt.id) === String(focusSubjectId);
                      return (
                        <Cell
                          key={pt.id}
                          fill={pt.color}
                          stroke={isFocused ? '#fbbf24' : '#fff'}
                          strokeWidth={isFocused ? 2.5 : 1.5}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        )}
      </div>
    </div>
  );
});

export default CorrelationRegimeChart;
