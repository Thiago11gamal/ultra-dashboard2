import React from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

function MenuTab({ active, onClick, icon: Icon, label, subtitle, tabId, panelId }) {
    return (
        <button
            type="button"
            onClick={onClick}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            id={tabId}
            className={`group relative overflow-visible flex-1 lg:flex-none min-w-0 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 border transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60
                ${active
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-white/20 text-white shadow-xl shadow-indigo-900/40 ring-1 ring-white/20'
                    : 'bg-slate-900/80 border-white/[0.08] text-slate-400 hover:bg-slate-800 hover:border-white/20'}`}
        >
            <div className="flex items-center gap-3 min-w-0 pl-1">
                <div className={`shrink-0 w-12 h-8 rounded-md flex items-center justify-center border shadow-inner ${active ? 'bg-white/15 border-white/25' : 'bg-white/5 border-white/10'}`}>
                    <Icon size={14} strokeWidth={2.2} className="shrink-0" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.06em] leading-snug whitespace-nowrap">{label}</p>
                    <p className={`text-[10px] leading-tight mt-0.5 whitespace-nowrap ${active ? 'text-indigo-100/90' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
}

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    return (
        <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0f1f] via-[#0b1222] to-[#090d19] p-5 sm:p-6 md:p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="min-w-0 pb-2 lg:pb-0">
                    <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.22em] mb-1">Menu Coach AI</p>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Central de Estratégia e Diagnóstico</h3>
                </div>

                <div role="tablist" aria-label="Coach AI sections" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto">
                    <MenuTab
                        active={activeTab === 'insights'}
                        onClick={() => onChangeTab('insights')}
                        icon={Sparkles}
                        label="Plano de Estudos"
                        subtitle="Execução semanal"
                        tabId="coach-tab-insights"
                        panelId="coach-panel-insights"
                    />
                    <MenuTab
                        active={activeTab === 'analytics' && isPremium}
                        onClick={() => isPremium && onChangeTab('analytics')}
                        icon={BarChart3}
                        label="Raio-X Técnico"
                        subtitle={isPremium ? "Telemetria e auditoria" : "Disponível no Premium"}
                        tabId="coach-tab-analytics"
                        panelId="coach-panel-analytics"
                    />
                </div>
            </div>
        </div>
    );
}

