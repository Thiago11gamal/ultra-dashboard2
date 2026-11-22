import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Brain, AlertOctagon, Timer } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';
import { BenchmarkStrip } from '../../ui/BenchmarkStrip';
import { normalize, isSubjectMatch } from '../../../utils/normalization';
import { toDateMs, getDateKey } from '../../../utils/dateHelper';
import { parseNoonLocal, addDaysNoon } from '../../../utils/parseNoonLocal';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

const ERROR_META = [
  { key: 'teoria', label: 'Lacuna Teórica', color: '#f43f5e' },
  { key: 'atencao', label: 'Desatenção / Leitura', color: '#f59e0b' },
  { key: 'esquecimento', label: 'Esquecimento', color: '#a855f7' },
  { key: 'tempo', label: 'Pressão de Tempo', color: '#38bdf8' },
  { key: 'banca', label: 'Estilo da Banca', color: '#10b981' },
];

const ERROR_TYPE_ALIASES = {
  teoria: 'teoria',
  lacuna: 'teoria',
  base: 'teoria',
  conteudo: 'teoria',
  atencao: 'atencao',
  desatencao: 'atencao',
  interpretacao: 'atencao',
  leitura: 'atencao',
  esquecimento: 'esquecimento',
  revisao: 'esquecimento',
  memoria: 'esquecimento',
  tempo: 'tempo',
  pressao: 'tempo',
  banca: 'banca',
  pegadinha: 'banca',
};

function normalizeErrorType(raw) {
  if (!raw) return null;
  const clean = normalize(String(raw));
  return ERROR_TYPE_ALIASES[clean] || null;
}

function FatigueTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-xl text-xs min-w-[190px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1 mb-1.5">
        {pt.label} (n={pt.total})
      </p>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between gap-3">
          <span className="text-emerald-300">Acerto:</span>
          <span className="font-black text-white">{pt.accuracyPct}%</span>
        </div>
        {pt.avgSeconds != null && (
          <div className="flex justify-between gap-3">
            <span className="text-sky-300">Tempo Médio:</span>
            <span className="font-bold text-sky-200">{pt.avgSeconds}s/q</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorAnatomyTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-slate-950/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-xl text-xs min-w-[205px]">
      <p className="font-black text-white border-b border-white/10 pb-1 mb-1.5">
        {pt.subject} ({pt.total} {pt.total === 1 ? 'erro' : 'erros'})
      </p>
      <div className="space-y-1 font-mono">
        {ERROR_META.filter((m) => pt[m.key] > 0).map((m) => (
          <div key={m.key} className="flex justify-between gap-3">
            <span className="flex items-center gap-1.5 font-sans text-slate-300">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: m.color }} />
              {m.label}
            </span>
            <span className="font-bold text-white">{pt[m.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const MetacognitionFatigueChart = React.memo(function MetacognitionFatigueChart({
  simuladoRows = [],
  focusCategory = null,
  showOnlyFocus = false,
  timeWindow = 'all',
  targetScore = 80,
  minScore = 0,
  maxScore = 100,
}) {
  const telemetry = useMemo(() => {
    let cutoffMs = null;
    if (timeWindow && timeWindow !== 'all') {
      const days = Number.parseInt(String(timeWindow), 10);
      if (Number.isFinite(days) && days > 0) {
        const todayKey = getDateKey(new Date());
        const todayNoon = todayKey ? parseNoonLocal(todayKey) : new Date();
        const cutoffNoon = todayNoon ? addDaysNoon(todayNoon, -days) : null;
        const cutoffKey = cutoffNoon ? getDateKey(cutoffNoon) : null;
        cutoffMs = cutoffKey ? toDateMs(cutoffKey) : null;
      }
    }

    const rows = safeArr(simuladoRows).filter((r) => {
      if (!r || r.valid === false || r.validated === false) return false;
      if (cutoffMs) {
        const dk = getDateKey(r.date || r.createdAt);
        const ms = dk ? toDateMs(dk) : NaN;
        if (Number.isFinite(ms) && ms < cutoffMs) return false;
      }
      if (showOnlyFocus && focusCategory) {
        if (r.categoryId != null && focusCategory.id != null) {
          return String(r.categoryId) === String(focusCategory.id);
        }
        const rSubj = r.subject || r.categoryName || r.materia || '';
        const fName = focusCategory.name || '';
        return Boolean(rSubj && fName && isSubjectMatch(rSubj, fName));
      }
      return true;
    });

    // Reagrupa linhas do mesmo simulado (mesmo batchId) para reconstruir os 4 quartis corretos
    // quando um Simulado IA Misto foi dividido por matéria/tópico em várias simuladoRows curtas.
    const runs = [];
    const batchRunMap = new Map();
    rows.forEach((row) => {
      const subject = row.subject || row.categoryName || row.materia || 'Geral';
      const rawTel = safeArr(row.questionTelemetry).map((q) => ({ ...q, subject }));
      if (!rawTel.length) return;
      if (row.batchId) {
        const bk = String(row.batchId);
        if (!batchRunMap.has(bk)) {
          const entry = [];
          batchRunMap.set(bk, entry);
          runs.push(entry);
        }
        batchRunMap.get(bk).push(...rawTel);
      } else {
        runs.push(rawTel);
      }
    });

    const getExplicitIdx = (q) => {
      const raw = q?.questionIndex ?? q?.idx;
      if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return NaN;
      const n = Number(raw);
      return Number.isFinite(n) ? n : NaN;
    };

    const items = [];
    runs.forEach((rawTel) => {
      const hasExplicitIdx = rawTel.some((q) => Number.isFinite(getExplicitIdx(q)));
      const tel = hasExplicitIdx
        ? rawTel
          .map((q, origIdx) => ({ q, origIdx }))
          .sort((a, b) => {
            const ia = getExplicitIdx(a.q);
            const ib = getExplicitIdx(b.q);
            const safeA = Number.isFinite(ia) ? ia : a.origIdx;
            const safeB = Number.isFinite(ib) ? ib : b.origIdx;
            return safeA - safeB;
          })
          .map((x) => x.q)
        : rawTel;
      const totalInRun = tel.length;
      tel.forEach((q, idx) => {
        items.push({
          ...q,
          // Somente corridas com >= 4 questões entram nos 4 quartis de fadiga (drills de 1–3q ainda contam em metacognição e erros)
          positionQuartile: totalInRun >= 4 ? Math.min(3, Math.floor((idx / totalInRun) * 4)) : null,
        });
      });
    });
    return items;
  }, [simuladoRows, focusCategory, showOnlyFocus, timeWindow]);

  // 1) Matriz de Metacognição (ignora questões em branco wasAnswered === false)
  const metaMatrix = useMemo(() => {
    const counts = {
      certezaOk: 0,
      certezaErr: 0,
      duvidaOk: 0,
      duvidaErr: 0,
      chuteOk: 0,
      chuteErr: 0,
    };
    telemetry.forEach((q) => {
      if (q.wasAnswered === false) return;
      const isCorrect = Boolean(q.correct ?? q.wasCorrect);
      if (q.confidence === 'certeza') isCorrect ? counts.certezaOk++ : counts.certezaErr++;
      else if (q.confidence === 'duvida') isCorrect ? counts.duvidaOk++ : counts.duvidaErr++;
      else if (q.confidence === 'chute') isCorrect ? counts.chuteOk++ : counts.chuteErr++;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [telemetry]);

  // 2) Anatomia dos Erros por Disciplina (com normalização de aliases legados e sem barras zeradas)
  const errorAnatomy = useMemo(() => {
    const bySubj = new Map();
    telemetry.forEach((q) => {
      const isCorrect = Boolean(q.correct ?? q.wasCorrect);
      if (isCorrect || q.wasAnswered === false || !q.errorType) return;
      const errKey = normalizeErrorType(q.errorType);
      if (!errKey) return;
      if (!bySubj.has(q.subject)) {
        bySubj.set(q.subject, { subject: q.subject, teoria: 0, atencao: 0, esquecimento: 0, tempo: 0, banca: 0, total: 0 });
      }
      const entry = bySubj.get(q.subject);
      entry[errKey] += 1;
      entry.total += 1;
    });
    return Array.from(bySubj.values())
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [telemetry]);

  // 3) Curva de Fadiga Intraprova (4 quartis: 1º ao 4º quarto do simulado)
  // Exclui questões deixadas em branco (wasAnswered === false) do denominador de acerto
  // para não confundir omissão estratégica (CEBRASPE) com queda por fadiga.
  const fatigueCurve = useMemo(() => {
    const labels = ['1º Quarto (Início)', '2º Quarto', '3º Quarto', '4º Quarto (Final)'];
    const buckets = labels.map((label) => ({ label, total: 0, answered: 0, correct: 0, timeSum: 0, timedCount: 0 }));
    telemetry.forEach((q) => {
      const b = buckets[q.positionQuartile];
      if (!b) return;
      b.total += 1;
      if (q.wasAnswered !== false) {
        b.answered += 1;
        if (q.correct ?? q.wasCorrect) b.correct += 1;
      }
      const sec = Number(q.timeSec ?? q.timeSpentSec ?? 0);
      if (Number.isFinite(sec) && sec > 0) {
        b.timeSum += sec;
        b.timedCount += 1;
      }
    });
    return buckets
      .filter((b) => b.answered > 0)
      .map((b) => ({
        label: b.label,
        accuracyPct: Math.round((b.correct / b.answered) * 100),
        avgSeconds: b.timedCount > 0 ? Math.round(b.timeSum / b.timedCount) : null,
        total: b.answered,
      }));
  }, [telemetry]);

  const hasTimedFatigue = fatigueCurve.some((b) => b.avgSeconds != null);
  const fatigueDelta = fatigueCurve.length >= 2
    ? fatigueCurve[fatigueCurve.length - 1].accuracyPct - fatigueCurve[0].accuracyPct
    : null;

  if (telemetry.length === 0) {
    return (
      <div className="min-h-[280px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/55 p-8 text-center">
        <Brain size={34} className="text-fuchsia-400/60" />
        <p className="text-sm font-bold text-slate-300">Telemetria por questão aguardando seu próximo Simulado IA</p>
        <p className="text-xs text-slate-400 max-w-md">
          A partir do próximo Simulado IA, o tempo por questão é gravado automaticamente e você pode marcar confiança (<em>Certeza / Dúvida / Chute</em>) e causa do erro em 1 clique para desbloquear estas 3 análises.
        </p>
      </div>
    );
  }

  const pctOf = (count) => (metaMatrix.total > 0 ? `${Math.round((count / metaMatrix.total) * 100)}%` : '0%');
  const uncertainOk = metaMatrix.counts.duvidaOk + metaMatrix.counts.chuteOk;
  const consciousGap = metaMatrix.counts.duvidaErr + metaMatrix.counts.chuteErr;
  const certezaTotal = metaMatrix.counts.certezaOk + metaMatrix.counts.certezaErr;
  const certezaAccPct = certezaTotal > 0 ? Math.round((metaMatrix.counts.certezaOk / certezaTotal) * 100) : null;
  const illusionPct = metaMatrix.total > 0 ? Math.round((metaMatrix.counts.certezaErr / metaMatrix.total) * 100) : 0;
  const gMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
  const gMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > gMin ? Number(maxScore) : gMin + 100;
  const tNum = Number(targetScore);
  const fatigueTargetPct = Number.isFinite(tNum)
    ? Math.round(Math.max(10, Math.min(100, ((tNum - gMin) / Math.max(1e-9, gMax - gMin)) * 100)))
    : 80;

  return (
    <div className="w-full space-y-6">
      {metaMatrix.total > 0 && (
        <BenchmarkStrip
          currentLabel={certezaAccPct != null ? 'Calibração de certeza' : 'Domínio real'}
          currentValue={certezaAccPct != null ? `${certezaAccPct}%` : pctOf(metaMatrix.counts.certezaOk)}
          targetLabel="Alvo calibração"
          targetValue="≥ 90%"
          gapLabel={certezaAccPct != null
            ? (certezaAccPct >= 90 ? `+${certezaAccPct - 90}pp acima` : `Faltam ${90 - certezaAccPct}pp`)
            : `Ilusão: ${illusionPct}% (alvo < 5%)`}
          status={certezaAccPct != null
            ? (certezaAccPct >= 90 && illusionPct < 5 ? 'success' : certezaAccPct >= 75 ? 'warning' : 'danger')
            : (illusionPct < 5 ? 'success' : 'warning')}
          progressPct={certezaAccPct != null ? (certezaAccPct / 90) * 100 : null}
          extra={`Ilusão de competência: ${illusionPct}% (alvo < 5%)`}
          compact
        />
      )}
      {/* 1. Matriz de Metacognição */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-fuchsia-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Matriz de Metacognição (Confiança × Resultado)
            </h4>
          </div>
          {metaMatrix.total > 0 && (
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              {metaMatrix.total} {metaMatrix.total === 1 ? 'questão avaliada' : 'questões avaliadas'}
            </span>
          )}
        </div>
        {metaMatrix.total === 0 ? (
          <p className="text-xs text-slate-400 py-3">Nenhuma questão marcada com confiança ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-bold uppercase text-emerald-300">Domínio Real</p>
                <span className="text-[11px] font-mono tabular-nums text-emerald-200/85">{pctOf(metaMatrix.counts.certezaOk)}</span>
              </div>
              <p className="text-2xl font-black font-mono tabular-nums text-white mt-1">{metaMatrix.counts.certezaOk}</p>
              <p className="text-[10px] text-emerald-200/75">Certeza + Acerto</p>
            </div>
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-bold uppercase text-rose-300">Conceito Errado Crítico</p>
                <span className="text-[11px] font-mono tabular-nums text-rose-200/85">{pctOf(metaMatrix.counts.certezaErr)}</span>
              </div>
              <p className="text-2xl font-black font-mono tabular-nums text-white mt-1">{metaMatrix.counts.certezaErr}</p>
              <p className="text-[10px] text-rose-200/75">Certeza + Erro (prioridade FSRS)</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-bold uppercase text-amber-300">Falso Domínio (Sorte / Dúvida)</p>
                <span className="text-[11px] font-mono tabular-nums text-amber-200/85">{pctOf(uncertainOk)}</span>
              </div>
              <p className="text-2xl font-black font-mono tabular-nums text-white mt-1">{uncertainOk}</p>
              <p className="text-[10px] text-amber-200/75">
                {metaMatrix.counts.duvidaOk} dúvida · {metaMatrix.counts.chuteOk} chute (revisar)
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-bold uppercase text-sky-300">Lacuna Consciente</p>
                <span className="text-[11px] font-mono tabular-nums text-sky-200/85">{pctOf(consciousGap)}</span>
              </div>
              <p className="text-2xl font-black font-mono tabular-nums text-white mt-1">{consciousGap}</p>
              <p className="text-[10px] text-sky-200/75">
                {metaMatrix.counts.duvidaErr} dúvida · {metaMatrix.counts.chuteErr} chute + Erro
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Curva de Fadiga Intraprova */}
      {fatigueCurve.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-cyan-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-white">
                Curva de Fadiga Intraprova (Início → Fim da Sessão)
              </h4>
            </div>
            {fatigueDelta !== null && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  Alvo resistência: queda ≤ 5pp · Meta: {fatigueTargetPct}%
                </span>
                <span
                  className={`text-[11px] font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-full border ${
                    fatigueDelta <= -12
                      ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                      : fatigueDelta >= 5
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                        : 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                  }`}
                >
                  {fatigueDelta <= -12
                    ? `Queda de fadiga: ${fatigueDelta}pp no final`
                    : fatigueDelta >= 5
                      ? `Aquecimento positivo: +${fatigueDelta}pp`
                      : `Resistência estável (${fatigueDelta >= 0 ? '+' : ''}${fatigueDelta}pp)`}
                </span>
              </div>
            )}
          </div>
          <ChartFrame minHeight={230} label="Analisando fadiga intraprova">
            <div className="h-[230px] w-full" role="img" aria-label="Curva de fadiga intraprova por quarto do simulado">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={1}>
                <ComposedChart data={fatigueCurve} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                  <YAxis yAxisId="left" domain={[0, 100]} stroke="#34d399" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  {hasTimedFatigue && (
                    <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={10} tickFormatter={(v) => `${v}s`} />
                  )}
                  <Tooltip content={<FatigueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <ReferenceLine
                    yAxisId="left"
                    y={fatigueTargetPct}
                    stroke="#10b981"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{ value: `Meta ${fatigueTargetPct}%`, position: 'insideTopRight', fill: '#34d399', fontSize: 10, fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {hasTimedFatigue && (
                    <Bar yAxisId="right" dataKey="avgSeconds" name="Tempo Médio (s/q)" fill="#0ea5e9" fillOpacity={0.5} radius={[6, 6, 0, 0]} barSize={32} />
                  )}
                  <Line yAxisId="left" type="monotone" dataKey="accuracyPct" name="Acerto (%)" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>
      )}

      {/* 3. Anatomia dos Erros */}
      {errorAnatomy.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-slate-950/55 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Anatomia dos Erros por Disciplina
            </h4>
          </div>
          <ChartFrame minHeight={230} label="Classificando causas dos erros">
            <div className="h-[230px] w-full" role="img" aria-label="Anatomia de erros por tipo e disciplina">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={1}>
                <BarChart data={errorAnatomy} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 13)}…` : v)} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={10} />
                  <Tooltip content={<ErrorAnatomyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {ERROR_META.map((m) => (
                    <Bar key={m.key} dataKey={m.key} name={m.label} stackId="err" fill={m.color} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>
      )}
    </div>
  );
});

export default MetacognitionFatigueChart;
