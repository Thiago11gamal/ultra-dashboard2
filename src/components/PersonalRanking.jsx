import React from 'react';

// StatCard moved outside of PersonalRanking to avoid recreation on each render
const StatCard = ({ title, item, color, icon, metric, label, isNegative = false, subtitle }) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 group transition-all duration-500 hover:scale-[1.02] border ${isNegative ? 'bg-red-950/40 border-red-500/20 hover:border-red-500/40' : 'bg-slate-900/80 border-white/10 hover:border-white/20'}`}>

        {/* Background Glow - Reduced Opacity */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-[60px] group-hover:opacity-30 transition-opacity`} />

        {/* Watermark Icon */}
        <div className={`absolute -bottom-4 -right-4 text-8xl opacity-[0.03] grayscale group-hover:grayscale-0 group-hover:opacity-10 transition-all duration-500 rotate-12 group-hover:rotate-0`}>
            {icon}
        </div>

        <div className="relative z-10">
            <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 opacity-70">
                {icon} {title}
            </h3>

            {item ? (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl filter drop-shadow-sm opacity-80">{item.icon}</span>
                        <div>
                            <div className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${color}`}>
                                {item.name}
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                                {subtitle || 'Disciplina'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-black tracking-tight ${isNegative ? 'text-red-400/90' : 'text-slate-200'}`}>
                            {metric}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-24 text-slate-700">
                    <span className="text-2xl mb-2 opacity-20">∅</span>
                    <span className="text-xs italic">Sem dados</span>
                </div>
            )}
        </div>
    </div>
);

export default function PersonalRanking({ categories }) {
    // Helper to calculate percentages and stats from Simulado Data
    const categoryStats = categories.map(cat => {
        const stats = cat.simuladoStats || { history: [] };
        const history = stats.history || [];
        const total = history.reduce((acc, h) => acc + h.total, 0);
        const correct = history.reduce((acc, h) => acc + h.correct, 0);
        const wrong = total - correct;
        const balance = correct - wrong;

        return {
            ...cat,
            total,
            correct,
            wrong,
            balance
        };
    });

    // Sort for rankings
    const sortedByBalance = [...categoryStats].sort((a, b) => b.balance - a.balance);
    const sortedByVolume = [...categoryStats].sort((a, b) => b.total - a.total);
    const sortedByErrors = [...categoryStats].sort((a, b) => b.wrong - a.wrong);

    // Identify winners/losers
    const strongest = sortedByBalance[0];
    const weakest = sortedByBalance[sortedByBalance.length - 1];
    const mostProductive = sortedByVolume[0];
    const mostBehind = sortedByErrors[0];

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 neon-text">
                🏆 Ranking Pessoal
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Disciplina Mais Forte */}
                <StatCard
                    title="MVP (Mais Forte)"
                    item={strongest}
                    color="from-green-400 to-emerald-600"
                    icon="👑"
                    metric={strongest?.balance > 0 ? `+${strongest.balance}` : strongest?.balance || 0}
                    label="Saldo Liq."
                    subtitle="Sua melhor performance"
                />

                {/* Maior Volume */}
                <StatCard
                    title="Máquina de Estudo"
                    item={mostProductive}
                    color="from-blue-400 to-cyan-600"
                    icon="🚀"
                    metric={mostProductive?.total || 0}
                    label="Questões"
                    subtitle="Onde você mais treinou"
                />

                {/* Disciplina Mais Fraca */}
                <StatCard
                    title="Ponto Fraco"
                    item={weakest}
                    color="from-red-400 to-rose-600"
                    icon="💀"
                    metric={weakest?.balance > 0 ? `+${weakest.balance}` : weakest?.balance || 0}
                    label="Saldo Liq."
                    isNegative
                    subtitle="Precisa de atenção urgente"
                />

                {/* Mais Erros */}
                <StatCard
                    title="Zona de Perigo"
                    item={mostBehind}
                    color="from-orange-400 to-amber-600"
                    icon="⚠️"
                    metric={mostBehind?.wrong || 0}
                    label="Erros"
                    isNegative
                    subtitle="Maior volume de erros"
                />
            </div>
        </div>
    );
}
