import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import HelpGuide from './components/HelpGuide';
import Toast from './components/Toast';
import LevelUpToast from './components/LevelUpToast';
import { lazyWithRetry } from './utils/lazyRetry';

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
const Sessions = lazyWithRetry(() => import('./pages/Sessions'));

import { useAuth } from './context/useAuth';
import { useAppStore } from './store/useAppStore';
import { useCloudSync } from './hooks/useCloudSync';
import { useToast } from './hooks/useToast';
import useMobileDetect from './hooks/useMobileDetect';
import { parseImportedData } from './utils/backupManager';
import { exportData } from './data/initialData';
import { isConfigValid, missingVars, availableKeys } from './services/firebase';

import './components/Loading.css';

function MainLayout() {
  const { currentUser } = useAuth();
  const data = useAppStore(state => state.appState.contests[state.appState.activeId]);
  const appState = useAppStore(state => state.appState);
  // BUG 9 FIX: desestruturar setAppState junto com as outras ações para garantir referência estável
  const {
    setAppState,
    switchContest,
    createNewContest,
    deleteContest,
    updateUserName,
    undo
  } = useAppStore();

  const isMobile = useMobileDetect();

  // Handle cross-tab sync using real-time listener inside sync context
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Global Toasts State
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const newToast = { id: crypto.randomUUID(), ...e.detail };
      setToasts(prev => [...prev, newToast]);
    };
    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  const showToast = useToast();

  // Auto-save pipeline
  const { cloudConnected, isSyncing: isCloudSyncing, hasConflict, forcePull } = useCloudSync(currentUser, appState, setAppState, showToast);

  // Global Handlers
  const handleUndo = useCallback(() => {
    undo();
    showToast('Ação desfeita! ↩️', 'info');
  }, [undo, showToast]);

  const handleImport = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseImportedData(e.target.result, appState);
        setAppState(result.data);
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

  return (
    <div suppressHydrationWarning className="min-h-screen text-slate-200 font-sans selection:bg-purple-500/30">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={data.user}
        isMobile={isMobile}
        onOpenHelp={() => setShowHelpGuide(true)}
      />

      <main className="px-3 sm:px-6 lg:px-8 pb-20 transition-all duration-300 w-full overflow-x-hidden">
        {/* Mobile spacer: pushes content below the fixed top nav bar */}
        <div className="h-7 md:hidden" aria-hidden="true" />
        {/* Desktop spacer - removed */}
        <Header
          user={data.user}
          settings={data.settings}
          contests={appState.contests}
          activeContestId={appState.activeId}
          onSwitchContest={switchContest}
          onCreateContest={createNewContest}
          onDeleteContest={deleteContest}
          onUndo={handleUndo}
          onCloudRestore={handleCloudRestore}
          onUpdateName={updateUserName}
          currentData={data}
          appState={appState}
          cloudStatus={{
            connected: cloudConnected,
            syncing: isCloudSyncing,
            hasConflict,
            forcePull
          }}
          onExport={handleExport}
          onImport={handleImport}
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
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/heatmap" element={<Activity />} />
            <Route path="/retention" element={<Retention />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Modals & Toasts */}
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
      {!isConfigValid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#ef4444',
          color: 'white',
          padding: '12px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 'bold',
          lineHeight: '1.4',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          borderBottom: '2px solid rgba(255,255,255,0.3)'
        }}>
          ⚠️ AMBIENTE INCOMPLETO EM {import.meta.env.MODE.toUpperCase()}<br />
          Faltam: [{missingVars.join(', ')}]<br />
          <strong style={{ fontSize: '12px', color: '#ffedd5', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>
            Após salvar na Vercel, você PRECISA clicar em "REDEPLOY" na aba Deployments.
          </strong><br />
          <small style={{ opacity: 0.8, fontSize: '9px' }}>Detectados: {availableKeys.length} itens. Vercel System Vars: {availableKeys.filter(k => k.includes('VERCEL')).length}</small>
        </div>
      )}
      <MainLayout />
    </Router>
  );
}

export default App;