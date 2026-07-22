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
  const rawCategories = useAppStore(state => state.appState.contests[state.appState.activeId]?.categories || []);
  const categories = (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories)).map(c => ({
    ...c,
    tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
  }));
  
  const resetSimuladoStats = useAppStore(state => state.resetSimuladoStats);
  const showToast = useToast();
  
  // ✅ FIX: Calcular maxScore global das categorias
  const maxScore = React.useMemo(() => {
    const scores = categories.map(c => c.maxScore).filter(s => typeof s === 'number' && s > 0);
    return scores.length > 0 ? Math.max(...scores) : 100;
  }, [categories]);
  
  const handleReset = () => {
    if (!window.confirm('Resetar performance?')) return;
    resetSimuladoStats();
    showToast('Resetado com sucesso!', 'success');
  };

  if (categories.length === 0) {
    return (
      <PageErrorBoundary pageName="Tarefas">
        <div className="min-h-[50vh] flex items-center justify-center text-center px-4">
          <div>
            <p className="text-slate-300 font-bold uppercase tracking-wider text-xs">Sem tarefas cadastradas</p>
            <p className="text-slate-500 text-[11px] mt-1">Crie matérias e tarefas para liberar rankings e quadros de performance.</p>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="Tarefas">
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
          
          {/* ✅ FIX: Passar maxScore para os componentes */}
          <PerformanceTable categories={categories} maxScore={maxScore} />
          <SubtopicsTable categories={categories} maxScore={maxScore} />
        </div>
      </div>
    </PageErrorBoundary>
  );
}
