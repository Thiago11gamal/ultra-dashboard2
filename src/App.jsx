import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, CalendarDays, Calendar, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import NextGoalCard from './components/NextGoalCard';


import Checklist from './components/Checklist';
import Charts from './components/Charts';
import PomodoroTimer from './components/PomodoroTimer';
import TopicPerformance from './components/TopicPerformance';

import PersonalRanking from './components/PersonalRanking';
import PerformanceTable from './components/PerformanceTable';
import VolumeRanking from './components/VolumeRanking';
import SimuladoAnalysis from './components/SimuladoAnalysis';
import WeeklyAnalysis from './components/WeeklyAnalysis';
import VerifiedStats from './components/VerifiedStats';
import ParetoAnalysis from './components/ParetoAnalysis';

import ActivityHeatmap from './components/ActivityHeatmap';
import ConsistencyAlert from './components/ConsistencyAlert';
import StudyHistory from './components/StudyHistory';
import RetentionPanel from './components/RetentionPanel';
import HelpGuide from './components/HelpGuide';
import ParticleBackground from './components/ParticleBackground';

import LevelUpToast from './components/LevelUpToast';
import { calculateLevel, getLevelTitle } from './utils/gamification';
import { checkRandomBonus, checkAndUnlockAchievements } from './utils/gamificationLogic';
import { StreakDisplay, AchievementsGrid, XPHistory } from './components/GamificationComponents';
import AICoachWidget from './components/AICoachWidget';
import AICoachView from './components/AICoachView';
import { getSuggestedFocus, generateDailyGoals } from './utils/coachLogic';
import Toast from './components/Toast';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import { db } from './services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { exportData, INITIAL_DATA } from './data/initialData';
import useMobileDetect from './hooks/useMobileDetect';
import MobilePocketMode from './components/MobilePocketMode';




function App() {
  const { currentUser } = useAuth();
  const [appState, setAppState] = useState(null); // Cloud-First: Start null, load from DB
  const [loadingStatus, setLoadingStatus] = useState("Iniciando...");
  const [loadingData, setLoadingData] = useState(true);

  // Cloud Data Fetching
  // Cloud Data Fetching (Real-time & Cache-First)
  useEffect(() => {
    if (!currentUser) {
      setAppState(null);
      return;
    }

    setLoadingData(true);
    setLoadingStatus("Sincronizando...");

    const docRef = doc(db, 'users_data', currentUser.uid);

    // RE-IMPLEMENTATION TO CORRECTLY HANDLE LISTENER + DELAY
    // We want the listener to Stay Active, but only clear loadingData after ALL (data + delay) are done.

    const startTime = Date.now();

    // Listener
    const unsubscribe = onSnapshot(docRef,
      (docSnap) => {
        // Process Data
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

        // Handle Loading State with Delay
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 2000 - elapsed);

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

  // ... (existing code) ...


  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState(null); // To return after Pomodoro
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile Support
  const isMobile = useMobileDetect();
  const [forceDesktopMode, setForceDesktopMode] = useState(false);

  const [activeSubject, setActiveSubject] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Safety check: ensure appState has the expected structure
  const safeAppState = appState && appState.contests ? appState : { contests: { 'default': INITIAL_DATA }, activeId: 'default' };

  // Derived state for the current contest
  let data = safeAppState.contests[safeAppState.activeId] || Object.values(safeAppState.contests)[0] || INITIAL_DATA;

  // Ensure data has required structure
  if (!data.user || !data.categories) {
    console.warn('Data seems corrupted, falling back to initial data');
    data = INITIAL_DATA;
  }
  // Data Patching: Ensure simulados exists (for old saves)
  if (!data.simulados) {
    data.simulados = INITIAL_DATA.simulados || [];
  }
  // Data Patching: Ensure settings exists (for old saves)
  if (!data.settings) {
    data.settings = INITIAL_DATA.settings || {
      pomodoroWork: 25,
      pomodoroBreak: 5,
      soundEnabled: true,
      darkMode: true
    };
  }

  // Wrapper to update only the current contest data
  const setData = useCallback((updater, recordHistory = true) => {
    setAppState(prev => {
      // Ensure we have valid prev state
      const safePrev = prev && prev.contests ? prev : { contests: { 'default': INITIAL_DATA }, activeId: 'default' };

      const currentContestId = safePrev.activeId || 'default';
      const currentData = safePrev.contests[currentContestId] || INITIAL_DATA;

      // Calculate new data
      const newData = typeof updater === 'function' ? updater(currentData) : updater;

      // Optimization: Skip if no changes detected
      if (newData === currentData) return safePrev;

      // Supreme Undo History Management
      let newHistory = safePrev.history || [];
      if (recordHistory) {
        // Snapshot includes which contest it belongs to
        newHistory = [...newHistory, {
          contestId: currentContestId,
          data: JSON.parse(JSON.stringify(currentData))
        }];
        // Limit to 30 actions to prevent memory leaks
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
  }, [setAppState]);

  // Change 'studying' to 'paused' on app initialization
  // Change 'studying' to 'paused' on app initialization AND check for day change on focus
  useEffect(() => {
    const checkAndResetDay = () => {
      const now = new Date();
      const today = now.toDateString();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

      setData(prev => {
        // 1. Clean old rows (keep only today + yesterday)
        let currentRows = (prev.simuladoRows || []).filter(row => {
          if (!row.createdAt) return false;
          const rowDate = new Date(row.createdAt).toDateString();
          return rowDate === today || rowDate === yesterday;
        });

        // 1.5 Deduplicate
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

        // 2. Check for "New Day" condition
        const hasToday = currentRows.some(r => new Date(r.createdAt).toDateString() === today);
        const hasYesterday = currentRows.some(r => new Date(r.createdAt).toDateString() === yesterday);

        if (!hasToday && hasYesterday) {
          // Auto-Clone Yesterday -> Today (Reset values)
          const yesterdayRows = currentRows.filter(r => new Date(r.createdAt).toDateString() === yesterday);
          const newTodayRows = yesterdayRows.map(r => ({
            subject: r.subject,
            topic: r.topic,
            correct: 0,
            total: 0,
            createdAt: Date.now() // Today
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
      }, false); // Pass 'false' to skip recording history for these auto-updates
    };

    // 1. Executa imediatamente ao carregar
    checkAndResetDay();

    // 2. Adiciona listeners para quando a janela "acorda"
    const onFocus = () => {
      // Pequeno delay para garantir que o sistema operativo atualizou a data
      setTimeout(checkAndResetDay, 1000);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [setData]);

  // --- GAMIFICATION LOGIC ---
  // Pure logic helper to apply XP and Level changes to a state object
  const applyGamification = useCallback((state, amount, skipBonus = false) => {
    let finalAmount = amount;
    let bonusTriggered = false;

    if (!skipBonus && amount > 0 && checkRandomBonus()) {
      finalAmount = amount * 2;
      bonusTriggered = true;
    }

    const currentXP = state.user.xp || 0;
    const newXP = Math.max(0, currentXP + finalAmount);
    const oldLevel = calculateLevel(currentXP);
    const newLevel = calculateLevel(newXP);

    if (newLevel < oldLevel) {
      const { title } = getLevelTitle(newLevel);
      setLevelUpData({ level: newLevel, title });
    } else if (newLevel > oldLevel) {
      showToast(`⚠️ Nível Reduzido`, 'info');
    }

    if (bonusTriggered) {
      setTimeout(() => showToast(`🎲 SORTE! XP Dobrado: +${finalAmount}!`, 'success'), 500);
    }

    return {
      ...state,
      user: {
        ...state.user,
        xp: newXP,
        level: newLevel
      }
    };
  }, [showToast]);

  // eslint-disable-next-line no-unused-vars
  const addXP = useCallback((amount, skipBonus = false) => {
    setData(prev => applyGamification(prev, amount, skipBonus));
  }, [setData, applyGamification]);

  // Check achievements whenever data changes
  useEffect(() => {
    const result = checkAndUnlockAchievements(data, data.user?.achievements || []);
    if (result.newlyUnlocked.length > 0) {
      // Update achievements and award XP
      setTimeout(() => {
        setData(prev => ({
          ...prev,
          user: {
            ...prev.user,
            achievements: result.allUnlocked,
            xp: (prev.user.xp || 0) + result.xpGained
          }
        }));
      }, 0);
      // Show toast for each unlocked achievement
      result.newlyUnlocked.forEach(() => {

        showToast(`🏆 Conquista Desbloqueada! +${result.xpGained} XP`, 'success');
      });
    }
  }, [data, data.categories, data.studyLogs, data.pomodorosCompleted, data.studiedEarly, data.studiedLate]);

  // Track Pomodoro completion for achievements
  const trackPomodoroComplete = useCallback(() => {
    const hour = new Date().getHours();
    setData(prev => ({
      ...prev,
      pomodorosCompleted: (prev.pomodorosCompleted || 0) + 1,
      studiedEarly: prev.studiedEarly || hour < 7,
      studiedLate: prev.studiedLate || hour >= 0 && hour < 5  // Midnight to 5am
    }));
  }, [setData]);
  // --------------------------

  // Jump to Pomodoro with specific subject
  const startStudying = useCallback((categoryId, taskId) => {

    // 1. Find names specifically for navigation/toast (Synchronous look up)
    const category = data.categories.find(c => c.id === categoryId);
    if (!category) {
      console.error('Category NOT found for ID:', categoryId);
      return;
    }
    const task = category.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('Task NOT found for ID:', taskId);
      return;
    }

    const categoryName = category.name;
    const taskName = task.title;

    // 2. Update Status to 'studying' (Exclusive: Reset others including paused)
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        tasks: cat.tasks.map(t => {
          // If it's the target task, set to studying
          if (cat.id === categoryId && t.id === taskId) {
            return { ...t, status: 'studying' };
          }
          // For ALL other tasks, if they were studying or paused, reset them
          return (t.status === 'studying' || t.status === 'paused') ? { ...t, status: undefined } : t;
        })
      }))
    }));

    // 3. Navigate
    setActiveSubject({
      categoryId,
      taskId,
      category: categoryName,
      task: taskName,
      priority: task.priority,
      sessionInstanceId: Date.now() // Force fresh session on every "Play" click
    });
    setActiveTab('pomodoro');
    showToast(`Iniciando estudos: ${categoryName} - ${taskName}`, 'success');
  }, [data, setData, showToast]);

  // Finish Studying (Called by Pomodoro when full cycle is complete)
  const finishStudying = useCallback(() => {
    if (!activeSubject) return;
    const { categoryId, taskId } = activeSubject;

    setData(prev => {
      // 1. Update data
      const updatedState = {
        ...prev,
        categories: prev.categories.map(cat => {
          if (cat.id !== categoryId) return cat;
          return {
            ...cat,
            tasks: cat.tasks.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, completed: true, status: 'completed' };
            })
          };
        })
      };

      // 2. Apply XP (300) and return combined state in a SINGLE snapshot
      showToast('Ciclo completo! +300 XP 🎉', 'success');
      return applyGamification(updatedState, 300);
    });

    setActiveSubject(null);
    setActiveTab('dashboard');
  }, [activeSubject, setData, showToast, applyGamification]);

  // Undo last action (Contest-Aware)
  const handleUndo = useCallback(() => {
    setAppState(prev => {
      if (!prev.history || prev.history.length === 0) {
        return prev;
      }

      const newHistory = [...prev.history];
      const snapshot = newHistory.pop();

      // Support both old snapshots (direct data) and new snapshots ({contestId, data})
      const targetId = snapshot.contestId || prev.activeId;
      const snapshotData = snapshot.data || snapshot;

      return {
        ...prev,
        activeId: targetId, // Switch back to where the action happened
        history: newHistory,
        contests: {
          ...prev.contests,
          [targetId]: snapshotData
        }
      };
    });
    showToast('Ação desfeita! ↩️', 'info');
  }, [showToast]);

  // Create new contest
  const createNewContest = useCallback(() => {
    const newId = `contest-${Date.now()}`;
    const newContestData = {
      ...INITIAL_DATA,
      user: { ...INITIAL_DATA.user, name: 'Novo Concurso' },
      simuladoRows: [],
      simulados: [],
      categories: []
    };

    setAppState(prev => ({
      ...prev,
      contests: {
        ...prev.contests,
        [newId]: newContestData
      },
      activeId: newId
    }));
    showToast('Novo painel de concurso criado!', 'success');
  }, []);

  // Switch contest
  const switchContest = useCallback((contestId) => {
    setAppState(prev => ({ ...prev, activeId: contestId }));
    showToast('Painel alterado!', 'success');
  }, []);

  // Delete Contest
  const deleteContest = useCallback((contestId) => {
    if (!window.confirm('Tem certeza que deseja excluir este painel? Essa ação não pode ser desfeita.')) return;

    setAppState(prev => {
      const newContests = { ...prev.contests };
      delete newContests[contestId];

      // Determine new active ID
      let newActiveId = prev.activeId;
      const remainingIds = Object.keys(newContests);

      if (remainingIds.length === 0) {
        // If no contests left, create a fresh default one
        const newId = 'default';
        newContests[newId] = INITIAL_DATA;
        newActiveId = newId;
      } else if (contestId === prev.activeId) {
        // If deleted current, switch to first available
        newActiveId = remainingIds[0];
      }

      return {
        ...prev,
        contests: newContests,
        activeId: newActiveId
      };
    });
    showToast('Painel excluído com sucesso.', 'info');
  }, [showToast]);

  // Update Category Weights (for Monte Carlo / AI Coach)
  // eslint-disable-next-line no-unused-vars
  const handleUpdateWeights = useCallback((weights) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        weight: weights[cat.name] !== undefined ? weights[cat.name] : (cat.weight || 100)
      }))
    }));
  }, [setData]);

  // Auto-save data to Cloud
  useEffect(() => {
    if (!currentUser || !appState) return;

    const timer = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users_data', currentUser.uid), appState);
        // Optional: Show small indicator of 'saved'
      } catch (e) {
        console.error("Cloud Auto-save failed:", e);
      }
    }, 2000); // Debounce 2s to save writes
    return () => clearTimeout(timer);
  }, [appState, currentUser]);

  // Fix duplicate colors on load/change
  useEffect(() => {
    if (!data || !data.categories) return;

    const uniqueColors = new Set();
    let hasDuplicates = false;
    const palette = [
      '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4',
      '#eab308', '#f97316', '#14b8a6', '#6366f1', '#d946ef', '#84cc16', '#f43f5e',
      '#a855f7', '#0ea5e9', '#22c55e', '#e11d48'
    ];

    const newCategories = data.categories.map(cat => {
      if (uniqueColors.has(cat.color)) {
        hasDuplicates = true;
        let newColor = palette.find(c => !uniqueColors.has(c));
        if (!newColor) {
          let attempts = 0;
          do {
            newColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
            attempts++;
          } while (uniqueColors.has(newColor) && attempts < 50);
        }
        uniqueColors.add(newColor);
        return { ...cat, color: newColor };
      }
      uniqueColors.add(cat.color);
      return cat;
    });

    if (hasDuplicates) {
      setTimeout(() => {
        setData(prev => ({ ...prev, categories: newCategories }), false); // Don't record history for auto-color fixes
      }, 0);
    }
  }, [data.categories, setData]);

  // Update User Name
  const updateUserName = useCallback((name) => {
    setData(prev => ({
      ...prev,
      user: { ...prev.user, name }
    }), false); // Don't save history for every keystroke
  }, [setData]);

  // Export Data
  const handleExport = useCallback(() => {
    exportData(appState);
    showToast('Backup exportado com sucesso!', 'success');
  }, [appState, showToast]);

  // Update Simulado Rows (Lifted State from SimuladoAnalysis)
  // Adds timestamp to new rows and cleans up old rows (only keep today and yesterday)
  // Update Simulado Rows (Lifted State from SimuladoAnalysis)
  // Adds timestamp to new rows and cleans up old rows (only keep today and yesterday)
  const handleUpdateSimuladoRows = useCallback((updatedTodayRows) => {
    const now = new Date();
    const today = now.toDateString();

    setData(prev => {
      const existingRows = prev.simuladoRows || [];
      // Keep everything that is NOT from today (preserves Yesterday)
      const nonTodayRows = existingRows.filter(row => {
        if (!row.createdAt) return false;
        return new Date(row.createdAt).toDateString() !== today;
      });

      // Ensure updated rows have timestamp and are marked as Today
      // IMPORTANT: Remove 'validated' flag so modified rows must be re-validated
      // before appearing in the History panel
      const processedTodayRows = updatedTodayRows.map(row => {
        const { validated: _validated, ...rowWithoutValidated } = row;
        return {
          ...rowWithoutValidated,
          createdAt: row.createdAt || Date.now()
        };
      });

      return { ...prev, simuladoRows: [...nonTodayRows, ...processedTodayRows] };
    }); // Undo enabled for grade entry
  }, [setData]);

  // Handle Simulado Analysis Results
  const handleSimuladoAnalysis = useCallback((payload) => {


    setData(prev => {
      // Support both old format (direct data) and new format ({analysis, rawRows})
      const analysisResult = payload.analysis || payload;
      const rawRows = payload.rawRows || [];

      const newCategories = [...prev.categories];

      // Helper to normalize names for matching
      const normalize = (str) => {
        return str.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/noções de\s+/i, "") // Remove common prefix
          .trim();
      };

      // Dictionary of aliases manually mapped if needed
      const aliases = {
        'informatica': ['noções de informática', 'info', 'computação'],
        'raciocinio logico': ['rlm', 'raciocínio lógico matemático', 'raciocinio logico quantitativo'],
        'etica no serviço publico': ['etica', 'ética no serviço público', 'ética'],
      };

      // Iterate through each discipline result from the AI
      analysisResult.disciplines.forEach(disc => {
        // Find existing category or create new one
        const discNameNormalized = normalize(disc.name);

        // PASS 1: Exact Name Match
        let catIndex = newCategories.findIndex(c => normalize(c.name) === discNameNormalized);

        // PASS 2: Alias Match
        if (catIndex === -1) {
          catIndex = newCategories.findIndex(c => {
            const catNameNormalized = normalize(c.name);
            const aliasList = aliases[catNameNormalized];
            if (aliasList && aliasList.some(a => normalize(a) === discNameNormalized)) return true;
            return false;
          });
        }

        if (catIndex === -1) {
          showToast(`Matéria '${disc.name}' ignorada. Crie-a no Dashboard primeiro.`, 'warning');
          return;
        }

        // Update Simulado Stats
        const category = newCategories[catIndex];
        const currentStats = category.simuladoStats || { history: [], average: 0 };

        // --- TOPIC VALIDATION ---
        const rawTopics = disc.topics || disc.worstTopics || [];
        const validTopics = [];
        const categoryTasks = category.tasks || [];
        const taskTitlesNormalized = categoryTasks.map(t => normalize(t.title));

        rawTopics.forEach(t => {
          const topicNameNormalized = normalize(t.name);
          if (taskTitlesNormalized.includes(topicNameNormalized)) {
            validTopics.push(t);
          } else {
            showToast(`Assunto '${t.name}' ignorado na matéria '${category.name}'. Crie-o primeiro.`, 'warning');
          }
        });

        // Use validTopics for calculations
        const topics = validTopics;

        let totalQuestions = 0;
        let totalCorrect = 0;

        if (topics.length > 0) {
          totalQuestions = topics.reduce((acc, t) => acc + (parseInt(t.total) || 0), 0);
          totalCorrect = topics.reduce((acc, t) => acc + (parseInt(t.correct) || 0), 0);
        } else if (rawRows.length > 0) {
          const subjectRows = rawRows.filter(r => {
            const rowName = r.subject || r.discipline || '';
            return normalize(rowName) === discNameNormalized;
          });

          if (subjectRows.length > 0) {
            totalQuestions = subjectRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
            totalCorrect = subjectRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
          }
        }

        const attemptDate = new Date().toISOString();
        const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const newHistory = [...currentStats.history, { date: attemptDate, score, total: totalQuestions, correct: totalCorrect, topics: topics }];

        // Recalculate Global Average
        const grandTotalQuestions = newHistory.reduce((acc, h) => acc + h.total, 0);
        const grandTotalCorrect = newHistory.reduce((acc, h) => acc + h.correct, 0);
        const newAverage = grandTotalQuestions > 0 ? Math.round((grandTotalCorrect / grandTotalQuestions) * 100) : 0;

        // Determine Trend
        let trend = 'stable';
        if (newHistory.length >= 2) {
          const last = newHistory[newHistory.length - 1].score;
          const prev = newHistory[newHistory.length - 2].score;
          if (last > prev) trend = 'up';
          else if (last < prev) trend = 'down';
        }

        // Determine Level
        let level = 'BAIXO';
        if (newAverage > 70) level = 'ALTO';
        else if (newAverage > 40) level = 'MÉDIO';

        newCategories[catIndex] = {
          ...category,
          simuladoStats: {
            history: newHistory,
            average: newAverage,
            lastAttempt: score,
            trend,
            level
          }
        };
      });

      // Mark rawRows as validated (so StudyHistory only shows validated data)
      const now = new Date();
      const today = now.toDateString();
      const validatedSimuladoRows = (prev.simuladoRows || []).map(row => {
        // Only mark today's rows that match the processed rawRows
        if (!row.createdAt) return row;
        const rowDate = new Date(row.createdAt).toDateString();
        if (rowDate !== today) return row; // Keep yesterday's rows as-is

        // Check if this row was part of the successful analysis
        const wasProcessed = rawRows.some(r =>
          r.subject === row.subject &&
          r.topic === row.topic &&
          r.correct === row.correct &&
          r.total === row.total
        );

        if (wasProcessed && row.subject && row.topic) {
          return { ...row, validated: true };
        }
        return row;
      });

      const updatedState = {
        ...prev,
        categories: newCategories,
        simuladoRows: validatedSimuladoRows
      };

      showToast('Simulado Processado! +500 XP 📈', 'success');
      showToast('Dados de simulado sincronizados com Tarefas!', 'success');

      // Apply XP (500) and return consolidated state
      return applyGamification(updatedState, 500);
    });
  }, [setData, showToast, applyGamification]);

  // --- NEW ACHIEVEMENT CHECK LOGIC ---
  const checkAchievements = useCallback((currentData) => {
    if (!currentData || !currentData.user) return;

    const { user, studyLogs, simulados } = currentData;
    const unlockedNow = [];
    const currentUnlocked = new Set(user.achievements || []);

    // Helper to unlock
    const tryUnlock = (id, title) => {
      if (!currentUnlocked.has(id)) {
        unlockedNow.push({ id, title });
        currentUnlocked.add(id);
      }
    };

    // Helper to get YYYY-MM-DD in Local Time (Fixes Night Owl Bug)
    const toLocalYMD = (dateInput) => {
      const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 1. Streak Checks
    // Calculate current streak
    if (studyLogs && studyLogs.length > 0) {
      // Sort unique days (Local Time)
      const uniqueDays = [...new Set(studyLogs.map(l => {
        // Handle both ISO strings and Date objects if necessary
        return toLocalYMD(l.date);
      }))].sort();


      // quick calc
      let currentStreak = 0;

      const now = new Date();
      const today = toLocalYMD(now);

      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterday = toLocalYMD(y);

      if (uniqueDays.includes(today) || uniqueDays.includes(yesterday)) {
        // Streak is active
        // Count backwards
        let checkDate = new Date();
        let count = 0;
        while (true) {
          const s = toLocalYMD(checkDate);
          if (uniqueDays.includes(s)) {
            count++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (s === today && !uniqueDays.includes(today) && uniqueDays.includes(yesterday)) {
            // Allow missing today if early
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          } else {
            break;
          }
        }
        currentStreak = count;
      }



      if (currentStreak >= 7) tryUnlock('week-streak', 'Imparável');
      if (currentStreak >= 30) tryUnlock('month-streak', 'Lenda Viva');

      // Weekend Warrior Check (Sat + Sun study in same week)
      const weekendLogs = studyLogs.filter(l => {
        const d = new Date(l.date);
        const day = d.getDay();
        return day === 0 || day === 6; // 0=Sun, 6=Sat
      });
      if (weekendLogs.length >= 2) {
        // Basic check: has studied on Sat AND Sun?
        // We need to group by week, but for now simple check: if has at least one Sat and one Sun ever
        const hasSat = weekendLogs.some(l => new Date(l.date).getDay() === 6);
        const hasSun = weekendLogs.some(l => new Date(l.date).getDay() === 0);
        if (hasSat && hasSun) tryUnlock('weekend-warrior', 'Guerreiro de FDS');
      }

      // Early Bird / Night Owl
      const hasEarly = studyLogs.some(l => new Date(l.date).getHours() < 6);
      if (hasEarly) tryUnlock('early-bird', 'Madrugador');

      const hasLate = studyLogs.some(l => new Date(l.date).getHours() >= 23);
      if (hasLate) tryUnlock('night-owl', 'Coruja');

      // Marathon (Total Hours)
      const totalMinutes = studyLogs.reduce((acc, l) => acc + (l.minutes || 0), 0);
      const totalHours = totalMinutes / 60;
      if (totalHours >= 50) tryUnlock('marathon', 'Maratonista');

      // Polymath (3 subjects in one day)
      const todayLogs = studyLogs.filter(l => l.date && l.date.startsWith(today));
      const todayCategories = new Set(todayLogs.map(l => l.categoryId));
      if (todayCategories.size >= 3) tryUnlock('polymath', 'Generalista');
    }

    // 2. Sniper (Accuracy)
    if (simulados && simulados.length > 0) {
      const hasPerfectScore = simulados.some(s => s.total >= 10 && s.correct === s.total);
      if (hasPerfectScore) tryUnlock('sniper', 'Cirurgião');
    }

    // 3. Other Diverse Checks
    // Zen Master (Pomodoro Count - using studyLogs count as proxy if session data missing)
    if (studyLogs && studyLogs.length >= 50) tryUnlock('zen-master', 'Mestre Zen');

    // Strategist (High Priority Tasks)
    if (currentData.categories) {
      let highPriorityCompleted = 0;
      currentData.categories.forEach(cat => {
        if (cat.tasks) {
          highPriorityCompleted += cat.tasks.filter(t => t.completed && t.priority === 'high').length;
        }
      });
      if (highPriorityCompleted >= 5) tryUnlock('strategist', 'Estrategista');
    }

    // If any unlocked
    if (unlockedNow.length > 0) {
      setData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          achievements: [...(prev.user.achievements || []), ...unlockedNow.map(u => u.id)]
        }
      }));
      unlockedNow.forEach(u => showToast(`🏆 Conquista Desbloqueada: ${u.title}!`, 'success'));
    }

  }, [setData, showToast]);

  // Trigger Check on meaningful updates
  useEffect(() => {
    // Debounce check to avoid spam
    const timer = setTimeout(() => {
      checkAchievements(data);
    }, 2000);
    return () => clearTimeout(timer);
  }, [data.studyLogs, data.simulados, checkAchievements]); // Only re-run when logs/sims change

  // Import Data - RESTORED
  const handleImport = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.contests && imported.activeId) {
          setAppState(imported);
        } else if (imported.user) {
          setAppState({
            contests: { 'default': imported },
            activeId: 'default'
          });
        } else {
          showToast('Formato de arquivo inválido', 'error');
          return;
        }
        showToast('Dados importados com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao importar arquivo', 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  // Toggle Dark Mode - RESTORED
  const toggleDarkMode = useCallback(() => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, darkMode: !prev.settings.darkMode }
    }));
  }, [setData]);

  // Task Handlers
  const toggleTask = useCallback((categoryId, taskId) => {
    setData(prev => {
      let xpChange = 0;
      const timestamp = new Date().toISOString();

      const updatedState = {
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id === categoryId
            ? {
              ...cat,
              tasks: cat.tasks.map(t => {
                if (t.id === taskId) {
                  const newCompleted = !t.completed;
                  xpChange = newCompleted ? 150 : -150;

                  // RETENTION SYNC LOGIC
                  // If completing, update lastStudiedAt to NOW
                  // If uncompleting, revert to the LATEST LOG date (or null)
                  let newLastStudiedAt = t.lastStudiedAt;

                  if (newCompleted) {
                    newLastStudiedAt = timestamp;
                  } else {
                    // Revert logic: Find latest log for this task
                    const taskLogs = (prev.studyLogs || []).filter(l => l.taskId == taskId); // Loose equality for string/int IDs
                    const latestLog = taskLogs.length > 0
                      ? taskLogs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
                      : null;

                    newLastStudiedAt = latestLog ? latestLog.date : null;
                  }

                  return { ...t, completed: newCompleted, lastStudiedAt: newLastStudiedAt };
                }
                return t;
              })
            }
            : cat
        )
      };

      if (xpChange > 0) {
        showToast('Tarefa concluída! +150 XP ✅', 'success');
      }

      // Apply XP change and return consolidated state
      return applyGamification(updatedState, xpChange);
    });
  }, [setData, applyGamification, showToast]);

  const deleteTask = useCallback((categoryId, taskId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, tasks: cat.tasks.filter(t => t.id !== taskId) }
          : cat
      )
    }));
    showToast('Tarefa removida!', 'error');
  }, [setData, showToast]);

  // Reset Simulado Stats
  const resetSimuladoStats = useCallback(() => {
    if (!window.confirm('Tem certeza? Isso apagará TODO o histórico de simulados e saldo líquido. Essa ação não pode ser desfeita.')) {
      return;
    }

    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        simuladoStats: {
          history: [],
          average: 0,
          lastAttempt: 0,
          trend: 'stable',
          level: 'BAIXO'
        }
      }))
    }));
    showToast('Histórico de performance resetado!', 'success');
  }, [setData, showToast]);

  // DELETE SIMULADO (By Date)
  const deleteSimulado = useCallback((dateStr) => {
    // dateStr should be YYYY-MM-DD or similar to match how we group them
    // Actually StudyHistory passes the full date string of the group (which is usually today/yesterday)
    // We will remove ALL stats and rows that match this date (ignoring time)

    const targetDate = new Date(dateStr).toDateString();

    if (!window.confirm(`Excluir histórico de simulados de ${targetDate}? A performance será recalculada.`)) {
      return;
    }

    setData(prev => {
      // 1. Filter rows
      const newRows = (prev.simuladoRows || []).filter(r => {
        if (!r.createdAt) return true; // Keep legacy/unknown? Or delete? Safety: keep.
        return new Date(r.createdAt).toDateString() !== targetDate;
      });

      // 2. Filter Category Stats
      const newCategories = (prev.categories || []).map(cat => {
        if (!cat.simuladoStats || !cat.simuladoStats.history) return cat;

        const newHistory = cat.simuladoStats.history.filter(h => {
          return new Date(h.date).toDateString() !== targetDate;
        });

        // Recalculate Stats
        const grandTotalQuestions = newHistory.reduce((acc, h) => acc + (h.total || 0), 0);
        const grandTotalCorrect = newHistory.reduce((acc, h) => acc + (h.correct || 0), 0);
        const newAverage = grandTotalQuestions > 0 ? Math.round((grandTotalCorrect / grandTotalQuestions) * 100) : 0;

        // Recalculate Trend
        let trend = 'stable';
        if (newHistory.length >= 2) {
          const last = newHistory[newHistory.length - 1].score;
          const prevScore = newHistory[newHistory.length - 2].score;
          if (last > prevScore) trend = 'up';
          else if (last < prevScore) trend = 'down';
        }

        // Recalculate Level
        let level = 'BAIXO';
        if (newAverage > 70) level = 'ALTO';
        else if (newAverage > 40) level = 'MÉDIO';

        return {
          ...cat,
          simuladoStats: {
            ...cat.simuladoStats,
            history: newHistory,
            average: newAverage,
            lastAttempt: newHistory.length > 0 ? newHistory[newHistory.length - 1].score : 0,
            trend,
            level
          }
        };
      });

      return {
        ...prev,
        simuladoRows: newRows,
        categories: newCategories
      };
    });
    showToast('Dados de simulado excluídos.', 'info');
  }, [setData, showToast]);

  const addCategory = useCallback((input) => {
    setData(prev => {
      let newCategory = input;

      if (typeof input === 'string') {
        if (!input.trim()) return prev; // Invalid input check
        const palette = [
          '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4',
          '#eab308', '#f97316', '#14b8a6', '#6366f1', '#d946ef', '#84cc16', '#f43f5e'
        ];
        const randomColor = palette[Math.floor(Math.random() * palette.length)];

        newCategory = {
          id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: input,
          color: randomColor,
          icon: '📚',
          tasks: []
        };
      }

      return {
        ...prev,
        categories: [...prev.categories, newCategory]
      };
    });
    showToast('Nova disciplina adicionada!', 'success');
  }, [setData, showToast]);

  const deleteCategory = useCallback((categoryId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId)
    }));
    showToast('Disciplina removida.', 'info');
  }, [setData, showToast]);

  const addTask = useCallback((categoryId, input) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id !== categoryId) return cat;

        let newTask = input;
        if (typeof input === 'string') {
          if (!input.trim()) return cat; // Invalid input check
          newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: input,
            completed: false,
            priority: 'medium',
          };
        }

        return { ...cat, tasks: [...cat.tasks, newTask] };
      })
    }));
    showToast('Nova tarefa adicionada!', 'success');
  }, [setData, showToast]);

  // Update Study Time & Log Session
  const handleUpdateStudyTime = useCallback((categoryId, minutes, taskId) => {
    const timestamp = new Date().toISOString();

    setData(prev => {
      // Create new log entry (for heatmap/activity)
      const newLog = {
        id: `log-${Date.now()}`,
        date: timestamp,
        categoryId,
        taskId,
        minutes
      };

      // Create session entry (for history)
      const newSession = {
        id: Date.now(),
        startTime: timestamp,
        duration: minutes,
        categoryId,
        taskId
      };

      const currentLogs = prev.studyLogs || [];
      const currentSessions = prev.studySessions || [];

      return {
        ...prev,
        studyLogs: [...currentLogs, newLog],
        studySessions: [...currentSessions, newSession],
        categories: prev.categories.map(cat =>
          cat.id === categoryId
            ? {
              ...cat,
              totalMinutes: (cat.totalMinutes || 0) + minutes,
              lastStudiedAt: timestamp,
              // Also update the specific task's lastStudiedAt
              tasks: (cat.tasks || []).map(task =>
                task.id === taskId
                  ? { ...task, lastStudiedAt: timestamp }
                  : task
              )
            }
            : cat
        )
      };
    });

  }, [setData]);

  // DELETE SESSION LOGIC - NEW
  const deleteSession = useCallback((sessionId) => {
    setData(prev => {
      const sessionToDelete = (prev.studySessions || []).find(s => s.id === sessionId);
      if (!sessionToDelete) return prev; // Not found

      const { duration, categoryId, startTime, taskId } = sessionToDelete;

      // 1. Remove from Sessions
      const updatedSessions = (prev.studySessions || []).filter(s => s.id !== sessionId);

      // 2. Remove from Logs (match by exact date/timestamp and category)
      const updatedLogs = (prev.studyLogs || []).filter(l => {
        const isMatch = l.date === startTime && l.categoryId === categoryId;
        return !isMatch;
      });

      // 3. Update Category Totals & Revert lastStudiedAt
      const updatedCategories = (prev.categories || []).map(cat => {
        if (cat.id === categoryId) {
          const newTotal = Math.max(0, (cat.totalMinutes || 0) - duration);

          // Find the new latest log for this category to revert lastStudiedAt
          const catLogs = updatedLogs.filter(l => l.categoryId === categoryId);
          const latestCatLog = catLogs.length > 0
            ? catLogs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
            : null;

          const newCatLastStudiedAt = latestCatLog ? latestCatLog.date : null;

          return {
            ...cat,
            totalMinutes: newTotal,
            lastStudiedAt: newCatLastStudiedAt,
            // Update specific task if it matches
            tasks: (cat.tasks || []).map(task => {
              if (task.id === taskId) {
                // Find new latest log for this specific task
                const taskLogs = updatedLogs.filter(l => l.taskId == taskId); // Use loose equality for null/undefined
                const latestTaskLog = taskLogs.length > 0
                  ? taskLogs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b)
                  : null;
                return { ...task, lastStudiedAt: latestTaskLog ? latestTaskLog.date : null };
              }
              return task;
            })
          };
        }
        return cat;
      });

      return {
        ...prev,
        studySessions: updatedSessions,
        studyLogs: updatedLogs,
        categories: updatedCategories
      };
    });
    showToast('Sessão excluída. Retenção e Estatísticas recalculadas!', 'success');
  }, [setData, showToast]);

  const updatePomodoroSettings = useCallback((newSettings) => {
    setData(prev => ({
      ...prev,
      settings: newSettings
    }));
    showToast('Configurações salvas!', 'success');
  }, [setData, showToast]);




  const togglePriority = useCallback((categoryId, taskId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId
          ? {
            ...cat,
            tasks: cat.tasks.map(t => {
              if (t.id === taskId) {
                const priorities = ['low', 'medium', 'high'];
                const currentIdx = priorities.indexOf(t.priority || 'medium');
                const nextPriority = priorities[(currentIdx + 1) % priorities.length];
                return { ...t, priority: nextPriority };
              }
              return t;
            })
          }
          : cat
      )
    }));
  }, [setData]);



  // Render Content - RESTORED

  // AI Coach Logic
  const [coachLoading, setCoachLoading] = useState(false);
  const suggestedFocus = React.useMemo(() => {
    if (!data.categories || !data.simulados) return null;
    const targetScore = typeof window !== 'undefined' ? (parseInt(localStorage.getItem('monte_carlo_target')) || 70) : 70;
    return getSuggestedFocus(data.categories, data.simulados, data.studyLogs || [], {
      config: {},
      user: data.user,
      targetScore // Pass User Target
    });
  }, [data.categories, data.simulados, data.studyLogs, data.user]); // Re-run when data changes. Ideally add targetScore to dependency if state.

  const handleGenerateGoals = useCallback(() => {
    setCoachLoading(true);
    setTimeout(() => {
      const targetScore = typeof window !== 'undefined' ? (parseInt(localStorage.getItem('monte_carlo_target')) || 70) : 70;
      const newTasks = generateDailyGoals(data.categories, data.simulados, data.studyLogs || [], {
        config: {},
        user: data.user,
        targetScore // Pass User Target
      });

      if (newTasks.length === 0) {
        setCoachLoading(false);
        showToast('⚠️ Nenhuma meta necessária por enquanto!', 'info');
        return;
      }

      setData(prev => {
        // STORE IN SEPARATE 'coachPlan' - REPLACE instead of append
        return {
          ...prev,
          coachPlan: newTasks
        };
      });

      setCoachLoading(false);
      showToast(`⚡ ${newTasks.length} Sugestões geradas na aba Coach!`, 'success');
    }, 1500);
  }, [data.categories, data.simulados, data.studyLogs, data.user, setData, showToast]);

  const handleCloudRestore = useCallback((restoredData) => {
    if (!restoredData) return;
    setData(() => restoredData);
    showToast('☁️ Dados restaurados da Nuvem!', 'success');
  }, [setData, showToast]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* AI Coach Widget */}
            {/* AI Coach Widget REMOVED from Dashboard */}

            <StatsCards
              data={data}
              onUpdateGoalDate={(newDate) => setData(prev => ({
                ...prev,
                user: { ...prev.user, goalDate: newDate }
              }))}
            />


            {/* Next Goal Card - AI-powered suggestion */}
            <NextGoalCard
              categories={data.categories}
              simulados={data.simulados}
              onStartStudying={startStudying}
            />
            {/* Tasks / Checklist Area */}
            <div className="mt-4">
              <Checklist
                categories={data.categories}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onAddCategory={addCategory}
                onDeleteCategory={deleteCategory}
                onAddTask={addTask}
                onTogglePriority={togglePriority}
                onPlayContext={startStudying}
                showSimuladoStats={false}
                filter={filter}
                setFilter={setFilter}
              />
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="space-y-10">
            {/* Top: Rankings (Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              {/* Left: Stats Cards (2/3 width) */}
              <div className="lg:col-span-2">
                <PersonalRanking categories={data.categories} />
              </div>

              {/* Right: Volume Ranking (1/3 width) */}
              <div className="lg:col-span-1 h-full">
                <VolumeRanking categories={data.categories} />
              </div>
            </div>

            {/* Bottom: Detailed Table */}
            <div className="pb-8 border-t border-white/5 pt-24 mt-32">
              <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
                📊 Quadro de Performance (Saldo Líquido)
                <button
                  onClick={resetSimuladoStats}
                  className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-2"
                  title="Resetar dados do painel"
                >
                  <RotateCcw size={16} />
                </button>
              </h2>
              <PerformanceTable categories={data.categories} />
            </div>
          </div>
        );
      case 'simulados':
        return (
          <SimuladoAnalysis
            rows={(data.simuladoRows || []).filter(r => {
              if (!r.createdAt) return false;
              return new Date(r.createdAt).toDateString() === new Date().toDateString();
            })}
            onRowsChange={handleUpdateSimuladoRows}
            onAnalysisComplete={handleSimuladoAnalysis}
            categories={data.categories || []}
          />
        );
      case 'stats':
        return (
          <div className="space-y-8">
            <VerifiedStats categories={data.categories} user={data.user} />

            <WeeklyAnalysis studyLogs={data.studyLogs} categories={data.categories} />

            <Charts
              data={data}
              filter={filter}
              setFilter={setFilter}
              compact
            />
          </div>
        );
      case 'coach':
        return (
          <AICoachView
            suggestedFocus={suggestedFocus}
            onGenerateGoals={handleGenerateGoals}
            loading={coachLoading}
            coachPlan={data.coachPlan}
            onClearHistory={() => setData(prev => ({ ...prev, coachPlan: [] }))}
          />
        );
      case 'pomodoro':
        return (
          <PomodoroTimer
            settings={data.settings}
            onUpdateSettings={updatePomodoroSettings}
            activeSubject={activeSubject}
            categories={data.categories}
            onStartStudying={startStudying}
            onUpdateStudyTime={handleUpdateStudyTime}
            onExit={() => {
              setActiveTab(previousTab || 'dashboard');
              setPreviousTab(null);
            }}
            onSessionComplete={trackPomodoroComplete}
            onFullCycleComplete={() => {
              finishStudying();
              if (previousTab) {
                setActiveTab(previousTab);
                setPreviousTab(null);
              }
            }}
          />
        );
      case 'history':
        return <StudyHistory
          studySessions={data.studySessions || []}
          categories={data.categories}
          simuladoRows={data.simuladoRows || []}
          onDeleteSession={deleteSession}
          onDeleteSimulado={deleteSimulado}
        />
      case 'heatmap':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Reset Modal */}
            {showResetModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setShowResetModal(false)}
                />

                {/* Modal */}
                <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <RotateCcw size={20} className="text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Resetar Dados</h3>
                        <p className="text-xs text-slate-400">Escolha o que deseja resetar</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowResetModal(false)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Options */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const selections = {
                      gamification: formData.get('gamification') === 'on',
                      achievements: formData.get('achievements') === 'on',
                      calendar: formData.get('calendar') === 'on',
                      simulados: formData.get('simulados') === 'on',
                      tasks: formData.get('tasks') === 'on',
                      coachPlan: formData.get('coachPlan') === 'on',
                      pomodoro: formData.get('pomodoro') === 'on',
                    };

                    // Check if at least one option is selected
                    if (!Object.values(selections).some(v => v)) {
                      showToast('Selecione pelo menos uma opção', 'error');
                      return;
                    }

                    // Confirm action
                    const selectedNames = [];
                    if (selections.gamification) selectedNames.push('XP/Nível');
                    if (selections.achievements) selectedNames.push('Conquistas');
                    if (selections.calendar) selectedNames.push('Calendário');
                    if (selections.simulados) selectedNames.push('Simulados');
                    if (selections.tasks) selectedNames.push('Tarefas');
                    if (selections.coachPlan) selectedNames.push('AI Coach');
                    if (selections.pomodoro) selectedNames.push('Pomodoro');

                    if (!window.confirm(`Confirma o reset de: ${selectedNames.join(', ')}?\n\nEssa ação não pode ser desfeita.`)) {
                      return;
                    }

                    // Apply resets
                    setData(prev => {
                      let newData = { ...prev };

                      if (selections.gamification) {
                        newData.user = {
                          ...newData.user,
                          xp: 0,
                          level: 10,
                        };
                      }

                      if (selections.achievements) {
                        newData.user = {
                          ...newData.user,
                          achievements: [],
                        };
                      }

                      if (selections.calendar) {
                        newData.studyLogs = [];
                      }

                      if (selections.simulados) {
                        // Reset simulados array
                        newData.simulados = [];
                        newData.simuladoRows = []; // Clear raw rows state
                        // Reset simuladoStats in categories
                        newData.categories = (newData.categories || []).map(cat => ({
                          ...cat,
                          simuladoStats: {
                            history: [],
                            average: 0,
                            lastAttempt: 0,
                            trend: 'stable',
                            level: 'BAIXO'
                          }
                        }));
                        // Also clear localStorage simulado_rows (backward compatibility)
                        localStorage.removeItem('simulado_rows');
                      }

                      if (selections.tasks) {
                        newData.categories = (newData.categories || []).map(cat => ({
                          ...cat,
                          tasks: (cat.tasks || []).map(t => ({
                            ...t,
                            completed: false,
                            status: undefined
                          })),
                          totalMinutes: 0,
                          lastStudiedAt: undefined,
                        }));
                      }

                      if (selections.coachPlan) {
                        newData.coachPlan = [];
                      }

                      if (selections.pomodoro) {
                        newData.pomodoroSessions = [];
                      }

                      return newData;
                    });

                    setShowResetModal(false);
                    showToast(`${selectedNames.length} área(s) resetada(s) com sucesso!`, 'success');
                  }}>
                    <div className="space-y-2 mb-6 max-h-[350px] overflow-y-auto pr-1">
                      {/* Option 1: Gamification */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-purple-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="gamification" className="w-4 h-4 rounded accent-purple-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <span className="font-medium text-white group-hover:text-purple-300 transition-colors">Gamificação (XP, Nível)</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Zera seu XP e volta ao nível 10</p>
                        </div>
                      </label>

                      {/* Option 2: Achievements */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-yellow-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="achievements" className="w-4 h-4 rounded accent-yellow-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏆</span>
                            <span className="font-medium text-white group-hover:text-yellow-300 transition-colors">Conquistas</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Remove todas as conquistas desbloqueadas</p>
                        </div>
                      </label>

                      {/* Option 3: Calendar */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-green-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="calendar" className="w-4 h-4 rounded accent-green-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📅</span>
                            <span className="font-medium text-white group-hover:text-green-300 transition-colors">Calendário de Atividade</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Limpa o histórico de estudos e streak</p>
                        </div>
                      </label>

                      {/* Option 4: Simulados */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-blue-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="simulados" className="w-4 h-4 rounded accent-blue-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📊</span>
                            <span className="font-medium text-white group-hover:text-blue-300 transition-colors">Dados de Simulados</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Apaga histórico de performance, saldo líquido e formulário</p>
                        </div>
                      </label>

                      {/* Option 5: Tasks */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-orange-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="tasks" className="w-4 h-4 rounded accent-orange-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✅</span>
                            <span className="font-medium text-white group-hover:text-orange-300 transition-colors">Tarefas Concluídas</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Marca todas como não concluídas e zera tempo de estudo</p>
                        </div>
                      </label>

                      {/* Option 6: AI Coach */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="coachPlan" className="w-4 h-4 rounded accent-cyan-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🤖</span>
                            <span className="font-medium text-white group-hover:text-cyan-300 transition-colors">Plano do AI Coach</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Limpa todas as sugestões geradas pelo coach</p>
                        </div>
                      </label>

                      {/* Option 7: Pomodoro */}
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-rose-500/30 cursor-pointer transition-all group">
                        <input type="checkbox" name="pomodoro" className="w-4 h-4 rounded accent-rose-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🍅</span>
                            <span className="font-medium text-white group-hover:text-rose-300 transition-colors">Sessões Pomodoro</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">Apaga o histórico de sessões pomodoro</p>
                        </div>
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowResetModal(false)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium transition-all shadow-lg shadow-red-500/25"
                      >
                        Confirmar Reset
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/20">
                <CalendarDays size={22} className="text-green-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">Atividade</h1>
                <p className="text-sm text-slate-400">Acompanhe sua consistência e conquistas</p>
              </div>
              {/* Reset Button - Opens Modal */}
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all text-sm"
                title="Resetar dados"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Resetar Dados</span>
              </button>
            </div>

            {/* Main Grid: Stacked Logic */}
            <div className="flex flex-col gap-6">

              {/* Top Row: Key Metrics (Streak + XP) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <StreakDisplay studyLogs={data.studyLogs} />
                <XPHistory user={data.user} />
              </div>

              {/* Middle Row: Heatmap (Full Width) */}
              <div className="rounded-2xl p-6 border border-white/10 bg-slate-900/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-green-400" />
                  <h3 className="text-lg font-bold text-white">Calendário de Estudos</h3>
                </div>
                <ActivityHeatmap studyLogs={data.studyLogs} />
              </div>

              {/* Bottom Row: Achievements */}
              <div className="">
                <AchievementsGrid
                  unlockedIds={data.user?.achievements || []}
                  stats={{}}
                />
              </div>

            </div>
          </div>
        );
      case 'retention':
        return (
          <RetentionPanel
            categories={data.categories}
            onSelectCategory={(cat) => {
              // When user clicks a category/task, switch to pomodoro
              // If specific task was clicked (passed as selectedTask), use it.
              // Otherwise fallback to first task.
              const targetTaskId = cat.selectedTask ? cat.selectedTask.id : cat.tasks?.[0]?.id;

              if (targetTaskId) {
                startStudying(cat.id, targetTaskId);
              }
              setPreviousTab('retention');
              setActiveTab('pomodoro');
            }}
          />
        );

      case 'notes':
        return (
          <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={data.categories} />
            <ParetoAnalysis categories={data.categories} />
          </div>
        );
      case 'settings':
        return (
          <div className="glass p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Configurações Gerais</h2>
            <p className="text-slate-400">Em breve...</p>
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-bold mb-4">Zona de Perigo</h3>
              <button
                onClick={() => {
                  if (window.confirm('TEM CERTEZA ABSOLUTA?\n\nIsso apagará TODO o seu progresso, histórico, níveis e personalizações.\n\nO aplicativo voltará ao estado original (como novo).')) {
                    // 1. Clear LocalStorage
                    localStorage.removeItem('ultra-dashboard-data');

                    // 2. Prepare Fresh Data (Explicitly Empty)
                    const freshData = {
                      ...INITIAL_DATA, // Spread first to get settings/achievement definitions and other static data
                      user: {
                        ...INITIAL_DATA.user, // Keep initial user settings like goalDate if not explicitly overridden
                        name: "Estudante",
                        avatar: "👤",
                        startDate: new Date().toISOString().split('T')[0], // Reset start date to today
                        goalDate: new Date().toISOString().split('T')[0], // Reset exam date to today (0 days left)
                        xp: 0,
                        level: 10,
                        achievements: [] // Clear user achievements
                      },
                      categories: [], // Explicitly empty
                      simuladoRows: [], // Force clear raw rows
                      simulados: [], // Clear simulados data
                      pomodoroSessions: [], // Clear pomodoro sessions
                      studyLogs: [], // Clear study logs
                      studySessions: [], // Clear study sessions
                      coachPlan: [], // Clear AI Coach plan
                      // notes: "", // If notes are part of INITIAL_DATA, this would clear them.
                      // If notes are dynamic, they should be cleared here.
                      // Assuming notes are dynamic and should be cleared.
                      notes: "",
                      // achievements: [], // This would clear achievement definitions.
                      // User achievements are handled in user.achievements.
                      // Keeping achievement definitions from INITIAL_DATA.
                    };

                    // 3. Save Fresh Data
                    localStorage.setItem('ultra-dashboard-data', JSON.stringify({
                      contests: { 'default': freshData },
                      activeId: 'default'
                    }));

                    // 4. Reload
                    window.location.reload();
                  }
                }}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40 flex items-center gap-2 font-bold"
              >
                <div className="p-1 bg-red-500/20 rounded-full">
                  <RotateCcw size={16} />
                </div>
                Resetar Tudo (Começar do Zero)
              </button>
            </div>
          </div>
        );
      case 'help':
        // Help is a modal, open it and return to previous tab
        setShowHelpGuide(true);
        setActiveTab('dashboard'); // Return to dashboard immediately
        return null;
      default:
        return null;
    }
  };

  // --- AUTH CHECK ---
  if (!currentUser) return <Login />;

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#0f0c29] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Premium Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] animate-gradient-slow"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent animate-pulse-slow"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo / Icon */}
          <div className="w-24 h-24 mb-8 relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative z-10 w-full h-full bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10">
              <svg className="w-12 h-12 text-white animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Typography */}
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-blue-400 tracking-tight mb-2 text-center uppercase">
            MÉTODO THI
          </h1>

          <div className="h-6 flex items-center justify-center">
            <span className="text-blue-300/80 font-medium text-sm tracking-widest uppercase animate-fade-in-up">
              {loadingStatus}
            </span>
          </div>

          {/* Loading Bar */}
          <div className="mt-8 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-1/3 animate-loading-bar rounded-full"></div>
          </div>
        </div>

        <style>{`
          @keyframes loading-bar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
          .animate-loading-bar {
            animation: loading-bar 1.5s infinite ease-in-out;
          }
          .animate-spin-slow {
             animation: spin 8s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!appState) {
    const isConfigLoaded = !!import.meta.env.VITE_PROJECT_ID;
    const projectId = import.meta.env.VITE_PROJECT_ID || 'MISSING';

    return (
      <div className="min-h-screen bg-[#0f0c29] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-400 mb-2 text-center">Erro de Conexão</h2>
          <p className="text-slate-400 mb-4 text-center">Não foi possível carregar os dados.</p>

          <div className="bg-black/30 p-4 rounded-lg mb-4 text-xs font-mono text-slate-300 overflow-auto">
            <p><strong>Status:</strong> {loadingData ? 'Carregando...' : 'Falha'}</p>
            <p><strong>User ID:</strong> {currentUser ? currentUser.uid : 'Não Logado'}</p>
            <p><strong>Project ID:</strong> {projectId}</p>
            <p><strong>API Key:</strong> {import.meta.env.VITE_API_KEY ? 'Presente' : 'AUSENTE'}</p>
            <p><strong>Auth Domain:</strong> {import.meta.env.VITE_AUTH_DOMAIN ? 'Presente' : 'AUSENTE'}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-lg font-bold transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // --- MOBILE RENDER ---
  if (isMobile && !forceDesktopMode) {
    const mobileActions = {
      updatePomodoroSettings,
      finishStudying,
      startStudying,
      handleUpdateStudyTime,
      toggleTask,
      deleteTask,
      addTask,
      addCategory,
      deleteCategory
    };

    return (
      <>
        <MobilePocketMode
          user={data.user}
          data={data}
          actions={mobileActions}
          onExitPocketMode={() => setForceDesktopMode(true)}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
        {levelUpData && (
          <LevelUpToast
            level={levelUpData.level}
            title={levelUpData.title}
            onClose={() => setLevelUpData(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-purple-500/30">
      <ParticleBackground />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={handleExport}
        onImport={handleImport}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={data.user}
      />

      <main className="p-8 pt-24 transition-all duration-300 w-full">
        <Header
          user={data.user}
          settings={data.settings}
          onToggleDarkMode={toggleDarkMode}
          onUpdateName={updateUserName}
          contests={safeAppState.contests}
          activeContestId={safeAppState.activeId}
          onSwitchContest={switchContest}
          onCreateContest={createNewContest}
          onDeleteContest={deleteContest}
          onUndo={handleUndo}
          onCloudRestore={handleCloudRestore}
          currentData={data}
        />
        {renderContent()}
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
      {levelUpData && (
        <LevelUpToast
          level={levelUpData.level}
          title={levelUpData.title}
          onClose={() => setLevelUpData(null)}
        />
      )}
      <HelpGuide isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
    </div>
  );

}

export default App;
