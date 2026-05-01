import React from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

function MenuTab({ active, onClick, icon: Icon, label, subtitle }) {
    return (
        <button
            onClick={onClick}
            className={`group relative flex-1 lg:flex-none min-w-0 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 border transition-all duration-300 text-left
                ${active
                    ? 'bg-gradient-to-br from-indigo-500/90 to-violet-500/90 border-indigo-300/40 text-white shadow-lg shadow-indigo-900/30 ring-1 ring-white/20'
                    : 'bg-slate-900/50 border-white/10 text-slate-300 hover:bg-slate-800/70 hover:border-white/20'}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${active ? 'bg-white/15 border-white/25' : 'bg-white/5 border-white/10'}`}>
                    <Icon size={16} className="shrink-0" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.08em] leading-tight whitespace-nowrap">{label}</p>
                    <p className={`text-[10px] leading-tight mt-0.5 whitespace-nowrap ${active ? 'text-indigo-100/90' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
}

export default function CoachMenuNav({ activeTab, onChangeTab }) {
    return (
        <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0f1f] via-[#0b1222] to-[#090d19] p-4 sm:p-5 md:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[10px] text-cyan-300/70 font-black uppercase tracking-[0.22em]">Menu Coach AI</p>
                    <h3 className="text-sm sm:text-base font-black text-white tracking-tight">Central de Estratégia e Diagnóstico</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto">
                    <MenuTab
                        active={activeTab === 'insights'}
                        onClick={() => onChangeTab('insights')}
                        icon={Sparkles}
                        label="Plano de Estudos"
                        subtitle="Execução semanal"
                    />
                    <MenuTab
                        active={activeTab === 'analytics'}
                        onClick={() => onChangeTab('analytics')}
                        icon={BarChart3}
                        label="Raio-X Técnico"
                        subtitle="Telemetria e auditoria"
                    />
                </div>
            </div>
        </div>
    );
}
