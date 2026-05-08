/**
 * Mapper functions to transform application state into chart-ready data
 */
import { normalizeDate } from './dateHelper.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toFiniteNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toSafeDate = (value) => {
    if (!value) return null;
    const parsed = normalizeDate(value);
    const date = parsed || new Date(value);
    return Number.isFinite(date?.getTime()) ? date : null;
};

/**
 * Maps categories and their tasks to retention analysis data
 * @param {Array} categories 
 * @returns {Array} [{ nomeTopico, diasSemRevisao, nivelCritico }]
 */
export const mapRetentionData = (categories = []) => {
    const data = [];
    const now = Date.now();
    const safeCategories = Array.isArray(categories) ? categories : [];
    
    // Process top 10 most critical categories or items
    safeCategories.forEach(cat => {
        // Add categories with study history
        if (cat.lastStudiedAt) {
            // FIX BUG N: normalizeDate evita que YYYY-MM-DD seja interpretado como UTC midnight
            const lastDate = toSafeDate(cat.lastStudiedAt);
            if (!lastDate) return;

            // CORREÇÃO: Math.max(0, ...) impede que relógios adiantados
            // gerem um tempo negativo, o que invertia a curva de decaimento Exponencial.
            const days = Math.max(0, (now - lastDate.getTime()) / MS_PER_DAY);
            if (!Number.isFinite(days)) return;

            // CÁLCULO DE MEIA-VIDA DINÂMICA (Anti-Punição de Maestria)
            // Assuntos consolidados (muitas questões ou alta precisão) esquecem mais devagar.
            let halfLife = 7; // Base 7 dias
            const totalQ = toFiniteNumber(cat.simuladoStats?.totalQuestions, 0);
            const maxScore = Math.max(1, toFiniteNumber(cat.maxScore, 100));
            const accuracy = cat.bayesianStats?.mean ? (toFiniteNumber(cat.bayesianStats.mean, 0) / maxScore) : 0;

            if (totalQ > 100 || accuracy > 0.85) halfLife = 30;
            else if (totalQ > 50 || accuracy > 0.70) halfLife = 14;

            const retention = Math.round(100 * Math.exp(-days / halfLife));
            
            data.push({
                nomeTopico: cat.name,
                diasSemRevisao: Math.floor(days),
                nivelCritico: 100 - retention // INVERSÃO: Agora 100% é o mais crítico (esquecido)
            });
        }
        
        // Add specific tasks if they have high impact
        if (cat.tasks) {
            cat.tasks.forEach(task => {
                if (task.lastStudiedAt || task.completedAt) {
                    const lastTaskDate = toSafeDate(task.lastStudiedAt || task.completedAt);
                    if (!lastTaskDate) return;
                    const days = Math.max(0, (now - lastTaskDate.getTime()) / MS_PER_DAY);
                    if (!Number.isFinite(days)) return;
                    
                    // Tasks individuais usam half-life padrão 7 a menos que a categoria seja mestre
                    let halfLife = 7;
                    const totalQ = toFiniteNumber(cat.simuladoStats?.totalQuestions, 0);
                    if (totalQ > 100) halfLife = 14;

                    const retention = Math.round(100 * Math.exp(-days / halfLife));
                    
                    if (days >= 1) { // Only show items that have at least 1 day without revision
                        data.push({
                            nomeTopico: task.text || task.title || 'Tarefa sem nome',
                            diasSemRevisao: Math.floor(days),
                            nivelCritico: 100 - retention // INVERSÃO
                        });
                    }
                }
            });
        }
    });

    // Sort by critical level (descending = most critical first) and take top 8
    return data
        .sort((a, b) => b.nivelCritico - a.nivelCritico)
        .slice(0, 8);
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
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getDisplayKey = (dateObj) => {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    };

    const last14Days = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0); 
    
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        last14Days.push({
            fullKey: getFullKey(d),
            data: getDisplayKey(d),
            horasEstudadas: 0
        });
    }

    const logsArray = Object.values(studyLogs || {});
    
    logsArray.forEach(log => {
        const logDate = toSafeDate(log.date);
        if (!logDate) return;
        const logFullKey = getFullKey(logDate);
        
        const dayMatch = last14Days.find(d => d.fullKey === logFullKey);
        if (dayMatch) {
            // BUGFIX: Suporte a minutes ou duration (Sincronia com motor de eficiência)
            const minutes = toFiniteNumber(log.minutes, toFiniteNumber(log.duration, 0));
            dayMatch.horasEstudadas += Math.max(0, minutes) / 60;
        }
    });

    // Retorna arredondando no final para preservar precisão em somas fracionadas
    return last14Days.map(d => ({ 
        data: d.data, 
        horasEstudadas: parseFloat(d.horasEstudadas.toFixed(2)) 
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
    
    logsArray.forEach(log => {
        const cat = categories.find(c => c.id === log.categoryId);
        const name = cat ? cat.name : 'Outros';
        const actualMinutes = Math.max(0, toFiniteNumber(log.minutes, toFiniteNumber(log.duration, 0)));
        hoursMap[name] = (hoursMap[name] || 0) + actualMinutes;
    });

    return Object.entries(hoursMap).map(([name, minutes]) => ({
        disciplina: name,
        horas: parseFloat((minutes / 60).toFixed(2))
    })).sort((a, b) => b.horas - a.horas);
};
