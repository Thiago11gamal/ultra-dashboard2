import React, { useMemo, useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Sparkles, X, CheckCircle2, Layers } from 'lucide-react';
import { parseVerticalizedSyllabus } from '../../utils/syllabusParser';
import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';
import { sanitizePlainText } from '../../utils/sanitizeText';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

const SAMPLE_PLACEHOLDER = `CONHECIMENTOS BÁSICOS
Língua Portuguesa (peso 15)
1. Compreensão e interpretação de textos
2. Sintaxe da oração e do período
3. Crase e regência verbal

CONHECIMENTOS ESPECÍFICOS
Direito Constitucional (peso 25)
1. Direitos e Garantias Fundamentais
2. Organização do Estado
3. Controle de Constitucionalidade`;

export default function SyllabusImporterModal({ isOpen, onClose, onImportCategories }) {
  const [rawText, setRawText] = useState('');
  const [overrides, setOverrides] = useState({});
  const modalRef = useRef(null);
  const titleId = useId();

  useModalAccessibility(isOpen, onClose, modalRef);

  const parsed = useMemo(() => {
    const base = parseVerticalizedSyllabus(rawText);
    return base
      .map((cat) => {
        const cleanName = sanitizePlainText(cat.name);
        if (!cleanName) return null;
        const overrideKey = normalize(cleanName);
        const ov = overrides[overrideKey];
        const cleanTasks = (cat.tasks || [])
          .map((t) => {
            const cleanText = sanitizePlainText(t.text);
            return cleanText ? { ...t, text: cleanText } : null;
          })
          .filter(Boolean);
        return {
          ...cat,
          name: cleanName,
          overrideKey,
          weight: ov?.weight !== undefined ? ov.weight : cat.weight,
          examGroup: ov?.examGroup !== undefined ? ov.examGroup : cat.examGroup,
          tasks: cleanTasks,
        };
      })
      .filter((cat) => cat && (cat.tasks.length > 0 || base.length === 1));
  }, [rawText, overrides]);

  if (!isOpen) return null;

  const totalTopics = parsed.reduce((acc, c) => acc + c.tasks.length, 0);

  const handleConfirm = () => {
    if (!parsed.length || typeof onImportCategories !== 'function') return;
    const nowIso = new Date().toISOString();
    const readyCategories = parsed.map((cat) => {
      const numericWeight = Number(cat.weight);
      const safeWeight = Number.isFinite(numericWeight)
        ? Math.min(100, Math.max(0.5, numericWeight))
        : 10;
      return {
        id: generateId('cat'),
        name: cat.name,
        color: cat.color,
        icon: '📚',
        weight: safeWeight,
        minCutoff: null,
        ...(cat.examGroup ? { examGroup: cat.examGroup } : {}),
        tasks: cat.tasks.map((t) => ({
          id: generateId('task'),
          text: t.text,
          title: t.text,
          completed: false,
          priority: t.priority || 'medium',
          createdAt: nowIso,
          updatedAt: nowIso,
        })),
        totalMinutes: 0,
        lastStudiedAt: null,
        createdAt: nowIso,
        lastUpdated: nowIso,
        updatedAt: nowIso,
        simuladoStats: { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: '-' },
      };
    });
    onImportCategories(readyCategories);
    setRawText('');
    setOverrides({});
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl border border-indigo-500/30 bg-slate-950 p-6 shadow-2xl space-y-5 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-300">
              <FileText size={20} />
            </div>
            <div>
              <h3 id={titleId} className="text-lg font-black text-white">Importador de Edital Verticalizado</h3>
              <p className="text-xs text-slate-400">
                Cole o conteúdo programático do edital — o parser detecta matérias, pesos, blocos (Básicos/Específicos) e tópicos automaticamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar importador"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="syllabus-raw-input" className="font-bold text-slate-300">
              Texto do Edital
            </label>
            <div className="flex items-center gap-3">
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setOverrides({});
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOverrides({});
                  setRawText(SAMPLE_PLACEHOLDER);
                }}
                className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} /> Carregar exemplo
              </button>
            </div>
          </div>
          <textarea
            id="syllabus-raw-input"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={7}
            placeholder={SAMPLE_PLACEHOLDER}
            className="w-full rounded-2xl bg-slate-900/80 border border-white/10 focus:border-indigo-400/60 p-3.5 text-xs text-slate-200 font-mono leading-relaxed outline-none resize-y"
          />
        </div>

        {/* Preview estruturado */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              Pré-visualização ({parsed.length} {parsed.length === 1 ? 'matéria' : 'matérias'} · {totalTopics} {totalTopics === 1 ? 'tópico' : 'tópicos'})
            </span>
          </div>

          {parsed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
              Cole o conteúdo do edital acima para pré-visualizar as disciplinas e assuntos antes de importar.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {parsed.map((cat) => (
                <div key={cat.overrideKey || cat.name} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-black text-white truncate">{cat.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        ({cat.tasks.length} {cat.tasks.length === 1 ? 'assunto' : 'assuntos'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <label className="flex items-center gap-1 bg-slate-950/80 border border-white/10 rounded-lg px-2 py-0.5 text-slate-300">
                        <span>Peso:</span>
                        <input
                          type="number"
                          min={0.5}
                          max={100}
                          step="any"
                          value={cat.weight}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOverrides((prev) => ({
                              ...prev,
                              [cat.overrideKey]: {
                                ...(prev[cat.overrideKey] || {}),
                                weight: val === '' ? '' : Number(val),
                              },
                            }));
                          }}
                          onBlur={(e) => {
                            const num = Number(e.target.value);
                            const clamped = Number.isFinite(num) ? Math.min(100, Math.max(0.5, num)) : 10;
                            setOverrides((prev) => ({
                              ...prev,
                              [cat.overrideKey]: {
                                ...(prev[cat.overrideKey] || {}),
                                weight: clamped,
                              },
                            }));
                          }}
                          className="w-12 bg-transparent text-right font-mono font-bold text-white outline-none"
                          aria-label={`Peso de ${cat.name}`}
                        />
                      </label>
                      <select
                        value={cat.examGroup || ''}
                        onChange={(e) => setOverrides((prev) => ({
                          ...prev,
                          [cat.overrideKey]: {
                            ...(prev[cat.overrideKey] || {}),
                            examGroup: e.target.value,
                          },
                        }))}
                        aria-label={`Bloco de ${cat.name}`}
                        className="bg-slate-950/80 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-200 outline-none"
                      >
                        <option value="">Sem bloco</option>
                        <option value="basicos">Básicos</option>
                        <option value="especificos">Específicos</option>
                        <option value="discursiva">Discursiva</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.tasks.slice(0, 6).map((t, tIdx) => (
                      <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-slate-300 truncate max-w-[240px]">
                        {t.text}
                      </span>
                    ))}
                    {cat.tasks.length > 6 && (
                      <span className="text-[10px] px-2 py-0.5 text-slate-500">+{cat.tasks.length - 6} mais</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={parsed.length === 0}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-black text-white shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            <CheckCircle2 size={14} />
            Importar {parsed.length} Matéria(s)
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined' || !document?.body) return modalContent;
  return createPortal(modalContent, document.body);
}
