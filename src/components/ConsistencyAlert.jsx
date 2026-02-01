import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConsistencyAlert({ categories = [], onNavigate }) {

    // Find subjects with high Standard Deviation (oscillating performance)
    const oscillatingSubjects = useMemo(() => {
        const alerts = [];

        categories.forEach(category => {
            // Get history from simuladoStats (same source as VerifiedStats)
            const stats = category.simuladoStats || {};
            const history = stats.history || [];

            if (history.length < 2) return; // Need at least 2 data points

            // Calculate scores from history
            const scores = history.map(h => h.score);

            // Filter out invalid scores
            const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
            if (validScores.length < 2) return;

            // Calculate Standard Deviation (Sample SD with Bessel's correction)
            const mean = validScores.reduce((a, b) => a + b, 0) / validScores.length;
            const variance = validScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (validScores.length - 1);
            const sd = Math.sqrt(variance);

            // If SD > 15, it's oscillating
            if (sd > 15) {
                alerts.push({
                    name: category.name,
                    color: category.color,
                    sd: sd.toFixed(1),
                    mean: mean.toFixed(0),
                    dataPoints: validScores.length
                });
            }
        });

        // Sort by SD descending (most unstable first)
        return alerts.sort((a, b) => parseFloat(b.sd) - parseFloat(a.sd));
    }, [categories]);

    // If no oscillating subjects, show nothing (remove demo after testing)
    // DEMO MODE: Shows example if no real alerts exist
    const displaySubjects = oscillatingSubjects.length > 0 ? oscillatingSubjects : [
        {
            name: 'Exemplo: Raciocínio Lógico',
            color: '#f59e0b',
            sd: '18.5',
            mean: '67',
            dataPoints: 4,
            isDemo: true
        }
    ];

    // DEMO MODE ATIVADO - Sempre mostra alerta de exemplo
    // Para desativar, descomente a linha abaixo:
    // if (oscillatingSubjects.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
            >
                {displaySubjects.slice(0, 2).map((subject, index) => (
                    <motion.div
                        key={subject.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative overflow-hidden rounded-xl p-4 border border-yellow-500/30 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 backdrop-blur-sm group"
                    >
                        {/* Animated glow */}
                        <div className="absolute -top-10 -right-10 w-20 h-20 bg-yellow-500/20 rounded-full blur-[40px] group-hover:scale-150 transition-transform duration-700" />

                        <div className="relative z-10 flex items-center justify-between gap-4">
                            {/* Left: Icon and Message */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/20 rounded-lg">
                                    <AlertTriangle size={18} className="text-yellow-400" />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="text-sm font-bold"
                                            style={{ color: subject.color }}
                                        >
                                            {subject.name}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-400">
                                            Oscilante
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Desvio Padrão: <span className="text-yellow-400 font-semibold">{subject.sd}</span>
                                        <span className="mx-1">•</span>
                                        Média: {subject.mean}%
                                        <span className="mx-1">•</span>
                                        Performance instável detectada
                                    </p>
                                </div>
                            </div>

                            {/* Right: Action Button */}
                            <button
                                onClick={() => onNavigate && onNavigate('stats')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-semibold transition-colors whitespace-nowrap"
                            >
                                Ver Diagnóstico
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </motion.div>
                ))}

                {displaySubjects.length > 2 && (
                    <p className="text-xs text-slate-500 text-center">
                        +{displaySubjects.length - 2} outras matérias oscilantes
                    </p>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
