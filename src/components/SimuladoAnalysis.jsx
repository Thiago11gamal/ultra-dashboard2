import React, { useState, useRef } from 'react';
import { normalize, aliases } from '../utils/normalization';

import { BrainCircuit, Play, FileText, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function SimuladoAnalysis({ rows: propRows, onRowsChange, onAnalysisComplete, categories = [] }) {
    // Stable ID counter to avoid regenerating IDs on every render
    const idCounter = useRef(0);

    // BUG FIX: ++idCounter.current was being called DURING render (side-effect in render phase).
    // This regenerated IDs on EVERY re-render, causing inputs to lose focus on every keystroke
    // because React reconciled them as different elements. Fixed by only assigning if missing.
    const rows = (propRows && propRows.length > 0)
        ? propRows.map(r => ({ ...r, id: r.id || `row-${idCounter.current++}` }))
        : [{ id: `row-init-0`, subject: '', topic: '', correct: 0, total: 0 }];

    // Helper to report changes up to parent
    const setRows = (newRows) => {
        if (onRowsChange) onRowsChange(newRows);
    };

    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [error, setError] = useState(null);

    const updateRow = (index, field, value) => {
        // 1. SanitizaÃ§Ã£o: Apenas nÃºmeros para campos numÃ©ricos
        let finalValue = value;

        if (field === 'correct' || field === 'total') {
            // Remove tudo que nÃ£o for dÃ­gito
            const val = parseInt(String(value).replace(/\D/g, '')) || 0;

            if (field === 'correct') {
                const currentTotal = parseInt(rows[index].total) || 0;
                // Enforce: Correct cannot exceed Total (unless Total is 0 during typing, but result is clamped)
                if (currentTotal > 0 && val > currentTotal) finalValue = currentTotal;
                else finalValue = val;
            } else if (field === 'total') {
                const currentCorrect = parseInt(rows[index].correct) || 0;
                // If Total is reduced below Correct, clamp Correct
                if (val < currentCorrect) {
                    const newRows = rows.map((r, i) => i === index ? { ...r, total: val, correct: val } : r);
                    setRows(newRows);
                    return;
                }
                finalValue = val;
            }
        }

        // 3. AtualizaÃ§Ã£o ImutÃ¡vel
        const newRows = rows.map((row, i) => {
            if (i === index) {
                return { ...row, [field]: finalValue };
            }
            return row;
        });

        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { id: `row-${Date.now()}-${Math.random()}`, subject: '', topic: '', correct: 0, total: 0 }]);
    };

    const removeRow = (index) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        }
    };

    const resetScores = () => {
        if (window.confirm('Deseja zerar apenas os valores (Acertos/Total) e manter as matérias?')) {
            const newRows = rows.map(row => ({ ...row, correct: 0, total: 0 }));
            setRows(newRows);
        }
    };

    const handleAnalyze = () => {
        // 0. Strict Validation: Check if subjects exist in Dashboard
        if (categories && categories.length > 0) {

            const validDataMap = {};
            categories.forEach(cat => {
                const subName = normalize(cat.name);
                const topics = new Set((cat.tasks || []).map(t => normalize(t.title || t.text || '')));
                validDataMap[subName] = topics;

                // Add aliases mapping to the same topics
                if (aliases[subName]) {
                    aliases[subName].forEach(alias => {
                        const aliasNorm = normalize(alias);
                        validDataMap[aliasNorm] = topics;
                    });
                }
            });

            let invalidSubject = null;
            let invalidTopic = null;
            let targetSubject = '';
            let hasErrors = false;

            const validatedRows = rows.map(r => {
                if (!r.subject && !r.topic) return r;

                const subNorm = normalize(r.subject);
                const topNorm = normalize(r.topic);

                const isSubValid = r.subject ? !!validDataMap[subNorm] : true;

                let isTopValid = true;
                if (r.topic) {
                    if (isSubValid && r.subject) {
                        isTopValid = validDataMap[subNorm].has(topNorm);
                    } else if (r.subject) {
                        isTopValid = false;
                    } else {
                        isTopValid = Object.values(validDataMap).some(set => set.has(topNorm));
                    }
                }

                let newRow = { ...r };

                if (r.subject && !isSubValid) {
                    invalidSubject = r.subject;
                    newRow.subject = '';
                    hasErrors = true;
                }

                if (r.topic && !isTopValid) {
                    invalidTopic = r.topic;
                    targetSubject = r.subject;
                    newRow.topic = '';
                    hasErrors = true;
                }

                return newRow;
            });

            if (hasErrors) {
                setRows(validatedRows);

                if (invalidSubject && invalidTopic) {
                    setError(`Matéria '${invalidSubject}' e Assunto '${invalidTopic}' não encontrados.`);
                } else if (invalidSubject) {
                    setError(`A matéria '${invalidSubject}' não existe no Dashboard.`);
                } else if (invalidTopic) {
                    setError(`O assunto '${invalidTopic}' não existe na matéria '${targetSubject}'.`);
                }

                setAnalysisData(null);
                return;
            }
        }

        const validRows = rows.filter(r => r.subject && r.topic);

        if (validRows.length === 0) {
            setError("Preencha pelo menos uma linha com Matéria e Assunto.");
            return;
        }





        setLoading(true);
        setError(null);
        setAnalysisData(null);

        // Simulate processing time for UX
        setTimeout(() => {
            try {
                // Local Analysis Logic
                const disciplinesMap = {};

                // 1. Group and Calculate
                validRows.forEach(row => {
                    const subj = row.subject.trim();
                    if (!disciplinesMap[subj]) {
                        disciplinesMap[subj] = {
                            name: subj,
                            topics: [],
                            totalCorrect: 0,
                            totalQuestions: 0
                        };
                    }

                    const total = parseInt(row.total) || 0;
                    const correct = parseInt(row.correct) || 0;
                    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

                    let status = 'ATENÇÃO';
                    let action = 'Treino Prático';

                    if (pct >= 80) {
                        status = 'DOMINADO';
                        action = 'Manter Revisão';
                    } else if (pct >= 60) {
                        status = 'BOM';
                        action = 'Refinar Detalhes';
                    } else if (pct <= 40) {
                        status = 'CRÍTICO';
                        action = 'Revisão Teórica + Questões';
                    }

                    disciplinesMap[subj].topics.push({
                        name: row.topic,
                        correct,
                        total,
                        percentage: pct,
                        status,
                        action
                    });

                    disciplinesMap[subj].totalCorrect += correct;
                    disciplinesMap[subj].totalQuestions += total;
                });

                // 2. Format Output
                const disciplines = Object.values(disciplinesMap).map(d => {
                    // Sort topics by lowest percentage (worst first)
                    d.topics.sort((a, b) => a.percentage - b.percentage);

                    const discPct = d.totalQuestions > 0 ? Math.round((d.totalCorrect / d.totalQuestions) * 100) : 0;

                    let overview = "";
                    if (discPct >= 80) overview = `Excelente (${discPct}%). Continue assim!`;
                    else if (discPct >= 60) overview = `Bom (${discPct}%). Quase lá.`;
                    else if (discPct <= 50) overview = `Baixo (${discPct}%). Foque na base.`;
                    else overview = `Mediano (${discPct}%). Pode evoluir.`;

                    return {
                        name: d.name,
                        overview,
                        topics: d.topics,
                        percentage: discPct // Add percentage for sorting
                    };
                });

                // Sort Disciplines by Performance (Worst First) to highlight problems
                disciplines.sort((a, b) => a.percentage - b.percentage);

                // 3. General Insight
                const totalQ = validRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
                const totalC = validRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
                const globalPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

                let generalInsight = "";
                if (globalPct >= 80) generalInsight = `Resultado Incrível! ${globalPct}%. Caminho certo.`;
                else if (globalPct >= 60) generalInsight = `Bom trabalho! ${globalPct}%. Ajuste os detalhes.`;
                else generalInsight = `Sinal de Alerta. ${globalPct}%. Reavalie a estratégia.`;

                const data = {
                    disciplines,
                    generalInsight
                };

                setAnalysisData(data);

                if (onAnalysisComplete) {
                    onAnalysisComplete({ analysis: data, rawRows: rows });
                }

            } catch (err) {
                console.error(err);
                setError("Erro ao processar dados.");
            } finally {
                setLoading(false);
            }
        }, 800); // Small delay for effect
    };

    return (
        <div className="w-full mx-auto space-y-6 animate-fade-in-down pb-20">

            {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <header className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 shrink-0">
                    <BrainCircuit size={32} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-bold neon-text">IA Analyzer Pro</h2>
                        <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-300 border border-purple-500/20 font-bold uppercase tracking-wider">
                            Modo Offline
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm">Identifica fraquezas e gera um plano de revisão personalizado.</p>
                </div>
            </header>

            {/* â”€â”€ GRID PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* â•â•â•â• PAINEL ESQUERDO: Entrada de dados â•â•â•â• */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">

                    {/* CabeÃ§alho do painel */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold flex items-center gap-2 text-slate-100">
                            <FileText size={16} className="text-blue-400" />
                            Dados do Simulado
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={resetScores}
                                className="text-[11px] text-slate-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-400/10 border border-transparent hover:border-yellow-400/20">
                                Zerar
                            </button>
                            <button onClick={() => { if (window.confirm('Limpar tudo?')) setRows([{ subject: '', topic: '', correct: 0, total: 0 }]); }}
                                className="text-[11px] text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-400/20">
                                Limpar
                            </button>
                        </div>
                    </div>

                    {/* Colunas header */}
                    <div className="grid grid-cols-[1fr_1fr_52px_52px_28px] gap-1.5 px-1">
                        {['Matéria', 'Assunto', '✓', 'Total', ''].map((h, i) => (
                            <span key={i} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center first:text-left">{h}</span>
                        ))}
                    </div>

                    {/* Linhas de entrada */}
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                        {rows.map((row, index) => {
                            return (
                                <div key={row.id || index}
                                    className="group grid grid-cols-[1fr_1fr_52px_52px_28px] gap-1.5 items-center bg-slate-800/40 hover:bg-slate-800/70 rounded-xl px-2 py-1.5 transition-colors border border-transparent hover:border-slate-700/60">
                                    <input type="text" value={row.subject}
                                        onChange={(e) => updateRow(index, 'subject', e.target.value)}
                                        disabled={row.isAuto}
                                        className={`bg-transparent outline-none text-sm w-full min-w-0 ${row.isAuto ? 'text-slate-400 cursor-not-allowed' : 'text-slate-200 placeholder:text-slate-600'}`}
                                        placeholder="Matéria" />
                                    <input type="text" value={row.topic}
                                        onChange={(e) => updateRow(index, 'topic', e.target.value)}
                                        disabled={row.isAuto}
                                        className={`bg-transparent outline-none text-sm w-full min-w-0 ${row.isAuto ? 'text-slate-400 cursor-not-allowed' : 'text-slate-300 placeholder:text-slate-600'}`}
                                        placeholder="Assunto" />
                                    <input type="number" min="0" value={row.correct}
                                        onChange={(e) => updateRow(index, 'correct', e.target.value)}
                                        className="bg-slate-900/60 border border-slate-700/60 rounded-lg outline-none text-sm text-green-400 font-mono text-center w-full focus:border-green-500/50 focus:bg-slate-900 transition-colors py-0.5" />
                                    <input type="number" min="0" value={row.total}
                                        onChange={(e) => updateRow(index, 'total', e.target.value)}
                                        className="bg-slate-900/60 border border-slate-700/60 rounded-lg outline-none text-sm text-slate-300 font-mono text-center w-full focus:border-blue-500/50 focus:bg-slate-900 transition-colors py-0.5" />
                                    {!row.isAuto && (
                                        <button onClick={() => removeRow(index)}
                                            className="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* BotÃµes de aÃ§Ã£o */}
                    <div className="flex gap-2 pt-1 border-t border-slate-800 mt-auto">
                        <button onClick={addRow}
                            className="px-3 py-2.5 border border-slate-700 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600 transition-all">
                            <Plus size={16} />
                        </button>
                        <button onClick={handleAnalyze} disabled={loading}
                            className={`flex-1 rounded-xl font-bold flex items-center justify-center gap-2 py-2.5 text-sm transition-all ${loading
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30'}`}>
                            {loading
                                ? <><span className="animate-spin text-base">⌛</span> Analisando...</>
                                : <><Play size={16} /> Gerar Plano de Revisão</>
                            }
                        </button>
                    </div>
                </div>

                {/* â•â•â•â• PAINEL DIREITO: Resultado â•â•â•â• */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[500px] shadow-lg flex flex-col">

                    <div className="flex items-center gap-2 mb-5">
                        <CheckCircle2 size={16} className="text-green-400" />
                        <h3 className="text-base font-bold text-slate-100">Relatório de Performance</h3>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3 text-sm">
                            <AlertCircle size={18} />
                            <p>{error}</p>
                        </div>
                    )}

                    {!analysisData && !loading && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 min-h-[380px] border-2 border-dashed border-slate-800 rounded-2xl gap-4">
                            <BrainCircuit size={52} className="opacity-30" />
                            <p className="max-w-xs text-center text-sm leading-relaxed">
                                Preencha os dados ao lado e clique em <strong className="text-slate-400">Gerar Plano de Revisão</strong> para ver o relatório aqui.
                            </p>
                        </div>
                    )}

                    {analysisData && (
                        <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1 flex-1">

                            {/* Insight geral */}
                            <div className="p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/25 rounded-2xl flex gap-3 items-start">
                                <div className="p-2 bg-purple-500/20 rounded-xl shrink-0 mt-0.5">
                                    <BrainCircuit size={18} className="text-purple-300" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1">Insight Geral</h4>
                                    <p className="text-slate-300 text-sm leading-relaxed">"{analysisData.generalInsight}"</p>
                                </div>
                            </div>

                            {/* Cards por disciplina */}
                            {analysisData.disciplines.map((disc, idx) => (
                                <div key={idx} className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden hover:border-slate-600 transition-colors">

                                    {/* Cabeçalho da disciplina */}
                                    <div className="flex justify-between items-center px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <span className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full inline-block shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                            {disc.name}
                                        </h3>
                                        <span className="text-[10px] text-slate-400 italic bg-slate-900/50 px-2 py-0.5 rounded-full border border-slate-700/50 max-w-[45%] truncate">
                                            {disc.overview}
                                        </span>
                                    </div>

                                    {/* Tópicos */}
                                    <div className="divide-y divide-slate-700/30">
                                        {disc.topics.map((topic, tIdx) => {
                                            const pct = topic.percentage || 0;
                                            const cfg =
                                                pct >= 80 ? { label: 'Dominado', icon: '🏆', bar: 'bg-green-500', badge: 'bg-green-500/10 text-green-400 border-green-500/20', text: 'text-green-100' } :
                                                    pct >= 60 ? { label: 'Bom', icon: '👍', bar: 'bg-blue-500', badge: 'bg-blue-500/10  text-blue-400  border-blue-500/20', text: 'text-blue-100' } :
                                                        pct <= 40 ? { label: 'Crítico', icon: '🚨', bar: 'bg-red-500', badge: 'bg-red-500/10   text-red-400   border-red-500/20', text: 'text-red-100' } :
                                                            { label: 'Atenção', icon: '⚠️', bar: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', text: 'text-yellow-100' };
                                            return (
                                                <div key={tIdx} className="px-4 py-3 hover:bg-slate-700/20 transition-colors">
                                                    <div className="flex items-center justify-between gap-3 mb-1.5">
                                                        <span className={`text-sm font-medium truncate flex-1 ${cfg.text}`}>{topic.name}</span>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[10px] font-mono text-slate-500">{topic.correct}/{topic.total}</span>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.badge}`}>
                                                                {cfg.icon} {cfg.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Barra de progresso */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className={`text-[10px] font-black w-8 text-right ${cfg.text}`}>{pct}%</span>
                                                    </div>
                                                    {/* Ação */}
                                                    <p className="text-[11px] text-slate-400 mt-1.5 leading-snug italic">→ {topic.action}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

