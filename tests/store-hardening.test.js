import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global window and localStorage before any other imports
global.window = {};
const localStore = {};
global.localStorage = {
    getItem: vi.fn((key) => localStore[key] || null),
    setItem: vi.fn((key, value) => { localStore[key] = String(value); }),
    removeItem: vi.fn((key) => { delete localStore[key]; }),
    clear: vi.fn(() => { Object.keys(localStore).forEach(k => delete localStore[k]); })
};

// Mock idb-keyval to avoid ReferenceError: indexedDB is not defined in pure Node.js test environment
let mockIdbStore = {};
vi.mock('idb-keyval', () => {
    return {
        get: vi.fn(async (key) => mockIdbStore[key] || null),
        set: vi.fn(async (key, value) => { mockIdbStore[key] = value; }),
        del: vi.fn(async (key) => { delete mockIdbStore[key]; })
    };
});

// Now we can safely import the store and other modules
import { useAppStore } from '../src/store/useAppStore.js';
import { INITIAL_DATA } from '../src/data/initialData';
import { safeClone } from '../src/store/safeClone.js';

describe('Global Store Security and Hardening', () => {

    beforeEach(() => {
        // Clean store states and mocks before each test
        mockIdbStore = {};
        Object.keys(localStore).forEach(k => delete localStore[k]);
        vi.clearAllMocks();
        useAppStore.getState().resetStore();
    });

    describe('Ghost Pomodoro Leak Prevention', () => {
        it('should completely reset the Pomodoro state and clear localStorage state when the last contest is deleted', () => {
            // 1. Setup a state with a single contest and an active Pomodoro
            useAppStore.setState((state) => {
                state.appState.contests = {
                    'default': {
                        ...safeClone(INITIAL_DATA),
                        contestName: "Only Contest",
                    }
                };
                state.appState.activeId = 'default';
                state.appState.pomodoro = {
                    activeSubject: 'Matemática',
                    sessions: 2,
                    targetCycles: 4,
                    completedCycles: 1,
                    accumulatedMinutes: 25,
                    mode: 'work',
                    neuralQueue: [],
                    neuralMode: false
                };
            });

            // Set item to mock localStorage state
            localStorage.setItem('pomodoroState', 'active-state');

            // 2. Trigger deletion of the last remaining contest
            useAppStore.getState().deleteContest('default');

            // 3. Verify that a new default contest is created, activeId is reset, and Pomodoro is cleared
            const updatedState = useAppStore.getState().appState;
            
            expect(Object.keys(updatedState.contests)).toContain('default');
            expect(updatedState.activeId).toBe('default');
            
            // Pomodoro must be reset
            expect(updatedState.pomodoro.activeSubject).toBeNull();
            expect(updatedState.pomodoro.accumulatedMinutes).toBe(0);
            expect(localStorage.getItem('pomodoroState')).toBeNull();
        });

        it('should also reset the Pomodoro when the active contest is deleted and other contests remain', () => {
            // 1. Setup state with multiple contests, activeId pointing to 'contest-a', and active Pomodoro
            useAppStore.setState((state) => {
                state.appState.contests = {
                    'contest-a': {
                        ...safeClone(INITIAL_DATA),
                        contestName: "Contest A",
                    },
                    'contest-b': {
                        ...safeClone(INITIAL_DATA),
                        contestName: "Contest B",
                    }
                };
                state.appState.activeId = 'contest-a';
                state.appState.pomodoro = {
                    activeSubject: 'Matemática',
                    sessions: 2,
                    targetCycles: 4,
                    completedCycles: 1,
                    accumulatedMinutes: 25,
                    mode: 'work',
                    neuralQueue: [],
                    neuralMode: false
                };
            });

            localStorage.setItem('pomodoroState', 'active-state');

            // 2. Delete the active contest
            useAppStore.getState().deleteContest('contest-a');

            // 3. Verify activeId switched to 'contest-b' and Pomodoro is reset
            const updatedState = useAppStore.getState().appState;
            expect(updatedState.activeId).toBe('contest-b');
            expect(updatedState.pomodoro.activeSubject).toBeNull();
            expect(localStorage.getItem('pomodoroState')).toBeNull();
        });
    });

    describe('IndexedDB vs Truncated LocalStorage Protection', () => {
        it('should ignore LocalStorage fallbacks flagged with _isTruncatedFallback if IndexedDB contains value', async () => {
            const persistOptions = useAppStore.persist.getOptions();
            const idbStorage = persistOptions.storage;
            const storageKey = 'ultra-dashboard-storage';

            // 1. Setup a valid complete state in IndexedDB (mimicking idbValue)
            const idbState = {
                state: {
                    appState: {
                        version: 2,
                        lastUpdated: new Date().toISOString(),
                        contests: {
                            'default': {
                                ...safeClone(INITIAL_DATA),
                                monteCarloHistory: [1, 2, 3], // mass arrays preserved in IDB
                                simuladoRows: [{ id: 1, score: 90 }]
                            }
                        }
                    }
                }
            };
            const idbSerialized = JSON.stringify(idbState);
            mockIdbStore[storageKey] = idbSerialized;

            // 2. Setup a truncated/slim fallback state in LocalStorage (with _isTruncatedFallback flag)
            const localState = {
                state: {
                    appState: {
                        version: 3, // higher version
                        lastUpdated: new Date(Date.now() + 60000).toISOString(),
                        _isTruncatedFallback: true,
                        contests: {
                            'default': {
                                ...safeClone(INITIAL_DATA),
                                monteCarloHistory: [], // stripped out
                                simuladoRows: []
                            }
                        }
                    }
                }
            };
            const localSerialized = JSON.stringify(localState);
            localStorage.setItem(storageKey, localSerialized);

            // Call idbStorage.getItem
            const retrievedValue = await idbStorage.getItem(storageKey);

            // The return value should be the parsed idbState object, completely ignoring localState
            expect(retrievedValue).toEqual(idbState);
            
            // Let's verify that a non-truncated LocalStorage with higher version still succeeds
            const nonTruncatedLocalState = {
                state: {
                    appState: {
                        version: 3,
                        lastUpdated: new Date(Date.now() + 60000).toISOString(),
                        contests: {
                            'default': {
                                ...safeClone(INITIAL_DATA),
                            }
                        }
                    }
                }
            };
            const nonTruncatedLocalSerialized = JSON.stringify(nonTruncatedLocalState);
            localStorage.setItem(storageKey, nonTruncatedLocalSerialized);

            const retrievedNonTruncated = await idbStorage.getItem(storageKey);
            expect(retrievedNonTruncated).toEqual(nonTruncatedLocalState);
        });
    });
});
