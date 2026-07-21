import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

export default function CategoryEditor({ category, isOpen, onClose }) {
    const modalRef = useRef(null);
    useModalAccessibility(isOpen, onClose, modalRef);
    const updateCategoryFields = useAppStore(state => state.updateCategoryFields);
    
    // We'll manage local state for the inputs
    const [minCutoff, setMinCutoff] = useState(category?.minCutoff || 0);
    const [maxScore, setMaxScore] = useState(category?.maxScore || 100);
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#3b82f6');

    useEffect(() => {
        if (isOpen && category) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMinCutoff(category.minCutoff || 0);
            setMaxScore(category.maxScore || 100);
            setName(category.name || '');
            setColor(category.color || '#3b82f6');
        }
    }, [isOpen, category]);

    const handleSave = () => {
        if (updateCategoryFields) {
            const parsedMax = Math.max(1, parseInt(maxScore, 10) || 100);
            const parsedMin = Math.max(0, parseInt(minCutoff, 10) || 0);
            
            updateCategoryFields(category.id, {
                name,
                color,
                minCutoff: Math.min(parsedMin, parsedMax),
                maxScore: parsedMax
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 p-6 flex flex-col"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-white">
                        <Settings size={20} />
                        <h3 className="text-lg font-bold">Editar Disciplina</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Nome</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold uppercase mb-1" title="Pontuação Máxima">Máxima (Pts)</label>
                            <input 
                                type="number" 
                                min="0" 
                                value={maxScore} 
                                onChange={e => setMaxScore(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold uppercase mb-1" title="Mínimo exigido pelo edital nesta matéria">Nota Mínima</label>
                            <input 
                                type="number" 
                                min="0" 
                                max={maxScore}
                                value={minCutoff} 
                                onChange={e => setMinCutoff(e.target.value)} 
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Cor</label>
                        <input 
                            type="color" 
                            value={color} 
                            onChange={e => setColor(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg h-10 px-1 py-1 cursor-pointer focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:text-white transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20">Salvar</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
