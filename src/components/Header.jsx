import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, CloudDownload, LayoutDashboard, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useClock from '../hooks/useClock';

/* ─────────────────────────────────────────────────────────
   Helper Components
 ───────────────────────────────────────────────────────── */
const DateDisplay = ({ clockTime }) => {
    return (
        <p className="text-slate-400 pl-2 text-[10px] font-bold uppercase tracking-wider opacity-80 truncate">
            {format(clockTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
    );
};

const TimeDisplay = ({ clockTime }) => {
    return (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-1 text-sm font-mono text-slate-300 hidden md:block">
            {format(clockTime, 'HH:mm:ss')}
        </div>
    );
};

const MobileClockDisplay = ({ clockTime }) => {
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
const Header = React.memo(function Header({
    user = { name: 'Visitante', avatar: '👤', xp: 0, level: 1 },
    onUpdateName,
    onUndo,
    cloudStatus = { status: 'idle', syncing: false },
    onToggleSidebar,
    sidebarCollapsed,
    setSidebarCollapsed
}) {
    const displayName = user?.name ?? 'Estudante';
    const [prevDisplayName, setPrevDisplayName] = useState(displayName);
    const [localName, setLocalName] = useState(displayName);
    const debounceRef = useRef(null);
    const isMountedRef = useRef(true); // FIX 5.3a: Proteção contra setState após unmount
    const clockTime = useClock(); // Centraliza o relógio

    const onUpdateNameRef = useRef(onUpdateName);
    useEffect(() => {
        onUpdateNameRef.current = onUpdateName;
    }, [onUpdateName]);

    // FIX 5.3a: Cleanup ao desmontar
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
        };
    }, []);

    if (displayName !== prevDisplayName) {
        setPrevDisplayName(displayName);
        setLocalName(displayName);
    }

    const handleNameChange = (e) => {
        const value = e.target.value.slice(0, 100); // FIX 5.3b: Limite de caracteres
        setLocalName(value);
        
        // FIX 5.3c: Debounce com cleanup adequado
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        
        debounceRef.current = setTimeout(() => {
            if (isMountedRef.current && onUpdateNameRef.current && typeof onUpdateNameRef.current === 'function') {
                onUpdateNameRef.current(value);
            }
            debounceRef.current = null;
        }, 500);
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
                            aria-label="Abrir menu lateral" // FIX 5.3e
                        >
                            <Menu size={18} aria-hidden="true" />
                        </button>
                        <MobileClockDisplay clockTime={clockTime} />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onUndo}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-400 hover:text-white transition-all active:scale-95"
                            aria-label="Desfazer última ação" // FIX 5.3e
                        >
                            <RotateCcw size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div className="border-l-[2px] border-purple-500 pl-3 bg-white/[0.02] rounded-r-lg py-1">
                    <input
                        type="text"
                        value={localName}
                        onChange={handleNameChange}
                        placeholder="Seu nome..."
                        className="w-full bg-transparent text-lg font-black neon-text placeholder:text-slate-700 focus:outline-none leading-tight"
                        aria-label="Nome do usuário" // FIX 5.3e
                        maxLength={100}
                    />
                </div>
            </div>

            {/* ─── DESKTOP HEADER ─── */}
            <header className="hidden lg:flex items-center justify-center py-2.5 px-6 sticky top-0 z-[110] backdrop-blur-xl bg-[#0a0f1e]/85 border-b border-white/[0.05] min-h-[64px] transition-all duration-300 w-full">
                <div className="w-full flex items-center relative h-full">
                    {/* ─── LEFT SIDE ─── */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0"
                            title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"} // FIX 5.3e
                            aria-expanded={!sidebarCollapsed} // FIX 5.3f
                            data-sidebar-toggle="true"
                        >
                            <Menu size={18} aria-hidden="true" />
                        </button>
                        <div className="flex items-center gap-3 min-w-0">
                            <DateDisplay clockTime={clockTime} />
                            {cloudStatus.status !== 'idle' && (
                                <div 
                                    className={`flex items-center shrink-0 min-w-[100px] justify-center gap-2 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider transition-all duration-500 ${
                                        cloudStatus.status === 'connected'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400/90 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                                            : cloudStatus.status === 'connecting'
                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400/90 shadow-[0_0_15px_rgba(244,63,94,0.05)]'
                                    }`} 
                                    title={cloudStatus.error || ''}
                                    role="status" // FIX 5.3g: Status anunciado
                                    aria-live="polite" // FIX 5.3g
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div className={`absolute w-1.5 h-1.5 rounded-full opacity-40 animate-ping ${
                                            cloudStatus.status === 'connected' ? 'bg-emerald-400' : 
                                            cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                        }`} aria-hidden="true" />
                                        <div className={`w-1 h-1 rounded-full z-10 ${
                                            cloudStatus.status === 'connected' ? 'bg-emerald-400' : 
                                            cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                        } ${cloudStatus.syncing ? 'animate-pulse' : ''}`} aria-hidden="true" />
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
                                    aria-label="Resolver conflito de sincronização" // FIX 5.3e
                                >
                                    <CloudDownload size={9} aria-hidden="true" />
                                    <span>Conflito</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ─── CENTRAL USER NAME ─── */}
                    <div className="flex flex-col items-center justify-center group pointer-events-auto z-20 flex-[0.8] max-w-[500px] px-2 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[150%] bg-indigo-500/10 blur-[40px] pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100" />
                        <span className="relative z-10 text-[7px] text-slate-500 uppercase tracking-[0.4em] font-black opacity-40 group-hover:opacity-100 transition-all duration-300 mb-0.5 h-2 leading-none">
                            Foco Principal ✏️
                        </span>
                        <div className="relative w-full">
                            <input
                                type="text"
                                value={localName}
                                onChange={handleNameChange}
                                placeholder="Nome do utilizador..."
                                className="bg-transparent text-center text-lg lg:text-xl font-black neon-text placeholder:text-slate-800 focus:outline-none transition-all px-4 py-0.5 leading-[1.35] w-full text-ellipsis overflow-hidden whitespace-nowrap"
                                aria-label="Nome do usuário" // FIX 5.3e
                                maxLength={100}
                            />
                        </div>
                    </div>

                    {/* ─── RIGHT SIDE ─── */}
                    <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
                        <button
                            onClick={onUndo}
                            className="p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.08] transition-all text-slate-500 hover:text-white group relative flex-shrink-0"
                            aria-label="Desfazer última ação" // FIX 5.3e
                        >
                            <RotateCcw size={16} aria-hidden="true" />
                            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest bg-black/90 border border-white/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                Desfazer
                            </span>
                        </button>
                        <div className="h-8 w-[1px] bg-white/[0.05] mx-1 flex-shrink-0" />
                        <TimeDisplay clockTime={clockTime} />
                    </div>
                </div>
            </header>
        </>
    );
});

export default Header;

