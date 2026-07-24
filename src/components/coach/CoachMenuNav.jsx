import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

const TAB_IDS = {
    insights: 'coach-tab-insights',
    analytics: 'coach-tab-analytics'
};

const MenuTab = React.memo(function MenuTab({ active, onClick, onKeyDown, icon: Icon, label, subtitle, tabId, panelId, disabled = false, tabRef, tabKey }) {
    const handleClick = useCallback(() => {
        onClick(tabKey);
    }, [onClick, tabKey]);
    return (
        <button
            ref={tabRef}
            type="button"
            onClick={handleClick}
            onKeyDown={onKeyDown}
            disabled={disabled}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            aria-disabled={disabled}
            id={tabId}
            // FIX: simplified redundant expression (correct roving tabindex)
            tabIndex={active ? 0 : -1}
            className={`group relative min-w-0 rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 border transition-all duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1e] focus-visible:ring-indigo-400/80
                ${active
                    ? 'bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-600 border-white/20 text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)] ring-1 ring-white/20'
                    : 'bg-slate-900/60 border-white/[0.05] text-slate-400 hover:bg-slate-800/80 hover:border-white/10 hover:text-slate-100'}
                ${active ? 'mobile-menu-tab-active' : 'mobile-menu-tab-idle'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className={`flex items-center gap-3 min-w-0 pl-1 transform transition-transform duration-200 ${!active && !disabled ? 'group-hover:translate-x-1' : ''}`}>
                <div className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border transition-all duration-200 ${active ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/10 group-hover:bg-white/10'}`}>
                    <Icon size={16} strokeWidth={2.5} className={`shrink-0 transition-colors duration-200 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
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

const AVAILABLE_TABS = ['insights', 'analytics'];

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const insightsRef = useRef(null);
    const analyticsRef = useRef(null);
    const tabRefs = useMemo(() => ({
        insights: insightsRef,
        analytics: analyticsRef
    }), []);

    // FIX: only moves focus if it's in a tab of THIS tablist
    // (previously, any element with role="tab" on the page had its focus stolen)
    useEffect(() => {
        const activeRef = tabRefs[activeTab]?.current;
        const activeEl = document.activeElement;
        const isInsideThisTablist =
            activeEl &&
            activeEl.getAttribute('role') === 'tab' &&
            Object.values(TAB_IDS).includes(activeEl.id);
        if (activeRef && isInsideThisTablist) {
            activeRef.focus();
        }
    }, [activeTab, tabRefs]);

    const activateTab = useCallback((tabKey) => {
        if (!AVAILABLE_TABS.includes(tabKey)) return;
        onChangeTab(tabKey);
    }, [onChangeTab]);

    const handleTabKeyDown = useCallback((event) => {
        const isLeft = event.key === 'ArrowLeft';
        const isRight = event.key === 'ArrowRight';
        const isHome = event.key === 'Home';
        const isEnd = event.key === 'End';
        if (!isLeft && !isRight && !isHome && !isEnd) return;
        event.preventDefault();
        const currentIndex = AVAILABLE_TABS.indexOf(activeTab);
        if (isHome) {
            activateTab(AVAILABLE_TABS[0]);
            return;
        }
        if (isEnd) {
            activateTab(AVAILABLE_TABS[AVAILABLE_TABS.length - 1]);
            return;
        }
        const safeIndex = currentIndex >= 0 ? currentIndex : 0;
        const dir = isRight ? 1 : -1;
        let nextIndex = (safeIndex + dir + AVAILABLE_TABS.length) % AVAILABLE_TABS.length;
        activateTab(AVAILABLE_TABS[nextIndex]);
    }, [activeTab, activateTab]);

    return (
        <div className="mb-8 p-3 sm:p-4 rounded-3xl border border-violet-500/20 bg-slate-900/90 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-md">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-2 sm:px-4">
                <div className="min-w-0 py-2 sm:py-3">
                    <p className="text-[10px] text-cyan-400/80 font-black uppercase tracking-[0.25em] mb-1.5 px-0.5">Tactical Navigation</p>
                    <h3 className="text-2xl sm:text-[26px] font-black text-white tracking-[-0.02em] leading-none">Strategy Center</h3>
                </div>
                <div
                    role="tablist"
                    aria-label="Coach AI sections"
                    aria-orientation="horizontal"
                    className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:min-w-[560px] coach-mobile-tabs self-center"
                >
                    <MenuTab
                        tabKey="insights"
                        tabRef={insightsRef}
                        active={activeTab === 'insights'}
                        onClick={activateTab}
                        onKeyDown={handleTabKeyDown}
                        icon={Sparkles}
                        label="Study Plan"
                        subtitle="Weekly Execution"
                        tabId={TAB_IDS.insights}
                        panelId="coach-panel-insights"
                    />
                    <MenuTab
                        tabKey="analytics"
                        tabRef={analyticsRef}
                        active={activeTab === 'analytics'}
                        onClick={activateTab}
                        onKeyDown={handleTabKeyDown}
                        icon={BarChart3}
                        label="Technical X-Ray"
                        subtitle={isPremium ? "Telemetry and auditing" : "Technical Sample"}
                        tabId={TAB_IDS.analytics}
                        panelId="coach-panel-analytics"
                    />
                </div>
            </div>
        </div>
    );
}
