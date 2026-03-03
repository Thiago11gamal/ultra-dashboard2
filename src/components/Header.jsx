import React, { useState, useEffect } from 'react';
import { Plus, LayoutDashboard, RotateCcw, CloudDownload, Trash2, LogOut } from 'lucide-react';
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

export default function Header({
    user = { name: 'Visitante', avatar: '👤', xp: 0, level: 1 },
    onUpdateName,
    contests = {},
    activeContestId,
    onSwitchContest,
    onCreateContest,
    onDeleteContest,
    onUndo,
    cloudStatus = { connected: false, syncing: false }
}) {
    const { logout } = useAuth();
    const clockTime = useClock();

    const [profileOpen, setProfileOpen] = useState(false);

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
        <header className="mb-4 md:mb-8 md:mt-4 z-50 relative">

            {/* MOBILE: Date + Avatar row */}
            <div className="flex md:hidden items-center justify-between mb-3 px-0.5">
                <p className="text-slate-500 text-[11px] pl-1">
                    {format(clockTime, "EEEE, d MMM", { locale: ptBR })}
                </p>
                <div className="flex items-center gap-2">
                    {/* Undo */}
                    <button onClick={onUndo} className="p-2 rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-white" title="Desfazer">
                        <RotateCcw size={16} />
                    </button>
                    {/* Avatar */}
                    <div className="relative">
                        <button
                            onClick={toggleProfile}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg hover:scale-105 transition-transform cursor-pointer"
                        >
                            {user.avatar}
                        </button>
                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 glass border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-fade-in-down">
                                <div className="px-3 py-2 border-b border-white/10 mb-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Meus Painéis</p>
                                </div>
                                <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar">
                                    {contests && Object.entries(contests).map(([id, contestData]) => (
                                        <div key={id} className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors group ${id === activeContestId ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-white/5'}`}>
                                            <button onClick={() => { if (id !== activeContestId) onSwitchContest(id); setProfileOpen(false); }} className={`flex-1 flex items-center gap-2 text-left overflow-hidden ${id === activeContestId ? 'text-purple-300' : 'text-slate-300'}`}>
                                                <LayoutDashboard size={14} className="shrink-0" />
                                                <span className="truncate text-sm">{contestData?.user?.name || 'Sem nome'}</span>
                                            </button>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {id === activeContestId && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-1"></div>}
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteContest(id); }} className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-white/10 mt-2 pt-2 space-y-1">
                                    <button onClick={() => { onCreateContest(); setProfileOpen(false); }} className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-sm">
                                        <Plus size={14} /> Novo Painél
                                    </button>
                                    <button onClick={handleLogout} className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm">
                                        <LogOut size={14} /> Sair
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE: Contest Name - big and clear */}
            <div className="md:hidden px-0.5">
                <div className="relative border-l-4 border-purple-500/60 pl-3">
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="Nome do concurso..."
                        className="w-full bg-transparent text-2xl font-black neon-text placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                    {cloudStatus.hasConflict && (
                        <button onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }} className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[9px] uppercase">
                            <CloudDownload size={9} /> Par
                        </button>
                    )}
                </div>
            </div>

            {/* DESKTOP: full layout unchanged */}
            <div className="hidden md:flex items-center justify-between mt-2">
                {/* Left: Contest Name */}
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
                                <button onClick={(e) => { e.stopPropagation(); if (cloudStatus.forcePull) cloudStatus.forcePull(); }} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[9px] uppercase tracking-tighter hover:bg-yellow-500/30 transition-all" title="Forçar Paridade">
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

                    {/* Avatar / Profile Menu */}
                    <div className="relative">
                        <button
                            onClick={toggleProfile}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl hover:scale-105 transition-transform cursor-pointer"
                        >
                            {user.avatar}
                        </button>

                        {/* Dropdown Menu */}
                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-4 w-64 glass border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-fade-in-down">
                                <div className="px-3 py-2 border-b border-white/10 mb-2">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Meus Painéis</p>
                                </div>

                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {contests && Object.entries(contests).map(([id, contestData]) => (
                                        <div
                                            key={id}
                                            className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors group ${id === activeContestId
                                                ? 'bg-purple-500/20 border border-purple-500/30'
                                                : 'hover:bg-white/5'
                                                }`}
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteContest(id);
                                                    }}
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
                                        onClick={() => {
                                            onCreateContest();
                                            setProfileOpen(false);
                                        }}
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
                    </div>
                </div>

                {/* Backdrop for click outside */}
                {profileOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                )}
        </header>
    );
}
