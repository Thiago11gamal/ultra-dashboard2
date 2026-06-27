import React from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

const MenuTab = React.memo(function MenuTab({ active, onClick, icon: Icon, label, subtitle, tabId, panelId, disabled = false }) {
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
            className={`group relative overflow-hidden min-w-0 rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 border transition-all duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1e] focus-visible:ring-indigo-400/80
                ${active
                    ? 'bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-600 border-white/30 text-white shadow-[0_12px_32px_rgba(79,70,229,0.4)] ring-1 ring-white/30 scale-[1.015]'
                    : 'bg-slate-900/70 border-white/[0.06] text-slate-400 hover:bg-slate-800/95 hover:border-white/20 hover:text-slate-200 hover:shadow-sm'}
                ${active ? 'mobile-menu-tab-active' : 'mobile-menu-tab-idle'}
                ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-slate-900/70' : ''}`}
        >
            <div className="flex items-center gap-3 min-w-0 pl-1">
                <div className={`shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all duration-200 ${active ? 'bg-white/30 border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]' : 'bg-white/5 border-white/10 group-hover:bg-white/10 group-hover:border-white/20'}`}>
                    <Icon size={18} strokeWidth={2.5} className={`shrink-0 transition-transform duration-200 ${active ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : 'text-slate-400 group-hover:text-slate-200'}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.12em] leading-snug truncate">{label}</p>
                    <p className={`text-[9px] sm:text-[10px] font-bold leading-tight mt-0.5 uppercase tracking-[0.08em] truncate ${active ? 'text-indigo-100/95' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
});

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const availableTabs = ['insights', 'analytics']; // Analytics is now always available as a sample

    const focusTab = (tabKey) => {
        if (typeof document === 'undefined') return;
        const tabId = `coach-tab-${tabKey}`;
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.focus();
    };

    const activateTab = (tabKey) => {
        if (!availableTabs.includes(tabKey)) return;
        onChangeTab(tabKey);
        setTimeout(() => focusTab(tabKey), 0);
    };

    const handleTabKeyDown = (event) => {
        const isLeft = event.key === 'ArrowLeft';
        const isRight = event.key === 'ArrowRight';
        const isHome = event.key === 'Home';
        const isEnd = event.key === 'End';
        // Só previne padrão para teclas de navegação do ARIA (não Enter/Space que são do botão)
        if (!isLeft && !isRight && !isHome && !isEnd) return;

        event.preventDefault();
        const currentIndex = availableTabs.indexOf(activeTab);

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
        <div className="mb-8 p-3 sm:p-4 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-slate-950/95 to-slate-900/90 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-md">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-2 sm:px-4">
                <div className="min-w-0 py-2 sm:py-3">
                    <p className="text-[10px] text-cyan-400/80 font-black uppercase tracking-[0.25em] mb-1.5 px-0.5">Navegação Tática</p>
                    <h3 className="text-2xl sm:text-[26px] font-black text-white tracking-[-0.02em] leading-none">Central de Estratégia</h3>
                </div>

                <div
                    role="tablist"
                    aria-label="Coach AI sections"
                    aria-orientation="horizontal"
                    onKeyDown={handleTabKeyDown}
                    className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:min-w-[560px] coach-mobile-tabs self-center"
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
