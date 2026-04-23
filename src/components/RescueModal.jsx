import React, { useState } from 'react';
import { X, ShieldAlert, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const RescueModal = ({ isOpen, onClose, onInject }) => {
    const [backupId, setBackupId] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState(null);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!backupId.trim()) return;
        
        setStatus('loading');
        setError(null);
        
        try {
            const docRef = doc(db, 'backups', backupId.trim());
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                throw new Error("Backup não encontrado. Verifique se o ID está correto.");
            }

            const data = snap.data();
            
            // Detect structure
            const state = data.state?.appState || data.appState || data;
            const contestCount = Object.keys(state.contests || {}).length;
            const lastUpdate = state.lastUpdated || data._lastBackup || 'Desconhecido';

            setSummary({
                contestCount,
                lastUpdate: new Date(lastUpdate).toLocaleString('pt-BR'),
                fullData: state
            });
            setStatus('success');
        } catch (err) {
            console.error("[Rescue] Error:", err);
            setError(err.message);
            setStatus('error');
        }
    };

    const handleConfirm = () => {
        if (!summary?.fullData) return;
        
        if (window.confirm("ATENÇÃO: Isso irá substituir seus dados atuais pelos dados deste backup. Deseja continuar?")) {
            onInject(summary.fullData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative bg-[#0d1117] border border-amber-500/30 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-amber-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                            <ShieldAlert className="text-amber-500" size={20} />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">Resgate Profundo</h2>
                            <p className="text-amber-500/60 text-[10px] uppercase tracking-widest font-black">Recuperação de Emergência</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {status === 'idle' || status === 'error' ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID do Backup (Firestore)</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={backupId}
                                        onChange={(e) => setBackupId(e.target.value)}
                                        placeholder="Ex: 291jO0zyhCe..."
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-all font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs">
                                    <AlertCircle size={16} />
                                    <p>{error}</p>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 leading-relaxed">
                                Insira o ID do documento encontrado na coleção <code className="text-amber-500/70">backups</code> do Firestore para tentar uma restauração direta.
                            </p>

                            <button
                                onClick={handleSearch}
                                disabled={!backupId.trim() || status === 'loading'}
                                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white font-bold transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                Buscar Backup
                            </button>
                        </>
                    ) : status === 'loading' ? (
                        <div className="py-10 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="animate-spin text-amber-500" size={40} />
                            <p className="text-slate-400 text-sm animate-pulse">Consultando base de dados...</p>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <CheckCircle2 size={20} />
                                    <span className="font-bold text-sm">Dados Localizados!</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">Painéis</p>
                                        <p className="text-white font-bold">{summary.contestCount}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">Última Atualização</p>
                                        <p className="text-white font-bold text-[10px]">{summary.lastUpdate}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all border border-white/5"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-900/20"
                                >
                                    Injetar e Restaurar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-center">
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Ultra Resgate v2.0</p>
                </div>
            </div>
        </div>
    );
};

export default RescueModal;
