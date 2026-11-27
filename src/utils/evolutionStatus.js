import { formatValue } from './scoreHelper';
import { getDateKey } from './dateHelper';
import { addDaysNoon } from './parseNoonLocal';
import { computeTrendStatus } from './trendStatus';

export { computeTrendStatus };

const safeNum = (value, fallback = null) => {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') {
    return fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

const stdDev = (values) => {
  if (!Array.isArray(values) || values.length < 2) return null;

  const mean = average(values);
  if (!Number.isFinite(mean)) return null;

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Number.isFinite(variance) ? Math.sqrt(variance) : null;
};

export function computeEvolutionStatuses({
  timeline = [],
  filteredChartData = null,
  categories = [],
  focusCategory = null,
  showOnlyFocus = false,
  targetScore = 0,
  unit = '%',
  focusUnit = null,
  minScore = 0,
  maxScore = 100,
  activeMcResult = null,
  subjectAggData = [],
  heatmapData = {},
  projectDays = 30,
  hasGoalDate = true,
  daysToExam = null,
  timeWindow = 'all',
  examDurationMinutes = null,
  examTotalQuestions = null,
  now = null
}) {
  const statuses = [];
  const refNow = (now instanceof Date && !Number.isNaN(now.getTime())) ? now : new Date();

  const safeMin = safeNum(minScore, 0);
  const safeMax = Math.max(safeMin + 1, safeNum(maxScore, 100));
  const range = safeMax - safeMin;
  const safeTarget = Math.max(safeMin, Math.min(safeMax, safeNum(targetScore, safeMin)));

  const effFocusUnit = focusUnit || unit;
  const fmtFocus = (v) => `${formatValue(v)}${effFocusUnit}`;
  const focusScopeLabel = focusCategory?.name ? `Foco: ${focusCategory.name}` : 'Disciplina em foco';
  const windowLabel = timeWindow && timeWindow !== 'all' ? `últimos ${timeWindow}d` : 'histórico total';

  const hasExplicitWindowFilter = Boolean(timeWindow && timeWindow !== 'all' && Array.isArray(filteredChartData));
  const effectiveTimeline = hasExplicitWindowFilter
    ? filteredChartData
    : (Array.isArray(filteredChartData) && filteredChartData.length > 0
      ? filteredChartData
      : (Array.isArray(timeline) ? timeline : []));

  const focusId = focusCategory?.id;
  const hasFocusId = focusId !== null && focusId !== undefined && String(focusId).trim() !== '';
  const isSameId = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
  const focusMin = hasFocusId ? safeNum(focusCategory?.minScore, safeMin) : safeMin;
  const focusMax = hasFocusId ? Math.max(focusMin + 1, safeNum(focusCategory?.maxScore, safeMax)) : safeMax;
  const focusRange = focusMax - focusMin;
  const focusScale = focusRange / 100;
  const globalTargetRatio = range > 0 ? (safeTarget - safeMin) / range : 0.8;
  const rawFocusCutoff = hasFocusId ? safeNum(focusCategory?.minCutoff, null) : null;
  const focusTarget = hasFocusId
    ? (rawFocusCutoff != null && rawFocusCutoff > focusMin
      ? Math.min(focusMax, rawFocusCutoff)
      : (focusMax === safeMax && focusMin === safeMin ? safeTarget : focusMin + globalTargetRatio * focusRange))
    : safeTarget;

  const getLastValidFrom = (series, key) => {
    if (!Array.isArray(series) || series.length === 0) return null;
    for (let i = series.length - 1; i >= 0; i--) {
      const val = safeNum(series[i]?.[key], null);
      if (val != null) return val;
    }
    return null;
  };

  const currentBay = hasFocusId ? getLastValidFrom(effectiveTimeline, `bay_${focusId}`) : null;
  const currentRaw = hasFocusId ? getLastValidFrom(effectiveTimeline, `raw_${focusId}`) : null;
  const currentStats = hasFocusId ? getLastValidFrom(effectiveTimeline, `stats_${focusId}`) : null;
  const current = currentBay ?? currentRaw ?? currentStats;

  const getValueSeries = (prefix) => {
    if (!hasFocusId || !Array.isArray(effectiveTimeline)) return [];

    return effectiveTimeline
      .map((d) => safeNum(d?.[`${prefix}${focusId}`], NaN))
      .filter((v) => Number.isFinite(v));
  };

  const baySeries = getValueSeries('bay_');
  const rawSeries = getValueSeries('raw_');
  const levelSeries = baySeries.length >= rawSeries.length ? baySeries : rawSeries;

  // Nível atual
  const warnFloorCurrent = Math.max(focusMin, focusTarget - 8 * focusScale);
  const currentTone =
    current == null
      ? 'neutral'
      : current >= focusTarget
        ? 'success'
        : current >= warnFloorCurrent
          ? 'warning'
          : 'danger';
  statuses.push({
    id: 'current',
    label: 'Nível atual',
    value: current == null ? '—' : fmtFocus(current),
    tone: currentTone,
    icon: '📍',
    statusText:
      current == null
        ? 'Sem dados'
        : currentTone === 'success'
          ? 'Na meta'
          : currentTone === 'warning'
            ? 'Perto da meta'
            : 'Abaixo da meta',
    scope: 'focus',
    scopeLabel: focusScopeLabel,
    howToRead: `Estima seu domínio real (modelo Bayesiano) na disciplina em foco (${windowLabel}), filtrando ruído de simulados isolados. Compare diretamente com a meta de ${fmtFocus(focusTarget)}.`,
    scaleGuide: `Verde: ≥ ${fmtFocus(focusTarget)} (na meta) · Amarelo: ${fmtFocus(warnFloorCurrent)} a ${fmtFocus(focusTarget)} · Vermelho: < ${fmtFocus(warnFloorCurrent)}.`,
    actionHint:
      current == null
        ? 'Registre simulados nesta disciplina para estimar seu nível.'
        : currentTone === 'success'
          ? 'Domínio consolidado — mantenha revisões espaçadas e suba o nível das questões.'
          : currentTone === 'warning'
            ? 'Falta pouco para bater a meta — ataque os subtópicos com maior perda de pontos.'
            : 'Prioridade alta — reforce a base teórica e resolva questões focadas nos erros.',
    help: `Nível atual estimado na escala da prova (${focusScopeLabel}). Meta: ${fmtFocus(focusTarget)}.`
  });

  // Gap até a meta
  if (current != null) {
    const gap = current - focusTarget;
    const gapWarnFloor = -5 * focusScale;
    const gapTone = gap >= 0 ? 'success' : gap >= gapWarnFloor ? 'warning' : 'danger';

    statuses.push({
      id: 'gap',
      label: 'Distância da meta',
      value: `${gap >= 0 ? '+' : ''}${formatValue(gap)}${effFocusUnit}`,
      tone: gapTone,
      icon: '🎯',
      statusText:
        gap >= 0 ? 'Folga acima' : gapTone === 'warning' ? 'Quase lá' : 'Déficit alto',
      scope: 'focus',
      scopeLabel: focusScopeLabel,
      howToRead: `Mostra quantos pontos faltam (sinal −) ou sobram (sinal +) entre seu nível atual (${fmtFocus(current)}) e a meta (${fmtFocus(focusTarget)}).`,
      scaleGuide: `Verde: ≥ 0${effFocusUnit} (meta batida) · Amarelo: até −${formatValue(5 * focusScale)}${effFocusUnit} · Vermelho: abaixo de −${formatValue(5 * focusScale)}${effFocusUnit}.`,
      actionHint:
        gap >= 0
          ? 'Você opera com margem positiva — preserve esta folga até o dia da prova.'
          : gapTone === 'warning'
            ? 'Uma revisão cirúrgica nos 2 assuntos mais fracos pode zerar esta diferença.'
            : 'Redirecione horas semanais para fechar este déficit antes de temas secundários.',
      help: `Diferença entre o nível atual (${fmtFocus(current)}) e a meta (${fmtFocus(focusTarget)}).`
    });
  }

  // REFACTOR-TREND-01: usar computeTrendStatus centralizado
  statuses.push(
    computeTrendStatus(levelSeries, {
      formatValue,
      unit: effFocusUnit,
      scale: focusScale,
      scopeLabel: focusScopeLabel
    })
  );

  // Probabilidade Monte Carlo
  const probability = safeNum(activeMcResult?.probability, null);

  if (probability != null) {
    const p = Math.max(0, Math.min(100, probability));
    const probTone = p >= 70 ? 'success' : p >= 45 ? 'warning' : 'danger';

    statuses.push({
      id: 'probability',
      label: 'Chance de aprovação',
      value: `${p.toFixed(0)}%`,
      tone: probTone,
      icon: '🚀',
      statusText: p >= 70 ? 'Zona segura' : p >= 45 ? 'Disputa aberta' : 'Risco elevado',
      scope: 'focus',
      scopeLabel: focusScopeLabel,
      howToRead: `Percentual de cenários simulados (Monte Carlo) em que você atinge a meta (${fmtFocus(focusTarget)}) até a data da prova, levando em conta seu nível, ritmo e oscilação.`,
      scaleGuide: 'Verde: ≥ 70% (alta chance) · Amarelo: 45% a 69% (incerto) · Vermelho: < 45% (risco).',
      actionHint:
        p >= 70
          ? 'Trajetória consistente com aprovação — reduza variância mantendo constância.'
          : p >= 45
            ? 'Pequenos ganhos de consistência elevam rápido essa chance acima de 70%.'
            : 'Use a aba Tornado & Risco para identificar qual ajuste mais eleva sua probabilidade.',
      help: `Probabilidade projetada pelo Monte Carlo de atingir ${fmtFocus(focusTarget)} em ${focusScopeLabel}.`
    });
  }

  // Constância nos últimos 14 dias
  const rawHeatmapDates = Array.isArray(heatmapData?.dates) ? heatmapData.dates : [];
  const heatmapRows = Array.isArray(heatmapData?.rows) ? heatmapData.rows : [];
  const isFocusScoped = Boolean(showOnlyFocus && hasFocusId);
  const focusRow = isFocusScoped
    ? heatmapRows.find((r) => isSameId(r?.cat?.id, focusId))
    : null;
  const heatmapDates = isFocusScoped && !focusRow
    ? []
    : rawHeatmapDates
      .map((d, idx) => {
        if (focusRow && !focusRow.cells?.[idx]) return null;
        return typeof d === 'string' ? d : d?.key || getDateKey(d);
      })
      .filter(Boolean);
  const timelineDatesForConst = Array.isArray(timeline)
    ? timeline
      .filter((d) => {
        if (!d?.date) return false;
        if (showOnlyFocus && hasFocusId) {
          return d[`raw_${focusId}`] != null || safeNum(d[`raw_total_${focusId}`], 0) > 0;
        }
        return true;
      })
      .map((d) => d.date)
    : [];
  const allActiveDates = new Set([
    ...heatmapDates,
    ...timelineDatesForConst
  ]);

  if (allActiveDates.size > 0 || (showOnlyFocus && hasFocusId && (rawHeatmapDates.length > 0 || timeline.length > 0))) {
    const todayKey = getDateKey(refNow);
    let activeDays = 0;
    for (let i = 0; i < 14; i++) {
      const shifted = todayKey ? addDaysNoon(todayKey, -i) : null;
      const k = shifted ? getDateKey(shifted) : null;
      if (k && allActiveDates.has(k)) {
        activeDays++;
      }
    }

    const constTone = activeDays >= 8 ? 'success' : activeDays >= 4 ? 'warning' : 'danger';
    statuses.push({
      id: 'consistency',
      label: 'Constância (14 dias)',
      value: `${activeDays}/14`,
      tone: constTone,
      icon: '📅',
      statusText: activeDays >= 8 ? 'Ritmo firme' : activeDays >= 4 ? 'Regular' : 'Baixa frequência',
      scope: showOnlyFocus && hasFocusId ? 'focus' : 'global',
      scopeLabel: showOnlyFocus && hasFocusId ? focusScopeLabel : 'Visão geral',
      howToRead: 'Conta em quantos dias diferentes dos últimos 14 dias corridos você registrou pelo menos 1 simulado. Quanto maior o número, menor o risco de esquecimento.',
      scaleGuide: 'Verde: 8 a 14 dias ativos · Amarelo: 4 a 7 dias · Vermelho: 0 a 3 dias.',
      actionHint:
        activeDays >= 8
          ? 'Ótima frequência! O hábito está bem consolidado.'
          : activeDays >= 4
            ? 'Tente incluir blocos curtos (10–15 questões) em mais dias da semana.'
            : 'Retome com metas curtas diárias — regularidade vale mais do que maratonas isoladas.',
      help: 'Dias com simulado cadastrado nos últimos 14 dias.'
    });
  }

  // Volatilidade dos resultados brutos
  const recentRaw = rawSeries.slice(-5);

  if (recentRaw.length >= 3) {
    const volatility = stdDev(recentRaw);

    if (Number.isFinite(volatility)) {
      const volLow = 5 * focusScale;
      const volMid = 12 * focusScale;
      const volTone = volatility <= volLow ? 'success' : volatility <= volMid ? 'warning' : 'danger';
      const volUnit = effFocusUnit === '%' ? ' pp' : ` ${effFocusUnit}`;

      statuses.push({
        id: 'volatility',
        label: 'Volatilidade',
        value: `σ ${formatValue(volatility)}${volUnit}`,
        tone: volTone,
        icon: '📊',
        statusText: volTone === 'success' ? 'Muito estável' : volTone === 'warning' ? 'Oscilação moderada' : 'Alta oscilação',
        scope: 'focus',
        scopeLabel: focusScopeLabel,
        howToRead: 'O símbolo σ (desvio padrão) mede o quanto suas últimas 3 a 5 notas brutas variaram entre si. Quanto menor o número, mais previsível será sua nota no dia da prova.',
        scaleGuide: `Verde: ≤ ${formatValue(volLow)}${volUnit} (estável) · Amarelo: até ${formatValue(volMid)}${volUnit} · Vermelho: > ${formatValue(volMid)}${volUnit} (efeito montanha-russa).`,
        actionHint:
          volTone === 'success'
            ? 'Excelente estabilidade — baixa chance de surpresa negativa na prova.'
            : volTone === 'warning'
              ? 'Verifique na aba Consistência quais tópicos puxam a nota para baixo.'
              : 'Oscilação alta costuma indicar chutes ou lacunas em subtópicos específicos. Revise a base.',
        help: 'Variação (desvio padrão σ) dos últimos resultados brutos. Quanto menor, mais estável.'
      });
    }
  }

  // Incerteza bayesiana
  if (hasFocusId) {
    const ciLow = getLastValidFrom(effectiveTimeline, `bay_ci_low_${focusId}`);
    const ciHigh = getLastValidFrom(effectiveTimeline, `bay_ci_high_${focusId}`);

    if (ciLow != null && ciHigh != null) {
      const width = Math.abs(ciHigh - ciLow);
      const halfWidth = width / 2;
      const uncGoodHalf = 4 * focusScale;
      const uncWarnHalf = 10 * focusScale;
      const uncTone = width <= 8 * focusScale ? 'success' : width <= 20 * focusScale ? 'warning' : 'danger';

      statuses.push({
        id: 'uncertainty',
        label: 'Incerteza bayesiana',
        value: `±${formatValue(halfWidth)}${effFocusUnit}`,
        tone: uncTone,
        icon: '🧠',
        statusText: uncTone === 'success' ? 'Alta precisão' : uncTone === 'warning' ? 'Em calibração' : 'Pouca amostra',
        scope: 'focus',
        scopeLabel: focusScopeLabel,
        howToRead: `Margem de erro do seu nível estimado (IC 95%: ${fmtFocus(ciLow)} a ${fmtFocus(ciHigh)}). Quanto menor o valor (±), mais certeza o motor estatístico tem sobre seu domínio real.`,
        scaleGuide: `Verde: ≤ ±${formatValue(uncGoodHalf)}${effFocusUnit} (alta certeza) · Amarelo: até ±${formatValue(uncWarnHalf)}${effFocusUnit} · Vermelho: > ±${formatValue(uncWarnHalf)}${effFocusUnit} (alta incerteza).`,
        actionHint:
          uncTone === 'success'
            ? 'Estimativa bem calibrada — você pode confiar neste nível para planejar o edital.'
            : 'Resolva mais questões/simulados nesta matéria para afinar a estimativa e reduzir o ±.',
        help: `Faixa de confiança (IC 95%: ${fmtFocus(ciLow)} a ${fmtFocus(ciHigh)}). Quanto menor o ±, maior a certeza.`
      });
    }
  }

  // Matérias abaixo da meta
  if (Array.isArray(categories) && categories.length > 0) {
    let evaluatedCount = 0;
    const below = categories.filter((cat) => {
      const catMin = safeNum(cat?.minScore, safeMin);
      const catMax = Math.max(catMin + 1, safeNum(cat?.maxScore, safeMax));
      const catRange = catMax - catMin;
      const catScale = catRange / 100;

      const fromTimeline =
        getLastValidFrom(effectiveTimeline, `bay_${cat.id}`) ??
        getLastValidFrom(effectiveTimeline, `raw_${cat.id}`) ??
        getLastValidFrom(effectiveTimeline, `stats_${cat.id}`) ??
        getLastValidFrom(timeline, `bay_${cat.id}`) ??
        getLastValidFrom(timeline, `raw_${cat.id}`) ??
        getLastValidFrom(timeline, `stats_${cat.id}`);
      let lvl = fromTimeline;
      if (lvl == null) {
        const hist = Array.isArray(cat?.simuladoStats?.history)
          ? cat.simuladoStats.history
          : Object.values(cat?.simuladoStats?.history || {});
        const hasHistory = hist.some((h) => h && h.valid !== false && h.validated !== false && h.source !== 'manual-error-notebook');
        const hasBayes = safeNum(cat?.bayesianStats?.mean, null) != null;
        const avgVal = safeNum(cat?.simuladoStats?.average, null);
        const stored = hasBayes
          ? safeNum(cat.bayesianStats.mean, null)
          : (hasHistory || (avgVal != null && avgVal > 0) ? avgVal : null);
        if (stored != null && (hasHistory || hasBayes || (avgVal != null && avgVal > 0))) {
          const isLegacyPct = stored >= 0 && stored <= 100 && stored < catMin;
          lvl = isLegacyPct ? catMin + (stored / 100) * catRange : stored;
        }
      }

      if (lvl != null) evaluatedCount++;

      const customMinCutoff = safeNum(cat?.minCutoff, null);
      const catTarget = customMinCutoff != null && customMinCutoff > catMin
        ? Math.min(catMax, customMinCutoff)
        : (catMax === safeMax && catMin === safeMin
          ? safeTarget
          : catMin + globalTargetRatio * catRange);

      return lvl != null && lvl < catTarget - 5 * catScale;
    }).length;

    const hasEvaluatedSubjects = evaluatedCount > 0;
    const totalSubjectsDenom = hasEvaluatedSubjects ? evaluatedCount : categories.length;
    const subjTone = !hasEvaluatedSubjects ? 'neutral' : (below === 0 ? 'success' : below <= 2 ? 'warning' : 'danger');

    statuses.push({
      id: 'subjects',
      label: 'Matérias abaixo da meta',
      value: hasEvaluatedSubjects ? `${below}/${totalSubjectsDenom}` : '—',
      tone: subjTone,
      icon: '📚',
      statusText: !hasEvaluatedSubjects ? 'Sem dados' : (below === 0 ? 'Todas seguras' : below <= 2 ? 'Atenção pontual' : 'Prioridade crítica'),
      scope: 'global',
      scopeLabel: 'Visão geral',
      howToRead: `Indica quantas das ${totalSubjectsDenom} disciplinas avaliadas estão abaixo da zona segura (mais de 5% abaixo da meta ou do corte mínimo da matéria).`,
      scaleGuide: 'Verde: 0 matérias em déficit · Amarelo: 1 ou 2 matérias · Vermelho: 3 ou mais matérias.',
      actionHint:
        !hasEvaluatedSubjects
          ? 'Registre simulados nas disciplinas para avaliar quais estão abaixo da meta.'
          : below === 0
            ? 'Equilíbrio excelente entre todas as disciplinas avaliadas!'
            : 'Clique nos cards vermelhos/amarelos abaixo para focar e abrir o Raio-X de Assuntos.',
      help: 'Matérias com nível atual abaixo da zona segura da meta.'
    });
  }

  // Volume recente (últimos 7 dias corridos)
  const todayKeyForVol = getDateKey(refNow);
  const sevenDayKeys = new Set();
  for (let i = 0; i < 7; i++) {
    const shifted = todayKeyForVol ? addDaysNoon(todayKeyForVol, -i) : null;
    const k = shifted ? getDateKey(shifted) : null;
    if (k) sevenDayKeys.add(k);
  }

  const recentVolume = Array.isArray(timeline)
    ? timeline
      .filter((d) => d?.date && sevenDayKeys.has(d.date))
      .reduce((sum, d) => {
        const q = (showOnlyFocus && hasFocusId)
          ? safeNum(d?.[`raw_total_${focusId}`], 0)
          : safeNum(d?.global_total, 0);
        return sum + q;
      }, 0)
    : 0;

  const roundedVol = Math.round(recentVolume);
  statuses.push({
    id: 'volume',
    label: 'Volume (7 dias)',
    value: `${roundedVol} q`,
    tone: recentVolume > 0 ? 'success' : 'warning',
    icon: '📝',
    statusText: roundedVol >= 100 ? 'Volume forte' : roundedVol > 0 ? 'Em atividade' : 'Sem registro',
    scope: showOnlyFocus && hasFocusId ? 'focus' : 'global',
    scopeLabel: showOnlyFocus && hasFocusId ? focusScopeLabel : 'Visão geral',
    howToRead: 'Soma todas as questões registradas nos últimos 7 dias corridos. Garante que seus gráficos reflitam prática real e recente.',
    scaleGuide: 'Verde: > 0 questões na semana (ideal ≥ 100q globais) · Amarelo: 0 questões registradas nos últimos 7 dias.',
    actionHint:
      roundedVol > 0
        ? 'Bom volume recente — continue registrando seus simulados para manter as projeções vivas.'
        : 'Nenhuma questão lançada nos últimos 7 dias. Faça um simulado curto hoje para reativar a curva.',
    help: 'Questões cadastradas nos últimos 7 dias.'
  });

  // Movimento/tendência interna
  if (hasFocusId) {
    let trendStatus = '';
    for (let i = effectiveTimeline.length - 1; i >= 0; i--) {
      const ts = String(effectiveTimeline[i]?.[`trend_status_${focusId}`] || '').toLowerCase();
      if (ts) {
        trendStatus = ts;
        break;
      }
    }

    if (trendStatus) {
      const movTone = trendStatus === 'up' ? 'success' : trendStatus === 'down' ? 'danger' : 'neutral';
      statuses.push({
        id: 'trend-status',
        label: 'Movimento',
        value:
          trendStatus === 'up'
            ? 'Subindo'
            : trendStatus === 'down'
              ? 'Caindo'
              : 'Estável',
        tone: movTone,
        icon: trendStatus === 'up' ? '📈' : trendStatus === 'down' ? '📉' : '➡️',
        statusText: trendStatus === 'up' ? 'Tração positiva' : trendStatus === 'down' ? 'Sinal de queda' : 'Ritmo constante',
        scope: 'focus',
        scopeLabel: focusScopeLabel,
        howToRead: 'Direção estrutural de longo prazo calculada pela regressão do motor estatístico (diferente da "Tendência", que olha apenas o curto prazo 3×3).',
        scaleGuide: 'Verde: Subindo (ganho estrutural) · Cinza: Estável (sem inclinação forte) · Vermelho: Caindo (perda estrutural).',
        actionHint:
          trendStatus === 'up'
            ? 'Curva estrutural ascendente — sua estratégia nesta matéria está funcionando.'
            : trendStatus === 'down'
              ? 'Queda estrutural — revise os fundamentos e verifique se houve excesso de tempo sem revisão.'
              : 'Ritmo estável — bom para matérias já na meta; se estiver abaixo, altere a abordagem de estudo.',
        help: 'Tendência estrutural calculada pelo motor estatístico para a disciplina focada.'
      });
    }
  }

  // Tempo médio por questão
  const scopedSubjectAgg = Array.isArray(subjectAggData)
    ? (showOnlyFocus && hasFocusId ? subjectAggData.filter((d) => isSameId(d?.id, focusId)) : subjectAggData)
    : [];
  const timedSubjects = scopedSubjectAgg
    .map((d) => {
      const timedQ = safeNum(d?.timedQuestoes, 0);
      const rawTime = safeNum(d?.timeSpent, null);
      const avgFallback = safeNum(d?.avgTimePerQuestion, null);
      const effTime = rawTime != null && rawTime > 0
        ? rawTime
        : (avgFallback != null && avgFallback > 0 && timedQ > 0 ? avgFallback * timedQ : 0);
      return { timedQ, effTime };
    })
    .filter((d) => d.timedQ > 0 && d.effTime > 0);

  if (timedSubjects.length > 0) {
    const totalTime = timedSubjects.reduce((sum, d) => sum + d.effTime, 0);
    const totalTimed = timedSubjects.reduce((sum, d) => sum + d.timedQ, 0);
    const avgSeconds = totalTimed > 0 ? totalTime / totalTimed : null;

    if (avgSeconds != null) {
      const durMin = safeNum(examDurationMinutes, null);
      const totalQ = safeNum(examTotalQuestions, null);
      const hasExamBudget = durMin != null && durMin > 0 && totalQ != null && totalQ > 0;
      const fastLimit = hasExamBudget ? Math.round((durMin * 60) / totalQ) : 90;
      const warnLimit = hasExamBudget ? Math.round(fastLimit * 1.25) : 180;
      const timeTone = avgSeconds <= fastLimit ? 'success' : avgSeconds <= warnLimit ? 'warning' : 'danger';

      statuses.push({
        id: 'time',
        label: 'Tempo por questão',
        value: `${Math.round(avgSeconds)}s`,
        tone: timeTone,
        icon: '⏱️',
        statusText: timeTone === 'success' ? 'Ritmo ágil' : timeTone === 'warning' ? 'Ritmo moderado' : 'Ritmo lento',
        scope: showOnlyFocus && hasFocusId ? 'focus' : 'global',
        scopeLabel: showOnlyFocus && hasFocusId ? focusScopeLabel : 'Visão geral',
        howToRead: hasExamBudget
          ? `Média de segundos gastos por questão cronometrada, comparada ao ritmo alvo da sua prova (${fastLimit}s/q para ${totalQ}q em ${durMin} min).`
          : 'Média de segundos gastos por questão nos simulados cronometrados. Quanto menor (sem perder acerto), mais folga você terá no gabarito.',
        scaleGuide: `Verde: ≤ ${fastLimit}s/q (ágil) · Amarelo: ${fastLimit + 1}s a ${warnLimit}s/q (atenção) · Vermelho: > ${warnLimit}s/q (risco de estourar o relógio).`,
        actionHint:
          timeTone === 'success'
            ? 'Velocidade confortável — confira na aba Speed × Precisão se a precisão acompanha o ritmo.'
            : timeTone === 'warning'
              ? 'Ritmo no limite — use a aba Ritmo de Prova para ver quais matérias consomem mais minutos.'
              : 'Gargalo de velocidade! Treine blocos cronometrados nas matérias mais lentas da aba Agilidade AI.',
        help: 'Média de tempo gasto por questão nas disciplinas com tempo registrado.'
      });
    }
  }

  // Tempo até a prova
  if (!hasGoalDate) {
    statuses.push({
      id: 'exam',
      label: 'Tempo até a prova',
      value: 'Sem data',
      tone: 'neutral',
      icon: '⏳',
      statusText: 'Horizonte padrão (30d)',
      scope: 'global',
      scopeLabel: 'Calendário do concurso',
      howToRead: 'Nenhuma data objetivo foi cadastrada neste concurso. As projeções usam um horizonte padrão de 30 dias.',
      scaleGuide: 'Azul: > 30 dias (construção de base) · Amarelo: 8 a 30 dias (revisão + simulados) · Vermelho: ≤ 7 dias (reta final).',
      actionHint: 'Defina a data da prova nas configurações do concurso para calibrar a contagem regressiva e as projeções.',
      help: 'Cadastre a data da prova para acompanhar os dias restantes.'
    });
  } else {
    const effectiveDaysRaw = daysToExam !== null && daysToExam !== undefined ? safeNum(daysToExam, projectDays) : safeNum(projectDays, 30);
    const days = Math.max(0, Math.round(effectiveDaysRaw));
    const examTone = days <= 7 ? 'critical' : days <= 30 ? 'warning' : 'info';

    statuses.push({
      id: 'exam',
      label: 'Tempo até a prova',
      value: `${days} ${days === 1 ? 'dia' : 'dias'}`,
      tone: examTone,
      icon: '⏳',
      statusText: days === 0 ? 'Dia da prova / encerrado' : days <= 7 ? 'Reta final' : days <= 30 ? 'Mês decisivo' : 'Prazo estratégico',
      scope: 'global',
      scopeLabel: 'Calendário do concurso',
      howToRead: 'Contagem regressiva até a data objetivo configurada no concurso. Este prazo define o horizonte das projeções Monte Carlo e do Cone Futuro.',
      scaleGuide: 'Azul: > 30 dias (construção de base) · Amarelo: 8 a 30 dias (revisão + simulados) · Vermelho: ≤ 7 dias (reta final e descanso estratégico).',
      actionHint:
        days === 0
          ? 'Data da prova atingida — atualize a data objetivo caso haja nova fase ou novo concurso.'
          : days <= 7
            ? 'Reta final: priorize revisão leve de erros críticos, flashcards e sono de qualidade.'
            : days <= 30
              ? 'Foque em simulados completos cronometrados e feche gargalos de corte mínimo.'
              : 'Aproveite o prazo para consolidar a base e manter constância semanal.',
      help: 'Dias restantes até a data objetivo.'
    });
  }

  return statuses;
}
