import React, { useRef, useEffect } from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';

const MenuTab = React.memo(function MenuTab({ active, onClick, onKeyDown, icon: Icon, label, subtitle, tabId, panelId, disabled = false, tabRef }) {
    return (
        <button
            ref={tabRef}
            type="button"
            onClick={onClick}
            onKeyDown={onKeyDown}
            disabled={disabled}
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            aria-disabled={disabled}
            id={tabId}
            tabIndex={active ? 0 : disabled ? -1 : -1}
            // Removido scale-[1.02] da raiz para evitar Layout Shift
            className={`group relative min-w-0 rounded-2xl px-4 sm:px-6 py-2.5 sm:py-3 border transition-all duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1e] focus-visible:ring-indigo-400/80
                ${active
                    ? 'bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-600 border-white/20 text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)] ring-1 ring-white/20'
                    : 'bg-slate-900/60 border-white/[0.05] text-slate-400 hover:bg-slate-800/80 hover:border-white/10 hover:text-slate-100'}
                ${active ? 'mobile-menu-tab-active' : 'mobile-menu-tab-idle'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {/* Efeito de hover movido para o conteúdo interno (transform translate-x) */}
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

export default function CoachMenuNav({ activeTab, onChangeTab, isPremium }) {
    const availableTabs = ['insights', 'analytics'];
    
    // Mapeamento de referências para gestão de foco sem setTimeout
    const tabRefs = {
        insights: useRef(null),
        analytics: useRef(null)
    };

    // Foca a aba recém ativada via teclado apenas se o foco estiver dentro do tablist
    useEffect(() => {
        const activeRef = tabRefs[activeTab]?.current;
        if (activeRef && document.activeElement && document.activeElement.getAttribute('role') === 'tab') {
            activeRef.focus();
        }
    }, [activeTab]);

    const activateTab = (tabKey) => {
        if (!availableTabs.includes(tabKey)) return;
        onChangeTab(tabKey);
    };

    const handleTabKeyDown = (event) => {
        const isLeft = event.key === 'ArrowLeft';
        const isRight = event.key === 'ArrowRight';
        const isHome = event.key === 'Home';
        const isEnd = event.key === 'End';
        
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
        let nextIndex = (safeIndex + dir + availableTabs.length) % availableTabs.length;
        
        activateTab(availableTabs[nextIndex]);
    };

    return (
        <div className="mb-8 p-3 sm:p-4 rounded-3xl border border-violet-500/20 bg-slate-900/90 shadow-[0_18px_40px_rgba(2,6,23,0.5)] backdrop-blur-md">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-2 sm:px-4">
                <div className="min-w-0 py-2 sm:py-3">
                    <p className="text-[10px] text-cyan-400/80 font-black uppercase tracking-[0.25em] mb-1.5 px-0.5">Navegação Tática</p>
                    <h3 className="text-2xl sm:text-[26px] font-black text-white tracking-[-0.02em] leading-none">Central de Estratégia</h3>
                </div>

                <div
                    role="tablist"
                    aria-label="Coach AI sections"
                    aria-orientation="horizontal"
                    className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:min-w-[560px] coach-mobile-tabs self-center"
                >
                    <MenuTab
                        tabRef={tabRefs.insights}
                        active={activeTab === 'insights'}
                        onClick={() => activateTab('insights')}
                        onKeyDown={handleTabKeyDown}
                        icon={Sparkles}
                        label="Plano de Estudos"
                        subtitle="Execução semanal"
                        tabId="coach-tab-insights"
                        panelId="coach-panel-insights"
                    />
                    <MenuTab
                        tabRef={tabRefs.analytics}
                        active={activeTab === 'analytics'}
                        onClick={() => activateTab('analytics')}
                        onKeyDown={handleTabKeyDown}
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
