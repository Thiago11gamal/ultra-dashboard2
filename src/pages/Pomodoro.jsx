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

    // The activeSubject is now derived from Router state or hydrated from local storage
    const [activeSubject, setActiveSubject] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroActiveSubject');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    // Handle initial activation from location state
    useEffect(() => {
        if (location.state?.categoryId && location.state?.taskId) {
            if (activeSubject?.taskId === location.state.taskId) return;

            const cat = data.categories?.find(c => c.id === location.state.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === location.state.taskId);

            if (cat && tsk) {
                const newSubject = {
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title,
                    priority: tsk.priority,
                    sessionInstanceId: Date.now()
                };
                setActiveSubject(newSubject);
                localStorage.setItem('pomodoroActiveSubject', JSON.stringify(newSubject));

                if (tsk.status !== 'studying') {
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

        localStorage.removeItem('pomodoroActiveSubject');
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

    const handleSessionComplete = () => {
        setData(prev => ({
            ...prev,
            pomodorosCompleted: (prev.pomodorosCompleted || 0) + 1,
            lastPomodoroDate: new Date().toISOString()
        }));
    };

    return (
        <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center py-4">
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
        </div>
    );
}
