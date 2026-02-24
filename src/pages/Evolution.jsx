import React from 'react';
import EvolutionChart from '../components/EvolutionChart';
import { useAppStore } from '../store/useAppStore';

export default function Evolution() {
    const categories = useAppStore(state => state.appState.contests[state.appState.activeId].categories || []);
    const user = useAppStore(state => state.appState.contests[state.appState.activeId].user);


    return (
        <div className="animate-fade-in">
            <EvolutionChart
                categories={categories}
                targetScore={user?.targetScore ?? 70}
            />
        </div>
    );
}
