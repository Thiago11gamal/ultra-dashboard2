import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import MobilePocketMode from './components/MobilePocketMode';
import HelpGuide from './components/HelpGuide';
import Toast from './components/Toast';
import LevelUpToast from './components/LevelUpToast';

import Dashboard from './pages/Dashboard';

// Páginas pesadas com carregamento diferido (Lazy Loading)
const Pomodoro = lazyWithRetry(() => import('./pages/Pomodoro'));
const Tasks = lazyWithRetry(() => import('./pages/Tasks'));
const Simulados = lazyWithRetry(() => import('./pages/Simulados'));
const Stats = lazyWithRetry(() => import('./pages/Stats'));
const Evolution = lazyWithRetry(() => import('./pages/Evolution'));
const Coach = lazyWithRetry(() => import('./pages/Coach'));
const History = lazyWithRetry(() => import('./pages/History'));
const Activity = lazyWithRetry(() => import('./pages/Activity'));
const Retention = lazyWithRetry(() => import('./pages/Retention'));
const Notes = lazyWithRetry(() => import('./pages/Notes'));

import { useAuth } from './context/useAuth';
import { useAppStore } from './store/useAppStore';
import { useCloudSync } from './hooks/useCloudSync';
import { useGamification } from './hooks/useGamification';
import { useToast } from './hooks/useToast';
import useMobileDetect from './hooks/useMobileDetect';
import { parseImportedData } from './utils/backupManager';
import { exportData } from './data/initialData';
import { lazyWithRetry } from './utils/lazyRetry';

import './components/Loading.css';

function MainLayout() {
  const { currentUser } = useAuth();
  const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
  const appState = useAppStore(state => state.appState);
  const setAppState = useAppStore(state => state.setAppState);
  const {
    updatePomodoroSettings,
    handleUpdateStudyTime,
    toggleTask,
    deleteTask,
    addTask,
    addCategory,
    deleteCategory,
    togglePriority,
    switchContest,
    createNewContest,
    deleteContest,
    updateUserName
  } = useAppStore();

  const isMobile = useMobileDetect();
  const [forceDesktopMode, setForceDesktopMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [mobileActiveSubject, setMobileActiveSubject] = useState(null);

  // Global Toasts State
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const newToast = { id: Date.now() + Math.random(), ...e.detail };
      setToasts(prev => [...prev, newToast]);
    };
    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  const showToast = useToast();
  const { levelUpData, closeLevelUpToast } = useGamification(showToast);

  // Auto-save pipeline
  const { cloudConnected, isSyncing: isCloudSyncing } = useCloudSync(currentUser, appState, setAppState, showToast);

  // Global Handlers
  const handleUndo = useCallback(() => {
    setAppState(prev => {
      if (!prev.history || prev.history.length === 0) return prev;
      const newHistory = [...prev.history];
      const snapshot = newHistory.pop();
      const targetId = snapshot.contestId || prev.activeId;

      if (snapshot.contests) {
        // Full app state restore
        return {
          ...prev,
          contests: snapshot.contests,
          activeId: snapshot.activeId,
          history: newHistory
        };
      }

      // Single contest restore
      return {
        ...prev,
        activeId: targetId,
        history: newHistory,
        contests: { ...prev.contests, [targetId]: snapshot.data || snapshot }
      };
    });
    showToast('Ação desfeita! ↩️', 'info');
  }, [setAppState, showToast]);

  const handleImport = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseImportedData(e.target.result, appState);
        if (result.type === 'FULL_RESTORE') {
          setAppState(result.data);
        } else {
          setAppState(result.data);
        }
        showToast('Backup restaurado com sucesso!', 'success');
      } catch (err) {
        console.error("Import Error:", err);
        showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);
  }, [appState, setAppState, showToast]);

  const handleExport = useCallback(() => {
    exportData(appState);
    showToast('Backup exportado!', 'success');
  }, [appState, showToast]);

  const handleCloudRestore = useCallback((d) => {
    if (d) {
      setAppState(d);
      showToast('Restaurado da Nuvem!', 'success');
    }
  }, [setAppState, showToast]);

  const handleMobileStartStudying = useCallback((categoryId, taskId) => {
    const activeData = appState?.contests?.[appState?.activeId];
    if (!activeData || !activeData.categories) return;

    const cat = activeData.categories.find(c => c.id === categoryId);
    const tsk = cat?.tasks?.find(t => t.id === taskId);

    if (cat && tsk) {
      setMobileActiveSubject({
        categoryId: cat.id,
        taskId: tsk.id,
        category: cat.name,
        task: tsk.title,
        priority: tsk.priority,
        sessionInstanceId: Date.now()
      });

      // Update store to reflect the UI state
      useAppStore.getState().setData(prev => {
        if (!prev || !prev.categories) return prev;
        return {
          ...prev,
          categories: prev.categories.map(c => ({
            ...c,
            tasks: c.tasks.map(t => {
              if (t.id === taskId && c.id === categoryId) return { ...t, status: 'studying' };
              if (t.status === 'studying') return { ...t, status: undefined };
              return t;
            })
          }))
        };
      });
      showToast(`Iniciando estudos: ${cat.name} - ${tsk.title} `, 'success');
    }
  }, [appState, showToast]);

  const handleMobileFinishStudying = useCallback(() => {
    if (mobileActiveSubject) {
      const activeData = appState?.contests?.[appState?.activeId];
      const cat = activeData?.categories?.find(c => c.id === mobileActiveSubject.categoryId);
      const tsk = cat?.tasks?.find(t => t.id === mobileActiveSubject.taskId);

      if (tsk && !tsk.completed) {
        useAppStore.getState().toggleTask(mobileActiveSubject.categoryId, mobileActiveSubject.taskId);
      }
      showToast('Ciclo de foco finalizado! Elevando produtividade.', 'info');

      useAppStore.getState().setData(prev => {
        if (!prev || !prev.categories) return prev;
        return {
          ...prev,
          categories: prev.categories.map(c => c.id === mobileActiveSubject.categoryId ? {
            ...c,
            tasks: c.tasks.map(t => t.id === mobileActiveSubject.taskId ? { ...t, status: undefined } : t)
          } : c)
        };
      });
    }
    setMobileActiveSubject(null);
  }, [mobileActiveSubject, appState, showToast]);

  // Derived States
  const activeContestId = appState?.activeId || 'default';
  const contests = React.useMemo(() => appState?.contests || {}, [appState?.contests]);

  // Safety: If store is loaded but active contest is missing, recover in an effect (not during render)
  useEffect(() => {
    if (currentUser && !data && Object.keys(contests).length > 0) {
      const firstAvailableId = Object.keys(contests)[0];
      if (firstAvailableId && firstAvailableId !== activeContestId) {
        console.warn("Store inconsistency detected. Attempting to recover activeId...");
        switchContest(firstAvailableId);
      }
    }
  }, [currentUser, data, contests, activeContestId, switchContest]);

  if (!currentUser) return <Login />;
  if (!data) return <div className="loading-screen">Carregando Store...</div>;

  if (isMobile && !forceDesktopMode) {
    return (
      <MobilePocketMode
        user={data.user}
        data={data}
        activeSubject={mobileActiveSubject}
        actions={{
          updatePomodoroSettings,
          finishStudying: handleMobileFinishStudying,
          startStudying: handleMobileStartStudying,
          handleUpdateStudyTime,
          toggleTask,
          deleteTask,
          addTask,
          addCategory,
          deleteCategory,
          togglePriority
        }}
        onExitPocketMode={() => setForceDesktopMode(true)}
      />
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen text-slate-200 font-sans selection:bg-purple-500/30">
      <Sidebar
        onExport={handleExport}
        onImport={handleImport}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={data.user}
        isMobile={isMobile}
        onOpenHelp={() => setShowHelpGuide(true)}
      />

      <main className="px-6 lg:px-8 pt-28 pb-16 transition-all duration-300 w-full overflow-x-hidden">
        <Header
          user={data.user}
          settings={data.settings}
          contests={contests}
          activeContestId={activeContestId}
          onSwitchContest={switchContest}
          onCreateContest={createNewContest}
          onDeleteContest={deleteContest}
          onUndo={handleUndo}
          onCloudRestore={handleCloudRestore}
          onUpdateName={updateUserName}
          currentData={data}
          appState={appState}
        />

        {/* Router Outlet com carregamento otimizado */}
        <Suspense fallback={
          <div className="flex items-center justify-center p-20 text-purple-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/simulados" element={<Simulados />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/evolution" element={<Evolution />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/history" element={<History />} />
            <Route path="/heatmap" element={<Activity />} />
            <Route path="/retention" element={<Retention />} />
            <Route path="/notes" element={<Notes />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Modals & Toasts */}
      {levelUpData && <LevelUpToast level={levelUpData.level} title={levelUpData.title} onClose={closeLevelUpToast} />}
      <HelpGuide isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} />

      {/* Global Event Driven Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              toast={toast}
              onClose={() => setToasts(current => current.filter(t => t.id !== toast.id))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;