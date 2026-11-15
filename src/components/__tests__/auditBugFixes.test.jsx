import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

const { mockStore, resetMockStore } = vi.hoisted(() => {
    const spies = {
        updateCategoryFields: vi.fn(),
        setPomodoroRunning: vi.fn(),
        setPomodoroTargetCycles: vi.fn(),
        completePomodoroPhase: vi.fn(),
        rewindPomodoroPhase: vi.fn(),
        updatePomodoroSettings: vi.fn(),
        setPomodoroActiveSubject: vi.fn(),
        resetPomodoroProgress: vi.fn(),
        resetSimuladoStats: vi.fn()
    };

    const createInitialState = () => ({
        appState: {
            activeId: 'contest-1',
            version: 1,
            contests: {
                'contest-1': {
                    id: 'contest-1',
                    contestName: 'ENEM Audit',
                    minScore: 200,
                    maxScore: 1000,
                    categories: [
                        {
                            id: 'cat-1',
                            name: 'Português',
                            maxScore: 100,
                            minScore: 0,
                            tasks: [{ id: 't1', title: 'Crase', completed: true }]
                        }
                    ],
                    simuladoRows: [],
                    simulados: []
                }
            },
            pomodoro: {
                mode: 'work',
                sessions: 1,
                targetCycles: 4,
                completedCycles: 0,
                accumulatedMinutes: 0,
                isRunning: false,
                activeSubject: {
                    categoryId: 'cat-1',
                    category: 'Português',
                    taskId: 't1',
                    task: 'Crase',
                    sessionInstanceId: 'sess-1'
                }
            }
        },
        ...spies
    });

    const stateRef = { current: createInitialState() };
    spies.setPomodoroRunning.mockImplementation((running) => {
        stateRef.current.appState.pomodoro.isRunning = running;
    });

    const reset = () => {
        Object.values(spies).forEach((fn) => fn.mockClear());
        spies.setPomodoroRunning.mockImplementation((running) => {
            stateRef.current.appState.pomodoro.isRunning = running;
        });
        stateRef.current = createInitialState();
    };

    return {
        mockStore: stateRef,
        resetMockStore: reset
    };
});

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn()
}));

vi.mock('../../hooks/useToast', () => ({
    useToast: () => vi.fn()
}));

vi.mock('../../hooks/usePomodoroSync', () => ({
    usePomodoroSync: vi.fn()
}));

vi.mock('../../utils/audioAlert', () => ({
    playPomodoroAlarm: vi.fn(),
    unlockAudio: vi.fn()
}));

vi.mock('../../utils/browserNotifications', () => ({
    sendPomodoroNotification: vi.fn(),
    requestNotificationPermission: vi.fn().mockResolvedValue(false)
}));

vi.mock('../../store/useAppStore', () => {
    const useAppStore = (selector) => (typeof selector === 'function' ? selector(mockStore.current) : mockStore.current);
    useAppStore.getState = () => mockStore.current;
    useAppStore.setState = (updater) => {
        if (typeof updater === 'function') {
            const next = updater(mockStore.current);
            if (next && typeof next === 'object') {
                Object.assign(mockStore.current, next);
            }
        } else if (updater && typeof updater === 'object') {
            Object.assign(mockStore.current, updater);
        }
    };
    return { useAppStore };
});

import SimuladoAnalysis from '../SimuladoAnalysis';
import PomodoroTimer from '../PomodoroTimer';
import CategoryEditor from '../CategoryEditor';
import Checklist from '../Checklist';
import SubtopicsTable from '../SubtopicsTable';
import Tasks from '../../pages/Tasks';

describe('Audited Bug Fixes Regression Suite', () => {
    beforeEach(() => {
        resetMockStore();
        localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
    });

    it('SimuladoAnalysis in report mode backfills missing total on copies without mutating frozen rows or erroring', async () => {
        const frozenRow = Object.freeze({
            id: 'r-1',
            subject: 'Direito Penal',
            topic: 'Dolo e Culpa',
            correct: 7,
            total: 0
        });
        const onAnalysisComplete = vi.fn();

        render(
            <SimuladoAnalysis
                rows={[frozenRow]}
                onRowsChange={vi.fn()}
                onAnalysisComplete={onAnalysisComplete}
                categories={[]}
                viewMode="report"
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Dolo e Culpa')).toBeTruthy();
        });

        expect(onAnalysisComplete).not.toHaveBeenCalled();
        expect(frozenRow.total).toBe(0);
        expect(screen.getByText('7/7')).toBeTruthy();
        expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    });

    it('SimuladoAnalysis in both mode still blocks missing total before analysis', async () => {
        const onAnalysisComplete = vi.fn();
        render(
            <SimuladoAnalysis
                rows={[{ id: 'r-1', subject: 'Direito Penal', topic: 'Dolo e Culpa', correct: 7, total: 0 }]}
                onRowsChange={vi.fn()}
                onAnalysisComplete={onAnalysisComplete}
                categories={[]}
                viewMode="both"
            />
        );

        const analyzeBtn = screen.getByRole('button', { name: /GERAR PLANO DE REVISÃO/i });
        fireEvent.click(analyzeBtn);

        await waitFor(() => {
            expect(screen.getByText(/O campo "Total" deve ser preenchido para o assunto 'Dolo e Culpa'/i)).toBeTruthy();
        });
        expect(onAnalysisComplete).not.toHaveBeenCalled();
    });

    it('PomodoroTimer does not pause or clear endsAt when settings/activeSubject object references change mid-session', () => {
        const initialSettings = { pomodoroWork: 25, pomodoroBreak: 5 };
        const initialSubject = { ...mockStore.current.appState.pomodoro.activeSubject };
        const onUpdateStudyTime = vi.fn();
        const onSessionComplete = vi.fn();
        const onTimerStateChange = vi.fn();

        const { rerender, unmount } = render(
            <PomodoroTimer
                settings={initialSettings}
                activeSubject={initialSubject}
                onUpdateStudyTime={onUpdateStudyTime}
                onSessionComplete={onSessionComplete}
                onTimerStateChange={onTimerStateChange}
            />
        );

        try {
            const playBtn = screen.getByRole('button', { name: 'Iniciar (Espaço)' });
            act(() => {
                fireEvent.click(playBtn);
            });

            expect(screen.getByRole('button', { name: 'Pausar (Espaço)' })).toBeTruthy();
            expect(localStorage.getItem('pomodoro-endsAt')).not.toBeNull();
            expect(mockStore.current.setPomodoroRunning).toHaveBeenCalledWith(true);

            mockStore.current.setPomodoroRunning.mockClear();

            // Re-render with fresh object identities (simulating parent state update)
            rerender(
                <PomodoroTimer
                    settings={{ pomodoroWork: 25, pomodoroBreak: 5 }}
                    activeSubject={{ ...initialSubject }}
                    onUpdateStudyTime={vi.fn()}
                    onSessionComplete={vi.fn()}
                    onTimerStateChange={onTimerStateChange}
                />
            );

            expect(screen.getByRole('button', { name: 'Pausar (Espaço)' })).toBeTruthy();
            expect(localStorage.getItem('pomodoro-endsAt')).not.toBeNull();
            expect(mockStore.current.setPomodoroRunning).not.toHaveBeenCalledWith(false);
        } finally {
            unmount();
        }
    });

    it('CategoryEditor preserves non-negative minScore when maxScore is fractional (< 1) and preserves valid minScore on larger maxScore', () => {
        const onClose = vi.fn();

        render(
            <CategoryEditor
                category={{ id: 'cat-1', name: 'Português', maxScore: 100, minScore: 0 }}
                isOpen={true}
                onClose={onClose}
            />
        );

        const maxInput = screen.getByLabelText('Máxima (Pts)');
        fireEvent.change(maxInput, { target: { value: '0.5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

        expect(mockStore.current.updateCategoryFields).toHaveBeenCalledWith('cat-1', expect.objectContaining({
            maxScore: 0.5,
            minScore: 0
        }));

        mockStore.current.updateCategoryFields.mockClear();
        cleanup();

        render(
            <CategoryEditor
                category={{ id: 'cat-2', name: 'Atualidades', maxScore: 10, minScore: 5 }}
                isOpen={true}
                onClose={onClose}
            />
        );

        const maxInput2 = screen.getByLabelText('Máxima (Pts)');
        fireEvent.change(maxInput2, { target: { value: '3' } });
        fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

        expect(mockStore.current.updateCategoryFields).toHaveBeenCalledWith('cat-2', expect.objectContaining({
            maxScore: 3,
            minScore: 2
        }));
    });

    it('Checklist PerformancePanel inherits contest maxScore and minScore when category lacks explicit overrides', () => {
        render(
            <Checklist
                categories={[
                    {
                        id: 'cat-enem',
                        name: 'Ciências da Natureza',
                        tasks: [],
                        simuladoStats: {
                            average: 600,
                            lastAttempt: 600,
                            history: [{ date: '2026-10-01', score: 600 }],
                            trend: 'stable',
                            level: 'MÉDIO'
                        }
                    }
                ]}
                showSimuladoStats={true}
                filter="all"
                setFilter={vi.fn()}
                activeId="enem-contest"
                contests={{
                    'enem-contest': { id: 'enem-contest', contestName: 'ENEM', minScore: 200, maxScore: 1000 }
                }}
                onToggleTask={vi.fn()}
                onUpdateTask={vi.fn()}
                onDeleteTask={vi.fn()}
                onAddCategory={vi.fn()}
                onDeleteCategory={vi.fn()}
                onAddTask={vi.fn()}
                onTogglePriority={vi.fn()}
                onPlayContext={vi.fn()}
                onImportCategory={vi.fn()}
            />
        );

        // With inherited 200..1000 scale, 600 pts => 50% (not 100% clamped against default 0..100)
        expect(screen.getAllByText('600 / 1000 pts').length).toBeGreaterThan(0);
        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    });

    it('SubtopicsTable handles numeric category id 0 in discipline filter and wraps completed icon with accessible title', () => {
        const categories = [
            {
                id: 0,
                name: 'Disciplina Zero',
                maxScore: 100,
                minScore: 0,
                tasks: [{ id: 't-zero', title: 'Topico Zero', completed: true }],
                simuladoStats: {
                    history: [
                        {
                            date: '2026-10-01',
                            topics: [{ name: 'Topico Zero', total: 10, correct: 8, wrong: 2 }]
                        }
                    ]
                }
            },
            {
                id: 1,
                name: 'Disciplina Um',
                maxScore: 100,
                minScore: 0,
                tasks: [{ id: 't-um', title: 'Topico Um', completed: false }],
                simuladoStats: {
                    history: [
                        {
                            date: '2026-10-01',
                            topics: [{ name: 'Topico Um', total: 10, correct: 6, wrong: 4 }]
                        }
                    ]
                }
            }
        ];

        const { container } = render(<SubtopicsTable categories={categories} maxScore={100} minScore={0} />);

        const select = screen.getByLabelText('Filtrar por disciplina');
        fireEvent.change(select, { target: { value: '0' } });

        expect(screen.getByText('Topico Zero')).toBeTruthy();
        expect(screen.queryByText('Topico Um')).toBeNull();

        const completedBadge = container.querySelector('span[title="Tópico concluído no edital"]');
        expect(completedBadge).not.toBeNull();
        const svgIcon = completedBadge.querySelector('svg[aria-hidden="true"]');
        expect(svgIcon).not.toBeNull();
    });

    it('Tasks page panel badges avoid conflicting base inline-flex before hidden sm:inline-flex', () => {
        const { container } = render(<Tasks />);
        const headerBadge = screen.getByText('Edital Analytics');
        expect(headerBadge.className).toContain('hidden sm:inline-flex');
        expect(headerBadge.className.split(/\s+/)).not.toContain('inline-flex');

        const tabBtn = screen.getByRole('button', { name: /Rankings & Destaques/i });
        const tabBadge = tabBtn.querySelector('span:last-child');
        expect(tabBadge.textContent).toBe('1 Matérias');
        expect(tabBadge.className).toContain('hidden sm:inline-block');
        expect(tabBadge.className.split(/\s+/)).not.toContain('inline-flex');
        expect(container.querySelectorAll('.inline-flex.hidden')).toHaveLength(0);
    });
});
