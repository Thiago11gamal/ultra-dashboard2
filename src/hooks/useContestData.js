import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { INITIAL_DATA } from '../data/initialData';

export function useContestData(currentUser) {
    const [appState, setAppState] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState("Iniciando...");
    const [loadingData, setLoadingData] = useState(true);

    // Cloud Data Fetching (Real-time & Cache-First)
    useEffect(() => {
        if (!currentUser) {
            setAppState(null);
            setLoadingData(false);
            return;
        }

        setLoadingData(true);
        setLoadingStatus("Sincronizando...");

        const docRef = doc(db, 'users_data', currentUser.uid);
        const startTime = Date.now();

        const unsubscribe = onSnapshot(docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (!data.contests) {
                        setAppState({ contests: { 'default': data }, activeId: 'default' });
                    } else {
                        setAppState(data);
                    }
                } else {
                    const initial = { contests: { 'default': INITIAL_DATA }, activeId: 'default' };
                    setDoc(docRef, initial).catch(console.error);
                    setAppState(initial);
                }

                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 800 - elapsed);

                setTimeout(() => {
                    setLoadingData(false);
                }, remaining);
            },
            (error) => {
                console.error("Error:", error);
                setLoadingStatus("Erro na conexão.");
                setLoadingData(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const setData = useCallback((updater, recordHistory = true) => {
        setAppState(prev => {
            const safePrev = prev && prev.contests ? prev : { contests: { 'default': INITIAL_DATA }, activeId: 'default' };
            const currentContestId = safePrev.activeId || 'default';
            const currentData = safePrev.contests[currentContestId] || INITIAL_DATA;
            const newData = typeof updater === 'function' ? updater(currentData) : updater;

            if (newData === currentData) return safePrev;

            let newHistory = safePrev.history || [];
            if (recordHistory) {
                newHistory = [...newHistory, {
                    contestId: currentContestId,
                    data: JSON.parse(JSON.stringify(currentData))
                }];
                if (newHistory.length > 30) newHistory.shift();
            }

            return {
                ...safePrev,
                history: newHistory,
                contests: {
                    ...safePrev.contests,
                    [currentContestId]: newData
                }
            };
        });
    }, []);

    // Daily Reset Logic
    useEffect(() => {
        const checkAndResetDay = () => {
            const now = new Date();
            const today = now.toDateString();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

            setData(prev => {
                let currentRows = (prev.simuladoRows || []).filter(row => {
                    if (!row.createdAt) return false;
                    const rowDate = new Date(row.createdAt).toDateString();
                    return rowDate === today || rowDate === yesterday;
                });

                const seen = new Set();
                currentRows = currentRows.filter(row => {
                    const key = JSON.stringify({
                        s: row.subject?.trim(),
                        t: row.topic?.trim(),
                        c: row.correct,
                        tot: row.total,
                        d: new Date(row.createdAt).toDateString()
                    });
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                const hasToday = currentRows.some(r => new Date(r.createdAt).toDateString() === today);
                const hasYesterday = currentRows.some(r => new Date(r.createdAt).toDateString() === yesterday);

                if (!hasToday && hasYesterday) {
                    const yesterdayRows = currentRows.filter(r => new Date(r.createdAt).toDateString() === yesterday);
                    const newTodayRows = yesterdayRows.map(r => ({
                        subject: r.subject,
                        topic: r.topic,
                        correct: 0,
                        total: 0,
                        createdAt: Date.now()
                    }));
                    currentRows = [...currentRows, ...newTodayRows];
                }

                return {
                    ...prev,
                    simuladoRows: currentRows,
                    categories: prev.categories.map(cat => ({
                        ...cat,
                        tasks: (cat.tasks || []).map(t =>
                            t.status === 'studying' ? { ...t, status: 'paused' } : t
                        )
                    }))
                };
            }, false);
        };

        if (currentUser) {
            checkAndResetDay();
            const onFocus = () => setTimeout(checkAndResetDay, 1000);
            window.addEventListener('focus', onFocus);
            document.addEventListener('visibilitychange', onFocus);
            return () => {
                window.removeEventListener('focus', onFocus);
                document.removeEventListener('visibilitychange', onFocus);
            };
        }
    }, [setData, currentUser]);

    const safeAppState = appState && appState.contests ? appState : { contests: { 'default': INITIAL_DATA }, activeId: 'default' };
    let data = safeAppState.contests[safeAppState.activeId] || Object.values(safeAppState.contests)[0] || INITIAL_DATA;

    if (!data.user || !data.categories) {
        data = INITIAL_DATA;
    }
    if (!data.simulados) data.simulados = INITIAL_DATA.simulados || [];
    if (!data.settings) {
        data.settings = INITIAL_DATA.settings || {
            pomodoroWork: 25,
            pomodoroBreak: 5,
            soundEnabled: true,
            darkMode: true
        };
    }

    return {
        appState,
        setAppState,
        data,
        setData,
        loadingData,
        loadingStatus
    };
}
