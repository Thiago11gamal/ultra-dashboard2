import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ConfirmModal from './ConfirmModal';

const getTrashItemMeta = (item) => {
    const isContest = item?.type === 'contest';
    const isCategory = item?.type === 'category';

    const title = isContest
        ? (item?.data?.contestName || item?.data?.name || 'Painel sem nome')
        : (item?.data?.category?.name || item?.data?.name || 'Matéria sem nome');

    const icon = isContest
        ? '📊'
        : (item?.data?.category?.icon || item?.data?.icon || '📚');

    const subtitle = isContest ? 'Painel Completo' : (isCategory ? 'Matéria' : 'Item');

    return { title, icon, subtitle, isContest };
};

const TrashModalContent = ({ isOpen, onClose }) => {
    const rawTrash = useAppStore(state => state.appState?.trash);
    const trash = Array.isArray(rawTrash) ? rawTrash : Object.values(rawTrash || {});
    const restoreFromTrash = useAppStore(state => state.restoreFromTrash);
    const emptyTrash = useAppStore(state => state.emptyTrash);
    const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pt-10">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

                {/* Modal Window */}
                <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-scale-in">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2 text-slate-200 font-bold">
                            <Trash2 size={18} className="text-red-400" />
                            <span>Lixeira do Sistema</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-normal">
                                {trash.length} {trash.length === 1 ? 'item' : 'itens'}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content List */}
                    <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                        {trash.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                <Trash2 size={36} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">A lixeira está vazia</p>
                                <p className="text-xs opacity-75 mt-0.5">Itens excluídos aparecerão aqui para recuperação.</p>
                            </div>
                        ) : (
                            trash.map(item => {
                                const { title, icon, subtitle } = getTrashItemMeta(item);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <span className="text-xl shrink-0">{icon}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-200 truncate">{title}</p>
                                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{subtitle}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => restoreFromTrash(item.id)}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                                            title="Restaurar este item"
                                        >
                                            <RotateCcw size={12} />
                                            Restaurar
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {trash.length > 0 && (
                        <div className="px-5 py-4 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setShowEmptyTrashConfirm(true)}
                                className="text-xs font-bold text-slate-400 hover:text-red-400 transition-colors py-2 px-3 rounded-lg hover:bg-white/5 cursor-pointer"
                            >
                                Esvaziar Lixeira
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showEmptyTrashConfirm}
                onClose={() => setShowEmptyTrashConfirm(false)}
                onConfirm={() => emptyTrash()}
                title="Esvaziar Lixeira"
                message="Esvaziar lixeira? Essa ação removerá permanentemente todos os itens arquivados e não poderá ser desfeita."
                confirmText="Esvaziar Agora"
                type="danger"
                icon={Trash2}
            />
        </>
    );
};

const TrashModal = React.memo(TrashModalContent);
export default TrashModal;
