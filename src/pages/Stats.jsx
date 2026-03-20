import React from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { useAppStore } from '../store/useAppStore';

export default function Stats() {
    const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
    if (!data || !data.categories) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

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
