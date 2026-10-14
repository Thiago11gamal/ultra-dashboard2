import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { aggregateHeatmap } from '../../utils/heatmapAggregation.js';

// ✅ FIX: Worker singleton compartilhado entre todas as instâncias
let sharedWorker = null;
let sharedWorkerRefCount = 0;
let terminateTimer = null;

function getSharedWorker() {
  if (terminateTimer) { clearTimeout(terminateTimer); terminateTimer = null; }
  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(
        new URL('../../engine/heatmap.worker.js', import.meta.url),
        { type: 'module' }
      );
    } catch (e) {
      console.warn("[EvolutionHeatmap] Web Worker not available:", e);
      return null;
    }
  }
  sharedWorkerRefCount++;
  return sharedWorker;
}

function releaseSharedWorker() {
  sharedWorkerRefCount--;
  if (sharedWorkerRefCount < 0) sharedWorkerRefCount = 0;
  if (sharedWorkerRefCount === 0 && sharedWorker) {
    terminateTimer = setTimeout(() => {
      if (sharedWorkerRefCount === 0 && sharedWorker) {
        sharedWorker.terminate();
        sharedWorker = null;
      }
    }, 100);
  }
}

function invalidateSharedWorker(badWorker) {
  if (sharedWorker && sharedWorker === badWorker) {
    try { sharedWorker.terminate(); } catch { /* ignore */ }
    sharedWorker = null;
    sharedWorkerRefCount = 0;
  }
}

export const EvolutionHeatmap = ({ 
    heatmapData, 
    targetScore = 70, 
    showOnlyFocus, 
    focusSubjectId, 
    maxScore = 100, 
    minScore = 0 
}) => {
    const { dates = [], rows = [] } = heatmapData || {};
    
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const range = Math.max(1e-9, safeMax - safeMin);
    
    const safeTarget = Number.isFinite(Number(targetScore)) ? Number(targetScore) : safeMin;
    
    const targetScorePct = Math.max(
      0,
      Math.min(100, ((safeTarget - safeMin) / range) * 100)
    );

    // 🎯 FILTRO DE FOCO: Aplica o filtro de "Todas as Matérias" vs "Apenas Foco"
    const filteredRowsByFocus = useMemo(() => {
        if (!showOnlyFocus || !focusSubjectId) return rows;
        return rows.filter(row => row.cat?.id === focusSubjectId);
    }, [rows, showOnlyFocus, focusSubjectId]);

    const [windowSize, setWindowSize] = useState('all');
    const [granularity, setGranularity] = useState('daily');
    const [hoveredCell, setHoveredCell] = useState(null);

    useEffect(() => {
        const handleScroll = () => {
            setHoveredCell(null);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const filtered = useMemo(() => {
        if (!Array.isArray(dates) || !Array.isArray(filteredRowsByFocus)) return { dates: [], rows: [] };
        const size = windowSize === 'all' ? dates.length : Number(windowSize);
        const safeSize = Number.isFinite(size) ? Math.max(1, size) : dates.length;
        const start = Math.max(0, dates.length - safeSize);

        return {
            dates: dates.slice(start),
            rows: filteredRowsByFocus.map((row) => ({
                ...row,
                cells: Array.isArray(row.cells) ? row.cells.slice(start) : []
            }))
        };
    }, [dates, filteredRowsByFocus, windowSize]);

    const [aggregated, setAggregated] = useState(() => {
        return aggregateHeatmap(filtered, granularity, safeMax, safeMin);
    });
    const [isAggregating, setIsAggregating] = useState(false);
    const workerRef = useRef(null);
    const didAcquireWorker = useRef(false);

    useEffect(() => {
        const worker = getSharedWorker();
        workerRef.current = worker;
        didAcquireWorker.current = worker !== null;
        
        return () => {
            if (didAcquireWorker.current) releaseSharedWorker();
            workerRef.current = null;
            didAcquireWorker.current = false;
        };
    }, []);

    useEffect(() => {
        const worker = workerRef.current;
        if (!worker) {
            setAggregated(aggregateHeatmap(filtered, granularity, safeMax, safeMin));
            setIsAggregating(false);
            return;
        }

        const msgId = `${Date.now()}_${Math.random()}`;
        setIsAggregating(true);

        const handleMessage = (e) => {
            if (e.data?.id !== msgId) return;

            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);

            if (e.data.type === 'success') {
                setAggregated(e.data.result);
            } else {
                setAggregated(aggregateHeatmap(filtered, granularity, safeMax, safeMin));
            }
            setIsAggregating(false);
        };

        const handleError = (err) => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            invalidateSharedWorker(worker);
            workerRef.current = null;
            console.warn('[EvolutionHeatmap] Worker error, falling back:', err);
            setAggregated(aggregateHeatmap(filtered, granularity, safeMax, safeMin));
            setIsAggregating(false);
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({
          id: msgId,
          payload: {
            filtered,
            granularity,
            targetScore: safeTarget,
            targetScorePct,
            minScore: safeMin,
            maxScore: safeMax
          }
        });

        return () => {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            setIsAggregating(false);
        };
    }, [filtered, granularity, safeTarget, targetScorePct, safeMin, safeMax]);

    const filteredDates = aggregated.dates || [];
    const filteredRows = aggregated.rows || [];

    const maxCellTotal = useMemo(() => {
        const totals = filteredRows
            .flatMap((row) => (Array.isArray(row?.cells) ? row.cells : []))
            .map((cell) => Number(cell?.total) || 0);
        return totals.length > 0 ? totals.reduce((m, v) => Math.max(m, v), 1) : 1;
    }, [filteredRows]);

    const cellColor = (pct, total = 0) => {
      if (pct == null || !Number.isFinite(Number(pct))) {
        return {
          bg: 'rgba(255,255,255,0.02)',
          text: '#64748b',
          border: '#1e293b',
          density: 0
        };
      }
    
      const safePct = Number(pct);
      const safeTotal = Number.isFinite(Number(total)) ? Math.max(0, Number(total)) : 0;
      const density = maxCellTotal > 0 ? Math.min(1, safeTotal / maxCellTotal) : 0;
    
      if (safePct >= targetScorePct) {
        return {
          bg: 'rgba(34,197,94,0.45)',
          text: '#4ade80',
          border: 'rgba(34,197,94,0.6)',
          density
        };
      }
    
      if (safePct >= targetScorePct * 0.8) {
        return {
          bg: 'rgba(251,191,36,0.4)',
          text: '#fcd34d',
          border: 'rgba(251,191,36,0.6)',
          density
        };
      }
    
      if (safePct >= targetScorePct * 0.6) {
        return {
          bg: 'rgba(251,146,60,0.4)',
          text: '#fb923c',
          border: 'rgba(251,146,60,0.6)',
          density
        };
      }
    
      return {
        bg: 'rgba(239,68,68,0.4)',
        text: '#f87171',
        border: 'rgba(239,68,68,0.6)',
        density
      };
    };

    const formatPct = (value) => {
        if (!Number.isFinite(value)) return '—';
        const rounded = Number(value.toFixed(2));
        return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`;
    };

    if (!filteredDates.length) return (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            {isAggregating ? (
                <span className="flex items-center gap-2 animate-pulse text-indigo-400">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    Processando volume de dados...
                </span>
            ) : "Nenhum dado encontrado."}
        </div>
    );

    const targetFmt = `${Math.round(targetScorePct)}%`;
    const t60Fmt = `${Math.round(targetScorePct * 0.6)}%`;
    const t80Fmt = `${Math.round(targetScorePct * 0.8)}%`;

    return (
        <div className="w-full min-h-[240px] rounded-2xl border border-slate-800/80 bg-slate-950 p-4 sm:p-5 shadow-[0_18px_45px_rgba(2,6,23,0.5)]">
            <div className="flex flex-wrap items-center gap-3.5 mb-5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-lg p-1.5 mr-2 shadow-sm">
                    {[{ label: '4 sem', value: '28' }, { label: '8 sem', value: '56' }, { label: '12 sem', value: '84' }, { label: 'Tudo', value: 'all' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setWindowSize(opt.value)}
                            aria-label={`Filtrar janela ${opt.label}`}
                            aria-pressed={windowSize === opt.value}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${windowSize === opt.value ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-950/75 border border-slate-700/80 rounded-lg p-1.5 mr-2 shadow-sm">
                    {[{ label: 'Diário', value: 'daily' }, { label: 'Semanal', value: 'weekly' }, { label: 'Mensal', value: 'monthly' }].map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setGranularity(opt.value)}
                            aria-label={`Selecionar granularidade ${opt.label}`}
                            aria-pressed={granularity === opt.value}
                            className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${granularity === opt.value ? 'bg-cyan-500/30 text-cyan-100 border border-cyan-400/40' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {[
                    { bg: 'rgba(239,68,68,0.3)', border: 'rgba(239,68,68,0.5)', label: `< ${t60Fmt}` },
                    { bg: 'rgba(251,146,60,0.3)', border: 'rgba(251,146,60,0.5)', label: `${t60Fmt}–${t80Fmt}` },
                    { bg: 'rgba(251,191,36,0.3)', border: 'rgba(251,191,36,0.5)', label: `${t80Fmt}–${targetFmt}` },
                    { bg: 'rgba(34,197,94,0.3)', border: 'rgba(34,197,94,0.5)', label: `≥ ${targetFmt} ✓ meta` },
                ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                        {item.label}
                    </span>
                ))}
            </div>
            {granularity !== 'daily' && (
                <p className="text-[10px] text-cyan-200/90 font-bold uppercase tracking-wider mb-3.5">
                    Modo agregado ({granularity === 'weekly' ? 'semanal' : 'mensal'}): cada célula representa vários dias.
                </p>
            )}

            <div className="mb-4 rounded-xl border border-white/5 bg-black/20 p-2.5 text-[10px] text-slate-400">
                Leitura rápida: verde = acima da meta; amarelo/laranja = atenção; vermelho = risco; vazio = sem simulado cadastrado.
            </div>

            {/* VIS-FIX: Container com scroll horizontal dedicado, sem padding lateral para o sticky fixar perfeitamente em x=0 */}
            <div 
                className="w-full overflow-x-auto overflow-y-visible custom-scrollbar pt-2 pb-4"
                onScroll={() => {
                    if (hoveredCell) {
                        if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
                        scrollDebounceRef.current = setTimeout(() => setHoveredCell(null), 100);
                    }
                }}
            >
                <div style={{ minWidth: `${filteredDates.length * 72 + 260}px` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `260px repeat(${filteredDates.length}, 68px)`, gap: '4px' }} className="mb-3">
                        <div 
                            className="sticky left-0 z-30 w-[260px] min-w-[260px] max-w-[260px] self-stretch flex items-center px-3.5 bg-slate-950 border-r border-slate-800/80 shadow-[4px_0_12px_rgba(0,0,0,0.8)]" 
                            style={{ backgroundColor: '#020617' }}
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Disciplina</span>
                        </div>
                        {filteredDates.map(d => (
                            <div key={d.key} className="flex flex-col items-center gap-1">
                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${d.isWeekend ? 'text-purple-300' : 'text-slate-400'}`}>
                                    {d.dayName}
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-100">{d.label}</span>
                                {Number.isFinite(Number(d.count)) && Number(d.count) > 1 && (
                                    <span className="text-[8px] text-slate-500">{d.count}d</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2.5">
                        {filteredRows.map(({ cat, cells }) => (
                            <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: `260px repeat(${filteredDates.length}, 68px)`, gap: '4px', alignItems: 'center' }}>
                                {/* VIS-FIX: Coluna da matéria 100% opaca, largura fixa de 260px, z-30 e shadow para nada de trás transparecer */}
                                <div 
                                    className="sticky left-0 z-30 w-[260px] min-w-[260px] max-w-[260px] self-stretch flex items-center gap-2.5 px-3 bg-slate-950 border-r border-slate-800/80 shadow-[4px_0_12px_rgba(0,0,0,0.8)]"
                                    style={{ backgroundColor: '#020617' }}
                                >
                                    <span className="text-lg shrink-0">{cat.icon}</span>
                                    <span 
                                        className="text-[12px] sm:text-[13px] font-extrabold leading-tight capitalize min-w-0 line-clamp-2 select-none" 
                                        style={{ color: cat.color }} 
                                        title={cat.name}
                                    >
                                        {cat.name}
                                    </span>
                                </div>

                                {cells.map((cell, ci) => {
                                    const hasData = Boolean(cell && Number(cell.total) > 0 && cell.pct !== null);
                                    const col = cellColor(hasData ? cell.pct : null, hasData ? cell.total : 0);
                                    return (
                                        <div
                                            key={ci}
                                            className={`relative rounded-lg flex flex-col items-center justify-center py-2.5 px-1 transition-all duration-200 ${hasData ? 'hover:scale-[1.03] hover:z-20 cursor-default shadow-[0_6px_16px_rgba(2,6,23,0.22)] hover:shadow-[0_10px_24px_rgba(2,6,23,0.4)]' : 'opacity-60 cursor-default'}`}
                                            style={{
                                                background: col.bg,
                                                opacity: hasData ? (0.85 + (col.density * 0.15)) : 0.6,
                                                border: `1px solid ${col.border}`,
                                                minHeight: '52px',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!hasData) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const isAbove = rect.top > 160;
                                                const centerX = rect.left + rect.width / 2;
                                                const left = Math.max(85, Math.min(window.innerWidth - 85, centerX));
                                                setHoveredCell({
                                                    rect,
                                                    isAbove,
                                                    left,
                                                    cell,
                                                    col,
                                                    date: filteredDates[ci],
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        >
                                            {hasData ? (
                                                <>
                                                    <span className="text-[13px] sm:text-[14px] font-black leading-none tabular-nums drop-shadow-[0_0_6px_rgba(15,23,42,0.65)]" style={{ color: col.text }}>
                                                        {formatPct(cell.pct)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-300/80 font-mono mt-1">
                                                        {Math.round(cell.correct)}/{Math.round(cell.total)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-500 text-[13px] font-bold">—</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Portal Tooltip: Flutua sobre tudo via body, impossível de cortar no topo, bordas ou coluna fixa */}
            {typeof document !== 'undefined' && hoveredCell && createPortal(
                <div 
                    className="fixed z-[99999] pointer-events-none flex flex-col items-center bg-slate-950/95 backdrop-blur-md border border-slate-600 rounded-xl p-3 min-w-[140px] shadow-[0_20px_50px_rgba(0,0,0,0.95)] whitespace-nowrap text-center border-l-4 transition-transform duration-75 ease-out"
                    style={{
                        top: hoveredCell.isAbove ? `${hoveredCell.rect.top - 8}px` : `${hoveredCell.rect.bottom + 8}px`,
                        left: `${hoveredCell.left}px`,
                        transform: hoveredCell.isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                        borderLeftColor: hoveredCell.col.text,
                    }}
                >
                    <span className="text-[10px] text-slate-200 font-black uppercase tracking-[0.15em] mb-1.5 pb-1.5 border-b border-slate-800 w-full">
                        {hoveredCell.date ? `${hoveredCell.date.dayName} • ${hoveredCell.date.label}` : ''}
                    </span>
                    {Number.isFinite(Number(hoveredCell.date?.count)) && Number(hoveredCell.date.count) > 1 && (
                        <span className="text-[9px] text-cyan-400 font-bold mb-1.5">
                            Janela: {hoveredCell.date.count} dias
                        </span>
                    )}
                    <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 w-full mb-1.5">
                        <span className="text-[17px] font-black leading-none mb-1 drop-shadow-[0_0_8px_rgba(0,0,0,1)]" style={{ color: hoveredCell.col.text }}>
                            {formatPct(hoveredCell.cell.pct)}
                        </span>
                        <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest">Desempenho</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-white font-mono">
                        <span className="font-black px-1.5 py-0.5 rounded-md bg-black" style={{ color: hoveredCell.col.text }}>{Math.round(hoveredCell.cell.correct)}</span>
                        <span className="text-slate-500 font-bold">/</span>
                        <span className="font-bold">{Math.round(hoveredCell.cell.total)} <small className="text-[8px] text-slate-400">Q</small></span>
                    </div>
                    <div className="mt-1 text-[8px] text-slate-500 font-black uppercase tracking-tighter">
                        Densidade: {Math.round((hoveredCell.col.density || 0) * 100)}%
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

