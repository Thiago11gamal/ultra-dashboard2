import React from 'react';
import { motion as Motion } from 'framer-motion';
import { AlertCircle, ArrowUpRight } from 'lucide-react';

export function QuickStat({ label, value, color, icon }) {
  return (
    <div className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1">
      <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
        <span className={color}>{icon}</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{label}</span>
      </div>
      <span className={`text-base font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
    </div>
  );
}

export function StatRow({ label, value, trend, color }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black ${color}`}>{value}</span>
        {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500" />}
        {trend === 'down' && <AlertCircle size={12} className="text-rose-500" />}
      </div>
    </div>
  );
}

export const GovernanceBanner = React.memo(function GovernanceBanner({ degradedCount }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      role="status"
      className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="shrink-0 w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
          <AlertCircle size={20} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
          <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
            Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> {degradedCount === 1 ? 'categoria com calibração degradada' : 'categorias com calibração degradada'}.
          </p>
        </div>
      </div>
      <div className="hidden sm:block text-right">
        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
          O Coach está aplicando<br />ajustes conservadores.
        </p>
      </div>
    </Motion.div>
  );
});
