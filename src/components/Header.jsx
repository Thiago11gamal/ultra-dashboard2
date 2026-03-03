import React, { useState, useEffect } from 'react';
import { Plus, LayoutDashboard, RotateCcw, CloudDownload, Trash2, LogOut, X, ChevronRight, Download, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/useAuth';

const useClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return time;
};

const DateDisplay = ({ time }) => (
    <p className="text-slate-400 pl-2">
        {format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
    </p>
);

const TimeDisplay = ({ time }) => (
    <div className="glass px-4 py-2 text-lg font-mono hidden md:block">
        {format(time, 'HH:mm:ss')}
    </div>
);

/* ─────────────────────────────────────────────────────────
   Profile Side Drawer (mobile only)
───────────────────────────────────────────────────────── */
function ProfileDrawer({ open, onClose, user, contests, activeContestId, onSwitchContest, onCreateContest, onDeleteContest, onLogout, onExport, onImport }) {
    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Drawer panel */}
            <div className={`
                fixed top-0 right-0 h-full w-72 z-[210] md:hidden
                bg-gradient-to-b from-slate-900 to-slate-950
                border-l border-white/10 shadow-2xl
                transition-transform duration-300 ease-out
                flex flex-col
                ${open ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/8">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
                            {user.avatar}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight truncate max-w-[140px]">
                                {user.name || 'Meu Painel'}
                            </p>
                            <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                                Nível {user.level || 1} · {user.xp || 0} XP
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Contests List */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-3">
                        Meus Painéis
                    </p>
                    {contests && Object.entries(contests).map(([id, contestData]) => {
                        const isActive = id === activeContestId;
                        return (
                            <div
                                key={id}
                                className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-purple-500/20 border border-purple-500/30'
                                    : 'hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                <button
                                    onClick={() => { if (!isActive) onSwitchContest(id); onClose(); }}
                                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-purple-500/30' : 'bg-white/5'}`}>
                                        <LayoutDashboard size={15} className={isActive ? 'text-purple-300' : 'text-slate-400'} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-purple-200' : 'text-slate-300'}`}>
                                            {contestData?.user?.name || 'Sem nome'}
                                        </p>
                                        {isActive && (
                                            <p className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Ativo</p>
                                        )}
                                    </div>
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {isActive
                                        ? <ChevronRight size={14} className="text-purple-400" />
                                        : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteContest(id); }}
                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )
                                    }
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="px-3 pb-6 pt-3 border-t border-white/8 space-y-1">
                    <button
                        onClick={() => { onCreateContest(); onClose(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
                    >
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Plus size={15} className="text-green-400" />
                        </div>
                        Criar Novo Painel
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <LogOut size={15} className="text-red-400" />
                        </div>
                        Sair da Conta
                    </button>
                </div>
            </div>
        </>
    );
}

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
    onImport
}) {
    const { logout } = useAuth();
    const clockTime = useClock();

    const [profileOpen, setProfileOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleLogout = async () => {
        if (window.confirm("Deseja realmente sair?")) {
            try {
                await logout();
            } catch (err) {
                console.error("Erro ao sair", err);
            }
        }
    };

    const [localName, setLocalName] = useState(user.name);
    const [prevName, setPrevName] = useState(user.name);

    if (user.name !== prevName) {
        setLocalName(user.name);
        setPrevName(user.name);
    }

    const handleNameBlur = () => {
        if (localName !== user.name && onUpdateName) {
            onUpdateName(localName);
        }
    };

    const toggleProfile = () => setProfileOpen(!profileOpen);

    return (
        <>
            {/* ─── MOBILE HEADER ─── */}
            <div className="md:hidden mb-3">
                {/* Top row: date left, actions right */}
                <div className="flex items-center justify-between mb-2.5">
                    {/* Date */}
                    <div className="flex flex-col">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-0.5">
                            {format(clockTime, "EEEE", { locale: ptBR })}
                        </p>
                        <p className="text-white/60 text-xs font-semibold leading-none">
                            {format(clockTime, "d 'de' MMM", { locale: ptBR })}
                        </p>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        {/* Undo */}
                        <button
                            onClick={onUndo}
                            className="w-9 h-9 flex items-center justify-center rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            title="Desfazer"
                        >
                            <RotateCcw size={16} />
                        </button>

                        {/* Avatar → opens drawer */}
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-base hover:scale-105 transition-transform shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/30"
                        >
                            {user.avatar}
                        </button>
                    </div>
                </div>

                {/* Contest name with purple left border accent */}
                <div className="border-l-[3px] border-purple-500 pl-3 bg-white/[0.02] rounded-r-xl py-1">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Nome do concurso..."
                        className="w-full bg-transparent text-[22px] font-black neon-text placeholder:text-slate-600 focus:outline-none tracking-tight leading-tight"
                    />
                    {cloudStatus.hasConflict && (
                        <button
                            onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }}
                            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[9px] uppercase"
                        >
                            <CloudDownload size={9} /> Sincronizar
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
            />

            {/* ─── DESKTOP HEADER (unchanged) ─── */}
            <header className="hidden md:flex items-center justify-between z-50 relative">
                {/* Left: Contest Name + Date */}
                <div className="w-1/2 flex flex-col">
                    <div className="relative group flex items-center gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                onBlur={handleNameBlur}
                                placeholder="Digite o nome do concurso..."
                                className="w-full bg-transparent text-3xl md:text-4xl font-bold neon-text placeholder:text-slate-600 focus:outline-none focus:border-b-2 focus:border-purple-500 transition-all px-2 py-1"
                            />
                        </div>
                        <div className="flex flex-col items-end gap-1">
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
                        <div className="absolute -top-4 left-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Foco Principal ✏️
                        </div>
                    </div>
                    <div className="mt-1">
                        <DateDisplay time={clockTime} />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onUndo}
                        className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white group relative"
                        title="Desfazer última ação"
                    >
                        <RotateCcw size={20} />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Desfazer
                        </span>
                    </button>

                    <TimeDisplay time={clockTime} />

                    {/* Desktop Avatar / Profile Menu */}
                    <div className="relative">
                        <button
                            onClick={toggleProfile}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl hover:scale-105 transition-transform cursor-pointer"
                        >
                            {user.avatar}
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-4 w-64 glass border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-fade-in-down">
                                <div className="px-3 py-2 border-b border-white/10 mb-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Meus Painéis</p>
                                </div>
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
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
                                                <span className="truncate text-sm">{contestData?.user?.name || 'Sem nome'}</span>
                                            </button>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {id === activeContestId && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2"></div>}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteContest(id); }}
                                                    className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
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
                                        onClick={() => { onCreateContest(); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                                    >
                                        <Plus size={16} />
                                        <span>Criar Novo Painel</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        <span>Sair da Conta</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Backdrop desktop */}
                        {profileOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}
