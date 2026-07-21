import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { Calendar, Plus, Trash2, Clock, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateId } from '../utils/idGenerator';
import { getDateKey } from '../utils/dateHelper';
import { PageErrorBoundary } from '../components/ErrorBoundary';

const EMPTY_ARRAY = [];

function getActiveContest(state) {
  const id = state.appState.activeId;
  return state.appState.contests[id] || {};
}

export default function Agenda() {
  const rawAgenda = useAppStore(state => getActiveContest(state).agenda || EMPTY_ARRAY);
  const agenda = useMemo(() => Array.isArray(rawAgenda) ? rawAgenda : Object.values(rawAgenda || {}), [rawAgenda]);
  const rawCategories = useAppStore(state => getActiveContest(state).categories || EMPTY_ARRAY);
  const categories = useMemo(() => Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {}), [rawCategories]);
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);

  // Form
  const [form, setForm] = useState({
    title: '',
    subject: '',
    duration: 60,
    notes: '',
    time: '09:00'
  });

  const persistAgenda = (next) => {
    setData(contest => ({ ...contest, agenda: next }));
  };

  // Month grid days
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDateStr = getDateKey(selectedDate) || format(selectedDate, 'yyyy-MM-dd');

  const eventsForSelected = useMemo(() => {
    return agenda
      .filter(e => e.date === selectedDateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [agenda, selectedDateStr]);

  const upcomingEvents = useMemo(() => {
    const todayStr = getDateKey(new Date()) || format(new Date(), 'yyyy-MM-dd');
    return agenda
      .filter(e => e.date >= todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 6);
  }, [agenda]);

  // Quick stats
  const totalPlannedMinutes = useMemo(() => {
    return agenda.reduce((acc, ev) => acc + (Number(ev.duration) || 60), 0);
  }, [agenda]);

  function changeMonth(delta) {
    setCurrentMonth(m => delta > 0 ? addMonths(m, 1) : subMonths(m, 1));
  }

  function selectDay(day) {
    setSelectedDate(day);
  }

  function openAddForSelected() {
    setForm({
      title: '',
      subject: categories[0]?.name || 'Estudo Geral',
      duration: 60,
      notes: '',
      time: '09:00'
    });
    setShowAdd(true);
  }

  const addEvent = () => {
    if (!form.title.trim()) {
      showToast('Título do bloco obrigatório', 'error');
      return;
    }
    const newEvent = {
      id: generateId('agenda'),
      date: selectedDateStr,
      time: form.time,
      title: form.title.trim(),
      subject: form.subject,
      duration: Number(form.duration) || 60,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString()
    };
    const next = [...agenda, newEvent];
    persistAgenda(next);
    setShowAdd(false);
    showToast('Bloco de estudo adicionado à agenda!', 'success');
  };

  const deleteEvent = (id) => {
    if (!window.confirm('Remover este compromisso?')) return;
    const next = agenda.filter(e => e.id !== id);
    persistAgenda(next);
    showToast('Removido da agenda', 'info');
  };

  // Calendar day with event dot count
  const getEventsOnDay = (day) => {
    const dstr = getDateKey(day) || format(day, 'yyyy-MM-dd');
    return agenda.filter(ev => ev.date === dstr).length;
  };

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <PageErrorBoundary pageName="Agenda">
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Calendar className="text-teal-400" size={28} />
            <h1 className="tool-header">Agenda de Estudos</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1.5">Planeje blocos focados. Mantenha consistência.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={openAddForSelected} className="tool-btn">
            <Plus size={17} /> Adicionar Bloco
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Calendar */}
        <div className="xl:col-span-7 premium-card p-5">
          <div className="flex items-center justify-between mb-4 px-1">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/5 text-slate-400 active:bg-white/10">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <div className="font-extrabold text-xl tracking-tight leading-tight pb-0.5">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</div>
              <div className="text-[10px] text-slate-400 tracking-[1.5px] uppercase mt-0.5">Clique em um dia para focar</div>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/5 text-slate-400 active:bg-white/10">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs text-slate-500 font-bold uppercase tracking-[1.5px] px-1 leading-none pt-0.5">
            {weekDays.map((d, i) => <div key={i}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, idx) => {
              const eventCount = getEventsOnDay(day);
              const isSel = isSameDay(day, selectedDate);
              const isTod = isToday(day);
              return (
                <button
                  key={idx}
                  onClick={() => selectDay(day)}
                  className={`agenda-day aspect-square flex flex-col items-center justify-center border text-sm transition-all
                    ${isSel ? 'border-teal-400 bg-teal-500/10' : 'border-white/5 hover:border-white/20'}
                    ${isTod ? 'today' : ''}`}
                >
                  <span className={`font-semibold tabular-nums ${isSel ? 'text-teal-200' : 'text-slate-200'}`}>
                    {format(day, 'd')}
                  </span>
                  {eventCount > 0 && (
                    <div className="mt-0.5 flex gap-0.5">
                      {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-teal-400" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-xs mt-4 text-slate-500 px-1 flex items-center justify-between">
            <div>{agenda.length} blocos totais • {totalPlannedMinutes} minutos planejados</div>
            <button onClick={() => setSelectedDate(new Date())} className="hover:text-teal-300">Hoje</button>
          </div>
        </div>

        {/* Selected day + upcoming */}
        <div className="xl:col-span-5 space-y-5">
          {/* Selected day detail */}
          <div className="premium-card p-5">
            <div className="uppercase text-teal-300 tracking-[1.5px] text-xs font-bold mb-3 flex items-center gap-2">
              <Target size={14} /> {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>

            {eventsForSelected.length === 0 ? (
              <div className="empty-state py-8 text-center">
                <Clock className="mx-auto mb-3 text-teal-300/60" size={32} />
                <div className="text-sm text-slate-400">Nenhum bloco agendado.</div>
                <button onClick={openAddForSelected} className="mt-4 text-xs underline text-teal-400">Planejar estudo</button>
              </div>
            ) : (
              <div className="space-y-2">
                {eventsForSelected.map(ev => (
                  <div key={ev.id} className="agenda-event flex justify-between items-center gap-3 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-medium leading-tight">
                        {ev.time && <span className="font-mono text-teal-300/90 tabular-nums text-xs tracking-wider">{ev.time}</span>}
                        <span>{ev.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 leading-none">
                        <span>{ev.subject}</span>
                        <span>• {ev.duration} min</span>
                      </div>
                      {ev.notes && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 leading-snug">{ev.notes}</div>}
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="opacity-60 group-hover:opacity-100 text-rose-400 p-1.5">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="premium-card p-5">
            <div className="flex justify-between mb-3">
              <div className="micro-label">Próximos Compromissos</div>
              <div className="text-xs text-slate-500">{upcomingEvents.length} agendados</div>
            </div>
            {upcomingEvents.length === 0 && (
              <div className="text-xs text-slate-400 py-2">Sem compromissos futuros. Adicione blocos para se manter no trilho.</div>
            )}
            <div className="space-y-2">
              {upcomingEvents.map(ev => (
                <div key={ev.id} className="flex items-start justify-between rounded-xl bg-white/[0.025] px-3 py-2 text-sm border border-white/5">
                  <div>
                    <div className="font-medium leading-tight">{ev.title}</div>
                    <div className="text-[11px] text-teal-300/90">
                      {ev.date ? format(new Date(ev.date + 'T12:00:00'), 'dd/MM') : '--'}
                      {ev.time ? ` • ${ev.time}` : ''}
                      {ev.duration ? ` • ${ev.duration}min` : ''}
                    </div>
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-rose-400/70 hover:text-rose-400">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200]" onClick={() => setShowAdd(false)}>
          <div className="premium-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-xl mb-1 leading-tight">Novo Bloco de Estudo</h3>
            <div className="text-xs text-teal-400 mb-4">{format(selectedDate, "dd 'de' MMMM yyyy", { locale: ptBR })}</div>

            <div className="space-y-4">
              <div>
                <label className="micro-label mb-1 block">Título / Foco</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm" placeholder="Revisão de Aritmética" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="micro-label mb-1 block">Disciplina</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm">
                    {categories.length > 0 ? categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    )) : <option value="Geral">Geral</option>}
                    <option value="Geral">Geral</option>
                  </select>
                </div>
                <div>
                  <label className="micro-label mb-1 block">Duração (min)</label>
                  <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="micro-label mb-1 block">Horário</label>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono" />
                </div>
                <div>
                  <label className="micro-label mb-1 block">Notas (opcional)</label>
                  <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Revisar erros do último simulado" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-7">
              <button onClick={() => setShowAdd(false)} className="tool-btn secondary flex-1">Cancelar</button>
              <button onClick={addEvent} className="tool-btn flex-1">Agendar Bloco</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageErrorBoundary>
  );
}
