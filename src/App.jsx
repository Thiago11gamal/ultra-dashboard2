import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import HelpGuide from './components/HelpGuide';
import Toast from './components/Toast';
import LevelUpToast from './components/LevelUpToast';
import OnboardingTour from './components/OnboardingTour';
import TrashModal from './components/TrashModal';
import { lazyWithRetry } from './utils/lazyRetry';

// Página Principal (Dashboard) - Lazy Loading para otimizar o bundle inicial
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));

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

import { useGlobalToasts } from './hooks/useGlobalToasts';
import { useLevelUp } from './hooks/useLevelUp';
import { useThemeSync } from './hooks/useThemeSync';
import { parseImportedData } from './utils/backupManager';
import { exportData } from './data/initialData';
import useIdleLogout from './hooks/useIdleLogout';



import './components/Loading.css';

function MainLayout() {
  const { currentUser, loading, logout } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription(currentUser);

  const activeContestId = useAppStore(state => state.appState.activeId);

  // Otimização: Seletores estáveis e granulares para evitar re-renderizações massivas
  const contestsMetaSelector = useShallow(state => {
    return Object.keys(state.appState.contests).reduce((acc, key) => {
      acc[key] = state.appState.contests[key]?.contestName || 'Sem nome';
      return acc;
    }, {});
  });
  const contestsMetaList = useAppStore(contestsMetaSelector);

  const headerDataSelector = useShallow(state => {
    const contest = state.appState.contests[activeContestId];
    return {
      exists: !!contest,
      user: contest?.user,
      settings: contest?.settings
    };
  });
  const headerData = useAppStore(headerDataSelector);

  const syncTriggerSelector = useShallow(state => ({
    version: state.appState.version,
    lastUpdated: state.appState.lastUpdated
  }));
  const syncTrigger = useAppStore(syncTriggerSelector);


  const setAppState = useAppStore(state => state.setAppState);
  const switchContest = useAppStore(state => state.switchContest);
  const createNewContest = useAppStore(state => state.createNewContest);
  const deleteContest = useAppStore(state => state.deleteContest);
  const updateUserName = useAppStore(state => state.updateUserName);
  const undo = useAppStore(state => state.undo);


  // Custom Hooks para lógica global
  const { toasts, removeToast } = useGlobalToasts();
  const { levelUpData, clearLevelUp } = useLevelUp();
  const showToast = useToast();

  // --- AUTO-LOGOUT (60 MIN INACTIVITY) ---
  // BUG-FIX: Increased from 20 to 60 to safely handle Pomodoro sessions (25m + break)
  useIdleLogout(logout, 60 * 60 * 1000);

  // Handle cross-tab sync using real-time listener inside sync context
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [trashOpen, setTrashOpen] = useState(false);
  const rescueAttemptsRef = useRef(0);
  const [isStoreHydrated, setIsStoreHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsubHydrate = useAppStore.persist.onHydrate(() => {
      setIsStoreHydrated(false);
    });

    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => {
      setIsStoreHydrated(true);
    });

    setIsStoreHydrated(useAppStore.persist.hasHydrated());

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  // Auto-save pipeline
  const { cloudStatus, cloudError, isSyncing: isCloudSyncing, hasConflict, forcePullCloud } = useCloudSync(
    isStoreHydrated ? currentUser : null,
    setAppState,
    showToast,
    syncTrigger // Pass trigger to notify hook of changes (version/lastUpdated)
  );

  // --- THEME SYNC ---
  useThemeSync(headerData.settings?.darkMode);

  // --- RESCUE NOTIFICATION & DASHBOARD RESCUE ---
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__ULTRA_RESCUE_SUCCESS) {
      showToast('Dados de "Direito" recuperados do armazenamento profundo! 💎📚', 'success');
      delete window.__ULTRA_RESCUE_SUCCESS;
    }

    // DASHBOARD RESCUE: If hydrated but activeId points to nowhere, pick the first available contest
    // Anti-loop protection: limit to 3 attempts
    if (isStoreHydrated && !headerData.exists && rescueAttemptsRef.current < 3) {
      const keys = Object.keys(contestsMetaList || {});
      if (keys.length > 0) {
        console.warn("[Rescue] Concurso ativo inválido ou removido. Selecionando fallback:", keys[0]);
        rescueAttemptsRef.current += 1;
        switchContest(keys[0]);
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.__ULTRA_RESCUE_SUCCESS) {
        delete window.__ULTRA_RESCUE_SUCCESS;
      }
    };
  }, [showToast, isStoreHydrated, headerData.exists, contestsMetaList, switchContest]);

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
      showToast('A processar backup... ⏳', 'info');

      // Joga o processamento pesado para o final da fila de eventos, 
      // deixando a animação do Toast ocorrer fluida.
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
      }, 50); // Delay mínimo de 50ms resolve o congelamento da UI
    };

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

  // BUG-06 FIX: Removed useless useMemo. It used location.pathname as dep,
  // so it re-created on every navigation — exactly when Routes re-renders anyway.
  const routesContent = (
    <div className="animate-page-entrance">
      <ErrorBoundary>
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
      </ErrorBoundary>
    </div>
  );


  // ── Render Logic ──
  return (
    <div suppressHydrationWarning className="min-h-screen text-slate-200 font-sans selection:bg-purple-500/30 relative overflow-x-hidden w-full max-w-[100vw]">
      {(loading || subLoading || !isStoreHydrated) ? (
        <div className="flex items-center justify-center p-20 text-purple-400 min-h-screen bg-[#0f172a]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : !currentUser ? (
        <Login />
      ) : !headerData.exists ? (
        <div className="loading-screen">Carregando Store...</div>
      ) : (
        <>
          {!isPremium ? (
            <div className="fixed inset-0 z-[99999] bg-[#0a0f1e]">
              <Suspense fallback={null}>
                <Paywall user={currentUser} onLogout={logout} />
              </Suspense>
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-[auto_1fr] w-full h-screen overflow-hidden">
              <Sidebar
                onOpenHelp={() => setShowHelpGuide(true)}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen((prev) => !prev)}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                contests={contestsMetaList}
                activeContestId={activeContestId}
                onSwitchContest={switchContest}
                onCreateContest={createNewContest}
                onDeleteContest={deleteContest}
                onOpenTrash={() => setTrashOpen(true)}
                onCloseMobile={() => setIsSidebarOpen(false)}
              />

              <div className="flex flex-col h-screen w-full min-w-0 relative">
                <Header
                  user={headerData.user}
                  settings={headerData.settings}
                  contests={contestsMetaList}
                  activeContestId={activeContestId}
                  onSwitchContest={switchContest}
                  onCreateContest={createNewContest}
                  onDeleteContest={deleteContest}
                  onUndo={handleUndo}
                  onCloudRestore={handleCloudRestore}
                  onUpdateName={updateUserName}
                  currentData={{}}
                  cloudStatus={{
                    status: cloudStatus,
                    error: cloudError,
                    syncing: isCloudSyncing,
                    hasConflict,
                    forcePull: forcePullCloud
                  }}
                  onExport={handleExport}
                  onImport={handleImport}

                  onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                  sidebarCollapsed={sidebarCollapsed}
                  setSidebarCollapsed={setSidebarCollapsed}
                  onOpenTrash={() => setTrashOpen(true)}
                />

                <TrashModal isOpen={trashOpen} onClose={() => setTrashOpen(false)} />

                {/* Spacer para o header fixo no mobile */}
                <div className="lg:hidden h-[65px] flex-shrink-0" />

                <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-10 mt-0 pt-0 overflow-y-auto overflow-x-auto custom-scrollbar relative z-0">
                  {routesContent}
                </main>
                <HelpGuide isOpen={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
                <OnboardingTour />
              </div>
            </div>
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
        </>
      )}
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