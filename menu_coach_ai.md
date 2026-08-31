# Código do Menu Coach AI

Este arquivo contém o código relacionado ao menu de navegação do Coach AI (`CoachMenuNav.jsx`).

## `src/components/coach/CoachMenuNav.jsx`

```jsx
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
            tabIndex={active ? 0 : -1}
            className={`group relative min-w-0 rounded-2xl p-4 transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c14] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${active
                ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30'
                : 'bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-white/10'
                } border`}
        >
            {active && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 blur-md -z-10" />
            )}
            <div className="flex items-center gap-4">
                <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-300 ${active
                    ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-500 group-hover:text-slate-400'
                    }`}>
                    <Icon size={20} className={active ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''} />
                </div>
                <div className="flex flex-col items-start min-w-0 text-left min-h-[36px] justify-center">
                    <span className={`text-sm font-black tracking-tight truncate w-full transition-colors duration-300 ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        }`}>
                        {label}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest truncate w-full transition-colors duration-300 ${active ? 'text-indigo-400/80' : 'text-slate-500'
                        }`}>
                        {subtitle}
                    </span>
                </div>
            </div>
            {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]" />
            )}
        </button>
    );
});

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const isPremiumBool = Boolean(isPremium);
    const insightsRef = useRef(null);
    const analyticsRef = useRef(null);

    const tabs = useMemo(() => [
        {
            key: 'insights',
            label: 'Plano de Estudo',
            subtitle: 'Sugestões & Metas',
            icon: Sparkles,
            tabRef: insightsRef
        },
        {
            key: 'analytics',
            label: 'Raio-X Técnico',
            subtitle: 'Calibração & Desvios',
            icon: BarChart3,
            tabRef: analyticsRef
        }
    ], []);

    const handleKeyDown = useCallback((e) => {
        const isDisabled = (tab) => tab.key === 'analytics' && !isPremiumBool;

        if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            const enabled = tabs.filter((t) => !isDisabled(t));
            if (enabled.length === 0) return;
            const target = e.key === 'Home' ? enabled[0] : enabled[enabled.length - 1];
            if (target && target.key !== activeTab) {
                onChangeTab(target.key);
            }
            return;
        }

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentIndex = tabs.findIndex(t => t.key === activeTab);
            let nextIndex = currentIndex;
            let attempts = 0;
            do {
                nextIndex = e.key === 'ArrowRight' ? nextIndex + 1 : nextIndex - 1;
                if (nextIndex >= tabs.length) nextIndex = 0;
                if (nextIndex < 0) nextIndex = tabs.length - 1;
                attempts++;
            } while (nextIndex !== currentIndex && isDisabled(tabs[nextIndex]) && attempts < tabs.length);

            const nextTab = tabs[nextIndex];
            if (nextTab && nextTab.key !== activeTab) {
                onChangeTab(nextTab.key);
            }
        }
    }, [activeTab, onChangeTab, tabs, isPremiumBool]);

    useEffect(() => {
        const activeItem = tabs.find(t => t.key === activeTab);
        if (activeItem?.tabRef?.current && document.activeElement?.getAttribute?.('role') === 'tab') {
            activeItem.tabRef.current.focus();
        }
    }, [activeTab, tabs]);

    return (
        <div
            role="tablist"
            aria-label="Navegação do Coach"
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8"
        >
            {tabs.map((tab) => (
                <div key={tab.key} className="flex-1">
                    <MenuTab
                        active={activeTab === tab.key}
                        onClick={onChangeTab}
                        onKeyDown={handleKeyDown}
                        icon={tab.icon}
                        label={tab.label}
                        subtitle={tab.subtitle}
                        tabId={TAB_IDS[tab.key]}
                        panelId={`coach-panel-${tab.key}`}
                        disabled={tab.key === 'analytics' && !isPremiumBool}
                        tabRef={tab.tabRef}
                        tabKey={tab.key}
                    />
                </div>
            ))}
        </div>
    );
}
```
