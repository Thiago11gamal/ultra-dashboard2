import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LayoutDashboard, RotateCcw, CloudDownload, Trash2, LogOut, X, ChevronRight, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/useAuth';
import TrashModal from './TrashModal';
import useClock from '../hooks/useClock';
import ThemeSwitcher from './header/ThemeSwitcher';
import ProfileDrawer from './header/ProfileDrawer';

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
    settings,
    onThemeChange
}) {
    const { logout } = useAuth();

    const [profileOpen, setProfileOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [trashOpen, setTrashOpen] = useState(false);
    const [localName, setLocalName] = useState(user.name);
    const [isFocused, setIsFocused] = useState(false);

    // Sync localName with prop changes - BUG-FIX: Conditional check to prevent loop
    useEffect(() => {
        if (!isFocused && user?.name && localName !== user.name) {
            setLocalName(user.name);
        }
    }, [user?.name, isFocused, localName]); // Sync only when not focused

    const handleLogout = async () => {
        if (window.confirm("Deseja realmente sair?")) {
            try {
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

    const toggleProfile = () => setProfileOpen(!profileOpen);

    const handleOpenTrash = useCallback(() => setTrashOpen(true), []);
    const handleCloseTrash = useCallback(() => setTrashOpen(false), []);

    return (
        <>
            {/* ─── MOBILE HEADER ─── */}
            <div className="md:hidden mb-3">
                <div className="flex items-center justify-between mb-2.5">
                    <MobileClockDisplay />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onUndo}
                            className="w-9 h-9 flex items-center justify-center rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            title="Desfazer"
                        >
                            <RotateCcw size={16} />
                        </button>

                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="tour-step-1 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-base hover:scale-105 transition-transform shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/30"
                        >
                            {user.avatar}
                        </button>
                    </div>
                </div>

                <div className="border-l-[3px] border-purple-500 pl-3 bg-white/[0.02] rounded-r-xl py-1">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleNameBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.target.blur();
                            }
                        }}
                        placeholder="Nome do concurso..."
                        /* BUG-FIX: padding inferior (pb-2) aumentado para não cortar o efeito neon */
                        className="w-full bg-transparent text-xl font-black neon-text placeholder:text-slate-600 focus:outline-none leading-relaxed pb-2 pt-1"
                    />
                    {cloudStatus.hasConflict && (
                        <button
                            onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }}
                            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[11px] uppercase font-bold"
                        >
                            <CloudDownload size={14} /> Sincronizar
                        </button>
                    )}
                </div>
            </div>

            {/* Profile side drawer (mobile) */}
            <ProfileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                user={user}
                contests={contests}
                activeContestId={activeContestId}
                onSwitchContest={onSwitchContest}
                onCreateContest={onCreateContest}
                onDeleteContest={onDeleteContest}
                onLogout={handleLogout}
                onExport={onExport}
                onImport={onImport}
                onOpenTrash={handleOpenTrash}
                settings={settings}
                onThemeChange={onThemeChange}
            />

            <TrashModal isOpen={trashOpen} onClose={handleCloseTrash} />

            {/* ─── DESKTOP HEADER ─── */}
            <header className="hidden md:flex items-center justify-between z-50 relative pointer-events-none">
                <div className="flex flex-col gap-2 w-full max-w-[calc(50vw-320px)] min-w-[150px] pointer-events-auto">
                    <div className="relative group flex items-center gap-3">
                        <div className="flex-1 min-w-0 relative pt-4">
                            <span className="absolute top-0 left-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                                Foco Principal ✏️
                            </span>
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={handleNameBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.target.blur();
                                    }
                                }}
                                placeholder="Digite o nome do concurso..."
                                /* BUG-FIX: 'truncate' substituído por overflow-hidden whitespace-nowrap, com pb-2 para evitar decapitação das letras */
                                className="w-full bg-transparent text-xl lg:text-3xl font-bold neon-text placeholder:text-slate-600 focus:outline-none focus:border-b-2 focus:border-purple-500 transition-all px-2 py-1 pb-2 leading-relaxed overflow-hidden whitespace-nowrap text-ellipsis"
                            />
                        </div>
                        <div className="flex flex-col items-end gap-1 self-end pb-2">
                            {cloudStatus.hasConflict && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[9px] uppercase tracking-tighter hover:bg-yellow-500/30 transition-all"
                                    title="Forçar Paridade"
                                >
                                    <CloudDownload size={10} />
                                    <span>Forçar Paridade</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DateDisplay />
                        {cloudStatus.status !== 'idle' && (
                            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-500 backdrop-blur-md ${
                                cloudStatus.status === 'connected' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : cloudStatus.status === 'connecting'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                            }`} title={cloudStatus.error || ''}>
                                <div className="relative flex items-center justify-center h-full">
                                    <div className={`absolute w-2.5 h-2.5 rounded-full opacity-40 animate-ping ${
                                        cloudStatus.status === 'connected' ? 'bg-emerald-400' : cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                    }`} />
                                    <div className={`w-1.5 h-1.5 rounded-full z-10 ${
                                        cloudStatus.status === 'connected' ? 'bg-emerald-400' : cloudStatus.status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                                    } ${cloudStatus.syncing ? 'animate-pulse' : ''}`} />
                                </div>
                                <span className="opacity-90 mt-[1px]">
                                    {cloudStatus.status === 'connected' 
                                        ? (cloudStatus.syncing ? 'Sincronizando' : 'Nuvem Ativa')
                                        : cloudStatus.status === 'connecting'
                                            ? 'Conectando'
                                            : 'Nuvem Offline'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 pointer-events-auto">
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

                    <div className="relative">
                        <button
                            onClick={toggleProfile}
                            className="tour-step-1 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl hover:scale-105 transition-transform cursor-pointer"
                        >
                            {user.avatar}
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-4 w-64 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar bg-slate-900/98 border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-fade-in-down backdrop-blur-md">
                                <div className="px-3 py-2 border-b border-white/10 mb-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Meus Painéis</p>
                                </div>
                                <div className="space-y-1">
                                    {contests && Object.entries(contests).map(([id, contestData]) => (
                                        <div
                                            key={id}
                                            className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors group ${id === activeContestId ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-white/5'}`}
                                        >
                                            <button
                                                onClick={() => {
                                                    if (id !== activeContestId) onSwitchContest(id);
                                                    setProfileOpen(false);
                                                }}
                                                className={`flex-1 flex items-center gap-3 text-left overflow-hidden ${id === activeContestId ? 'text-purple-300' : 'text-slate-300'}`}
                                            >
                                                <LayoutDashboard size={16} className="shrink-0" />
                                                <span className="truncate text-sm">
                                                    {typeof contestData === 'string' ? contestData : contestData?.user?.name || 'Sem nome'}
                                                </span>
                                            </button>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {id === activeContestId && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2"></div>}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteContest(id); }}
                                                    className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                    title="Excluir Painel"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                                    <button
                                        onClick={() => { if (cloudStatus.forcePull) cloudStatus.forcePull(); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors border border-yellow-500/10"
                                    >
                                        <Download size={16} />
                                        <span>Resgatar da Nuvem</span>
                                    </button>

                                    <button
                                        onClick={() => { onCreateContest(); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                                    >
                                        <Plus size={16} />
                                        <span>Criar Novo Painel</span>
                                    </button>
                                    <button
                                        onClick={() => { handleOpenTrash(); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        <span>Lixeira</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        <span>Sair da Conta</span>
                                    </button>
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/10">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest px-1 mb-2">Aparência</p>
                                    <ThemeSwitcher currentMode={settings?.darkMode} onThemeChange={onThemeChange} />
                                </div>
                            </div>
                        )}

                        {profileOpen && (
                            <div className="fixed inset-0 z-40 pointer-events-auto" onClick={() => setProfileOpen(false)} />
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}
