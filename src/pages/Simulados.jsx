import React from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { useGamification } from '../hooks/useGamification';

export default function Simulados() {
    const data = useAppStore(state => state.data);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const { applyGamification } = useGamification(showToast);

    const handleUpdateSimuladoRows = (updatedTodayRows) => {
        const today = new Date().toDateString();
        setData(prev => {
            const existingRows = prev.simuladoRows || [];
            // Remove as linhas de hoje para evitar repetições antes de reinseri-las atualizadas
            const nonTodayRows = existingRows.filter(row => !row.createdAt || new Date(row.createdAt).toDateString() !== today);
            // BUG FIX: preserve the 'validated' field — do NOT destructure it out.
            // Previously { validated, ...rest } was stripping 'validated' on every keystroke,
            // causing StudyHistory to ignore all rows (it filters by r.validated).
            const processedTodayRows = updatedTodayRows.map(row => ({
                ...row,
                createdAt: row.createdAt || Date.now()
            }));
            return { ...prev, simuladoRows: [...nonTodayRows, ...processedTodayRows] };
        });
    };

    const handleSimuladoAnalysis = (payload) => {
        setData(prev => {
            const analysisResult = payload.analysis || payload;
            const rawRows = payload.rawRows || [];
            const newCategories = [...prev.categories];

            analysisResult.disciplines.forEach(disc => {
                const discName = normalize(disc.name);
                let catIndex = newCategories.findIndex(c => normalize(c.name) === discName);
                if (catIndex === -1) {
                    catIndex = newCategories.findIndex(c => aliases[normalize(c.name)]?.some(a => normalize(a) === discName));
                }

                if (catIndex !== -1) {
                    const category = newCategories[catIndex];
                    const currentStats = category.simuladoStats || { history: [], average: 0 };
                    const validTopics = (disc.topics || disc.worstTopics || []).filter(t => category.tasks?.some(task => normalize(task.title) === normalize(t.name)));

                    let totalQ = 0, totalC = 0;
                    if (validTopics.length > 0) {
                        totalQ = validTopics.reduce((acc, t) => acc + (parseInt(t.total) || 0), 0);
                        totalC = validTopics.reduce((acc, t) => acc + (parseInt(t.correct) || 0), 0);
                    } else {
                        const subjectRows = rawRows.filter(r => normalize(r.subject || r.discipline) === discName);
                        totalQ = subjectRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
                        totalC = subjectRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
                    }

                    const score = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
                    const newHistory = [...(currentStats.history || []), { date: new Date().toISOString(), score, total: totalQ, correct: totalC, topics: validTopics }];

                    const grandTotalQ = newHistory.reduce((acc, h) => acc + h.total, 0);
                    const grandTotalC = newHistory.reduce((acc, h) => acc + h.correct, 0);
                    const newAverage = grandTotalQ > 0 ? (grandTotalC / grandTotalQ) * 100 : 0;

                    let trend = 'stable';
                    if (newHistory.length >= 2) {
                        const last = newHistory[newHistory.length - 1].score;
                        const prevS = newHistory[newHistory.length - 2].score;
                        trend = last > prevS ? 'up' : last < prevS ? 'down' : 'stable';
                    }

                    newCategories[catIndex] = {
                        ...category,
                        simuladoStats: { history: newHistory, average: newAverage, lastAttempt: score, trend, level: newAverage > 70 ? 'ALTO' : newAverage > 40 ? 'MÉDIO' : 'BAIXO' }
                    };
                }
            });

            const today = new Date().toDateString();
            // BUG FIX: Instead of trying to match rawRows back to stored rows via fragile
            // string/number comparisons, mark all today's rows that have subject+topic as validated.
            // rawRows are the rows the user actually analyzed — stamp them all as validated.
            const processedKeys = new Set(
                rawRows
                    .filter(r => r.subject && r.topic)
                    .map(r => `${(r.subject || '').trim()}|${(r.topic || '').trim()}`)
            );
            const validatedRows = (prev.simuladoRows || []).map(row => {
                if (row.createdAt && new Date(row.createdAt).toDateString() === today) {
                    const key = `${(row.subject || '').trim()}|${(row.topic || '').trim()}`;
                    if (processedKeys.has(key)) return { ...row, validated: true };
                }
                return row;
            });

            showToast('Simulado Processado! +500 XP 📈', 'success');
            return applyGamification({ ...prev, categories: newCategories, simuladoRows: validatedRows }, 500);
        });
    };

    const todayRows = (data.simuladoRows || []).filter(
        r => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()
    );

    return (
        <SimuladoAnalysis
            rows={todayRows}
            onRowsChange={handleUpdateSimuladoRows}
            onAnalysisComplete={handleSimuladoAnalysis}
            categories={data.categories || []}
        />
    );
}
