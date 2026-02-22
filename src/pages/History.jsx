import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';

export default function History() {
    const data = useAppStore(state => state.data);
    const { deleteSession, deleteSimulado } = useAppStore();

    return (
        <StudyHistory
            studySessions={data.studySessions || []}
            categories={data.categories || []}
            simuladoRows={data.simuladoRows || []}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
        />
    );
}
