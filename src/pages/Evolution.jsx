import React, { useMemo } from 'react';
import EvolutionChart from '../components/EvolutionChart';
import { useAppStore } from '../store/useAppStore';

export default function Evolution() {
    const categories = useAppStore(state => state.data.categories || []);
    const user = useAppStore(state => state.data.user);

    return (
        <div className="animate-fade-in">
            <EvolutionChart
                categories={categories}
                targetScore={user?.targetScore ?? 70}
            />
        </div>
    );
}
