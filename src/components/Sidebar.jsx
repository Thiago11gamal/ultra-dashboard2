import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import logo from '../assets/logo.png';
import { useAuth } from '../context/useAuth';
import './Sidebar.css';
import { del } from 'idb-keyval';
import { useAppStore, clearAllDataSecure } from '../store/useAppStore';
import { getContestDisplayName, isMenuItemActive, handleMenuKeyDown } from './sidebarUtils';

const SECTIONS = [
    {
        label: 'Navegação',
        items: [
            { path: '/', label: 'Meu Painel', icon: LayoutDashboard, color: '#38bdf8' },
            { path: '/pomodoro', label: 'Cronômetro', icon: Timer, color: '#fb7185' },
            { path: '/sessions', label: 'Sessões', icon: Clock, color: '#34d399' },
            { path: '/tasks', label: 'Tarefas', icon: CheckSquare, color: '#fbbf24' },
        ]
    },
    {
        label: 'Dados & Análise',
        items: [
            { path: '/stats', label: 'Estatísticas', icon: BarChart3, color: '#818cf8' },
            { path: '/evolution', label: 'Evolução', icon: TrendingUp, color: '#f472b6' },
            { path: '/heatmap', label: 'Atividade', icon: CalendarDays, color: '#2dd4bf' },
            { path: '/history', label: 'Histórico', icon: History, color: '#94a3b8' },
            { path: '/retention', label: 'Retenção', icon: Brain, color: '#a78bfa' },
            { path: '/simulados', label: 'Simulados IA', icon: BrainCircuit, color: '#60a5fa' },
        ]
    },
    {
        label: 'Inteligência',
        items: [
            { path: '/coach', label: 'Coach IA', icon: Sparkles, color: '#c084fc' },
            { path: '/notes', label: 'Notas', icon: FileText, color: '#fca5a5' },
        ]
    },
    {
        label: 'Ferramentas',
        items: [
            { path: '/flashcards', label: 'Flashcards', icon: BookOpen, color: '#f59e0b' },
            { path: '/agenda', label: 'Agenda de Estudos', icon: Calendar, color: '#14b8a6' },
        ]
    }
];

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
    onCloseMobile
}) {
    const location = useLocation();
    const { logout } = useAuth();
    const [contestsExpanded, setContestsExpanded] = useState(false);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [flyoutMenu, setFlyoutMenu] = useState(null); // 'contests' | 'settings' | null
    const [contestToDelete, setContestToDelete] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const sidebarRef = useRef(null);
    const contestsFlyoutRef = useRef(null);
    const settingsFlyoutRef = useRef(null);

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
            setSettingsExpanded(false);
            if (contestEntries.length > 0) {
                setContestsExpanded(true);
            }
        } else {
            setContestsExpanded(false);
            setSettingsExpanded(false);
        }
    }, [collapsed, contestEntries.length]);

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
                <div className="sidebar-header-area">
                    <Link
                        to="/"
                        className="sidebar-logo"
                        onClick={closeMobileSidebar}
                        title="Ultra Dashboard - Método Arraia"
                    >
                        <img src={logo} alt="Ultra Dashboard" />
                        <div className="sidebar-logo-text">
                            <span>Método Arraia</span>
                            <span className="sidebar-logo-badge">Ultra Dashboard</span>
                        </div>
                    </Link>

                    {/* Botão de recolher/expandir direto na barra lateral no Desktop */}
                    <button
                        type="button"
                        className="sidebar-toggle-btn hidden lg:flex"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                        title={collapsed ? "Expandir menu" : "Recolher menu"}
                    >
                        {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">

                    {/* MEUS CONCURSOS SECTION */}
                    <div className="mb-2 relative sidebar-item-wrapper" ref={contestsFlyoutRef}>
                        <button
                            type="button"
                            onClick={() => {
                                if (collapsed) {
                                    setFlyoutMenu(flyoutMenu === 'contests' ? null : 'contests');
                                } else {
                                    setContestsExpanded(!contestsExpanded);
                                }
                            }}
                            className="sidebar-item group justify-between tour-step-1 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5"
                            aria-expanded={collapsed ? flyoutMenu === 'contests' : contestsExpanded}
                            aria-controls="sidebar-contests-panel"
                            aria-haspopup="true"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative flex items-center justify-center shrink-0">
                                    <Sparkles size={16} className="text-violet-400" />
                                    {activeContestId && collapsed && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-emerald-400/50" />
                                    )}
                                </div>
                                <div className="sidebar-item-text">
                                    <span className="font-semibold text-slate-200 text-sm sidebar-item-label">Meus Concursos</span>
                                    <ChevronDown 
                                        size={14} 
                                        className={`transition-transform duration-200 text-slate-400 ${contestsExpanded ? 'rotate-180' : ''}`} 
                                    />
                                </div>
                            </div>
                        </button>

                        {/* Floating Tooltip no modo recolhido */}
                        {collapsed && (
                            <div className="sidebar-floating-tooltip">
                                <span>Meus Concursos</span>
                                <span className="text-[10px] text-violet-300 font-normal">({activeContestName})</span>
                            </div>
                        )}

                        {/* Floating Flyout Popover para Concursos (Modo Recolhido) */}
                        {collapsed && flyoutMenu === 'contests' && (
                            <div className="sidebar-flyout-popover" role="menu">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={14} className="text-violet-400" />
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Concursos</span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setFlyoutMenu(null)}
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
                                                }}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <LayoutDashboard size={13} className={isActive ? 'text-violet-400' : 'text-slate-400'} />
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
                                    }}
                                >
                                    <Plus size={13} />
                                    <span>Criar Novo Concurso</span>
                                </button>
                            </div>
                        )}

                        {/* Accordion suave baseado em CSS Grid para modo expandido (Zero stutter) */}
                        {!collapsed && (
                            <div 
                                id="sidebar-contests-panel" 
                                className={`sidebar-accordion ${contestsExpanded ? 'expanded' : ''}`}
                                role="region"
                            >
                                <div className="sidebar-accordion-inner">
                                    <div className="nested-container space-y-1">
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
                                                        <LayoutDashboard size={13} className="text-slate-400 shrink-0" />
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
                                                        title={isSingleContest ? 'Mantenha ao menos um concurso' : 'Mover para lixeira'}
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
                                            <span className="text-[0.78rem] text-emerald-300 font-semibold truncate">Criar Novo</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sidebar-divider"></div>

                    {/* SECTIONS LIST */}
                    {SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className={`mb-3 ${section.label === 'Dados & Análise' ? 'tour-step-2' : ''}`}>
                            <h4 className="sidebar-nav-label" id={`section-${sIdx}`}>{section.label}</h4>
                            <nav className="space-y-1" aria-labelledby={`section-${sIdx}`}>
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const currentPath = location.pathname;
                                    const isActive = isMenuItemActive(currentPath, item.path);

                                    return (
                                        <div key={item.path} className="sidebar-item-wrapper">
                                            <Link
                                                to={item.path}
                                                className={`sidebar-item focus-visible:outline-none ${item.path === '/coach' ? 'coach-ia-item' : ''} ${isActive ? 'active' : ''} ${item.path === '/pomodoro' ? 'tour-step-3' : ''}`}
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
                                            >
                                                <Icon aria-hidden="true" />
                                                <div className="sidebar-item-text">
                                                    <span className="sidebar-item-label">{item.label}</span>
                                                </div>
                                            </Link>

                                            {/* Instant Floating Tooltip no modo recolhido */}
                                            {collapsed && (
                                                <div 
                                                    className="sidebar-floating-tooltip"
                                                    style={{
                                                        '--item-color': item.color,
                                                        '--item-color-alpha': `${item.color}25`
                                                    }}
                                                >
                                                    <span>{item.label}</span>
                                                </div>
                                            )}
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
                                onClick={() => {
                                    if (collapsed) {
                                        setFlyoutMenu(flyoutMenu === 'settings' ? null : 'settings');
                                    } else {
                                        setSettingsExpanded(!settingsExpanded);
                                    }
                                }}
                                className="sidebar-item group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5"
                                aria-expanded={collapsed ? flyoutMenu === 'settings' : settingsExpanded}
                                aria-controls="sidebar-settings-panel"
                                aria-haspopup="true"
                            >
                                <Settings size={16} className="text-slate-400 shrink-0" />
                                <div className="sidebar-item-text">
                                    <span className="font-semibold text-sm sidebar-item-label">Configurações</span>
                                    <ChevronDown 
                                        size={14} 
                                        className={`transition-transform duration-200 text-slate-400 ${settingsExpanded ? 'rotate-180' : ''}`} 
                                    />
                                </div>
                            </button>

                            {/* Floating Tooltip no modo recolhido */}
                            {collapsed && (
                                <div className="sidebar-floating-tooltip">
                                    <span>Configurações</span>
                                </div>
                            )}

                            {/* Floating Flyout Popover para Configurações (Modo Recolhido) */}
                            {collapsed && flyoutMenu === 'settings' && (
                                <div className="sidebar-flyout-popover" role="menu">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                                        <div className="flex items-center gap-2">
                                            <Settings size={14} className="text-slate-400" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Ajustes</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setFlyoutMenu(null)}
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
                                            }}
                                        >
                                            <Sparkles size={13} className="text-indigo-400" />
                                            <span>Reiniciar Tutorial</span>
                                        </button>

                                        <div className="border-t border-white/5 my-1"></div>

                                        <button
                                            type="button"
                                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                                            onClick={() => {
                                                setShowResetConfirm(true);
                                                setFlyoutMenu(null);
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
                            )}

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
