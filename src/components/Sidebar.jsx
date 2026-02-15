import {
    LayoutDashboard,
    CheckSquare,
    BarChart3,
    Timer,
    FileText,
    Settings,
    Download,
    Upload,
    ChevronUp,
    BrainCircuit,
    Sparkles,
    CalendarDays,
    History,
    HelpCircle,
    Brain
} from 'lucide-react';
import { calculateLevel, calculateProgress } from '../utils/gamification';

export default function Sidebar({ activeTab, setActiveTab, onExport, onImport, collapsed, setCollapsed, user }) {
    // Note: We are keeping the component name 'Sidebar' to avoid breaking imports in App.jsx,
    // but functionally this is now a TopBar.

    // Calculate Gamification Stats
    const currentXP = user?.xp || 0;
    const level = calculateLevel(currentXP);
    const progress = calculateProgress(currentXP);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'coach', label: 'AI Coach', icon: Sparkles },
        { id: 'tasks', label: 'Tarefas', icon: CheckSquare },
        { id: 'simulados', label: 'Simulados IA', icon: BrainCircuit },
        { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
        { id: 'heatmap', label: 'Atividade', icon: CalendarDays },
        { id: 'retention', label: 'Retenção', icon: Brain },
        { id: 'history', label: 'Histórico', icon: History },
        { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
        { id: 'notes', label: 'Notas', icon: FileText },
        { id: 'help', label: 'Ajuda', icon: HelpCircle },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ];

    return (
        <div className="fixed top-4 left-1/2 z-[100] flex flex-col items-start">
            {/* Main Bar Container */}
            <div
                className={`
                    transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden z-50 -translate-x-1/2
                    ${collapsed
                        ? 'w-14 h-14 rounded-full cursor-pointer bg-slate-900/90 border-2 border-white/10 shadow-2xl shadow-black/50 hover:shadow-purple-500/40 hover:border-purple-500/50 hover:scale-110 group backdrop-blur-md'
                        : 'glass-panel w-auto px-6 py-3 rounded-2xl'}
                `}
                onClick={() => collapsed && setCollapsed(false)}
            >
                {collapsed ? (
                    // Collapsed State: Simple Level Icon
                    <div className="w-full h-full flex items-center justify-center text-white transition-colors relative">
                        {/* Circular Progress Micro-indicator */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 p-0.5 drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#ffffff10"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#eab308"
                                strokeWidth="3"
                                strokeDasharray={`${progress}, 100`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center z-10">
                            <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">COL</span>
                            <span className="text-xl font-black leading-none text-white filter drop-shadow-md">{level}</span>
                        </div>
                    </div>
                ) : (
                    // Expanded State: Full Menu
                    <div className="flex items-center gap-3">
                        {/* Brand Logo */}
                        <div className="flex items-center gap-2 pr-4 border-r border-white/10 group/brand cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                            <svg viewBox="0 0 200 200" className="w-8 h-8 text-purple-400 group-hover/brand:text-purple-300 transition-all group-hover/brand:scale-110" fill="currentColor">
                                <path d="M100,55 C145,55 185,75 198,105 C180,115 150,122 120,122 C115,135 108,148 100,152 C92,148 85,135 80,122 C50,122 20,115 2,105 C15,75 55,55 100,55 Z" />
                                <path d="M82,57 C75,45 82,32 90,34 C94,36 92,48 88,58 Z" />
                                <path d="M118,57 C125,45 118,32 110,34 C106,36 108,48 112,58 Z" />
                                <path d="M100,152 C100,175 80,185 60,192 C55,193 55,195 62,195 C90,195 112,180 112,152 Z" />
                            </svg>
                            <span className="font-black text-xs tracking-tighter text-white group-hover/brand:text-purple-300 transition-colors uppercase">MÉTODO THI</span>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex items-center gap-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveTab(item.id);
                                            // Auto-collapse on selection (Mobile friendly)
                                            setCollapsed(true);
                                        }}
                                        className={`p-2 rounded-lg transition-all duration-300 group/icon ${isActive
                                            ? 'bg-purple-500/20 text-purple-300'
                                            : 'hover:bg-white/10 text-slate-400 hover:text-white'
                                            }`}
                                        title={item.label}
                                    >
                                        <Icon size={20} className={`transition-all duration-300 ${isActive ? 'animate-pulse' : 'group-hover/icon:scale-125 group-hover/icon:-rotate-12'}`} />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-2"></div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button onClick={onExport} className="p-2 text-slate-400 hover:text-green-400 transition-colors" title="Exportar Backup">
                                <Download size={18} />
                            </button>
                            <label className="cursor-pointer p-2 text-slate-400 hover:text-yellow-400 transition-colors" title="Importar Dados">
                                <Upload size={18} />
                                <input type="file" accept=".json" onChange={onImport} className="hidden" />
                            </label>
                        </div>

                        {/* Collapse Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollapsed(true);
                            }}
                            className="ml-2 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronUp size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
