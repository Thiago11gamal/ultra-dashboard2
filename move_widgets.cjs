const fs = require('fs');
const path = 'c:/Users/antun.BOOK-201QO8FPFE/Downloads/ultra-patched/ultra-patched/src/components/AICoachView.jsx';

const content = fs.readFileSync(path, 'utf8');

const target1 = `                {suggestedFocus ? (
                    <div className="w-full">
                        <AICoachWidget suggestion={suggestedFocus} onGenerateGoals={onGenerateGoals} loading={loading} />
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                        <AlertCircle size={20} className="mx-auto mb-3 text-slate-600" />
                        <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>
                        <p className="text-[10px] text-slate-500 mt-1">Recalcule a estratégia após novos simulados.</p>
                    </div>
                )}`;

const target2 = `            {calibrationSummary.length > 0 && (
                <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                        <div>
                            <h3 className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-400 mb-0.5">Monitor de Calibração</h3>
                            <p className="text-[10px] text-slate-500">
                                {calibrationSummary.length} categorias • {calibrationAuditLog.length} eventos
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {calibrationSummary.map(row => {
                            const op = calibrationOps[row.categoryId] || {};
                            return (
                                <div key={row.categoryId} className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5">
                                                {displaySubject(row.label)}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={\`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner \${op.degraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}\`}>
                                                    <div className={\`w-1.5 h-1.5 rounded-full \${op.degraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]\`} />
                                                    {op.degraded ? 'Degradado' : 'Estável'}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">n={row.count}</span>
                                            </div>
                                        </div>

                                        {/* Gráfico Radial Compacto */}
                                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                                            {(() => {
                                                const avgBrier = toFinite(row.avgBrier);
                                                const brierPct = Math.min(100, (avgBrier / 0.35) * 100);
                                                const radius = 14;
                                                const circ = 2 * Math.PI * radius;
                                                const offset = circ - (brierPct / 100) * circ;
                                                const colorClass = avgBrier >= 0.25 ? 'text-rose-500' : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500');
                                                return (
                                                    <>
                                                        <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                                                            <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="3" />
                                                            <circle 
                                                                cx="18" cy="18" r={radius} fill="none" 
                                                                className={\`stroke-current \${colorClass} transition-all duration-1000 ease-out\`} 
                                                                strokeWidth="3" 
                                                                strokeDasharray={circ} 
                                                                strokeDashoffset={offset}
                                                                strokeLinecap="round" 
                                                            />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className={\`text-[10px] font-black font-mono tracking-tighter \${colorClass}\`}>
                                                                {avgBrier.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    
                                    {/* Rodapé Compacto */}
                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                                        <div className="group/tooltip relative flex items-center gap-1 cursor-help">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">Desvio (Brier)</span>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                                <strong className="text-white font-black block mb-1">Score de Brier</strong>
                                                Mede a precisão das projeções Monte Carlo. Quanto menor o valor (verde), mais assertivo está o motor.
                                            </div>
                                        </div>
                                        
                                        {(() => {
                                            const pen = toFinite(row.avgPenalty);
                                            if (pen <= 0.001) return null;
                                            return (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                                                    <Zap size={10} className="text-amber-400" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}`;

const target3 = '                        {systemAlerts.length > 0 && (';

let newContent = content.replace(target1, '');
newContent = newContent.replace(target2, '');

const indentedTarget1 = target1.split('\\n').map(l => '    ' + l).join('\\n');
const indentedTarget2 = target2.split('\\n').map(l => '    ' + l).join('\\n');

const replacement = \`                        <div className="space-y-6 mb-8">
\${indentedTarget1}

\${indentedTarget2}
                        </div>
                        {systemAlerts.length > 0 && (\`;

newContent = newContent.replace(target3, replacement);

fs.writeFileSync(path, newContent);
