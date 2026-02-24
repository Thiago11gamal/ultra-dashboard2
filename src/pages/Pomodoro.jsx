import React, { useState, useEffect } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import { useAppStore } from '../store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

export default function Pomodoro() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const { updatePomodoroSettings, handleUpdateStudyTime, toggleTask } = useAppStore();

    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();

    // The activeSubject is now derived purely from Router state for isolation
    const [activeSubject, setActiveSubject] = useState(null);

    useEffect(() => {
        if (location.state?.categoryId && location.state?.taskId) {
            // Blindagem contra Loop Infinito: Se a tarefa já foi ativada na sessão, ignora os próximos renders
            if (activeSubject?.taskId === location.state.taskId) return;

            const cat = data.categories?.find(c => c.id === location.state.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === location.state.taskId);
            if (cat && tsk) {
                // Initialize session state
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setActiveSubject({
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title,
                    priority: tsk.priority,
                    sessionInstanceId: Date.now()
                });

                // Update task status in store (optional visual feedback), only if necessary
                if (tsk.status !== 'studying') {
                    setData(prev => ({
                        ...prev,
                        categories: prev.categories.map(c => ({
                            ...c,
                            tasks: c.tasks.map(t => {
                                // Se for a tarefa que acabou de abrir, marca 'studying'
                                if (t.id === tsk.id && c.id === cat.id) return { ...t, status: 'studying' };
                                // Senão, remove o status 'studying' de TODAS as outras
                                if (t.status === 'studying') return { ...t, status: undefined };
                                return t;
                            })
                        }))
                    }));
                    showToast(`Iniciando estudos: ${cat.name} - ${tsk.title}`, 'success');
                }
            }
        }
    }, [location.state, data.categories, setData, showToast, activeSubject?.taskId]);

    const handleExit = () => {
        // Clear studying status
        if (activeSubject) {
            setData(prev => ({
                ...prev,
                categories: prev.categories.map(c => c.id === activeSubject.categoryId ? {
                    ...c,
                    tasks: c.tasks.map(t => t.id === activeSubject.taskId ? { ...t, status: undefined } : t)
                } : c)
            }));
        }

        const returnPath = location.state?.from ? `/${location.state.from}` : '/';
        navigate(returnPath);
    };

    const handleFullCycleComplete = () => {
        // Automatically check task as completed
        if (activeSubject) {
            const cat = data.categories?.find(c => c.id === activeSubject.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === activeSubject.taskId);

            if (tsk && !tsk.completed) {
                toggleTask(activeSubject.categoryId, activeSubject.taskId);
            }
            showToast('Ciclo de foco finalizado! Elevando produtividade.', 'info');
        }
        handleExit();
    };

    const handleSessionComplete = (subject) => {
        if (subject) {
            handleUpdateStudyTime(subject.categoryId, 25, subject.taskId);
        }
        setData(prev => ({
            ...prev,
            pomodorosCompleted: (prev.pomodorosCompleted || 0) + 1,
            lastPomodoroDate: new Date().toISOString()
        }));
    };

    return (
        <PomodoroTimer
            settings={data.settings}
            onUpdateSettings={updatePomodoroSettings}
            activeSubject={activeSubject}
            categories={data.categories || []}
            onStartStudying={() => { }} // Disabled here since we use router state now
            onUpdateStudyTime={handleUpdateStudyTime}
            onExit={handleExit}
            onSessionComplete={handleSessionComplete}
            onFullCycleComplete={handleFullCycleComplete}
            defaultTargetCycles={1}
            key={activeSubject?.sessionInstanceId || 'idle'}
        />
    );
}
