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
} from 'recharts';
import { Brain, AlertOctagon, Timer } from 'lucide-react';
import { ChartFrame } from '../ChartFrame';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

const ERROR_META = [
  { key: 'teoria', label: 'Lacuna Teórica', color: '#f43f5e' },
  { key: 'atencao', label: 'Desatenção / Leitura', color: '#f59e0b' },
  { key: 'esquecimento', label: 'Esquecimento', color: '#a855f7' },
  { key: 'tempo', label: 'Pressão de Tempo', color: '#38bdf8' },
  { key: 'banca', label: 'Estilo da Banca', color: '#10b981' },
];

export const MetacognitionFatigueChart = React.memo(function MetacognitionFatigueChart({
  simuladoRows = [],
  focusCategory = null,
  showOnlyFocus = false,
}) {
  const telemetry = useMemo(() => {
    const rows = safeArr(simuladoRows).filter(
      (r) => r && r.valid !== false && r.validated !== false && (!showOnlyFocus || !focusCategory || r.categoryId === focusCategory.id)
    );
    const items = [];
    rows.forEach((row) => {
      const subject = row.subject || row.materia || 'Geral';
      const tel = safeArr(row.questionTelemetry);
      const totalInRun = tel.length;
      tel.forEach((q, idx) => {
        items.push({
          ...q,
          subject,
          positionQuartile: totalInRun >= 4 ? Math.min(3, Math.floor((idx / totalInRun) * 4)) : Math.min(3, idx),
        });
      });
    });
    return items;
  }, [simuladoRows, focusCategory, showOnlyFocus]);

  // 1) Matriz de Metacognição
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
      if (q.confidence === 'certeza') q.correct ? counts.certezaOk++ : counts.certezaErr++;
      else if (q.confidence === 'duvida') q.correct ? counts.duvidaOk++ : counts.duvidaErr++;
      else if (q.confidence === 'chute') q.correct ? counts.chuteOk++ : counts.chuteErr++;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [telemetry]);

  // 2) Anatomia dos Erros por Disciplina
  const errorAnatomy = useMemo(() => {
    const bySubj = new Map();
    telemetry.forEach((q) => {
      if (q.correct || !q.errorType) return;
      if (!bySubj.has(q.subject)) {
        bySubj.set(q.subject, { subject: q.subject, teoria: 0, atencao: 0, esquecimento: 0, tempo: 0, banca: 0, total: 0 });
      }
      const entry = bySubj.get(q.subject);
      if (q.errorType in entry) {
        entry[q.errorType] += 1;
        entry.total += 1;
      }
    });
    return Array.from(bySubj.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [telemetry]);

  // 3) Curva de Fadiga Intraprova (4 quartis: 1º ao 4º quarto do simulado)
  const fatigueCurve = useMemo(() => {
    const labels = ['1º Quarto (Início)', '2º Quarto', '3º Quarto', '4º Quarto (Final)'];
    const buckets = labels.map((label) => ({ label, total: 0, correct: 0, timeSum: 0, timedCount: 0 }));
    telemetry.forEach((q) => {
      const b = buckets[q.positionQuartile];
      if (!b) return;
      b.total += 1;
      if (q.correct) b.correct += 1;
      if (Number(q.timeSec) > 0) {
        b.timeSum += Number(q.timeSec);
        b.timedCount += 1;
      }
    });
    return buckets
      .filter((b) => b.total > 0)
      .map((b) => ({
        label: b.label,
        accuracyPct: Math.round((b.correct / b.total) * 100),
        avgSeconds: b.timedCount > 0 ? Math.round(b.timeSum / b.timedCount) : null,
        total: b.total,
      }));
  }, [telemetry]);

  if (telemetry.length === 0) {
    return (
      <div className="min-h-[280px] flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-8 text-center">
        <Brain size={34} className="text-fuchsia-400/50" />
        <p className="text-sm font-bold text-slate-300">Telemetria por questão aguardando seu próximo Simulado IA</p>
        <p className="text-xs text-slate-500 max-w-md">
          A partir do próximo Simulado IA, o tempo por questão é gravado automaticamente e você pode marcar confiança (<em>Certeza / Dúvida / Chute</em>) e causa do erro em 1 clique para desbloquear estas 3 análises.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Matriz de Metacognição */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-fuchsia-400" />
          <h4 className="text-xs font-black uppercase tracking-widest text-white">
            Matriz de Metacognição (Confiança × Resultado)
          </h4>
        </div>
        {metaMatrix.total === 0 ? (
          <p className="text-xs text-slate-500 py-3">Nenhuma questão marcada com confiança ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-300">Domínio Real</p>
              <p className="text-2xl font-black font-mono text-white mt-1">{metaMatrix.counts.certezaOk}</p>
              <p className="text-[10px] text-emerald-200/70">Certeza + Acerto</p>
            </div>
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
              <p className="text-[10px] font-bold uppercase text-rose-300">Conceito Errado Crítico</p>
              <p className="text-2xl font-black font-mono text-white mt-1">{metaMatrix.counts.certezaErr}</p>
              <p className="text-[10px] text-rose-200/70">Certeza + Erro (prioridade FSRS)</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-[10px] font-bold uppercase text-amber-300">Falso Domínio (Sorte)</p>
              <p className="text-2xl font-black font-mono text-white mt-1">{metaMatrix.counts.chuteOk}</p>
              <p className="text-[10px] text-amber-200/70">Chute + Acerto (revisar)</p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
              <p className="text-[10px] font-bold uppercase text-sky-300">Lacuna Consciente</p>
              <p className="text-2xl font-black font-mono text-white mt-1">{metaMatrix.counts.duvidaErr + metaMatrix.counts.chuteErr}</p>
              <p className="text-[10px] text-sky-200/70">Dúvida/Chute + Erro</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Curva de Fadiga Intraprova */}
      {fatigueCurve.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-cyan-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">
              Curva de Fadiga Intraprova (Início → Fim da Sessão)
            </h4>
          </div>
          <ChartFrame minHeight={230} label="Analisando fadiga intraprova">
            <div className="h-[230px] w-full" role="img" aria-label="Curva de fadiga intraprova por quarto do simulado">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={1}>
                <ComposedChart data={fatigueCurve} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                  <YAxis yAxisId="left" domain={[0, 100]} stroke="#34d399" fontSize={10} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={10} tickFormatter={(v) => `${v}s`} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="right" dataKey="avgSeconds" name="Tempo Médio (s/q)" fill="#0ea5e9" fillOpacity={0.5} radius={[6, 6, 0, 0]} barSize={32} />
                  <Line yAxisId="left" type="monotone" dataKey="accuracyPct" name="Acerto (%)" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>
      )}

      {/* 3. Anatomia dos Erros */}
      {errorAnatomy.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
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
                  <Tooltip />
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
