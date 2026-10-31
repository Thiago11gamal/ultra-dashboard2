/**
 * Mapper functions to transform application state into chart-ready data
 */
import { normalizeDate, getDateKey } from './dateHelper.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toFiniteNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const sanitizeMinutes = (value) => Math.min(720, Math.max(0, toFiniteNumber(value, 0)));

import {
    normalizeArray,
    getMasterySignal,
    halfLifeFromMastery,
    retentionFromHalfLife,
    getLatestStudyMs,
    clamp,
    MS_PER_DAY as CORE_MS_PER_DAY
} from './retentionCore.js';

/**
 * Maps categories and their tasks to retention analysis data
 * @param {Array} categories 
 * @returns {Array} [{ nomeTopico, diasSemRevisao, nivelCritico }]
 */
export const mapRetentionData = (categories = [], options = {}) => {
    const data = [];
    const now = options.now ?? Date.now();
    const limit = options.limit ?? 8;
    const safeCategories = normalizeArray(categories);

    safeCategories.forEach(cat => {
        if (!cat || !(cat.id || cat.name)) return;

        const latestStudyMs = getLatestStudyMs(cat, cat.tasks);
        if (latestStudyMs == null) return;

        const days = Math.max(0, (now - latestStudyMs) / CORE_MS_PER_DAY);
        if (!Number.isFinite(days)) return;

        const mastery = getMasterySignal(cat);
        const halfLife = halfLifeFromMastery(mastery.masterySignal);
        const retention = retentionFromHalfLife(days, halfLife);

        data.push({
            id: cat.id ?? cat.name,
            nomeTopico: String(cat.name || 'Sem nome'),
            diasSemRevisao: Math.floor(days),
            nivelCritico: clamp(100 - retention, 0, 100),
            retencao: retention,
            totalQuestoes: mastery.totalQ,
            acuraciaPct: Math.round(mastery.accuracy * 100),
            isTask: false
        });
    });

    return data
        .sort((a, b) => {
            return (
                b.nivelCritico - a.nivelCritico ||
                b.diasSemRevisao - a.diasSemRevisao
            );
        })
        .slice(0, limit);
};

const getStudyLogMinutes = (log) => {
    if (!log || typeof log !== 'object') return 0;
    // FIX E-02: revisões de flashcard não devem contar como horas de estudo
    // (alinhado com getStudyMinutes em analytics.js).
    if (log.type === 'flashcard') return 0;
    // FIX: Number() em undefined/null → NaN. Usar validação explícita.
    const rawMinutes = log.minutes;
    const rawDuration = log.duration;
    const minutes = (rawMinutes === null || rawMinutes === undefined || rawMinutes === '')
        ? NaN : Number(rawMinutes);
    const duration = (rawDuration === null || rawDuration === undefined || rawDuration === '')
        ? NaN : Number(rawDuration);
    if (Number.isFinite(minutes) && minutes > 0) return sanitizeMinutes(minutes);
    if (Number.isFinite(duration) && duration > 0) return sanitizeMinutes(duration);
    return 0;
};

/**
 * Maps study logs to daily focus evolution data
 * @param {Array} studyLogs 
 * @returns {Array} [{ data, horasEstudadas }]
 */
export const mapFocusEvolutionData = (studyLogs = []) => {
    // 🎯 STABILITY FIX: Deterministic date keys instead of toLocaleDateString.
    // toLocaleDateString depende da localidade do browser e pode falhar o matching.
    // 🎯 STABILITY FIX: Inclui o Ano na chave para evitar colisão entre anos diferentes (Bug do Fantasma do Ano Passado)
    const getFullKey = (dateObj) => {
        const key = getDateKey(dateObj);
        if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            // Fallback: usar componentes UTC para evitar shift de timezone
            const y = dateObj.getUTCFullYear();
            const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return key;
    };

    const getDisplayKey = (dateObj, fullKey) => {
        try {
            if (fullKey && /^\d{4}-\d{2}-\d{2}$/.test(fullKey)) {
                const [, m, d] = fullKey.split('-');
                return `${d}/${m}`;
            }
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        } catch {
            return '00/00';
        }
    };

    const last14Days = [];
    // ✅ FIX: Ancorar ao meio-dia de Manaus para o dia corrente para evitar shift de 1 dia em outros fusos
    const todayMidday = normalizeDate(getDateKey(new Date())) || new Date();

    const daysMap = new Map();
    for (let i = 13; i >= 0; i--) {
        // T-024 FIX: usar setDate em vez de subtrair ms,
        // reduzindo problemas de DST/edge cases.
        const d = new Date(todayMidday);
        d.setDate(d.getDate() - i);

        const fullKey = getFullKey(d);
        const dayEntry = {
            fullKey,
            data: getDisplayKey(d, fullKey),
            horasEstudadas: 0
        };
        last14Days.push(dayEntry);
        if (dayEntry.fullKey) {
            daysMap.set(dayEntry.fullKey, dayEntry);
        }
    }

    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});

    logsArray.forEach(log => {
        if (!log || typeof log !== 'object') return;
        const logDate = normalizeDate(log.date || log.createdAt);
        if (!logDate || Number.isNaN(logDate.getTime())) return;

        const logFullKey = getFullKey(logDate);
        if (!logFullKey) return;

        const dayMatch = daysMap.get(logFullKey);
        if (dayMatch) {
            const minutes = getStudyLogMinutes(log);
            // ✅ FIX: Validar minutes antes de dividir
            if (Number.isFinite(minutes) && minutes > 0) {
                dayMatch.horasEstudadas += minutes / 60;
            }
        }
    });

    // Retorna arredondando no final para preservar precisão em somas fracionadas
    return last14Days.map(d => ({
        data: d.data,
        horasEstudadas: Number.isFinite(d.horasEstudadas) ? Math.max(0, parseFloat(d.horasEstudadas.toFixed(2))) : 0
    }));
};

/**
 * Maps study logs and categories to subject distribution data
 * @param {Array} studyLogs 
 * @param {Array} categories 
 * @returns {Array} [{ disciplina, horas }]
 */
export const mapSubjectHoursData = (studyLogs = [], categories = []) => {
    const hoursMap = new Map();
    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    const safeCategories = Array.isArray(categories) ? categories : [];

    const normalizeKey = (str) => String(str ?? '').trim().toLowerCase().normalize('NFC');

    // Pré-indexar categorias por ID e por Nome normalizado
    const categoriesById = new Map();
    const categoriesByName = new Map();
    safeCategories.forEach(c => {
        if (c) {
            if (c.id != null) categoriesById.set(String(c.id), c);
            if (c.name != null) {
                const norm = normalizeKey(c.name);
                if (!categoriesByName.has(norm)) {
                    categoriesByName.set(norm, c);
                }
            }
        }
    });

    logsArray.forEach(log => {
        if (!log || typeof log !== 'object') return;

        let cat = null;
        if (log.categoryId != null) {
            cat = categoriesById.get(String(log.categoryId));
        }
        if (!cat) {
            const catNameSearch = log.subject || log.categoryName || log.category || log.catName;
            if (catNameSearch) {
                cat = categoriesByName.get(normalizeKey(catNameSearch));
            }
        }
        if (!cat && log.taskId && typeof log.taskId === 'string' && log.taskId.startsWith('cat-')) {
            cat = safeCategories.find(c => c && c.id && log.taskId.startsWith(String(c.id)));
        }

        let displayName = 'Outros';
        if (cat && cat.name) {
            displayName = String(cat.name).trim();
        } else {
            const catNameSearch = log.categoryName || log.category || log.catName || log.subject;
            if (catNameSearch && String(catNameSearch).trim() !== 'undefined' && String(catNameSearch).trim() !== 'null') {
                displayName = String(catNameSearch).trim();
            }
        }

        const normKey = normalizeKey(displayName);
        const actualMinutes = getStudyLogMinutes(log);

        if (Number.isFinite(actualMinutes) && actualMinutes > 0) {
            if (!hoursMap.has(normKey)) {
                hoursMap.set(normKey, { disciplina: displayName, minutes: 0 });
            }
            hoursMap.get(normKey).minutes += actualMinutes;
        }
    });

    return Array.from(hoursMap.values())
        .filter(item => Number.isFinite(item.minutes) && item.minutes >= 0)
        .map(item => ({
            disciplina: item.disciplina,
            horas: parseFloat((item.minutes / 60).toFixed(2))
        }))
        .filter(item => Number.isFinite(item.horas))
        .sort((a, b) => Number(b.horas) - Number(a.horas));
};

