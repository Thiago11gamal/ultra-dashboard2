import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LayoutDashboard, RotateCcw, CloudDownload, Trash2, LogOut, X, ChevronRight, Download, Upload, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/useAuth';
import { del } from 'idb-keyval';
import { useAppStore } from '../store/useAppStore';
import TrashModal from './TrashModal';
import useClock from '../hooks/useClock';


/* ─────────────────────────────────────────────────────────
   Helper Components
───────────────────────────────────────────────────────── */
const DateDisplay = () => {
    const clockTime = useClock();
    return (
        <p className="text-slate-300/80 pl-2 text-sm">
            {format(clockTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
    );
};

const TimeDisplay = () => {
    const clockTime = useClock();
    return (
        <div className="glass px-4 py-2 text-lg font-mono hidden md:block">
            {format(clockTime, 'HH:mm:ss')}
        </div>
    );
};

const MobileClockDisplay = () => {
    const clockTime = useClock();
    return (
        <div className="flex flex-col">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-0.5">
                {format(clockTime, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-white/60 text-xs font-semibold leading-none">
                {format(clockTime, "d 'de' MMM", { locale: ptBR })}
            </p>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────
   Main Header component
───────────────────────────────────────────────────────── */
export default function Header({
    user = { name: 'Visitante', avatar: '👤', xp: 0, level: 1 },
    onUpdateName,
    contests = {},
    activeContestId,
    onSwitchContest,
    onCreateContest,
    onDeleteContest,
    onUndo,
    cloudStatus = { connected: false, syncing: false },
    onExport,
    onImport,
    onToggleSidebar,
    sidebarCollapsed,
    setSidebarCollapsed,
    onOpenTrash
}) {
    const { logout } = useAuth();

    const [localName, setLocalName] = useState(user.name);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused && user?.name) {
            setLocalName(user.name);
        }
    }, [user?.name, isFocused]);

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

    const handleNameBlur = () => {
        setIsFocused(false);
        if (localName !== user.name && onUpdateName) {
            onUpdateName(localName);
        }
    };



    return (
        <>
            {/* ─── MOBILE HEADER ─── */}
            <div className="lg:hidden mb-3">
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleSidebar}
                            className="w-9 h-9 flex items-center justify-center rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        >
                            <LayoutDashboard size={18} />
                        </button>
                        <MobileClockDisplay />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onUndo}
                            className="w-9 h-9 flex items-center justify-center rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        >
                            <RotateCcw size={16} />
                        </button>


                    </div>
                </div>

                <div className="border-l-[3px] border-purple-500 pl-3 pr-3 bg-white/[0.02] rounded-r-xl py-1">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleNameBlur}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        placeholder="Seu nome..."
                        className="w-full bg-transparent text-xl font-black neon-text placeholder:text-slate-600 focus:outline-none leading-relaxed pb-2 pt-1"
                    />
                </div>
            </div>




            {/* ─── DESKTOP HEADER ─── */}
            <header className="hidden lg:flex items-center justify-between py-2 px-8 relative w-full mb-4 min-h-[60px]">
                {/* Desktop Toggle Button */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 mr-4 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                    title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                >
                    <Menu size={20} />
                </button>
                {/* ─── LEFT SIDE: DATE & CLOUD ─── */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <DateDisplay />
                    <div className="flex items-center gap-3">
                        {cloudStatus.status !== 'idle' && (
                            <div className={`flex items-center min-w-[135px] justify-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-500 backdrop-blur-md ${cloudStatus.status === 'connected'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                    : cloudStatus.status === 'connecting'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                }`} title={cloudStatus.error || ''}>
                                <div className="relative flex items-center justify-center h-full">
                                    <div className={`absolute w-2.5 h-2.5 rounded-full opacity-40 animate-ping ${cloudStatus.status === 'connected' ? 'bg-emerald-400' : cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                        }`} />
                                    <div className={`w-1.5 h-1.5 rounded-full z-10 ${cloudStatus.status === 'connected' ? 'bg-emerald-400' : cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                        } ${cloudStatus.syncing ? 'animate-pulse' : ''}`} />
                                </div>
                                <span className="opacity-90 mt-[1px]">
                                    {cloudStatus.status === 'connected'
                                        ? (cloudStatus.syncing ? 'Sincronizando' : 'Nuvem Ativa')
                                        : cloudStatus.status === 'connecting'
                                            ? 'Conectando...'
                                            : 'Nuvem Offline'}
                                </span>
                            </div>
                        )}
                        {cloudStatus.hasConflict && (
                            <button
                                onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] uppercase font-black animate-pulse"
                                title="Forçar Paridade"
                            >
                                <CloudDownload size={12} />
                                <span>Conflito</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── CENTRAL USER NAME ─── */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto z-20">
                    <span className="text-[9px] text-slate-500 uppercase tracking-[0.3em] font-black opacity-0 group-hover:opacity-100 transition-all duration-300 mb-0.5">
                        Foco Principal ✏️
                    </span>
                    <div className="relative">
                        <input
                            type="text"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={handleNameBlur}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                            placeholder="Nome do utilizador..."
                            className="bg-transparent text-center text-xl lg:text-3xl font-black neon-text placeholder:text-slate-700 focus:outline-none focus:border-b-2 focus:border-purple-500 transition-all px-6 py-1 pb-2 leading-relaxed min-w-[300px] lg:min-w-[450px]"
                        />
                    </div>
                </div>

                {/* ─── RIGHT SIDE: CONTROLS ─── */}
                <div className="flex items-center gap-4 flex-1 justify-end">
                    <button
                        onClick={onUndo}
                        className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white group relative"
                    >
                        <RotateCcw size={20} />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Desfazer
                        </span>
                    </button>

                    <TimeDisplay />


                </div>
            </header>
        </>
    );
}
