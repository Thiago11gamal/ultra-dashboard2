import { getSafeScore } from './scoreHelper';
import { calculateSlope, getSortedHistory } from '../engine';

export function hasValidFiniteNumber(val) {
    return (
        val !== undefined &&
        val !== null &&
        typeof val !== 'boolean' &&
        String(val).trim() !== '' &&
        Number.isFinite(Number(val))
    );
}

export function toSafeArray(collection) {
    if (Array.isArray(collection)) return collection.filter(Boolean);
    if (collection && typeof collection === 'object') return Object.values(collection).filter(Boolean);
    return [];
}

export function resolveCategoryDomain(category, fallbackMaxScore = 100, fallbackMinScore = 0) {
    const fbMax = hasValidFiniteNumber(fallbackMaxScore) && Number(fallbackMaxScore) > 0
        ? Number(fallbackMaxScore)
        : 100;
    const fbMin = hasValidFiniteNumber(fallbackMinScore)
        ? Number(fallbackMinScore)
        : 0;

    const rawMax = hasValidFiniteNumber(category?.maxScore) && Number(category.maxScore) > 0
        ? Number(category.maxScore)
        : fbMax;
    const rawMin = hasValidFiniteNumber(category?.minScore)
        ? Number(category.minScore)
        : fbMin;

    const safeMin = Math.min(rawMin, rawMax);
    const safeMax = Math.max(rawMin, rawMax);
    const range = Math.max(1e-9, safeMax - safeMin);

    return { maxScore: safeMax, minScore: safeMin, range };
}

export function resolveContestScoreDomain(contest, categories = []) {
    const safeCats = toSafeArray(categories);

    const contestMaxRaw = contest?.maxScore ?? contest?.user?.maxScore;
    const contestMinRaw = contest?.minScore ?? contest?.user?.minScore;

    let maxScore = 100;
    if (hasValidFiniteNumber(contestMaxRaw) && Number(contestMaxRaw) > 0) {
        maxScore = Number(contestMaxRaw);
    } else {
        const catMaxScores = safeCats
            .map(c => (hasValidFiniteNumber(c?.maxScore) && Number(c.maxScore) > 0 ? Number(c.maxScore) : NaN))
            .filter(Number.isFinite);
        if (catMaxScores.length > 0) {
            maxScore = catMaxScores.reduce((a, b) => Math.max(a, b), -Infinity);
        }
    }

    let minScore = 0;
    if (hasValidFiniteNumber(contestMinRaw)) {
        minScore = Number(contestMinRaw);
    } else {
        const catMinScores = safeCats
            .map(c => (hasValidFiniteNumber(c?.minScore) ? Number(c.minScore) : NaN))
            .filter(Number.isFinite);
        if (catMinScores.length > 0) {
            minScore = catMinScores.reduce((a, b) => Math.min(a, b), Infinity);
        }
    }

    if (maxScore < minScore) {
        const tmp = maxScore;
        maxScore = minScore;
        minScore = tmp;
    }

    return { maxScore, minScore };
}

export function extractQuestionCounts(entry, maxScore = 100, minScore = 0) {
    if (!entry || typeof entry !== 'object' || entry.valid === false || entry.validated === false) {
        return { total: 0, correct: 0, wrong: 0, valid: false };
    }

    const { maxScore: ms, minScore: minS, range } = resolveCategoryDomain(
        { maxScore, minScore },
        maxScore,
        minScore
    );

    const rawTotal = entry.total ?? entry.questoes ?? entry.totalQuestoes ?? entry.questions;
    const rawCorrect = entry.correct ?? entry.acertos ?? entry.correctCount;
    const rawWrong = entry.wrong ?? entry.erros ?? entry.wrongCount;

    const parsedTotal = hasValidFiniteNumber(rawTotal) ? Math.max(0, Math.round(Number(rawTotal))) : 0;
    const hasExplicitCorrect = !entry.isPercentage && hasValidFiniteNumber(rawCorrect);
    const hasExplicitWrong = !entry.isPercentage && hasValidFiniteNumber(rawWrong);

    const explicitCorrect = hasExplicitCorrect ? Math.max(0, Math.round(Number(rawCorrect))) : NaN;
    const explicitWrong = hasExplicitWrong ? Math.max(0, Math.round(Number(rawWrong))) : NaN;

    const altTotal =
        (Number.isFinite(explicitCorrect) ? explicitCorrect : 0) +
        (Number.isFinite(explicitWrong) ? explicitWrong : 0);

    let total = parsedTotal > 0 ? parsedTotal : altTotal;

    if (total <= 0 && entry.topics != null) {
        const topicsList = toSafeArray(entry.topics);
        if (topicsList.length > 0) {
            let topicsTotal = 0;
            let topicsCorrect = 0;
            for (let i = 0; i < topicsList.length; i++) {
                const sub = extractQuestionCounts(topicsList[i], ms, minS);
                if (sub.valid && sub.total > 0) {
                    topicsTotal += sub.total;
                    topicsCorrect += sub.correct;
                }
            }
            if (topicsTotal > 0) {
                const safeC = Math.max(0, Math.min(topicsTotal, Math.round(topicsCorrect)));
                return {
                    total: topicsTotal,
                    correct: safeC,
                    wrong: Math.max(0, topicsTotal - safeC),
                    valid: true
                };
            }
        }
    }

    if (total <= 0) {
        return { total: 0, correct: 0, wrong: 0, valid: false };
    }

    let c = explicitCorrect;
    if (!Number.isFinite(c)) {
        const score = getSafeScore(entry, ms, minS);
        if (Number.isFinite(score) && range > 0 && total > 0) {
            c = Math.round(((score - minS) / range) * total);
        } else if (Number.isFinite(explicitWrong)) {
            c = Math.max(0, total - explicitWrong);
        } else {
            c = 0;
        }
    }

    const safeCorrect = Math.max(0, Math.min(total, Number.isFinite(c) ? Math.round(c) : 0));
    const safeWrong = Math.max(0, total - safeCorrect);

    return {
        total,
        correct: safeCorrect,
        wrong: safeWrong,
        valid: true
    };
}

export function computeCategoryPerformanceStats(category, fallbackMaxScore = 100, fallbackMinScore = 0) {
    const cat = category && typeof category === 'object' ? category : {};
    const { maxScore: ms, minScore: minS, range } = resolveCategoryDomain(cat, fallbackMaxScore, fallbackMinScore);

    const history = toSafeArray(cat.simuladoStats?.history).filter(
        h => h && typeof h === 'object' && h.valid !== false && h.validated !== false
    );

    let totalQuestions = 0;
    let totalCorrect = 0;

    for (let i = 0; i < history.length; i++) {
        const counts = extractQuestionCounts(history[i], ms, minS);
        if (counts.valid && counts.total > 0) {
            totalQuestions += counts.total;
            totalCorrect += counts.correct;
        }
    }

    const safeCorrect = Math.max(0, Math.min(totalQuestions, Math.round(totalCorrect)));
    const safeWrong = Math.max(0, totalQuestions - safeCorrect);
    const balance = safeCorrect - safeWrong;
    const percentCorrect = totalQuestions > 0 ? Math.round((safeCorrect / totalQuestions) * 100) : 0;

    const trendHistory = getSortedHistory(history)
        .slice(-10)
        .map(h => ({
            score: getSafeScore(h, ms, minS),
            date: h?.date || h?.createdAt
        }))
        .filter(item => Number.isFinite(item.score));

    const trendValue = trendHistory.length >= 3
        ? calculateSlope(trendHistory, ms, { minScore: minS })
        : 0;
    const trendTolerance = 0.0167 * (range / 100);
    const currentTrend = trendValue > trendTolerance
        ? 'up'
        : trendValue < -trendTolerance
            ? 'down'
            : 'stable';

    const tasks = toSafeArray(cat.tasks);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => Boolean(t?.completed)).length;
    const syllabusPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
        ...cat,
        tasks,
        total: totalQuestions,
        totalVolume: totalQuestions,
        correct: safeCorrect,
        wrong: safeWrong,
        balance,
        percentCorrect,
        currentTrend,
        trendValue,
        totalTasks,
        completedTasks,
        syllabusPct
    };
}
