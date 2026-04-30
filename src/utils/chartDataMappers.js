/**
 * Mapper functions to transform application state into chart-ready data
 */
import { normalizeDate } from './dateHelper.js';

/**
 * Maps categories and their tasks to retention analysis data
 * @param {Array} categories 
 * @returns {Array} [{ nomeTopico, diasSemRevisao, nivelCritico }]
 */
export const mapRetentionData = (categories = []) => {
    const data = [];
    const now = Date.now();
    
    // Process top 10 most critical categories or items
    categories.forEach(cat => {
        // Add categories with study history
        if (cat.lastStudiedAt) {
            // FIX BUG N: normalizeDate evita que YYYY-MM-DD seja interpretado como UTC midnight
            const parsed = normalizeDate(cat.lastStudiedAt);
            const last = parsed ? parsed.getTime() : new Date(cat.lastStudiedAt).getTime();
            
            // CORREÇÃO: Math.max(0, ...) impede que relógios adiantados
            // gerem um tempo negativo, o que invertia a curva de decaimento Exponencial.
            const days = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));

            // CÁLCULO DE MEIA-VIDA DINÂMICA (Anti-Punição de Maestria)
            // Assuntos consolidados (muitas questões ou alta precisão) esquecem mais devagar.
            let halfLife = 7; // Base 7 dias
            const totalQ = cat.simuladoStats?.totalQuestions || 0;
            const accuracy = cat.bayesianStats?.mean ? (cat.bayesianStats.mean / 100) : 0;

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
                    const parsedTask = normalizeDate(task.lastStudiedAt || task.completedAt);
                    const last = parsedTask ? parsedTask.getTime() : new Date(task.lastStudiedAt || task.completedAt).getTime();
                    const days = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
                    
                    // Tasks individuais usam half-life padrão 7 a menos que a categoria seja mestre
                    let halfLife = 7;
                    const totalQ = cat.simuladoStats?.totalQuestions || 0;
                    if (totalQ > 100) halfLife = 14;

                    const retention = Math.round(100 * Math.exp(-days / halfLife));
                    
                    if (days >= 1) { // Only show items that have at least 1 day without revision
                        data.push({
                            nomeTopico: task.text || task.title,
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
        const parsed = normalizeDate(log.date);
        const logDate = parsed || new Date(log.date);
        const logFullKey = getFullKey(logDate);
        
        const dayMatch = last14Days.find(d => d.fullKey === logFullKey);
        if (dayMatch) {
            // BUGFIX: Suporte a minutes ou duration (Sincronia com motor de eficiência)
            dayMatch.horasEstudadas += (Number(log.minutes) || Number(log.duration) || 0) / 60;
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
    
    studyLogs.forEach(log => {
        const cat = categories.find(c => c.id === log.categoryId);
        const name = cat ? cat.name : 'Outros';
        const actualMinutes = Number(log.minutes) || Number(log.duration) || 0;
        hoursMap[name] = (hoursMap[name] || 0) + actualMinutes;
    });

    return Object.entries(hoursMap).map(([name, minutes]) => ({
        disciplina: name,
        horas: parseFloat((minutes / 60).toFixed(2))
    })).sort((a, b) => b.horas - a.horas);
};
