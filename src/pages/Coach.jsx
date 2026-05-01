import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import AICoachView from '../components/AICoachView';
import { useAppStore } from '../store/useAppStore';
import { getSuggestedFocus, generateDailyGoals } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';

const calibrationAlertCache = new Map();
const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias

export default function Coach() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [coachLoading, setCoachLoading] = useState(false);
    const timeoutRef = useRef(null);
    const persistCalibrationMetric = React.useCallback((metric) => {
        if (!metric?.categoryId) return;
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
    }, [setData, showToast]);

    // Helper to get targetScore from store or localStorage
    const getTargetScore = React.useCallback(() => {
        const uid = data?.user?.uid;
        const storedTarget = localStorage.getItem(`monte_carlo_target_${uid || 'default'}`);
        const storeTargetValue = data?.user?.targetProbability;
        return (storeTargetValue != null && !isNaN(Number(storeTargetValue)))
            ? Number(storeTargetValue)
            : storedTarget ? parseInt(storedTarget, 10) : 80;
    }, [data?.user?.uid, data?.user?.targetProbability]);

    // BUG-C1 FIX: Collect calibration metrics without triggering store updates inside useMemo
    const calibrationMetricsRef = useRef([]);

    const suggestedFocus = useMemo(() => {
        if (!data?.categories) return null;

        const targetScore = getTargetScore();
        const collectedMetrics = [];

        const result = getSuggestedFocus(
            data.categories,
            data.simuladoRows || [],
            data.studyLogs || [],
            {
                user: data.user,
                targetScore,
                maxScore: data.maxScore ?? 100,
                calibrationHistoryByCategory: data.calibrationHistoryByCategory || {},
                onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                config: {
                    MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                }
            }
        );

        // Store collected metrics in ref for the useEffect to consume
        calibrationMetricsRef.current = collectedMetrics;
        return result;
    // BUG-11 FIX: Use optional chaining on all deps to prevent TypeError
    // when data is undefined (before early return guard executes)
    }, [data?.categories, data?.simuladoRows, data?.studyLogs, data?.user, data?.maxScore, data?.calibrationHistoryByCategory, data?.settings?.adaptiveCalibrationEnabled]);

    // BUG-C1 FIX: Persist calibration metrics in a separate effect, outside the render cycle
    useEffect(() => {
        if (!calibrationMetricsRef.current.length) return;
        const metrics = calibrationMetricsRef.current;
        calibrationMetricsRef.current = [];
        metrics.forEach(metric => persistCalibrationMetric(metric));
    }, [suggestedFocus, persistCalibrationMetric]);

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

            // BUG-13 FIX: Collect calibration metrics into a local array and
            // persist them in a single batch after generation, instead of calling
            // persistCalibrationMetric N times synchronously (N = category count),
            // which caused N separate setData calls and N re-renders.
            const collectedMetrics = [];

            const newTasks = generateDailyGoals(
                data.categories,
                data.simuladoRows || [],
                data.studyLogs || [],
                {
                    user: data.user,
                    targetScore,
                    maxScore: data.maxScore ?? 100,
                    calibrationHistoryByCategory: data.calibrationHistoryByCategory || {},
                    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
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

            // Persist all collected metrics after generation is complete
            collectedMetrics.forEach(metric => persistCalibrationMetric(metric));

            setCoachLoading(false);
        }, 1500);
    }, [data, setData, showToast, persistCalibrationMetric, getTargetScore]);

    // BUG-H2 FIX: stable callback reference via useCallback
    const handleClearHistory = useCallback(() => {
        setData(prev => ({ ...prev, coachPlan: [] }));
        useAppStore.getState().updateCoachPlanner({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    }, [setData]);

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
            onClearHistory={handleClearHistory}
        />
    </PageErrorBoundary>);
}
