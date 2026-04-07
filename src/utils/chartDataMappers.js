/**
 * Mapper functions to transform application state into chart-ready data
 */

/**
 * Maps categories and their tasks to retention analysis data
 * @param {Array} categories 
 * @returns {Array} [{ nomeTopico, diasSemRevisao, nivelCritico }]
 */
export const mapRetentionData = (categories = []) => {
    const data = [];
    
    // Process top 10 most critical categories or items
    categories.forEach(cat => {
        // Add categories with study history
        if (cat.lastStudiedAt) {
            const last = new Date(cat.lastStudiedAt).getTime();
            
            // CORREÇÃO: Math.max(0, ...) impede que relógios adiantados
            // gerem um tempo negativo, o que invertia a curva de decaimento Exponencial.
            const days = Math.max(0, (Date.now() - last) / (1000 * 60 * 60 * 24));
            const retention = Math.round(100 * Math.exp(-days / 7));
            
            data.push({
                nomeTopico: cat.name,
                diasSemRevisao: Math.floor(days),
                nivelCritico: retention
            });
        }
        
        // Add specific tasks if they have high impact
        if (cat.tasks) {
            cat.tasks.forEach(task => {
                if (task.lastStudiedAt || task.completedAt) {
                    const last = new Date(task.lastStudiedAt || task.completedAt).getTime();
                    const days = Math.max(0, (Date.now() - last) / (1000 * 60 * 60 * 24));
                    const retention = Math.round(100 * Math.exp(-days / 7));
                    
                    if (days >= 1) { // Only show items that have at least 1 day without revision
                        data.push({
                            nomeTopico: task.text || task.title,
                            diasSemRevisao: Math.floor(days),
                            nivelCritico: retention
                        });
                    }
                }
            });
        }
    });

    // Sort by critical level (ascending) and take top 8
    return data
        .sort((a, b) => a.nivelCritico - b.nivelCritico)
        .slice(0, 8);
};

/**
 * Maps study logs to daily focus evolution data
 * @param {Array} studyLogs 
 * @returns {Array} [{ data, horasEstudadas }]
 */
export const mapFocusEvolutionData = (studyLogs = []) => {
    const dailyMap = {};
    
    // Sort and take last 14 days
    const sortedLogs = [...studyLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedLogs.forEach(log => {
        const dateStr = new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + (Number(log.minutes) || 0);
    });

    return Object.entries(dailyMap).map(([date, minutes]) => ({
        data: date,
        horasEstudadas: parseFloat((minutes / 60).toFixed(1))
    })).slice(-10); // Show last 10 days
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
        hoursMap[name] = (hoursMap[name] || 0) + (Number(log.minutes) || 0);
    });

    return Object.entries(hoursMap).map(([name, minutes]) => ({
        disciplina: name,
        horas: parseFloat((minutes / 60).toFixed(1))
    })).sort((a, b) => b.horas - a.horas);
};
