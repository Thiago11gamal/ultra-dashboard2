import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target } from 'lucide-react';

// FIX: safe conversion to integer percentage (never NaN)
const toPercentInt = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) : fallback;
};

/**
 * CustomTooltip for ReliabilityCurveChart
 */
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        const isOverconfident = dataPoint.pred > dataPoint.obs;
        // FIX: invalid gap doesn't turn into "NaN%" in tooltip
        const safeGap = Number.isFinite(dataPoint.gap) ? Math.abs(dataPoint.gap) : 0;
        return (
            <div className="bg-slate-900 border border-white/10 p-3 rounded-none shadow-xl shadow-black/50 backdrop-blur-md">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">
                    Range: {dataPoint.binStart}% - {dataPoint.binEnd}%
                </p>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-6">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Prediction (Engine)</span>
                        <span className="text-[11px] font-black text-indigo-400">{dataPoint.pred}%</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Observed (Real)</span>
                        <span className="text-[11px] font-black text-cyan-400">{dataPoint.obs}%</span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-white/5 flex justify-between items-center gap-6">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Gap / Bias</span>
                        <span className={`text-[11px] font-black ${isOverconfident ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isOverconfident ? 'Overconfident' : 'Underconfident'} ({safeGap}%)
                        </span>
                    </div>
                    <div className="flex justify-between items-center gap-6 pt-1">
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Samples (n)</span>
                        <span className="text-[9px] font-black text-slate-400">{dataPoint.count}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

/**
 * ReliabilityCurveChart
 *
 * Visualizes the calibration of the prediction engine by comparing predicted probabilities
 * against observed outcomes.
 */
export default function ReliabilityCurveChart({ buckets }) {
    const data = useMemo(() => {
        if (!Array.isArray(buckets) || buckets.length === 0) return [];
        return buckets
            // FIX: count as string ("3") is also accepted
            .filter(b => Number(b?.count) > 0)
            .map(b => {
                // FIX: missing or null bin/binMin/binMax no longer generate NaN
                const bin = Number(b.bin);
                const safeBin = Number.isFinite(bin) ? bin : 0;
                const binWidth = Number(b.binWidth);
                const safeBinWidth = Number.isFinite(binWidth) && binWidth > 0 ? binWidth : 0.1;
                return {
                    pred: toPercentInt(b.meanPred),
                    obs: toPercentInt(b.observedRate),
                    gap: toPercentInt(b.gap),
                    count: Number(b.count) || 0,
                    // FIX: `!= null` covers null AND undefined (previously, null passed and became 0)
                    binStart: b.binMin != null ? toPercentInt(b.binMin) : toPercentInt(safeBin - safeBinWidth),
                    binEnd: b.binMax != null ? toPercentInt(b.binMax) : toPercentInt(safeBin)
                };
            })
            .sort((a, b) => a.pred - b.pred);
    }, [buckets]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 rounded-none border border-white/5 bg-black/20 text-center px-4">
                <Target size={20} className="text-slate-600 mb-2" />
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">No Reliability Curve</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1 max-w-[200px]">
                    Insufficient data to plot reliability.
                </p>
            </div>
        );
    }

    return (
        // FIX: accessibility — chart is now announced to screen readers
        <div
            className="w-full h-[300px] rounded-none border border-white/5 bg-black/20 p-4 relative"
            role="img"
            aria-label="Reliability curve: comparison between engine prediction and actual hit rate by probability range"
        >
            <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={1}>
                <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="pred"
                        type="number"
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        stroke="rgba(255,255,255,0.1)"
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                        type="number"
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        stroke="rgba(255,255,255,0.1)"
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                    <Line connectNulls
                        type="monotoneX"
                        dataKey="obs"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                        dot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
                        isAnimationActive={true}
                    />
                </LineChart>
            </ResponsiveContainer>
            <div className="absolute top-4 left-16 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-0.5 bg-white/20 rounded-full border-t border-dashed border-white/40" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Engine</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-0.5 bg-cyan-500 rounded-full" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reality</span>
                </div>
            </div>
        </div>
    );
}
