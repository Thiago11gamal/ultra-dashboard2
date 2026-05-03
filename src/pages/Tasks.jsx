import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import PersonalRanking from '../components/PersonalRanking';
import VolumeRanking from '../components/VolumeRanking';
import PerformanceTable from '../components/PerformanceTable';
import SubtopicsTable from '../components/SubtopicsTable';
import { useAppStore } from '../store/useAppStore';
import { RotateCcw } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Tasks() {
    // FIX: Adicionado '?.' antes de '.categories' para evitar crash de hidratação
    const categories = useAppStore(state => state.appState.contests[state.appState.activeId]?.categories || []);
    const { resetSimuladoStats } = useAppStore();
    const showToast = useToast();

    const handleReset = () => {
        if (!window.confirm('Resetar performance?')) return;
        resetSimuladoStats();
        showToast('Resetado com sucesso!', 'success');
    };

    return (<PageErrorBoundary pageName="Tarefas">
        <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                <div className="lg:col-span-2">
                    <PersonalRanking categories={categories} />
                </div>
                <div className="lg:col-span-1 h-full">
                    <VolumeRanking categories={categories} />
                </div>
            </div>

            <div className="pb-8 border-t border-white/5 pt-10 mt-10">
                <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
                    📊 Quadro de Performance
                    <button
                        onClick={handleReset}
                        className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Resetar dados do quadro"
                    >
                        <RotateCcw size={16} />
                    </button>
                </h2>
                <PerformanceTable categories={categories} />
                <SubtopicsTable categories={categories} />
            </div>
        </div>
    </PageErrorBoundary>);
}
