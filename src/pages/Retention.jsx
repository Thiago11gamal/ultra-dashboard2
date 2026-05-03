import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo } from 'react';
import RetentionPanel from '../components/RetentionPanel';
import { AnaliseRetencaoChart } from '../components/charts/Analytics/AnaliseRetencaoChart';
import { mapRetentionData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function Retention() {
    const categories = useAppStore(state => {
        const activeContest = state.appState.contests[state.appState.activeId];
        return activeContest?.categories || [];
    });
    const navigate = useNavigate();
    const showToast = useToast();

    const chartData = useMemo(() => mapRetentionData(categories), [categories]);

    const handleSelectCategory = (cat) => {
        const targetTaskId = cat.selectedTask ? cat.selectedTask.id : cat.tasks?.[0]?.id;
        
        // FIX: Tratamento correto caso não haja tasks
        if (targetTaskId) {
            navigate('/pomodoro', { state: { categoryId: cat.id, taskId: targetTaskId, from: 'retention' } });
        } else {
            showToast(`Crie pelo menos uma tarefa em "${cat.name}" para iniciar os estudos.`, 'warning');
        }
    };

    return (<PageErrorBoundary pageName="Retenção">
        <div className="space-y-6">
            <div className="tour-step-10">
                <RetentionPanel
                    categories={categories}
                    onSelectCategory={handleSelectCategory}
                />
            </div>
            
            <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-100/5 dark:bg-slate-900/40 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/5">
                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-white uppercase tracking-widest">Análise de Decaimento Cronológico</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">Relatório Comparativo: Tempo vs Retenção de Memória</p>
                    </div>
                </div>
                <AnaliseRetencaoChart data={chartData} />
            </div>
        </div>
    </PageErrorBoundary>);
}

