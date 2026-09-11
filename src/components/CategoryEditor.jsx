import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
// ✅ FIX S02: DOMPurify adicionado para sanitizar entradas no CategoryEditor
import DOMPurify from 'dompurify';
import { Settings, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { normalize } from '../utils/normalization';
import { useToast } from '../hooks/useToast';

export default function CategoryEditor({ category, isOpen, onClose }) {
    const modalRef = useRef(null);

    const updateCategoryFields = useAppStore(state => state.updateCategoryFields);
    const showToast = useToast();

    // BUG-T16 FIX: Obter todas as categorias para verificar duplicatas.
    const allCategories = useAppStore(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId];
        const raw = contest?.categories || [];
        return Array.isArray(raw) ? raw : Object.values(raw);
    });

    const effectiveOpen = isOpen && Boolean(category);

    useModalAccessibility(effectiveOpen, onClose, modalRef);

    const titleId = useId();
    const nameInputId = useId();
    const maxScoreInputId = useId();
    const minCutoffInputId = useId();
    const colorInputId = useId();

    const [minCutoff, setMinCutoff] = useState(category?.minCutoff ?? 0);
    const [maxScore, setMaxScore] = useState(category?.maxScore ?? 100);
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#3b82f6');

    useEffect(() => {
        if (effectiveOpen && category) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMinCutoff(category.minCutoff ?? 0);
            setMaxScore(category.maxScore ?? 100);
            setName(category.name || '');
            setColor(category.color || '#3b82f6');
        }
    }, [effectiveOpen, category]);

    const canSave = Boolean(category) && name.trim().length > 0;

    const handleSave = (e) => {
        e.preventDefault();

        if (!canSave || !updateCategoryFields || !category) {
            return;
        }

        // ✅ FIX S02: Sanitização do nome da disciplina
        const cleanName = DOMPurify.sanitize(name.trim());
        if (!cleanName) {
            console.warn('[CategoryEditor] Nome rejeitado por conter HTML malicioso.');
            return;
        }

        // BUG-T16 FIX: Verificar se já existe outra categoria com o mesmo nome.
        const isDuplicate = allCategories.some(c =>
            c.id !== category.id &&
            normalize(c.name) === normalize(cleanName)
        );
        if (isDuplicate) {
            showToast('Já existe uma disciplina com este nome.', 'error');
            return;
        }

        const parsedMax = Math.max(0.1, Number(maxScore) || 100);
        const parsedMin = Math.max(0, Number(minCutoff) || 0);

        const safeMin = Math.min(parsedMin, parsedMax);

        // BUG-T15 FIX: Informar o usuário quando minCutoff foi clampado.
        if (parsedMin > parsedMax) {
            console.warn(
                `[CategoryEditor] minCutoff (${parsedMin}) > maxScore (${parsedMax}). ` +
                `Clampado para ${safeMin}.`
            );
        }
        const safeColor = /^#[0-9a-fA-F]{6}$/.test(color)
            ? color
            : '#3b82f6';

        updateCategoryFields(category.id, {
            name: cleanName,
            color: safeColor,
            minCutoff: Number(safeMin.toFixed(2)),
            maxScore: Number(parsedMax.toFixed(2))
        });

        onClose();
    };

    if (!effectiveOpen) {
        return null;
    }

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl relative z-10 p-6 flex flex-col focus:outline-none"
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-white">
                        <Settings size={20} aria-hidden="true" />
                        <h3 id={titleId} className="text-lg font-bold">
                            Editar Disciplina
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Fechar modal de edição"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label
                            htmlFor={nameInputId}
                            className="block text-xs text-slate-400 font-bold uppercase mb-1"
                        >
                            Nome
                        </label>

                        <input
                            id={nameInputId}
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            placeholder="Nome da disciplina"
                        />

                        {name.trim().length === 0 && (
                            <p className="mt-1 text-[11px] text-red-400">
                                O nome da disciplina é obrigatório.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label
                                htmlFor={maxScoreInputId}
                                className="block text-xs text-slate-400 font-bold uppercase mb-1"
                                title="Pontuação Máxima"
                            >
                                Máxima (Pts)
                            </label>

                            <input
                                id={maxScoreInputId}
                                type="number"
                                min="0.1"
                                step="any"
                                value={maxScore}
                                onChange={e => setMaxScore(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        <div className="flex-1">
                            <label
                                htmlFor={minCutoffInputId}
                                className="block text-xs text-slate-400 font-bold uppercase mb-1"
                                title="Mínimo exigido pelo edital nesta matéria"
                            >
                                Nota Mínima
                            </label>

                            <input
                                id={minCutoffInputId}
                                type="number"
                                min="0"
                                max={maxScore}
                                step="any"
                                value={minCutoff}
                                onChange={e => setMinCutoff(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor={colorInputId}
                            className="block text-xs text-slate-400 font-bold uppercase mb-1"
                        >
                            Cor
                        </label>

                        <input
                            id={colorInputId}
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg h-10 px-1 py-1 cursor-pointer focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={!canSave}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

