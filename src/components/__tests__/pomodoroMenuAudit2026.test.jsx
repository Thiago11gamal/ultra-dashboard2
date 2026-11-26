// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { createPomodoroSlice } from '../../store/slices/createPomodoroSlice';
import PomodoroTimer from '../PomodoroTimer';
import SessionFocusPanel from '../pomodoro/FocusPanel';
import PomodoroPage from '../../pages/Pomodoro';

const toastMock = vi.fn();
const playAlarmMock = vi.fn();
const unlockAudioMock = vi.fn();
const sendNotifMock = vi.fn();

vi.mock('../../hooks/useToast', () => ({
    useToast: () => toastMock,
}));

vi.mock('../../utils/audioAlert', () => ({
    playPomodoroAlarm: (...args) => playAlarmMock(...args),
    unlockAudio: (...args) => unlockAudioMock(...args),
}));

vi.mock('../../utils/browserNotifications', () => ({
    sendPomodoroNotification: (...args) => sendNotifMock(...args),
    requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
    isNotificationSupported: () => true,
}));

const seedStoreForPomodoro = (overrides = {}) => {
    const activeSubject = overrides.activeSubject !== undefined
        ? overrides.activeSubject
        : {
            categoryId: 'cat-const',
            category: 'Direito Constitucional',
            taskId: 'task-1',
            task: 'Controle de Constitucionalidade',
            priority: 'high',
            source: 'pomodoro',
            sessionInstanceId: 'sess-audit-1',
        };

    useAppStore.setState((state) => ({
        appState: {
            ...state.appState,
            activeId: 'contest-audit',
            isHydrated: true,
            contests: {
                ...state.appState.contests,
                'contest-audit': {
                    id: 'contest-audit',
                    contestName: 'Concurso Audit',
                    minScore: 0,
                    maxScore: 100,
                    user: { name: 'Tester', xp: 1200, level: 3 },
                    settings: {
                        pomodoroWork: 25,
                        pomodoroBreak: 5,
                        pomodoroLongBreak: 15,
                        longBreakAfter: 4,
                        soundEnabled: true,
                        ...(overrides.settings || {}),
                    },
                    categories: overrides.categories || [
                        {
                            id: 'cat-const',
                            name: 'Direito Constitucional',
                            color: '#6366f1',
                            tasks: [
                                { id: 'task-1', title: 'Controle de Constitucionalidade', priority: 'high', completed: false },
                                { id: 'task-2', title: 'Direitos Fundamentais', priority: 'low', completed: false },
                            ],
                            totalMinutes: 0,
                        },
                        {
                            id: 'cat-penal',
                            name: 'Direito Penal',
                            color: '#ef4444',
                            tasks: [
                                { id: 'task-3', title: 'Teoria do Crime', priority: 'low', completed: false },
                            ],
                            totalMinutes: 0,
                        },
                    ],
                    studyLogs: overrides.studyLogs || [],
                    studySessions: [],
                    simulados: overrides.simulados || [],
                    simuladoRows: [],
                },
            },
            pomodoro: {
                mode: 'work',
                sessions: 1,
                targetCycles: 1,
                completedCycles: 0,
                accumulatedMinutes: 0,
                isRunning: false,
                neuralMode: false,
                neuralQueue: [],
                activeSubject,
                ...(overrides.pomodoro || {}),
            },
        },
    }));

    return activeSubject;
};

describe('Cronômetro / Pomodoro Menu — 2026 Audit Bugfixes & Improvements', () => {
    beforeEach(() => {
        vi.useRealTimers();
        localStorage.clear();
        sessionStorage.clear();
        toastMock.mockClear();
        playAlarmMock.mockClear();
        unlockAudioMock.mockClear();
        sendNotifMock.mockClear();
        document.title = 'Ultra Dashboard';
        window.scrollTo = vi.fn();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        localStorage.clear();
        sessionStorage.clear();
        document.body.style.overflow = '';
    });

    it('1. reset() syncs timeRef so unmounting after running + resetting does NOT log phantom study minutes', () => {
        vi.useFakeTimers();
        const t0 = new Date('2026-05-01T12:00:00Z').getTime();
        vi.setSystemTime(t0);
        const activeSubject = seedStoreForPomodoro({ pomodoro: { targetCycles: 2 } });
        const onUpdateStudyTime = vi.fn();

        const { unmount } = render(
            <PomodoroTimer
                settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                activeSubject={activeSubject}
                onUpdateStudyTime={onUpdateStudyTime}
            />
        );

        // Start timer and advance wall clock by 5 minutes (300s)
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Iniciar (Espaço)' }));
        });
        act(() => {
            vi.setSystemTime(t0 + 5 * 60 * 1000);
            vi.advanceTimersByTime(300);
        });

        // Reset timer back to full 25:00
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: /Reiniciar cronômetro/i }));
        });

        // Unmount immediately: must NOT log the 5 minutes from before reset
        unmount();
        expect(onUpdateStudyTime).not.toHaveBeenCalled();
    });

    it('2. natural completion with +5m extra time passes 30m to completePomodoroPhase and onFullCycleComplete', () => {
        vi.useFakeTimers();
        const t0 = new Date('2026-05-01T12:00:00Z').getTime();
        vi.setSystemTime(t0);
        const activeSubject = seedStoreForPomodoro({ pomodoro: { targetCycles: 1 } });
        const onUpdateStudyTime = vi.fn();
        const onFullCycleComplete = vi.fn();

        render(
            <PomodoroTimer
                settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: true }}
                activeSubject={activeSubject}
                onUpdateStudyTime={onUpdateStudyTime}
                onFullCycleComplete={onFullCycleComplete}
            />
        );

        // Add +5m -> total work block is now 30m (1800s)
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Adicionar 5 minutos' }));
        });
        expect(screen.getByRole('timer').textContent).toBe('30:00');

        // Start and jump wall clock to 30m elapsed
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Iniciar (Espaço)' }));
        });
        act(() => {
            vi.setSystemTime(t0 + 30 * 60 * 1000 + 500);
            vi.advanceTimersByTime(400);
        });

        expect(onUpdateStudyTime).toHaveBeenCalledWith(
            'cat-const',
            30,
            'task-1',
            'Controle de Constitucionalidade'
        );
        expect(onFullCycleComplete).toHaveBeenCalledWith(30, true);
        expect(playAlarmMock).toHaveBeenCalledWith({ phase: 'work' });
    });

    it('3. manual skip with < 15s elapsed logs 0 minutes, passes 0 (not 25) to onFullCycleComplete, and suppresses desktop notifications', () => {
        vi.useFakeTimers();
        localStorage.setItem('pomodoro_notifications_enabled', 'true');
        const activeSubject = seedStoreForPomodoro({ pomodoro: { targetCycles: 1 } });
        const onUpdateStudyTime = vi.fn();
        const onFullCycleComplete = vi.fn();

        render(
            <PomodoroTimer
                settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                activeSubject={activeSubject}
                onUpdateStudyTime={onUpdateStudyTime}
                onFullCycleComplete={onFullCycleComplete}
            />
        );

        // Start for just 3 seconds then skip
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Iniciar (Espaço)' }));
        });
        act(() => {
            vi.advanceTimersByTime(3000);
        });
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: /Pular fase/i }));
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(onUpdateStudyTime).not.toHaveBeenCalled();
        expect(onFullCycleComplete).toHaveBeenCalledWith(0, false);
        expect(sendNotifMock).not.toHaveBeenCalled();
    });

    it('4. external pomodoroWork change (ACWR) while paused mid-work flushes studied minutes before resetting', () => {
        vi.useFakeTimers();
        const t0 = new Date('2026-05-01T12:00:00Z').getTime();
        vi.setSystemTime(t0);
        const activeSubject = seedStoreForPomodoro({ pomodoro: { targetCycles: 2 } });
        const onUpdateStudyTime = vi.fn();

        const { rerender } = render(
            <PomodoroTimer
                settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                activeSubject={activeSubject}
                onUpdateStudyTime={onUpdateStudyTime}
            />
        );

        // Study 4 minutes then pause
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Iniciar (Espaço)' }));
        });
        act(() => {
            vi.setSystemTime(t0 + 4 * 60 * 1000);
            vi.advanceTimersByTime(300);
        });
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Pausar (Espaço)' }));
        });

        // External setting update (like clicking ACWR 40m button)
        rerender(
            <PomodoroTimer
                settings={{ pomodoroWork: 40, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                activeSubject={activeSubject}
                onUpdateStudyTime={onUpdateStudyTime}
            />
        );
        act(() => {
            vi.advanceTimersByTime(50);
        });

        expect(onUpdateStudyTime).toHaveBeenCalledTimes(1);
        expect(onUpdateStudyTime.mock.calls[0][1]).toBeCloseTo(4, 1);
        expect(screen.getByRole('timer').textContent).toBe('40:00');
    });

    it('5. Fullscreen Zen Mode portals to document.body, locks scroll, shows topic banner, and exits on Escape', () => {
        const activeSubject = seedStoreForPomodoro();
        const { container } = render(
            <PomodoroTimer
                settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                activeSubject={activeSubject}
            />
        );

        act(() => {
            fireEvent.click(screen.getByTitle(/Modo Zen/i));
        });

        // Portal renders directly under document.body (outside container)
        expect(container.querySelector('[aria-label="Cronômetro em Modo Zen"]')).toBeNull();
        const zenRegion = document.body.querySelector('[aria-label="Cronômetro em Modo Zen"]');
        expect(zenRegion).toBeTruthy();
        expect(zenRegion.textContent).toContain('Modo Zen');
        expect(zenRegion.textContent).toContain('Controle de Constitucionalidade');
        expect(document.body.style.overflow).toBe('hidden');

        // Pressing Escape closes Zen Mode and restores scroll
        act(() => {
            fireEvent.keyDown(window, { code: 'Escape' });
        });
        expect(document.body.querySelector('[aria-label="Cronômetro em Modo Zen"]')).toBeNull();
        expect(document.body.style.overflow).toBe('');
    });

    it('6. global keyboard shortcuts ignore input when another [role="dialog"] is open and document.title restores on unmount', () => {
        document.title = 'Original App Title';
        const activeSubject = seedStoreForPomodoro();

        const { unmount } = render(
            <div>
                <div role="dialog" aria-modal="true">Mock Global Modal</div>
                <PomodoroTimer
                    settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                    activeSubject={activeSubject}
                />
            </div>
        );

        // Space must NOT start timer while another modal dialog is open
        act(() => {
            fireEvent.keyDown(window, { code: 'Space' });
        });
        expect(screen.getByRole('button', { name: 'Iniciar (Espaço)' })).toBeTruthy();

        // Unmounting must restore original document.title
        unmount();
        expect(document.title).toBe('Original App Title');
    });

    it('7. custom settings popover applies custom durations and auto-advance automatically starts break after natural work end', () => {
        vi.useFakeTimers();
        const activeSubject = seedStoreForPomodoro({
            pomodoro: { targetCycles: 2 },
            settings: { pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15, longBreakAfter: 4 }
        });

        render(
            <PomodoroTimer
                settings={useAppStore.getState().appState.contests['contest-audit'].settings}
                activeSubject={activeSubject}
                onUpdateStudyTime={vi.fn()}
            />
        );

        // Open custom settings popover
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Configurações do cronômetro' }));
        });

        // Enable Auto-advance
        const autoSwitch = screen.getByRole('switch');
        act(() => {
            fireEvent.click(autoSwitch);
        });
        expect(localStorage.getItem('pomodoro_auto_advance')).toBe('true');

        // Apply custom work = 1 min, break = 2 min
        const workInput = screen.getByLabelText(/Foco \(min\)/i);
        const breakInput = screen.getByLabelText(/Pausa \(min\)/i);
        act(() => {
            fireEvent.change(workInput, { target: { value: '1' } });
            fireEvent.change(breakInput, { target: { value: '2' } });
            fireEvent.click(screen.getByRole('button', { name: /Aplicar Tempos/i }));
        });

        const updatedSettings = useAppStore.getState().appState.contests['contest-audit'].settings;
        expect(updatedSettings.pomodoroWork).toBe(1);
        expect(updatedSettings.pomodoroBreak).toBe(2);

        // Start 1-minute work block and finish naturally
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: 'Iniciar (Espaço)' }));
        });
        act(() => {
            vi.advanceTimersByTime(60 * 1000 + 500);
        });
        // Flush 50ms phase transition + 800ms auto-advance delay
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(useAppStore.getState().appState.pomodoro.mode).toBe('break');
        expect(useAppStore.getState().appState.pomodoro.isRunning).toBe(true);
    });

    it('8. -1m time adjustment reduces block safely and disables at <= 60s', () => {
        const activeSubject = seedStoreForPomodoro();

        render(
            <PomodoroTimer
                settings={{ pomodoroWork: 2, pomodoroBreak: 5, pomodoroLongBreak: 15, soundEnabled: false }}
                activeSubject={activeSubject}
            />
        );

        const minusBtn = screen.getByRole('button', { name: 'Remover 1 minuto' });
        expect(minusBtn.disabled).toBe(false);

        act(() => {
            fireEvent.click(minusBtn);
        });
        expect(screen.getByRole('timer').textContent).toBe('01:00');
        expect(minusBtn.disabled).toBe(true);
    });

    it('9. completePomodoroPhase accepts naturalMinutes while staying backward-compatible with 1-arg calls', () => {
        const state = {
            appState: {
                activeId: 'c1',
                contests: { c1: { settings: { pomodoroWork: 25, pomodoroBreak: 5, longBreakAfter: 4 } } },
                pomodoro: { mode: 'work', sessions: 1, targetCycles: 2, completedCycles: 0, accumulatedMinutes: 0 }
            }
        };
        const set = (fn) => fn(state);
        const slice = createPomodoroSlice(set, () => state);

        // Cycle 1 with +5m extra (30 min)
        slice.completePomodoroPhase(false, 0, 30);
        expect(state.appState.pomodoro.accumulatedMinutes).toBe(30);
        expect(state.appState.pomodoro.mode).toBe('break');

        // Finish break
        slice.completePomodoroPhase(false);
        expect(state.appState.pomodoro.mode).toBe('work');

        // Cycle 2 with default 1-arg signature (25 min)
        slice.completePomodoroPhase(false);
        expect(state.appState.pomodoro.lastCompletedSeriesMinutes).toBe(55);
    });

    it('10. FocusPanel shows accurate break forecast, ignores invalid simulados, reflects extra block minutes & real accumulatedMinutes', () => {
        const activeSubject = {
            categoryId: 'cat-1',
            category: 'Constitucional',
            taskId: 't-1',
            task: 'Controle',
        };
        const categories = [
            {
                id: 'cat-1',
                name: 'Constitucional',
                maxScore: 100,
                minScore: 0,
                tasks: [{ id: 't-1', title: 'Controle', completed: false }],
            },
        ];
        const simulados = [
            { id: 's-bad', date: '2026-05-10', valid: false, categoryScores: { 'cat-1': 10 } },
            { id: 's-late', date: '2026-05-09', valid: true, categoryScores: { 'cat-1': 80 } },
            { id: 's-early', date: '2026-05-01', valid: true, categoryScores: { 'cat-1': 60 } },
        ];

        const { container } = render(
            <SessionFocusPanel
                activeSubject={activeSubject}
                categories={categories}
                studyLogs={[]}
                simulados={simulados}
                user={{ name: 'Tester', xp: 500 }}
                mode="break"
                isRunning={true}
                timeLeft={300}
                totalTime={300}
                targetCycles={2}
                completedCycles={1}
                accumulatedMinutes={30}
                settings={{ pomodoroWork: 25, pomodoroBreak: 5, pomodoroLongBreak: 15 }}
                speed={1}
            />
        );

        // During break before cycle 2 of 2, must NOT say "Ciclo final em andamento"
        expect(container.textContent).not.toContain('Ciclo final em andamento');
        expect(container.textContent).toContain('Restam 1 bloco(s) de foco');
        // Valid simulados only (2, not 3), chronological trend: 80 - 60 = +20.0
        expect(container.textContent).toContain('+20.0');
        expect(container.textContent).toContain('70%');

        // Expand "Mais detalhes" -> accumulatedMinutes (30min) instead of 1 * 25 = 25min
        act(() => {
            fireEvent.click(screen.getByRole('button', { name: /Mais detalhes/i }));
        });
        expect(container.textContent).toContain('30min');
    });

    it('11. Pomodoro page allows searching any syllabus topic in Próximas Ações and shows accurate pending count for low-priority tasks', () => {
        seedStoreForPomodoro({
            activeSubject: null,
            categories: [
                {
                    id: 'cat-const',
                    name: 'Direito Constitucional',
                    color: '#6366f1',
                    tasks: [
                        { id: 'task-low-1', title: 'Organização do Estado', priority: 'low', completed: false },
                        { id: 'task-low-3', title: 'Poder Judiciário', priority: 'low', completed: false },
                    ],
                },
                {
                    id: 'cat-penal',
                    name: 'Direito Penal',
                    color: '#ef4444',
                    tasks: [{ id: 'task-low-2', title: 'Dosimetria da Pena', priority: 'low', completed: false }],
                },
            ],
        });

        render(
            <MemoryRouter initialEntries={['/pomodoro']}>
                <PomodoroPage />
            </MemoryRouter>
        );

        // Low-priority pending tasks must show a non-zero pending badge (previously 0)
        expect(screen.getByText(/2 pendentes/i)).toBeTruthy();

        const searchInput = screen.getByLabelText('Buscar assunto para iniciar no cronômetro');
        act(() => {
            fireEvent.change(searchInput, { target: { value: 'Dosimetria' } });
        });

        expect(screen.getByText('Dosimetria da Pena')).toBeTruthy();
        expect(screen.queryByText('Poder Judiciário')).toBeNull();
    });
});
