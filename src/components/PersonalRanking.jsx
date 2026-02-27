import React from 'react';
import { Trophy, Zap, Skull, ShieldAlert, Target, Star, Crown, TrendingUp } from 'lucide-react';

const StatCard = ({ title, item, color, icon: Icon, metric, label, isNegative = false, isMVP = false, subtitle }) => {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 group transition-all duration-700 hover:scale-[1.02] border backdrop-blur-xl ${isMVP ? 'bg-slate-900/60 border-yellow-500/30 hover:border-yellow-400/60 shadow-[0_0_40px_rgba(234,179,8,0.1)] hover:shadow-[0_0_60px_rgba(234,179,8,0.2)]' :
                isNegative ? 'bg-slate-900/60 border-red-500/20 hover:border-red-500/40 shadow-xl shadow-red-950/10' :
                    'bg-slate-900/60 border-white/5 hover:border-white/20'
            }`}>
            {/* Background Glows */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br transition-all duration-700 blur-[80px] ${isMVP ? 'from-yellow-400/20 to-orange-500/20 opacity-40 group-hover:opacity-60 group-hover:scale-125' :
                    isNegative ? 'from-red-500/10 to-rose-600/10 opacity-20' :
                        'from-blue-500/10 to-cyan-500/10 opacity-20'
                }`} />

            {/* Decorative Elements for MVP */}
            {isMVP && (
                <>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-700">
                        <TrendingUp size={80} className="rotate-12" />
                    </div>
                </>
            )}

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isMVP ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]' :
                            isNegative ? 'text-red-400/80' :
                                'text-slate-500'
                        }`}>
                        <div className={`p-1.5 rounded-lg ${isMVP ? 'bg-yellow-500/10' : 'bg-slate-800/50'}`}>
                            <Icon size={14} />
                        </div>
                        {title}
                    </h3>

                    {isMVP && (
                        <div className="flex gap-1">
                            <Star size={10} className="text-yellow-500 fill-yellow-500 animate-pulse" />
                            <Star size={10} className="text-yellow-500 fill-yellow-500 animate-pulse delay-75" />
                            <Star size={10} className="text-yellow-500 fill-yellow-500 animate-pulse delay-150" />
                        </div>
                    )}
                </div>

                {item ? (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-2xl relative ${isMVP ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-slate-800/80 border border-white/5'
                                }`}>
                                {item.icon || '📚'}
                                {isMVP && <Crown size={16} className="absolute -top-2 -right-2 text-yellow-500 drop-shadow-lg" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-xl font-black truncate tracking-tight uppercase ${isMVP ? 'text-yellow-400' : 'text-slate-100'
                                    }`} style={!isMVP ? { color: item.color } : {}}>
                                    {item.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {subtitle}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-end gap-3 px-1">
                            <div className="flex flex-col">
                                <span className={`text-5xl font-black tracking-tighter leading-none ${isMVP ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                                        isNegative ? 'text-red-500 shadow-red-500/20' :
                                            'text-white'
                                    }`}>
                                    {metric}
                                </span>
                            </div>
                            <div className="flex flex-col pb-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isMVP ? 'text-yellow-600' : 'text-slate-500'
                                    }`}>
                                    {label}
                                </span>
                                <div className={`h-1 rounded-full mt-1 w-12 ${isMVP ? 'bg-yellow-500' : isNegative ? 'bg-red-500' : 'bg-blue-500'
                                    } opacity-30`} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[120px] bg-slate-950/20 rounded-xl border border-dashed border-white/5">
                        <Target size={24} className="text-slate-800 mb-2" />
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Aguardando dados</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function PersonalRanking({ categories = [] }) {
    const categoryStats = React.useMemo(() => {
        return categories.map(cat => {
            const stats = cat.simuladoStats || { history: [] };
            const history = stats.history || [];
            const total = history.reduce((acc, h) => acc + Number(h.total || 0), 0);
            const correct = history.reduce((acc, h) => acc + Number(h.correct || 0), 0);
            const wrong = total - correct;
            const balance = correct - wrong;

            return { ...cat, total, correct, wrong, balance };
        });
    }, [categories]);

    const withData = categoryStats.filter(c => c.total > 0);
    const sortedByBalance = [...withData].sort((a, b) => b.balance - a.balance);
    const sortedByVolume = [...withData].sort((a, b) => b.total - a.total);
    const sortedByErrors = [...withData].sort((a, b) => b.wrong - a.wrong);

    const strongest = sortedByBalance[0] || null;
    const weakest = sortedByBalance.length > 1 ? sortedByBalance[sortedByBalance.length - 1] : null;
    const mostProductive = sortedByVolume[0] || null;
    const mostBehind = sortedByErrors[0]?.wrong > 0 ? sortedByErrors[0] : null;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <Trophy size={20} />
                    </div>
                    Ranking <span className="text-slate-500">Master</span>
                </h2>
                <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-full border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Live Analytics
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    title="MVP Dominante"
                    item={strongest}
                    color="from-yellow-400 to-orange-500"
                    icon={Crown}
                    metric={strongest?.balance > 0 ? `+${strongest.balance}` : strongest?.balance || 0}
                    label="Saldo Líquido"
                    subtitle="Maior Eficiência"
                    isMVP={true}
                />

                <StatCard
                    title="Estudioso (Volume)"
                    item={mostProductive}
                    color="from-blue-400 to-indigo-600"
                    icon={Zap}
                    metric={mostProductive?.total || 0}
                    label="Questões"
                    subtitle="Maior Produção"
                />

                <StatCard
                    title="Alerta de Risco"
                    item={weakest}
                    color="from-red-400 to-rose-600"
                    icon={ShieldAlert}
                    metric={weakest?.balance > 0 ? `+${weakest.balance}` : weakest?.balance || 0}
                    label="Saldo Líquido"
                    isNegative
                    subtitle="Foco em Melhoria"
                />

                <StatCard
                    title="Vazamento de Pontos"
                    item={mostBehind}
                    color="from-orange-400 to-amber-600"
                    icon={Skull}
                    metric={mostBehind?.wrong || 0}
                    label="Erros Acumulados"
                    isNegative
                    subtitle="Análise Reversa"
                />
            </div>
        </div>
    );
}

export default React.memo(PersonalRanking);

