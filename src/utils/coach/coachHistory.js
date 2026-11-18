import { getSortedHistory } from '../../engine/stats.js';
import { computeForgettingRisk } from '../../engine/diagnostics.js';
import { rankDecisionCandidates } from '../../engine/probabilistic/decisionEngine.js';
import { kahanSum } from '../../engine/math/kahan.js';
import { getSafeScore } from '../scoreHelper.js';
import { normalizeDate, getDateKey } from '../dateHelper.js';
import { normalize } from '../normalization.js';
import { normalizePriority } from '../colorHelper.js';
import { getCoachFeature } from '../coachFeatures.js';
import { safeArray } from '../coachSafe.js';
import { sanitizeMinutes, clamp, MS_PER_DAY } from './coachPureHelpers.js';
import { ensureCoachTaskId } from '../coachTaskId.js';

export function analisarDesempenhoHistorico(historico) {
    if (!historico || historico.length === 0) {
        return {
            tendencia: 'neutra',
            confiabilidadeDosDados: 'insuficiente',
            projecaoRetencao: 0
        };
    }
    const formattedHistory = historico.map((h, i) => {
        if (!h) return { score: 0, total: 100, date: new Date().toISOString() };
        let rawDias = h.diasRevisao;
        if (typeof rawDias === 'string') rawDias = rawDias.replace(',', '.');
        const diasValidos = (rawDias === null || rawDias === undefined || rawDias === '')
            ? i
            : (Number.isFinite(Number(rawDias)) ? Number(rawDias) : i);
        const timestamp = Date.now() - (diasValidos * 86400000);
        const safeDate = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
        const total = Math.max(1, Number(h.total) || 100);
        const acertos = Math.min(total, Math.max(0, Number(h.acertos) || 0));
        return {
            score: (acertos / total) * 100,
            total: total,
            date: safeDate.toISOString()
        };
    });
    const risk = computeForgettingRisk(formattedHistory);
    const safeRetention = Number.isFinite(risk.retentionPct) ? risk.retentionPct : 0;
    return {
        tendencia: safeRetention > 80 ? 'alta' : (safeRetention > 50 ? 'estável' : 'baixa'),
        confiabilidadeDosDados: historico.length > 5 ? 'alta' : 'média',
        projecaoRetencao: safeRetention
    };
}

export const getCognitiveState = (studyLogs = [], options = {}) => {
    const safeLogs = safeArray(studyLogs).filter(log => {
        if (!log || typeof log !== 'object') return false;
        const hasDate = log.date || log.createdAt || log.lastUpdated;
        if (!hasDate) return false;
        const parsed = normalizeDate(hasDate);
        if (!parsed || Number.isNaN(parsed.getTime())) return false;
        return sanitizeMinutes(log.minutes ?? log.minutos ?? log.duration) > 0;
    });

    let referenceDate = new Date();
    if (options.now) {
        const parsed = normalizeDate(options.now);
        if (parsed && !Number.isNaN(parsed.getTime())) {
            referenceDate = parsed;
        }
    }
    const nowMs = referenceDate.getTime();
    const todayKey = getDateKey(referenceDate);

    const getLogDate = (l) => l?.date || l?.createdAt || l?.lastUpdated;

    const minutesToday = safeLogs
        .filter(l => getDateKey(getLogDate(l)) === todayKey)
        .reduce((acc, l) => acc + sanitizeMinutes(l.minutes ?? l.minutos ?? l.duration), 0);

    const last7DaysLogs = safeLogs.filter(l => {
        const t = (normalizeDate(getLogDate(l)) || new Date(0)).getTime();
        return t > 0 && (nowMs - t) >= -MS_PER_DAY && (nowMs - t) <= 7 * MS_PER_DAY;
    });
    const hours7d = last7DaysLogs.reduce((acc, l) => acc + sanitizeMinutes(l.minutes ?? l.minutos ?? l.duration), 0) / 60;

    const dailyLoad = Math.min(1, (minutesToday / 60) / 6);
    const weeklyLoad = Math.min(1, hours7d / 40);
    const fatigue = clamp(Math.round((dailyLoad * 0.6 + weeklyLoad * 0.4) * 100), 0, 100);

    const streakDays = new Set(last7DaysLogs.map(l => getDateKey(getLogDate(l))).filter(Boolean)).size;
    const focus = clamp(Math.round((streakDays / 7) * 100), 0, 100);

    let recommendation = 'Ritmo saudável — mantenha o plano.';
    if (fatigue > 75) recommendation = 'Carga cognitiva alta — prefira revisões leves hoje.';
    else if (fatigue > 50) recommendation = 'Carga moderada — alterne blocos curtos com pausas.';
    else if (focus < 30) recommendation = 'Consistência baixa — comece com um bloco curto para retomar o ritmo.';

    return {
        fatigue,
        focus,
        streakDays,
        minutesToday: Math.round(minutesToday),
        hours7d: Number(hours7d.toFixed(2)),
        recommendation
    };
};

export const getBestTask = (categories = [], excludeTaskId = null, options = {}) => {
    const safeCategories = safeArray(categories);
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    const candidates = [];
    safeCategories.forEach(cat => {
        const tasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
        tasks.forEach(task => {
            if (!task || task.completed === true) return;
            if (String(task.status || '').toLowerCase() === 'completed') return;
            const resolved = ensureCoachTaskId(task);
            const id = resolved?.id || task.id || task.text || '';
            if (excludeTaskId && String(id) === String(excludeTaskId)) return;
            const catId = cat?.id || task.categoryId || task.catId || '';
            candidates.push({
                ...task,
                id,
                catId,
                categoryId: catId,
                catName: cat?.name || task.catName || '',
                catColor: cat?.color || task.catColor || '',
                catIcon: cat?.icon || task.catIcon || '',
                _catWeight: Number(cat?.weight) || 5,
                _originalIndex: candidates.length
            });
        });
    });

    if (candidates.length === 0) return null;

    if (getCoachFeature(options, 'useDecisionUtilityForBestTask', false)) {
        try {
            const cognitiveFatigue = options?.studyLogs
                ? (getCognitiveState(options.studyLogs, { now: options.now })?.fatigue ?? 0)
                : 0;
            const decisionInputs = candidates.map((c) => ({
                id: c.id || `task-${c._originalIndex}`,
                name: c.text || c.title || c.id || `task-${c._originalIndex}`,
                type: 'task',
                priority: c.priority || 'medium',
                priorityValue: (priorityWeight[normalizePriority(c.priority)] ?? 2) / 3,
                weakness: c.analysis ? 0.68 : 0.48,
                uncertainty: 0.42,
                evidence: c.analysis ? 0.7 : 0.4,
                costMinutes: Number(c.estimatedMinutes || c.minutes || 35),
                fatigue: cognitiveFatigue,
                weight: c._catWeight,
                _candidate: c
            }));
            const ranked = rankDecisionCandidates(decisionInputs, {
                useBandit: getCoachFeature(options, 'useBanditPlanner', false),
                contestId: options?.contestId || options?.config?.contestId,
                seed: `best-task-${candidates.length}`
            });
            if (ranked.length > 0 && ranked[0]._candidate) {
                const chosen = { ...ranked[0]._candidate };
                delete chosen._catWeight;
                delete chosen._originalIndex;
                return chosen;
            }
        } catch {
            // fallback para ordenação determinística abaixo
        }
    }

    candidates.sort((a, b) => {
        const pa = priorityWeight[normalizePriority(a.priority)] ?? 2;
        const pb = priorityWeight[normalizePriority(b.priority)] ?? 2;
        if (pb !== pa) return pb - pa;
        const aa = a.analysis ? 1 : 0;
        const ab = b.analysis ? 1 : 0;
        if (ab !== aa) return ab - aa;
        return (a._originalIndex ?? 0) - (b._originalIndex ?? 0);
    });

    const best = { ...candidates[0] };
    delete best._catWeight;
    delete best._originalIndex;
    return best;
};

export function getCombinedHistory(history, simulados, maxScore = 100, minScore = 0) {
    const deduplicatedMap = new Map();
    const allSimulados = safeArray(simulados).filter(s => s && s.valid !== false);

    allSimulados.forEach((s) => {
        const safeScore = getSafeScore(s, maxScore, minScore);
        const safeScoreStr = Number.isFinite(safeScore) ? String(Math.round(safeScore * 100)) : '0';
        const norm = (v) => (v === undefined || v === null || v === '' ? '_' : String(v));
        const sSub = s.subject || s.categoryName || s.materia || s.disciplina || s.categoryId || 'geral';
        const sTotal = s.total ?? s.questoes ?? s.totalQuestoes ?? s.questions;
        const sCorrect = s.correct ?? s.acertos ?? s.correctCount;
        const sig = `${sSub}|${s.date || s.createdAt}|${safeScoreStr}|${norm(sTotal)}|${norm(sCorrect)}`;
        const key = s.id ? `sim:${s.id}:${safeScoreStr}` : `sig:${sig}`;
        deduplicatedMap.set(key, { ...s, type: 'simulado' });
    });

    const hasSimuladoForDate = new Set();
    const hasGenericSimuladoForDate = new Set();
    const hasSimuladoForDateSubject = new Set();

    allSimulados.forEach((s) => {
        const dKey = getDateKey(s.date || s.createdAt);
        if (!dKey) return;
        hasSimuladoForDate.add(dKey);
        const rawSub = s.subject || s.categoryName || s.materia || s.disciplina;
        const normSub = rawSub ? normalize(String(rawSub)) : '';
        const catId = s.categoryId !== undefined && s.categoryId !== null && s.categoryId !== '' ? String(s.categoryId) : '';
        if (!normSub && !catId) {
            hasGenericSimuladoForDate.add(dKey);
        } else {
            if (normSub) hasSimuladoForDateSubject.add(`${dKey}|subj:${normSub}`);
            if (catId) hasSimuladoForDateSubject.add(`${dKey}|cat:${catId}`);
        }
    });

    const rowsByGroup = {};
    safeArray(history).forEach(r => {
        if (!r || r.valid === false) return;
        const dKey = getDateKey(r.date || r.createdAt);
        if (!dKey) return;
        const rSubj = r.subject || r.categoryName || r.materia || r.disciplina;
        const rSubjNorm = rSubj ? normalize(String(rSubj)) : '';
        const rCatId = r.categoryId !== undefined && r.categoryId !== null && r.categoryId !== '' ? String(r.categoryId) : '';

        const isCoveredBySimulado = (!rSubjNorm && !rCatId)
            ? hasSimuladoForDate.has(dKey)
            : (hasGenericSimuladoForDate.has(dKey) ||
                (rSubjNorm && hasSimuladoForDateSubject.has(`${dKey}|subj:${rSubjNorm}`)) ||
                (rCatId && hasSimuladoForDateSubject.has(`${dKey}|cat:${rCatId}`)));

        if (!isCoveredBySimulado) {
            const groupKey = rSubjNorm
                ? `${dKey}|subj:${rSubjNorm}`
                : (rCatId ? `${dKey}|cat:${rCatId}` : dKey);
            if (!rowsByGroup[groupKey]) {
                rowsByGroup[groupKey] = {
                    dKey,
                    correct: 0,
                    total: 0,
                    directScores: [],
                    subjects: new Set(),
                    categoryIds: new Set(),
                    topics: []
                };
            }
            const bucket = rowsByGroup[groupKey];
            const _toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
            const rCorrect = _toNum(r.correct ?? r.acertos ?? r.correctCount);
            const rTotal = _toNum(r.total ?? r.questoes ?? r.totalQuestoes ?? r.questions);
            if (rSubj) bucket.subjects.add(String(rSubj).trim());
            if (r.categoryId !== undefined && r.categoryId !== null && r.categoryId !== '') {
                bucket.categoryIds.add(r.categoryId);
            }
            const rTopic = r.topic || r.assunto || r.subtopic || r.topicName;
            if (rTopic) {
                bucket.topics.push({
                    name: String(rTopic).trim(),
                    total: rTotal > 0 ? rTotal : undefined,
                    correct: rTotal > 0 ? Math.min(rTotal, Math.max(0, rCorrect)) : undefined,
                    score: r.score,
                    isPercentage: r.isPercentage
                });
            } else if (Array.isArray(r.topics) && r.topics.length > 0) {
                bucket.topics.push(...r.topics);
            }
            if (rTotal > 0) {
                bucket.correct += Math.min(rTotal, Math.max(0, rCorrect));
                bucket.total += rTotal;
            } else {
                const s = getSafeScore(r, maxScore, minScore);
                if (Number.isFinite(s)) {
                    bucket.directScores.push(s);
                }
            }
        }
    });

    Object.entries(rowsByGroup).forEach(([groupKey, stats]) => {
        const dKey = stats.dKey;
        let score = null;
        if (stats.total > 0) {
            score = minScore + (stats.correct / stats.total) * (maxScore - minScore);
        } else if (stats.directScores && stats.directScores.length > 0) {
            score = kahanSum(stats.directScores) / stats.directScores.length;
        }
        if (score !== null && Number.isFinite(score)) {
            const safeScoreStr = String(Math.round(score * 100));
            const key = `legacy-${groupKey}|${dKey}|${safeScoreStr}`;
            if (!deduplicatedMap.has(key)) {
                const singleSubject = stats.subjects.size >= 1 ? Array.from(stats.subjects)[0] : undefined;
                const singleCategoryId = stats.categoryIds.size >= 1 ? Array.from(stats.categoryIds)[0] : undefined;
                deduplicatedMap.set(key, {
                    id: groupKey === dKey ? `legacy-${dKey}` : `legacy-${groupKey}`,
                    date: dKey,
                    score,
                    ...(stats.total > 0 ? { total: stats.total, correct: stats.correct } : {}),
                    ...(singleSubject ? { subject: singleSubject, categoryName: singleSubject } : {}),
                    ...(singleCategoryId !== undefined ? { categoryId: singleCategoryId } : {}),
                    ...(stats.topics.length > 0 ? { topics: stats.topics } : {}),
                    type: 'simulado'
                });
            }
        }
    });

    return getSortedHistory(Array.from(deduplicatedMap.values()));
}
