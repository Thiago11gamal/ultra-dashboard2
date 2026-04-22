import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, CloudDownload, LayoutDashboard, Menu } from 'lucide-react';
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
        <p className="text-slate-400 pl-2 text-[10px] font-bold uppercase tracking-wider opacity-80">
            {format(clockTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
    );
};

const TimeDisplay = () => {
    const clockTime = useClock();
    return (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-1 text-sm font-mono text-slate-300 hidden md:block">
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
            <div className="lg:hidden fixed top-0 left-0 right-0 z-[120] backdrop-blur-xl bg-[#0a0f1e]/90 border-b border-white/[0.08] px-4 py-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onToggleSidebar}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-400 hover:text-white transition-all active:scale-95"
                        >
                            <LayoutDashboard size={18} />
                        </button>
                        <MobileClockDisplay />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onUndo}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-400 hover:text-white transition-all active:scale-95"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>

                <div className="border-l-[2px] border-purple-500 pl-3 bg-white/[0.02] rounded-r-lg py-1">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleNameBlur}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        placeholder="Seu nome..."
                        className="w-full bg-transparent text-lg font-black neon-text placeholder:text-slate-700 focus:outline-none leading-tight"
                    />
                </div>
            </div>




            {/* ─── DESKTOP HEADER ─── */}
            <header className="hidden lg:flex items-center justify-center py-1 px-4 fixed top-0 left-0 right-0 lg:left-[var(--sidebar-width,0)] z-[110] backdrop-blur-xl bg-[#0a0f1e]/85 border-b border-white/[0.05] min-h-[48px] transition-all duration-300">
                <div className="w-full max-w-[1500px] flex items-center relative h-full">
                    {/* ─── LEFT SIDE ─── */}
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-24">
                        {/* Desktop Toggle Button */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0"
                            title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                        >
                            <Menu size={18} />
                        </button>

                        <div className="flex flex-col gap-0.5 min-w-0">
                            <DateDisplay />
                            <div className="flex items-center gap-3">
                                {cloudStatus.status !== 'idle' && (
                                    <div className={`flex items-center min-w-[110px] justify-center gap-2 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider transition-all duration-500 ${cloudStatus.status === 'connected'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                        : cloudStatus.status === 'connecting'
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400/90 shadow-[0_0_15px_rgba(244,63,94,0.05)]'
                                        }`} title={cloudStatus.error || ''}>
                                        <div className="relative flex items-center justify-center">
                                            <div className={`absolute w-1.5 h-1.5 rounded-full opacity-40 animate-ping ${cloudStatus.status === 'connected' ? 'bg-emerald-400' : cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                                }`} />
                                            <div className={`w-1 h-1 rounded-full z-10 ${cloudStatus.status === 'connected' ? 'bg-emerald-400' : cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                                } ${cloudStatus.syncing ? 'animate-pulse' : ''}`} />
                                        </div>
                                        <span className="opacity-70">
                                            {cloudStatus.status === 'connected'
                                                ? (cloudStatus.syncing ? 'Syncing' : 'Nuvem Ativa')
                                                : cloudStatus.status === 'connecting'
                                                    ? 'Conectando'
                                                    : 'Offline'}
                                        </span>
                                    </div>
                                )}
                                {cloudStatus.hasConflict && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }}
                                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[8px] uppercase font-black animate-pulse"
                                        title="Forçar Paridade"
                                    >
                                        <CloudDownload size={9} />
                                        <span>Conflito</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── CENTRAL USER NAME (ABSOLUTE) ─── */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group pointer-events-auto z-20">
                        <span className="text-[7px] text-slate-500 uppercase tracking-[0.4em] font-black opacity-40 group-hover:opacity-100 transition-all duration-300 mb-0.5 h-2">
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
                                className="bg-transparent text-center text-lg lg:text-xl font-black neon-text placeholder:text-slate-800 focus:outline-none transition-all px-4 py-0 leading-tight min-w-[200px] lg:min-w-[350px]"
                            />
                        </div>
                    </div>

                    {/* ─── RIGHT SIDE ─── */}
                    <div className="flex items-center gap-3 flex-1 justify-end pl-24">
                        <button
                            onClick={onUndo}
                            className="p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.08] transition-all text-slate-500 hover:text-white group relative flex-shrink-0"
                        >
                            <RotateCcw size={16} />
                            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest bg-black/90 border border-white/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                Desfazer
                            </span>
                        </button>

                        <div className="h-8 w-[1px] bg-white/[0.05] mx-1 flex-shrink-0" />

                        <TimeDisplay />
                    </div>
                </div>
            </header>
        </>
    );
}
