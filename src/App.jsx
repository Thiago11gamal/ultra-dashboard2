import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import HelpGuide from './components/HelpGuide';
import Toast from './components/Toast';
import LevelUpToast from './components/LevelUpToast';
import OnboardingTour from './components/OnboardingTour';
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
const Paywall = lazyWithRetry(() => import('./components/Paywall'));

import { useAuth } from './context/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { useAppStore } from './store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useCloudSync } from './hooks/useCloudSync';
import { useToast } from './hooks/useToast';
import useMobileDetect from './hooks/useMobileDetect';
import { useGlobalToasts } from './hooks/useGlobalToasts';
import { useLevelUp } from './hooks/useLevelUp';
import { useThemeSync } from './hooks/useThemeSync';
import { parseImportedData } from './utils/backupManager';
import { exportData } from './data/initialData';
import useIdleLogout from './hooks/useIdleLogout';
import { normalize } from './utils/normalization';


import './components/Loading.css';

function MainLayout() {
  const { currentUser, loading, logout } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription(currentUser);
  const location = useLocation();

  const activeContestId = useAppStore(state => state.appState.activeId);
  const contests = useAppStore(useShallow(state => state.appState.contests));
  
  // Use a stable reference for cloud sync without forcing re-renders on every state tick
  // by only selecting the properties that actually need to trigger a sync cycle.
  const syncTrigger = useAppStore(useShallow(state => ({
    version: state.appState.version,
    lastUpdated: state.appState.lastUpdated
  })));
  
  // Seletores estáveis para evitar re-renderizações excessivas
  const data = contests[activeContestId];
  const contestsCount = Object.keys(contests).length;
  const hasActiveData = !!data;
  const firstContestId = Object.keys(contests)[0];

  const setAppState = useAppStore(state => state.setAppState);
  const switchContest = useAppStore(state => state.switchContest);
  const createNewContest = useAppStore(state => state.createNewContest);
  const deleteContest = useAppStore(state => state.deleteContest);
  const updateUserName = useAppStore(state => state.updateUserName);
  const undo = useAppStore(state => state.undo);
  const setThemeMode = useAppStore(state => state.setThemeMode);
  const safelyMergeDuplicates = useAppStore(state => state.safelyMergeDuplicates);

  const isMobile = useMobileDetect();

  // Custom Hooks para lógica global
  const { toasts, removeToast } = useGlobalToasts();
  const { levelUpData, clearLevelUp } = useLevelUp();
  const showToast = useToast();

  // --- AUTO-LOGOUT (60 MIN INACTIVITY) ---
  // BUG-FIX: Increased from 20 to 60 to safely handle Pomodoro sessions (25m + break)
  useIdleLogout(logout, 60 * 60 * 1000);

  // Handle cross-tab sync using real-time listener inside sync context
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Auto-save pipeline - now uses the full state from the store's internal reference
  // to avoid re-rendering MainLayout on every minor update (like Pomodoro ticks)
  const { cloudStatus, cloudError, isSyncing: isCloudSyncing, hasConflict, forcePullCloud } = useCloudSync(
    currentUser, 
    useAppStore.getState().appState, 
    setAppState, 
    showToast,
    syncTrigger // Pass trigger to notify hook of changes
  );

  // --- THEME SYNC ---
  useThemeSync(data?.settings?.darkMode);

  // --- RESCUE NOTIFICATION ---
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__ULTRA_RESCUE_SUCCESS) {
      showToast('Dados de "Direito" recuperados do armazenamento profundo! 💎📚', 'success');
      delete window.__ULTRA_RESCUE_SUCCESS;
    }
  }, [showToast]);

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
      // FIX: Pequeno delay para garantir que o toast de "A processar" seja renderizado antes do bloqueio da CPU
      setTimeout(() => {
        try {
          const currentAppState = useAppStore.getState().appState;
          const result = parseImportedData(e.target.result, currentAppState);
          setAppState(result.data);
          showToast('Backup restaurado com sucesso! ✨', 'success');
        } catch (err) {
          console.error("Import Error:", err);
          showToast(`Erro no Backup: ${err.message}`, 'error');
        }
      }, 100);
    };
    
    showToast('A processar backup... ⏳', 'info');
    reader.readAsText(file);
  }, [setAppState, showToast]);

  const handleExport = useCallback(() => {
    exportData(useAppStore.getState().appState);
    showToast('Backup exportado!', 'success');
  }, [showToast]);

  const handleCloudRestore = useCallback((d) => {
    if (d) {
      setAppState(d);
      showToast('Restaurado da Nuvem!', 'success');
    }
  }, [setAppState, showToast]);


  // Derived States are now handled by store selectors at the top of the component

  useEffect(() => {
    // -------------------------------------------------------------------------
    // CONTEST CONSISTENCY CHECK (Runs for both Guest & Auth users)
    // -------------------------------------------------------------------------
    if (!hasActiveData) {
        if (contestsCount > 0 && firstContestId) {
            console.warn("[Sanity] Store inconsistency: Active contest missing. Recovering activeId...");
            switchContest(firstContestId);
        } else {
            console.warn("[Sanity] No contests found. Creating default...");
            createNewContest();
        }
    } else if (contestsCount > 1 && !contests[activeContestId]) {
        console.warn("[Sanity] ActiveId points to deleted contest. Switching to first available...");
        // This is safe since firstContestId is derived from Object.keys(contests)
        if (firstContestId) switchContest(firstContestId);
    } else if (hasActiveData) {
        // -------------------------------------------------------------------------
        // CATEGORICAL DEDUPLICATION PASS (Runs unconditionally when store is active)
        // -------------------------------------------------------------------------
        const categories = data.categories || [];
        const names = categories.map(c => normalize(c.name));
        const hasDuplicates = names.length !== new Set(names).size;
        
        if (hasDuplicates) {
            console.warn("[Sanity] Duplicates detected, triggering merge...");
            const oldLen = categories.length;
            safelyMergeDuplicates();
            const newLen = useAppStore.getState().appState.contests[activeContestId]?.categories?.length || 0;
            
            if (newLen < oldLen) {
                showToast(`Dados reparados: ${oldLen - newLen} duplicidade(s) removida(s). ✨`, 'success');
            }
        }
    }
  }, [hasActiveData, contestsCount, activeContestId, firstContestId, switchContest, createNewContest, contests, safelyMergeDuplicates, showToast]);

  if (loading || subLoading) return (
    <div className="flex items-center justify-center p-20 text-purple-400 min-h-screen bg-[#0f172a]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
  );
  if (!currentUser) return <Login />;

  // ── Stripe Paywall Guard ──
  // A verificação de assinatura agora atua como um Overlay impenetrável
  // para não quebrar a árvore de hidratação do React Router.

  if (!data) return <div className="loading-screen">Carregando Store...</div>;

  return (
    <div suppressHydrationWarning className="min-h-screen text-slate-200 font-sans selection:bg-purple-500/30 relative overflow-x-hidden w-full max-w-[100vw]">
      {!isPremium ? (
        <div className="fixed inset-0 z-[99999] bg-[#0a0f1e]">
          <Suspense fallback={null}>
            <Paywall user={currentUser} onLogout={logout} />
          </Suspense>
        </div>
      ) : (
        <>
          <Sidebar
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            user={data.user}
            isMobile={isMobile}
            onOpenHelp={() => setShowHelpGuide(true)}
          />

          <main className="pt-24 md:pt-0 px-3 sm:px-6 lg:px-8 pb-20 transition-[padding] duration-300 w-full max-w-[100vw] overflow-x-hidden">
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
              cloudStatus={{
                status: cloudStatus,
                error: cloudError,
                syncing: isCloudSyncing,
                hasConflict,
                forcePull: forcePullCloud
              }}
              onExport={handleExport}
              onImport={handleImport}
              onThemeChange={setThemeMode}
            />

            {/* Router Outlet com carregamento otimizado */}
            <div className="animate-page-entrance">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center p-20 text-purple-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                  </div>
                }>
                  <Routes location={location}>
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
              </ErrorBoundary>
            </div>
          </main>
          
          <HelpGuide isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
          <OnboardingTour />
        </>
      )}

      {levelUpData && (
        <LevelUpToast
          key={levelUpData.level}
          level={levelUpData.level}
          title={levelUpData.title}
          onClose={clearLevelUp}
        />
      )}

      {/* Global Event Driven Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              toast={toast}
              onClose={() => removeToast(toast.id)}
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