
import React, { useState, useEffect } from 'react';
import { Bell, Plus, LogOut, LayoutDashboard, RotateCcw, CloudUpload, CloudDownload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { uploadDataToCloud, downloadDataFromCloud } from '../services/cloudSync';


export default function Header({
    user,
    onUpdateName,
    contests,
    activeContestId,
    onSwitchContest,
    onCreateContest,
    onDeleteContest,
    onUndo,
    onCloudRestore,
    currentData
}) {
    const [time, setTime] = useState(new Date());

    const [profileOpen, setProfileOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCloudBackup = async () => {
        if (!window.confirm('Subir backup para a nuvem?')) return;
        setIsSyncing(true);
        try {
            await uploadDataToCloud(currentData);
            alert('Backup salvo na nuvem com sucesso! ☁️');
        } catch (error) {
            alert('Erro ao salvar backup: ' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCloudDownload = async () => {
        if (!window.confirm('Restaurar backup da nuvem? Isso substituirá os dados atuais.')) return;
        setIsSyncing(true);
        try {
            const data = await downloadDataFromCloud();
            if (data && onCloudRestore) {
                onCloudRestore(data);
            }
        } catch (error) {
            alert('Erro ao baixar backup: ' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };



    const toggleProfile = () => setProfileOpen(!profileOpen);

    return (
        <header className="flex items-center justify-between mb-8 mt-32 z-50 relative">
            {/* Left: Editable Contest Name */}
            <div className="w-1/2">
                <div className="relative group">
                    <input
                        type="text"
                        value={user.name}
                        onChange={(e) => onUpdateName(e.target.value)}
                        placeholder="Digite o nome do concurso..."
                        className="w-full bg-transparent text-5xl font-bold neon-text placeholder:text-slate-600 focus:outline-none focus:border-b-2 focus:border-purple-500 transition-all px-2 py-1"
                    />
                    <div className="absolute -top-4 left-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Foco Principal ✏️
                    </div>
                </div>
                <p className="text-slate-400 mt-2 pl-2">
                    {format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Cloud Sync Buttons */}
                <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-4">

                    <button
                        onClick={handleCloudBackup}
                        disabled={isSyncing}
                        className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-green-400 group relative"
                        title="Salvar na Nuvem"
                    >
                        <CloudUpload size={20} className={isSyncing ? 'animate-bounce' : ''} />
                    </button>
                    <button
                        onClick={handleCloudDownload}
                        disabled={isSyncing}
                        className="p-3 rounded-xl glass hover:bg-white/10 transition-colors text-slate-400 hover:text-blue-400 group relative"
                        title="Restaurar da Nuvem"
                    >
                        <CloudDownload size={20} className={isSyncing ? 'animate-bounce' : ''} />
                    </button>
                </div>

                {/* Undo Button */}
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

                {/* Live Clock */}
                <div className="glass px-4 py-2 text-lg font-mono hidden md:block">
                    {format(time, 'HH:mm:ss')}
                </div>



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
                                                    // Don't close profile here to allow deleting multiple if needed, or close? 
                                                    // User might want to manage list. Let's keep it open or close? 
                                                    // Usually delete confirms -> likely re-render.
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

                            <div className="mt-2 pt-2 border-t border-white/10">
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
