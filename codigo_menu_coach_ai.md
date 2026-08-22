# Código do Menu Coach AI

Este arquivo consolida os principais códigos relacionados ao Menu e funcionalidades do Coach AI.

## `src/components/coach/CoachMenuNav.jsx`

```javascript
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
            // FIX: expressão redundante simplificada (roving tabindex correto)
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
            {/* FIX (BUG-18): bottom-0 em vez de -bottom-[1px] para não ser cortado por overflow do pai */}
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
        // FIX: helper genérico de tab desabilitada
        const isDisabled = (tab) => tab.key === 'analytics' && !isPremiumBool;

        // FIX (BUG-23): suporte a Home/End (navegação ARIA completa de tablist)
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
            // BUG-06 FIX: safety counter previne loop infinito se todas tabs estiverem desabilitadas
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
            // FIX: acesso a ref no render não ocorre, o foco acontece de forma assíncrona/após montagem
        }
    }, [activeTab, onChangeTab, tabs, isPremiumBool]);

    // FIX: Restaura foco apenas quando usuário interage via teclado (evita roubar foco on mount)
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

## `src/components/AICoachView.jsx`

```javascript
import React, { useMemo, useState, useCallback } from 'react';
import {
  Play, Sparkles, Zap, BrainCircuit, ChevronDown, Download,
  Loader2, Compass, Trash2, LayoutGrid, List, Target,
  AlertCircle, Trophy, Activity
} from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import AICoachWidget from './AICoachWidget';
import AICoachPlanner from './AICoachPlanner';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { exportComponentAsPDF } from '../utils/pdfExport';
import { getSafeId } from '../utils/idGenerator';
import { displaySubject } from '../utils/displaySubject';
import { useToast } from '../hooks/useToast';
import { isSystemAlertTask, parseCoachTask, RX_BOLD } from '../utils/coachText';
import { toFiniteNumber } from '../utils/coachSafe';
import { toProbPct, clampFinite } from '../utils/measurement';

const getMcProbPct = (task) => {
  return clampFinite(
    toProbPct(
      task?.analysis?.monteCarlo?.probabilityPct ??
      task?.analysis?.monteCarlo?.probabilityRaw ??
      task?.analysis?.monteCarlo?.probability
    ),
    0,
    100,
    0
  );
};

// FIX (BUG-04): protege edge cases — '**' isolado, inner vazio, fragmentos vazios
function renderBoldText(text) {
  const safeText = String(text || '');
  if (!safeText.trim()) return null;
  const parts = safeText.split(RX_BOLD).filter(Boolean);
  return parts
    .map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.slice(2, -2).trim();
        if (!inner) return null;
        return (
          <strong key={`bold-${idx}`} className="text-white font-black">
            {inner}
          </strong>
        );
      }
      const cleaned = part.replace(/\*\*/g, '');
      return cleaned ? (
        <React.Fragment key={`bold-${idx}`}>{cleaned}</React.Fragment>
      ) : null;
    })
    .filter(Boolean);
}

// FIX (BUG-16): helper de match em escopo de módulo (evita recriação por render)
const matchesTask = (t, task) => {
  const idT = getSafeId(t);
  const idTask = getSafeId(task);
  if (idT && idTask) return idT === idTask;
  return t === task || (t.title && t.title === task.title);
};

const CARD_COLORS = [
  { accent: 'border-l-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20', glow: 'from-violet-900/20', btnHover: 'hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-[0_0_20px_-3px_rgba(139,92,246,0.4)]' },
  { accent: 'border-l-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', glow: 'from-cyan-900/20', btnHover: 'hover:bg-cyan-600 hover:text-white hover:border-cyan-500 hover:shadow-[0_0_20px_-3px_rgba(6,182,212,0.4)]' },
  { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', glow: 'from-emerald-900/20', btnHover: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]' },
  { accent: 'border-l-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20', glow: 'from-rose-900/20', btnHover: 'hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.4)]' },
  { accent: 'border-l-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', glow: 'from-amber-900/20', btnHover: 'hover:bg-amber-500 hover:text-amber-950 hover:border-amber-400 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.4)]' },
];

function AICoachCard({ task, idx, categories, onStartPomodoro, maxScore = 100 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullText = task?.text || task?.title || '';
  const parsed = parseCoachTask({ ...task, text: fullText }, categories);
  const subjectPart = parsed.subject;
  const isSystemAlert = parsed.isSystemAlert;
  const isSrsTask = Boolean(task?.analysis?.reason?.includes('SRS') || task?.text?.includes('SRS'));
  const isSafeTask = Boolean(task?.analysis?.reason?.includes('Cruzeiro') || task?.analysis?.reason?.includes('Manutenção'));
  const isChaosTask = Boolean(task?.analysis?.reason?.includes('Oscilação') || task?.analysis?.reason?.includes('Caos'));
  const isPriority = parsed.priority === 'high' || isSrsTask || isSafeTask || isChaosTask;
  const systemAlertMessage = isSystemAlert ? (parsed.action || parsed.topic) : null;
  const displayAssunto = parsed.topic;
  const displayMeta = parsed.action && parsed.action !== parsed.topic ? parsed.action : null;
  const col = CARD_COLORS[idx % CARD_COLORS.length];
  const mcProbPct = getMcProbPct(task);
  const hasProb = mcProbPct > 0 || task.analysis?.monteCarlo?.probability != null;
  const safeProb = hasProb ? mcProbPct : null;
  const safeVol = toFiniteNumber(task.analysis?.monteCarlo?.volatility, 0);
  const safeMax = Number(maxScore) > 0 ? Number(maxScore) : 100;
  const highVolThreshold = 8 * (safeMax / 100);
  const isHighVol = safeVol > highVolThreshold;
  const isCompleted = parsed.isCompleted;
  const isStudying = parsed.isStudying;
  const isSrs = isSrsTask;
  const isSafe = isSafeTask;
  const isChaos = isChaosTask;
  return (
    // FIX (BUG-12): h-full para cards de altura uniforme no grid items-stretch
    <div
      className={`group relative flex flex-col h-full p-5 sm:p-7 rounded-3xl bg-[#0a0c14] border transition-all duration-100 overflow-hidden shadow-2xl hover:border-white/10 ${
        isCompleted
          ? 'opacity-75 border-emerald-500/20 border-l-4 sm:border-l-8 border-l-emerald-500'
          : isPriority
          ? 'border-rose-500/30 border-l-4 sm:border-l-8 border-l-rose-500 shadow-[0_0_40px_-10px_rgba(225,29,72,0.15)]'
          : `border-white/[0.06] border-l-4 sm:border-l-8 ${col.accent}`
      }`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] via-[#0a0c14]/0 to-transparent ${isPriority ? 'from-rose-900/30' : col.glow}`} />
      {isPriority && !isCompleted && (
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-rose-600/20 blur-[80px] rounded-full pointer-events-none animate-pulse" />
      )}
      <div className="relative z-10 grid grid-cols-[1fr_auto] items-start mb-5 gap-4">
        <div className="flex flex-col items-start gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${col.badge} shadow-lg backdrop-blur-md border max-w-full shrink-0`}>
              <div className={`w-2 h-2 rounded-full ${col.dot} shadow-[0_0_12px_rgba(255,255,255,0.4)] shrink-0`} />
              {/* PATCH: title tooltip */}
              <span
                className="leading-[1.32] truncate min-w-0 block"
                title={displaySubject(subjectPart, categories)}
              >
                {displaySubject(subjectPart, categories)}
              </span>
            </div>
            {isCompleted ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                <span>✓ Concluído</span>
              </div>
            ) : isStudying ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse shrink-0">
                <span>⚡ Em Estudo</span>
              </div>
            ) : isPriority ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500/10 text-rose-300 border border-rose-500/30 shrink-0">
                <span>⚡ Alta Prioridade</span>
              </div>
            ) : null}
            {isSrs && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-sky-500/10 text-sky-300 border border-sky-500/30 shrink-0">
                <span>🧠 Flashcard SRS</span>
              </div>
            )}
            {isSafe && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shrink-0">
                <span>🛡️ Manutenção</span>
              </div>
            )}
            {isChaos && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                <span>⚡ Oscilação</span>
              </div>
            )}
          </div>
        </div>
        {/* PATCH: min-w-[40px] em vez de w-10 h-10 sm:w-auto */}
        <button
          onClick={(e) => { e.stopPropagation(); onStartPomodoro(task); }}
          aria-label={`Iniciar sessão de estudo: ${displaySubject(subjectPart, categories)}`}
          className={`shrink-0 flex items-center gap-2 rounded-xl border min-w-[40px] h-10 px-3 sm:px-4 transition-all duration-150 shadow-xl group/btn hover:scale-105 active:scale-95 justify-center ${
            isPriority
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 hover:shadow-[0_0_25px_-5px_rgba(225,29,72,0.6)] animate-[pulse_3s_ease-in-out_infinite]'
              : `bg-white/[0.03] border-white/[0.08] text-slate-300 ${col.btnHover}`
          }`}
        >
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Iniciar</span>
          <Play size={13} fill="currentColor" className="transition-colors" />
        </button>
      </div>
      <div className="relative z-10 flex-1 mb-5">
        {systemAlertMessage ? (
          <h4 className="text-sm sm:text-base font-extrabold text-amber-300 tracking-tight leading-snug">
            ⚠️ {renderBoldText(systemAlertMessage)}
          </h4>
        ) : (
          <>
            {displayAssunto && (
              <h4 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                {renderBoldText(displayAssunto)}
              </h4>
            )}
            {displayMeta && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl font-medium">
                {renderBoldText(displayMeta)}
              </p>
            )}
          </>
        )}
      </div>
      {(safeProb !== null || safeVol > 0) && (
        <div className={`relative z-10 grid ${safeProb !== null && safeVol > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-5`}>
          {safeProb !== null && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center justify-between z-10 relative">
                <span className="text-[9px] font-black tracking-widest uppercase text-indigo-400/80">Probabilidade</span>
                <span className="font-mono text-xs font-bold text-indigo-300">{Math.round(safeProb)}%</span>
              </div>
              <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-full transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, safeProb))}%` }} />
              </div>
            </div>
          )}
          {safeVol > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 flex flex-col gap-2 relative group/kpi transition-colors hover:bg-white/[0.04]">
              <div className="flex items-center justify-between z-10 relative">
                <span className={`text-[9px] font-black tracking-widest uppercase ${isHighVol ? 'text-amber-400/80' : 'text-slate-400'}`}>Volatilidade</span>
                <span className={`font-mono text-xs font-bold ${isHighVol ? 'text-amber-300' : 'text-slate-300'}`}>
                  {safeVol > 0 && safeVol < 0.5 ? '<1' : `±${Math.round(safeVol)}`}
                </span>
              </div>
              <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden z-10 relative">
                <div className={`h-full rounded-full transition-all duration-200 ${isHighVol ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-slate-500'}`} style={{ width: `${Math.min(100, Math.max(0, (safeVol / (0.2 * safeMax)) * 100))}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
      {task.analysis && (
        <div className="relative z-10 mt-auto pt-4 border-t border-white/[0.04]">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-150 outline-none focus:outline-none ${isExpanded ? 'bg-indigo-500/[0.04] border-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <BrainCircuit size={12} className="text-indigo-400" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-indigo-300' : 'text-slate-400'}`}>
                Análise do Coach
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-150 ${isExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`} />
          </button>
          <AnimatePresence>
            {isExpanded && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-2 space-y-3 w-full">
                  <div className="w-full text-[11px] sm:text-xs text-indigo-200/80 leading-relaxed bg-indigo-500/[0.04] p-3 sm:p-4 rounded-xl border border-indigo-500/10 font-medium whitespace-pre-wrap break-words shadow-[inset_0_0_20px_rgba(99,102,241,0.03)] font-mono tracking-tight overflow-hidden">
                    {renderBoldText(task.analysis.reason)}
                  </div>
                  {task.analysis.metrics && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(task.analysis.metrics).map(([key, value], idx) => (
                        <div key={`metric-${key}-${idx}`} className="bg-indigo-500/[0.03] border border-indigo-500/10 px-3 py-2 rounded-xl flex flex-col gap-0.5">
                          <span className="text-[8px] text-indigo-400/60 uppercase tracking-widest font-black">{key}</span>
                          <span className="text-[10px] font-mono text-indigo-200">
                            {(value === null || value === undefined) ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {task.analysis.monteCarlo?.calibrationPenalty >= 0.005 && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                      <Zap size={12} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                          Ajuste de Calibração: -{Math.round(task.analysis.monteCarlo.calibrationPenalty * 100)}%
                        </span>
                        <span className="text-[10px] text-amber-500/70 font-medium leading-relaxed">
                          Você está errando sistematicamente a dificuldade nesta matéria. Reduzimos a projeção temporariamente.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function AICoachView({ suggestedFocus, onGenerateGoals, loading, onClearHistory }) {
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('planner');
  const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
  const categories = useMemo(() => {
    const rawCategories = activeContest?.categories;
    return Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
  }, [activeContest?.categories]);
  const safeMaxScore = Number(activeContest?.maxScore) > 0 ? Number(activeContest.maxScore) : 100;
  const coachPlanner = useMemo(() => {
    const raw = activeContest?.coachPlanner || {};
    const normalized = {};
    for (const [key, val] of Object.entries(raw)) {
      normalized[key] = Array.isArray(val) ? val : Object.values(val || {});
    }
    return normalized;
  }, [activeContest?.coachPlanner]);
  const coachPlanRaw = useMemo(() => {
    const raw = activeContest?.coachPlan || [];
    return Array.isArray(raw) ? raw : Object.values(raw || {});
  }, [activeContest?.coachPlan]);
  const systemAlerts = useMemo(() => {
    const alerts = coachPlanRaw.filter(task => isSystemAlertTask(task?.text || task?.title || ''));
    const uniqueAlertsMap = new Map();
    alerts.forEach(alert => {
      const key = alert.categoryId || alert.subjectName || alert.id;
      if (!uniqueAlertsMap.has(key)) {
        uniqueAlertsMap.set(key, alert);
      }
    });
    return Array.from(uniqueAlertsMap.values());
  }, [coachPlanRaw]);
  const actionableTasks = useMemo(
    () => coachPlanRaw.filter(task => !isSystemAlertTask(task?.text || task?.title || '')),
    [coachPlanRaw]
  );
  const coachPlan = actionableTasks;
  const unallocatedCards = useMemo(() => {
    if (!coachPlan || coachPlan.length === 0) return [];
    const allAssignedIds = new Set();
    Object.values(coachPlanner).forEach(dayTasks => {
      (dayTasks || []).forEach(t => {
        const sid = getSafeId(t);
        if (sid) allAssignedIds.add(sid);
      });
    });
    return coachPlan.filter(task => !allAssignedIds.has(getSafeId(task)));
  }, [coachPlan, coachPlanner]);

  // FIX (BUG-16): mapa de localização O(1) para handleStartNeural
  const taskLocationMap = useMemo(() => {
    const map = new Map();
    const register = (tasks, source) => {
      (tasks || []).forEach((t, index) => {
        const id = getSafeId(t);
        if (id && !map.has(id)) map.set(id, { tasks, index, source });
      });
    };
    register(unallocatedCards, 'backlog');
    Object.entries(coachPlanner).forEach(([day, tasks]) => register(tasks, day));
    register(coachPlan, 'plan');
    return map;
  }, [unallocatedCards, coachPlanner, coachPlan]);

  const startNeuralSession = useAppStore(state => state.startNeuralSession);
  const navigate = useNavigate();
  const showToast = useToast();

  // FIX (BUG-08/16): lookup O(1) via taskLocationMap, com fallback por título e isolado
  const handleStartNeural = useCallback((task, sourceContextHint) => {
    const startWith = (tasks, index, source) => {
      const session = (tasks || []).map(t => ({ ...t, sourceContext: source }));
      startNeuralSession(session, index);
      navigate('/pomodoro');
    };

    if (sourceContextHint) {
      const hintTasks = sourceContextHint === 'backlog'
        ? unallocatedCards
        : (coachPlanner[sourceContextHint] || []);
      const hintIndex = hintTasks.findIndex(t => matchesTask(t, task));
      if (hintIndex !== -1) {
        startWith(hintTasks, hintIndex, sourceContextHint);
        return;
      }
    }

    const id = getSafeId(task);
    const found = id ? taskLocationMap.get(id) : null;
    if (found) {
      startWith(found.tasks, found.index, found.source);
      return;
    }

    // fallback por título (quando ids estão ausentes)
    for (const [day, tasks] of Object.entries(coachPlanner)) {
      const idx = (tasks || []).findIndex(t => matchesTask(t, task));
      if (idx !== -1) {
        startWith(tasks, idx, day);
        return;
      }
    }
    const planIdx = coachPlan.findIndex(t => matchesTask(t, task));
    if (planIdx !== -1) {
      startWith(coachPlan, planIdx, 'plan');
      return;
    }

    startNeuralSession([{ ...task, sourceContext: sourceContextHint || 'isolated' }], 0);
    navigate('/pomodoro');
  }, [unallocatedCards, coachPlanner, coachPlan, taskLocationMap, startNeuralSession, navigate]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportComponentAsPDF('ai-coach-container', 'Plano_Execucao_Coach.pdf', 'portrait');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showToast('Erro ao exportar o plano para PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const hasPlan = coachPlan && coachPlan.length > 0;

  return (
    /* PATCH: space-y-6 sm:space-y-10 */
    <div id="ai-coach-container" className="space-y-6 sm:space-y-10 pb-8 sm:pb-12 w-full mx-auto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="flex flex-col gap-6">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-inner relative">
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[60px] -ml-32 -mb-32" />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm">
                <Compass size={24} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Painel Coach AI</h2>
                <p className="text-[10px] text-cyan-400/80 uppercase tracking-[0.25em] font-bold mt-1">
                  Estratégia inteligente com MC
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-0.5 bg-slate-950/80 border border-white/5 rounded-2xl p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('planner')}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'planner' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <LayoutGrid size={14} className="shrink-0" />
                  Planner
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 ${viewMode === 'cards' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/10'}`}
                >
                  <Sparkles size={14} className="shrink-0" />
                  Pendências
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/5 transition disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Export
                </button>
                <button
                  onClick={onClearHistory}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[9px] font-black text-rose-300 uppercase tracking-widest hover:bg-rose-500/10 transition"
                >
                  <Trash2 size={12} />
                  Limpar
                </button>
              </div>
            </div>
          </div>
          <div className="relative z-10 w-full mt-6 pt-6 border-t border-white/[0.05] flex justify-center">
            <button
              onClick={onGenerateGoals}
              disabled={loading}
              className="group relative w-full lg:w-auto px-4 sm:px-8 py-3.5 rounded-2xl font-black text-[11px] sm:text-[12px] tracking-[0.15em] uppercase transition-all duration-75 flex items-center justify-center gap-2 sm:gap-3 border border-white/20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none animate-shimmer" />
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0 drop-shadow-md" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <BrainCircuit size={16} className="shrink-0 drop-shadow-md" />
                  <span>Recalcular Estratégia</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {viewMode === 'cards' && (
          <Motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.05, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="text-indigo-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Foco do Dia</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Sugestões de estudo baseadas em telemetria
                  </p>
                </div>
              </div>
            </div>
            {hasPlan ? (
              unallocatedCards.length === 0 ? (
                <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                  <Target size={32} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                    Nenhum foco pendente fora do planner
                  </p>
                </div>
              ) : (
                // FIX (BUG-12): items-stretch para alturas uniformes
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                  {unallocatedCards.map((task, idx) => (
                    <AICoachCard
                      key={getSafeId(task) || `coach-card-${idx}`}
                      task={task}
                      idx={idx}
                      categories={categories}
                      maxScore={safeMaxScore}
                      onStartPomodoro={handleStartNeural}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="mb-8 sm:mb-12 p-8 sm:p-12 rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.01] text-center">
                <Target size={32} className="text-slate-600 mx-auto mb-4" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">
                  Nenhum foco definido para hoje
                </p>
              </div>
            )}
          </Motion.div>
        )}
        {viewMode === 'planner' && (
          <Motion.div
            key="planner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05, ease: "easeOut" }}
            style={{ transform: "none", filter: "none", willChange: "auto" }}
          >
            <div className="space-y-6 mb-8">
              {suggestedFocus ? (
                <div className="w-full">
                  <AICoachWidget
                    key={suggestedFocus?.id || 'coach-widget'}
                    suggestion={suggestedFocus}
                    onGenerateGoals={onGenerateGoals}
                    loading={loading}
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                  <AlertCircle size={20} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">Nenhum foco sugerido</p>
                  <p className="text-[10px] text-slate-500 mt-1">Recalcule a estratégia após novos simulados.</p>
                </div>
              )}
            </div>
            {systemAlerts.length > 0 && (
              <div className="mb-12 sm:mb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
                {systemAlerts.map((alertTask, idx) => {
                  const parsedAlert = parseCoachTask(alertTask, categories);
                  const cleanText = alertTask.text || alertTask.title || '';
                  const subjectName = parsedAlert.subject;
                  const message = parsedAlert.action || cleanText;
                  let type = 'info';
                  let titlePart = message;
                  let descPart = '';
                  let actionDesc = '';
                  if (/VETOR CRÍTICO/i.test(cleanText)) {
                    type = 'danger';
                    titlePart = "Vetor Crítico";
                    descPart = message.replace(/🚨 VETOR CRÍTICO!?\s*/i, '');
                    actionDesc = "Conclua os focos pendentes desta matéria hoje para frear a queda imediata de rendimento.";
                  } else if (/OSCILAÇÃO/i.test(cleanText)) {
                    type = 'warning';
                    titlePart = "Oscilação Estatística";
                    descPart = message.replace(/🌪️ OSCILAÇÃO ESTATÍSTICA:?\s*/i, '');
                    actionDesc = "Revisite os tópicos sugeridos abaixo para estabilizar sua taxa de acertos.";
                  } else if (/CRUZEIRO SEGURO/i.test(cleanText)) {
                    type = 'success';
                    titlePart = "Cruzeiro Seguro";
                    descPart = message.replace(/🏆 CRUZEIRO SEGURO:?\s*/i, '');
                    actionDesc = "Mantenha a constância atual. Resolva apenas as manutenções leves sugeridas.";
                  }
                  const t = {
                    danger: { bg: 'bg-[#1a0b12]', border: 'border-rose-500/20', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', titleColor: 'text-rose-100', descColor: 'text-rose-200/70', badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-300', verdictBg: 'bg-rose-500/5 text-rose-400', glowColor: 'bg-rose-600', Icon: AlertCircle, isCritical: true },
                    warning: { bg: 'bg-[#171109]', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', titleColor: 'text-amber-100', descColor: 'text-amber-200/70', badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300', verdictBg: 'bg-amber-500/5 text-amber-400', glowColor: 'bg-amber-600', Icon: Activity, isCritical: false },
                    success: { bg: 'bg-[#06140e]', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', titleColor: 'text-emerald-100', descColor: 'text-emerald-200/70', badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', verdictBg: 'bg-emerald-500/5 text-emerald-400', glowColor: 'bg-emerald-600', Icon: Trophy, isCritical: false },
                    info: { bg: 'bg-slate-900/50', border: 'border-slate-500/20', iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400', titleColor: 'text-slate-100', descColor: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-300', verdictBg: 'bg-slate-500/5 text-slate-400', glowColor: 'bg-slate-600', Icon: AlertCircle, isCritical: false }
                  }[type];
                  // FIX (BUG-05): parse seguro de volatilidade (regex podia gerar NaN)
                  const safeVolatilityDisplay = (() => {
                    const raw = alertTask.analysis?.monteCarlo?.volatility;
                    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? 0).replace(/[^\d.-]/g, ''));
                    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
                  })();
                  return (
                    /* PATCH: key estável */
                    <div key={alertTask?.id || `sys-alert-${alertTask?.categoryId || 'cat'}-${idx}`} className={`relative overflow-hidden p-5 rounded-3xl border flex flex-col gap-4 shadow-xl ${t.bg} ${t.border}`}>
                      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[70px] pointer-events-none opacity-[0.15] ${t.glowColor}`} />
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${t.iconBg} ${t.border} ${t.iconColor}`}>
                          <t.Icon size={24} className={t.isCritical ? "animate-pulse" : ""} />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${t.badgeBg}`}>
                              {subjectName}
                            </span>
                            {t.isCritical && (
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                                Intervenção Exigida
                              </span>
                            )}
                          </div>
                          <span className={`text-sm sm:text-base font-black tracking-tight leading-snug uppercase ${t.titleColor}`}>
                            {titlePart}
                          </span>
                          <span className={`text-xs font-medium leading-relaxed ${t.descColor}`}>
                            {descPart}
                          </span>
                          {alertTask.analysis?.monteCarlo && (
                            <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                              <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                <Target size={12} className={t.iconColor} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  Projeção Base:{' '}
                                  <span className="text-white ml-1">
                                    {Math.round(getMcProbPct(alertTask))}%
                                  </span>
                                </span>
                              </div>
                              <div className={`px-2 py-1.5 rounded-lg border ${t.border} bg-black/20 flex items-center gap-1.5`}>
                                <Activity size={12} className={t.iconColor} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  Volatilidade:{' '}
                                  <span className="text-white ml-1">
                                    {safeVolatilityDisplay}
                                  </span>
                                </span>
                              </div>
                              {alertTask.analysis.monteCarlo.calibrationPenalty > 0.01 && (
                                <div className="px-2 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-1.5">
                                  <Zap size={12} className="text-amber-400" />
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                    Penalidade: <span className="text-amber-400 ml-1">-{Math.round(alertTask.analysis.monteCarlo.calibrationPenalty * 100)}%</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {alertTask.analysis?.verdict && (
                            <div className="flex flex-col gap-2 mt-2">
                              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-bold ${t.verdictBg} ${t.border}`}>
                                <BrainCircuit size={14} className="shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{alertTask.analysis.verdict}</span>
                              </div>
                              <div className="pt-3 pb-1.5 border-t border-white/10 mt-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 block mb-1">
                                  Ação Sugerida
                                </span>
                                <p className={`text-xs font-bold leading-relaxed ${t.titleColor} opacity-95 pl-0.5`}>{actionDesc}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <AICoachPlanner plannerData={coachPlanner} categories={categories} onStartPomodoro={handleStartNeural} />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

## `src/llm/coachLLMIntegration.js`

```javascript
/**
 * coachLLMIntegration.js
 *
 * Lote 6 — Integração opcional do mini-LLM com funções síncronas do Coach.
 *
 * Como o Coach principal é síncrono, esta camada cria wrappers assíncronos.
 */
import { getSuggestedFocus } from '../utils/coachLogic.js';
import { enhanceCoachResultWithLLM } from './explanationAgent.js';

/**
 * Wrapper assíncrono de getSuggestedFocus com explicação LLM.
 *
 * FIX: try/catch no motor síncrono (evita unhandled rejection) e
 * degradação graciosa se o LLM falhar (retorna focus sem enhancement).
 */
export async function getSuggestedFocusWithLLM(
  categories,
  simulados,
  studyLogs = [],
  options = {}
) {
  // FIX: getSuggestedFocus é síncrono e pode lançar — proteger
  let focus = null;
  try {
    focus = getSuggestedFocus(categories, simulados, studyLogs, options);
  } catch (err) {
    console.warn('[CoachLLM] getSuggestedFocus failed:', err);
    return null;
  }

  if (!focus) return null;

  // FIX: só enhance se urgency for um objeto válido
  if (!focus.urgency || typeof focus.urgency !== 'object') return focus;

  try {
    const enhancedUrgency = await enhanceCoachResultWithLLM(focus.urgency, {
      ...options,
      context: {
        categoryName: focus.name || focus.categoryName || null,
        maxScore: options.maxScore,
        targetScore: options.targetScore,
        ...(options.context || {}),
      },
    });

    // FIX: se o enhancement retornar algo inválido, mantém o original
    if (!enhancedUrgency || typeof enhancedUrgency !== 'object') {
      return focus;
    }

    return {
      ...focus,
      urgency: enhancedUrgency,
    };
  } catch (err) {
    // FIX: LLM é opcional — nunca quebrar o Coach por causa dele
    console.warn('[CoachLLM] enhanceCoachResultWithLLM failed:', err);
    return focus;
  }
}

/**
 * Wrapper simples para explicar qualquer resultado do calculateUrgency.
 *
 * FIX: valida input e degrada graciosamente (retorna o input se falhar).
 */
export async function explainUrgencyResult(urgencyResult, options = {}) {
  if (!urgencyResult || typeof urgencyResult !== 'object') {
    return urgencyResult ?? null;
  }
  try {
    const enhanced = await enhanceCoachResultWithLLM(urgencyResult, options);
    return enhanced && typeof enhanced === 'object' ? enhanced : urgencyResult;
  } catch (err) {
    console.warn('[CoachLLM] explainUrgencyResult failed:', err);
    return urgencyResult;
  }
}

export default {
  getSuggestedFocusWithLLM,
  explainUrgencyResult,
};

```

## `src/utils/coachCausal.js`

```javascript
/**
 * coachCausal.js
 *
 * Lote 11 — Facade de Causal Uplift & Policy Engine.
 */
import { getSafeScore } from './scoreHelper.js';
import { normalizeDate } from './dateHelper.js';
import { isSubjectMatch } from './normalization.js';
import {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
} from '../engine/causal/upliftModel.js';
import {
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
} from '../engine/causal/policyEngine.js';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function toTime(value) {
  const date = normalizeDate(value);
  return date && Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

// FIX: tolerância de 1 dia para datas "no futuro" (fuso horário / relógio errado).
// Qualquer timestamp além disso é tratado como dado corrompido e descartado.
const MAX_FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;
function isReasonableTime(t) {
  return Number.isFinite(t) && t <= Date.now() + MAX_FUTURE_TOLERANCE_MS;
}

function rollingSd(values, windowSize = 5) {
  const safeValues = safeArray(values)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (safeValues.length < 2) return 0;
  const window = safeValues.slice(-windowSize);
  const mean = window.reduce((acc, val) => acc + val, 0) / window.length;
  const variance =
    window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    Math.max(1, window.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Constrói eventos causais baseados em volume de estudo entre simulados.
 */
export function buildStudyVolumeCausalEvents(simulados = [], studyLogs = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const minTreatmentMinutes = Number(options.minTreatmentMinutes) || 60;
  const categoryId = options.categoryId || null;
  const categoryName = options.categoryName || null;

  const safeSimulados = safeArray(simulados)
    .filter((simulado) => {
      if (!categoryName) return true;
      return isSubjectMatch(simulado?.subject || '', categoryName);
    })
    .map((simulado, index) => {
      const time = toTime(simulado?.date ?? simulado?.createdAt);
      const score = getSafeScore(simulado, maxScore);
      return {
        index,
        time,
        score,
        simulado,
      };
    })
    // FIX: descarta timestamps inválidos OU no futuro além da tolerância
    .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.score) && isReasonableTime(entry.time))
    .sort((a, b) => a.time - b.time);

  const safeLogs = safeArray(studyLogs)
    .filter((log) => {
      if (!categoryId) return true;
      return log?.categoryId === categoryId;
    })
    .map((log) => ({
      time: toTime(log?.date ?? log?.createdAt),
      minutes: Math.min(720, Math.max(0, Number(log?.minutes) || 0)),
    }))
    // FIX: descarta logs com timestamp inválido/futuro
    .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time));

  const events = [];
  const scores = safeSimulados.map((entry) => entry.score);

  for (let i = 1; i < safeSimulados.length; i++) {
    const prev = safeSimulados[i - 1];
    const curr = safeSimulados[i];
    if (curr.time <= prev.time) continue;

    const outcomeDelta = curr.score - prev.score;
    const baselineScore = prev.score;
    const daysSince = (curr.time - prev.time) / 86400000;

    const intervalLogs = safeLogs.filter(
      (log) => log.time > prev.time && log.time <= curr.time
    );
    const totalMinutes = intervalLogs.reduce(
      (acc, log) => acc + log.minutes,
      0
    );
    const treated = totalMinutes >= minTreatmentMinutes ? 1 : 0;
    const volatility = rollingSd(scores.slice(0, i), 5);

    events.push({
      id: `study-volume-${prev.index}-${curr.index}`,
      timestamp: curr.time,
      treated,
      outcomeDelta,
      baselineScore,
      volatility,
      daysSince,
      weight: Number(options.weight) || 5,
      uncertainty: 0.4,
      actionType: treated ? 'study_volume' : 'no_study_volume',
    });
  }

  return events;
}

/**
 * Constrói eventos causais baseados em tarefas concluídas.
 */
export function buildTaskCausalEvents(categories = [], simulados = [], options = {}) {
  const maxScore = Number(options.maxScore) > 0 ? Number(options.maxScore) : 100;
  const maxHorizonDays = Number(options.maxHorizonDays) || 45;
  const safeCategories = safeArray(categories);
  const events = [];

  safeCategories.forEach((category) => {
    const categoryName = category?.name || '';
    const categoryId = category?.id || categoryName || 'unknown';

    const categorySimulados = safeArray(simulados)
      .filter((simulado) => isSubjectMatch(simulado?.subject || '', categoryName))
      .map((simulado, index) => {
        const time = toTime(simulado?.date ?? simulado?.createdAt);
        const score = getSafeScore(simulado, maxScore);
        return {
          index,
          time,
          score,
          simulado,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.score) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    if (categorySimulados.length < 2) return;

    const tasks = safeArray(category?.tasks).filter((task) => {
      return Boolean(task?.completed);
    });

    const taskTimes = tasks
      .map((task) => {
        const time = toTime(task?.lastStudiedAt ?? task?.completedAt);
        return {
          task,
          time,
        };
      })
      // FIX: descarta timestamps inválidos/futuros
      .filter((entry) => Number.isFinite(entry.time) && isReasonableTime(entry.time))
      .sort((a, b) => a.time - b.time);

    const scores = categorySimulados.map((entry) => entry.score);

    // Eventos tratados: tarefa concluída entre dois simulados.
    taskTimes.forEach(({ task, time }, taskIndex) => {
      let prevSim = null;
      let nextSim = null;

      for (const sim of categorySimulados) {
        if (sim.time <= time) {
          prevSim = sim;
        }
      }
      for (const sim of categorySimulados) {
        if (sim.time > time) {
          nextSim = sim;
          break;
        }
      }

      if (!prevSim || !nextSim) return;

      const horizonDays = (nextSim.time - prevSim.time) / 86400000;
      if (horizonDays > maxHorizonDays) return;

      const outcomeDelta = nextSim.score - prevSim.score;
      const baselineScore = prevSim.score;
      const daysSince = (time - prevSim.time) / 86400000;
      const volatility = rollingSd(scores.slice(0, prevSim.index + 1), 5);

      events.push({
        id: `task-${categoryId}-${task?.id || taskIndex}`,
        timestamp: nextSim.time,
        treated: 1,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: 0.45,
        actionType: inferActionType(task?.text || task?.topicName || ''),
      });
    });

    // ✅ PATCH-23: Limitar eventos controle para evitar desbalanceamento
    const MAX_CONTROL_EVENTS_PER_CATEGORY = 5;
    let controlCount = 0;

    for (let i = 1; i < categorySimulados.length && controlCount < MAX_CONTROL_EVENTS_PER_CATEGORY; i++) {
      const prev = categorySimulados[i - 1];
      const curr = categorySimulados[i];

      const hasTaskInInterval = taskTimes.some(
        ({ time }) => time > prev.time && time <= curr.time
      );
      if (hasTaskInInterval) continue;

      controlCount++;

      const outcomeDelta = curr.score - prev.score;
      const baselineScore = prev.score;
      const daysSince = (curr.time - prev.time) / 86400000;
      const volatility = rollingSd(scores.slice(0, i), 5);

      events.push({
        id: `no-task-${categoryId}-${prev.index}-${curr.index}`,
        timestamp: curr.time,
        treated: 0,
        outcomeDelta,
        baselineScore,
        volatility,
        daysSince,
        weight: Number(category?.weight) || 5,
        uncertainty: 0.5,
        actionType: 'no_task',
      });
    }
  });

  return events;
}

/**
 * Combina eventos de tarefas e volume de estudo.
 */
export function buildCausalEventsFromHistory(
  categories = [],
  simulados = [],
  studyLogs = [],
  options = {}
) {
  const taskEvents = buildTaskCausalEvents(categories, simulados, options);
  const volumeEvents = buildStudyVolumeCausalEvents(simulados, studyLogs, {
    ...options,
    categoryName: options.categoryName || null,
    categoryId: options.categoryId || null,
  });

  // ✅ FIX: Validar eventos antes de combinar
  const safeTaskEvents = Array.isArray(taskEvents) ? taskEvents : [];
  const safeVolumeEvents = Array.isArray(volumeEvents) ? volumeEvents : [];
  const combined = [...safeTaskEvents, ...safeVolumeEvents];

  return prepareCausalEvents(combined, options);
}

/**
 * Treina modelo causal e salva localmente.
 */
export function trainCausalModel(events = [], options = {}) {
  const safeEvents = prepareCausalEvents(events, options);

  const estimates = estimateUpliftByAction(safeEvents, {
    method: options.method || 'auto',
    maxScore: options.maxScore ?? 100,
    bootstrapIterations:
      options.useBootstrap === true
        ? options.bootstrapIterations ?? 100
        : 0,
    covariates: options.covariates,
    minSamplesPerAction: options.minSamplesPerAction,
  });

  const model = {
    generatedAt: Date.now(),
    maxScore: options.maxScore ?? 100,
    method: options.method || 'auto',
    sampleSize: safeEvents.length,
    global: estimates.global,
    actions: estimates.actions,
    actionCounts: estimates.actionCounts,
  };

  if (options.save !== false) {
    saveCausalModel(model);
  }

  return model;
}

/**
 * Executa um ciclo completo: eventos → modelo → política.
 */
export function runCausalPolicyCycle(input = {}) {
  const categories = safeArray(input.categories);
  const simulados = safeArray(input.simulados);
  const studyLogs = safeArray(input.studyLogs);

  const events = Array.isArray(input.events)
    ? prepareCausalEvents(input.events, input.options || {})
    : buildCausalEventsFromHistory(categories, simulados, studyLogs, input.options || {});

  const model =
    input.model && typeof input.model === 'object'
      ? input.model
      : trainCausalModel(events, input.options || {});

  const category = input.category || categories[0] || null;
  const topics = input.topics || [];

  let candidates = candidatesFromWeakTopics(topics, category || {}, input.options || {});
  candidates = addSystemActionCandidates(candidates, input.metrics || {}, {
    categoryId: category?.id || null,
    categoryName: category?.name || null,
  });

  const selectedActions = selectPersonalizedActions(candidates, model, {
    maxScore: input.options?.maxScore ?? 100,
    topK: input.options?.topK ?? 5,
    healthStatus: input.health?.status || null,
    causalWeight: input.options?.causalWeight ?? 0.35,
  });

  const report = buildPolicyReport(selectedActions, model, {
    maxScore: input.options?.maxScore ?? 100,
    healthStatus: input.health?.status || null,
  });

  return {
    eventsCount: events.length,
    model,
    candidates,
    selectedActions,
    report,
  };
}

/**
 * Reordena tarefas do Coach usando política causal.
 */
export function rerankCoachTasksWithCausalPolicy(tasks = [], causalModel = null, options = {}) {
  const safeTasks = safeArray(tasks);
  if (safeTasks.length === 0) return [];

  const priorityToUtility = (priority) => {
    if (priority === 'high') return 85;
    if (priority === 'medium') return 55;
    return 25;
  };

  const candidates = safeTasks.map((task, index) => {
    const actionType = inferActionType(task?.text || task?.topicName || '');
    return {
      id: task?.id || task?.text || `task-${index}`,
      type: actionType,
      name: task?.text || task?.topicName || `Tarefa ${index + 1}`,
      categoryId: task?.categoryId || null,
      categoryName: task?.catName || task?.category || null,
      decisionUtility: priorityToUtility(task?.priority),
      features: {
        priority: task?.priority || 'medium',
        costMinutes: Number(task?.estimatedMinutes || task?.minutes || 30),
      },
      originalTask: task,
    };
  });

  const ranked = selectPersonalizedActions(candidates, causalModel, {
    maxScore: options.maxScore ?? 100,
    topK: safeTasks.length,
    healthStatus: options.healthStatus || null,
    causalWeight: options.causalWeight ?? 0.35,
  });

  // ✅ FIX: Validar ranked antes de criar orderMap
  const safeRanked = Array.isArray(ranked) ? ranked : [];
  const orderMap = new Map();
  safeRanked.forEach((candidate, index) => {
    if (candidate && candidate.id) {
      orderMap.set(candidate.id, index);
    }
  });

  // FIX (BUG-41): tarefas NÃO mapeadas pelo modelo causal mantêm sua ordem
  // original relativa (posicionadas após as ranqueadas), em vez do fallback
  // arbitrário 9999 — que era instável e quebrava com muitas tarefas.
  return [...safeTasks]
    .map((task, originalIndex) => ({
      task,
      sortKey:
        orderMap.get(task?.id || task?.text || '') ??
        (safeRanked.length + originalIndex),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((item) => item.task);
}

export {
  prepareCausalEvents,
  estimateUpliftByAction,
  saveCausalModel,
  loadCausalModel,
  clearCausalModel,
  inferActionType,
  candidatesFromWeakTopics,
  addSystemActionCandidates,
  selectPersonalizedActions,
  buildPolicyReport,
};

export default {
  buildStudyVolumeCausalEvents,
  buildTaskCausalEvents,
  buildCausalEventsFromHistory,
  trainCausalModel,
  runCausalPolicyCycle,
  rerankCoachTasksWithCausalPolicy,
};

```

