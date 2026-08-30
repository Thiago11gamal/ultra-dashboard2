# src\components\ActivityHeatmap.jsx

```jsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { normalizeDate, formatDuration, getDateKey } from '../utils/dateHelper';

// FIX 5.5a: Definir cores como constantes reutilizáveis
const HEATMAP_COLORS = {
    empty: 'bg-slate-800/40 border-white/5',
    level1: 'bg-emerald-900/40 border-emerald-800/50',
    level2: 'bg-emerald-600/50 border-emerald-500/50',
    level3: 'bg-emerald-500/80 border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    level4: 'bg-emerald-400 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)] font-bold text-emerald-900',
};

const getLevelColor = (level) => {
    switch (level) {
        case 0: return HEATMAP_COLORS.empty;
        case 1: return HEATMAP_COLORS.level1;
        case 2: return HEATMAP_COLORS.level2;
        case 3: return HEATMAP_COLORS.level3;
        case 4: return HEATMAP_COLORS.level4;
        default: return HEATMAP_COLORS.empty;
    }
};

// FIX 5.5b: Componente de tooltip acessível
const HeatmapTooltip = ({ day, visible, position }) => {
    if (!visible || !day) return null;
    
    const minutes = day.minutes || 0;
    const sessions = day.sessions || 0;
    const dateStr = day.date ? format(day.date, "dd 'de' MMMM (EEEE)", { locale: ptBR }) : '';
    
    return (
        <div 
            className={`absolute ${position} z-50 pointer-events-none transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            role="tooltip"
            aria-hidden={!visible}
        >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl min-w-[140px] text-center">
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-white/10 rotate-45"></div>
                <p className="relative z-10 text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-widest">{dateStr}</p>
                <p className="relative z-10 text-sm font-black text-white">
                    {minutes > 0 ? (
                        <span className="text-emerald-400">{formatDuration(minutes / 60)}</span>
                    ) : 'Descanso'}
                </p>
                {sessions > 0 && (
                    <p className="relative z-10 text-[10px] text-slate-400 mt-1">{sessions} {sessions === 1 ? 'sessão' : 'sessões'}</p>
                )}
            </div>
        </div>
    );
};

// FIX 5.5c: Célula acessível com navegação por teclado
const HeatmapCell = ({ day, index, onFocus, onBlur, tooltipVisible, onTooltipToggle, dayIndex }) => {
    const cellRef = useRef(null);
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTooltipToggle(day, index);
        }
        if (e.key === 'Escape') {
            onTooltipToggle(null, null);
        }
    };
    
    // Calcula posição do tooltip para não cortar nas bordas
    const tooltipPosition = dayIndex === 0 ? 'bottom-full left-0 mb-3 ml-[-10px]' : 
                            dayIndex === 6 ? 'bottom-full right-0 mb-3 mr-[-10px]' : 
                            'bottom-full left-1/2 -translate-x-1/2 mb-3';
    
    if (!day) {
        return (
            <div className="w-full aspect-square rounded-xl md:rounded-2xl border transition-all duration-300 bg-transparent border-transparent" />
        );
    }
    
    return (
        <div className="relative group">
            <button
                ref={cellRef}
                className={`w-full aspect-square rounded-xl md:rounded-2xl border transition-all duration-300 cursor-pointer 
                           ${day.level >= 0 ? getLevelColor(day.level) : HEATMAP_COLORS.empty} 
                           ${day.isToday ? 'ring-2 ring-emerald-500 ring-inset z-10' : ''}
                           hover:scale-110 hover:z-20 hover:border-white/50
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900`}
                role="gridcell"
                aria-label={`${format(day.date, "dd 'de' MMMM", { locale: ptBR })}: ${day.minutes > 0 ? `${Math.round(day.minutes)} minutos estudados` : 'Sem dados de estudo'}`}
                aria-describedby={tooltipVisible ? `heatmap-tooltip-${index}` : undefined}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onFocus={() => onFocus(day, index)}
                onBlur={() => onBlur()}
                onClick={() => onTooltipToggle(day, index)}
                onMouseEnter={() => onFocus(day, index)}
                onMouseLeave={() => onBlur()}
                data-index={index}
            />
            <HeatmapTooltip
                day={day}
                visible={tooltipVisible}
                position={tooltipPosition}
            />
        </div>
    );
};

function ActivityHeatmap({ studyLogs = [] }) {
    const [monthOffset, setMonthOffset] = useState(0);
    const [now, setNow] = useState(() => new Date());
    const [tooltipState, setTooltipState] = useState({ visible: false, day: null, index: null });
    const containerRef = useRef(null);

    // ✅ FIX: Só atualizar a cada 5 minutos — suficiente para heatmap
    useEffect(() => {
        const id = setInterval(() => {
            setNow(new Date());
        }, 5 * 60 * 1000); // 5 minutos em vez de 1
        return () => clearInterval(id);
    }, []);

    // FIX 5.5d: Fechar tooltip com Escape global
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setTooltipState({ visible: false, day: null, index: null });
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleTooltipToggle = useCallback((day, index) => {
        setTooltipState(prev => ({
            visible: prev.index === index ? false : true,
            day,
            index: prev.index === index ? null : index
        }));
    }, []);
    
    const handleFocus = useCallback((day, index) => {
        setTooltipState({ visible: true, day, index });
    }, []);
    
    const handleBlur = useCallback(() => {
        setTooltipState(prev => ({ ...prev, visible: false }));
    }, []);

    const currentMonth = useMemo(() => {
        const base = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthOffset < 0 ? subMonths(base, Math.abs(monthOffset)) :
            monthOffset > 0 ? addMonths(base, monthOffset) : base;
    }, [monthOffset, now]);

    const calendarData = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });

        const studyMap = {};
        const logsArray = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
        logsArray.forEach(log => {
            const rawDate = normalizeDate(log?.date);
            if (!rawDate) return;
            const dateKey = getDateKey(rawDate) || format(rawDate, 'yyyy-MM-dd');
            const minutes = Math.max(0, Number(log?.minutes) || 0);
            studyMap[dateKey] = (studyMap[dateKey] || 0) + minutes;
        });

        const weeks = [];
        let currentWeek = [];

        const startDay = getDay(start);
        for (let i = 0; i < startDay; i++) {
            currentWeek.push(null);
        }

        const today = getDateKey(now) || format(now, 'yyyy-MM-dd');

        days.forEach(day => {
            const dateKey = getDateKey(day) || format(day, 'yyyy-MM-dd');
            const minutes = studyMap[dateKey] || 0;

            currentWeek.push({
                date: day,
                dateKey,
                minutes,
                isToday: dateKey === today,
                level: minutes === 0 ? 0 :
                    minutes < 30 ? 1 :
                        minutes < 60 ? 2 :
                            minutes < 120 ? 3 : 4
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        const totalDays = days.length;
        const monthKeys = new Set(days.map(day => getDateKey(day) || format(day, 'yyyy-MM-dd')));
        const studiedDays = days.filter(day => {
            const dateKey = getDateKey(day) || format(day, 'yyyy-MM-dd');
            return studyMap[dateKey] > 0;
        }).length;
        const totalMinutes = Object.entries(studyMap)
            .filter(([key]) => monthKeys.has(key))
            .reduce((acc, [, mins]) => acc + mins, 0);

        const totalTimeStr = formatDuration(totalMinutes / 60);

        return { weeks, totalDays, studiedDays, totalMinutes, totalTimeStr };
    }, [currentMonth, studyLogs, now]);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="w-full max-w-2xl mx-auto" ref={containerRef}>
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Visão Mensal
                    <div className="relative group/tooltip cursor-help ml-1 inline-flex">
                        <Info size={14} className="text-slate-500/50 hover:text-slate-400 transition-colors" />
                        <div className="absolute top-full left-0 mt-2 w-56 p-2 bg-yellow-400 text-[10px] text-slate-900 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-[60] pointer-events-none border border-yellow-500 font-normal tracking-normal normal-case">
                            <strong>Mapa de Calor:</strong> Cada quadrado representa um dia. Quanto mais escuro o verde, mais tempo de estudo foi registrado no cronômetro ou adicionado manualmente.
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMonthOffset(m => Math.max(-24, m - 1))}
                        disabled={monthOffset <= -24}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-base font-black text-white min-w-[120px] text-center capitalize tracking-tight">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                        onClick={() => setMonthOffset(m => Math.min(0, m + 1))}
                        disabled={monthOffset >= 0}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* FIX 5.5c: Grid com roles adequados */}
            <div 
                className="grid grid-cols-7 gap-2"
                role="grid"
                aria-label="Mapa de atividade mensal"
            >
                {/* Cabeçalhos de dias */}
                <div className="grid grid-cols-7 gap-2 mb-3 col-span-7" role="row" aria-hidden="true">
                    {weekDays.map(day => (
                        <div key={day} className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Células */}
                {calendarData.weeks.map((week, weekIdx) => (
                    <div key={weekIdx} role="row" className="grid grid-cols-7 gap-2 col-span-7">
                        {week.map((day, dayIdx) => (
                            <HeatmapCell
                                key={`${weekIdx}-${dayIdx}`}
                                day={day}
                                dayIndex={dayIdx}
                                index={weekIdx * 7 + dayIdx}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                tooltipVisible={tooltipState.visible && tooltipState.index === weekIdx * 7 + dayIdx}
                                onTooltipToggle={handleTooltipToggle}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Menos</span>
                    <div className="flex gap-1.5 mx-2">
                        {[HEATMAP_COLORS.empty, HEATMAP_COLORS.level1, HEATMAP_COLORS.level2, HEATMAP_COLORS.level3, HEATMAP_COLORS.level4].map((color, i) => (
                            <div key={i} className={`w-4 h-4 rounded-md border ${color.split(' ')[0]} ${color.split(' ')[1]}`} />
                        ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mais</span>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 px-5 py-2.5 rounded-2xl border border-white/5">
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Dias Ativos</div>
                        <div className="text-sm text-slate-300"><span className="text-emerald-400 font-black">{calendarData.studiedDays}</span> / {calendarData.totalDays}</div>
                    </div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Tempo Total</div>
                        <div className="text-sm text-white font-black">{calendarData.totalTimeStr}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(ActivityHeatmap);


```
