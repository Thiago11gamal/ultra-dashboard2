import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import AICoachView from '../components/AICoachView';
import { useAppStore } from '../store/useAppStore';
import { getSuggestedFocus, generateDailyGoals } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';

export default function Coach() {
    const CALIBRATION_HISTORY_LIMIT = 60;
    const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [coachLoading, setCoachLoading] = useState(false);
    const timeoutRef = useRef(null);

    const persistCalibrationMetric = React.useCallback((metric) => {
        if (!metric?.categoryId) return;
        setData(prev => {
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[metric.categoryId] || [];
            
            // Limpeza por tempo (45 dias)
            const cutoff = Date.now() - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number(item?.timestamp || 0) >= cutoff);
            
            const nextHistory = [...cleaned, metric].slice(-CALIBRATION_HISTORY_LIMIT);
            return {
                ...prev,
                calibrationHistoryByCategory: {
                    ...current,
                    [metric.categoryId]: nextHistory
                }
            };
        });

        if (metric.calibrationPenalty >= 0.2) {
            console.warn('[CoachCalibration] High calibration penalty detected', metric);
        }
    }, [setData, CALIBRATION_HISTORY_LIMIT, CALIBRATION_HISTORY_RETENTION_MS]);

    // Helper to get targetScore from store or localStorage
    const getTargetScore = React.useCallback(() => {
        const uid = data?.user?.uid;
        const storedTarget = localStorage.getItem(`monte_carlo_target_${uid || 'default'}`);
        const storeTargetValue = data?.user?.targetProbability;
        return (storeTargetValue != null && !isNaN(Number(storeTargetValue)))
            ? Number(storeTargetValue)
            : storedTarget ? parseInt(storedTarget, 10) : 80;
    }, [data?.user?.uid, data?.user?.targetProbability]);

    const suggestedFocus = useMemo(() => {
        if (!data?.categories) return null;

        const targetScore = getTargetScore();

        return getSuggestedFocus(
            data.categories,
            data.simuladoRows || [],
            data.studyLogs || [],
            {
                user: data.user,
                targetScore,
                maxScore: data.maxScore ?? 100,
                calibrationHistoryByCategory: data.calibrationHistoryByCategory || {},
                onCalibrationMetric: persistCalibrationMetric
            }
        );
    }, [data, getTargetScore, persistCalibrationMetric]); 

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleGenerateGoals = React.useCallback(() => {
        if (!data?.categories) return;
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            const targetScore = getTargetScore();

            const newTasks = generateDailyGoals(
                data.categories,
                data.simuladoRows || [],
                data.studyLogs || [],
                {
                    user: data.user,
                    targetScore,
                    maxScore: data.maxScore ?? 100,
                    calibrationHistoryByCategory: data.calibrationHistoryByCategory || {},
                    onCalibrationMetric: persistCalibrationMetric
                }
            );
            if (newTasks.length) {
                setData(prev => ({ ...prev, coachPlan: newTasks }));
                showToast('Sugestões geradas!', 'success');
            } else {
                showToast('Nenhuma sugestão necessária.', 'info');
            }
            setCoachLoading(false);
        }, 1500);
    }, [data, setData, showToast, persistCalibrationMetric, getTargetScore]);

    // BUG-17 FIX: Guarda de segurança contra estado vazio
    if (!data || !data.categories) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-300 font-mono animate-pulse">Sincronizando dados...</p>
            </div>
        );
    }

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
