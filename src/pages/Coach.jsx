import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import AICoachView from '../components/AICoachView';
import { useAppStore } from '../store/useAppStore';
import { getSuggestedFocus, generateDailyGoals } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';

const calibrationAlertCache = new Map();

export default function Coach() {
    const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [coachLoading, setCoachLoading] = useState(false);
    const timeoutRef = useRef(null);

        const avgBrier = Number(metric.avgBrier) || 0;
        const isDegraded = avgBrier >= CRITICAL_BRIER_THRESHOLD;

        setData(prev => {
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[metric.categoryId] || [];
            const cutoff = Date.now() - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number(item?.timestamp || 0) >= cutoff);
            const nextHistory = [...cleaned, metric].slice(-60);
            
            const recent7 = nextHistory.filter(item => Number(item?.timestamp || 0) >= (Date.now() - 1000 * 60 * 60 * 24 * 7));
            const avgBrier7d = recent7.length > 0
                ? recent7.reduce((acc, item) => acc + (Number(item?.avgBrier) || 0), 0) / recent7.length
                : 0;

            const calibrationOps = {
                ...(prev.calibrationOps || {}),
                [metric.categoryId]: {
                    categoryName: metric.categoryName,
                    avgBrier7d: Number(avgBrier7d.toFixed(4)),
                    sample7d: recent7.length,
                    degraded: isDegraded,
                    updatedAt: Date.now()
                }
            };

            const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
                ...metric,
                avgBrier7d: Number(avgBrier7d.toFixed(4)),
                degraded: isDegraded,
                source: 'coach'
            }].slice(-500);

            return {
                ...prev,
                calibrationHistoryByCategory: {
                    ...current,
                    [metric.categoryId]: nextHistory
                },
                calibrationOps,
                calibrationAuditLog
            };
        });

        if (metric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
            console.warn('[CoachCalibration] High calibration penalty detected', metric);
            logCalibrationTelemetryEvent({ ...metric, eventType: 'high_penalty_alert' });
        } else {
            logCalibrationTelemetryEvent(metric);
        }

        if (isDegraded) {
            console.warn(`[CoachCalibration] Brier above governance threshold (${CRITICAL_BRIER_THRESHOLD})`, metric);
            const lastAlertAt = Number(calibrationAlertCache.get(metric.categoryId) || 0);
            const now = Date.now();
            if (now - lastAlertAt > ALERT_COOLDOWN_MS) {
                showToast(`⚠️ Calibração crítica em ${metric.categoryName || 'categoria'} (Brier ${avgBrier.toFixed(2)}).`, 'warning');
                calibrationAlertCache.set(metric.categoryId, now);
            }
        }
    }, [setData, showToast, CALIBRATION_HISTORY_LIMIT, CALIBRATION_HISTORY_RETENTION_MS, CALIBRATION_ALERT_BRIER_THRESHOLD]);

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
                onCalibrationMetric: persistCalibrationMetric,
                config: {
                    MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                }
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
                    onCalibrationMetric: persistCalibrationMetric,
                    config: {
                        MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                    }
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
    // Refactored: Moved after hooks to respect React lifecycle rules
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
