import React, { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
// ✅ FIX S02: DOMPurify adicionado para sanitizar entradas no CategoryEditor
import DOMPurify from 'dompurify';
import { Settings, X, Check, Pipette } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { normalize } from '../utils/normalization';
import { useToast } from '../hooks/useToast';
import {
    PRESET_CATEGORY_COLORS,
    normalizeHexColor,
    hexToRgba,
    DEFAULT_CATEGORY_COLOR
} from '../utils/colorHelper';

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
    const [color, setColor] = useState(normalizeHexColor(category?.color, DEFAULT_CATEGORY_COLOR));

    useEffect(() => {
        if (effectiveOpen && category) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMinCutoff(category.minCutoff ?? 0);
            setMaxScore(category.maxScore ?? 100);
            setName(category.name || '');
            setColor(normalizeHexColor(category.color, DEFAULT_CATEGORY_COLOR));
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
            c && c.id !== category.id &&
            normalize(c.name || '') === normalize(cleanName)
        );
        if (isDuplicate) {
            showToast('Já existe uma disciplina com este nome.', 'error');
            return;
        }

        const rawMax = Number(maxScore);
        const parsedMax = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 100;
        const rawMin = Number(minCutoff);
        const parsedMin = Number.isFinite(rawMin) && rawMin >= 0 ? rawMin : 0;

        const safeMin = Math.min(parsedMin, parsedMax);

        // BUG-T15 FIX: Informar o usuário quando minCutoff foi clampado.
        if (parsedMin > parsedMax) {
            console.warn(
                `[CategoryEditor] minCutoff (${parsedMin}) > maxScore (${parsedMax}). ` +
                `Clampado para ${safeMin}.`
            );
        }
        const safeColor = normalizeHexColor(color, DEFAULT_CATEGORY_COLOR);

        updateCategoryFields(category.id || category.name, {
            name: cleanName,
            color: safeColor,
            minCutoff: Number(safeMin.toFixed(2)),
            maxScore: Number(parsedMax.toFixed(2))
        });

        showToast('Disciplina atualizada com sucesso!', 'success');
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
                        <div className="flex items-center justify-between mb-2">
                            <label
                                htmlFor={colorInputId}
                                className="block text-xs text-slate-400 font-bold uppercase"
                            >
                                Paleta de Cores
                            </label>
                            <span className="text-[11px] font-mono text-slate-400 uppercase">
                                {normalizeHexColor(color, DEFAULT_CATEGORY_COLOR)}
                            </span>
                        </div>

                        {/* Grade de cores predefinidas */}
                        <div className="grid grid-cols-6 gap-2 mb-3">
                            {PRESET_CATEGORY_COLORS.map((preset) => {
                                const isSelected = normalizeHexColor(color) === preset.toLowerCase();
                                return (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setColor(preset)}
                                        className={`h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-110 active:scale-95 ${
                                            isSelected
                                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md scale-105'
                                                : 'hover:opacity-90'
                                        }`}
                                        style={{ backgroundColor: preset }}
                                        title={`Selecionar cor ${preset}`}
                                        aria-label={`Cor ${preset}`}
                                    >
                                        {isSelected && (
                                            <Check size={14} strokeWidth={3} className="text-white drop-shadow" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Seletor de cor personalizada e preview */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center gap-2 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 focus-within:border-purple-500">
                                <Pipette size={14} className="text-slate-400" />
                                <span className="text-xs text-slate-300">Personalizada:</span>
                                <input
                                    id={colorInputId}
                                    type="color"
                                    value={normalizeHexColor(color, DEFAULT_CATEGORY_COLOR)}
                                    onChange={e => setColor(e.target.value)}
                                    className="w-7 h-7 rounded border-0 p-0 cursor-pointer bg-transparent ml-auto"
                                    title="Escolher cor personalizada"
                                />
                            </div>

                            {/* Preview em tempo real da disciplina */}
                            <div
                                className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 truncate max-w-[140px]"
                                style={{
                                    backgroundColor: hexToRgba(color, 0.15, DEFAULT_CATEGORY_COLOR),
                                    borderColor: hexToRgba(color, 0.35, DEFAULT_CATEGORY_COLOR),
                                    color: normalizeHexColor(color, DEFAULT_CATEGORY_COLOR)
                                }}
                                title="Pré-visualização do tema da disciplina"
                            >
                                <span className="text-sm">📚</span>
                                <span className="truncate">{name.trim() || 'Exemplo'}</span>
                            </div>
                        </div>
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

