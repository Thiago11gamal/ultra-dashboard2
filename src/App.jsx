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
import { normalize, aliases } from './utils/normalization';
import { calculateDailyPomodoroGoal } from './utils/analytics';
import { XP_CONFIG, getTaskXP } from './utils/gamification';

import WeeklyAnalysis from './components/WeeklyAnalysis';
import VerifiedStats from './components/VerifiedStats';
import ParetoAnalysis from './components/ParetoAnalysis';

import ActivityHeatmap from './components/ActivityHeatmap';
import StudyHistory from './components/StudyHistory';
import RetentionPanel from './components/RetentionPanel';
import HelpGuide from './components/HelpGuide';

import LevelUpToast from './components/LevelUpToast';

import { StreakDisplay, AchievementsGrid, XPHistory } from './components/GamificationComponents';
import AICoachView from './components/AICoachView';
import { getSuggestedFocus, generateDailyGoals } from './utils/coachLogic';
import Toast from './components/Toast';
import { useAuth } from './context/useAuth';
import Login from './components/Login';
import { db } from './services/firebase';
import { doc, setDoc } from 'firebase/firestore';

import { exportData, INITIAL_DATA } from './data/initialData';
import useMobileDetect from './hooks/useMobileDetect';
import MobilePocketMode from './components/MobilePocketMode';
import './components/Loading.css';

import { useGamification } from './hooks/useGamification';
import { useContestData } from './hooks/useContestData';

function App() {
  const { currentUser } = useAuth();
  // const [isClient, setIsClient] = useState(false); // Removed for performance
  // useEffect(() => setIsClient(true), []); // Removed for performance

  // Use Custom Hook for Data Management
  const {
    appState,
    setAppState,
    data,
    setData,
    loadingData,
    loadingStatus
  } = useContestData(currentUser);

  const safeAppState = appState && appState.contests ? appState : { contests: { 'default': INITIAL_DATA }, activeId: 'default' };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubject, setActiveSubject] = useState(null);
  const isMobile = useMobileDetect();
  const [forceDesktopMode, setForceDesktopMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [previousTab, setPreviousTab] = useState(null);
  const [filter, setFilter] = useState('all');
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Gamification Hook
  const { applyGamification, levelUpData, closeLevelUpToast } = useGamification(showToast);

  const trackPomodoroComplete = useCallback(() => {
    const hour = new Date().getHours();
    setData(prev => ({
      ...prev,
      pomodorosCompleted: (prev.pomodorosCompleted || 0) + 1,
      studiedEarly: prev.studiedEarly || hour < 7,
      studiedLate: prev.studiedLate || hour >= 0 && hour < 5
    }));
  }, [setData]);

  const startStudying = useCallback((categoryId, taskId) => {
    const category = data.categories.find(c => c.id === categoryId);
    if (!category) return;
    const task = category.tasks.find(t => t.id === taskId);
    if (!task) return;

    const categoryName = category.name;
    const taskName = task.title;

    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        tasks: cat.tasks.map(t => {
          if (cat.id === categoryId && t.id === taskId) {
            return { ...t, status: 'studying' };
          }
          return (t.status === 'studying' || t.status === 'paused') ? { ...t, status: undefined } : t;
        })
      }))
    }));

    setActiveSubject({
      categoryId,
      taskId,
      category: categoryName,
      task: taskName,
      priority: task.priority,
      sessionInstanceId: Date.now()
    });
    setActiveTab('pomodoro');
    showToast(`Iniciando estudos: ${categoryName} - ${taskName}`, 'success');
  }, [data.categories, setData, showToast]);

  const finishStudying = useCallback(() => {
    if (!activeSubject) return;
    const { categoryId, taskId } = activeSubject;

    setData(prev => {
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

      showToast('Ciclo de foco finalizado!', 'info');
      // XP is now handled in handleUpdateStudyTime per session
      return updatedState;
    });

    setActiveSubject(null);
    setActiveTab('dashboard');
  }, [activeSubject, setData, showToast, applyGamification]);

  const handleUndo = useCallback(() => {
    setAppState(prev => {
      if (!prev.history || prev.history.length === 0) return prev;
      const newHistory = [...prev.history];
      const snapshot = newHistory.pop();
      const targetId = snapshot.contestId || prev.activeId;
      const snapshotData = snapshot.data || snapshot;

      return {
        ...prev,
        activeId: targetId,
        history: newHistory,
        contests: { ...prev.contests, [targetId]: snapshotData }
      };
    });
    showToast('Ação desfeita! ↩️', 'info');
  }, [showToast]);

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
      contests: { ...prev.contests, [newId]: newContestData },
      activeId: newId
    }));
    showToast('Novo painel de concurso criado!', 'success');
  }, [showToast]);

  const switchContest = useCallback((contestId) => {
    setAppState(prev => ({ ...prev, activeId: contestId }));
    showToast('Painel alterado!', 'success');
  }, [showToast]);

  const deleteContest = useCallback((contestId) => {
    if (!window.confirm('Tem certeza que deseja excluir este painel?')) return;
    setAppState(prev => {
      const newContests = { ...prev.contests };
      delete newContests[contestId];
      let newActiveId = prev.activeId;
      const remainingIds = Object.keys(newContests);
      if (remainingIds.length === 0) {
        newContests['default'] = INITIAL_DATA;
        newActiveId = 'default';
      } else if (contestId === prev.activeId) {
        newActiveId = remainingIds[0];
      }
      return { ...prev, contests: newContests, activeId: newActiveId };
    });
    showToast('Painel excluído.', 'info');
  }, [showToast]);

  const handleUpdateWeights = useCallback((weights) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(cat => ({
        ...cat,
        weight: weights[cat.name] !== undefined ? weights[cat.name] : (cat.weight || 100)
      }))
    }));
  }, [setData]);

  useEffect(() => {
    if (!currentUser || !appState) return;
    const timer = setTimeout(async () => {
      try {
        const stateToSave = { ...appState, history: [] };
        await setDoc(doc(db, 'users_data', currentUser.uid), stateToSave);
      } catch (e) {
        console.error("Cloud Auto-save failed:", e);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [appState, currentUser]);

  useEffect(() => {
    if (!data || !data.categories) return;
    const uniqueColors = new Set();
    let hasDuplicates = false;
    const palette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#f97316', '#14b8a6', '#6366f1', '#d946ef', '#84cc16', '#f43f5e', '#a855f7', '#0ea5e9', '#22c55e', '#e11d48'];

    const newCategories = data.categories.map(cat => {
      if (uniqueColors.has(cat.color)) {
        hasDuplicates = true;
        let newColor = palette.find(c => !uniqueColors.has(c)) || `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
        uniqueColors.add(newColor);
        return { ...cat, color: newColor };
      }
      uniqueColors.add(cat.color);
      return cat;
    });

    if (hasDuplicates) {
      setTimeout(() => setData(prev => ({ ...prev, categories: newCategories }), false), 0);
    }
  }, [data.categories, setData]);

  const updateUserName = useCallback((name) => setData(prev => ({ ...prev, user: { ...prev.user, name } }), false), [setData]);

  const handleExport = useCallback(() => {
    exportData(appState);
    showToast('Backup exportado!', 'success');
  }, [appState, showToast]);

  const handleUpdateSimuladoRows = useCallback((updatedTodayRows) => {
    const today = new Date().toDateString();
    setData(prev => {
      const existingRows = prev.simuladoRows || [];
      const nonTodayRows = existingRows.filter(row => !row.createdAt || new Date(row.createdAt).toDateString() !== today);
      const processedTodayRows = updatedTodayRows.map(row => {
        const { validated, ...rest } = row;
        return { ...rest, createdAt: row.createdAt || Date.now() };
      });
      return { ...prev, simuladoRows: [...nonTodayRows, ...processedTodayRows] };
    });
  }, [setData]);

  const handleSimuladoAnalysis = useCallback((payload) => {
    setData(prev => {
      const analysisResult = payload.analysis || payload;
      const rawRows = payload.rawRows || [];
      const newCategories = [...prev.categories];

      analysisResult.disciplines.forEach(disc => {
        const discName = normalize(disc.name);
        let catIndex = newCategories.findIndex(c => normalize(c.name) === discName);
        if (catIndex === -1) {
          catIndex = newCategories.findIndex(c => aliases[normalize(c.name)]?.some(a => normalize(a) === discName));
        }

        if (catIndex !== -1) {
          const category = newCategories[catIndex];
          const currentStats = category.simuladoStats || { history: [], average: 0 };
          const validTopics = (disc.topics || disc.worstTopics || []).filter(t => category.tasks?.some(task => normalize(task.title) === normalize(t.name)));

          let totalQ = 0, totalC = 0;
          if (validTopics.length > 0) {
            totalQ = validTopics.reduce((acc, t) => acc + (parseInt(t.total) || 0), 0);
            totalC = validTopics.reduce((acc, t) => acc + (parseInt(t.correct) || 0), 0);
          } else {
            const subjectRows = rawRows.filter(r => normalize(r.subject || r.discipline) === discName);
            totalQ = subjectRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
            totalC = subjectRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
          }

          const score = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
          const newHistory = [...(currentStats.history || []), { date: new Date().toISOString(), score, total: totalQ, correct: totalC, topics: validTopics }];

          const grandTotalQ = newHistory.reduce((acc, h) => acc + h.total, 0);
          const grandTotalC = newHistory.reduce((acc, h) => acc + h.correct, 0);
          const newAverage = grandTotalQ > 0 ? Math.round((grandTotalC / grandTotalQ) * 100) : 0;

          let trend = 'stable';
          if (newHistory.length >= 2) {
            const last = newHistory[newHistory.length - 1].score;
            const prevS = newHistory[newHistory.length - 2].score;
            trend = last > prevS ? 'up' : last < prevS ? 'down' : 'stable';
          }

          newCategories[catIndex] = {
            ...category,
            simuladoStats: { history: newHistory, average: newAverage, lastAttempt: score, trend, level: newAverage > 70 ? 'ALTO' : newAverage > 40 ? 'MÉDIO' : 'BAIXO' }
          };
        }
      });

      const today = new Date().toDateString();
      const validatedRows = (prev.simuladoRows || []).map(row => {
        if (row.createdAt && new Date(row.createdAt).toDateString() === today) {
          const wasProcessed = rawRows.some(r => r.subject === row.subject && r.topic === row.topic && r.correct === row.correct && r.total === row.total);
          if (wasProcessed) return { ...row, validated: true };
        }
        return row;
      });

      showToast('Simulado Processado! +500 XP 📈', 'success');
      return applyGamification({ ...prev, categories: newCategories, simuladoRows: validatedRows }, 500);
    });
  }, [setData, showToast, applyGamification]);

  const checkAchievements = useCallback((currentData) => {
    if (!currentData?.user) return;
    const { user, studyLogs, simulados } = currentData;
    const currentUnlocked = new Set(user.achievements || []);
    const unlockedNow = [];
    const tryUnlock = (id, title) => {
      if (!currentUnlocked.has(id)) { unlockedNow.push({ id, title }); currentUnlocked.add(id); }
    };

    if (studyLogs?.length > 0) {
      const toYMD = d => new Date(d).toISOString().split('T')[0];
      const uniqueDays = [...new Set(studyLogs.map(l => toYMD(l.date)))].sort();
      let streak = 0;
      if (studyLogs.length >= 50) tryUnlock('zen-master', 'Mestre Zen');
    }

    if (unlockedNow.length > 0) {
      setData(prev => ({ ...prev, user: { ...prev.user, achievements: [...(prev.user.achievements || []), ...unlockedNow.map(u => u.id)] } }));
      unlockedNow.forEach(u => showToast(`🏆 Conquista: ${u.title}!`, 'success'));
    }
  }, [setData, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => checkAchievements(data), 2000);
    return () => clearTimeout(timer);
  }, [data, checkAchievements]);

  const handleImport = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.contests || imported.user) {
          setAppState(imported.contests ? imported : { contests: { 'default': imported }, activeId: 'default' });
          showToast('Dados importados!', 'success');
        }
      } catch (err) { showToast('Erro ao importar', 'error'); }
    };
    reader.readAsText(file);
  }, [showToast]);

  const toggleDarkMode = useCallback(() => setData(prev => ({ ...prev, settings: { ...prev.settings, darkMode: !prev.settings.darkMode } })), [setData]);

  const toggleTask = useCallback((categoryId, taskId) => {
    setData(prev => {
      let xpChange = 0;
      const timestamp = new Date().toISOString();
      const updatedState = {
        ...prev,
        categories: prev.categories.map(cat => cat.id === categoryId ? {
          ...cat,
          tasks: cat.tasks.map(t => {
            if (t.id === taskId) {
              const completed = !t.completed;
              // XP Logic: Priority based
              xpChange = getTaskXP(t, completed);
              let lastStudiedAt = t.lastStudiedAt;
              if (completed) lastStudiedAt = new Date().toISOString(); // Use consistent date gen
              else {
                // Revert logic (optional, keeping simple for now)
              }
              return { ...t, completed, completedAt: completed ? new Date().toISOString() : null, lastStudiedAt };
            }
            return t;
          })
        } : cat)
      };

      // Gamification trigger
      if (xpChange !== 0) {
        const newData = applyGamification(updatedState, xpChange);
        const msg = xpChange > 0 ?
          `Tarefa Concluída! +${xpChange} XP` :
          `Tarefa desmarcada (${xpChange} XP)`;
        showToast(msg, xpChange > 0 ? 'success' : 'info');
        return newData;
      }

      return updatedState;
    });
  }, [setData, applyGamification, showToast]);
  const deleteTask = useCallback((catId, taskId) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === catId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c)
    }));
    showToast('Tarefa removida!', 'error');
  }, [setData, showToast]);

  const resetSimuladoStats = useCallback(() => {
    if (!window.confirm('Resetar performance?')) return;
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => ({ ...c, simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' } }))
    }));
    showToast('Resetado!', 'success');
  }, [setData, showToast]);

  const deleteSimulado = useCallback((dateStr) => {
    if (!window.confirm('Excluir simulado desta data?')) return;
    const targetDate = new Date(dateStr).toDateString();
    setData(prev => {
      const newRows = (prev.simuladoRows || []).filter(r => !r.createdAt || new Date(r.createdAt).toDateString() !== targetDate);
      const newCats = prev.categories.map(c => {
        if (!c.simuladoStats?.history) return c;
        const newHist = c.simuladoStats.history.filter(h => new Date(h.date).toDateString() !== targetDate);
        return { ...c, simuladoStats: { ...c.simuladoStats, history: newHist } };
      });
      return { ...prev, simuladoRows: newRows, categories: newCats };
    });
    showToast('Simulado excluído.', 'info');
  }, [setData, showToast]);

  const addCategory = useCallback((input) => {
    if (!input || typeof input !== 'string') return;
    const newCat = { id: `cat-${Date.now()}`, name: input, color: '#3b82f6', icon: '📚', tasks: [] };
    setData(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
    showToast('Disciplina adicionada!', 'success');
  }, [setData, showToast]);

  const deleteCategory = useCallback((id) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
      studyLogs: prev.studyLogs?.filter(l => l.categoryId !== id) || [],
    }));
    showToast('Disciplina removida.', 'info');
  }, [setData, showToast]);

  const addTask = useCallback((catId, input) => {
    if (!input || typeof input !== 'string') return;
    const newTask = { id: `task-${Date.now()}`, title: input, completed: false, priority: 'medium' };
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === catId ? { ...c, tasks: [...c.tasks, newTask] } : c)
    }));
    showToast('Tarefa adicionada!', 'success');
  }, [setData, showToast]);

  const handleUpdateStudyTime = useCallback((catId, mins, taskId) => {
    const now = new Date().toISOString();
    setData(prev => {
      const updatedState = {
        ...prev,
        studyLogs: [...(prev.studyLogs || []), { id: `log-${Date.now()}`, date: now, categoryId: catId, taskId, minutes: mins }],
        studySessions: [...(prev.studySessions || []), { id: Date.now(), startTime: now, duration: mins, categoryId: catId, taskId }],
        categories: prev.categories.map(c => c.id === catId ? {
          ...c,
          totalMinutes: (c.totalMinutes || 0) + mins,
          lastStudiedAt: now,
          tasks: c.tasks.map(t => t.id === taskId ? { ...t, lastStudiedAt: now } : t)
        } : c)
      };

      // Calculate XP for this session
      const baseXP = XP_CONFIG.pomodoro.base; // 100
      const bonusXP = taskId ? XP_CONFIG.pomodoro.bonusWithTask : 0; // +100
      const totalXP = baseXP + bonusXP;

      showToast(`+${totalXP} XP! ${bonusXP ? 'Bônus de foco!' : ''}`, 'success');
      return applyGamification(updatedState, totalXP);
    });
  }, [setData, applyGamification, showToast]);

  const deleteSession = useCallback((sessionId) => {
    setData(prev => {
      const session = prev.studySessions?.find(s => s.id === sessionId);
      if (!session) return prev;
      return {
        ...prev,
        studySessions: prev.studySessions.filter(s => s.id !== sessionId),
      };
    });
    showToast('Sessão excluída.', 'success');
  }, [setData, showToast]);

  const updatePomodoroSettings = useCallback((s) => {
    setData(prev => ({ ...prev, settings: s }));
    showToast('Configurações salvas!', 'success');
  }, [setData, showToast]);

  const togglePriority = useCallback((catId, taskId) => {
    const priorities = ['low', 'medium', 'high'];
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === catId ? {
        ...c,
        tasks: c.tasks.map(t => t.id === taskId ? { ...t, priority: priorities[(priorities.indexOf(t.priority || 'medium') + 1) % 3] } : t)
      } : c)
    }));
  }, [setData]);

  const [coachLoading, setCoachLoading] = useState(false);
  const suggestedFocus = React.useMemo(() => {
    if (!data.categories) return null;
    return getSuggestedFocus(data.categories, data.simulados || [], data.studyLogs || [], { user: data.user, targetScore: 70 });
  }, [data.categories, data.simulados, data.studyLogs, data.user]);

  const handleGenerateGoals = useCallback(() => {
    setCoachLoading(true);
    setTimeout(() => {
      const newTasks = generateDailyGoals(data.categories, data.simulados || [], data.studyLogs || [], { user: data.user, targetScore: 70 });
      if (newTasks.length) {
        setData(prev => ({ ...prev, coachPlan: newTasks }));
        showToast('Sugestões geradas!', 'success');
      } else {
        showToast('Nenhuma sugestão necessária.', 'info');
      }
      setCoachLoading(false);
    }, 1500);
  }, [data.categories, data.simulados, data.studyLogs, data.user, setData, showToast]);

  const dailyGoal = React.useMemo(() => {
    if (!data || !data.user || !data.categories) return 4;
    return calculateDailyPomodoroGoal(data.categories, data.user).daily;
  }, [data.categories, data.user]);

  const handleCloudRestore = useCallback((d) => {
    if (d) { setData(() => d); showToast('Restaurado!', 'success'); }
  }, [setData, showToast]);

  if (!currentUser) return <Login />;
  if (loadingData) return <div className="loading-screen">Carregando...</div>;
  if (!appState) return <div className="error-screen">Erro ao carregar.</div>;

  if (isMobile && !forceDesktopMode) {
    return (
      <>
        <MobilePocketMode
          user={data.user}
          data={data}
          activeSubject={activeSubject}
          actions={{ updatePomodoroSettings, finishStudying, startStudying, handleUpdateStudyTime, toggleTask, deleteTask, addTask, addCategory, deleteCategory, togglePriority }}
          onExitPocketMode={() => setForceDesktopMode(true)}
        />
        <div className="fixed bottom-8 right-8 flex flex-col gap-2">{toasts.map(t => <Toast key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}</div>
      </>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen text-slate-200 font-sans selection:bg-purple-500/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onExport={handleExport} onImport={handleImport} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} user={data.user} isMobile={isMobile} />
      <main className="p-8 pt-24 transition-all duration-300 w-full">
        <Header user={data.user} settings={data.settings} onToggleDarkMode={toggleDarkMode} onUpdateName={updateUserName} contests={safeAppState.contests} activeContestId={safeAppState.activeId} onSwitchContest={switchContest} onCreateContest={createNewContest} onDeleteContest={deleteContest} onUndo={handleUndo} onCloudRestore={handleCloudRestore} currentData={data} />
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <StatsCards data={data} onUpdateGoalDate={(d) => setData(prev => ({ ...prev, user: { ...prev.user, goalDate: d } }))} />
            <NextGoalCard categories={data.categories} simulados={data.simulados} onStartStudying={startStudying} />
            <div className="mt-4">
              <Checklist categories={data.categories} onToggleTask={toggleTask} onDeleteTask={deleteTask} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onAddTask={addTask} onTogglePriority={togglePriority} onPlayContext={startStudying} filter={filter} setFilter={setFilter} />
            </div>
          </div>
        )}
        {activeTab === 'pomodoro' && (
          <PomodoroTimer settings={data.settings} onUpdateSettings={updatePomodoroSettings} activeSubject={activeSubject} categories={data.categories} onStartStudying={startStudying} onUpdateStudyTime={handleUpdateStudyTime} onExit={() => { setActiveTab(previousTab || 'dashboard'); setPreviousTab(null); }} onSessionComplete={(subject) => {
            // New Pomodoro Handler
            if (subject) handleUpdateStudyTime(subject.categoryId, 25, subject.taskId);

            setData(prev => ({
              ...prev,
              pomodorosCompleted: (prev.pomodorosCompleted || 0) + 1,
              lastPomodoroDate: new Date().toISOString()
            }));
          }} onFullCycleComplete={() => { finishStudying(); if (previousTab) { setActiveTab(previousTab); setPreviousTab(null); } }} defaultTargetCycles={dailyGoal} />
        )}
        {activeTab === 'tasks' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2"><PersonalRanking categories={data.categories} /></div>
              <div className="lg:col-span-1 h-full"><VolumeRanking categories={data.categories} /></div>
            </div>
            <div className="pb-8 border-t border-white/5 pt-24 mt-32">
              <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
                📊 Quadro de Performance <button onClick={resetSimuladoStats} className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white"><RotateCcw size={16} /></button>
              </h2>
              <PerformanceTable categories={data.categories} />
            </div>
          </div>
        )}
        {activeTab === 'simulados' && (
          <SimuladoAnalysis rows={(data.simuladoRows || []).filter(r => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString())} onRowsChange={handleUpdateSimuladoRows} onAnalysisComplete={handleSimuladoAnalysis} categories={data.categories || []} />
        )}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            <VerifiedStats categories={data.categories} user={data.user} onUpdateWeights={handleUpdateWeights} />
            <WeeklyAnalysis studyLogs={data.studyLogs} categories={data.categories} />
            <Charts data={data} filter={filter} setFilter={setFilter} compact />
          </div>
        )}
        {activeTab === 'coach' && (
          <AICoachView suggestedFocus={suggestedFocus} onGenerateGoals={handleGenerateGoals} loading={coachLoading} coachPlan={data.coachPlan} onClearHistory={() => setData(prev => ({ ...prev, coachPlan: [] }))} />
        )}
        {activeTab === 'history' && (
          <StudyHistory studySessions={data.studySessions || []} categories={data.categories} simuladoRows={data.simuladoRows || []} onDeleteSession={deleteSession} onDeleteSimulado={deleteSimulado} />
        )}
        {activeTab === 'heatmap' && (
          <div className="space-y-6 animate-fade-in">
            {showResetModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetModal(false)} />
                <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Resetar Dados</h3>
                    <button onClick={() => setShowResetModal(false)}><X size={18} className="text-slate-400" /></button>
                  </div>
                  <button className="w-full py-3 bg-red-500 rounded font-bold" onClick={() => { setData(prev => ({ ...prev, user: { ...prev.user, xp: 0, level: 10 } })); setShowResetModal(false); showToast('Resetado!', 'success'); }}>Confirmar Reset de XP</button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <CalendarDays size={22} className="text-green-400" />
              <h1 className="text-2xl font-bold text-white">Atividade</h1>
              <button onClick={() => setShowResetModal(true)} className="ml-auto px-3 py-2 bg-slate-800 text-slate-400 rounded-lg hover:text-red-400"><RotateCcw size={16} /> Resetar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <StreakDisplay studyLogs={data.studyLogs} />
              <XPHistory user={data.user} />
            </div>
            <div className="rounded-2xl p-6 border border-white/10 bg-slate-900/60 backdrop-blur-sm">
              <ActivityHeatmap studyLogs={data.studyLogs} />
            </div>
            <AchievementsGrid unlockedIds={data.user?.achievements || []} stats={{}} />
          </div>
        )}
        {activeTab === 'retention' && (
          <RetentionPanel categories={data.categories} onSelectCategory={(cat) => {
            const targetTaskId = cat.selectedTask ? cat.selectedTask.id : cat.tasks?.[0]?.id;
            if (targetTaskId) startStudying(cat.id, targetTaskId);
            setPreviousTab('retention');
            setActiveTab('pomodoro');
          }} />
        )}
        {activeTab === 'notes' && (
          <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={data.categories} />
            <ParetoAnalysis categories={data.categories} />
          </div>
        )}
        {activeTab === 'help' && (
          <>
            {(() => { setShowHelpGuide(true); setActiveTab('dashboard'); return null; })()}
          </>
        )}
      </main>
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => <Toast key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}
      </div>
      {/* NOVO: Usando dados do hook para o modal de Level Up */}
      {levelUpData && <LevelUpToast level={levelUpData.level} title={levelUpData.title} onClose={closeLevelUpToast} />}
      <HelpGuide isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
    </div>
  );
}

export default App;