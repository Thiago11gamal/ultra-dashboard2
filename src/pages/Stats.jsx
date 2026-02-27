import React from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { useAppStore } from '../store/useAppStore';

export default function Stats() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const updateWeights = useAppStore(state => state.updateWeights);

    return (
        <div className="space-y-8 animate-fade-in">
            <VerifiedStats
                categories={data.categories || []}
                user={data.user}
            />
            <WeeklyAnalysis
                studyLogs={data.studyLogs || []}
                categories={data.categories || []}
            />
        </div>
    );
}
