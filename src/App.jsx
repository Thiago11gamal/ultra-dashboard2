import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import MobilePocketMode from './components/MobilePocketMode';
import HelpGuide from './components/HelpGuide';
import Toast from './components/Toast';
import LevelUpToast from './components/LevelUpToast';

import Dashboard from './pages/Dashboard';
import Pomodoro from './pages/Pomodoro';
import Tasks from './pages/Tasks';
import Simulados from './pages/Simulados';
import Stats from './pages/Stats';
import Evolution from './pages/Evolution';
import Coach from './pages/Coach';
import History from './pages/History';
import Activity from './pages/Activity';
import Retention from './pages/Retention';
import Notes from './pages/Notes';

import { useAuth } from './context/useAuth';
import { useAppStore } from './store/useAppStore';
import { useCloudSync } from './hooks/useCloudSync';
import { useGamification } from './hooks/useGamification';
import { useToast } from './hooks/useToast';
import useMobileDetect from './hooks/useMobileDetect';
import { parseImportedData } from './utils/backupManager';
import { exportData } from './data/initialData';

import './components/Loading.css';

function MainLayout() {
  const { currentUser } = useAuth();
  const data = useAppStore(state => state.data);
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
    deleteContest
  } = useAppStore();

  const isMobile = useMobileDetect();
  const [forceDesktopMode, setForceDesktopMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  const showToast = useToast();
  const { levelUpData, closeLevelUpToast } = useGamification(showToast);

  // Auto-save pipeline
  useCloudSync(currentUser, appState, showToast);

  // Global Handlers
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

  // Derived States
  const activeContestId = appState?.activeId || 'default';
  const contests = appState?.contests || {};

  if (!currentUser) return <Login />;
  if (!data) return <div className="loading-screen">Carregando Store...</div>;

  if (isMobile && !forceDesktopMode) {
    return (
      <MobilePocketMode
        user={data.user}
        data={data}
        activeSubject={null}
        actions={{
          updatePomodoroSettings,
          finishStudying: () => { },
          startStudying: () => { },
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

      <main className="px-6 lg:px-8 pt-20 pb-16 transition-all duration-300 w-full overflow-x-hidden">
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
          currentData={data}
          appState={appState}
        />

        {/* Router Outlet Substitute via Native Route Matching Below */}
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
      </main>

      {/* Global Modals & Toasts */}
      {levelUpData && <LevelUpToast level={levelUpData.level} title={levelUpData.title} onClose={closeLevelUpToast} />}
      <HelpGuide isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
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