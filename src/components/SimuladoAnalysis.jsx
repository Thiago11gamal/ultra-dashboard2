import React, { useState } from 'react';
import { normalize, aliases } from '../utils/normalization';

import { BrainCircuit, Play, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SimuladoAnalysis({ rows: propRows, onRowsChange, onAnalysisComplete, categories = [] }) {
    const analysisTimeoutRef = React.useRef(null);


    // Bug fix: `r.id || row-${idCounter.current++}` still mutated idCounter.current
    // during the render phase whenever r.id was falsy — causing React to see different
    // keys on every render, making inputs lose focus on every keystroke.
    // Using index as stable fallback avoids any mutation during render.
    const rows = (propRows && propRows.length > 0)
        ? propRows.map((r, i) => ({ ...r, id: r.id || `row-${i}` }))
        : [];

    // Helper to report changes up to parent
    const [analysisData, setAnalysisData] = useState(null);
    const [error, setError] = useState(null);
    const [errorIndices, setErrorIndices] = useState(() => ({ subjects: new Set(), topics: new Set() }));

    // Bug Fix: track mount status for async operations
    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => {
            isMounted.current = false;
            if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        };
    }, []);

    const setRows = (newRows) => {
        if (onRowsChange) onRowsChange(Array.isArray(newRows) ? newRows : []);
    };

    const [loading, setLoading] = useState(false);

    const updateRow = (index, field, value) => {
        setError(null);
        // 1. Sanitização: Apenas números para campos numéricos
        let finalValue = value;

        if (field === 'correct' || field === 'total') {
            // Remove tudo que não for dígito
            const rawString = String(value).replace(/\D/g, '');
            const val = rawString === '' ? '' : parseInt(rawString, 10);

            if (field === 'correct') {
                const currentTotal = parseInt(rows[index]?.total, 10) || 0;
                // Enforce: Correct cannot exceed Total (unless Total is empty/0)
                if (currentTotal > 0 && val !== '' && val > currentTotal) finalValue = currentTotal;
                else finalValue = val;
            } else if (field === 'total') {
                const currentCorrect = parseInt(rows[index]?.correct, 10) || 0;
                // If Total is reduced below Correct, clamp Correct
                if (val !== '' && val < currentCorrect) {
                    const newRows = rows.map((r, i) => i === index ? { ...r, total: val, correct: val, score: val > 0 ? 100 : 0 } : r);
                    setRows(newRows);
                    return;
                }
                finalValue = val;
            }
        }

        const newRows = rows.map((row, i) => {
            if (i === index) {
                const updatedRow = { ...row, [field]: finalValue };
                const c = Math.max(0, parseFloat(updatedRow.correct) || 0);
                const t = Math.max(0, parseFloat(updatedRow.total) || 0);
                updatedRow.score = t > 0 ? Math.min(100, (c / t) * 100) : 0;
                return updatedRow;
            }
            return row;
        });

        setRows(newRows);
    };



    const resetScores = () => {
        if (window.confirm('Deseja zerar apenas os valores (Acertos/Total) e manter as matérias?')) {
            const newRows = rows.map(row => ({ ...row, correct: 0, total: 0 }));
            setRows(newRows);
        }
    };

    const addTenToAll = () => {
        const newRows = rows.map(row => ({
            ...row,
            total: Math.min(10000, (parseInt(row.total, 10) || 0) + 10)
        }));
        setRows(newRows);
    };

    const handleAnalyze = () => {
        // 0. Strict Validation: Check if subjects exist in Dashboard
        if (categories && categories.length > 0) {

            const validDataMap = Object.create(null);
            categories.forEach(cat => {
                if (!cat?.name) return;
                const subName = normalize(cat.name);
                const tasks = Array.isArray(cat.tasks) ? cat.tasks : [];
                const topics = new Set(tasks.map(t => normalize(t?.title || t?.text || '')));
                validDataMap[subName] = topics;

                // Add aliases mapping to the same topics
                if (aliases[subName]) {
                    aliases[subName].forEach(alias => {
                        const aliasNorm = normalize(alias);
                        validDataMap[aliasNorm] = topics;
                    });
                }
            });

            const invalidSubjects = new Set();
            const invalidTopics = new Set();
            let firstInvalidSubject = null;
            let firstInvalidTopic = null;
            let targetSubject = '';

            rows.forEach((r, idx) => {
                if (!r.subject && !r.topic) return;

                const subNorm = normalize(r.subject);
                const topNorm = normalize(r.topic);

                const isSubValid = r.subject ? !!validDataMap[subNorm] : true;

                let isTopValid = true;
                if (r.topic) {
                    if (topNorm === 'nenhum') {
                        isTopValid = true;
                    } else if (isSubValid && r.subject && validDataMap[subNorm] instanceof Set) {
                        const subjectTopics = validDataMap[subNorm];
                        // Se a matéria não tem tópicos cadastrados, aceitamos qualquer um (ou tratamos como 'nenhum')
                        isTopValid = subjectTopics.size === 0 ? true : subjectTopics.has(topNorm);
                    } else if (r.subject) {
                        isTopValid = false;
                    } else {
                        isTopValid = Object.values(validDataMap).some(set => (set instanceof Set) && set.has(topNorm));
                    }
                }

                if (r.subject && !isSubValid) {
                    if (!firstInvalidSubject) firstInvalidSubject = r.subject;
                    invalidSubjects.add(idx);
                }

                if (r.topic && !isTopValid) {
                    if (!firstInvalidTopic) {
                        firstInvalidTopic = r.topic;
                        targetSubject = r.subject;
                    }
                    invalidTopics.add(idx);
                }
            });

            if (invalidSubjects.size > 0 || invalidTopics.size > 0) {
                setErrorIndices({ subjects: invalidSubjects, topics: invalidTopics });

                if (firstInvalidSubject && firstInvalidTopic) {
                    setError(`Matéria '${firstInvalidSubject}' e Assunto '${firstInvalidTopic}' não encontrados.`);
                } else if (firstInvalidSubject) {
                    setError(`A matéria '${firstInvalidSubject}' não existe no Dashboard.`);
                } else if (firstInvalidTopic) {
                    setError(`O assunto '${firstInvalidTopic}' não existe na matéria '${targetSubject}'.`);
                }

                setAnalysisData(null);
                setLoading(false);
                return;
            }
            // Clear errors if all valid
            setErrorIndices({ subjects: new Set(), topics: new Set() });
        }

        // BUG FIX: Separation of row validation for Analytics vs Storage/Audit
        // Somente processar linhas onde o TOTAL foi explicitamente digitado e é maior que zero.
        const rowsToProcess = rows.filter(r => r?.subject && parseInt(r?.total, 10) > 0);
        const validRowsForAnalysis = rowsToProcess.filter(r => String(r.topic || '').trim());

        if (rowsToProcess.length === 0) {
            setError("Preencha o desempenho em pelo menos um assunto.");
            return;
        }

        const validRows = validRowsForAnalysis;





        setLoading(true);
        setError(null);
        // We no longer clear analysisData immediately to prevent "flickering"
        // It will be overwritten once the 800ms delay finishes.

        // Simulate processing time for UX
        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = setTimeout(() => {
            if (!isMounted.current) return;
            try {
                // Local Analysis Logic
                const disciplinesMap = {};

                // 1. Group and Calculate
                validRows.forEach(row => {
                    const subj = String(row.subject || "").trim();
                    if (!subj) return;

                    if (!disciplinesMap[subj]) {
                        disciplinesMap[subj] = {
                            name: subj,
                            topics: [],
                            totalCorrect: 0,
                            totalQuestions: 0
                        };
                    }

                    const total = Math.max(0, parseInt(row.total, 10) || 0);
                    const correct = Math.max(0, parseInt(row.correct, 10) || 0);
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
                        name: String(row.topic || ""),
                        correct,
                        total,
                        percentage: pct,
                        difficulty: Number(row.difficulty || 1.0),
                        status,
                        action
                    });

                    disciplinesMap[subj].totalCorrect += correct;
                    disciplinesMap[subj].totalQuestions += total;
                });

                // 2. Format Output
                const disciplines = Object.values(disciplinesMap).map(d => {
                    // Sort topics by lowest percentage (worst first)
                    d.topics.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

                    const discPct = d.totalQuestions > 0 ? Math.round((d.totalCorrect / d.totalQuestions) * 100) : 0;

                    let overview = "";
                    if (discPct >= 80) overview = `Excelente (${discPct}%). Continue assim!`;
                    else if (discPct >= 60) overview = `Bom (${discPct}%). Quase lá.`;
                    else if (discPct >= 41) overview = `Atenção (${discPct}%). Pode evoluir.`;
                    else overview = `Crítico (${discPct}%). Foque na base.`;

                    return {
                        name: d.name,
                        overview,
                        topics: d.topics,
                        percentage: discPct,
                        totalCorrect: d.totalCorrect,
                        totalQuestions: d.totalQuestions
                    };
                });

                // Sort Disciplines by Performance (Worst First) to highlight problems
                disciplines.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));

                // 3. General Insight
                const totalQ = validRows.reduce((acc, r) => acc + (parseInt(r.total, 10) || 0), 0);
                const totalC = validRows.reduce((acc, r) => acc + (parseInt(r.correct, 10) || 0), 0);
                const globalPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
                const analyzedTopics = validRows.length;
                const analyzedSubjects = new Set(validRows.map(r => String(r.subject || '').trim()).filter(Boolean)).size;
                const rowCoverage = rows.length > 0 ? (analyzedTopics / rows.length) * 100 : 0;

                const confidenceScore = Math.max(0, Math.min(100,
                    Math.round(
                        Math.min(1, totalQ / 200) * 55 +
                        Math.min(1, analyzedTopics / 12) * 25 +
                        Math.min(1, analyzedSubjects / 6) * 20
                    )
                ));

                const confidenceLabel =
                    confidenceScore >= 75 ? 'Alta' :
                        confidenceScore >= 45 ? 'Média' : 'Baixa';

                let generalInsight = "";
                if (globalPct >= 80) generalInsight = `Resultado Incrível! ${globalPct}%. Caminho certo.`;
                else if (globalPct >= 60) generalInsight = `Bom trabalho! ${globalPct}%. Ajuste os detalhes.`;
                else generalInsight = `Sinal de Alerta. ${globalPct}%. Reavalie a estratégia.`;

                const data = {
                    disciplines,
                    generalInsight,
                    confidence: {
                        score: confidenceScore,
                        label: confidenceLabel,
                        analyzedTopics,
                        analyzedSubjects,
                        totalQuestions: totalQ,
                        rowCoverage: Number(rowCoverage.toFixed(1))
                    }
                };

                setAnalysisData(data);

                if (onAnalysisComplete) {
                    const cleanRows = rows.map(r => ({
                        ...r,
                        subject: String(r.subject || '').trim(),
                        topic: String(r.topic || '').trim(),
                    }));
                    onAnalysisComplete({ analysis: data, rawRows: cleanRows });
                }

            } catch (err) {
                console.error("ANALYSIS FATAL ERROR:", err);
                setAnalysisData(null);
                setError(`Erro no processamento: ${err.message || "Verifique os dados digitados"}`);
            } finally {
                setLoading(false);
            }
        }, 800); // Small delay for effect
    };

    return (
        <div className="w-full mx-auto space-y-6 animate-fade-in pb-20">

            {/* ── HEADER ──────────────────────────────────────────────────────────── */}
            <header className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden group">
                {/* Glow Background */}
                <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-600/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-purple-500/30 transition-colors duration-700" />
                
                <div className="relative z-10 flex items-center gap-4 w-full">
                    <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
                        <BrainCircuit size={28} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 tracking-tight drop-shadow-sm">IA Analyzer Pro</h2>
                            <span className="text-[10px] bg-purple-500/10 px-2.5 py-1 rounded-md text-purple-300 border border-purple-500/30 font-black uppercase tracking-widest shadow-inner">
                                Offline
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium">Motor estocástico de identificação de fraquezas e geração de revisão.</p>
                    </div>
                </div>
            </header>

            {/* â”€â”€ GRID PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

                {/* â•â•â•â• PAINEL ESQUERDO: Entrada de dados â•â•â•â• */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-lg">

                    {/* CabeÃ§alho do painel */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold flex items-center gap-2 text-slate-100">
                            <FileText size={16} className="text-blue-400" />
                            Dados do Simulado
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={addTenToAll}
                                className="text-[10px] font-black bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/20 transition-all hover:scale-105 active:scale-95">
                                +10
                            </button>
                            <button onClick={resetScores}
                                className="text-[10px] text-slate-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-400/10 border border-transparent hover:border-yellow-400/20">
                                Zerar
                            </button>
                        </div>
                    </div>

                    {/* Colunas header */}
                    <div className="hidden md:grid grid-cols-[1fr_1fr_52px_52px_95px_28px] gap-1.5 px-1 pb-1 border-b border-slate-700/50 mb-1">
                        {['Matéria', 'Assunto', '✓', 'Total', 'Classificação', ''].map((h, i) => (
                            <span key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center first:text-left">{h}</span>
                        ))}
                    </div>

                    {/* Linhas de entrada */}
                    <div className="space-y-1.5 pr-1">
                        {rows.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-sm italic border border-slate-800 rounded-xl">
                                Nenhuma matéria/assunto cadastrado no Dashboard.
                            </div>
                        ) : rows.map((row, index) => {
                            const showDivider = index > 0 && rows[index - 1].subject !== row.subject;
                            return (
                                <React.Fragment key={row.id || index}>
                                    {showDivider && (
                                        <div className="pt-2 pb-1">
                                            <div className="h-px bg-yellow-500/30 w-full" />
                                        </div>
                                    )}
                                    <div
                                        className="group flex flex-col md:grid md:grid-cols-[1.5fr_1.5fr_48px_48px_95px_10px] gap-2 items-center bg-slate-800/30 hover:bg-slate-800/80 rounded-xl px-3 py-2.5 transition-all border border-transparent hover:border-slate-700 hover:shadow-lg">

                                        <div className="flex gap-2 w-full md:contents">
                                            <input type="text" value={row.subject}
                                                disabled={true}
                                                className={`bg-slate-900/40 rounded-md outline-none text-xs sm:text-sm w-full min-w-0 h-8 px-2 flex items-center ${errorIndices.subjects.has(index) ? 'text-red-400 font-bold border border-red-500/50' : 'text-slate-400 border border-transparent'} cursor-not-allowed`}
                                                placeholder="Matéria" />
                                            <input type="text" value={row.topic}
                                                disabled={true}
                                                className={`bg-slate-900/40 rounded-md outline-none text-xs sm:text-sm w-full min-w-0 h-8 px-2 flex items-center ${errorIndices.topics.has(index) ? 'text-red-400 font-bold border border-red-500/50' : 'text-slate-400 border border-transparent'} cursor-not-allowed`}
                                                placeholder="Assunto" />
                                        </div>

                                        <div className="flex gap-2 w-full md:contents items-center justify-between md:justify-center mt-2 md:mt-0 pt-2 md:pt-0 border-t border-slate-700/50 md:border-t-0">
                                            <div className="md:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest mr-auto">Acertos / Total / Classificação</div>
                                            <input type="number" min="0" value={row.correct}
                                                disabled={loading}
                                                onChange={(e) => updateRow(index, 'correct', e.target.value)}
                                                className={`bg-slate-950 border border-slate-700/80 rounded-md outline-none text-xs sm:text-sm text-green-400 font-mono font-bold text-center w-14 md:w-full h-8 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 focus:bg-slate-900 transition-all shadow-inner ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`} />
                                            <input type="number" min="0" value={row.total}
                                                disabled={loading}
                                                onChange={(e) => updateRow(index, 'total', e.target.value)}
                                                className={`bg-slate-950 border border-slate-700/80 rounded-md outline-none text-xs sm:text-sm text-slate-200 font-mono font-bold text-center w-14 md:w-full h-8 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:bg-slate-900 transition-all shadow-inner ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`} />
                                            <select 
                                                value={row.difficulty || 1.0}
                                                disabled={loading}
                                                onChange={(e) => updateRow(index, 'difficulty', e.target.value)}
                                                className={`bg-slate-950 border border-slate-700/80 rounded-md outline-none text-[10px] sm:text-xs text-purple-400 font-bold text-center w-20 md:w-full h-8 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:bg-slate-900 transition-all shadow-inner cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'}`}
                                            >
                                                <option value={0.7}>Fácil</option>
                                                <option value={1.0}>Médio</option>
                                                <option value={1.3}>Difícil</option>
                                                <option value={1.6}>Expert</option>
                                            </select>
                                            <div className="w-2 hidden md:block"></div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-3 pt-3 border-t border-slate-700/50 mt-auto">
                        <button onClick={handleAnalyze} disabled={loading}
                            className={`flex-1 rounded-xl font-black flex items-center justify-center gap-2 py-3 text-sm transition-all duration-300 ${loading
                                ? 'bg-purple-900/40 text-purple-400 border border-purple-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 border border-indigo-400/50'}`}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin text-lg">⌛</span>
                                    <span>Processando...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Play size={18} className="fill-current" />
                                    <span className="tracking-wide">GERAR PLANO DE REVISÃO</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* â•â•â•â• PAINEL DIREITO: Resultado â•â•â•â• */}
                <div className="relative lg:col-span-7 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 sm:p-6 min-h-[500px] shadow-2xl flex flex-col backdrop-blur-xl overflow-hidden">

                    {/* Background Ambient Glow for Results */}
                    {analysisData && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
                    )}

                    <div className="relative z-10 flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                        <div className="p-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                            <CheckCircle2 size={18} className="text-green-400 drop-shadow-[0_0_5px_currentColor]" />
                        </div>
                        <h3 className="text-lg font-black text-slate-100 tracking-tight">Relatório de Performance</h3>
                    </div>

                    {error && (
                        <div className="relative z-10 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl flex items-center gap-3 text-sm font-medium shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                            <AlertCircle size={20} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {!analysisData && !loading && !error && (
                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[380px] border-2 border-dashed border-slate-800 rounded-2xl gap-5 p-6 bg-slate-950/30">
                            <BrainCircuit size={64} className="opacity-20" />
                            <p className="max-w-xs text-center text-sm font-medium leading-relaxed">
                                Preencha os dados ao lado e clique em <strong className="text-blue-400">GERAR PLANO</strong> para ver o diagnóstico completo.
                            </p>
                        </div>
                    )}

                    {analysisData && (
                        <div className="relative z-10 space-y-6 pr-1 flex-1">

                            {/* Insight geral */}
                            <div className="p-5 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/40 border border-purple-500/30 rounded-2xl flex gap-4 items-start shadow-[0_0_20px_rgba(168,85,247,0.1)] backdrop-blur-md">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl shrink-0 border border-purple-500/30 shadow-inner">
                                    <BrainCircuit size={20} className="text-purple-300 drop-shadow-[0_0_5px_currentColor]" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1.5">Insight Geral da IA</h4>
                                    <p className="text-slate-200 text-sm font-medium leading-relaxed italic">"{analysisData.generalInsight}"</p>
                                </div>
                            </div>

                            {analysisData.confidence && (
                                <div className="p-5 bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-inner relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 blur-[40px] pointer-events-none" />
                                    
                                    <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
                                        <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                            Confiabilidade da Análise
                                        </h4>
                                        <span className={`text-xs font-black px-3 py-1 rounded-md border ${analysisData.confidence.label === 'Alta' ? 'text-green-300 border-green-500/30 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : analysisData.confidence.label === 'Média' ? 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-rose-300 border-rose-500/30 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.2)]'}`}>
                                            {analysisData.confidence.label}
                                        </span>
                                    </div>
                                    <div className="relative z-10 w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/5 mb-3 shadow-inner">
                                        <div className="h-full bg-cyan-400 transition-all duration-1000 shadow-[0_0_10px_currentColor]" style={{ width: `${analysisData.confidence.score}%` }} />
                                    </div>
                                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Score: <strong className="text-cyan-300 font-mono text-xs block mt-0.5">{analysisData.confidence.score}%</strong></div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Tópicos: <strong className="text-slate-200 font-mono text-xs block mt-0.5">{analysisData.confidence.analyzedTopics}</strong></div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Matérias: <strong className="text-slate-200 font-mono text-xs block mt-0.5">{analysisData.confidence.analyzedSubjects}</strong></div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">Cobertura: <strong className="text-slate-200 font-mono text-xs block mt-0.5">{analysisData.confidence.rowCoverage}%</strong></div>
                                    </div>
                                </div>
                            )}

                            {/* Cards por disciplina */}
                            {analysisData.disciplines.map((disc, idx) => {
                                const discPct = disc.percentage || 0;
                                const category = categories.find(c => c.name === disc.name);
                                const subjectColor = category?.color || '#3b82f6';

                                const discCfg =
                                    discPct >= 80 ? { from: 'from-green-500/20', border: 'border-green-500/30', text: 'text-green-400' } :
                                        discPct >= 60 ? { from: 'from-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' } :
                                            discPct <= 40 ? { from: 'from-red-500/20', border: 'border-red-500/30', text: 'text-red-400' } :
                                                { from: 'from-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };

                                return (
                                    <div key={idx} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden shadow-lg mb-4">

                                        {/* Cabeçalho da disciplina */}
                                        <div className={`relative px-5 py-4 bg-gradient-to-r ${discCfg.from} to-transparent border-b border-slate-700/50`}>
                                            <div className="flex justify-between items-end mb-2 relative z-10">
                                                <h3 className="text-xl font-black text-white flex items-center gap-3 drop-shadow-md tracking-tight uppercase">
                                                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg uppercase shadow-inner" style={{ backgroundColor: `${subjectColor}20`, color: subjectColor, border: `1px solid ${subjectColor}40` }}>
                                                        {disc.name ? disc.name[0] : '?'}
                                                    </span>
                                                    {disc.name}
                                                </h3>
                                                <div className="text-right">
                                                    <span className={`text-3xl font-mono font-black ${discCfg.text} drop-shadow-[0_0_10px_currentColor]`}>{discPct}%</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-4 relative z-10 mt-1">
                                                <span className="text-[11px] text-slate-200 font-black uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 shadow-sm">
                                                    {disc.overview}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono font-bold tracking-widest bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800">
                                                    {disc.totalCorrect}/{disc.totalQuestions} acertos
                                                </span>
                                            </div>
                                            {/* Barra geral da matéria - Agora usando a cor da matéria do Dashboard */}
                                            <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden relative z-10 border border-slate-800/80 shadow-inner">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_currentColor]"
                                                    style={{
                                                        width: `${discPct}%`,
                                                        backgroundColor: subjectColor,
                                                        color: subjectColor
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tópicos */}
                                        <div className="divide-y divide-slate-700/30">
                                            {disc.topics.map((topic, tIdx) => {
                                                const pct = topic.percentage || 0;
                                                const cfg =
                                                    pct >= 80 ? { label: 'Dominado', icon: '🏆', bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]', text: 'text-emerald-300' } :
                                                        pct >= 60 ? { label: 'Bom', icon: '👍', bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]', text: 'text-amber-300' } :
                                                            pct <= 40 ? { label: 'Crítico', icon: '🚨', bar: 'bg-rose-500', badge: 'bg-rose-500/10   text-rose-400   border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]', text: 'text-rose-300' } :
                                                                { label: 'Atenção', icon: '⚠️', bar: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]', text: 'text-orange-300' };
                                                return (
                                                    <div key={tIdx} className="px-5 py-4 hover:bg-slate-700/30 transition-all duration-300 group/topic">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <span className={`text-sm font-bold truncate flex-1 ${cfg.text} group-hover/topic:translate-x-1 transition-transform`}>{topic.name}</span>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-md">{topic.correct}/{topic.total}</span>
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${cfg.badge}`}>
                                                                    {cfg.icon} {cfg.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Barra de progresso */}
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                                                                <div className={`h-full rounded-full transition-all duration-1000 ${cfg.bar}`} style={{ width: `${pct}%`, boxShadow: `0 0 10px currentColor` }} />
                                                            </div>
                                                            <span className={`text-[11px] font-mono font-black w-10 text-right ${cfg.text}`}>{pct}%</span>
                                                        </div>
                                                        {/* Ação */}
                                                        <div className="mt-2.5 flex items-center gap-1.5 opacity-70 group-hover/topic:opacity-100 transition-opacity">
                                                            <div className={`w-1 h-1 rounded-full ${cfg.bar}`} />
                                                            <p className="text-[11px] text-slate-300 font-medium tracking-wide">Ação recomendada: <strong className="text-white">{topic.action}</strong></p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

