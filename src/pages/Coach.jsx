import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import AICoachView from '../components/AICoachView';
import { useAppStore } from '../store/useAppStore';
import { getSuggestedFocus, generateDailyGoals } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';

export default function Coach() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [coachLoading, setCoachLoading] = useState(false);
    const timeoutRef = useRef(null);

    const suggestedFocus = useMemo(() => {
        if (!data?.categories) return null;

        // CACHE BUG FIX: localStorage.getItem is NOT reactive — React cannot track it as
        // a dependency. Using it here caused a stale targetScore because VerifiedStats only
        // writes to localStorage when the config modal closes (not during slider interaction).
        // Fix: prefer data.user.targetProbability which IS in the reactive store and IS a
        // dep via data.user. localStorage serves only as bootstrap fallback on cold mount.
        const uid = data.user?.uid;
        const storedTarget = localStorage.getItem(`monte_carlo_target_${uid || 'default'}`);
        const storeTargetValue = data.user?.targetProbability;
        const targetScore = (storeTargetValue != null && !isNaN(Number(storeTargetValue)))
            ? Number(storeTargetValue)
            : storedTarget ? parseInt(storedTarget, 10) : 80;

        return getSuggestedFocus(
            data.categories,
            data.simuladoRows || [],
            data.studyLogs || [],
            { user: data.user, targetScore, maxScore: data.maxScore ?? 100 }
        );
    }, [data?.categories, data?.simuladoRows, data?.studyLogs, data?.user]); // CORREÇÃO: Optional chaining adicionado aqui

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // BUG-17 FIX: Guarda de segurança contra estado vazio
    // Refactored: Moved after hooks to respect React lifecycle rules
    if (!data || !data.categories) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-300 font-mono animate-pulse">Sincronizando dados...</p>
            </div>
        );
    }

    const handleGenerateGoals = () => {
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            // CACHE BUG FIX: same fix as suggestedFocus — prefer reactive store value.
            const uid = data.user?.uid;
            const storedTarget = localStorage.getItem(`monte_carlo_target_${uid || 'default'}`);
            const storeTargetValue = data.user?.targetProbability;
            const targetScore = (storeTargetValue != null && !isNaN(Number(storeTargetValue)))
                ? Number(storeTargetValue)
                : storedTarget ? parseInt(storedTarget, 10) : 80;

            const newTasks = generateDailyGoals(
                data.categories,
                data.simuladoRows || [],
                data.studyLogs || [],
                { user: data.user, targetScore, maxScore: data.maxScore ?? 100 }
            );
            if (newTasks.length) {
                setData(prev => ({ ...prev, coachPlan: newTasks }));
                showToast('Sugestões geradas!', 'success');
            } else {
                showToast('Nenhuma sugestão necessária.', 'info');
            }
            setCoachLoading(false);
        }, 1500);
    };

    return (<PageErrorBoundary pageName="Coach">
        <AICoachView
            suggestedFocus={suggestedFocus}
            onGenerateGoals={handleGenerateGoals}
            loading={coachLoading}
            onClearHistory={() => {
                setData(prev => ({ ...prev, coachPlan: [] }));
                useAppStore.getState().updateCoachPlanner({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
            }}
        />
    </PageErrorBoundary>);
}
