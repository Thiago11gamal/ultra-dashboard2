import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { getSafeScore } from '../measurement.js';
import { parseImportedData } from '../backupManager.js';
import { mergeAppStatePure } from '../../hooks/useCloudSync.js';
import { getDateKey, normalizeDate, toDateMs as dateHelperToDateMs, getWeekKey } from '../dateHelper.js';
import { toDateMs as retentionToDateMs } from '../retentionCore.js';
import { buildAchievementStats } from '../analytics.js';
import { quarantineRaw } from '../storageSafe.js';
import { useAppStore } from '../../store/useAppStore.js';
import { _urgencyCache, _topicsCache, cacheSet } from '../coachCaches.js';
import { clearMcCache } from '../coachAdaptive.js';
import { secureLogout } from '../../services/firebase.js';
import { useSubscription } from '../../hooks/useSubscription.js';
import WelcomeScreen from '../../components/WelcomeScreen.jsx';
import SimuladoAnalysis from '../../components/SimuladoAnalysis.jsx';
import Notes from '../../pages/Notes.jsx';

describe('Auditoria de Integridade de Dados & Vazamentos — Regressão', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    _urgencyCache.clear();
    _topicsCache.clear();
    clearMcCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. getSafeScore respeita escalas não-100 para linhas manuais novas e legadas em %', () => {
    const newRow = {
      source: 'manual',
      correct: 8,
      total: 10,
      score: 80,
      scorePct: 80,
      isPercentage: true,
      scoreUnit: 'pct'
    };
    expect(getSafeScore(newRow, 1000, 200)).toBe(840);
    expect(getSafeScore(newRow, 10, 0)).toBe(8);

    const legacyRow = {
      source: 'manual',
      correct: 8,
      total: 10,
      score: 80
    };
    expect(getSafeScore(legacyRow, 1000, 200)).toBe(840);
    expect(getSafeScore(legacyRow, 10, 0)).toBe(8);
  });

  it('2. SimuladoAnalysis emite scorePct, isPercentage=true e scoreUnit=pct ao editar', () => {
    const onRowsChange = vi.fn();
    render(
      <SimuladoAnalysis
        categories={[{ id: 'c1', name: 'Penal', tasks: [{ id: 't1', title: 'Dolo' }] }]}
        rows={[{ id: 'r1', subject: 'Penal', topic: 'Dolo', correct: 0, total: 10, difficulty: 1.0 }]}
        onRowsChange={onRowsChange}
        viewMode="form"
      />
    );

    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '8' } });

    expect(onRowsChange).toHaveBeenCalled();
    const lastRows = onRowsChange.mock.calls.at(-1)[0];
    expect(lastRows[0].score).toBe(80);
    expect(lastRows[0].scorePct).toBe(80);
    expect(lastRows[0].isPercentage).toBe(true);
    expect(lastRows[0].scoreUnit).toBe('pct');
  });

  it('3. Notes não duplica acertos/totais quando history e simuladoRows compartilham o mesmo dia', () => {
    useAppStore.getState().setAppState({
      activeId: 'c1',
      version: 1,
      contests: {
        c1: {
          contestName: 'Teste Notas',
          maxScore: 100,
          minScore: 0,
          categories: [
            {
              id: 'cat-penal',
              name: 'Direito Penal',
              maxScore: 100,
              minScore: 0,
              tasks: [{ id: 't1', title: 'Teoria do Crime' }],
              simuladoStats: {
                history: [
                  {
                    date: '2026-05-10',
                    correct: 8,
                    total: 10,
                    score: 80,
                    topics: [{ name: 'Teoria do Crime', correct: 8, total: 10 }]
                  }
                ]
              }
            }
          ],
          simuladoRows: [
            {
              id: 'row-1',
              date: '2026-05-10',
              categoryId: 'cat-penal',
              subject: 'Direito Penal',
              topic: 'Teoria do Crime',
              correct: 8,
              total: 10,
              validated: true
            }
          ]
        }
      }
    });

    render(<Notes />);
    expect(screen.getByText('8/10 Acertos')).toBeTruthy();
    expect(screen.queryByText('16/20 Acertos')).toBeNull();
  });

  it('4. backupManager preserva minCutoff=null quando ausente e awardedXP numérico', () => {
    const rawJson = JSON.stringify({
      activeId: 'default',
      contests: {
        default: {
          contestName: 'ENEM',
          maxScore: 1000,
          minScore: 200,
          categories: [
            {
              id: 'cat-1',
              name: 'Linguagens',
              maxScore: 1000,
              awardedXP: 150,
              tasks: [{ id: 't1', text: 'Interpretação', completed: true, awardedXP: 50 }]
            }
          ]
        }
      }
    });

    const parsed = parseImportedData(rawJson, null);
    const cat = parsed.data.contests.default.categories[0];
    expect(cat.minCutoff).toBeNull();
    expect(cat.awardedXP).toBe(150);
    expect(cat.tasks[0].awardedXP).toBe(50);
  });

  it('5. useCloudSync preserva categoria exclusiva da nuvem sem lastUpdated e recalcula stats após merge', () => {
    const local = {
      activeId: 'c1',
      version: 10,
      lastUpdated: '2026-10-01T12:00:00.000Z',
      contests: {
        c1: {
          contestName: 'Concurso A',
          lastUpdated: '2026-10-01T12:00:00.000Z',
          categories: [
            {
              id: 'cat-local',
              name: 'Português',
              weight: 10,
              maxScore: 100,
              minScore: 0,
              tasks: [],
              simuladoStats: {
                history: [{ date: '2026-09-20', score: 60, correct: 6, total: 10 }],
                average: 60,
                lastAttempt: 60,
                trend: 'stable',
                level: 'MÉDIO'
              }
            }
          ]
        }
      },
      trash: []
    };

    const cloud = {
      activeId: 'c1',
      version: 9,
      lastUpdated: '2026-09-28T12:00:00.000Z',
      contests: {
        c1: {
          contestName: 'Concurso A',
          lastUpdated: '2026-09-28T12:00:00.000Z',
          categories: [
            {
              id: 'cat-local',
              name: 'Português',
              weight: 10,
              maxScore: 100,
              minScore: 0,
              tasks: [],
              simuladoStats: {
                history: [{ date: '2026-09-25', score: 90, correct: 9, total: 10 }],
                average: 90,
                lastAttempt: 90,
                trend: 'up',
                level: 'ALTO'
              }
            },
            {
              id: 'cat-cloud-only',
              name: 'Direito Eleitoral',
              tasks: []
            }
          ]
        }
      },
      trash: []
    };

    const merged = mergeAppStatePure(local, cloud, { nonDestructive: false });
    const cats = merged.contests.c1.categories;
    expect(cats.some(c => c.id === 'cat-cloud-only')).toBe(true);
    const pt = cats.find(c => c.id === 'cat-local');
    expect(pt.simuladoStats.history).toHaveLength(2);
    expect(pt.simuladoStats.lastAttempt).toBe(90);
    expect(pt.simuladoStats.average).toBeGreaterThan(60);
    expect(pt.simuladoStats.average).toBeLessThan(90);
  });

  it('6. dateHelper e retentionCore alinham XX-YY-ZZ, epoch em segundos e getWeekKey em UTC-4', () => {
    expect(getDateKey('15-03-26')).toBe('2026-03-15');
    expect(normalizeDate('15-03-26')?.toISOString()).toBe('2026-03-15T16:00:00.000Z');
    expect(dateHelperToDateMs(1700000000)).toBe(1700000000 * 1000);
    expect(retentionToDateMs(1700000000)).toBe(1700000000 * 1000);
    expect(getWeekKey('2026-05-08')).toBe('2026-05-04');
  });

  it('7. analytics aggregateQuestionAccuracy aceita aliases legados e soma histórico de categorias em datas distintas', () => {
    const stats = buildAchievementStats({
      simuladoRows: [
        { date: '2026-05-01', categoryId: 'c1', subject: 'Dir', questoes: 10, acertos: 8, validated: true }
      ],
      categories: [
        {
          id: 'c1',
          name: 'Dir',
          simuladoStats: {
            history: [
              { date: '2026-05-01', total: 10, correct: 8 },
              { date: '2026-05-02', total: 20, correct: 16 }
            ]
          }
        }
      ],
      studyLogs: [],
      studySessions: []
    });

    expect(stats.totalQuestions).toBe(30);
    expect(Math.round(stats.accuracy)).toBe(80);
  });

  it('8. store slices: lookup por nome em categorySlice, teto 720m em studySlice, cache invalidation e version bump em setAppState', () => {
    const store = useAppStore.getState();
    store.setAppState({
      activeId: 'c1',
      version: 1,
      contests: {
        c1: {
          contestName: 'Teste',
          categories: [
            { id: 'cat-1', name: 'Matemática', tasks: [{ id: 't1', title: 'Álgebra' }], simuladoStats: { history: [] } },
            { id: 'cat-2', name: 'Português', tasks: [], simuladoStats: { history: [] } }
          ],
          simuladoRows: [{ id: 'r1', categoryId: 'cat-1', subject: 'Matemática', topic: 'Álgebra', total: 10, correct: 7, date: '2026-05-01' }],
          coachPlan: [{ id: 'p1', categoryId: 'cat-1', title: 'Estudar' }],
          studyLogs: [],
          studySessions: []
        }
      }
    });

    store.updateCategoryFields('Matemática', { name: 'RLM' });
    let activeContest = useAppStore.getState().appState.contests.c1;
    expect(activeContest.simuladoRows[0].subject).toBe('RLM');

    store.handleUpdateStudyTime('cat-1', 1000, 't1');
    activeContest = useAppStore.getState().appState.contests.c1;
    expect(activeContest.studyLogs[0].minutes).toBe(720);

    store.deleteCategory('RLM');
    activeContest = useAppStore.getState().appState.contests.c1;
    expect(activeContest.simuladoRows).toHaveLength(0);
    expect(activeContest.coachPlan).toHaveLength(0);

    cacheSet(_urgencyCache, 10, 'stale-key', { score: 99 });
    expect(_urgencyCache.size).toBe(1);

    const prevVer = useAppStore.getState().appState.version;
    useAppStore.getState().setAppState({
      activeId: 'c1',
      contests: { c1: { contestName: 'Restaurado', categories: [] } }
    });
    expect(useAppStore.getState().appState.version).toBe(prevVer + 1);
    expect(_urgencyCache.size).toBe(0);
  });

  it('9. storageSafe.quarantineRaw limita quantidade de entradas e secureLogout remove chaves extras', async () => {
    for (let i = 0; i < 15; i++) {
      quarantineRaw(`key-${i}`, `raw-${i}`);
    }
    const quarantineKeys = Object.keys(localStorage).filter(k => k.startsWith('quarantine:'));
    expect(quarantineKeys.length).toBeLessThanOrEqual(10);

    localStorage.setItem('pomodoro-endsAt', '123456');
    localStorage.setItem('tasks_active_panel', 'rankings');
    localStorage.setItem('dismissed_feature_banner_v1', 'true');
    localStorage.setItem('pomodoro_transition_lock_t1', '999');
    localStorage.setItem('lastRoute_u1', '/coach');

    await secureLogout();

    expect(localStorage.getItem('pomodoro-endsAt')).toBeNull();
    expect(localStorage.getItem('tasks_active_panel')).toBeNull();
    expect(localStorage.getItem('dismissed_feature_banner_v1')).toBeNull();
    expect(localStorage.getItem('pomodoro_transition_lock_t1')).toBeNull();
    expect(localStorage.getItem('lastRoute_u1')).toBeNull();
    expect(Object.keys(localStorage).filter(k => k.startsWith('quarantine:'))).toHaveLength(0);
  });

  it('10. WelcomeScreen e useSubscription limpam timers pendentes ao desmontar', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { unmount } = render(<WelcomeScreen onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    function SubscriptionHarness({ user }) {
      const { loading } = useSubscription(user);
      return <span>{String(loading)}</span>;
    }
    const subView = render(<SubscriptionHarness user={{ uid: 'u-no-token', email: 'test@example.com' }} />);
    subView.unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('11. safelyMergeDuplicates deduplica tarefas normalizadas e recalcula simuladoStats', () => {
    const store = useAppStore.getState();
    store.setAppState({
      activeId: 'c1',
      version: 1,
      contests: {
        c1: {
          contestName: 'Merge Test',
          categories: [
            {
              id: 'cat-a',
              name: 'Direito Penal',
              maxScore: 100,
              minScore: 0,
              tasks: [{ id: 't1', title: 'Aplicação da Lei Penal' }],
              simuladoStats: {
                history: [{ date: '2026-05-01', score: 60, correct: 6, total: 10 }],
                average: 60,
                lastAttempt: 60
              }
            },
            {
              id: 'cat-b',
              name: 'direito penal',
              maxScore: 100,
              minScore: 0,
              tasks: [{ id: 't2', title: 'aplicacao da lei penal' }],
              simuladoStats: {
                history: [{ date: '2026-05-10', score: 90, correct: 9, total: 10 }],
                average: 90,
                lastAttempt: 90
              }
            }
          ]
        }
      }
    });

    store.safelyMergeDuplicates();
    const mergedCats = useAppStore.getState().appState.contests.c1.categories;
    expect(mergedCats).toHaveLength(1);
    expect(mergedCats[0].tasks).toHaveLength(1);
    expect(mergedCats[0].simuladoStats.history).toHaveLength(2);
    expect(mergedCats[0].simuladoStats.lastAttempt).toBe(90);
    expect(mergedCats[0].simuladoStats.average).toBeGreaterThan(60);
    expect(mergedCats[0].simuladoStats.average).toBeLessThan(90);
  });
});
