import React, { useMemo, useState } from 'react';
import { Flame, AlertTriangle, Brain, ShieldAlert, X } from 'lucide-react';
import { computeACWR } from '../../engine/adaptive/workloadACWR';
import { computeWeeklyCategoryCorrelation } from '../../engine/diagnostics';
import { estimateIRTAbility } from '../../engine/adaptive/irtEngine';
import { normalizeDate } from '../../utils/dateHelper';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);
const ILLUSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Gera alertas táticos automáticos no topo do Coach quando detecta:
 * 1) Risco de Burnout (ACWR > 1.5×)
 * 2) Crowding-out entre disciplinas (r <= -0.45)
 * 3) Incoerência pedagógica TRI (errando fáceis e acertando difíceis)
 * 4) Ilusão de competência (certeza + erro recorrente nos últimos 30 dias)
 */
export const AdaptiveTacticalAlerts = React.memo(function AdaptiveTacticalAlerts({
  contestId = 'default',
  categories = [],
  studyLogs = [],
  simuladoRows = [],
  simulados = [],
  minScore = 0,
  maxScore = 100,
}) {
  const scopeKey = String(contestId || 'default');
  const [dismissedByContest, setDismissedByContest] = useState(() => ({}));
  const dismissedIds = dismissedByContest[scopeKey] || new Set();

  const alerts = useMemo(() => {
    const list = [];

    // 1. ACWR Burnout alert
    const acwr = computeACWR(studyLogs);
    if (acwr.hasChronicle && (acwr.zone === 'burnout_risk' || acwr.zone === 'elevated')) {
      list.push({
        id: 'acwr-alert',
        severity: acwr.zone === 'burnout_risk' ? 'critical' : 'warning',
        icon: Flame,
        title: acwr.zone === 'burnout_risk' ? `Risco de Burnout (ACWR ${acwr.acwr.toFixed(2)}×)` : `Carga Cognitiva Elevada (ACWR ${acwr.acwr.toFixed(2)}×)`,
        body: `${acwr.advice} Bloco Pomodoro ideal hoje: ${acwr.recommendedBlockMinutes} min.`,
      });
    }

    // 2. Crowding-Out detection
    const corr = computeWeeklyCategoryCorrelation(categories, maxScore, minScore);
    const worstCrowding = (corr.pairs || []).find((p) => p.type === 'crowding_out');
    if (worstCrowding) {
      list.push({
        id: 'crowding-out',
        severity: 'warning',
        icon: AlertTriangle,
        title: `Canibalização Detectada (${worstCrowding.catA} × ${worstCrowding.catB})`,
        body: `Correlação semanal r = ${worstCrowding.r} (${worstCrowding.n} semanas): quando você acelera em ${worstCrowding.catA}, seu desempenho cai em ${worstCrowding.catB}. Use interleaving na Agenda para alternar blocos.`,
      });
    }

    // 3. TRI Pedagogical Incoherence (deduplicado entre simuladoRows, simulados e simuladoStats.history)
    const rawEntries = [
      ...safeArr(simuladoRows),
      ...safeArr(simulados),
      ...safeArr(categories).flatMap((c) =>
        safeArr(c?.simuladoStats?.history).map((h) => ({
          ...h,
          categoryId: h?.categoryId ?? c?.id,
          subject: h?.subject || h?.categoryName || c?.name || '',
        }))
      ),
    ];
    const seenSimKeys = new Set();
    const allEntries = [];
    rawEntries.forEach((entry, idx) => {
      if (!entry || entry.valid === false || entry.validated === false || entry.source === 'manual-error-notebook') return;
      const d = normalizeDate(entry.date || entry.createdAt);
      const dayKey = d && Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : '';
      const subjKey = String(entry.categoryId || entry.subject || entry.categoryName || '').trim().toLowerCase();
      const scoreSig = entry.score != null ? Math.round(Number(entry.score) * 10) : `${entry.correct ?? ''}/${entry.total ?? ''}`;
      const dedupKey = entry.id && !String(entry.id).startsWith('legacy-')
        ? `id:${entry.id}`
        : (dayKey ? `dt:${subjKey}:${dayKey}:${scoreSig}` : `idx:${idx}`);
      if (seenSimKeys.has(dedupKey)) return;
      seenSimKeys.add(dedupKey);
      allEntries.push(entry);
    });
    const irt = estimateIRTAbility(allEntries, { minScore, maxScore });
    if (irt.pedagogicalIncoherence && irt.incoherenceMessage) {
      list.push({
        id: 'tri-incoherence',
        severity: 'warning',
        icon: Brain,
        title: `Incoerência Pedagógica TRI (θ = ${irt.theta >= 0 ? '+' : ''}${irt.theta})`,
        body: irt.incoherenceMessage,
      });
    }

    // 4. Illusion of Competence (certeza + erro efetivamente respondido na janela recente de 30 dias)
    const nowMs = Date.now();
    const errorNotebookRows = safeArr(simuladoRows).filter(
      (r) => r && r.valid !== false && r.validated !== false && r.source === 'manual-error-notebook'
    );
    const recentRows = [...allEntries, ...errorNotebookRows].filter((r) => {
      if (!r || r.valid === false || r.validated === false) return false;
      const d = normalizeDate(r.date || r.createdAt);
      if (!d || !Number.isFinite(d.getTime())) return true; // preserva linhas sem data
      return (nowMs - d.getTime()) <= ILLUSION_WINDOW_MS;
    });
    const seenTelIds = new Set();
    const allTelemetry = recentRows.flatMap((r) => safeArr(r?.questionTelemetry)).filter((q, qIdx) => {
      if (!q) return false;
      const qKey = q.id ? `qid:${q.id}` : `qidx:${qIdx}:${q.questionNumber ?? ''}:${q.confidence ?? ''}:${q.correct ?? q.wasCorrect ?? ''}`;
      if (seenTelIds.has(qKey)) return false;
      seenTelIds.add(qKey);
      return true;
    });
    const illusionErrors = allTelemetry.filter((q) => {
      if (!q || q.confidence !== 'certeza') return false;
      if (q.wasAnswered === false) return false;
      return q.correct === false || q.wasCorrect === false;
    });
    if (illusionErrors.length >= 2) {
      list.push({
        id: 'illusion-competence',
        severity: 'critical',
        icon: ShieldAlert,
        title: `Ilusão de Competência (${illusionErrors.length} erros com "Certeza")`,
        body: 'Você marcou "Certeza" mas errou essas questões recentemente. Revise no Caderno de Erros e envie para Flashcards FSRS com prioridade crítica.',
      });
    }

    return list;
  }, [categories, studyLogs, simuladoRows, simulados, minScore, maxScore]);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {visibleAlerts.map((a) => {
        const Icon = a.icon;
        const isCritical = a.severity === 'critical';
        return (
          <div
            key={a.id}
            className={`rounded-2xl border p-3.5 flex items-start gap-3 ${
              isCritical
                ? 'border-rose-500/35 bg-rose-500/10 text-rose-100'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider">{a.title}</h4>
              <p className="text-[11px] opacity-85 leading-relaxed mt-1">{a.body}</p>
            </div>
            <button
              type="button"
              aria-label={`Dispensar alerta ${a.title}`}
              onClick={() =>
                setDismissedByContest((prev) => ({
                  ...prev,
                  [scopeKey]: new Set([...(prev[scopeKey] || []), a.id]),
                }))
              }
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-opacity shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
});

export default AdaptiveTacticalAlerts;
