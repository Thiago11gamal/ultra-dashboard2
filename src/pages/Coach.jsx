import React, { useMemo, useState } from 'react';
import AICoachView from '../components/AICoachView';
import { useAppStore } from '../store/useAppStore';
import { getSuggestedFocus, generateDailyGoals } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';

export default function Coach() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [coachLoading, setCoachLoading] = useState(false);

    const suggestedFocus = useMemo(() => {
        if (!data.categories) return null;

        const storedTarget = localStorage.getItem('monte_carlo_target');
        const targetScore = storedTarget ? parseInt(storedTarget, 10) : 80;

        return getSuggestedFocus(
            data.categories,
            data.simuladoRows || [],
            data.studyLogs || [],
            { user: data.user, targetScore }
        );
    }, [data.categories, data.simuladoRows, data.studyLogs, data.user]);

    const handleGenerateGoals = () => {
        setCoachLoading(true);
        setTimeout(() => {
            const storedTarget = localStorage.getItem('monte_carlo_target');
            const targetScore = storedTarget ? parseInt(storedTarget, 10) : 80;

            const newTasks = generateDailyGoals(
                data.categories,
                data.simuladoRows || [],
                data.studyLogs || [],
                { user: data.user, targetScore }
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

    return (
        <AICoachView
            suggestedFocus={suggestedFocus}
            onGenerateGoals={handleGenerateGoals}
            loading={coachLoading}
            coachPlan={data.coachPlan}
            onClearHistory={() => setData(prev => ({ ...prev, coachPlan: [] }))}
        />
    );
}
