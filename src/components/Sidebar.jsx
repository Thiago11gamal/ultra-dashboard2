import React from 'react';
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
    Settings
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import logo from '../assets/logo.png';
import { useAuth } from '../context/useAuth';
import './Sidebar.css';
import { del } from 'idb-keyval';
import { useAppStore } from '../store/useAppStore';


import { getContestDisplayName, isMenuItemActive } from './sidebarUtils';

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
            { path: '/retention', label: 'Retenção', icon: Brain, color: '#a78bfa' },
            { path: '/simulados', label: 'Simulados IA', icon: BrainCircuit, color: '#60a5fa' },
            { path: '/history', label: 'Histórico', icon: History, color: '#94a3b8' },
        ]
    },
    {
        label: 'Inteligência',
        items: [
            { path: '/coach', label: 'Coach IA', icon: Sparkles, color: '#c084fc' },
            { path: '/notes', label: 'Notas', icon: FileText, color: '#fca5a5' },
        ]
    }
];

export default function Sidebar({
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
    const [contestsExpanded, setContestsExpanded] = React.useState(false);
    const [settingsExpanded, setSettingsExpanded] = React.useState(false);
    const [contestToDelete, setContestToDelete] = React.useState(null);
    const contestEntries = React.useMemo(() => Object.entries(contests || {}), [contests]);
    const isSingleContest = contestEntries.length <= 1;

    React.useEffect(() => {
        const width = collapsed ? '70px' : '280px';
        document.documentElement.style.setProperty('--sidebar-width', width);

        // Garantir que as configurações comecem fechadas ao expandir o menu
        if (!collapsed) {
            setSettingsExpanded(false);
        }
    }, [collapsed]);

    React.useEffect(() => {
        if (!collapsed && contestEntries.length > 0) {
            setContestsExpanded(true);
        }
    }, [collapsed, contestEntries.length]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isOpen && window.innerWidth < 1024 && collapsed) {
            setCollapsed(false);
        }
    }, [collapsed, isOpen, setCollapsed]);

    const closeMobileSidebar = () => {
        if (typeof window === 'undefined') return;
        if (window.innerWidth >= 1024) return;
        if (isOpen) {
            onCloseMobile?.();
        }
    };

    const handleLogout = async () => {
        if (window.confirm("Deseja realmente sair?")) {
            try {
                useAppStore.getState().resetStore();
                await del('ultra-dashboard-storage');
                localStorage.removeItem('ultra-dashboard-storage');
                await logout();
            } catch (err) {
                console.error("Erro ao sair", err);
            }
        }
    };



    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
                    onClick={onToggle}
                />
            )}

            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
                {/* Logo Area */}
                <div className="flex items-center justify-between mb-2 px-1">
                    <div className="sidebar-logo">
                        <img src={logo} alt="Ultra Dashboard" />
                        <span>Método Arraia</span>
                    </div>

                    {/* Desktop Collapse Toggle - Hidden for now as it's in the Header */}

                    {/* Mobile Close Button */}
                    <button
                        type="button"
                        className="lg:hidden p-2 text-slate-500 hover:text-white"
                        onClick={onToggle}
                        aria-label="Fechar menu lateral"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-divider"></div>

                {/* Nav Sections */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pl-1 pr-3">

                    {/* MEUS CONCURSOS COLLAPSIBLE SECTION */}
                    <div className="mb-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (collapsed) {
                                    setCollapsed(false);
                                    setContestsExpanded(true);
                                } else {
                                    setContestsExpanded(!contestsExpanded);
                                }
                            }}
                            className="sidebar-item group justify-between"
                            title="Meus Concursos"
                            aria-expanded={contestsExpanded && !collapsed}
                            aria-controls="sidebar-contests-panel"
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles size={18} className="text-violet-400" />
                                <span className="font-bold text-slate-200">Meus Concursos</span>
                            </div>
                        </button>

                        <div id="sidebar-contests-panel" className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ${contestsExpanded && !collapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="nested-container space-y-1">
                                {contestEntries.map(([id, contestData]) => {
                                    const name = getContestDisplayName(contestData);
                                    const isActive = id === activeContestId;
                                    return (
                                        <div
                                            key={id}
                                            role="button"
                                            tabIndex={0}
                                            className={`sidebar-item group !py-2 relative w-full text-left ${isActive ? 'active' : ''}`}
                                            title={name}
                                            onClick={() => {
                                                if (id !== activeContestId) onSwitchContest(id);
                                                closeMobileSidebar();
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    if (id !== activeContestId) onSwitchContest(id);
                                                    closeMobileSidebar();
                                                }
                                            }}
                                        >
                                            <div className="nested-item-marker"></div>
                                            <LayoutDashboard size={14} />
                                            <span className="flex-1 truncate text-[0.8rem]">{name}</span>
                                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>}
                                            <button
                                                type="button"
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (!isSingleContest) setContestToDelete({ id, name });
                                                }}
                                                disabled={isSingleContest}
                                                title={isSingleContest ? 'Mantenha ao menos um concurso' : 'Mover para lixeira'}
                                                className={`p-1 transition-opacity ${isSingleContest ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:text-red-400'}`}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    );
                                })}

                                <button
                                    type="button"
                                    className="sidebar-item !py-2 text-green-500/80 hover:text-green-400 relative"
                                    onClick={() => {
                                        onCreateContest();
                                        closeMobileSidebar();
                                    }}
                                    title="Criar Novo Painel"
                                >
                                    <div className="nested-item-marker !bg-green-500/20"></div>
                                    <Plus size={14} className="text-emerald-400" />
                                    <span className="text-[0.8rem] text-emerald-400 font-bold">Criar Novo</span>
                                </button>
                            </div>
                        </div>

                        {/* Collapsed view special icons - REMOVED as requested, now inside Configurações */}
                    </div>

                    <div className="sidebar-divider"></div>

                    {SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className="mb-4">
                            <h4 className="sidebar-nav-label">{section.label}</h4>
                            <nav className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isMenuItemActive(location.pathname, item.path);

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`sidebar-item ${item.path === '/coach' ? 'coach-ia-item' : ''} ${isActive ? 'active' : ''}`}
                                            aria-current={isActive ? "page" : undefined}
                                            style={{
                                                '--item-color': item.color,
                                                '--item-color-alpha': `${item.color}15`
                                            }}
                                            title={item.label}
                                            onClick={() => {
                                                closeMobileSidebar();
                                            }}
                                        >
                                            <Icon style={{ color: isActive ? item.color : 'inherit' }} />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}
                </div>

                <div className="sidebar-footer px-1">
                    <div className="sidebar-divider"></div>
                    <nav className="space-y-1">
                        {/* CONFIGURAÇÕES COLLAPSIBLE SECTION */}
                        <div className="mb-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (collapsed) {
                                        setCollapsed(false);
                                        setSettingsExpanded(true);
                                    } else {
                                        setSettingsExpanded(!settingsExpanded);
                                    }
                                }}
                                className="sidebar-item group"
                                title="Configurações"
                                aria-expanded={settingsExpanded && !collapsed}
                                aria-controls="sidebar-settings-panel"
                            >
                                <Settings size={18} className="text-slate-400" />
                                <span>Configurações</span>
                            </button>

                            <div id="sidebar-settings-panel" className={`mt-1 space-y-1 overflow-hidden transition-all duration-300 ${settingsExpanded && !collapsed ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-4 space-y-1 border-l border-white/5 ml-2.5">
                                    <button
                                        type="button"
                                        className="sidebar-item !py-2 hover:!bg-red-500/10"
                                        onClick={() => {
                                            onOpenTrash();
                                            closeMobileSidebar();
                                        }}
                                        style={{ '--item-color': '#ef4444' }}
                                        title="Lixeira"
                                    >
                                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                                        <span className="text-[0.8rem]">Lixeira</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="sidebar-item !py-2 hover:!bg-sky-500/10"
                                        onClick={() => {
                                            onOpenHelp();
                                            closeMobileSidebar();
                                        }}
                                        style={{ '--item-color': '#0ea5e9' }}
                                    >
                                        <HelpCircle size={14} style={{ color: '#0ea5e9' }} />
                                        <span className="text-[0.8rem]">Ajuda</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="sidebar-item logout-btn !py-2 hover:!bg-rose-500/10"
                                        onClick={handleLogout}
                                        style={{ '--item-color': '#f43f5e' }}
                                    >
                                        <LogOut size={14} style={{ color: '#f43f5e' }} />
                                        <span className="text-[0.8rem]">Sair da Conta</span>
                                    </button>
                                </div>
                            </div>
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
        </>
    );
}
