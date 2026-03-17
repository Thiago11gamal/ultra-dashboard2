import React from 'react';
import { X, RotateCcw, AlertTriangle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function TrashModal({ isOpen, onClose }) {
    const trash = useAppStore(state => state.appState.trash || []);
    const { restoreFromTrash, emptyTrash } = useAppStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pt-10">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up">
                
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold">
                        <Trash2 size={20} className="text-purple-400" />
                        <h2>Lixeira de Recuperação</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-3 bg-blue-500/10 border-b border-blue-500/20 text-xs text-blue-300/80 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-blue-400" />
                    <p>Itens excluídos ficam retidos aqui por 30 dias antes de serem apagados permanentemente para liberar espaço na memória do navegador.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {trash.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                            <Trash2 size={40} className="mb-3 opacity-20" />
                            <p>Sua lixeira está vazia.</p>
                        </div>
                    ) : (
                        trash.map(item => (
                            <div key={item.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${item.type === 'contest' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                                    {item.type === 'contest' ? '📊' : (item.data.icon || '📚')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-semibold truncate text-sm">
                                        {item.data.name || 'Item sem nome'}
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        {item.type === 'contest' ? 'Painel Completo' : 'Matéria'} • Excluído em {new Date(item.deletedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => restoreFromTrash(item.id)}
                                    className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    <RotateCcw size={12} />
                                    Restaurar
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {trash.length > 0 && (
                    <div className="px-5 py-4 border-t border-white/10 flex justify-end">
                         <button
                            onClick={() => {
                                if (window.confirm("Esvaziar lixeira? Essa ação remove os itens permanentemente.")) {
                                    emptyTrash();
                                }
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-red-400 transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
                        >
                            Esvaziar Lixeira
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
