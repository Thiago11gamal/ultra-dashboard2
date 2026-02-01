import React, { useState, useEffect } from 'react';
import { BrainCircuit, Play, FileText, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function SimuladoAnalysis({ rows: propRows, onRowsChange, onAnalysisComplete }) {
    // Controlled component: use props or fallback default
    const rows = (propRows && propRows.length > 0)
        ? propRows
        : [{ subject: '', topic: '', correct: 0, total: 0 }];

    // Helper to report changes up to parent
    const setRows = (newRows) => {
        if (onRowsChange) onRowsChange(newRows);
    };

    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [error, setError] = useState(null);

    const updateRow = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { subject: '', topic: '', correct: 0, total: 0 }]);
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
                        action = 'Manter Revisão Periódica';
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
                    if (discPct >= 80) overview = `Excelente desempenho (${discPct}%). Continue assim!`;
                    else if (discPct <= 50) overview = `Desempenho baixo (${discPct}%). Foque na base.`;
                    else overview = `Desempenho mediano (${discPct}%). Pode evoluir mais.`;

                    return {
                        name: d.name,
                        overview,
                        topics: d.topics
                    };
                });

                // 3. General Insight
                const totalQ = validRows.reduce((acc, r) => acc + (parseInt(r.total) || 0), 0);
                const totalC = validRows.reduce((acc, r) => acc + (parseInt(r.correct) || 0), 0);
                const globalPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

                let generalInsight = "";
                if (globalPct >= 80) generalInsight = `Resultado Incrível! Sua média global foi ${globalPct}%. Você está no caminho certo para a aprovação.`;
                else if (globalPct >= 60) generalInsight = `Bom trabalho! Média global de ${globalPct}%. Ajuste os pontos fracos para subir de nível.`;
                else generalInsight = `Sinal de Alerta. Média global de ${globalPct}%. É hora de reavaliar sua estratégia de estudos.`;

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
        <div className="w-full mx-auto space-y-8 animate-fade-in-down pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-500/20 rounded-2xl border border-purple-500/30">
                        <BrainCircuit size={40} className="text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold neon-text">IA Analyzer Pro <span className="text-xs bg-purple-500/20 px-2 py-1 rounded text-purple-300 ml-2">Offline Mode</span></h2>
                        <p className="text-slate-400">Identificando suas fraquezas para você evoluir mais rápido.</p>
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* 1. Input Panel (Left implementation) */}
                <div className="lg:col-span-5 glass p-6 flex flex-col min-h-[550px] bg-slate-900/50 border-r border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <FileText size={20} className="text-blue-400" />
                            Dados do Simulado
                        </h3>
                        <div className="flex gap-3">
                            <button onClick={resetScores} className="text-xs text-slate-500 hover:text-yellow-400 transition-colors">
                                Zerar Valores
                            </button>
                            <button onClick={() => { if (window.confirm('Limpar tudo?')) setRows([{ subject: '', topic: '', correct: 0, total: 0 }]); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                                Limpar Tudo
                            </button>
                        </div>
                    </div>

                    {/* Fixed height container for table to keep button accessible but allow scrolling */}
                    <div className="h-[450px] overflow-auto custom-scrollbar mb-6 pr-1 border border-white/5 rounded-lg bg-black/20">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#0f1016] z-10 shadow-lg">
                                <tr>
                                    <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">Matéria</th>
                                    <th className="p-2 text-[10px] font-bold text-slate-500 uppercase">Assunto</th>
                                    <th className="p-2 text-[10px] font-bold text-slate-500 uppercase w-14 text-center">Acertos</th>
                                    <th className="p-2 text-[10px] font-bold text-slate-500 uppercase w-14 text-center">Total</th>
                                    <th className="w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {rows.map((row, index) => (
                                    <tr key={index} className="group hover:bg-white/5">
                                        <td className="p-1"><input type="text" value={row.subject} onChange={(e) => updateRow(index, 'subject', e.target.value)} className="w-full bg-transparent p-1 focus:bg-white/5 rounded outline-none text-sm" placeholder="Matéria" /></td>
                                        <td className="p-1"><input type="text" value={row.topic} onChange={(e) => updateRow(index, 'topic', e.target.value)} className="w-full bg-transparent p-1 focus:bg-white/5 rounded outline-none text-sm" placeholder="Assunto" /></td>
                                        <td className="p-1"><input type="number" min="0" value={row.correct} onChange={(e) => updateRow(index, 'correct', e.target.value)} className="w-full bg-transparent p-1 focus:bg-white/5 rounded outline-none text-sm text-center font-mono text-green-400" /></td>
                                        <td className="p-1"><input type="number" min="0" value={row.total} onChange={(e) => updateRow(index, 'total', e.target.value)} className="w-full bg-transparent p-1 focus:bg-white/5 rounded outline-none text-sm text-center font-mono" /></td>
                                        <td className="p-1 text-center"><button onClick={() => removeRow(index)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3 mt-auto">
                        <button onClick={addRow} className="px-4 py-3 border border-white/10 rounded-xl text-slate-400 hover:bg-white/5"><Plus size={18} /></button>
                        <button onClick={handleAnalyze} disabled={loading} className={`flex-1 rounded-xl font-bold flex items-center justify-center gap-2 ${loading ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                            {loading ? <span className="animate-spin">⌛</span> : <><Play size={18} /> Gerar Plano de Revisão</>}
                        </button>
                    </div>
                </div>

                {/* 2. Output Panel (Right implementation) */}
                <div className="lg:col-span-7 glass p-6 min-h-[550px] bg-slate-900/50 border-l border-white/5 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-green-400" />
                            Relatório da Performance
                        </h3>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3">
                            <AlertCircle size={20} />
                            <p>{error}</p>
                        </div>
                    )}

                    {!analysisData && !loading && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 min-h-[400px] border-2 border-dashed border-white/5 rounded-3xl">
                            <BrainCircuit size={64} className="opacity-20 mb-4" />
                            <p className="max-w-xs text-center text-sm">Seus dados serão processados instantaneamente para gerar tabelas de revisão personalizadas.</p>
                        </div>
                    )}

                    {analysisData && (
                        <div className="space-y-6 animate-fade-in-up overflow-auto custom-scrollbar pr-2">
                            {/* General Insight Card */}
                            <div className="p-4 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl flex gap-4 items-start shadow-lg">
                                <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
                                    <BrainCircuit size={24} className="text-purple-300" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-purple-200 text-sm uppercase tracking-wide mb-1">Insight Geral</h4>
                                    <p className="text-slate-300 text-sm leading-relaxed">"{analysisData.generalInsight}"</p>
                                </div>
                            </div>

                            {/* Disciplines Grid */}
                            <div className="grid grid-cols-1 gap-6">
                                {analysisData.disciplines.map((disc, idx) => (
                                    <div key={idx} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-colors">
                                        <div className="bg-black/20 p-4 flex justify-between items-center border-b border-white/5">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <span className="w-1.5 h-6 bg-red-500 rounded-full inline-block shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                                {disc.name}
                                            </h3>
                                            <span className="text-[10px] text-slate-400 italic bg-white/5 px-2 py-1 rounded border border-white/5 max-w-[50%] truncate">{disc.overview}</span>
                                        </div>

                                        <div className="p-0">
                                            <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                                                <thead className="bg-white/5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                                    <tr>
                                                        <th className="p-3 pl-4 text-left" style={{ width: '30%' }}>Assunto</th>
                                                        <th className="p-3 text-center" style={{ width: '15%' }}>Status</th>
                                                        <th className="p-3 text-center" style={{ width: '15%' }}>Desempenho</th>
                                                        <th className="p-3 text-right pr-4" style={{ width: '40%' }}>Ação Recomendada</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-sm">
                                                    {(disc.topics || disc.worstTopics || []).map((topic, tIdx) => {
                                                        const pct = topic.percentage || 0;
                                                        let rowClass = "hover:bg-white/5 transition-colors";
                                                        let textClass = "text-slate-200";
                                                        let statusConfig = { label: 'Atenção', color: 'yellow', icon: '⚠️' };

                                                        if (pct >= 80) {
                                                            rowClass = "bg-green-500/5 hover:bg-green-500/10 transition-colors border-l-2 border-green-500";
                                                            textClass = "text-green-100 font-medium";
                                                            statusConfig = { label: 'DOMINADO', color: 'green', icon: '🏆' };
                                                        } else if (pct <= 40) {
                                                            rowClass = "bg-red-500/5 hover:bg-red-500/10 transition-colors border-l-2 border-red-500";
                                                            textClass = "text-red-100";
                                                            statusConfig = { label: 'CRÍTICO', color: 'red', icon: '🚨' };
                                                        } else {
                                                            textClass = "text-yellow-100";
                                                            statusConfig = { label: 'ATENÇÃO', color: 'yellow', icon: '⚠️' };
                                                        }

                                                        return (
                                                            <tr key={tIdx} className={rowClass}>
                                                                <td className="p-3 pl-4 font-medium">
                                                                    <span className={textClass}>{topic.name}</span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-sm
                                                                        ${statusConfig.color === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                            statusConfig.color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                                        <span>{statusConfig.icon}</span>
                                                                        {statusConfig.label}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <div className="relative">
                                                                            <svg className="w-10 h-10 transform -rotate-90">
                                                                                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-700/50" />
                                                                                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent"
                                                                                    strokeDasharray={100} strokeDashoffset={100 - pct}
                                                                                    className={pct >= 80 ? 'text-green-500' : pct <= 40 ? 'text-red-500' : 'text-yellow-500'} />
                                                                            </svg>
                                                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{pct}%</span>
                                                                        </div>
                                                                        <span className="text-[9px] text-slate-500 mt-1">{topic.correct}/{topic.total}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <span className="text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 inline-block max-w-[200px] truncate hover:whitespace-normal hover:bg-black/80 hover:scale-105 transition-all z-10 relative">
                                                                        {topic.action}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
