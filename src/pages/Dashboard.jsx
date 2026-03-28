import React, { useState, useEffect } from 'react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import VerifiedStats from '../components/VerifiedStats';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey } from '../utils/dateHelper';
import { computeCategoryStats } from '../engine';

export default function Dashboard() {
    const setAppState = useAppStore(state => state.setAppState);
    const setData = useAppStore(state => state.setData);
    const { toggleTask, deleteTask, addCategory, deleteCategory, addTask, togglePriority, startPomodoroSession } = useAppStore();
    const showToast = useToast();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');

    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    
    // --- ENGINE DE REPARAÇÃO DE DADOS (MONTE CARLO RESTORE) ---
    useEffect(() => {
        if (!data || !data.categories || !data.simuladoRows || data.simuladoRows.length === 0) return;

        // Verificar se há discrepância entre simuladoRows e history
        const totalRows = data.simuladoRows.length;
        const totalHistoryPoints = (data.categories || []).reduce((acc, cat) => acc + (cat.simuladoStats?.history?.length || 0), 0);

        // Se temos muitos logs de questões mas o histórico agregado está vazio/baixo, iniciamos o reparo.
        if (totalRows > 0 && totalHistoryPoints < Math.min(totalRows, 5)) {
            console.log(`%c[DataRepair] Detectada discrepância: ${totalRows} logs vs ${totalHistoryPoints} pontos de histórico. Iniciando restauração...`, "color: #a855f7; font-weight: bold;");
            
            setData(prev => {
                const newCategories = JSON.parse(JSON.stringify(prev.categories || []));
                const rows = prev.simuladoRows || [];

                newCategories.forEach(cat => {
                    const catNorm = normalize(cat.name);
                    const catAliases = aliases[catNorm] || [];
                    
                    // Filtrar logs para esta matéria
                    const myRows = rows.filter(r => {
                        const subNorm = normalize(r.subject);
                        return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
                    });

                    if (myRows.length > 0) {
                        // Agrupar por data para reconstruir o histórico diário
                        const dailyStats = {};
                        myRows.forEach(r => {
                            const dk = getDateKey(new Date(r.createdAt));
                            if (!dailyStats[dk]) dailyStats[dk] = { correct: 0, total: 0 };
                            dailyStats[dk].correct += (parseInt(r.correct, 10) || 0);
                            dailyStats[dk].total += (parseInt(r.total, 10) || 0);
                        });

                        const rebuiltHistory = Object.entries(dailyStats).map(([date, stats]) => ({
                            date,
                            correct: stats.correct,
                            total: stats.total,
                            score: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
                        })).sort((a, b) => new Date(a.date) - new Date(b.date));

                        // Atualizar estatísticas da categoria
                        const statsResult = computeCategoryStats(rebuiltHistory, 1);
                        cat.simuladoStats = {
                            history: rebuiltHistory.slice(-50),
                            average: Number(statsResult.mean.toFixed(1)),
                            trend: statsResult.trend || 'stable',
                            lastAttempt: rebuiltHistory.length > 0 ? rebuiltHistory[rebuiltHistory.length - 1].score : 0,
                            level: statsResult.level || (statsResult.mean > 70 ? 'ALTO' : statsResult.mean > 40 ? 'MÉDIO' : 'BAIXO')
                        };
                    }
                });

                return { ...prev, categories: newCategories, lastUpdated: new Date().toISOString() };
            });
            showToast("Dados de simulados sincronizados e restaurados! 💎", "success");
        }
    }, [data, setData, showToast]);

    // GUARDA DE SEGURANÇA: Previne crash se o estado mudar rapidamente durante a restauração
    if (!data || !data.categories) {
        return (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="absolute inset-0 bg-slate-950 backdrop-blur-3xl" />
                <div className="relative z-10 space-y-6">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500/10" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-purple-400 animate-spin" />
                        <div className="absolute inset-4 rounded-full border-2 border-blue-500/10" />
                        <div className="absolute inset-4 rounded-full border-b-2 border-blue-400 animate-spin-slow" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-white tracking-widest uppercase">Sincronizando</h3>
                        <p className="text-purple-300/60 font-mono text-xs animate-pulse">Estabelecendo conexão segura com a nuvem...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    const setGoalDate = (d) => setData(prev => ({ ...prev, user: { ...prev.user, goalDate: d } }));

    const handleStartStudying = (categoryId, taskId) => {
        const cat = data.categories?.find(c => c.id === categoryId);
        const tsk = cat?.tasks?.find(t => t.id === taskId);

        if (cat && tsk) {
            startPomodoroSession({
                categoryId: cat.id,
                taskId: tsk.id,
                category: cat.name,
                task: tsk.title,
                priority: tsk.priority
            });

            // Set studying status
            setData(prev => ({
                ...prev,
                categories: prev.categories.map(c => ({
                    ...c,
                    tasks: c.tasks.map(t => {
                        if (t.id === tsk.id && c.id === cat.id) return { ...t, status: 'studying' };
                        if (t.status === 'studying') return { ...t, status: undefined };
                        return t;
                    })
                }))
            }));
            showToast(`Iniciando estudos: ${cat.name} - ${tsk.title}`, 'success');
        }

        navigate('/pomodoro');
    };



    return (
        <div className="space-y-6 animate-fade-in">
            <div className="tour-step-4">
                <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
            </div>
            
            {/* Gráfico de Monte Carlo Restante */}
            <VerifiedStats categories={data.categories} user={data.user} />

            <div className="tour-step-5">
                <NextGoalCard categories={data.categories} simulados={data.simuladoRows || []} studyLogs={data.studyLogs || []} onStartStudying={handleStartStudying} />
            </div>
            
            <PriorityProgress categories={data.categories} />

            <div className="mt-4 tour-step-6">
                <Checklist
                    categories={data.categories}
                    onToggleTask={toggleTask}
                    onDeleteTask={deleteTask}
                    onAddCategory={addCategory}
                    onDeleteCategory={deleteCategory}
                    onAddTask={addTask}
                    onTogglePriority={togglePriority}
                    onPlayContext={handleStartStudying}
                    filter={filter}
                    setFilter={setFilter}
                />
            </div>
        </div>
    );
}
