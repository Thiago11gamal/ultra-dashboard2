import React from 'react';
import RetentionPanel from '../components/RetentionPanel';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export default function Retention() {
    const categories = useAppStore(state => state.appState.contests[state.appState.activeId].categories || []);
    const navigate = useNavigate();

    const handleSelectCategory = (cat) => {
        const targetTaskId = cat.selectedTask ? cat.selectedTask.id : cat.tasks?.[0]?.id;
        if (targetTaskId) {
            navigate('/pomodoro', { state: { categoryId: cat.id, taskId: targetTaskId, from: 'retention' } });
        }
    };

    return (
        <RetentionPanel
            categories={categories}
            onSelectCategory={handleSelectCategory}
        />
    );
}
