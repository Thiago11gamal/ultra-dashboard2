import React from 'react';
import { X, LayoutDashboard, Plus, Trash2, Download, Upload, LogOut, ChevronRight } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';

/**
 * ProfileDrawer component for mobile navigation and settings.
 */
function ProfileDrawer({ open, onClose, user, contests, activeContestId, onSwitchContest, onCreateContest, onDeleteContest, onLogout, onExport, onImport, onOpenTrash, settings, onThemeChange, forcePullCloud }) {
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
                flex flex-col overflow-y-auto custom-scrollbar
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
                                            {typeof contestData === 'string' ? contestData : contestData?.user?.name || 'Sem nome'}
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
                        onClick={() => { onOpenTrash(); onClose(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <Trash2 size={15} className="text-slate-400" />
                        </div>
                        Lixeira
                    </button>

                    {onExport && (
                        <button
                            onClick={onExport}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                <Download size={15} className="text-slate-400" />
                            </div>
                            Exportar Backup
                        </button>
                    )}

                    {onImport && (
                        <>
                            <button
                                onClick={() => { if (forcePullCloud) forcePullCloud(); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-yellow-300/80 hover:bg-yellow-500/10 hover:text-yellow-300 transition-colors text-sm font-medium border border-yellow-500/10"
                            >
                                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                                    <Download size={15} className="text-yellow-400" />
                                </div>
                                Resgatar da Nuvem
                            </button>

                            <label className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium cursor-pointer">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Upload size={15} className="text-slate-400" />
                                </div>
                                Restaurar Dados
                                <input type="file" accept=".json" onChange={(e) => { onImport(e); onClose(); }} className="hidden" />
                            </label>
                        </>
                    )}

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium mt-2 border-t border-white/5"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <LogOut size={15} className="text-red-400" />
                        </div>
                        Sair da Conta
                    </button>

                    <div className="pt-4 mt-2 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest px-2 mb-2">Aparência do Tema</p>
                        <ThemeSwitcher currentMode={settings?.darkMode} onThemeChange={onThemeChange} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default ProfileDrawer;
