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
    const activeSubject = useAppStore(state => state.appState.pomodoro.activeSubject);
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);

    // Handle initial activation from location state if we arrive here without a subject (fallback)
    useEffect(() => {
        if (!activeSubject && location.state?.categoryId && location.state?.taskId) {
            const cat = data.categories?.find(c => c.id === location.state.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === location.state.taskId);

            if (cat && tsk) {
                // FALLBACK: If we arrive via direct navigation with state but NO active subject in store
                useAppStore.getState().startPomodoroSession({
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title || tsk.text || 'Estudo',
                    priority: tsk.priority
                });
            }
        }
    }, [location.state, data.categories, activeSubject]);

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

        setPomodoroActiveSubject(null);
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
            
            // Wait 1 second before exiting to let the user see the completion toast
            setTimeout(() => {
                handleExit();
            }, 1000);
        } else {
            handleExit();
        }
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
