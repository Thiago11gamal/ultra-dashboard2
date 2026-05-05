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
                    const newRows = rows.map((r, i) => i === index ? { ...r, total: val, correct: val, score: 100 } : r);
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
            total: (parseInt(row.total, 10) || 0) + 10
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
        const rowsToProcess = rows.filter(r => r?.subject && (parseInt(r?.total, 10) > 0 || r?.score != null));
        const validRowsForAnalysis = rowsToProcess.filter(r => r.topic);

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

            {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <header className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl sm:rounded-2xl border border-purple-500/30 shrink-0">
                    <BrainCircuit size={24} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-2xl font-bold neon-text">IA Analyzer Pro</h2>
                        <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-300 border border-purple-500/20 font-bold uppercase tracking-wider">
                            Offline
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm">Identifica fraquezas e gera um plano de revisão.</p>
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
                    <div className="hidden md:grid grid-cols-[1fr_1fr_52px_52px_28px] gap-1.5 px-1 pb-1 border-b border-slate-700/50 mb-1">
                        {['Matéria', 'Assunto', '✓', 'Total', ''].map((h, i) => (
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
                                        className="group flex flex-col md:grid md:grid-cols-[1fr_1fr_52px_52px_28px] gap-1.5 items-center bg-slate-800/40 hover:bg-slate-800/70 rounded-xl px-2 py-2 md:py-1.5 transition-colors border border-transparent hover:border-slate-700/60">

                                        <div className="flex gap-1.5 w-full md:contents">
                                            <input type="text" value={row.subject}
                                                disabled={true}
                                                className={`bg-transparent outline-none text-sm w-full min-w-0 h-full px-1 flex items-center ${errorIndices.subjects.has(index) ? 'text-red-400 font-bold border-b border-red-500/50' : 'text-slate-400'} cursor-not-allowed`}
                                                placeholder="Matéria" />
                                            <input type="text" value={row.topic}
                                                disabled={true}
                                                className={`bg-transparent outline-none text-sm w-full min-w-0 h-full px-1 flex items-center ${errorIndices.topics.has(index) ? 'text-red-400 font-bold border-b border-red-500/50' : 'text-slate-400'} cursor-not-allowed`}
                                                placeholder="Assunto" />
                                        </div>

                                        <div className="flex gap-1.5 w-full md:contents items-center justify-end md:justify-center mt-1 md:mt-0 pt-1 md:pt-0 border-t border-white/5 md:border-t-0">
                                            <div className="md:hidden text-[10px] font-bold text-slate-500 uppercase mr-auto">Acertos / Total</div>
                                            <input type="number" min="0" value={row.correct}
                                                onChange={(e) => updateRow(index, 'correct', e.target.value)}
                                                className="bg-slate-900/60 border border-slate-700/60 rounded-lg outline-none text-sm text-green-400 font-mono text-center w-14 md:w-full focus:border-green-500/50 focus:bg-slate-900 transition-colors py-0.5" />
                                            <input type="number" min="0" value={row.total}
                                                onChange={(e) => updateRow(index, 'total', e.target.value)}
                                                className="bg-slate-900/60 border border-slate-700/60 rounded-lg outline-none text-sm text-slate-300 font-mono text-center w-14 md:w-full focus:border-blue-500/50 focus:bg-slate-900 transition-colors py-0.5" />
                                            <div className="w-[12px]"></div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* BotÃµes de aÃ§Ã£o */}
                    <div className="flex gap-2 pt-1 border-t border-slate-800 mt-auto">
                        <button onClick={handleAnalyze} disabled={loading}
                            className={`flex-1 rounded-xl font-bold flex items-center justify-center gap-2 py-2.5 text-sm transition-all ${loading
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30'}`}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin text-base">⌛</span>
                                    <span>Analisando...</span>
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Play size={16} />
                                    <span>Gerar Plano de Revisão</span>
                                </span>
                            )}
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
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 min-h-[380px] border-2 border-slate-800 rounded-2xl gap-4">
                            <BrainCircuit size={52} className="opacity-30" />
                            <p className="max-w-xs text-center text-sm leading-relaxed">
                                Preencha os dados ao lado e clique em <strong className="text-slate-400">Gerar Plano de Revisão</strong> para ver o relatório aqui.
                            </p>
                        </div>
                    )}

                    {analysisData && (
                        <div className="space-y-5 pr-1 flex-1">

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
                                                <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-md tracking-tight uppercase">
                                                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base uppercase" style={{ backgroundColor: `${subjectColor}40`, color: subjectColor, border: `1px solid ${subjectColor}60` }}>
                                                        {disc.name ? disc.name[0] : '?'}
                                                    </span>
                                                    {disc.name}
                                                </h3>
                                                <div className="text-right">
                                                    <span className={`text-2xl font-black ${discCfg.text} drop-shadow-sm`}>{discPct}%</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mb-3 relative z-10">
                                                <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider bg-black/30 px-2 py-1 rounded-md backdrop-blur-sm border border-white/5">
                                                    {disc.overview}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono font-bold">
                                                    {disc.totalCorrect}/{disc.totalQuestions} acertos
                                                </span>
                                            </div>
                                            {/* Barra geral da matéria - Agora usando a cor da matéria do Dashboard */}
                                            <div className="w-full h-2.5 bg-slate-950/80 rounded-full overflow-hidden relative z-10 border border-white/5">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                                    style={{
                                                        width: `${discPct}%`,
                                                        backgroundColor: subjectColor,
                                                        boxShadow: `0 0 10px ${subjectColor}40`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Tópicos */}
                                        <div className="divide-y divide-slate-700/30">
                                            {disc.topics.map((topic, tIdx) => {
                                                const pct = topic.percentage || 0;
                                                const cfg =
                                                    pct >= 80 ? { label: 'Dominado', icon: '🏆', bar: 'bg-green-500', badge: 'bg-green-500/10 text-green-400 border-green-500/20', text: 'text-green-100' } :
                                                        pct >= 60 ? { label: 'Bom', icon: '👍', bar: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', text: 'text-orange-100' } :
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
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

