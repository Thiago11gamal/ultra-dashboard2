import React, { useState, useEffect } from 'react';
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
    Brain,
    TrendingUp
} from 'lucide-react';
import { calculateLevel, calculateProgress } from '../utils/gamification';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ onExport, onImport, collapsed, setCollapsed, user, isMobile, onOpenHelp }) {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Oculta ao rolar para baixo, mostra ao rolar para cima
            if (currentScrollY > 50 && currentScrollY > lastScrollY) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
                setIsVisible(true);
            }

            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Gamification Stats
    const currentXP = user?.xp || 0;
    const level = calculateLevel(currentXP);
    const progress = calculateProgress(currentXP);

    const menuItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/coach', label: 'AI Coach', icon: Sparkles },
        { path: '/tasks', label: 'Tarefas', icon: CheckSquare },
        { path: '/simulados', label: 'Simulados IA', icon: BrainCircuit },
        { path: '/stats', label: 'Estatísticas', icon: BarChart3 },
        { path: '/evolution', label: 'Evolução', icon: TrendingUp },
        { path: '/heatmap', label: 'Atividade', icon: CalendarDays },
        { path: '/retention', label: 'Retenção', icon: Brain },
        { path: '/history', label: 'Histórico', icon: History },
        { path: '/pomodoro', label: 'Pomodoro', icon: Timer },
        { path: '/notes', label: 'Notas', icon: FileText },
        { path: '#help', label: 'Ajuda', icon: HelpCircle, action: 'openHelp' },
    ];

    return (
        <div className={`fixed z-[100]
            top-0 left-0 w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl border-b border-white/8 shadow-[0_4px_32px_rgba(0,0,0,0.5)] px-3 py-0
            md:w-auto md:bg-transparent md:border-none md:shadow-none md:px-0 md:py-0
            ${isVisible
                ? 'translate-y-0 opacity-100 transition-[transform,opacity] duration-150 ease-out md:top-6'
                : '-translate-y-full opacity-0 transition-[transform,opacity] duration-100 ease-in md:-top-32'
            } pointer-events-auto`}>

            {/* ─── MOBILE HEADER BAR ─────────────────── */}
            <div className="flex items-center w-full gap-2 py-2 md:hidden">
                {/* Brand */}
                <Link to="/" className="flex items-center gap-1.5 shrink-0" onClick={() => setCollapsed(true)}>
                    <svg viewBox="0 0 200 200" className="w-6 h-6 text-purple-400" fill="currentColor">
                        <path d="M100,55 C145,55 185,75 198,105 C180,115 150,122 120,122 C115,135 108,148 100,152 C92,148 85,135 80,122 C50,122 20,115 2,105 C15,75 55,55 100,55 Z" />
                        <path d="M82,57 C75,45 82,32 90,34 C94,36 92,48 88,58 Z" />
                        <path d="M118,57 C125,45 118,32 110,34 C106,36 108,48 112,58 Z" />
                        <path d="M100,152 C100,175 80,185 60,192 C55,193 55,195 62,195 C90,195 112,180 112,152 Z" />
                    </svg>
                    <span className="text-[10px] font-black tracking-tighter text-white uppercase opacity-80">Método Thi</span>
                </Link>

                {/* Level Badge */}
                <div className="flex items-center gap-1 bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-full shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></div>
                    <span className="text-[9px] font-black text-purple-300">Nv. {level}</span>
                </div>

                {/* Nav Icons — scrollable */}
                <div className="flex-1 flex items-center gap-0.5 overflow-x-auto overflow-y-hidden lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.action ? false : location.pathname === item.path;
                        if (item.action === 'openHelp') {
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => { if (onOpenHelp) onOpenHelp(); }}
                                    className={`shrink-0 p-2 rounded-xl transition-all ${isActive ? 'bg-purple-500/25 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/8'}`}
                                    title={item.label}
                                >
                                    <Icon size={17} />
                                </button>
                            );
                        }
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setCollapsed(true)}
                                className={`shrink-0 p-2 rounded-xl transition-all ${isActive ? 'bg-purple-500/25 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/8'}`}
                                title={item.label}
                            >
                                <Icon size={17} />
                            </Link>
                        );
                    })}
                </div>

                {/* Export/Import removed - relocated to Profile Drawer */}
            </div>  {/* end mobile bar */}

            {/* ─── DESKTOP PILL (unchanged) ─────────── */}
            <div
                className={`
                    hidden md:block transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden z-50
                    ${collapsed
                        ? 'w-14 h-14 rounded-full cursor-pointer bg-slate-900/90 border-2 border-white/10 shadow-2xl shadow-black/50 hover:shadow-purple-500/40 hover:border-purple-500/50 hover:scale-110 group backdrop-blur-md'
                        : 'glass-panel w-auto px-3 py-3 rounded-2xl'}
                `}
                onClick={(e) => {
                    if (collapsed) {
                        e.stopPropagation();
                        setCollapsed(false);
                    }
                }}
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
                    <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto overflow-y-hidden lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mobile-edge-fade pb-1 -mb-1 px-1">
                        {/* Brand Logo */}
                        <Link to="/" className="shrink-0 flex items-center gap-1.5 md:gap-2 pr-2 border-r border-white/10 group/brand cursor-pointer" onClick={(e) => { e.stopPropagation(); if (window.innerWidth < 768) setCollapsed(true); }}>
                            <svg viewBox="0 0 200 200" className="w-8 h-8 text-purple-400 group-hover/brand:text-purple-300 transition-all group-hover/brand:scale-110" fill="currentColor">
                                <path d="M100,55 C145,55 185,75 198,105 C180,115 150,122 120,122 C115,135 108,148 100,152 C92,148 85,135 80,122 C50,122 20,115 2,105 C15,75 55,55 100,55 Z" />
                                <path d="M82,57 C75,45 82,32 90,34 C94,36 92,48 88,58 Z" />
                                <path d="M118,57 C125,45 118,32 110,34 C106,36 108,48 112,58 Z" />
                                <path d="M100,152 C100,175 80,185 60,192 C55,193 55,195 62,195 C90,195 112,180 112,152 Z" />
                            </svg>
                            <span className="font-black text-xs tracking-tighter text-white group-hover/brand:text-purple-300 transition-colors uppercase">MÉTODO THI</span>
                        </Link>

                        {/* Navigation Items */}
                        <div className="flex items-center gap-1 md:gap-1.5">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.action ? false : location.pathname === item.path;

                                const buttonContent = (
                                    <>
                                        <Icon size={20} className={`transition-all duration-300 ${isActive ? 'animate-pulse' : 'group-hover/icon:scale-125 group-hover/icon:-rotate-12'}`} />
                                    </>
                                );

                                const className = `shrink-0 p-1.5 rounded-lg transition-all duration-300 group/icon flex items-center justify-center ${isActive
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'hover:bg-white/10 text-slate-400 hover:text-white'
                                    }`;

                                if (item.action === 'openHelp') {
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onOpenHelp) onOpenHelp();
                                                if (window.innerWidth < 768) setCollapsed(true);
                                            }}
                                            className={className}
                                            title={item.label}
                                        >
                                            {buttonContent}
                                        </button>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isMobile) setCollapsed(true);
                                        }}
                                        className={className}
                                        title={item.label}
                                    >
                                        {buttonContent}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Divider */}
                        <div className="shrink-0 w-px h-6 bg-white/10 mx-0.5"></div>

                        {/* Spacer to push collapse button if needed, or just let it flex */}
                        {/* Collapse Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCollapsed(true);
                            }}
                            className="shrink-0 p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronUp size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
