/**
 * Mapper functions to transform application state into chart-ready data
 */
import { normalizeDate, getDateKey } from './dateHelper.js';
import { toArray } from './normalize.js';

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
} from './retentionCore';

const toSafeDate = (value) => {
    if (!value) return null;
    
    // Suporte a Firebase Timestamp
    if (typeof value === 'object' && (value.seconds != null || value._seconds != null)) {
        const secs = value.seconds != null ? value.seconds : value._seconds;
        return new Date(secs * 1000);
    }
    
    const parsed = normalizeDate(value);
    const date = parsed || new Date(value);
    return Number.isFinite(date?.getTime()) ? date : null;
};

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
    const minutes = Number(log.minutes);
    const duration = Number(log.duration);
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

    const getDisplayKey = (dateObj) => {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: 'America/Manaus',
                day: '2-digit', month: '2-digit'
            }).format(dateObj);
        } catch {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        }
    };

    const last14Days = [];
    // ✅ FIX: Ancorar ao meio-dia de Manaus para o dia corrente para evitar shift de 1 dia em outros fusos
    const todayMidday = normalizeDate(getDateKey(new Date())) || new Date();

    for (let i = 13; i >= 0; i--) {
        // T-024 FIX: usar setDate em vez de subtrair ms,
        // reduzindo problemas de DST/edge cases.
        const d = new Date(todayMidday);
        d.setDate(d.getDate() - i);

        last14Days.push({
            fullKey: getFullKey(d),
            data: getDisplayKey(d),
            horasEstudadas: 0
        });
    }

    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    
    logsArray.forEach(log => {
        if (!log || typeof log !== 'object') return;
        const logDate = normalizeDate(log.date);
        if (!logDate || Number.isNaN(logDate.getTime())) return;
        
        const logFullKey = getFullKey(logDate);
        if (!logFullKey) return;
        
        const dayMatch = last14Days.find(d => d.fullKey === logFullKey);
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
        horasEstudadas: Math.max(0, parseFloat(d.horasEstudadas.toFixed(2)))
    }));
};

/**
 * Maps study logs and categories to subject distribution data
 * @param {Array} studyLogs 
 * @param {Array} categories 
 * @returns {Array} [{ disciplina, horas }]
 */
export const mapSubjectHoursData = (studyLogs = [], categories = []) => {
    const hoursMap = {};
    const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
    const safeCategories = Array.isArray(categories) ? categories : [];
    
    // ✅ FIX: Pré-indexar categorias por ID para lookup O(1)
    const categoriesById = new Map();
    safeCategories.forEach(c => {
        if (c && c.id != null) {
            categoriesById.set(String(c.id), c);
        }
    });

    logsArray.forEach(log => {
        if (!log || typeof log !== 'object') return;
        
        let cat = null;
        if (log.categoryId != null) {
            cat = categoriesById.get(String(log.categoryId));
        }
        if (!cat) {
            cat = safeCategories.find(c =>
                (log.subject && c.name === log.subject) ||
                (log.categoryName && c.name === log.categoryName)
            );
        }
        
        const name = cat ? cat.name : (log.categoryName || log.subject || 'Outros');
        const actualMinutes = getStudyLogMinutes(log);
        
        // ✅ FIX: Validar minutes antes de acumular
        if (Number.isFinite(actualMinutes) && actualMinutes > 0) {
            hoursMap[name] = (hoursMap[name] || 0) + actualMinutes;
        }
    });

    return Object.entries(hoursMap).map(([name, minutes]) => ({
        disciplina: name,
        horas: parseFloat((minutes / 60).toFixed(2))
    })).sort((a, b) => Number(b.horas) - Number(a.horas));
};

