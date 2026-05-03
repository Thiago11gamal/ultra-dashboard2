import React from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

function MenuTab({ active, onClick, icon: Icon, label, subtitle, tabId, panelId, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            aria-disabled={disabled}
            id={tabId}
            tabIndex={active ? 0 : -1}
            className={`group relative overflow-visible flex-1 lg:flex-none min-w-0 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 border transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60
                ${active
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-white/20 text-white shadow-xl shadow-indigo-900/40 ring-1 ring-white/20'
                    : 'bg-slate-900/80 border-white/[0.08] text-slate-400 hover:bg-slate-800 hover:border-white/20'}
                ${disabled ? 'opacity-60 cursor-not-allowed hover:bg-slate-900/80 hover:border-white/[0.08]' : ''}`}
        >
            <div className="flex items-center gap-3 min-w-0 pl-1">
                <div className={`shrink-0 w-12 h-8 rounded-none flex items-center justify-center border shadow-inner ${active ? 'bg-white/15 border-white/25' : 'bg-white/5 border-white/10'}`}>
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
    const availableTabs = ['insights', 'analytics']; // Analytics is now always available as a sample

    const focusTab = (tabKey) => {
        if (typeof document === 'undefined') return;
        const tabId = `coach-tab-${tabKey}`;
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.focus();
    };

    const activateTab = (tabKey) => {
        onChangeTab(tabKey);
        focusTab(tabKey);
    };

    const handleTabKeyDown = (event) => {
        const isLeft = event.key === 'ArrowLeft';
        const isRight = event.key === 'ArrowRight';
        const isHome = event.key === 'Home';
        const isEnd = event.key === 'End';
        const isEnter = event.key === 'Enter';
        const isSpace = event.key === ' ' || event.key === 'Spacebar';
        if (!isLeft && !isRight && !isHome && !isEnd && !isEnter && !isSpace) return;

        event.preventDefault();
        const currentIndex = availableTabs.indexOf(activeTab);

        if (isEnter || isSpace) {
            activateTab(activeTab);
            return;
        }

        if (isHome) {
            activateTab(availableTabs[0]);
            return;
        }

        if (isEnd) {
            activateTab(availableTabs[availableTabs.length - 1]);
            return;
        }

        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const dir = isRight ? 1 : -1;
        const nextIndex = (safeIndex + dir + availableTabs.length) % availableTabs.length;
        activateTab(availableTabs[nextIndex]);
    };

    const handleActivateInsights = () => activateTab('insights');
    const handleActivateAnalytics = () => {
        activateTab('analytics');
    };

    return (
        <div className="mb-8 p-1">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="min-w-0 pb-2 lg:pb-0 px-2">
                    <p className="text-[10px] text-cyan-400/80 font-black uppercase tracking-[0.25em] mb-1.5">Navegação</p>
                    <h3 className="text-xl font-black text-white tracking-tight">Central de Estratégia</h3>
                </div>

                <div
                    role="tablist"
                    aria-label="Coach AI sections"
                    aria-orientation="horizontal"
                    onKeyDown={handleTabKeyDown}
                    className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto"
                >
                    <MenuTab
                        active={activeTab === 'insights'}
                        onClick={handleActivateInsights}
                        icon={Sparkles}
                        label="Plano de Estudos"
                        subtitle="Execução semanal"
                        tabId="coach-tab-insights"
                        panelId="coach-panel-insights"
                    />
                    <MenuTab
                        active={activeTab === 'analytics'}
                        onClick={handleActivateAnalytics}
                        icon={BarChart3}
                        label="Raio-X Técnico"
                        subtitle={isPremium ? "Telemetria e auditoria" : "Amostra Técnica"}
                        tabId="coach-tab-analytics"
                        panelId="coach-panel-analytics"
                    />
                </div>
            </div>
        </div>
    );
}
