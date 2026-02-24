import React, { useState } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import Charts from '../components/Charts';
import { useAppStore } from '../store/useAppStore';

export default function Stats() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    const updateWeights = useAppStore(state => state.updateWeights);
    const [filter, setFilter] = useState('all');

    return (
        <div className="space-y-8 animate-fade-in">
            <VerifiedStats
                categories={data.categories || []}
                user={data.user}
                onUpdateWeights={updateWeights}
            />
            <WeeklyAnalysis
                studyLogs={data.studyLogs || []}
                categories={data.categories || []}
            />
            <Charts
                data={data}
                filter={filter}
                setFilter={setFilter}
                compact
            />
        </div>
    );
}
