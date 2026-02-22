import React from 'react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';

export default function Notes() {
    const categories = useAppStore(state => state.appState.contests[state.appState.activeId].categories || []);

    return (
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={categories} />
            <ParetoAnalysis categories={categories} />
        </div>
    );
}
