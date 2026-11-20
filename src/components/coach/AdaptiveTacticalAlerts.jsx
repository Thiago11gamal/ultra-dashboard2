import React, { useMemo } from 'react';
import { Flame, AlertTriangle, Brain, ShieldAlert } from 'lucide-react';
import { computeACWR } from '../../engine/adaptive/workloadACWR';
import { computeWeeklyCategoryCorrelation } from '../../engine/diagnostics';
import { estimateIRTAbility } from '../../engine/adaptive/irtEngine';

const safeArr = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : [])).filter(Boolean);

/**
 * Gera alertas táticos automáticos no topo do Coach quando detecta:
 * 1) Risco de Burnout (ACWR > 1.5×)
 * 2) Crowding-out entre disciplinas (r <= -0.45)
 * 3) Incoerência pedagógica TRI (errando fáceis e acertando difíceis)
 * 4) Ilusão de competência (certeza + erro recorrente)
 */
export const AdaptiveTacticalAlerts = React.memo(function AdaptiveTacticalAlerts({
  categories = [],
  studyLogs = [],
  simuladoRows = [],
  minScore = 0,
  maxScore = 100,
}) {
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
    const corr = computeWeeklyCategoryCorrelation(categories, minScore, maxScore);
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

    // 3. TRI Pedagogical Incoherence
    const allEntries = [
      ...safeArr(simuladoRows),
      ...safeArr(categories).flatMap((c) => safeArr(c?.simuladoStats?.history)),
    ];
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

    // 4. Illusion of Competence (certeza + erro)
    const allTelemetry = safeArr(simuladoRows).flatMap((r) => safeArr(r?.questionTelemetry));
    const illusionErrors = allTelemetry.filter((q) => q && q.confidence === 'certeza' && q.correct === false);
    if (illusionErrors.length >= 2) {
      list.push({
        id: 'illusion-competence',
        severity: 'critical',
        icon: ShieldAlert,
        title: `Ilusão de Competência (${illusionErrors.length} erros com "Certeza")`,
        body: 'Você marcou "Certeza" mas errou essas questões. Revise no Caderno de Erros e envie para Flashcards FSRS com prioridade crítica.',
      });
    }

    return list;
  }, [categories, studyLogs, simuladoRows, minScore, maxScore]);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      {alerts.map((a) => {
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
            <div className="min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider">{a.title}</h4>
              <p className="text-[11px] opacity-85 leading-relaxed mt-1">{a.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default AdaptiveTacticalAlerts;
