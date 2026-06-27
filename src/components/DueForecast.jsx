import React, { useMemo } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { computeFlashcardDueForecast } from '../utils/analytics';
import DueForecastChart from './charts/DueForecastChart';

/**
 * Previsão de Cartões a Vencer (Due Forecast)
 * Componente reutilizável com resumo + gráfico de barras.
 */
export default function DueForecast({ decks = [], horizon = 14, compact = false }) {
    const safeHorizon = Math.max(1, Math.floor(Number(horizon) || 14));
    const { forecast, totalDueInHorizon, maxDaily, horizon: usedHorizon } = useMemo(
        () => computeFlashcardDueForecast(decks, safeHorizon),
        [decks, safeHorizon]
    );

    const totalCards = decks.reduce((sum, d) => sum + (d.cards?.length || 0), 0);
    const todayCount = forecast[0]?.count || 0;
    // Safe peakDay (never crash)
    const peakDay = forecast.length > 0
        ? (forecast.find(d => d.count === maxDaily) || forecast[0])
        : { label: '-', dateLabel: '-' };

    if (!totalCards) {
        return (
            <div className="glass p-5 rounded-3xl border border-white/10 text-center text-sm text-slate-400">
                Nenhum cartão de flashcard ainda. Crie decks para ver a previsão de vencimentos.
            </div>
        );
    }

    if (compact) {
        // Compact inline version — respects the horizon prop
        const sliceLen = Math.min(7, usedHorizon);
        const nextN = forecast.slice(0, sliceLen).reduce((s, f) => s + f.count, 0);
        const label = usedHorizon <= 7 ? `Próximos ${usedHorizon} dias` : `Próximos ${sliceLen} dias`;
        return (
            <div className="flex items-center gap-3 text-sm">
                <div>
                    <span className="uppercase text-[10px] tracking-widest text-slate-500">Hoje</span>
                    <div className={`text-xl font-black tabular-nums ${todayCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {todayCount}
                    </div>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                    <span className="uppercase text-[10px] tracking-widest text-slate-500">{label}</span>
                    <div className="text-xl font-black text-amber-300 tabular-nums">{nextN}</div>
                </div>
                <div className="ml-auto text-[10px] text-right text-slate-400">
                    Pico: <span className="font-bold text-white">{maxDaily}</span> em {peakDay.label}
                </div>
            </div>
        );
    }

    return (
        <div className="glass p-6 rounded-3xl border border-amber-500/20 bg-amber-950/5">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <Calendar size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <div className="font-black text-white tracking-tight text-lg">Previsão de Cartões a Vencer</div>
                        <div className="text-[10px] uppercase tracking-[1.5px] text-amber-400/80 font-bold">Due Forecast • Próximos {usedHorizon} dias</div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500 tracking-widest">Total a vencer</div>
                    <div className="text-3xl font-black text-amber-300 tabular-nums leading-none mt-0.5">
                        {totalDueInHorizon}
                    </div>
                    <div className="text-[10px] text-slate-400">no período</div>
                </div>
            </div>

            <DueForecastChart data={forecast} height={240} />

            {/* Summary row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] text-slate-500">Hoje (vencidos + agendados)</div>
                    <div className={`text-2xl font-black tabular-nums ${todayCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {todayCount}
                    </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] text-slate-500">Pico diário</div>
                    <div className="text-2xl font-black text-amber-400 tabular-nums">{maxDaily}</div>
                    <div className="text-[10px] text-amber-400/70">{peakDay.label} ({peakDay.dateLabel})</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] text-slate-500">Total no horizonte</div>
                    <div className="text-2xl font-black text-white tabular-nums">{totalDueInHorizon}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 flex items-center text-xs text-slate-400">
                    {totalDueInHorizon > 0 ? (
                        <>Planeje revisões diárias para evitar acúmulo. Cartões são reagendados ao revisar.</>
                    ) : (
                        <>Excelente! Nenhum vencimento programado.</>
                    )}
                    <TrendingUp size={16} className="ml-auto opacity-40" />
                </div>
            </div>

            <div className="mt-3 text-[10px] text-center text-slate-500">
                A previsão reflete o agendamento atual. Revisar um cartão o move para uma data futura.
            </div>
        </div>
    );
}
