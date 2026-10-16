import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    LayoutDashboard,
    CheckSquare,
    BarChart3,
    Timer,
    FileText,
    BrainCircuit,
    Sparkles,
    CalendarDays,
    History,
    HelpCircle,
    Brain,
    TrendingUp,
    Clock,
    LogOut,
    X,
    Plus,
    Trash2,
    Settings,
    BookOpen,
    Calendar,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    Layers,
    Upload,
    Download
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import logo from '../assets/logo.png';
import { useAuth } from '../context/useAuth';
import './Sidebar.css';
import { del } from 'idb-keyval';
import { useAppStore, clearAllDataSecure } from '../store/useAppStore';
import { getContestDisplayName, isMenuItemActive } from './sidebarUtils';

const SECTIONS = [
    {
        label: 'Foco & Navegação',
        items: [
            { path: '/', label: 'Meu Painel', icon: LayoutDashboard, color: '#38bdf8' },
            { path: '/pomodoro', label: 'Cronômetro', icon: Timer, color: '#fb7185' },
            { path: '/tasks', label: 'Tarefas', icon: CheckSquare, color: '#fbbf24' },
            { path: '/sessions', label: 'Sessões', icon: Clock, color: '#34d399' },
        ]
    },
    {
        label: 'Central IA',
        items: [
            { path: '/coach', label: 'Coach IA', icon: Sparkles, color: '#c084fc', isAi: true },
            { path: '/simulados', label: 'Simulados IA', icon: BrainCircuit, color: '#60a5fa', isAi: true },
        ]
    },
    {
        label: 'Métricas & Análise',
        items: [
            { path: '/stats', label: 'Estatísticas', icon: BarChart3, color: '#818cf8' },
            { path: '/evolution', label: 'Evolução', icon: TrendingUp, color: '#f472b6' },
            { path: '/heatmap', label: 'Atividade', icon: CalendarDays, color: '#2dd4bf' },
            { path: '/history', label: 'Histórico', icon: History, color: '#94a3b8' },
            { path: '/retention', label: 'Retenção', icon: Brain, color: '#a78bfa' },
        ]
    },
    {
        label: 'Ferramentas de Estudo',
        items: [
            { path: '/flashcards', label: 'Flashcards', icon: BookOpen, color: '#f59e0b' },
            { path: '/agenda', label: 'Agenda de Estudos', icon: Calendar, color: '#14b8a6' },
            { path: '/notes', label: 'Notas', icon: FileText, color: '#fca5a5' },
        ]
    }
];

const getSidebarExtra = ({ isMeuPainel, isCronometro, isCoach, isAi, isPomodoroRunning }) => {
    if (isMeuPainel) return '(Início)';
    if (isCronometro) return isPomodoroRunning ? '(Em Foco ⏱️)' : '(Timer)';
    if (isCoach) return '(Mentor IA 🧠)';
    if (isAi) return '(IA)';
    return null;
};

const Sidebar = React.memo(function Sidebar({
    onOpenHelp,
    isOpen,
    onToggle,
    collapsed,
    setCollapsed,
    contests,
    activeContestId,
    onSwitchContest,
    onCreateContest,
    onDeleteContest,
    onOpenTrash,
    onCloseMobile,
    onExport,
    onImport
}) {
    const location = useLocation();
    const { logout } = useAuth();
    const [contestsExpanded, setContestsExpanded] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [flyoutMenu, setFlyoutMenu] = useState(null); // 'contests' | 'settings' | null
    const [flyoutAnchorRect, setFlyoutAnchorRect] = useState(null);
    const [hoveredTooltip, setHoveredTooltip] = useState(null);
    const [contestToDelete, setContestToDelete] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const isPomodoroRunning = useAppStore(state => state.appState?.pomodoro?.isRunning || false);

    const sidebarRef = useRef(null);
    const contestsFlyoutRef = useRef(null);
    const settingsFlyoutRef = useRef(null);
    const fileInputRef = useRef(null);

    const contestEntries = useMemo(() => Object.entries(contests || {}), [contests]);
    const isSingleContest = contestEntries.length <= 1;

    // Concurso ativo atual
    const activeContestName = useMemo(() => {
        if (!activeContestId || !contests) return 'Meu Painel';
        const raw = contests[activeContestId];
        return (typeof raw === 'string' && raw.trim()) ? raw : getContestDisplayName(raw) || 'Meu Painel';
    }, [activeContestId, contests]);

    // Fechar popovers e submenus quando recolher/expandir
    useEffect(() => {
        if (!collapsed) {
            setFlyoutMenu(null);
            setFlyoutAnchorRect(null);
            setHoveredTooltip(null);
            setSettingsExpanded(false);
        } else {
            setContestsExpanded(false);
            setSettingsExpanded(false);
        }
    }, [collapsed]);

    // Handlers para abrir/fechar Flyouts com posição de âncora fixa
    const handleToggleContestsFlyout = useCallback((e) => {
        if (collapsed) {
            if (flyoutMenu === 'contests') {
                setFlyoutMenu(null);
                setFlyoutAnchorRect(null);
            } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setFlyoutAnchorRect(rect);
                setFlyoutMenu('contests');
                setHoveredTooltip(null);
            }
        } else {
            setContestsExpanded(prev => !prev);
        }
    }, [collapsed, flyoutMenu]);

    const handleToggleSettingsFlyout = useCallback((e) => {
        if (collapsed) {
            if (flyoutMenu === 'settings') {
                setFlyoutMenu(null);
                setFlyoutAnchorRect(null);
            } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setFlyoutAnchorRect(rect);
                setFlyoutMenu('settings');
                setHoveredTooltip(null);
            }
        } else {
            setSettingsExpanded(prev => !prev);
        }
    }, [collapsed, flyoutMenu]);

    const handleTooltipEnter = useCallback((e, item, extraBadge = null) => {
        if (!collapsed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredTooltip({
            label: item.label,
            color: item.color || '#818cf8',
            extraBadge,
            rect
        });
    }, [collapsed]);

    const handleTooltipLeave = useCallback(() => {
        setHoveredTooltip(null);
    }, []);

    // Sincronizar variável CSS para largura do sidebar
    useEffect(() => {
        const width = collapsed ? '80px' : '280px';
        document.documentElement.style.setProperty('--sidebar-width', width);
    }, [collapsed]);

    // Se estiver em mobile e abrir o menu, garantir que não esteja recolhido
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isOpen && window.innerWidth < 1024 && collapsed) {
            setCollapsed(false);
        }
    }, [collapsed, isOpen, setCollapsed]);

    // Prevenir scroll do background no mobile quando o drawer estiver aberto
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isOpen && window.innerWidth < 1024) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Tratar cliques fora de popovers flutuantes no modo recolhido
    useEffect(() => {
        if (!flyoutMenu) return;
        const handleFlyoutClickOutside = (e) => {
            if (contestsFlyoutRef.current && contestsFlyoutRef.current.contains(e.target)) return;
            if (settingsFlyoutRef.current && settingsFlyoutRef.current.contains(e.target)) return;
            setFlyoutMenu(null);
        };
        document.addEventListener('mousedown', handleFlyoutClickOutside);
        return () => document.removeEventListener('mousedown', handleFlyoutClickOutside);
    }, [flyoutMenu]);

    // Mover foco para o primeiro item ao abrir no mobile
    useEffect(() => {
        if (isOpen && window.innerWidth < 1024) {
            const timer = setTimeout(() => {
                const firstItem = sidebarRef.current?.querySelector('a, button');
                if (firstItem) firstItem.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const closeMobileSidebar = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (window.innerWidth >= 1024) return;
        if (isOpen) {
            if (typeof onCloseMobile === 'function') onCloseMobile();
        }
    }, [isOpen, onCloseMobile]);

    // Tecla Escape para fechar popover ou drawer mobile
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            if (flyoutMenu) {
                setFlyoutMenu(null);
                e.stopPropagation();
                return;
            }
            if (isOpen) {
                closeMobileSidebar();
                e.stopPropagation();
            }
        }
    }, [flyoutMenu, isOpen, closeMobileSidebar]);

    const handleLogout = () => {
        setFlyoutMenu(null);
        setShowLogoutConfirm(true);
    };

    const handleConfirmLogout = async () => {
        try {
            await logout();
            useAppStore.getState().resetStore();
            await del('ultra-dashboard-storage');
            const appKeys = [
                'ultra-dashboard-storage',
                'ultra-sync-dirty',
                'pomodoroState',
                'pomodoro_muted',
                'focusPanelLocked',
                'pomodoroLayoutLocked',
                'hasSeenWelcomeScreen',
                'page-has-been-force-refreshed',
                'ultra_local_session',
                'coach_calibration_events_v1',
                'coach_flag_optimizer_state_v1',
                'coach_causal_model_v1',
                'coach_auto_tuner_history_v1',
                'coach_evaluation_results_v1',
                'coach_model_health_v1',
            ];
            appKeys.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                } catch { /* ignore */ }
            });
        } catch (err) {
            console.error("Erro ao sair", err);
        }
    };

    return (
        <>
            {/* Hidden Backup File Input */}
            <input 
                ref={fileInputRef} 
                type="file" 
                accept=".json" 
                onChange={onImport} 
                style={{ display: 'none' }} 
                tabIndex={-1} 
                aria-hidden="true" 
            />

            {/* Mobile Overlay com Z-index corrigido (z-125, abaixo da sidebar z-130 e acima do header mobile z-120) */}
            {isOpen && (
                <div
                    className="sidebar-mobile-overlay lg:hidden"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}

            <aside 
                ref={sidebarRef} 
                className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}
                role="navigation"
                aria-label="Menu principal de navegação"
                aria-expanded={!collapsed}
                onKeyDown={handleKeyDown}
            >
                {/* Logo Area & Direct Toggle */}
                <div className={`sidebar-header-area ${collapsed ? 'sidebar-header-collapsed' : ''}`}>
                    <Link
                        to="/"
                        className="sidebar-logo"
                        onClick={closeMobileSidebar}
                        title="Método Arraia"
                        onMouseEnter={(e) => handleTooltipEnter(e, { label: 'Método Arraia', color: '#818cf8' }, '(Início)')}
                        onMouseLeave={handleTooltipLeave}
                    >
                        <img src={logo} alt="Método Arraia" />
                        <div className="sidebar-logo-text">
                            <span>Método Arraia</span>
                        </div>
                    </Link>

                    {/* Botão de recolher/expandir direto na barra lateral no Desktop */}
                    <button
                        type="button"
                        className="sidebar-toggle-btn hidden lg:flex"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                        title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                        onMouseEnter={(e) => collapsed && handleTooltipEnter(e, { label: 'Expandir Menu', color: '#818cf8' })}
                        onMouseLeave={handleTooltipLeave}
                    >
                        {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={15} />}
                    </button>

                    {/* Botão de Fechar no Mobile */}
                    <button
                        type="button"
                        className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        onClick={onToggle}
                        aria-label="Fechar menu lateral"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="sidebar-divider"></div>

                {/* Nav Sections Scrollable Container */}
                <div 
                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
                    onScroll={() => {
                        setHoveredTooltip(null);
                        setFlyoutMenu(null);
                        setFlyoutAnchorRect(null);
                    }}
                >
                    {/* MEUS CONCURSOS / PAINÉIS SECTION */}
                    <div className="mb-2 relative sidebar-item-wrapper" ref={contestsFlyoutRef}>
                        <button
                            type="button"
                            onClick={handleToggleContestsFlyout}
                            className="sidebar-item sidebar-contest-card group justify-between tour-step-1"
                            aria-expanded={collapsed ? flyoutMenu === 'contests' : contestsExpanded}
                            aria-controls="sidebar-contests-panel"
                            aria-haspopup="true"
                            title={collapsed ? `Painel Ativo: ${activeContestName}` : undefined}
                            onMouseEnter={(e) => handleTooltipEnter(e, { label: 'Painéis de Estudo', color: '#8b5cf6' }, `(${activeContestName})`)}
                            onMouseLeave={handleTooltipLeave}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="sidebar-contest-icon-box relative">
                                    <Layers size={15} className="text-violet-400" />
                                    {activeContestId && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#05070f] animate-pulse" title="Painel Ativo" />
                                    )}
                                </div>
                                <div className="sidebar-item-text flex flex-col items-start !justify-center leading-tight truncate">
                                    <span className="text-[9px] font-bold text-violet-300/80 uppercase tracking-widest leading-none mb-0.5">
                                        Painel Ativo
                                    </span>
                                    <div className="flex items-center gap-1.5 w-full">
                                        <span className="font-bold text-slate-100 text-xs truncate">
                                            {activeContestName}
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Ativo" />
                                    </div>
                                </div>
                            </div>
                            {!collapsed && (
                                <ChevronDown 
                                    size={14} 
                                    className={`transition-transform duration-200 text-slate-400 shrink-0 ml-1 ${contestsExpanded ? 'rotate-180' : ''}`} 
                                />
                            )}
                        </button>

                        {/* Accordion suave baseado em CSS Grid para modo expandido (Zero stutter) */}
                        {!collapsed && (
                            <div 
                                id="sidebar-contests-panel" 
                                className={`sidebar-accordion ${contestsExpanded ? 'expanded' : ''}`}
                                role="region"
                            >
                                <div className="sidebar-accordion-inner">
                                    <div className="nested-container sidebar-contests-scroll-list space-y-1">
                                        {contestEntries.map(([id, contestData]) => {
                                            const name = (typeof contestData === 'string' && contestData.trim())
                                                ? contestData
                                                : getContestDisplayName(contestData) || "Meu Painel";
                                            const isActive = id === activeContestId;
                                            return (
                                                <div
                                                    key={id}
                                                    className="group relative w-full flex items-center"
                                                >
                                                    <button
                                                        type="button"
                                                        className={`sidebar-item !py-1.5 flex-1 min-w-0 text-left flex items-center ${isActive ? 'active' : ''}`}
                                                        title={name}
                                                        onClick={() => {
                                                            if (id !== activeContestId) onSwitchContest(id);
                                                            closeMobileSidebar();
                                                        }}
                                                    >
                                                        <div className="nested-item-marker"></div>
                                                        <Layers size={13} className={isActive ? "text-violet-400 shrink-0" : "text-slate-400 shrink-0"} />
                                                        <span className="flex-1 truncate text-[0.78rem] font-medium">{name}</span>
                                                        {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-emerald-400/50 shrink-0"></div>}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            if (!isSingleContest) setContestToDelete({ id, name });
                                                        }}
                                                        disabled={isSingleContest}
                                                        title={isSingleContest ? 'Mantenha ao menos um painel' : 'Mover para lixeira'}
                                                        className={`p-1 transition-all shrink-0 ${isSingleContest ? 'opacity-20 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 rounded'}`}
                                                        aria-label={`Excluir ${name}`}
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        <button
                                            type="button"
                                            className="sidebar-item !py-1.5 text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/15 relative border border-emerald-500/20"
                                            onClick={() => {
                                                onCreateContest();
                                                closeMobileSidebar();
                                            }}
                                            title="Criar Novo Painel"
                                        >
                                            <div className="nested-item-marker !bg-emerald-500/20"></div>
                                            <Plus size={13} className="text-emerald-400 shrink-0" />
                                            <span className="text-[0.78rem] text-emerald-300 font-semibold truncate">Criar Novo Painel</span>
                                        </button>

                                        {onImport && (
                                            <button
                                                type="button"
                                                className="sidebar-item !py-1.5 text-sky-400/90 hover:text-sky-300 hover:bg-sky-500/15 relative border border-sky-500/20"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    closeMobileSidebar();
                                                }}
                                                title="Importar Backup JSON"
                                            >
                                                <div className="nested-item-marker !bg-sky-500/20"></div>
                                                <Upload size={13} className="text-sky-400 shrink-0" />
                                                <span className="text-[0.78rem] text-sky-300 font-semibold truncate">Restaurar Backup (JSON)</span>
                                            </button>
                                        )}
                                        {onExport && (
                                            <button
                                                type="button"
                                                className="sidebar-item !py-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 relative"
                                                onClick={() => {
                                                    onExport();
                                                    closeMobileSidebar();
                                                }}
                                                title="Exportar Backup JSON"
                                            >
                                                <div className="nested-item-marker"></div>
                                                <Download size={13} className="text-slate-400 shrink-0" />
                                                <span className="text-[0.78rem] text-slate-300 font-medium truncate">Exportar Backup</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sidebar-divider"></div>

                    {/* SECTIONS LIST */}
                    {SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className={`mb-2.5 ${section.label === 'Métricas & Análise' || section.label === 'Dados & Análise' ? 'tour-step-2' : ''}`}>
                            <h4 className="sidebar-nav-label" id={`section-${sIdx}`}>{section.label}</h4>
                            <nav className="space-y-0.5" aria-labelledby={`section-${sIdx}`}>
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const currentPath = location.pathname;
                                    const isActive = isMenuItemActive(currentPath, item.path);
                                    const isMeuPainel = item.path === '/';
                                    const isCronometro = item.path === '/pomodoro';
                                    const isCoach = item.path === '/coach';

                                    return (
                                        <div key={item.path} className="sidebar-item-wrapper">
                                            <Link
                                                to={item.path}
                                                className={`sidebar-item focus-visible:outline-none ${isMeuPainel ? 'meu-painel-item' : ''} ${isCronometro ? 'cronometro-item' : ''} ${isCoach ? 'coach-ia-item' : ''} ${item.isAi ? 'ai-menu-item' : ''} ${isActive ? 'active' : ''} ${item.path === '/pomodoro' ? 'tour-step-3' : ''}`}
                                                aria-current={isActive ? "page" : undefined}
                                                style={{
                                                    '--item-color': item.color,
                                                    '--item-color-alpha': `${item.color}20`
                                                }}
                                                onClick={() => {
                                                    if (item.path === '/') {
                                                        sessionStorage.setItem('navigateToDashboard', 'true');
                                                    }
                                                    closeMobileSidebar();
                                                }}
                                                onMouseEnter={(e) => {
                                                    const extra = getSidebarExtra({ isMeuPainel, isCronometro, isCoach, isAi: item.isAi, isPomodoroRunning });
                                                    handleTooltipEnter(e, item, extra); // ✅ Chamada única
                                                }}
                                                onMouseLeave={handleTooltipLeave}
                                            >
                                                <div className="sidebar-item-icon-wrapper relative">
                                                    <Icon aria-hidden="true" size={16} />
                                                    {isCronometro && isPomodoroRunning && (
                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#05070f] animate-pulse" title="Sessão em andamento" />
                                                    )}
                                                </div>
                                                <div className="sidebar-item-text">
                                                    <span className="sidebar-item-label">{item.label}</span> {/* ✅ Label único */}
                                                    {isCronometro && isPomodoroRunning && <span className="cronometro-badge">Em foco</span>}
                                                    {isMeuPainel && isActive && (
                                                        <span className="meu-painel-badge">Início</span>
                                                    )}
                                                    {isCoach && (
                                                        <div className="flex items-center gap-1.5 ml-auto">
                                                            {isActive ? (
                                                                <span className="coach-badge">IA</span>
                                                            ) : (
                                                                <span className="coach-badge-idle">IA</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isCoach && item.isAi && (
                                                        <span className="ai-item-badge">IA</span>
                                                    )}
                                                    {isCronometro && !isPomodoroRunning && isActive && (
                                                        <div className="flex items-center gap-1.5 ml-auto">
                                                            <span className="cronometro-badge">Foco</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}
                </div>

                {/* FOOTER & CONFIGURAÇÕES */}
                <div className="sidebar-footer px-1">
                    <div className="sidebar-divider"></div>
                    <nav className="space-y-1">
                        {/* CONFIGURAÇÕES SECTION */}
                        <div className="mb-1 relative sidebar-item-wrapper" ref={settingsFlyoutRef}>
                            <button
                                type="button"
                                onClick={handleToggleSettingsFlyout}
                                className="sidebar-item group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5"
                                aria-expanded={collapsed ? flyoutMenu === 'settings' : settingsExpanded}
                                aria-controls="sidebar-settings-panel"
                                aria-haspopup="true"
                                onMouseEnter={(e) => handleTooltipEnter(e, { label: 'Configurações', color: '#94a3b8' })}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <div className="sidebar-item-icon-wrapper">
                                    <Settings size={15} className="text-slate-400" />
                                </div>
                                <div className="sidebar-item-text">
                                    <span className="font-semibold text-sm sidebar-item-label">Configurações</span>
                                    <ChevronDown 
                                        size={14} 
                                        className={`transition-transform duration-200 text-slate-400 ${settingsExpanded ? 'rotate-180' : ''}`} 
                                    />
                                </div>
                            </button>

                            {/* Accordion suave baseado em CSS Grid para modo expandido */}
                            {!collapsed && (
                                <div 
                                    id="sidebar-settings-panel" 
                                    className={`sidebar-accordion ${settingsExpanded ? 'expanded' : ''}`}
                                    role="region"
                                >
                                    <div className="sidebar-accordion-inner">
                                        <div className="pl-4 space-y-1 border-l border-white/5 ml-2.5 mt-1">
                                            <button
                                                type="button"
                                                className="sidebar-item !py-1.5 hover:!bg-red-500/10 text-red-300"
                                                onClick={() => {
                                                    onOpenTrash();
                                                    closeMobileSidebar();
                                                }}
                                                style={{ '--item-color': '#ef4444' }}
                                                title="Lixeira"
                                            >
                                                <Trash2 size={13} />
                                                <span className="text-[0.78rem]">Lixeira</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="sidebar-item !py-1.5 hover:!bg-sky-500/10 text-sky-300"
                                                onClick={() => {
                                                    onOpenHelp();
                                                    closeMobileSidebar();
                                                }}
                                                style={{ '--item-color': '#0ea5e9' }}
                                            >
                                                <HelpCircle size={13} />
                                                <span className="text-[0.78rem]">Ajuda</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="sidebar-item !py-1.5 hover:!bg-indigo-500/10 text-indigo-300"
                                                onClick={() => {
                                                    useAppStore.getState().setHasSeenTour(false);
                                                    closeMobileSidebar();
                                                }}
                                                style={{ '--item-color': '#818cf8' }}
                                                title="Reiniciar Tutorial"
                                            >
                                                <Sparkles size={13} />
                                                <span className="text-[0.78rem]">Reiniciar Tutorial</span>
                                            </button>

                                            {onImport && (
                                                <button
                                                    type="button"
                                                    className="sidebar-item !py-1.5 hover:!bg-sky-500/10 text-sky-300"
                                                    onClick={() => {
                                                        fileInputRef.current?.click();
                                                        closeMobileSidebar();
                                                    }}
                                                    style={{ '--item-color': '#38bdf8' }}
                                                    title="Importar Backup JSON"
                                                >
                                                    <Upload size={13} />
                                                    <span className="text-[0.78rem]">Restaurar Backup</span>
                                                </button>
                                            )}

                                            {onExport && (
                                                <button
                                                    type="button"
                                                    className="sidebar-item !py-1.5 hover:!bg-emerald-500/10 text-emerald-300"
                                                    onClick={() => {
                                                        onExport();
                                                        closeMobileSidebar();
                                                    }}
                                                    style={{ '--item-color': '#10b981' }}
                                                    title="Exportar Backup JSON"
                                                >
                                                    <Download size={13} />
                                                    <span className="text-[0.78rem]">Exportar Backup</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="sidebar-item !py-1.5 hover:!bg-red-500/20 text-red-400 font-bold"
                                                onClick={() => {
                                                    setShowResetConfirm(true);
                                                }}
                                                style={{ '--item-color': '#ef4444' }}
                                                title="Zerar a Conta Toda"
                                            >
                                                <Trash2 size={13} />
                                                <span className="text-[0.78rem]">Zerar Conta (Perigo)</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="sidebar-item logout-btn !py-1.5 hover:!bg-rose-500/10 text-rose-300"
                                                onClick={handleLogout}
                                                style={{ '--item-color': '#f43f5e' }}
                                            >
                                                <LogOut size={13} />
                                                <span className="text-[0.78rem]">Sair da Conta</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
            </aside>

            {/* PORTAL FIXED TOOLTIP (Zero clipping garantido) */}
            {typeof document !== 'undefined' && collapsed && hoveredTooltip && createPortal(
                <div
                    className="sidebar-portal-tooltip"
                    style={{
                        top: `${hoveredTooltip.rect.top + hoveredTooltip.rect.height / 2}px`,
                        left: `${hoveredTooltip.rect.right + 12}px`,
                        '--item-color': hoveredTooltip.color,
                        '--item-color-alpha': `${hoveredTooltip.color}25`
                    }}
                >
                    <span>{hoveredTooltip.label}</span>
                    {hoveredTooltip.extraBadge && (
                        <span className="text-[10px] font-normal text-slate-300">
                            {hoveredTooltip.extraBadge}
                        </span>
                    )}
                </div>,
                document.body
            )}

            {/* PORTAL FIXED FLYOUT POPOVER: CONCURSOS / PAINÉIS (Zero clipping garantido) */}
            {typeof document !== 'undefined' && collapsed && flyoutMenu === 'contests' && flyoutAnchorRect && createPortal(
                <>
                    <div 
                        className="sidebar-portal-flyout-overlay"
                        onClick={() => { setFlyoutMenu(null); setFlyoutAnchorRect(null); }}
                        aria-hidden="true"
                    />
                    <div 
                        className="sidebar-portal-flyout-popover" 
                        role="menu"
                        style={{
                            top: `${Math.max(12, Math.min(window.innerHeight - 320, flyoutAnchorRect.top))}px`,
                            left: `${flyoutAnchorRect.right + 12}px`
                        }}
                    >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Layers size={14} className="text-violet-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Painéis de Estudo</span>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => { setFlyoutMenu(null); setFlyoutAnchorRect(null); }}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5"
                                aria-label="Fechar painel"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {contestEntries.map(([id, contestData]) => {
                                const name = (typeof contestData === 'string' && contestData.trim())
                                    ? contestData
                                    : getContestDisplayName(contestData) || "Meu Painel";
                                const isActive = id === activeContestId;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                                            isActive 
                                                ? 'bg-violet-500/20 text-white font-bold border border-violet-500/30' 
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                        onClick={() => {
                                            if (id !== activeContestId) onSwitchContest(id);
                                            setFlyoutMenu(null);
                                            setFlyoutAnchorRect(null);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Layers size={13} className={isActive ? 'text-violet-400' : 'text-slate-400'} />
                                            <span className="truncate">{name}</span>
                                        </div>
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                            onClick={() => {
                                onCreateContest();
                                setFlyoutMenu(null);
                                setFlyoutAnchorRect(null);
                            }}
                        >
                            <Plus size={13} />
                            <span>Criar Novo Painel</span>
                        </button>

                        {onImport && (
                            <button
                                type="button"
                                className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-colors"
                                onClick={() => {
                                    fileInputRef.current?.click();
                                    setFlyoutMenu(null);
                                    setFlyoutAnchorRect(null);
                                }}
                            >
                                <Upload size={13} />
                                <span>Restaurar Backup</span>
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* PORTAL FIXED FLYOUT POPOVER: CONFIGURAÇÕES (Zero clipping garantido) */}
            {typeof document !== 'undefined' && collapsed && flyoutMenu === 'settings' && flyoutAnchorRect && createPortal(
                <>
                    <div 
                        className="sidebar-portal-flyout-overlay"
                        onClick={() => { setFlyoutMenu(null); setFlyoutAnchorRect(null); }}
                        aria-hidden="true"
                    />
                    <div 
                        className="sidebar-portal-flyout-popover" 
                        role="menu"
                        style={{
                            top: `${Math.max(12, Math.min(window.innerHeight - 280, flyoutAnchorRect.bottom - 220))}px`,
                            left: `${flyoutAnchorRect.right + 12}px`
                        }}
                    >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Settings size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Ajustes & Ações</span>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => { setFlyoutMenu(null); setFlyoutAnchorRect(null); }}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5"
                                aria-label="Fechar painel"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <button
                                type="button"
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-red-300 hover:bg-red-500/10 transition-colors"
                                onClick={() => {
                                    onOpenTrash();
                                    setFlyoutMenu(null);
                                    setFlyoutAnchorRect(null);
                                }}
                            >
                                <Trash2 size={13} className="text-red-400" />
                                <span>Lixeira</span>
                            </button>

                            <button
                                type="button"
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-sky-300 hover:bg-sky-500/10 transition-colors"
                                onClick={() => {
                                    onOpenHelp();
                                    setFlyoutMenu(null);
                                    setFlyoutAnchorRect(null);
                                }}
                            >
                                <HelpCircle size={13} className="text-sky-400" />
                                <span>Ajuda & Guia</span>
                            </button>

                            <button
                                type="button"
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                                onClick={() => {
                                    useAppStore.getState().setHasSeenTour(false);
                                    setFlyoutMenu(null);
                                    setFlyoutAnchorRect(null);
                                }}
                            >
                                <Sparkles size={13} className="text-indigo-400" />
                                <span>Reiniciar Tutorial</span>
                            </button>

                            <div className="border-t border-white/5 my-1"></div>

                            {onImport && (
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-sky-300 hover:bg-sky-500/10 transition-colors"
                                    onClick={() => {
                                        fileInputRef.current?.click();
                                        setFlyoutMenu(null);
                                        setFlyoutAnchorRect(null);
                                    }}
                                >
                                    <Upload size={13} className="text-sky-400" />
                                    <span>Restaurar Backup (JSON)</span>
                                </button>
                            )}

                            {onExport && (
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                                    onClick={() => {
                                        onExport();
                                        setFlyoutMenu(null);
                                        setFlyoutAnchorRect(null);
                                    }}
                                >
                                    <Download size={13} className="text-emerald-400" />
                                    <span>Exportar Backup</span>
                                </button>
                            )}

                            <button
                                type="button"
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                                onClick={() => {
                                    setShowResetConfirm(true);
                                    setFlyoutMenu(null);
                                    setFlyoutAnchorRect(null);
                                }}
                            >
                                <Trash2 size={13} className="text-red-400" />
                                <span>Zerar Conta (Perigo)</span>
                            </button>

                            <button
                                type="button"
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs text-rose-300 hover:bg-rose-500/15 transition-colors"
                                onClick={handleLogout}
                            >
                                <LogOut size={13} className="text-rose-400" />
                                <span>Sair da Conta</span>
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

            <ConfirmModal
                isOpen={!!contestToDelete}
                onClose={() => setContestToDelete(null)}
                onConfirm={() => {
                    if (contestToDelete) {
                        onDeleteContest(contestToDelete.id);
                        setContestToDelete(null);
                    }
                }}
                title="Excluir Concurso"
                message={`Tem certeza que deseja mover "${contestToDelete?.name}" para a lixeira? Todos os dados deste concurso serão arquivados.`}
                confirmText="Mover para Lixeira"
                type="danger"
            />

            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleConfirmLogout}
                title="Encerrar Sessão"
                message="Deseja realmente sair da sua conta?"
                confirmText="Sair da Conta"
                type="danger"
                icon={LogOut}
            />

            <ConfirmModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={async () => {
                    try {
                        setShowResetConfirm(false);
                        await clearAllDataSecure();
                    } catch (err) {
                        console.error('Erro ao zerar conta:', err);
                    }
                }}
                title="Zerar Conta Completa"
                message="CUIDADO: Isso vai APAGAR TODOS os seus dados locais e na nuvem. Tem certeza absoluta? Esta ação não pode ser desfeita."
                confirmText="Zerar Tudo"
                type="danger"
                icon={Trash2}
            />
        </>
    );
}); 

export default Sidebar;
