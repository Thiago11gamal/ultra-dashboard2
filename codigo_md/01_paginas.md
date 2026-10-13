# Páginas da Aplicação (src/pages)

> Arquivos neste módulo: **14** | Linhas: **5.461** | Tamanho: **271.1 KB**

## Arquivos:
1. `src/pages/Activity.jsx` (191 linhas)
2. `src/pages/Agenda.jsx` (347 linhas)
3. `src/pages/Coach.jsx` (1106 linhas)
4. `src/pages/Dashboard.jsx` (293 linhas)
5. `src/pages/Evolution.jsx` (121 linhas)
6. `src/pages/Flashcards.jsx` (580 linhas)
7. `src/pages/History.jsx` (58 linhas)
8. `src/pages/Notes.jsx` (189 linhas)
9. `src/pages/Pomodoro.jsx` (1296 linhas)
10. `src/pages/Retention.jsx` (210 linhas)
11. `src/pages/Sessions.jsx` (47 linhas)
12. `src/pages/Simulados.jsx` (733 linhas)
13. `src/pages/Stats.jsx` (191 linhas)
14. `src/pages/Tasks.jsx` (99 linhas)

---

### Arquivo: `src/pages/Activity.jsx`
*Linhas: 191 | Tamanho: 11.0 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState } from 'react';
import { CalendarDays, RotateCcw, Trophy, Target, BookOpen } from 'lucide-react';
import { StreakDisplay, XPHistory, AchievementsGrid } from '../components/GamificationComponents';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { buildAchievementStats } from '../utils/analytics';
import ConfirmModal from '../components/ConfirmModal';

export default function Activity() {
    const data = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const [showResetModal, setShowResetModal] = useState(false);
    
    const achievementStats = React.useMemo(
        () => buildAchievementStats(data) || {},
        [data]
    );

    if (!data) {
        return <div className="flex items-center justify-center p-12 text-slate-400">A carregar dados gamificados...</div>;
    }

    const studyLogsArray = Array.isArray(data?.studyLogs) ? data.studyLogs : Object.values(data?.studyLogs || {});

    const handleResetXP = () => {
        setData(prev => ({
            ...(prev || {}),
            user: {
                ...(prev?.user || {}),
                xp: 0,
                level: 1,
                achievements: [],
                streak: 0,
                // BUG-T05 FIX: Registrar timestamp do reset para que
                // buildAchievementStats não re-desbloqueie conquistas
                // antigas baseadas em dados que já existiam antes do reset.
                achievementsResetAt: new Date().toISOString()
            }
        }));
        setShowResetModal(false);
        showToast('Nível, XP e Troféus Resetados!', 'success');
    };

    return (<PageErrorBoundary pageName="Heatmap">
        <div className="space-y-8 animate-fade-in pb-10">
            <ConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleResetXP}
                title="Resetar Dados Gamificados"
                message="Atenção: Isto vai apagar todo o seu XP e Nível atual. Suas tarefas e histórico de estudos continuarão intactos."
                confirmText="Confirmar Reset"
                type="danger"
                icon={RotateCcw}
            />

            {/* Cabeçalho Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-slate-900/30 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 shadow-inner">
                            <Trophy size={28} className="text-indigo-400" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                            Central de Atividade
                        </h1>
                    </div>
                    <p className="text-slate-400 ml-16 text-sm font-medium">Sua jornada de evolução, consistência e conquistas.</p>
                </div>

                <button
                    onClick={() => setShowResetModal(true)}
                    className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800/40 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition-all duration-300 text-sm font-semibold shadow-sm"
                >
                    <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
                    Resetar Progresso
                </button>
            </div>

            {/* Grid Principal: Layout inteligente e distribuído */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Coluna da Esquerda: Streak e XP (Ocupa 4/12 colunas) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-2 shadow-xl hover:border-white/10 transition-all">
                        <StreakDisplay studyLogs={studyLogsArray} />
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-2 shadow-xl hover:border-white/10 transition-all flex-1">
                        <XPHistory user={data.user} />
                    </div>
                </div>

                {/* Coluna da Direita: Mapa de Calor (Calendário) (Ocupa 8/12 colunas) */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex-1 flex flex-col relative transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                        {/* Brilho decorativo isolado para não dar clip (overflow-hidden) nos Tooltips das laterais */}
                        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                            <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transition-all duration-700 hover:bg-indigo-500/20" />
                        </div>

                        <div className="p-6 relative z-10 flex flex-col flex-1">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                                    <CalendarDays size={22} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">Mapa de Frequência</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Seu histórico de dedicação ao longo do tempo</p>
                                </div>
                            </div>

                            {/* Ajuste importante: overflow visível para tooltips mas mantendo o inner shadow */}
                            <div className="flex-1 w-full bg-slate-950/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                                <ActivityHeatmap studyLogs={studyLogsArray} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flashcards como Medidas e Indicadores */}
            {achievementStats && (achievementStats.flashcardReviews > 0 || achievementStats.flashcardDecks > 0) && (
                <div className="glass border border-amber-500/20 bg-amber-950/5 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <BookOpen size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">Flashcards — Medidas e Indicadores</h3>
                            <p className="text-xs text-amber-400/70 uppercase">Volume, precisão e retenção via SRS</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                        <div>
                            <div className="text-xs text-slate-500 tracking-widest">REVISÕES</div>
                            <div className="text-3xl font-black text-amber-300">{achievementStats.flashcardReviews || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 tracking-widest">PRECISÃO</div>
                            <div className="text-3xl font-black text-emerald-400">{(achievementStats.flashcardAccuracy || 0).toFixed(0)}<span className="text-base">%</span></div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 tracking-widest">HOJE</div>
                            <div className="text-3xl font-black text-white">{achievementStats.flashcardReviewsToday || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 tracking-widest">DECKS</div>
                            <div className="text-3xl font-black text-white">{achievementStats.flashcardDecks || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 tracking-widest">PENDENTES</div>
                            <div className="text-3xl font-black text-orange-400">{achievementStats.flashcardDueToday || 0}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Seção Inferior: Galeria de Troféus */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative transition-all hover:border-white/20">
                {/* Isolando o overflow-hidden apenas para o brilho decorativo para não cortar os Tooltips */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>

                <div className="p-8 relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/20">
                            <Target size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-100">Galeria de Troféus</h2>
                            <p className="text-sm text-slate-400 mt-1">Insígnias de desafios completados e marcos alcançados</p>
                        </div>
                    </div>

                    <div>
                        <AchievementsGrid
                            unlockedIds={data.user?.achievements || []}
                            stats={achievementStats}
                        />
                    </div>
                </div>
            </div>
        </div>
    </PageErrorBoundary>);
}


```

---

### Arquivo: `src/pages/Agenda.jsx`
*Linhas: 347 | Tamanho: 15.1 KB*

```javascript
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { Calendar, Plus, Trash2, Clock, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateId } from '../utils/idGenerator';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import ConfirmModal from '../components/ConfirmModal';

const EMPTY_ARRAY = Object.freeze([]);

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

  const [eventToDelete, setEventToDelete] = useState(null);

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
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const padding = start.getDay();
    const prefix = Array.from({ length: padding }).fill(null);
    return [...prefix, ...days];
  }, [currentMonth]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const eventsForSelected = useMemo(() => {
    return agenda
      .filter(e => e.date === selectedDateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [agenda, selectedDateStr]);

  const upcomingEvents = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
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
      subject: categories[0]?.name || 'Geral',
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
    const ev = agenda.find(e => e.id === id);
    if (ev) setEventToDelete(ev);
  };

  const handleConfirmDeleteEvent = () => {
    if (!eventToDelete) return;
    const next = agenda.filter(e => e.id !== eventToDelete.id);
    persistAgenda(next);
    showToast('Removido da agenda', 'info');
    setEventToDelete(null);
  };

  // Calendar day with event dot count
  const getEventsOnDay = (day) => {
    const dstr = format(day, 'yyyy-MM-dd');
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
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square border border-transparent" />;
              }
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
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
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

      <ConfirmModal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDeleteEvent}
        title="Remover Compromisso"
        message={`Deseja remover o compromisso "${eventToDelete?.title || ''}" da sua agenda?`}
        confirmText="Remover"
        type="danger"
        icon={Trash2}
      />
    </div>
    </PageErrorBoundary>
  );
}


```

---

### Arquivo: `src/pages/Coach.jsx`
*Linhas: 1.106 | Tamanho: 64.2 KB*

```javascript
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
    Brain, 
    Zap, 
    AlertCircle, 
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Dna,
    List,
    BookOpen
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useMonteCarloStats } from '../hooks/useMonteCarloStats';
import { calculateAdaptiveSlope } from '../engine/projection.js';
import PageHeader from '../components/header/PageHeader';
import AICoachView from '../components/AICoachView';
import CoachMenuNav from '../components/coach/CoachMenuNav';
import MonteCarloDebugger from '../components/MonteCarloDebugger';
import ReliabilityCurveChart from '../components/charts/ReliabilityCurveChart';
import { getFlashcardDueTodayCount } from '../utils/analytics';
import { useSubscription } from '../hooks/useSubscription';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { getSuggestedFocus, generateDailyGoals, clearMcCache, clearUrgencyCache, clearTopicsCache, getCombinedHistory } from '../utils/coachLogic';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { logCalibrationTelemetryEvent } from '../utils/calibrationTelemetry';
import { CRITICAL_BRIER_THRESHOLD, HIGH_PENALTY_THRESHOLD, ALERT_COOLDOWN_MS } from '../utils/calibration.js';
import { displaySubject } from '../utils/displaySubject';
import { formatDatePtBR, formatDateTimePtBR } from '../utils/dateHelper';
import { getSafeId } from '../utils/idGenerator';

// BUG-09 FIX: displaySubject moved to src/utils/displaySubject.js (single source of truth)

const CALIBRATION_HISTORY_RETENTION_MS = 1000 * 60 * 60 * 24 * 45; // 45 dias
const CALIBRATION_ALERT_CACHE_MAX = 200;
// P15 PERF FIX: Freeze for referential stability (matches pattern used elsewhere)
const EMPTY_ARRAY = Object.freeze([]);

export default function Coach() {
    const topRef = useRef(null);
    const calibrationAlertCacheRef = useRef(new Map());
    const activeId = useAppStore(state => state.appState.activeId);
    // LEAK-MCCACHE FIX: limpar o cache do Monte Carlo ao trocar de concurso.
    // O hash já previne resultados errados, mas entradas do concurso anterior
    // ocupam memória desnecessariamente até o cap de 50 ser atingido.
    useEffect(() => {
        clearMcCache();
        clearUrgencyCache();
        clearTopicsCache();
        // BUG 1 FIX: Removed calibrationAlertCache.clear() to prevent global cache reset on mount
    }, [activeId]);

    useEffect(() => {
        // Garantir que a tela do Coach AI seja perfeitamente enquadrada a partir do topo
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (topRef.current) {
            const mainContainer = topRef.current.closest('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [activeId]);

    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            simuladoRows: contest.simuladoRows,
            simulados: contest.simulados,
            categories: contest.categories,
            flashcardDecks: contest.flashcardDecks,
            user: contest.user,
            calibrationHistoryByCategory: contest.calibrationHistoryByCategory,
            calibrationOps: contest.calibrationOps,
            calibrationAuditLog: contest.calibrationAuditLog,
            maxScore: contest.maxScore,
            minScore: contest.minScore,
            studyLogs: contest.studyLogs,
            settings: contest.settings,
            coachPlan: contest.coachPlan,
            coachPlanner: contest.coachPlanner
        };
    }));
    const isHydrated = useAppStore(state => state.appState.isHydrated);
    const setData = useAppStore(state => state.setData);
    const showToast = useToast();
    const showToastRef = useRef(showToast); // FIX: Estabilização de referência para evitar loops

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);
    
    const rawHistory = data?.simuladoRows || EMPTY_ARRAY;
    const history = useMemo(() => Array.isArray(rawHistory) ? rawHistory : Object.values(rawHistory || {}), [rawHistory]);
    
    const rawSimulados = data?.simulados || EMPTY_ARRAY;
    const simulados = useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);
    
    const rawCategories = data?.categories || EMPTY_ARRAY;
    const categories = useMemo(() => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })), [rawCategories]);
    
    const rawFlashcardDecks = data?.flashcardDecks || EMPTY_ARRAY;
    const flashcardDecks = useMemo(() => Array.isArray(rawFlashcardDecks) ? rawFlashcardDecks : Object.values(rawFlashcardDecks || {}), [rawFlashcardDecks]);
    
    const rawStudyLogs = data?.studyLogs || EMPTY_ARRAY;
    const studyLogs = useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const flashcardDue = useMemo(() => {
        return getFlashcardDueTodayCount(flashcardDecks);
    }, [flashcardDecks]);
    const userProfile = data?.user;
    
    const updateCoachScore = useAppStore(state => state.updateCoachScore);
    const { isPremium } = useSubscription(userProfile);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('insights');

    const VALID_TABS = new Set(['insights', 'analytics']);
    const safeActiveTab = VALID_TABS.has(activeTab) ? activeTab : 'insights';
    
    useEffect(() => {
        if (activeTab && activeTab !== safeActiveTab) {
            console.warn(`[Coach.jsx] Estado de aba inválido recebido: ${activeTab}, ativando fallback.`);
        }
    }, [activeTab, safeActiveTab]);

    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [coachLoading, setCoachLoading] = useState(false);
    const [suggestedFocus, setSuggestedFocus] = useState(null);
    const timeoutRef = useRef(null);
    const generationTimeoutsRef = useRef([]);
    const lastPushedScoreRef = useRef(null);
    const calibrationHistoryRef = useRef(data?.calibrationHistoryByCategory || {});
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { 
            isMountedRef.current = false; 
            if (generationTimeoutsRef.current && generationTimeoutsRef.current.length > 0) {
                generationTimeoutsRef.current.forEach(clearTimeout);
                generationTimeoutsRef.current = [];
            }
        };
    }, []);

    useEffect(() => {
        calibrationHistoryRef.current = data?.calibrationHistoryByCategory || {};
    }, [data?.calibrationHistoryByCategory]);

    // Backfill de simulados agora é gerenciado no hook useMonteCarloStats via rawSimuladoRows (evita duplicação).

    const lastPersistByCategoryRef = useRef({});
    const persistCalibrationMetric = useCallback((metric) => {
        if (!metric?.categoryId || !isMountedRef.current) return;

        // RATE-LIMIT: Evita loops por categoria se métricas forem emitidas em sequência rápida
        const now = Date.now();
        const catKey = String(metric.categoryId);
        if (now - (lastPersistByCategoryRef.current[catKey] || 0) < 500) return;
        lastPersistByCategoryRef.current[catKey] = now;

        const toFinite = (value, fallback = null) => {
            if (value === null || value === undefined || value === '') return fallback;
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        };
        const metricTimestamp = metric?.timestamp || now;
        const normalizedCategoryId = getSafeId(metric?.categoryId || metric?.categoryName);
        const avgBrier = toFinite(metric?.avgBrier, null);
        const ece = toFinite(metric?.ece, null);
        const probability = toFinite(metric?.probability, null);
        const calibrationPenalty = toFinite(metric?.calibrationPenalty, 0);
        const reliability = Array.isArray(metric?.reliability) ? metric.reliability : [];
        const isDegraded = metric?.degraded === true || calibrationPenalty >= HIGH_PENALTY_THRESHOLD;

        // DATA-QUALITY GATE: evita persistir eventos vazios/ruins que poluem histórico e painéis.
        const hasUsefulSignal = avgBrier !== null || ece !== null || probability !== null || calibrationPenalty > 0 || reliability.length > 0;
        if (!hasUsefulSignal) return;

        const normalizedMetric = {
            ...metric,
            categoryId: normalizedCategoryId,
            categoryName: metric?.categoryName || normalizedCategoryId,
            timestamp: metricTimestamp,
            avgBrier,
            ece,
            probability,
            calibrationPenalty,
            reliability
        };

        // BUG-3 FIX: Immer mutation pattern — explicit return undefined to document intent
        setData(prev => {
            if (!prev) return;
            const current = prev.calibrationHistoryByCategory || {};
            const categoryHistory = current[normalizedCategoryId] || [];
            
            // Verificação de redundância (Brier + ECE + penalty + probabilidade)
            // Evita descartar eventos onde o Brier ficou estável, mas ECE/penalty mudaram.
            const lastEntry = categoryHistory[categoryHistory.length - 1];
            const hasComparableLast = lastEntry && Number.isFinite(Number(lastEntry?.timestamp));
            if (hasComparableLast) {
                const metricDelta = (currentValue, previousValue) => {
                    const currentFinite = Number.isFinite(Number(currentValue));
                    const previousFinite = Number.isFinite(Number(previousValue));
                    if (currentFinite && previousFinite) return Math.abs(Number(previousValue) - Number(currentValue));
                    if (!currentFinite && !previousFinite) return 0;
                    return Infinity;
                };

                const toReliabilitySignature = (bucketList = []) => (Array.isArray(bucketList) ? bucketList : [])
                    .map((bucket) => {
                        const meanPred = Number(bucket?.meanPred);
                        const observedRate = Number(bucket?.observedRate);
                        const gap = Number(bucket?.gap);
                        const count = Number(bucket?.count) || 0;
                        return `${count}|${Number.isFinite(meanPred) ? meanPred.toFixed(3) : 'na'}|${Number.isFinite(observedRate) ? observedRate.toFixed(3) : 'na'}|${Number.isFinite(gap) ? gap.toFixed(3) : 'na'}`;
                    })
                    .join('::');

                const brierDelta = metricDelta(avgBrier, lastEntry.avgBrier);
                const eceDelta = metricDelta(ece, lastEntry.ece);
                const penaltyDelta = Math.abs(Number(lastEntry.calibrationPenalty || 0) - calibrationPenalty);
                const probabilityDelta = metricDelta(probability, lastEntry.probability);
                const reliabilitySignatureChanged =
                    toReliabilitySignature(lastEntry?.reliability) !== toReliabilitySignature(reliability);

                // BUG 6 FIX: Lowered absolute thresholds to capture low-variance micro-movements
                const shouldSkipPersist =
                    (brierDelta < 0.001 || (brierDelta / Math.max(0.001, lastEntry.avgBrier)) < 0.05) &&
                    (eceDelta < 0.001 || (eceDelta / Math.max(0.001, lastEntry.ece)) < 0.05) &&
                    penaltyDelta < 0.001 &&
                    probabilityDelta < 0.01 &&
                    !reliabilitySignatureChanged;

                if (shouldSkipPersist) return prev;
            }

            const cutoff = now - CALIBRATION_HISTORY_RETENTION_MS;
            const cleaned = categoryHistory.filter(item => Number.isFinite(Number(item?.timestamp)) && Number(item.timestamp) >= cutoff);
            const nextHistory = [...cleaned, normalizedMetric].slice(-60);

            const recent7 = nextHistory.filter(item => Number(item?.timestamp || 0) >= (now - 1000 * 60 * 60 * 24 * 7));
            const recent7Brier = recent7.map(item => toFinite(item?.avgBrier, null)).filter(val => val !== null);
            const avgBrier7d = recent7Brier.length > 0
                ? recent7Brier.reduce((acc, val) => acc + val, 0) / recent7Brier.length
                : null;

            const calibrationOps = {
                ...(prev.calibrationOps || {}),
                [normalizedCategoryId]: {
                    categoryName: normalizedMetric.categoryName,
                    avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
                    sample7d: recent7.length,
                    degraded: isDegraded,
                    updatedAt: now
                }
            };

            const calibrationAuditLog = [...(prev.calibrationAuditLog || []), {
                ...normalizedMetric,
                avgBrier7d: Number.isFinite(avgBrier7d) ? Number(avgBrier7d.toFixed(4)) : null,
                degraded: isDegraded,
                source: 'coach'
            }].slice(-500);
            prev.calibrationHistoryByCategory = prev.calibrationHistoryByCategory || {};
            prev.calibrationHistoryByCategory[normalizedCategoryId] = nextHistory;
            prev.calibrationOps = calibrationOps;
            prev.calibrationAuditLog = calibrationAuditLog;
            return {
                calibrationHistoryByCategory: prev.calibrationHistoryByCategory,
                calibrationOps,
                calibrationAuditLog
            };
        });

        if (normalizedMetric.calibrationPenalty >= HIGH_PENALTY_THRESHOLD) {
            logCalibrationTelemetryEvent({ ...normalizedMetric, eventType: 'high_penalty_alert' });
        } else {
            logCalibrationTelemetryEvent(normalizedMetric);
        }

        if (isDegraded) {
            const currentTime = Date.now();
            // LEAK-CALIBRATION-CACHE FIX: antes, entradas eram removidas apenas por tamanho.
            // Entradas com >12h de idade deveriam ser prunadas para liberar memória e permitir
            // re-disparo legítimo do alerta. Agora fazemos uma varredura de cleanup antes de inserir.
            for (const [key, ts] of calibrationAlertCacheRef.current.entries()) {
                if (currentTime - ts > ALERT_COOLDOWN_MS) calibrationAlertCacheRef.current.delete(key);
            }
            const lastAlertAt = Number(calibrationAlertCacheRef.current.get(normalizedCategoryId) || 0);
            if (currentTime - lastAlertAt > ALERT_COOLDOWN_MS) {
                // VIS-FIX: avgBrier pode ser null (degradação só por penalty) → antes exibia "Brier 0.00".
                const brierLabel = avgBrier !== null ? ` (Brier ${avgBrier.toFixed(2)})` : '';
                showToastRef.current(`⚠️ Calibração crítica em ${displaySubject(normalizedMetric.categoryName || 'categoria')}${brierLabel}.`, 'warning');
                calibrationAlertCacheRef.current.set(normalizedCategoryId, now);
                if (calibrationAlertCacheRef.current.size > CALIBRATION_ALERT_CACHE_MAX && calibrationAlertCacheRef.current.size > 0) {
                    const oldestKey = calibrationAlertCacheRef.current.keys().next().value;
                    if (oldestKey !== undefined) calibrationAlertCacheRef.current.delete(oldestKey);
                }
            }
        }
    }, [setData]);

    // BUG-26 FIX: Deduplicating history entries safely and preventing double-counting.
    // 'history' represents topic-level rows, 'simulados' represents global test events.
    // We group legacy topic rows into global events if no 'simulados' exist for that date.
    const combinedHistory = useMemo(() => getCombinedHistory(history, simulados), [history, simulados]);

    // BUG-11 FIX: Pass explicit defaults for timeIndex and timelineDates
    const currentMaxScore = data?.maxScore ?? 100;
    const currentMinScore = data?.minScore ?? 0;
    
    // Converte targetScore ou targetProbability em pontos na escala da prova
    const targetScorePoints = useMemo(() => {
        const safeMax = Math.max(1, Number(currentMaxScore) || 100);
        const safeMin = Number.isFinite(Number(currentMinScore)) ? Math.min(Number(currentMinScore), safeMax) : 0;
        const clampVal = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
        
        if (userProfile?.targetScore != null && Number.isFinite(Number(userProfile.targetScore))) {
            let ts = Number(userProfile.targetScore);
            if (ts <= 100 && (safeMax - safeMin) > 100) {
                ts = safeMin + (ts / 100) * (safeMax - safeMin);
            }
            return clampVal(ts);
        }
        
        if (userProfile?.targetProbability != null && Number.isFinite(Number(userProfile.targetProbability))) {
            return clampVal(safeMin + (Number(userProfile.targetProbability) / 100) * (safeMax - safeMin));
        }
        
        return clampVal(safeMin + (safeMax - safeMin) * 0.85);
    }, [userProfile?.targetScore, userProfile?.targetProbability, currentMinScore, currentMaxScore]);
    
    const mcStats = useMonteCarloStats({
        categories: categories,
        goalDate: userProfile?.goalDate,
        targetScore: targetScorePoints,
        timeIndex: -1,
        timelineDates: EMPTY_ARRAY,
        minScore: currentMinScore,
        maxScore: currentMaxScore,
        simuladoRows: data?.simuladoRows || EMPTY_ARRAY
    });

    const projectedScore = mcStats?.projectedMean ?? 0;
    // UX-STABILITY: Para o card de volatilidade, preferimos pooledSD (determinístico)
    // ao sd da simulação MC (estocástico), reduzindo "pisca/pula" visual.
    const rawVolatility = mcStats?.statsData?.pooledSD ?? mcStats?.sd ?? 0;
    const volatility = Number.isFinite(Number(rawVolatility)) ? Number(rawVolatility) : 0;
    const normalizedVolatility = useMemo(() => {
        const denom = Math.max(1, Number(currentMaxScore) || 0);
        return (volatility / denom) * 100;
    }, [volatility, currentMaxScore]);
    const drift = useMemo(() => calculateAdaptiveSlope(combinedHistory, currentMaxScore), [combinedHistory, currentMaxScore]);
    const normalizedDrift = useMemo(() => {
        const safeDrift = Number.isFinite(Number(drift)) ? Number(drift) : 0;
        const denom = Math.max(1, Number(currentMaxScore) || 1);
        return ((safeDrift * 30) / denom) * 100;
    }, [drift, currentMaxScore]);
    const totalSimulados = useMemo(() => combinedHistory.length, [combinedHistory]);

    // VIS-FIX: projectedMean está na escala da prova (pontos), não em %.
    // Antes o banner exibia "Global MC: 742%" para provas com maxScore=1000.
    const globalProjection = useMemo(() => {
        const mean = Number(suggestedFocus?.globalProjectedMean ?? suggestedFocus?.globalMcContext?.projectedMean);
        if (!Number.isFinite(mean)) return null;
        const safeMax = Math.max(1, Number(currentMaxScore) || 100);
        const safeMin = Number.isFinite(Number(currentMinScore)) ? Math.min(Number(currentMinScore), safeMax - 1) : 0;
        const pct = Math.max(0, Math.min(100, ((mean - safeMin) / (safeMax - safeMin)) * 100));
        const prob = Number(suggestedFocus?.globalMcContext?.probability);
        return {
            points: mean,
            max: safeMax,
            pct,
            probability: Number.isFinite(prob) ? Math.max(0, Math.min(100, prob)) : null
        };
    }, [suggestedFocus?.globalProjectedMean, suggestedFocus?.globalMcContext, currentMaxScore, currentMinScore]);

    const degradedCount = useMemo(
        () => Object.values(data?.calibrationOps || {}).filter(o => o?.degraded).length,
        [data?.calibrationOps]
    );

    const mcStatsContext = useMemo(() => ({
        projectedMean: mcStats?.projectedMean,
        probability: mcStats?.probability,
        statsData: mcStats?.statsData,
        sd: mcStats?.sd
    }), [mcStats?.projectedMean, mcStats?.probability, mcStats?.statsData, mcStats?.sd]);

    // FIX-#185: Stable ref so the analysis useEffect doesn't need mcStatsContext
    // as a dependency. Without this, any isFlashing toggle inside useMonteCarloStats
    // creates a new mcStats object → new mcStatsContext → effect fires → setData()
    // → store update → re-render → infinite loop (React error #185).
    const mcStatsContextRef = useRef(mcStatsContext);
    useEffect(() => { mcStatsContextRef.current = mcStatsContext; }, [mcStatsContext]);

    useEffect(() => {
        if (!data?.categories || !isHydrated) return;

        let metricsTimer = null;
        let nestedTimeouts = [];
        // UX-FLUIDITY FIX: agenda o cálculo pesado para o próximo ciclo.
        // Se o usuário sair rapidamente do Coach, o cleanup cancela tudo e o menu
        // lateral não fica "preso" aguardando cálculo síncrono.
        const analysisTimer = setTimeout(() => {
            const targetScore = targetScorePoints;
            const collectedMetrics = [];

            const result = getSuggestedFocus(
                categories,
                history,
                studyLogs,
                {
                    user: data.user,
                    targetScore,
                    maxScore: data.maxScore ?? 100,
                    calibrationHistoryByCategory: calibrationHistoryRef.current,
                    flashcardDecks: flashcardDecks,
                    flashcardDue,
                    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                    // Pass global MC stats for richer integration (see analysis of Coach + MC)
                    // FIX-#185: Read from ref (stable) instead of the reactive mcStatsContext
                    globalMcStats: mcStatsContextRef.current,
                    config: {
                        MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                    }
                }
            );

            // BEST: enrich the suggestion with global MC context for the UI
            const _mcCtx = mcStatsContextRef.current;
            if (result && _mcCtx && _mcCtx.projectedMean != null) {
                const projectedVal = Number(_mcCtx.projectedMean.toFixed(1));
                result.globalProjectedMean = projectedVal;
                result.globalMcContext = {
                    projectedMean: projectedVal,
                    probability: _mcCtx.probability != null ? Number(_mcCtx.probability.toFixed(1)) : null,
                    source: 'useMonteCarloStats'
                };
            }
            setSuggestedFocus(result);
            setIsAnalyzing(false);

            if (collectedMetrics.length > 0) {
                metricsTimer = setTimeout(() => {
                    collectedMetrics.forEach((metric, i) => {
                        const t = setTimeout(() => persistCalibrationMetric(metric), i * 600);
                        nestedTimeouts.push(t);
                    });
                }, 1000); // Cooldown de 1s para deixar o dashboard respirar entre análises
            }
        }, 0);

        return () => {
            clearTimeout(analysisTimer);
            if (metricsTimer) clearTimeout(metricsTimer);
            nestedTimeouts.forEach(clearTimeout);
        };
    // FIX-#185: mcStatsContext removed — it's read via mcStatsContextRef.current inside
    // the effect body, so it never needs to be a reactive dependency.
    }, [
        isHydrated,
        data?.categories,
        categories, 
        history, 
        studyLogs, 
        data?.user, 
        data?.maxScore, 
        data?.settings?.adaptiveCalibrationEnabled,
        targetScorePoints,
        flashcardDue,
        flashcardDecks,
        persistCalibrationMetric
    ]);

    useEffect(() => {
        if (typeof projectedScore === 'number' && !Number.isNaN(projectedScore) && projectedScore !== lastPushedScoreRef.current) {
            if (lastPushedScoreRef.current === null || Math.abs(projectedScore - lastPushedScoreRef.current) > 0.01) {
                lastPushedScoreRef.current = projectedScore;
                const timer = setTimeout(() => {
                    if (updateCoachScore) updateCoachScore(projectedScore);
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [projectedScore, updateCoachScore]);



    const handleChangeTab = useCallback((tab) => {
        setActiveTab(tab === 'analytics' ? 'analytics' : 'insights');
    }, []);

    const handleGenerateGoals = useCallback(() => {
        if (coachLoading) return;
        if (!categories.length) {
            showToastRef.current('Cadastre matérias e registre simulados para o Coach gerar sugestões.', 'info');
            return;
        }
        setCoachLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (generationTimeoutsRef.current.length > 0) {
            generationTimeoutsRef.current.forEach(clearTimeout);
            generationTimeoutsRef.current = [];
        }

        timeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;

            const targetScore = targetScorePoints;
            const collectedMetrics = [];

            // BUG-1 FIX: Use categories, history, studyLogs directly (now in dep array)
            const newTasks = generateDailyGoals(
                categories,
                history,
                studyLogs,
                {
                    user: data.user,
                    targetScore,
                    maxScore: data.maxScore ?? 100,
                    calibrationHistoryByCategory: calibrationHistoryRef.current,
                    onCalibrationMetric: (metric) => collectedMetrics.push(metric),
                    config: {
                        MC_ENABLE_ADAPTIVE_CALIBRATION: data?.settings?.adaptiveCalibrationEnabled !== false
                    }
                }
            );
            
            if (newTasks.length) {
                setData(prev => { 
                    if(prev) {
                        prev.coachPlan = newTasks; 
                        prev.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
                    }
                    return {
                        coachPlan: newTasks,
                        coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
                    };
                });
                showToastRef.current('Sugestões geradas!', 'success');
            } else {
                showToastRef.current('Nenhuma sugestão necessária.', 'info');
            }

            collectedMetrics.forEach((metric, i) => {
                const t = setTimeout(() => persistCalibrationMetric(metric), i * 600);
                generationTimeoutsRef.current.push(t);
            });
            setCoachLoading(false);
            // LOGIC-TIMEOUT-NULL FIX: zerar a ref após a execução para não manter
            // um ID de timeout expirado que mascararia novos agendamentos.
            timeoutRef.current = null;
        }, 1500);
    // BUG-1 FIX: Added categories, history, studyLogs to prevent stale closure
    }, [data, coachLoading, setData, persistCalibrationMetric, targetScorePoints, categories, history, studyLogs]);

    // BUG-8 FIX: Merge both operations into a single setData call to prevent desync
    const handleClearHistory = useCallback(() => {
        setData(prev => {
            if (prev) {
                prev.coachPlan = [];
                prev.coachPlanner = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
            }
            return {
                coachPlan: [],
                coachPlanner: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
            };
        });
    }, [setData]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (generationTimeoutsRef.current) {
                generationTimeoutsRef.current.forEach(clearTimeout);
                generationTimeoutsRef.current = [];
            }
        };
    }, []);

    // BUG-FIX: antes, se o concurso não tinha `categories` (usuário novo), o efeito de
    // análise retornava cedo, isAnalyzing nunca virava false e o loader girava para sempre.
    if (!isHydrated || (isAnalyzing && data?.categories)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <Brain className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Sincronizando Redes Neurais</span>
                    <span className="text-slate-500 text-[10px] mt-1 uppercase font-bold animate-pulse">Processando Probabilidades...</span>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Coach">
            <div ref={topRef} className="max-w-[1560px] mx-auto px-3 sm:px-5 lg:px-6 pt-1 sm:pt-2 pb-10 sm:pb-16">
                <div className="relative z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
                    <PageHeader 
                        title="Análise do Coach" 
                        description="Mentor estatístico processando seu desempenho para otimizar sua aprovação."
                    />
                    
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 bg-slate-900/80 border border-white/10 p-2 sm:p-2.5 rounded-2xl backdrop-blur-xl w-full lg:w-auto shadow-xl">
                        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-1 w-full sm:w-auto">
                            <QuickStat label="Volatilidade" value={`${normalizedVolatility.toFixed(1)}pp`} color="text-amber-400" icon={<Zap size={13} />} />
                            <div className="w-px h-5 bg-white/10 shrink-0" />
                            <QuickStat
                                label="Tendência"
                                value={`${normalizedDrift.toFixed(1)}pp`}
                                color={normalizedDrift >= 0 ? "text-emerald-400" : "text-rose-400"}
                                icon={normalizedDrift >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            />
                            <div className="w-px h-5 bg-white/10 shrink-0" />
                            <QuickStat label="Simulados" value={totalSimulados} color="text-indigo-400" icon={<Dna size={13} />} />
                        </div>
                        <div className="hidden sm:block w-px h-5 bg-white/10 shrink-0" />
                        <div className="w-full sm:w-auto flex justify-end border-t border-white/5 pt-1.5 sm:pt-0 sm:border-t-0">
                            <MonteCarloDebugger stats={mcStats} />
                        </div>
                    </div>
                </div>

                {/* VIS-FIX: a condição fica no pai para o AnimatePresence conseguir animar a saída */}
                <AnimatePresence>
                    {degradedCount > 0 && <GovernanceBanner key="governance-banner" degradedCount={degradedCount} />}
                </AnimatePresence>

                <div className="space-y-4 sm:space-y-5">
                    <div className="w-full">
                        <CoachMenuNav activeTab={safeActiveTab} onChangeTab={handleChangeTab} isPremium={isPremium} />

                        <Motion.div 
                            key={safeActiveTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="min-h-[200px]"
                        >
                            <div
                                role="tabpanel"
                                id="coach-panel-insights"
                                aria-labelledby="coach-tab-insights"
                                tabIndex={safeActiveTab === 'insights' ? 0 : -1}
                                hidden={safeActiveTab !== 'insights'}
                            >
                                {safeActiveTab === 'insights' && (
                                    <>
                                        {flashcardDue > 0 && (
                                            <div className="mb-3 flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-xs sm:text-sm">
                                                <BookOpen className="text-amber-400 shrink-0" size={16} />
                                                <div className="flex-1 min-w-[180px] text-amber-200">
                                                    <span className="font-semibold">{flashcardDue} flashcard{flashcardDue === 1 ? '' : 's'}</span> pendente{flashcardDue === 1 ? '' : 's'} para hoje. SRS melhora retenção e o modelo.
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/flashcards')}
                                                    className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition"
                                                >
                                                    Revisar agora
                                                </button>
                                            </div>
                                        )}

                                        {/* Visual global MC context */}
                                        {globalProjection && (
                                            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2 text-xs">
                                                <span className="font-black uppercase tracking-[0.15em] text-[10px] text-emerald-300">Projeção Global</span>
                                                <span className="font-mono text-sm sm:text-base font-bold text-emerald-200 tabular-nums">
                                                    {globalProjection.points.toFixed(1)}
                                                    <span className="text-emerald-400/60 text-xs"> / {globalProjection.max} pts</span>
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-mono font-bold text-emerald-300 tabular-nums text-xs">{Math.round(globalProjection.pct)}%</span>
                                                {globalProjection.probability !== null && (
                                                    <span className="text-emerald-400/70 text-xs">· prob. de atingir a meta <span className="font-mono font-bold text-emerald-200">{Math.round(globalProjection.probability)}%</span></span>
                                                )}
                                            </div>
                                        )}
                                        <AICoachView 
                                            suggestedFocus={suggestedFocus}
                                            onGenerateGoals={handleGenerateGoals}
                                            loading={coachLoading}
                                            onClearHistory={handleClearHistory}
                                        />
                                    </>
                                )}
                            </div>

                            <div
                                role="tabpanel"
                                id="coach-panel-analytics"
                                aria-labelledby="coach-tab-analytics"
                                tabIndex={safeActiveTab === 'analytics' ? 0 : -1}
                                hidden={safeActiveTab !== 'analytics'}
                            >
                                {safeActiveTab === 'analytics' && <RaioXDashboard data={data} />}
                            </div>
                        </Motion.div>
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}

function QuickStat({ label, value, color, icon }) {
    return (
        <div className="flex flex-col min-w-[78px] sm:min-w-[80px] px-1">
            <div className="flex items-center gap-1.5 mb-0.5 opacity-70">
                <span className={color}>{icon}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{label}</span>
            </div>
            <span className={`text-base font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
        </div>
    );
}

function StatRow({ label, value, trend, color }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-black ${color}`}>{value}</span>
                {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500" />}
                {trend === 'down' && <AlertCircle size={12} className="text-rose-500" />}
            </div>
        </div>
    );
}

const GovernanceBanner = React.memo(function GovernanceBanner({ degradedCount }) {
    return (
        <Motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            className="mb-6 p-4 rounded-3xl bg-rose-500/5 border border-rose-500/30 flex items-center justify-between gap-4 shadow-sm"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-400 border border-rose-500/20">
                    <AlertCircle size={20} />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-black text-rose-200 uppercase tracking-tight">Alerta de Governança</h4>
                    <p className="text-[10px] text-rose-300/80 font-medium uppercase tracking-widest">
                        Detectamos <span className="text-rose-400 font-black">{degradedCount}</span> {degradedCount === 1 ? 'categoria com calibração degradada' : 'categorias com calibração degradada'}.
                    </p>
                </div>
            </div>
            <div className="hidden sm:block text-right">
                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-tight">
                    O Coach está aplicando<br/>ajustes conservadores.
                </p>
            </div>
        </Motion.div>
    );
});

function RaioXDashboard({ data }) {
    const ops = data?.calibrationOps || {};
    const [filter, setFilter] = useState('all');

    const toFiniteNumber = (value, fallback = 0) => {
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    // BUG-7 FIX: Derive 'now' from latest calibration timestamp to avoid impure Date.now() in useMemo.
    // Falls back to a coarse epoch bucket (per-minute) only when no timestamps exist,
    // which is stable enough to not cause unnecessary recomputation.
    const calibrationSummary = useMemo(() => {
        const historyByCategory = data?.calibrationHistoryByCategory || {};
        // Derive 'now' from the data itself: use the newest timestamp across all categories
        let latestTs = 0;
        for (const entries of Object.values(historyByCategory)) {
            if (Array.isArray(entries)) {
                for (const e of entries) {
                    const ts = toFiniteNumber(e?.timestamp);
                    if (ts > latestTs) latestTs = ts;
                }
            }
        }
        // If no timestamps exist, use a coarse epoch (won't cause re-renders since dep didn't change)
        // eslint-disable-next-line react-hooks/purity
        const now = latestTs > 0 ? latestTs : Math.floor(Date.now() / 60000) * 60000;
        return Object.entries(historyByCategory)
            .map(([categoryId, history]) => {
                const rows = Array.isArray(history) ? history : [];
                if (rows.length === 0) return null;
                const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
                const recent = rows.filter(h => toFiniteNumber(h?.timestamp) >= sevenDaysAgo);
                const base = recent.length > 0 ? recent : rows;
                const brierValues = base
                    .filter(h => h?.avgBrier !== null && h?.avgBrier !== undefined && h?.avgBrier !== '')
                    .map(h => Number(h.avgBrier))
                    .filter(Number.isFinite);
                const penaltyValues = base
                    .filter(h => h?.calibrationPenalty !== null && h?.calibrationPenalty !== undefined && h?.calibrationPenalty !== '')
                    .map(h => Number(h.calibrationPenalty))
                    .filter(Number.isFinite);
                const avgBrier = brierValues.length > 0 ? brierValues.reduce((acc, val) => acc + val, 0) / brierValues.length : 0;
                const avgPenalty = penaltyValues.length > 0 ? penaltyValues.reduce((acc, val) => acc + val, 0) / penaltyValues.length : 0;
                const validCount = base.filter(h => Number.isFinite(Number(h?.avgBrier)) || Number.isFinite(Number(h?.calibrationPenalty))).length;
                if (validCount === 0) return null;
                const label = rows[rows.length - 1]?.categoryName || categoryId;
                return { categoryId, label, count: validCount, avgBrier, avgPenalty };
            })
            .filter(Boolean);
    }, [data?.calibrationHistoryByCategory]);

    const toPercentLabel = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return '-';
        return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
    };

    const sortedLogs = useMemo(() => {
        const source = Array.isArray(data?.calibrationAuditLog) ? data.calibrationAuditLog : [];
        return [...source].sort((a, b) => toFiniteNumber(b?.timestamp) - toFiniteNumber(a?.timestamp));
    }, [data?.calibrationAuditLog]);

    const filteredLogs = useMemo(() => (sortedLogs
        .filter(log => filter === 'all' || (filter === 'degraded' && Boolean(log?.degraded)))
        .slice(0, 50)), [sortedLogs, filter]);

    const latestWithReliability = sortedLogs.find(log => Array.isArray(log?.reliability) && log.reliability.length > 0);
    const eceValues = sortedLogs.map(log => toFiniteNumber(log?.ece, null)).filter(val => val !== null);
    const avgEce = eceValues.length ? (eceValues.reduce((a, b) => a + b, 0) / eceValues.length) : null;
    const categorySeriesMap = sortedLogs.reduce((acc, log) => {
        const cat = log?.categoryName || 'Categoria';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
            ts: toFiniteNumber(log?.timestamp),
            brier: toFiniteNumber(log?.avgBrier, null),
            ece: toFiniteNumber(log?.ece, null)
        });
        return acc;
    }, {});
    const categoryNames = Object.keys(categorySeriesMap);
    const [seriesCategory, setSeriesCategory] = useState(() => categoryNames[0] || '');
    // BUG-07 FIX: Keep selected category valid when data changes
    const effectiveCategory = categoryNames.includes(seriesCategory) ? seriesCategory : (categoryNames[0] || '');
    const temporalSeries = effectiveCategory
        ? [...categorySeriesMap[effectiveCategory]].sort((a, b) => a.ts - b.ts).slice(-12)
        : [];

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Monitor de Calibração unificado */}
            {calibrationSummary.length > 0 ? (
                <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                        <div>
                            <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                                <ShieldCheck size={14} />
                                Monitor de Calibração
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">
                                Acompanhamento de Brier Score (Erro de Projeção) e Degradação
                            </p>
                        </div>
                    </div>
                
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {calibrationSummary.map(row => {
                            const op = ops[row.categoryId] || {};
                            const avgBrier = toFiniteNumber(row.avgBrier);
                            const brierPct = Math.min(100, (avgBrier / 0.35) * 100);
                            const radius = 14;
                            const circ = 2 * Math.PI * radius;
                            const offset = circ - (brierPct / 100) * circ;
                            const colorClass = avgBrier >= 0.25 ? 'text-rose-500' : (avgBrier > 0.18 ? 'text-amber-500' : 'text-emerald-500');
                            
                            return (
                                <div key={row.categoryId} className="group/card relative rounded-2xl border border-white/[0.05] bg-slate-900/50 p-4 sm:p-5 hover:bg-slate-800/60 transition-all duration-300 flex flex-col justify-between">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <p className="text-sm sm:text-[15px] text-white font-black tracking-tight truncate mb-1.5">
                                                {displaySubject(row.label)}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-inner ${op.degraded ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${op.degraded ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse shadow-[0_0_8px_currentColor]`} />
                                                    {op.degraded ? 'Degradado' : 'Estável'}
                                                </div>
                                                <span className="text-[9px] font-mono text-slate-500 font-bold bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md">n={row.count}</span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r={radius} fill="none" className="stroke-black/40" strokeWidth="3" />
                                                <circle 
                                                    cx="18" cy="18" r={radius} fill="none" 
                                                    className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`} 
                                                    strokeWidth="3" 
                                                    strokeDasharray={circ} 
                                                    strokeDashoffset={offset}
                                                    strokeLinecap="round" 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className={`text-[10px] font-black font-mono tracking-tighter ${colorClass}`}>
                                                    {avgBrier.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                
                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-auto">
                                        <div className="group/tooltip relative flex items-center gap-1 cursor-help">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/tooltip:text-slate-300 transition-colors border-b border-dashed border-slate-600">Desvio (Brier)</span>
                                            <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-[#0a0c14] text-[10px] font-medium text-slate-300 rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                                <strong className="text-white font-black block mb-1">Score de Brier</strong>
                                                Mede a precisão das projeções Monte Carlo. Quanto menor o valor (verde), mais assertivo está o motor.
                                            </div>
                                        </div>
                                    
                                        {(() => {
                                            const pen = toFiniteNumber(row.avgPenalty);
                                            if (pen <= 0.001) return null;
                                            return (
                                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Pena: <span className="font-mono">-{Math.round(pen * 100)}%</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="py-10 px-4 text-center rounded-2xl border border-white/5 bg-slate-900/40 space-y-2">
                    <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest">Amostra técnica insuficiente</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight max-w-[280px] mx-auto leading-relaxed">
                        Requer no mínimo <span className="text-indigo-400 font-bold">3 simulados por matéria</span> para calibrar as projeções.
                    </p>
                </div>
            )}
            <div className="p-2 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black text-slate-500/80 uppercase tracking-[0.2em] flex items-center gap-2">
                        <List size={14} className="text-indigo-400/80" />
                        Log de Auditoria
                    </h3>
                    <div className="flex gap-1 bg-slate-900/50 border border-white/5 rounded-xl p-0.5" role="group" aria-label="Filtrar log de auditoria">
                        <button 
                            type="button"
                            aria-pressed={filter === 'all'}
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            type="button"
                            aria-pressed={filter === 'degraded'}
                            onClick={() => setFilter('degraded')}
                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'degraded' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Degradados
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/10">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03]">
                                <th className="py-3.5 pl-4 pr-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[120px]">Data</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[140px]">Categoria</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px]">Brier (erro)</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px]">ECE (calib.)</th>
                                <th className="py-3.5 px-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[110px]">Ajuste</th>
                                <th className="py-3.5 pl-4 pr-4 text-[9.5px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[100px] text-right">Prob Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log, idx) => {
                                const brierVal = toFiniteNumber(log?.avgBrier, null);
                                const eceVal = toFiniteNumber(log?.ece, null);
                                const brierColor = brierVal === null ? 'text-slate-500' : (brierVal >= 0.25 ? 'text-rose-400' : (brierVal > 0.18 ? 'text-amber-400' : 'text-emerald-400'));
                                const eceColor = eceVal === null ? 'text-slate-500' : (eceVal > 0.12 ? 'text-amber-400' : 'text-cyan-300');
                                const isDeg = Boolean(log?.degraded);
                                return (
                                <tr key={`${toFiniteNumber(log?.timestamp, idx)}-${log?.categoryName || 'cat'}-${idx}`} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="py-3 pl-4 pr-4 text-[10px] text-slate-400 font-mono whitespace-nowrap">{toFiniteNumber(log?.timestamp) > 0 ? formatDateTimePtBR(log.timestamp) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-white font-bold whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span>{displaySubject(log.categoryName)}</span>
                                            {isDeg && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                                    Degradado
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap font-bold ${brierColor}`}>{brierVal !== null ? brierVal.toFixed(3) : '-'}</td>
                                    <td className={`py-3 px-4 text-[10px] font-mono whitespace-nowrap font-bold ${eceColor}`}>{eceVal !== null ? eceVal.toFixed(3) : '-'}</td>
                                    <td className="py-3 px-4 text-[10px] text-amber-400 font-bold whitespace-nowrap">
                                        {toFiniteNumber(log?.calibrationPenalty) > 0.001 ? `-${Math.round(toFiniteNumber(log.calibrationPenalty) * 100)}% (calibração)` : '-'}
                                    </td>
                                    <td className="py-3 pl-4 pr-4 text-[10px] text-white font-black whitespace-nowrap text-right tabular-nums">{toPercentLabel(log?.probability)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="py-12 text-center space-y-2 px-4">
                            <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest">Nenhum evento registrado</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight max-w-[340px] mx-auto leading-relaxed">
                                Os diagnósticos surgirão automaticamente após atingir a maturidade de dados (n=3).
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Confiabilidade (ECE)</h3>
                    <span className="text-[10px] font-black text-cyan-300 shrink-0">
                        {avgEce !== null ? `ECE médio: ${avgEce.toFixed(3)}` : 'Sem ECE'}
                    </span>
                </div>
                {latestWithReliability ? (
                    <ReliabilityCurveChart buckets={latestWithReliability.reliability} />
                ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center py-6">Sem buckets de confiabilidade ainda</p>
                )}
            </div>
            <div className="p-4 sm:p-6 rounded-2xl border border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-5 gap-3">
                    <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Drift Temporal (Brier/ECE)</h3>
                    {categoryNames.length > 1 ? (
                        <select
                            value={effectiveCategory}
                            onChange={(e) => setSeriesCategory(e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2 outline-none cursor-pointer hover:bg-slate-800 transition-all backdrop-blur-md"
                        >
                            {categoryNames.map(cat => (
                                <option key={cat} value={cat}>{displaySubject(cat)}</option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                            {effectiveCategory ? displaySubject(effectiveCategory) : 'Sem categoria'}
                        </span>
                    )}
                </div>

                {temporalSeries.length > 1 ? (
                    <div className="space-y-2">
                        {/* VIS-FIX: legenda + escala realista. Antes Brier 0.20 virava uma barra de 20%
                            e ECE 0.05 uma barra de 5% (quase invisível), sem indicar qual cor era qual. */}
                        <div className="flex flex-wrap items-center gap-4 pb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-rose-400/80" />Brier (escala 0–0.50)</span>
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-cyan-400/80" />ECE (escala 0–0.30)</span>
                        </div>
                        {temporalSeries.map((point, idx) => (
                            <div key={`${point.ts}-${idx}`} className="space-y-1">
                                <div className="flex justify-between gap-3 text-[9px] text-slate-500 font-mono">
                                    <span>{point.ts > 0 ? formatDatePtBR(point.ts) : '-'}</span>
                                    <span className="tabular-nums">Brier {point.brier !== null ? point.brier.toFixed(3) : '–'} · ECE {point.ece !== null ? point.ece.toFixed(3) : '–'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-rose-400/80 rounded transition-all duration-500" style={{ width: `${point.brier !== null ? Math.min(100, (point.brier / 0.5) * 100) : 0}%` }} />
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                                        <div className="h-full bg-cyan-400/80 rounded transition-all duration-500" style={{ width: `${point.ece !== null ? Math.min(100, (point.ece / 0.3) * 100) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center py-6">Dados temporais insuficientes</p>
                )}
            </div>
        </div>
    );
}

```

---

### Arquivo: `src/pages/Dashboard.jsx`
*Linhas: 293 | Tamanho: 11.4 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import { X } from 'lucide-react';
import StatsCards from '../components/StatsCards';
import NextGoalCard from '../components/NextGoalCard';
import PriorityProgress from '../components/PriorityProgress';
import Checklist from '../components/Checklist';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { toArray } from '../utils/normalize';

export default function Dashboard() {
    // P06 PERF FIX: Group store actions with useShallow to prevent re-rendering Dashboard on every store mutation
    const {
        setData, toggleTask, deleteTask, addCategory,
        deleteCategory, addTask, togglePriority,
        startPomodoroSession, setDashboardFilter, importCategory
    } = useAppStore(useShallow(state => ({
        setData: state.setData,
        toggleTask: state.toggleTask,
        deleteTask: state.deleteTask,
        addCategory: state.addCategory,
        deleteCategory: state.deleteCategory,
        addTask: state.addTask,
        togglePriority: state.togglePriority,
        startPomodoroSession: state.startPomodoroSession,
        setDashboardFilter: state.setDashboardFilter,
        importCategory: state.importCategory
    })));

    const showToast = useToast();
    const navigate = useNavigate();

    const filter = useAppStore(state => state.appState.dashboardFilter || 'all');
    const isHydrated = useAppStore(state => state.appState.isHydrated);
    const activeId = useAppStore(state => state.appState.activeId);

    const contestsRaw = useAppStore(state => state.appState.contests);
    const contests = React.useMemo(() => contestsRaw || {}, [contestsRaw]);

    const {
        categories,
        simulados,
        simuladoRows,
        rawStudyLogs,
        user,
        pomodorosCompleted,
        flashcardDecks,
        settings,
        studySessions
    } = useAppStore(useShallow(state => {
        const currentActiveId = state.appState?.activeId;
        const contest = state.appState?.contests?.[currentActiveId] || {};
        return {
            categories: contest.categories,
            simulados: contest.simulados,
            simuladoRows: contest.simuladoRows,
            rawStudyLogs: contest.studyLogs,
            user: contest.user,
            pomodorosCompleted: contest.pomodorosCompleted,
            flashcardDecks: contest.flashcardDecks,
            settings: contest.settings,
            studySessions: contest.studySessions
        };
    }));

    const studyLogs = React.useMemo(() => {
        return toArray(rawStudyLogs);
    }, [rawStudyLogs]);

    const safeCategories = React.useMemo(() => {
        return toArray(categories).map(c => ({
            ...c,
            tasks: toArray(c.tasks)
        }));
    }, [categories]);

    const safeSimulados = React.useMemo(() => {
        return toArray(simulados);
    }, [simulados]);

    const safeSimuladoRows = React.useMemo(() => {
        return toArray(simuladoRows);
    }, [simuladoRows]);

    const safeFlashcardDecks = React.useMemo(() => {
        return toArray(flashcardDecks);
    }, [flashcardDecks]);

    const safeStudySessions = React.useMemo(() => {
        return toArray(studySessions);
    }, [studySessions]);

    const data = React.useMemo(() => ({
        categories: safeCategories,
        simulados: safeSimulados,
        simuladoRows: safeSimuladoRows,
        studyLogs: Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {}),
        user,
        pomodorosCompleted,
        flashcardDecks: safeFlashcardDecks,
        settings: settings || {},
        studySessions: safeStudySessions
    }), [
        safeCategories,
        safeSimulados,
        safeSimuladoRows,
        studyLogs,
        user,
        pomodorosCompleted,
        safeFlashcardDecks,
        settings,
        safeStudySessions
    ]);

    const setGoalDate = React.useCallback((d) => setData(contest => {
        if (!contest) return contest;

        return {
            ...contest,
            user: {
                ...(contest.user || {}),
                goalDate: d || null
            }
        };
    }), [setData]);

    const handleStartStudying = React.useCallback((categoryId, taskId) => {
        const currentCategories = useAppStore.getState().appState?.contests?.[
            useAppStore.getState().appState?.activeId
        ]?.categories || [];
        const safeCategoriesList = Array.isArray(currentCategories)
            ? currentCategories
            : Object.values(currentCategories || {});
        const cat = safeCategoriesList.find(c => c && (c.id === categoryId || c.name === categoryId));
        const tsk = toArray(cat?.tasks).find(t => t && (t.id === taskId || t.text === taskId || t.title === taskId));

        if (!cat || !tsk) return;

        const currentActiveSubject = useAppStore.getState().appState?.pomodoro?.activeSubject;
        const isAlreadyActive = currentActiveSubject &&
            (currentActiveSubject.taskId === tsk.id || currentActiveSubject.taskId === taskId) &&
            tsk.status === 'studying';
        if (isAlreadyActive) {
            navigate('/pomodoro');
            return;
        }

        // BUG-FIX: setData ANTES de startPomodoroSession (ordem correta)
        setData(activeContest => {
            if (!activeContest || activeContest.categories == null) {
                return activeContest;
            }

            return {
                ...activeContest,
                categories: toArray(activeContest.categories).map(c => {
                    return {
                        ...c,
                        tasks: toArray(c.tasks).map(t => {
                            if (c.id === cat.id && (t.id === tsk.id || t.id === taskId || (tsk.text && t.text === tsk.text) || (tsk.title && t.title === tsk.title))) {
                                return { ...t, status: 'studying' };
                            }

                            if (t.status === 'studying') {
                                return { ...t, status: null };
                            }

                            return t;
                        })
                    };
                })
            };
        });

        startPomodoroSession({
            categoryId: cat.id,
            taskId: tsk.id || taskId,
            category: cat.name,
            task: tsk.title || tsk.text || 'Estudo',
            priority: tsk.priority,
            source: 'dashboard'
        });

        const taskLabel = tsk.title || tsk.text || 'Estudo';
        showToast(`Iniciando estudos: ${cat.name} - ${taskLabel}`, 'success');
        navigate('/pomodoro');
    }, [startPomodoroSession, setData, showToast, navigate]);

    const [bannerDismissed, setBannerDismissed] = React.useState(() => {
        try {
            return localStorage.getItem('dismissed_feature_banner_v1') === 'true';
        } catch {
            return false;
        }
    });

    const handleDismissBanner = React.useCallback(() => {
        setBannerDismissed(true);
        try {
            localStorage.setItem('dismissed_feature_banner_v1', 'true');
        } catch {
            // ignore
        }
    }, []);

    const hasTasks = React.useMemo(() => safeCategories.some(c => (c.tasks || []).length > 0), [safeCategories]);

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-[70vh] w-full animate-fade-in">
                <div className="flex flex-col items-center gap-5 p-12">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">
                            A Calibrar Motor
                        </p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">
                            A carregar perfil de aprendizagem
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Dashboard">
            <div className="space-y-4 sm:space-y-5 animate-fade-in">
                {!bannerDismissed && (
                    <div className="hidden lg:flex items-center justify-between text-[11px] text-teal-400/90 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl font-medium mb-1 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                            <span><strong className="font-bold text-teal-300">NOVO:</strong> Flashcards e Agenda de Estudos disponíveis no menu</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDismissBanner}
                            className="text-teal-400/60 hover:text-teal-200 p-0.5 rounded-md hover:bg-teal-500/20 transition-colors cursor-pointer"
                            title="Dispensar aviso"
                            aria-label="Dispensar aviso"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="tour-step-4">
                    <StatsCards data={data} onUpdateGoalDate={setGoalDate} />
                </div>

                {hasTasks && (
                    <div className="tour-step-5">
                        <NextGoalCard
                            categories={data.categories}
                            simulados={data.simulados}
                            studyLogs={data.studyLogs}
                            onStartStudying={handleStartStudying}
                        />
                    </div>
                )}

                <PriorityProgress categories={data.categories} />

                <div className="tour-step-6">
                    <Checklist
                        categories={data.categories}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                        onAddCategory={addCategory}
                        onDeleteCategory={deleteCategory}
                        onAddTask={addTask}
                        onTogglePriority={togglePriority}
                        onPlayContext={handleStartStudying}
                        showSimuladoStats
                        filter={filter}
                        setFilter={setDashboardFilter}
                        contests={contests}
                        activeId={activeId}
                        onImportCategory={importCategory}
                    />
                </div>
            </div>
        </PageErrorBoundary>
    );
}


```

---

### Arquivo: `src/pages/Evolution.jsx`
*Linhas: 121 | Tamanho: 5.7 KB*

```javascript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import EvolutionChart from '../components/EvolutionChart';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_ARRAY = Object.freeze([]);

export default function Evolution() {
  const navigate = useNavigate();
  const { categories, rawStudyLogs, monteCarloHistory, user, unit, minScore, maxScore, simuladoRows } = useAppStore(
    useShallow(state => {
      const contests = state?.appState?.contests || {};
      const activeId = state?.appState?.activeId;
      const contest = contests[activeId] || {};
      return {
        categories: contest.categories ?? EMPTY_ARRAY,
        rawStudyLogs: contest.studyLogs,
        monteCarloHistory: contest.monteCarloHistory ?? EMPTY_ARRAY,
        user: contest.user,
        unit: contest.unit || '%',
        minScore: contest.minScore ?? 0,
        maxScore: contest.maxScore ?? 100,
        simuladoRows: contest.simuladoRows ?? EMPTY_ARRAY
      };
    })
  );

  const studyLogs = React.useMemo(() => {
    return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
  }, [rawStudyLogs]);

  const safeCategories = React.useMemo(() => {
    return Array.isArray(categories) ? categories : Object.values(categories || {});
  }, [categories]);

  const safeSimuladoRows = React.useMemo(() => {
    return Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {});
  }, [simuladoRows]);

  const safeMonteCarloHistory = React.useMemo(() => {
    return Array.isArray(monteCarloHistory) ? monteCarloHistory : Object.values(monteCarloHistory || {});
  }, [monteCarloHistory]);

  const hasEvolutionData = (Array.isArray(safeCategories) && safeCategories.some(category => {
    const h = category?.simuladoStats?.history;
    return h && (Array.isArray(h) ? h.length > 0 : Object.keys(h).length > 0);
  })) || (Array.isArray(safeSimuladoRows) && safeSimuladoRows.length > 0);

  // ✅ FIX: Converter targetProbability (percentual) para pontos na escala da prova
  const targetScorePoints = React.useMemo(() => {
    const safeMax = Math.max(1, Number(maxScore) || 100);
    const safeMin = Number.isFinite(Number(minScore)) ? Math.min(Number(minScore), safeMax) : 0;
    const clamp = (value) => Math.min(safeMax, Math.max(safeMin, Number.isFinite(Number(value)) ? Number(value) : safeMin));
    
    // 1) Se existir targetScore explícito, ele é a meta em pontos
    if (user?.targetScore != null && Number.isFinite(Number(user.targetScore))) {
      let ts = Number(user.targetScore);
      // Compatibilidade: se o valor está na faixa 0-100 E a escala tem amplitude > 100
      // provavelmente é um percentual que precisa ser convertido para pontos.
      if (ts <= 100 && (safeMax - safeMin) > 100) {
        ts = safeMin + (ts / 100) * (safeMax - safeMin);
      }
      return clamp(ts);
    }
    
    // 2) Fallback: targetProbability é percentual (0-100) e deve virar pontos
    if (user?.targetProbability != null && Number.isFinite(Number(user.targetProbability))) {
      return clamp(safeMin + (Number(user.targetProbability) / 100) * (safeMax - safeMin));
    }
    
    // 3) Default seguro: 80% da escala
    return clamp(safeMin + (safeMax - safeMin) * 0.8);
  }, [user, minScore, maxScore]);

  return (
    <ErrorBoundary>
      <div className="animate-fade-in">
        {!hasEvolutionData ? (
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <div className="relative p-8 sm:p-12 text-center rounded-3xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-lg w-full group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 opacity-50"></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 mb-6 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">📈</span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 mb-3">
                    Desbloqueie sua Evolução
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                    Cadastre simulados nas disciplinas para visualizar sua evolução, tendências de desempenho e as previsões estatísticas do motor Monte Carlo.
                  </p>
                  <button
                    onClick={() => navigate('/simulados')}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-lg shadow-indigo-900/30 active:scale-95"
                  >
                    Cadastrar primeiro simulado
                  </button>
              </div>
            </div>
          </div>
        ) : (
          <EvolutionChart
            categories={safeCategories}
            studyLogs={studyLogs}
            targetScore={targetScorePoints}
            goalDate={user?.goalDate}
            monteCarloHistory={safeMonteCarloHistory}
            simuladoRows={safeSimuladoRows}
            unit={unit}
            minScore={minScore}
            maxScore={maxScore}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}


```

---

### Arquivo: `src/pages/Flashcards.jsx`
*Linhas: 580 | Tamanho: 23.9 KB*

```javascript
import React, { useState, useMemo } from 'react';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { BookOpen, Plus, Trash2, Play, X, RotateCw, Award } from 'lucide-react';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';
import { getFlashcardTodayKey, getFlashcardNextDueKey, isFlashcardDue } from '../utils/dateHelper';
import DueForecast from '../components/DueForecast';

import ConfirmModal from '../components/ConfirmModal';

const EMPTY_ARRAY = Object.freeze([]);

function getActiveContest(state) {
  const id = state.appState.activeId;
  return state.appState.contests[id] || {};
}

export default function Flashcards() {
  const rawDecks = useAppStore(state => getActiveContest(state).flashcardDecks || EMPTY_ARRAY);
  const decks = Array.isArray(rawDecks) ? rawDecks : Object.values(rawDecks || {});
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const logFlashcardReview = useAppStore(state => state.logFlashcardReview);

  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');

  const [showAddCard, setShowAddCard] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  // Study session
  const [isStudying, setIsStudying] = useState(false);
  const [studyDeck, setStudyDeck] = useState(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyStats, setStudyStats] = useState({ reviewed: 0, known: 0 });
  const [pendingClose, setPendingClose] = useState(false);

  const closeStudy = React.useCallback(() => {
    setIsStudying(false);
    setStudyDeck(null);
    setStudyIndex(0);
    setIsFlipped(false);
  }, []);

  React.useEffect(() => {
    if (!pendingClose) return;
    const timer = setTimeout(() => {
      closeStudy();
      setPendingClose(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [pendingClose, closeStudy]);

  const selectedDeck = useMemo(() => decks.find(d => d.id === selectedDeckId), [decks, selectedDeckId]);



  function persistDecks(nextDecksOrUpdater) {
    setData(contest => {
      const currentDecks = Array.isArray(contest.flashcardDecks)
        ? contest.flashcardDecks
        : Object.values(contest.flashcardDecks || {});
      const resolved = typeof nextDecksOrUpdater === 'function'
        ? nextDecksOrUpdater(currentDecks)
        : nextDecksOrUpdater;
      return {
        ...contest,
        flashcardDecks: resolved
      };
    });
  }

  // Create deck
  const createDeck = () => {
    if (!newDeckName.trim()) {
      showToast('Nome do deck obrigatório', 'error');
      return;
    }
    const newDeck = {
      id: generateId('deck'),
      name: newDeckName.trim(),
      subject: newDeckSubject.trim() || 'Geral',
      createdAt: new Date().toISOString(),
      cards: [],
      stats: { totalReviews: 0, mastered: 0 }
    };
    const next = [...decks, newDeck];
    persistDecks(next);
    setSelectedDeckId(newDeck.id);
    setNewDeckName('');
    setNewDeckSubject('');
    setShowCreateDeck(false);
    showToast('Deck criado! 📚', 'success');
  };

  // Delete deck
  const deleteDeck = (deckId) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) setDeckToDelete(deck);
  };

  const handleConfirmDeleteDeck = () => {
    if (!deckToDelete) return;
    const next = decks.filter(d => d.id !== deckToDelete.id);
    persistDecks(next);
    if (selectedDeckId === deckToDelete.id) setSelectedDeckId(null);
    showToast('Deck removido', 'info');
    setDeckToDelete(null);
  };

  // Add card
  const addCard = () => {
    if (!selectedDeckId || !front.trim() || !back.trim()) {
      showToast('Preencha frente e verso', 'error');
      return;
    }
    const nextDecks = decks.map(deck => {
      if (deck.id !== selectedDeckId) return deck;
      const cards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
      return {
        ...deck,
        cards: [...cards, {
          id: generateId('card'),
          front: front.trim(),
          back: back.trim(),
          interval: 1,
          ease: 2.5,
          due: getFlashcardTodayKey(),   // consistent TZ key
          lastReviewed: null,
          reviews: 0
        }]
      };
    });
    persistDecks(nextDecks);
    setFront('');
    setBack('');
    setShowAddCard(false);
    showToast('Cartão adicionado!', 'success');
  };

  const deleteCard = (cardId) => {
    const nextDecks = decks.map(deck => {
      if (deck.id !== selectedDeckId) return deck;
      const cards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
      const nextCards = cards.filter(c => c.id !== cardId);
      return { 
        ...deck, 
        cards: nextCards,
        stats: {
          ...deck.stats,
          mastered: nextCards.filter(c => (c.reviews || 0) >= 3 && (c.interval || 1) > 6).length
        }
      };
    });
    persistDecks(nextDecks);
    showToast('Cartão excluído', 'info');
  };

  // Start study
  const getDueCardsForDeck = (deck) => {
    if (!deck || !deck.cards) return [];
    const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
    return safeCards.filter(c => isFlashcardDue(c.due));
  };

  const startStudy = (deck) => {
    if (!deck) return;

    const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});

    if (safeCards.length === 0) {
      showToast('Adicione cartões antes de estudar', 'error');
      return;
    }

    const dueForDeck = getDueCardsForDeck(deck);
    
    if (dueForDeck.length === 0) {
      showToast('Nenhum cartão para revisar hoje!', 'success');
      return;
    }

    const cardsToStudy = dueForDeck;

    setSelectedDeckId(deck.id);
    setStudyDeck({ ...deck, cardsToStudy });
    setStudyIndex(0);
    setIsFlipped(false);
    setStudyStats({ reviewed: 0, known: 0 });
    setIsStudying(true);
  };



  const flipCard = () => setIsFlipped(f => !f);

  // SRS simple
  function rateCard(rating) {
    if (pendingClose) return;
    // rating: 0=Esqueci, 1=Difícil, 2=Bom, 3=Fácil
    if (!studyDeck || !studyDeck.cardsToStudy) return;

    const currentCard = studyDeck.cardsToStudy[studyIndex];
    if (!currentCard) return;

    // Update in decks
    let newInterval = currentCard.interval || 1;
    let newEase = currentCard.ease || 2.5;

    if (rating === 0) {
      newInterval = 1;
    } else if (rating === 1) {
      newInterval = Math.max(1, Math.floor(newInterval * 0.8));
      newEase = Math.max(1.3, newEase - 0.15);
    } else if (rating === 2) {
      newInterval = Math.max(newInterval + 1, Math.min(365 * 5, Math.round(newInterval * newEase)));
      newEase = Math.min(3.0, newEase + 0.05);
    } else {
      newInterval = Math.max(newInterval + 2, Math.min(365 * 5, Math.round(newInterval * (newEase + 0.2))));
      newEase = Math.min(3.2, newEase + 0.1);
    }

    const nextDue = getFlashcardNextDueKey(newInterval);

    persistDecks(currentDecks => {
      return currentDecks.map(deck => {
        if (deck.id !== studyDeck.id) return deck;
        const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
        const updatedCards = safeCards.map(card => {
          if (card.id === currentCard.id) {
            return {
              ...card,
              interval: newInterval,
              ease: newEase,
              due: nextDue,
              lastReviewed: new Date().toISOString(),
              reviews: (card.reviews || 0) + 1
            };
          }
          return card;
        });
        return {
          ...deck,
          cards: updatedCards,
          stats: {
            totalReviews: (deck.stats?.totalReviews || 0) + 1,
            mastered: updatedCards.filter(c => (c.reviews || 0) >= 3 && (c.interval || 1) > 6).length
          }
        };
      });
    });

    // Integrate as measure: log review for stats, activity, gamification, coach
    if (typeof logFlashcardReview === 'function' && studyDeck) {
        logFlashcardReview(studyDeck.id, currentCard.id, rating, studyDeck.subject || studyDeck.name);
    }

    // Update local study session copy
    const updatedStudyCards = [...studyDeck.cardsToStudy];
    updatedStudyCards[studyIndex] = {
      ...updatedStudyCards[studyIndex],
      interval: newInterval,
      ease: newEase,
      due: nextDue
    };

    const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
    const isKnown = safeRating >= 2;
    const projectedKnown = studyStats.known + (isKnown ? 1 : 0);
    const projectedReviewed = studyStats.reviewed + 1;

    setStudyStats(prev => {
      const pSafeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
      const pIsKnown = pSafeRating >= 2;
      const newReviewed = prev.reviewed + 1;
      const newKnown = prev.known + (pIsKnown ? 1 : 0);
      
      if (prev.reviewed === newReviewed && prev.known === newKnown) {
        return prev;
      }
      
      return {
        ...prev,
        reviewed: newReviewed,
        known: newKnown,
      };
    });

    // Next card
    if (studyIndex + 1 < updatedStudyCards.length) {
      setStudyIndex(i => i + 1);
      setIsFlipped(false);
      setStudyDeck({ ...studyDeck, cardsToStudy: updatedStudyCards });
    } else {
      // Finished
      setIsFlipped(false);
      showToast(`Sessão concluída! ${projectedKnown}/${projectedReviewed} dominados.`, 'success');
      setPendingClose(true);
    }
  }

  const currentStudyCard = studyDeck?.cardsToStudy?.[studyIndex];

  const pageTitle = studyDeck?.name || "Flashcards";

  return (
    <PageErrorBoundary pageName={pageTitle}>
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <BookOpen className="text-amber-400" size={28} />
            <h1 className="tool-header">Flashcards</h1>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm">Sistema de repetição espaçada para concursos</p>
        </div>

        <button
          onClick={() => setShowCreateDeck(true)}
          className="tool-btn"
        >
          <Plus size={17} /> Novo Deck
        </button>
      </div>

      {/* Previsão de Cartões a Vencer - compact header insight */}
      {decks.length > 0 && (
        <div className="mb-6">
          <DueForecast decks={decks} horizon={10} />
        </div>
      )}

      {/* Create deck modal */}
      {showCreateDeck && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowCreateDeck(false)}>
          <div className="premium-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 leading-tight">Criar Novo Deck</h3>
            <div className="space-y-3">
              <div>
                <label className="micro-label block mb-1">Nome do Deck</label>
                <input
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none"
                  placeholder="Ex: Direito Constitucional"
                />
              </div>
              <div>
                <label className="micro-label block mb-1">Disciplina (opcional)</label>
                <input
                  value={newDeckSubject}
                  onChange={e => setNewDeckSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none"
                  placeholder="Direito"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateDeck(false)} className="tool-btn secondary flex-1">Cancelar</button>
              <button onClick={createDeck} className="tool-btn flex-1">Criar Deck</button>
            </div>
          </div>
        </div>
      )}

      {/* Decks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {decks.length === 0 && (
          <div className="empty-state col-span-full text-center">
            <BookOpen className="mx-auto mb-4 text-amber-400/70" size={42} />
            <p className="text-lg font-semibold">Nenhum deck ainda</p>
            <p className="text-slate-400 mt-1">Crie decks de flashcards para revisar com repetição espaçada.</p>
            <button onClick={() => setShowCreateDeck(true)} className="tool-btn mt-6 mx-auto">Criar Primeiro Deck</button>
          </div>
        )}

        {decks.map(deck => {
          const cardCount = deck.cards?.length || 0;
          const isSelected = deck.id === selectedDeckId;
          const safeCards = Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards || {});
          const dueCount = safeCards.filter(c => isFlashcardDue(c.due)).length;
          return (
            <div
              key={deck.id}
              className={`deck-card premium-card p-5 cursor-pointer border ${isSelected ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-white/5'}`}
              onClick={() => setSelectedDeckId(deck.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg leading-tight tracking-[-0.01em]">{deck.name}</div>
                  <div className="text-xs text-amber-300/90 uppercase tracking-widest mt-1">{deck.subject}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                  className="text-rose-400/70 hover:text-rose-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-2xl font-bold tabular-nums">{cardCount}</span>
                  <span className="ml-1.5 text-slate-400">cartões</span>
                </div>
                <div className="text-emerald-400 text-xs font-bold">
                  {dueCount > 0 ? `${dueCount} para revisar` : 'Em dia'}
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); startStudy(deck); }}
                disabled={cardCount === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/30 py-2.5 text-sm font-bold disabled:opacity-50 transition-colors"
              >
                <Play size={15} /> ESTUDAR AGORA
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected deck panel */}
      {selectedDeck && (
        <div className="premium-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-extrabold text-2xl leading-tight tracking-[-0.01em]">{selectedDeck.name}</div>
              <div className="text-amber-300/80 text-sm tracking-wider mt-0.5">{selectedDeck.subject} • {(Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {})).length} cartões</div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => startStudy(selectedDeck)} disabled={!selectedDeck.cards?.length} className="tool-btn">
                <Play size={16} /> Iniciar Revisão
              </button>
              <button onClick={() => setShowAddCard(true)} className="tool-btn secondary">
                <Plus size={16} /> Adicionar Cartão
              </button>
            </div>
          </div>

          {/* Add card form */}
          {showAddCard && (
            <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-slate-950/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="micro-label mb-1.5">FRENTE (Pergunta)</div>
                  <textarea value={front} onChange={e => setFront(e.target.value)} rows={3} className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm resize-y" placeholder="O que é... ?" />
                </div>
                <div>
                  <div className="micro-label mb-1.5">VERSO (Resposta)</div>
                  <textarea value={back} onChange={e => setBack(e.target.value)} rows={3} className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm resize-y" placeholder="Resposta completa..." />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowAddCard(false); setFront(''); setBack(''); }} className="tool-btn secondary flex-1">Cancelar</button>
                <button onClick={addCard} className="tool-btn flex-1">Adicionar Cartão</button>
              </div>
            </div>
          )}

          {/* Cards list */}
          <div>
            <div className="micro-label mb-3">CARTÕES ({(selectedDeck.cards || []).length})</div>
            {(Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {})).length === 0 ? (
              <div className="text-sm text-slate-400 py-3">Nenhum cartão. Adicione alguns acima.</div>
            ) : (
              <div className="space-y-2">
                {(Array.isArray(selectedDeck.cards) ? selectedDeck.cards : Object.values(selectedDeck.cards || {})).map((card) => (
                  <div key={card.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm group">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-amber-100 line-clamp-2 leading-snug">{card.front}</div>
                      <div className="text-slate-400 mt-1 text-xs line-clamp-2 leading-snug">{card.back}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                        <span>Intervalo: {card.interval || 1}d</span>
                        {card.due && <span>Próxima: {format(new Date(card.due + 'T12:00:00'), 'dd/MM')}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-500 transition p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDY MODAL */}
      {isStudying && currentStudyCard && (
        <div className="fixed inset-0 z-[300] bg-[#05070f]/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[680px]">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4 px-1 text-sm">
              <div className="flex items-center gap-2 text-amber-300">
                <BookOpen size={18} />
                <span className="font-semibold">{studyDeck?.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>{studyIndex + 1} / {studyDeck?.cardsToStudy?.length}</span>
                <span className="text-emerald-400">{studyStats.known} bons</span>
                <button onClick={closeStudy} className="text-slate-400 hover:text-white flex items-center gap-1">
                  <X size={15} /> Sair
                </button>
              </div>
            </div>

            {/* Flashcard - generous framing */}
            <div className="flashcard-container mx-auto my-2" onClick={flipCard}>
              <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
                {/* FRONT */}
                <div className="flashcard-front">
                  <div className="uppercase tracking-[2.5px] text-[10px] text-amber-300/70 mb-1.5 font-bold">PERGUNTA</div>
                  <div className="flashcard-content mt-1 mb-1">{currentStudyCard.front}</div>
                  <div className="absolute bottom-4 text-[10px] text-slate-500/80 tracking-wide">Toque para virar ↻</div>
                </div>
                {/* BACK */}
                <div className="flashcard-back">
                  <div className="uppercase tracking-[2.5px] text-[10px] text-violet-300/70 mb-1.5 font-bold">RESPOSTA</div>
                  <div className="flashcard-content mt-1 mb-1">{currentStudyCard.back}</div>
                </div>
              </div>
            </div>

            {/* Controls - better spacing */}
            {!isFlipped ? (
              <div className="mt-5 mb-1 text-center text-xs text-slate-400">Toque no cartão para revelar a resposta</div>
            ) : (
              <div className="mt-6">
                <div className="text-center text-sm font-medium text-amber-300 mb-3.5">Como foi a sua resposta?</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button onClick={() => rateCard(0)} className="rounded-2xl bg-rose-600/10 hover:bg-rose-600/25 border border-rose-600/30 py-3 text-rose-300 font-semibold active:scale-[0.985]">Esqueci</button>
                  <button onClick={() => rateCard(1)} className="rounded-2xl bg-orange-500/10 hover:bg-orange-500/25 border border-orange-400/30 py-3 text-orange-300 font-semibold active:scale-[0.985]">Difícil</button>
                  <button onClick={() => rateCard(2)} className="rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-400/30 py-3 text-emerald-300 font-semibold active:scale-[0.985]">Bom</button>
                  <button onClick={() => rateCard(3)} className="rounded-2xl bg-sky-500/10 hover:bg-sky-500/25 border border-sky-400/30 py-3 text-sky-300 font-semibold active:scale-[0.985]">Fácil</button>
                </div>
              </div>
            )}

            <div className="text-center mt-7">
              <button onClick={flipCard} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 hover:text-slate-200">
                <RotateCw size={14} /> Virar Cartão
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedDeck && decks.length > 0 && (
        <p className="text-center text-slate-500 mt-4 text-sm">Selecione um deck acima para gerenciar ou estudar.</p>
      )}

      <ConfirmModal
        isOpen={!!deckToDelete}
        onClose={() => setDeckToDelete(null)}
        onConfirm={handleConfirmDeleteDeck}
        title="Excluir Deck"
        message={`Tem certeza que deseja excluir o deck "${deckToDelete?.name || ''}" e todos os seus cartões? Essa ação não pode ser desfeita.`}
        confirmText="Excluir Deck"
        type="danger"
        icon={Trash2}
      />
    </div>
    </PageErrorBoundary>
  );
}


```

---

### Arquivo: `src/pages/History.jsx`
*Linhas: 58 | Tamanho: 3.0 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import { History as HistoryIcon, Sparkles } from 'lucide-react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function History() {
    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            categories: contest.categories,
            simuladoRows: contest.simuladoRows,
            studySessions: contest.studySessions
        };
    }));
    const deleteSession = useAppStore(state => state.deleteSession);
    const deleteSimulado = useAppStore(state => state.deleteSimulado);

    return (
        <PageErrorBoundary pageName="Histórico">
            <div className="w-full space-y-6 animate-fade-in">
                {/* Header da Página */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                            <HistoryIcon size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-tight">Histórico de Desempenho</h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    <Sparkles size={10} />
                                    Analytics
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Evolução detalhada de simulados, tópicos críticos e recomendações de estudo
                            </p>
                        </div>
                    </div>
                </div>

                <StudyHistory
                    studySessions={Array.isArray(data.studySessions) ? data.studySessions : Object.values(data.studySessions || {})}
                    categories={Array.isArray(data.categories) ? data.categories : Object.values(data.categories || {})}
                    simuladoRows={Array.isArray(data.simuladoRows) ? data.simuladoRows : Object.values(data.simuladoRows || {})}
                    onDeleteSession={deleteSession}
                    onDeleteSimulado={deleteSimulado}
                    mode="performance"
                />
            </div>
        </PageErrorBoundary>
    );
}



```

---

### Arquivo: `src/pages/Notes.jsx`
*Linhas: 189 | Tamanho: 8.7 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { safeClone } from '../utils/safeClone.js';
import React, { useMemo } from 'react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { normalize, aliases } from '../utils/normalization';
import { getDateKey, toDateMs } from '../utils/dateHelper';

// FIX N-01: getDateKey pode retornar null/undefined para datas inválidas.
// Wrapper seguro que descarta chaves vazias antes de usar como chave de mapa.
const safeDateKey = (raw) => {
  const key = getDateKey(raw);
  return key && typeof key === 'string' && key.trim() !== '' ? key : null;
};

export default function Notes() {
    const activeContest = useAppStore(state => state.appState.contests[state.appState.activeId]);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;
    const contestMaxScore = activeContest?.maxScore;
    const contestMinScore = activeContest?.minScore;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) to ensure no data is hidden.
    const enhancedCategories = useMemo(() => {
        const categories = Array.isArray(categoriesRaw) ? categoriesRaw : Object.values(categoriesRaw || {});
        const simuladoRows = Array.isArray(simuladoRowsRaw) ? simuladoRowsRaw : Object.values(simuladoRowsRaw || {});
        
        if (!categories.length) return [];

        // FIX N-02: safeClone pode retornar null para valores com funções/DOM.
        // Fallback para map raso se o clone profundo falhar.
        let newCats;
        try {
            newCats = safeClone(categories, null);
            if (!Array.isArray(newCats)) newCats = categories.map(c => ({ ...c }));
        } catch {
            newCats = categories.map(c => ({ ...c }));
        }

        newCats.forEach(cat => {
            const catNorm = normalize(cat.name);
            const catAliases = aliases[catNorm] || [];
            
            // BUG-FIX: Correspondência usava apenas normalização de nome (frágil).
            // Adicionado categoryId como defesa primária, espelhando schemas.js repairContestHistory.
            const myRows = simuladoRows.filter(r => {
                if (r?.categoryId && r.categoryId === cat.id) return true;
                const subNorm = normalize(r?.subject);
                if (!subNorm) return false;
                return subNorm === catNorm || catAliases.some(a => normalize(a) === subNorm);
            });

            const rowsByDate = {};
            myRows.forEach(r => {
                const dateKey = safeDateKey(r.date || r.createdAt);
                if (!dateKey) return;
                if (!rowsByDate[dateKey]) rowsByDate[dateKey] = [];
                
                const rowTotal = Math.max(0, Number(r.total) || 0);
                const rowCorrect = Math.min(rowTotal, Math.max(0, Number(r.correct) || 0));

                rowsByDate[dateKey].push({
                    name: r.topic || 'Geral',
                    correct: rowCorrect,
                    total: rowTotal,
                    score: r.score,
                    isPercentage: r.isPercentage
                });
            });

            const existingStats = cat.simuladoStats || {};
            const existingHistoryRaw = existingStats.history;

            const existingHistory = Array.isArray(existingHistoryRaw)
                ? existingHistoryRaw
                : Object.values(existingHistoryRaw || {});
            
            const mergedHistoryMap = {};

            // Add from existing history first
            existingHistory.forEach(h => {
                const dateKey = safeDateKey(h?.date);
                if (!dateKey) return;
                mergedHistoryMap[dateKey] = {
                    date: dateKey,
                    correct: h.correct,
                    total: h.total,
                    score: h.score,
                    isPercentage: !!h.isPercentage,
                    topics: Array.isArray(h.topics) ? h.topics : Object.values(h.topics || {})
                };
            });

            // Overlay or add from rowsByDate
            const catMax = Number(cat.maxScore) || Number(contestMaxScore) || 100;
            const catMin = Number.isFinite(Number(cat.minScore))
                ? Number(cat.minScore)
                : (Number.isFinite(Number(contestMinScore)) ? Number(contestMinScore) : 0);
            const catRange = Math.max(1e-9, catMax - catMin);

            Object.entries(rowsByDate).forEach(([dateKey, topics]) => {
                const totalC = topics.reduce((s, t) => s + t.correct, 0);
                const totalQ = topics.reduce((s, t) => s + t.total, 0);
                const calcScore = totalQ > 0 ? catMin + (totalC / totalQ) * catRange : catMin;

                if (mergedHistoryMap[dateKey]) {
                    const existingTopics = Array.isArray(mergedHistoryMap[dateKey].topics) ? mergedHistoryMap[dateKey].topics : [];
                    const topicMap = new Map();
                    existingTopics.forEach(t => {
                        const key = normalize(t.name || t.topic || 'Geral');
                        topicMap.set(key, { ...t });
                    });
                    topics.forEach(t => {
                        const key = normalize(t.name || t.topic || 'Geral');
                        const prev = topicMap.get(key);
                        if (prev) {
                            prev.correct = Math.max(0, Number(prev.correct) || 0) + t.correct;
                            prev.total = Math.max(0, Number(prev.total) || 0) + t.total;
                        } else {
                            topicMap.set(key, { ...t });
                        }
                    });
                    const combinedTopics = Array.from(topicMap.values());
                    const combinedC = combinedTopics.reduce((s, t) => s + (Number(t.correct) || 0), 0);
                    const combinedQ = combinedTopics.reduce((s, t) => s + (Number(t.total) || 0), 0);
                    mergedHistoryMap[dateKey].topics = combinedTopics;
                    mergedHistoryMap[dateKey].correct = combinedQ > 0 ? combinedC : totalC;
                    mergedHistoryMap[dateKey].total = combinedQ > 0 ? combinedQ : totalQ;
                    mergedHistoryMap[dateKey].score = combinedQ > 0 ? catMin + (combinedC / combinedQ) * catRange : calcScore;
                    mergedHistoryMap[dateKey].isPercentage = false;
                } else {
                    mergedHistoryMap[dateKey] = {
                        date: dateKey,
                        correct: totalC,
                        total: totalQ,
                        score: calcScore,
                        isPercentage: false,
                        topics: topics
                    };
                }
            });

            // 4. Cleanup: If an entry still has no topics, add a "Geral" topic
            Object.values(mergedHistoryMap).forEach(h => {
                if (!h.topics || h.topics.length === 0) {
                    h.topics = [{
                        name: 'Geral',
                        correct: h.correct,
                        total: h.total,
                        score: h.score,
                        isPercentage: h.isPercentage
                    }];
                }
            });

            const rebuiltHistory = Object.values(mergedHistoryMap)
                .sort((a, b) => toDateMs(a?.date) - toDateMs(b?.date))
                .slice(-50);

            cat.simuladoStats = {
                ...existingStats,
                history: rebuiltHistory
            };
        });

        return newCats;
    }, [categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore]);

    const maxScore = useMemo(() => {
        const scores = enhancedCategories
            .map(c => Number(c?.maxScore))
            .filter(s => Number.isFinite(s) && s > 0);
        if (scores.length === 0) return 100;
        return Math.max(...scores);
    }, [enhancedCategories]);

    return (<PageErrorBoundary pageName="Notas">
        <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopicPerformance categories={enhancedCategories} maxScore={maxScore} />
            <ParetoAnalysis categories={enhancedCategories} maxScore={maxScore} />
        </div>
    </PageErrorBoundary>);
}


```

---

### Arquivo: `src/pages/Pomodoro.jsx`
*Linhas: 1.296 | Tamanho: 67.9 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import SessionFocusPanel from '../components/pomodoro/FocusPanel';
import { getLocalMidnight, getDateKey, parseNoonLocal, normalizeDate } from '../utils/dateHelper';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useActiveContest, usePomodoroState } from '../store/useSelectors';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
    CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle,
    Flame, Sparkles, Lock, Unlock, RotateCcw, Loader2, Target,
    AlertCircle, TrendingUp, Clock, Calendar, BarChart3, Medal,
    Trophy, Activity, BookOpen
} from 'lucide-react';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';
import { countPomodorosToday } from '../utils/analytics';
import { parseTaskDisplay } from '../utils/taskTitleHelper';

// Referências estáticas para evitar loops infinitos em seletores Zustand
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

// =====================================================
// TELEMETRIA EM GRID (CONQUISTAS E TELEMETRIA)
// =====================================================
function DataTriviaPanel({ studyLogs, simulados, categories }) {
    const stats = useMemo(() => {
        const startOfToday = getLocalMidnight().getTime();
        const todayDate = new Date();
        const dayOfWeek = (todayDate.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
        const startOfWeek = startOfToday - (86400000 * dayOfWeek);
        const startOfMonth = startOfToday - (86400000 * 30);

        let weekMins = 0;
        let monthMins = 0;
        let recentSimulados = 0;
        let totalTasks = 0;
        let completedTasks = 0;
        let weekTasks = 0;
        const daysStudied = new Set();

        (studyLogs || []).forEach(log => {
            if (!log || !log.date) return;
            const t = new Date(log.date).getTime();
            if (Number.isNaN(t)) return;
            const mins = Number(log.minutes) || 0;
            if (t >= startOfWeek) weekMins += mins;
            if (t >= startOfMonth) monthMins += mins;
            daysStudied.add(getDateKey(log.date) || new Date(t).toISOString().split('T')[0]);
        });

        (simulados || []).forEach(s => {
            if (!s) return;
            const sDate = s.date || s.createdAt;
            const sTime = sDate ? normalizeDate(sDate)?.getTime() : NaN;
            if (!Number.isNaN(sTime) && sTime >= startOfMonth) recentSimulados++;
        });

        (categories || []).forEach(c => {
            if (!c || !c.tasks) return;
            const safeTasks = Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks);
            safeTasks.forEach(t => {
                if (!t) return;
                totalTasks++;
                if (t.completed) {
                    completedTasks++;
                    const completedTime = (t.completedAt || t.lastStudiedAt) ? new Date(t.completedAt || t.lastStudiedAt).getTime() : NaN;
                    if (!Number.isNaN(completedTime) && completedTime >= startOfWeek) weekTasks++;
                }
            });
        });

        const sortedDays = Array.from(daysStudied).sort();
        let maxStreak = 0;
        let currentStreak = 0;
        let lastDate = null;
        sortedDays.forEach(dayStr => {
            const parsed = parseNoonLocal(dayStr);
            if (!parsed) return;
            const current = parsed.getTime();
            currentStreak = lastDate && Math.round((current - lastDate) / 86400000) === 1 ? currentStreak + 1 : 1;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastDate = current;
        });

        return {
            weekMins,
            monthMins,
            recentSimulados,
            weekTasks,
            maxStreak,
            efficacy: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            hasData: weekMins > 0 || monthMins > 0 || recentSimulados > 0 || totalTasks > 0
        };
    }, [studyLogs, simulados, categories]);

    const fmt = (mins) => {
        const total = Math.max(0, Math.round(Number(mins) || 0));
        const h = Math.floor(total / 60);
        const m = total % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    if (!stats || !stats.hasData) return null;

    const tiles = [
        { icon: <Calendar size={16} className="text-indigo-400" />, label: 'Semana', value: fmt(stats.weekMins), show: stats.weekMins > 0 },
        { icon: <BarChart3 size={16} className="text-cyan-400" />, label: 'Mês', value: fmt(stats.monthMins), show: stats.monthMins > 0 },
        { icon: <Target size={16} className="text-rose-400" />, label: 'Simulados (30 dias)', value: String(stats.recentSimulados), show: stats.recentSimulados > 0 },
        { icon: <Trophy size={16} className="text-yellow-500" />, label: 'Eficácia', value: `${stats.efficacy}%`, show: stats.efficacy > 0 },
        { icon: <Flame size={16} className="text-orange-500" />, label: 'Sequência Máxima', value: `${stats.maxStreak} dias`, show: stats.maxStreak >= 2 },
        { icon: <CheckCircle2 size={16} className="text-emerald-400" />, label: 'Missões na Semana', value: String(stats.weekTasks), show: stats.weekTasks > 0 }
    ].filter(t => t.show).slice(0, 6);

    if (tiles.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden shadow-md">
            <div className="flex justify-between items-center mb-3 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <Medal size={12} />
                    Conquistas e Telemetria
                </p>
                <span className="text-[9px] font-black text-indigo-500/60 uppercase">Central de Dados</span>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
                {tiles.map((tile, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 rounded-xl">
                        <div className="shrink-0">{tile.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold truncate">{tile.label}</p>
                            <p className="text-sm font-black text-cyan-300 truncate">{tile.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =====================================================
// PAINEL DO MENTOR IA
// =====================================================
const DEFAULT_INSIGHT = Object.freeze({
    title: 'Pronto para Foco',
    text: 'Sua mente está pronta. Selecione um objetivo tático abaixo para iniciar.',
    color: 'indigo',
    iconType: 'Brain'
});

function AICoachPanel({ activeSubject, _stats, categories = [], studyLogs = [], simulados = [] }) {
    const insight = useMemo(() => {
        if (!activeSubject) return DEFAULT_INSIGHT;

        const catId = activeSubject.categoryId || activeSubject.catId;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const targetCategory = safeCats.find(c => c && (c.id === catId || c.name === activeSubject.category));

        if (!targetCategory) {
            return {
                title: activeSubject.category || 'Foco Tático',
                text: `Mantenha a concentração em **${activeSubject.task || 'sua meta'}**. Ciclos consistentes constroem retenção profunda.`,
                color: 'indigo',
                iconType: 'Brain'
            };
        }

        try {
            const rawInsight = getCoachInsight(targetCategory, simulados, studyLogs);
            if (rawInsight && !rawInsight.error && rawInsight.text && rawInsight.text !== 'Dados insuficientes para análise.') {
                let color = 'indigo';
                let iconType = 'Brain';
                if (rawInsight.trend > 0.5) {
                    color = 'emerald';
                    iconType = 'Zap';
                } else if (rawInsight.trend < -0.5 || rawInsight.volatility > 15) {
                    color = 'red';
                    iconType = 'Alert';
                }

                return {
                    title: `IA Mentor · ${targetCategory.name || 'Diagnóstico'}`,
                    text: `Desempenho em ${targetCategory.name}: **${rawInsight.text}**. Foco redobrado nesta etapa.`,
                    color,
                    iconType
                };
            }
        } catch {
            // Silently fallback to default subject advice
        }

        return {
            title: `IA Mentor · ${targetCategory.name || 'Foco'}`,
            text: `Alvo ativo: **${activeSubject.task || targetCategory.name}**. Mantenha o ritmo para maximizar retenção.`,
            color: 'indigo',
            iconType: 'Brain'
        };
    }, [activeSubject, categories, studyLogs, simulados]);
    const icons = {
        'Brain': <BrainCircuit size={24} strokeWidth={1.5} />,
        'Zap': <Zap size={24} strokeWidth={1.5} />,
        'Alert': <AlertTriangle size={24} strokeWidth={1.5} />
    };
    const colorMap = {
        red: {
            border: 'border-red-500/30', bg: 'bg-red-500/5', glow: 'shadow-red-500/10',
            text: 'text-red-400', accent: 'bg-red-400', gradient: 'from-red-500/20 via-red-500/5 to-transparent'
        },
        emerald: {
            border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', glow: 'shadow-emerald-500/10',
            text: 'text-emerald-400', accent: 'bg-emerald-400', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        },
        indigo: {
            border: 'border-indigo-500/20', bg: 'bg-slate-800/40', glow: 'shadow-indigo-500/5',
            text: 'text-indigo-300', accent: 'bg-indigo-400', gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent'
        }
    };
    const theme = colorMap[insight?.color] || colorMap.indigo;
    const formatText = (text) => {
        if (!text) return '';
        return text.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className={`font-black text-white ${theme.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>{part}</strong> : part
        );
    };
    return (
        <Motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative rounded-2xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-md p-4 mb-4 overflow-hidden group shadow-lg`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />
            <Motion.div
                animate={{ left: ['-100%', '200%'] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-[50px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50 pointer-events-none z-20 skew-x-[-20deg]"
            />
            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                <div className="relative shrink-0">
                    <Motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full blur-xl ${theme.accent}`}
                    />
                    <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border ${theme.border} bg-slate-900/70 flex items-center justify-center ${theme.text} shadow-inner`}>
                        {icons[insight?.iconType] || <BrainCircuit size={24} />}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
                            <Sparkles size={10} className={`${theme.text} shrink-0`} />
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Mentor Ativo</span>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-white mb-0.5 tracking-tight flex items-center gap-2">
                        <span className="truncate">{insight?.title || 'Pronto para Foco'}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse shrink-0`} />
                    </h3>
                    <div className="text-xs text-slate-300/90 leading-relaxed font-medium">
                        {formatText(insight?.text)}
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}

// =====================================================
// OPÇÃO 1: CENTRAL DE MISSÕES, MENTOR E PRÓXIMAS AÇÕES
// =====================================================
function ActionsAndMentorView({
    categories,
    activeSubject,
    onStartTask,
    stats,
    neuralMode,
    neuralQueue,
    studyLogs,
    simulados
}) {
    const recommendedTask = useMemo(() => {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        if (!safeCats || safeCats.length === 0) return null;
        return getBestTask(safeCats);
    }, [categories]);

    const highPriorityTasks = useMemo(() => {
        const tasks = [];
        const recommendedId = (!activeSubject && recommendedTask) ? (recommendedTask.id || recommendedTask.text) : null;
        const currentTaskId = activeSubject?.taskId;
        if (neuralMode && neuralQueue && neuralQueue.length > 0) {
            const safeQueue = Array.isArray(neuralQueue) ? neuralQueue : Object.values(neuralQueue || {});
            const normalizedQueue = safeQueue.filter(Boolean);
            const currentIndex = normalizedQueue.findIndex(t => (t.id || t.text) === currentTaskId);
            const pendingQueue = currentIndex >= 0 ? normalizedQueue.slice(currentIndex) : normalizedQueue;
            return pendingQueue.map(t => ({
                ...t,
                id: t.id || t.text,
                catName: t.catName || t.category || 'Neural',
                catColor: t.catColor || '#6366f1',
                catIcon: t.catIcon || '⚡'
            }));
        }
        (categories || []).filter(Boolean).forEach(cat => {
            const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            safeTasks.filter(t => t && !t.completed && t.priority === 'high' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });
        if (tasks.length === 0) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed && t.priority === 'medium' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                    tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                });
            });
        }
        return tasks;
    }, [categories, recommendedTask, activeSubject, neuralMode, neuralQueue]);

    const pendingCount = highPriorityTasks.filter(t => (t.id || t.text) !== activeSubject?.taskId).length;

    const visibleTasks = useMemo(() => {
        const base = [...highPriorityTasks];
        const seen = new Set(base.map(t => t?.id || t?.text).filter(Boolean));
        if (base.length < 6) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed).forEach(t => {
                    const normalizedId = t.id || t.text;
                    if (!normalizedId || seen.has(normalizedId) || base.length >= 6 || normalizedId === activeSubject?.taskId) return;
                    base.push({ ...t, id: normalizedId, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                    seen.add(normalizedId);
                });
            });
        }
        return base.slice(0, 6);
    }, [highPriorityTasks, categories, activeSubject]);

    const activeTaskStats = useMemo(() => {
        if (!activeSubject) return null;
        const currentCategory = (categories || []).find(c => c?.id === activeSubject.categoryId);
        const rawTasks = currentCategory?.tasks || [];
        const safeCategoryTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
        const categoryTasks = safeCategoryTasks.filter(Boolean);
        const total = categoryTasks.length;
        const completed = categoryTasks.filter(t => t.completed).length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalMinutes = currentCategory?.totalMinutes || 0;
        const remaining = Math.max(total - completed, 0);
        const currentTask = categoryTasks.find(t => (t.id || t.text) === activeSubject.taskId);
        const isCurrentCompleted = currentTask?.completed || false;
        const gainIfComplete = (total > 0 && !isCurrentCompleted) ? Number((100 / total).toFixed(1)) : 0;
        const quality = completionPct >= 80 ? 'Maestria' : completionPct >= 40 ? 'Evolução' : 'Fase Inicial';
        const hitRate = completionPct;
        const missRate = Math.max(0, 100 - completionPct);
        const highPriorityCount = categoryTasks.filter(t => t.priority === 'high' && !t.completed).length;
        const whySelected = isCurrentCompleted
            ? 'necessidade de retenção de memória (Revisão Espaçada)'
            : activeSubject.priority === 'high'
                ? 'ser um alvo crítico de alto impacto'
                : 'apresentar alta sinergia com o seu ritmo atual';
        const improveText = remaining > 0
            ? `Domine mais ${Math.min(remaining, 3)} assunto(s) para expandir seu domínio na matéria.`
            : 'Domínio quase absoluto da matéria. Excelente oportunidade para transição ou revisão profunda.';
        const statusVariants = [];
        if (completionPct < 40) {
            statusVariants.push(`Fase de ignição: Cada assunto concluído gera um impacto de +${gainIfComplete}% na base da matéria.`);
            if (highPriorityCount > 0) statusVariants.push(`Estratégia Alpha: Focar nos ${highPriorityCount} assuntos críticos desta matéria trará o maior ROI de esforço.`);
        } else if (completionPct < 80) {
            statusVariants.push(`Ponto de inflexão: Você já dominou ${hitRate}% da matéria. Acelere para cruzar a barreira da excelência.`);
            statusVariants.push(`Análise em tempo real: Restam ${remaining} assuntos nesta matéria. Mantenha o fluxo para aniquilar a lacuna de ${missRate}%.`);
        } else {
            statusVariants.push(`Alta performance: Com ${hitRate}% de domínio da matéria, você está na fase de refinamento e maestria.`);
            statusVariants.push(`Retenção máxima: Seu nível atual nesta matéria reduz drasticamente a curva de esquecimento.`);
        }
        if (highPriorityCount > 0 && statusVariants.length < 3) {
            statusVariants.push(`Radar tático: Detectamos ${highPriorityCount} assunto(s) de prioridade máxima ainda em aberto nesta matéria.`);
        }
        statusVariants.push(`Mapeamento: Seu fluxo nesta matéria já converteu ${hitRate}% de ruído em conhecimento estruturado.`);
        const variantSeed = String(activeSubject.taskId || activeSubject.task || '').length + completed + total;
        const statusLine = statusVariants[variantSeed % statusVariants.length];
        return {
            total, completed, completionPct, gainIfComplete, quality, whySelected, improveText, hitRate, missRate, statusLine,
            categoryName: currentCategory?.name || 'Desconhecida',
            totalMinutes,
            topic: activeSubject.task
        };
    }, [activeSubject, categories]);

    const cleanTaskText = (rawText, catName) => {
        const result = parseTaskDisplay(rawText, catName);
        return {
            displayTopic: result.displayTopic || 'Revisão Geral',
            secondaryText: result.secondaryText || ''
        };
    };

    const safeCatName = (name) => {
        const n = String(name || '').trim();
        if (!n) return 'Categoria';
        if (/^[A-Za-z0-9_-]{8,}$/.test(n)) return 'Categoria';
        return n;
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <AICoachPanel
                activeSubject={activeSubject}
                stats={stats}
                categories={categories}
                studyLogs={studyLogs}
                simulados={simulados}
            />
            <DataTriviaPanel studyLogs={studyLogs} simulados={simulados} categories={categories} />

            {activeTaskStats && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 relative overflow-hidden group/stats shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover/stats:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2 truncate pr-2">
                            <Target size={12} className="shrink-0" />
                            <span className="truncate">Matéria: {activeTaskStats.categoryName}</span>
                        </p>
                        <span className="text-[10px] font-black text-cyan-500/50 bg-cyan-500/10 px-2 py-0.5 rounded-md shrink-0">
                            {activeTaskStats.completionPct}% Completo
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-cyan-950 rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${activeTaskStats.completionPct}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed relative z-10">
                        <span className="block mb-1">
                            <strong className="text-cyan-300">Assunto atual:</strong> {cleanTaskText(activeTaskStats.topic, activeTaskStats.categoryName).displayTopic || 'Missão em Aberto'}
                        </span>
                        <span>
                            O <strong>assunto</strong> foi escolhido por {activeTaskStats.whySelected}. Progresso da <strong>matéria</strong>: <strong>{activeTaskStats.completionPct}%</strong> ({activeTaskStats.completed}/{activeTaskStats.total}).
                            {activeTaskStats.gainIfComplete > 0 ? (
                                <> Impacto na matéria ao concluir: <strong className="text-emerald-400">+{activeTaskStats.gainIfComplete}%</strong>.</>
                            ) : (
                                <> Sessão de revisão focada: <strong className="text-emerald-400">Manutenção de retenção</strong>.</>
                            )}
                        </span>
                    </p>
                    <div className="mt-3 relative z-10">
                        <p className="text-xs text-slate-400">
                            Nível da matéria: <strong className="text-white capitalize">{activeTaskStats.quality}</strong>. {activeTaskStats.improveText}
                        </p>
                        <p className="text-xs text-cyan-300/80 mt-1">{activeTaskStats.statusLine}</p>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1.5 text-xs" title="Domínio da matéria"><CheckCircle2 size={12} className="text-emerald-500" /> <strong className="text-slate-200">{activeTaskStats.hitRate}%</strong> Domínio</span>
                            <span className="flex items-center gap-1.5 text-xs" title="Lacuna na matéria"><AlertCircle size={12} className="text-amber-500" /> <strong className="text-slate-200">{activeTaskStats.missRate}%</strong> Lacuna</span>
                            {activeTaskStats.totalMinutes > 0 && (
                                <span className="flex items-center gap-1.5 text-xs" title="Tempo dedicado à matéria"><Clock size={12} className="text-cyan-500" /> <strong className="text-slate-200">{Math.round(activeTaskStats.totalMinutes)}m</strong> na Matéria</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {recommendedTask && !activeSubject && (
                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 rounded-2xl bg-[#11131f] border border-indigo-500/20 shadow-lg relative group/card overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover/card:scale-110 group-hover/card:opacity-20 transition-all">
                        <Zap size={64} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                        <span className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold uppercase tracking-widest">
                            ⚡ Recomendado pela IA
                        </span>
                        {recommendedTask.priority === 'high' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-widest shrink-0">
                                Prioridade Alta
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-tight relative z-10">
                        {(() => {
                            const recInfo = cleanTaskText(recommendedTask.text || recommendedTask.title, recommendedTask.catName || recommendedTask.category);
                            return recInfo.displayTopic || 'Missão de Alto Impacto';
                        })()}
                    </h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed relative z-10">
                        Baseado na sua performance e histórico, esta meta oferece a melhor janela de retenção agora.
                    </p>
                    <button
                        type="button"
                        onClick={() => onStartTask(recommendedTask, null, 'neural_core')}
                        className="w-full relative overflow-hidden py-3 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] active:scale-[0.985] group/btn z-10"
                    >
                        <span className="absolute inset-0 w-full h-full -ml-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite] skew-x-[-20deg]" />
                        INICIAR AGORA
                        <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-white/5 border border-white/10 shrink-0 text-slate-400">
                                {recommendedTask.catIcon || '📚'}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
                                {safeCatName(recommendedTask.catName || recommendedTask.category)}
                            </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400/60 tracking-widest uppercase shrink-0">Eficácia Máxima</span>
                    </div>
                </Motion.div>
            )}

            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 backdrop-blur-md relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-500/50" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Próximas Ações</p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/5 px-2.5 py-0.5 rounded-md">
                            {pendingCount} pendentes
                        </span>
                    )}
                </div>
                {visibleTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white/[0.015] rounded-2xl border border-white/5">
                        <CheckCircle2 size={28} className="text-emerald-500/40 mb-3" />
                        <p className="text-xs font-bold text-slate-300 tracking-tight">Nenhuma ação pendente</p>
                        <p className="text-[9px] text-slate-500 mt-1">Todas as missões neurais completas ou em foco.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                        {visibleTasks.filter(Boolean).map((task, idx) => {
                            const taskId = task.id || task.text || `fallback-task-${idx}`;
                            const categoryName = safeCatName(task.catName || task.category);
                            const isActive = activeSubject?.taskId === taskId;
                            const { displayTopic, secondaryText } = cleanTaskText(task.text || task.title, categoryName);
                            return (
                                <Motion.button
                                    key={`task-${taskId}-${idx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => onStartTask(task, null, 'neural_core')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group text-left relative overflow-hidden ${isActive
                                        ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
                                        : 'bg-white/[0.015] border-transparent hover:bg-white/[0.03] hover:border-white/5'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-indigo-500/30'}`} />
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: `${task.catColor || '#ffffff'}15`, border: `1px solid ${task.catColor || '#ffffff'}30` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-amber-400' : 'text-slate-300 group-hover:text-white transition-colors'}`}>
                                            {displayTopic || 'Missão em Aberto'}
                                        </p>
                                        {secondaryText && (
                                            <p className="text-[9px] text-slate-500 truncate mt-0.5 font-medium">{secondaryText}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[8px] text-slate-500/80 font-medium uppercase tracking-widest">{categoryName}</p>
                                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-amber-500/80' : 'text-slate-600'}`}>• {isActive ? 'Em foco agora' : `Ação #${idx + 1}`}</p>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <div className="flex flex-col items-center gap-0.5 opacity-80">
                                            <Flame size={14} className="text-amber-500" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                            <ChevronRight size={12} className="text-slate-400" />
                                        </div>
                                    )}
                                </Motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// =====================================================
// PAINEL LATERAL UNIFICADO COM AS DUAS OPÇÕES DE VISUALIZAÇÃO
// =====================================================
function PomodoroSidePanel({
    activeTab,
    setActiveTab,
    categories,
    activeSubject,
    onStartTask,
    stats,
    neuralMode,
    neuralQueue,
    studyLogs,
    simulados,
    user,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    targetCycles,
    completedCycles,
    isLayoutLocked,
    onToggleLock
}) {
    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelPosition');
            return saved !== null && saved !== 'undefined' ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });
    const uiPosRef = useRef(uiPosition);
    useEffect(() => { uiPosRef.current = uiPosition; }, [uiPosition]);
    useEffect(() => {
        return () => {
            // Cleanup: garantir que o ref não aponta para um valor stale
            uiPosRef.current = { x: 0, y: 0 };
        };
    }, []);

    useEffect(() => {
        const checkPos = () => {
            const currentPos = uiPosRef.current;
            if (currentPos.x !== 0 || currentPos.y !== 0) {
                const limitX = window.innerWidth - 100;
                const limitY = window.innerHeight - 100;
                if (Math.abs(currentPos.x) > limitX || Math.abs(currentPos.y) > limitY) {
                    setUiPosition({ x: 0, y: 0 });
                    localStorage.removeItem('focusPanelPosition');
                }
            }
        };
        window.addEventListener('resize', checkPos);
        return () => window.removeEventListener('resize', checkPos);
    }, []);

    const handleDragEnd = (_, info) => {
        const newPos = { x: uiPosition.x + info.offset.x, y: uiPosition.y + info.offset.y };
        setUiPosition(newPos);
        try {
            localStorage.setItem('focusPanelPosition', JSON.stringify(newPos));
        } catch (err) {
            console.warn("[PomodoroSidePanel] Falha ao salvar posição:", err);
        }
    };

    const resetPosition = () => {
        setUiPosition({ x: 0, y: 0 });
        localStorage.removeItem('focusPanelPosition');
    };

    // Contagem de pendências para o badge do tab de ações
    const pendingCount = useMemo(() => {
        let count = 0;
        (categories || []).forEach(cat => {
            const safeTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
            safeTasks.forEach(t => {
                if (t && !t.completed && t.priority === 'high' && (t.id || t.text) !== activeSubject?.taskId) {
                    count++;
                }
            });
        });
        return count;
    }, [categories, activeSubject]);

    return (
        <Motion.div
            drag={!isLayoutLocked}
            dragMomentum={false}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.01, zIndex: 100 }}
            className={`flex flex-col w-full relative group p-3.5 sm:p-4 bg-[#08090f]/75 border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl xl:max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* CABEÇALHO DO PAINEL LATERAL (INTEGRADO, FLUIDO E SEMPRE ACESSÍVEL) */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                        Painel Tático
                    </span>
                    {!isLayoutLocked ? (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                            Móvel
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                            Fixo
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {!isLayoutLocked && (uiPosition.x !== 0 || uiPosition.y !== 0) && (
                        <button
                            type="button"
                            onClick={resetPosition}
                            className="px-2 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-white/10 hover:text-white hover:bg-slate-800 transition-all text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow"
                            title="Restaurar posição original"
                        >
                            <RotateCcw size={10} />
                            <span>Resetar</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggleLock}
                        className={`p-1.5 rounded-xl transition-all border flex items-center justify-center shadow backdrop-blur-md ${isLayoutLocked
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        title={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel na posição"}
                        aria-label={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel na posição"}
                    >
                        {isLayoutLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </div>
            </div>

            {/* TAB SELECTOR: DUAS OPÇÕES DE VISUALIZAÇÃO */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-white/10 rounded-2xl mb-3.5 shadow-inner">
                <button
                    type="button"
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'actions'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <Zap size={14} className={activeTab === 'actions' ? 'text-amber-300' : 'text-indigo-400'} />
                    <span>Missões & Mentor</span>
                    {pendingCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${activeTab === 'actions'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}>
                            {pendingCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('telemetry')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'telemetry'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <Activity size={14} className={activeTab === 'telemetry' ? 'text-white' : 'text-cyan-400'} />
                    <span>Telemetria da Sessão</span>
                    {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                </button>
            </div>

            {/* CONTEÚDO DA VISUALIZAÇÃO SELECIONADA */}
            <AnimatePresence mode="wait">
                {activeTab === 'actions' ? (
                    <Motion.div
                        key="view-actions"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="w-full"
                    >
                        <ActionsAndMentorView
                            categories={categories}
                            activeSubject={activeSubject}
                            onStartTask={onStartTask}
                            stats={stats}
                            neuralMode={neuralMode}
                            neuralQueue={neuralQueue}
                            studyLogs={studyLogs}
                            simulados={simulados}
                        />
                    </Motion.div>
                ) : (
                    <Motion.div
                        key="view-telemetry"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="w-full"
                    >
                        <SessionFocusPanel
                            activeSubject={activeSubject}
                            categories={categories}
                            studyLogs={studyLogs}
                            user={user}
                            mode={mode}
                            isRunning={isRunning}
                            timeLeft={timeLeft}
                            totalTime={totalTime}
                            targetCycles={targetCycles}
                            completedCycles={completedCycles}
                        />
                    </Motion.div>
                )}
            </AnimatePresence>
        </Motion.div>
    );
}

// =====================================================
// =====================================================
// BARRA SUPERIOR DO CRONÔMETRO (COMPACTA, ELEGANTE E PERFEITAMENTE ENQUADRADA)
// =====================================================
function PomodoroTopBar({ activeSubject, neuralMode, isLayoutLocked, onToggleLock }) {
    const cleanText = (text) => parseTaskDisplay(text, activeSubject?.category);

    return (
        <div className="w-full rounded-2xl border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-5 py-2.5 sm:py-3 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />
            <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#2d1a12]/10 border border-[#2d1a12]/20 flex items-center justify-center shrink-0 shadow-inner">
                        {activeSubject ? <Target size={20} className="text-[#2d1a12]" /> : <Zap size={20} className="text-[#2d1a12]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#2d1a12]/85 truncate">
                                {activeSubject?.category || 'SISTEMA'}
                            </span>
                            <div className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse shrink-0 shadow-sm" />
                        </div>
                        <h1 className="text-sm sm:text-base lg:text-lg font-black text-[#2d1a12] tracking-tight leading-tight truncate" title={activeSubject ? (cleanText(activeSubject.task)?.displayTopic || 'Missão Ativa') : 'Aguardando protocolo...'}>
                            {activeSubject ? (cleanText(activeSubject.task)?.displayTopic || 'Missão Ativa') : 'Aguardando protocolo...'}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest border border-[#2d1a12]/30 bg-[#2d1a12]/10 text-[#2d1a12] shadow-sm">
                        {neuralMode ? 'NEURAL' : 'MANUAL'}
                    </span>
                    <button
                        type="button"
                        onClick={onToggleLock}
                        className={`p-1.5 sm:p-2 rounded-lg border transition-all shadow-sm ${isLayoutLocked ? 'bg-[#2d1a12]/10 border-[#2d1a12]/20 text-[#2d1a12]/60 hover:text-[#2d1a12]' : 'bg-[#2d1a12]/20 border-[#2d1a12]/40 text-[#2d1a12]'}`}
                        title={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel"}
                    >
                        {isLayoutLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// COMPONENTE PRINCIPAL POMODORO
// =====================================================
export default function Pomodoro() {
    const activeId = useAppStore(state => state.appState?.activeId);
    const contest = useActiveContest() || EMPTY_OBJECT;
    const rawCategories = contest.categories || EMPTY_ARRAY;
    const categories = React.useMemo(() => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })), [rawCategories]);
    const settings = contest.settings || EMPTY_OBJECT;
    const rawStudyLogs = contest.studyLogs || EMPTY_ARRAY;
    const studyLogs = React.useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const rawSimulados = contest.simulados || EMPTY_ARRAY;
    const simulados = React.useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);
    const user = contest.user || null;

    const isHydrated = !!activeId && contest !== EMPTY_OBJECT;

    const setData = useAppStore(state => state.setData);
    const handleUpdateStudyTime = useAppStore(state => state.handleUpdateStudyTime);
    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();
    const completionTimeoutRef = React.useRef(null);
    const pomodoroState = usePomodoroState();
    const activeSubject = pomodoroState.activeSubject;
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);
    const completedCycles = pomodoroState.completedCycles ?? 0;
    const accumulatedMinutes = pomodoroState.accumulatedMinutes ?? 0;
    const unloggedCycles = accumulatedMinutes > 0 ? completedCycles : 0;
    const neuralMode = pomodoroState.neuralMode;
    const neuralQueue = pomodoroState.neuralQueue || EMPTY_ARRAY;
    const entrySourceRef = useRef(location.state?.from || 'pomodoro');
    const topRef = useRef(null);
    const [liveTimerState, setLiveTimerState] = useState(null);

    // Estado do Tab do Painel Lateral (Missões & Mentor vs Telemetria)
    const [activeSideTab, setActiveSideTab] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroSideTab');
            return saved === 'telemetry' ? 'telemetry' : 'actions';
        } catch {
            return 'actions';
        }
    });

    const handleTabChange = (newTab) => {
        setActiveSideTab(newTab);
        try {
            localStorage.setItem('pomodoroSideTab', newTab);
        } catch (e) {
            console.warn('[Pomodoro] Falha ao persistir tab lateral:', e);
        }
    };

    useEffect(() => {
        if (location.state?.from) {
            entrySourceRef.current = location.state.from;
        }
    }, [location.state?.from]);

    useEffect(() => {
        // Garantir que a tela do cronômetro seja perfeitamente enquadrada a partir do topo
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (topRef.current) {
            const mainContainer = topRef.current.closest('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId]);

    const resolveReturnPath = (source, forceDashboard = false) => {
        if (forceDashboard) return '/';
        const normalized = String(source || '').replace(/^\/+/, '');
        if (!normalized || normalized === 'pomodoro' || normalized === 'neural_core' || normalized === 'side_panel') {
            return '/pomodoro';
        }
        if (normalized === 'dashboard' || normalized === 'dashboard_selector') {
            return '/';
        }
        return `/${normalized}`;
    };

    const resolveSessionSource = (subjectSource) => {
        const entry = String(entrySourceRef.current || '').replace(/^\/+/, '');
        const subject = String(subjectSource || '').replace(/^\/+/, '');
        if (entry === 'dashboard') return 'dashboard';
        return subject || entry || 'pomodoro';
    };

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.error('Failed to parse pomodoroLayoutLocked:', error);
            return true;
        }
    });

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'pomodoroLayoutLocked') {
                try {
                    setIsLayoutLocked(JSON.parse(e.newValue) ?? true);
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const toggleLayoutLock = () => {
        const newState = !isLayoutLocked;
        setIsLayoutLocked(newState);
        try {
            localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
            localStorage.setItem('focusPanelLocked', JSON.stringify(newState));
        } catch (err) {
            console.warn('[Pomodoro] Falha ao salvar pomodoroLayoutLocked:', err);
            try {
                sessionStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
            } catch { /* ignore */ }
        }
    };

    const userStats = useMemo(() => {
        if (!contest || contest === EMPTY_OBJECT) {
            return {
                pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, unloggedCycles),
                consecutiveMinutes: 0,
                settings: null
            };
        }

        const now = new Date();
        const startOfToday = getLocalMidnight().getTime();
        let consecutiveStudyMinutes = 0;

        const recentLogs = [...(studyLogs || [])]
            .filter(log => log && log.date && new Date(log.date).getTime() >= startOfToday)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let lastTimeBoundary = now.getTime();

        for (const log of recentLogs) {
            const logDate = new Date(log.date).getTime();
            const minutes = Number(log.minutes) || 0;
            if (!logDate || minutes <= 0) continue;

            const boundary = log.endDate ? new Date(log.endDate).getTime() : logDate;
            const gapInMinutes = Math.max(0, (lastTimeBoundary - boundary) / (1000 * 60));
            if (gapInMinutes > 90) {
                break;
            }

            consecutiveStudyMinutes += minutes;
            const sessionStartTime = log.endDate ? logDate : (logDate - (minutes * 60 * 1000));
            lastTimeBoundary = sessionStartTime;
        }

        return {
            pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, unloggedCycles),
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: settings,
            user: user
        };
    }, [unloggedCycles, contest, studyLogs, settings, user]);

    useEffect(() => {
        if (!activeSubject && location.state?.categoryId && location.state?.taskId) {
            const cat = (categories || []).find(c => c && c.id === location.state.categoryId);
            const tsk = (cat?.tasks || []).find(t => t && t.id === location.state.taskId);
            if (cat && tsk) {
                navigate(location.pathname, { replace: true, state: null });
                useAppStore.getState().startPomodoroSession({
                    categoryId: cat.id,
                    taskId: tsk.id,
                    category: cat.name,
                    task: tsk.title || tsk.text || 'Estudo',
                    priority: tsk.priority,
                    source: location.state?.from || 'dashboard'
                });
            }
        }
    }, [location.state, location.pathname, categories, activeSubject, navigate]);

    useEffect(() => {
        let timeoutId;
        if (!isHydrated) {
            timeoutId = setTimeout(() => {
                showToast('Contexto pendente. Retornando ao Dashboard...', 'warning');
                navigate('/');
            }, 6000);
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [isHydrated, navigate, showToast]);

    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

    useEffect(() => {
        return () => { if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current); };
    }, []);

    const handleExit = useCallback((options = {}) => {
        const subjectSnapshot = options._subjectSnapshot || activeSubjectRef.current;
        const currentSource = options.source || resolveSessionSource(subjectSnapshot?.source);

        if (subjectSnapshot) {
            setData(prev => {
                const rawCats = prev.categories;
                const catsArray = Array.isArray(rawCats) ? rawCats : Object.values(rawCats || {});
                return {
                    ...prev,
                    categories: catsArray.map(c => c.id === subjectSnapshot.categoryId ? {
                        ...c,
                        tasks: (Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})).map(t => t.id === subjectSnapshot.taskId ? { ...t, status: 'idle' } : t)
                    } : c)
                };
            });
        }

        setPomodoroActiveSubject(null);
        try {
            localStorage.removeItem('pomodoroState');
        } catch {
            // ignore
        }
        const returnPath = resolveReturnPath(currentSource, Boolean(options.forceDashboard));
        navigate(returnPath, { replace: Boolean(options.forceDashboard) });
    }, [setData, setPomodoroActiveSubject, navigate]);

    const handleStartTask = (task, forcedSessionId = null, source = 'pomodoro') => {
        const sessionId = forcedSessionId || Date.now().toString();
        const pomodoroState = useAppStore.getState().appState?.pomodoro || {};
        const effectiveSource = (pomodoroState.neuralMode && source !== 'dashboard') ? 'neural_core' : source;
        const taskId = task?.id || task?.text;
        if (!taskId) return;

        let catId = task.catId || task.categoryId;
        let catName = task.catName || task.category;
        if (!catId) {
            const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
            const foundCat = safeCats.find(c => {
                const tasks = Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {});
                return tasks.some(t => (t?.id || t?.text) === taskId);
            });
            if (foundCat) {
                catId = foundCat.id;
                if (!catName) catName = foundCat.name;
            }
        }

        if (effectiveSource === 'neural_core' && !pomodoroState.neuralMode) {
            const highPriority = [];
            categories.forEach(cat => {
                (cat.tasks || []).filter(t => !t.completed && t.priority === 'high').forEach(t => {
                    highPriority.push({ ...t, id: t.id || t.text, categoryId: cat.id, catName: cat.name });
                });
            });
            const queue = [...highPriority];
            let startIndex = queue.findIndex(t => (t.id || t.text) === taskId);
            if (startIndex === -1) {
                queue.unshift({ ...task, id: taskId, categoryId: catId, catName: catName });
                startIndex = 0;
            }
            useAppStore.getState().startNeuralSession(queue, startIndex);
        } else {
            useAppStore.getState().setPomodoroActiveSubject({
                categoryId: catId,
                taskId,
                category: catName,
                task: task.text || task.title || 'Estudo',
                priority: task.priority,
                source: effectiveSource,
                sessionInstanceId: sessionId
            });
        }
    };

    const handleFullCycleComplete = (totalMinutes = 0, wasNatural = true) => {
        const currentSubject = activeSubject || useAppStore.getState().appState?.pomodoro?.activeSubject;
        const { neuralMode } = useAppStore.getState().appState?.pomodoro || {};
        const store = useAppStore.getState();

        if (currentSubject) {
            if (wasNatural) {
                showToast(`Série finalizada! ${totalMinutes} minutos salvos no histórico. 🚀💎`, 'success');
            } else {
                showToast(`Série concluída! ${totalMinutes} minutos salvos no histórico. ⚡`, 'info');
            }
            store.setPomodoroAccumulatedMinutes(0);

            const activeData = store.appState.contests[store.appState.activeId];

            if (neuralMode || currentSubject.source === 'neural_core') {
                store.toggleNeuralTask(currentSubject.taskId);
                showToast(`Status: "${currentSubject.task}" concluído! ✅`, 'success');
            } else {
                const rawCats = activeData?.categories || [];
                const safeCats = Array.isArray(rawCats) ? rawCats : Object.values(rawCats);
                const cat = safeCats.find(c => c && c.id === currentSubject.categoryId);
                const catTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
                const task = catTasks.find(t => t && (t.id || t.text) === currentSubject.taskId);
                if (task && !task.completed) {
                    store.toggleTask(currentSubject.categoryId, currentSubject.taskId);
                    showToast(`Status: "${task.title || task.text}" concluído! ✅`, 'success');
                }
            }

            if (neuralMode || currentSubject.source === 'neural_core') {
                const hasNext = store.advanceNeuralQueue();
                if (hasNext) {
                    showToast(`Sequenciando próxima meta do painel... ⚡`, 'info');
                    return;
                } else {
                    showToast('Todas as ações concluídas! Progresso salvo. 🏆', 'success');
                    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
                    completionTimeoutRef.current = setTimeout(() => {
                        useAppStore.getState().setPomodoroActiveSubject(null);
                    }, 1000);
                    return;
                }
            }

            const sourceAfterFinish = resolveSessionSource(currentSubject?.source);
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = setTimeout(() => {
                const returnPath = resolveReturnPath(sourceAfterFinish, false);
                if (returnPath === '/pomodoro') {
                    showToast('Sessão finalizada! Selecione sua próxima meta.', 'info');
                    setPomodoroActiveSubject(null);
                    return;
                }
                showToast('Sessão finalizada! Retornando ao menu de origem...', 'info');
                handleExit({ source: sourceAfterFinish, _subjectSnapshot: currentSubject });
            }, 1000);
            return;
        } else {
            store.setPomodoroAccumulatedMinutes(0);
            handleExit();
        }
    };

    const handleSessionComplete = () => {
        setData(prev => ({
            ...prev,
            lastPomodoroDate: new Date().toISOString()
        }));
    };

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center p-12 min-h-screen bg-[#0a0f1e]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Sistema Neural...</p>
                    <p className="text-slate-600 font-medium text-[9px] text-center mt-2 max-w-[250px]">
                        Autenticando parâmetros de foco.<br />Se não escolheu uma tarefa, voltaremos ao Dashboard em breve.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Pomodoro">
            <div ref={topRef} className="min-h-0 flex items-start justify-center pt-0.5 sm:pt-1 pb-2 sm:pb-3 px-2 sm:px-4">
                <div className="flex flex-col xl:flex-row gap-3.5 sm:gap-4 lg:gap-5 items-start justify-center w-full max-w-[1180px] xl:max-w-[1280px] 2xl:max-w-[1360px] mx-auto">
                    {/* COLUNA 1: CONSOLE DO CRONÔMETRO POMODORO (PERFEITAMENTE ENQUADRADO) */}
                    <div className="w-full xl:w-[480px] 2xl:w-[510px] flex-shrink-0 flex flex-col items-center gap-1 min-w-0">
                        <PomodoroTopBar
                            activeSubject={activeSubject}
                            neuralMode={neuralMode}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                        />
                        <PomodoroTimer
                            settings={settings}
                            activeSubject={activeSubject}
                            categories={categories || []}
                            onUpdateStudyTime={handleUpdateStudyTime}
                            onExit={handleExit}
                            onSessionComplete={handleSessionComplete}
                            onFullCycleComplete={handleFullCycleComplete}
                            onTimerStateChange={setLiveTimerState}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                            defaultTargetCycles={1}
                            key={activeSubject?.sessionInstanceId || 'idle'}
                        />
                    </div>

                    {/* COLUNA 2: PAINEL LATERAL COM AS DUAS OPÇÕES DE VISUALIZAÇÃO */}
                    <div className="w-full xl:w-[400px] 2xl:w-[440px] flex-shrink-0 min-w-0">
                        <PomodoroSidePanel
                            activeTab={activeSideTab}
                            setActiveTab={handleTabChange}
                            categories={categories || []}
                            activeSubject={activeSubject}
                            onStartTask={handleStartTask}
                            stats={userStats}
                            neuralMode={neuralMode}
                            neuralQueue={neuralQueue}
                            studyLogs={studyLogs}
                            simulados={simulados}
                            user={user}
                            mode={liveTimerState?.mode || pomodoroState.mode || 'work'}
                            isRunning={liveTimerState !== null ? liveTimerState.isRunning : (pomodoroState.isRunning || false)}
                            timeLeft={liveTimerState !== null ? liveTimerState.timeLeft : (pomodoroState.timeLeft || (settings?.pomodoroWork || 25) * 60)}
                            totalTime={liveTimerState?.totalTime || (settings?.pomodoroWork || 25) * 60}
                            targetCycles={liveTimerState?.targetCycles || pomodoroState.targetCycles || 1}
                            completedCycles={liveTimerState?.completedCycles ?? pomodoroState.completedCycles ?? 0}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                        />
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}

```

---

### Arquivo: `src/pages/Retention.jsx`
*Linhas: 210 | Tamanho: 9.4 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useState, useRef, useCallback } from 'react';
import RetentionPanel from '../components/RetentionPanel';
import { AnaliseRetencaoChart } from '../components/charts/Analytics/AnaliseRetencaoChart';
import { mapRetentionData } from '../utils/chartDataMappers';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { BookOpen, Play } from 'lucide-react';
import DueForecast from '../components/DueForecast';
import ConfirmModal from '../components/ConfirmModal';
import { getFlashcardDueTodayCount, getFlashcardMasteryPct, getFlashcardTotalCards, getFlashcardDeckCount } from '../utils/analytics';
import { normalizeArray, toFiniteNumber } from '../utils/retentionCore';

export default function Retention() {
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: ''
    });

    // useRef para evitar stale closure no callback do modal
    const pendingCategoryRef = useRef(null);

    const categories = useAppStore(useShallow(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        const rawCategories = activeContest?.categories || [];
        return normalizeArray(rawCategories).filter(cat => cat && (cat.id || cat.name));
    }));

    const flashcardDecks = useAppStore(useShallow(state => {
        const activeContest = state.appState?.contests?.[state.appState?.activeId];
        const rawDecks = activeContest?.flashcardDecks || [];
        return normalizeArray(rawDecks).filter(Boolean);
    }));

    const safeDecks = useMemo(() => normalizeArray(flashcardDecks).map(deck => ({
        ...deck,
        cards: normalizeArray(deck?.cards)
    })), [flashcardDecks]);

    const navigate = useNavigate();
    const showToast = useToast();
    const startPomodoroSession = useAppStore(state => state.startPomodoroSession);

    const chartData = useMemo(() => mapRetentionData(categories), [categories]);

    const srsIndicators = useMemo(() => {
        const totalCards = getFlashcardTotalCards(safeDecks);
        const due = getFlashcardDueTodayCount(safeDecks);
        const mastery = getFlashcardMasteryPct(safeDecks);

        const reviews = safeDecks.reduce((sum, deck) => {
            return sum + normalizeArray(deck?.cards).reduce((acc, card) => {
                return acc + Math.max(0, toFiniteNumber(card?.reviews, 0));
            }, 0);
        }, 0);

        return {
            decks: getFlashcardDeckCount(safeDecks),
            cards: totalCards,
            dueToday: due,
            mastery,
            totalReviews: reviews
        };
    }, [safeDecks]);

    const closeConfirmModal = useCallback(() => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        pendingCategoryRef.current = null;
    }, []);

    const handleConfirmSession = useCallback(() => {
        const cat = pendingCategoryRef.current;

        closeConfirmModal();

        if (!cat?.id) {
            showToast('Categoria inválida para retenção.', 'warning');
            return;
        }

        const taskName = cat.selectedTask
            ? (cat.selectedTask.title || cat.selectedTask.text || 'Estudo')
            : cat.name;

        try {
            if (typeof startPomodoroSession !== 'function') {
                showToast('Sessão de estudo indisponível no momento.', 'error');
                return;
            }
            if (cat.selectedTask) {
                startPomodoroSession({
                    categoryId: cat.id,
                    taskId: cat.selectedTask.id || cat.selectedTask.text || `task-${cat.id}`,
                    category: cat.name,
                    task: taskName,
                    priority: cat.selectedTask.priority || 'normal',
                    source: 'retention'
                });
            } else {
                startPomodoroSession({
                    categoryId: cat.id,
                    taskId: cat.id || `cat-${cat.name}`,
                    category: cat.name,
                    task: `${cat.name}: Revisão Geral`,
                    priority: 'normal',
                    source: 'retention'
                });
            }

            navigate('/pomodoro');
        } catch (err) {
            console.error('Erro ao iniciar sessão de estudo:', err);
            showToast('Não foi possível iniciar a sessão de estudo.', 'error');
        }
    }, [closeConfirmModal, startPomodoroSession, navigate, showToast]);

    const handleSelectCategory = (cat) => {
        if (!cat?.id) {
            showToast('Categoria inválida para retenção.', 'warning');
            return;
        }

        const taskName = cat.selectedTask
            ? (cat.selectedTask.title || cat.selectedTask.text || 'Estudo')
            : cat.name;

        pendingCategoryRef.current = cat;
        setConfirmModal({
            isOpen: true,
            title: 'Iniciar Sessão de Estudo',
            message: `Iniciar sessão de estudo para "${taskName}"?`
        });
    };

    return (<PageErrorBoundary pageName="Retenção">
        <div className="space-y-6">
            <div className="tour-step-10">
                <RetentionPanel
                    categories={categories}
                    onSelectCategory={handleSelectCategory}
                />
            </div>
            
            <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-100/5 dark:bg-slate-900/40 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/5">
                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-white uppercase tracking-widest">Análise de Decaimento Cronológico</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">Relatório Comparativo: Tempo vs Retenção de Memória</p>
                    </div>
                </div>
                <AnaliseRetencaoChart data={chartData} />
            </div>

            {/* Flashcards SRS como Indicador de Retenção */}
            {srsIndicators.cards > 0 && (
                <div className="glass p-5 rounded-3xl border border-amber-500/20 bg-amber-950/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <BookOpen size={18} className="text-amber-400" />
                        </div>
                        <div className="font-black text-white">SRS Flashcards — Indicador de Retenção Ativa</div>
                        <div className="ml-auto text-xs text-amber-400">{srsIndicators.decks} decks · {srsIndicators.cards} cartões</div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <div className="uppercase text-[10px] text-slate-500">Revisões Acumuladas</div>
                            <div className="text-2xl font-black text-amber-300">{srsIndicators.totalReviews}</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <div className="uppercase text-[10px] text-slate-500">Domínio (Mastery)</div>
                            <div className="text-2xl font-black text-emerald-400">{srsIndicators.mastery}%</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10">
                            <div className="uppercase text-[10px] text-slate-500">A Revisar Hoje</div>
                            <div className={`text-2xl font-black ${srsIndicators.dueToday ? 'text-orange-400' : 'text-emerald-400'}`}>{srsIndicators.dueToday}</div>
                        </div>
                        <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-xs flex items-center">
                            {srsIndicators.dueToday > 0 ? 'Use a Repetição Espaçada para combater o esquecimento ativo.' : 'Parabéns — sua curva de retenção SRS está saudável.'}
                        </div>
                    </div>
                </div>
            )}

            {/* NOVA FEATURE: Previsão de Cartões a Vencer (Due Forecast) */}
            <DueForecast decks={safeDecks} horizon={14} />
        </div>

        {/* Custom Confirmation Modal */}
        <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={closeConfirmModal}
            onConfirm={handleConfirmSession}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText="Iniciar Sessão"
            cancelText="Cancelar"
            type="primary"
            icon={Play}
        />
    </PageErrorBoundary>);
}



```

---

### Arquivo: `src/pages/Sessions.jsx`
*Linhas: 47 | Tamanho: 2.0 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React from 'react';
import StudyHistory from '../components/StudyHistory';
import { useAppStore } from '../store/useAppStore';

import { useShallow } from 'zustand/react/shallow';

export default function Sessions() {
    const data = useAppStore(useShallow(state => {
        const contest = state.appState?.contests?.[state.appState?.activeId] || {};
        return {
            studySessions: contest.studySessions,
            categories: contest.categories,
            simuladoRows: contest.simuladoRows
        };
    }));
    const deleteSession = useAppStore(state => state.deleteSession);
    const deleteSimulado = useAppStore(state => state.deleteSimulado);
    const hasSessions = Array.isArray(data?.studySessions) ? data.studySessions.length > 0 : Object.keys(data?.studySessions || {}).length > 0;
    const hasSimulados = Array.isArray(data?.simuladoRows) ? data.simuladoRows.length > 0 : Object.keys(data?.simuladoRows || {}).length > 0;
 
    if (!hasSessions && !hasSimulados) {
        return (
            <PageErrorBoundary pageName="Sessões">
                <div className="min-h-[50vh] flex items-center justify-center text-center px-4">
                    <div>
                        <p className="text-slate-300 font-bold uppercase tracking-wider text-xs">Sem dados de sessões</p>
                        <p className="text-slate-500 text-[11px] mt-1">Inicie ciclos no cronômetro para preencher este histórico.</p>
                    </div>
                </div>
            </PageErrorBoundary>
        );
    }

    return (<PageErrorBoundary pageName="Sessões">
        <StudyHistory
            studySessions={data.studySessions || []}
            categories={data.categories || []}
            simuladoRows={data.simuladoRows || []}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="sessions"
        />
    </PageErrorBoundary>);
}


```

---

### Arquivo: `src/pages/Simulados.jsx`
*Linhas: 733 | Tamanho: 34.4 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useMemo, useCallback } from 'react';
import SimuladoAnalysis from '../components/SimuladoAnalysis';
import AIGeneratedSimulado from '../components/ai/AIGeneratedSimulado';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../hooks/useToast';
import { normalize, aliases } from '../utils/normalization';
import { computeCategoryStats } from '../engine';
import { getDateKey, normalizeDate } from '../utils/dateHelper';
import { generateId } from '../utils/idGenerator';
import {
  ListChecks, Brain, History as HistoryIcon,
  ChevronRight, Clock, Target, TrendingUp, TrendingDown,
  Minus, Sparkles, PenLine, BarChart3, CalendarDays
} from 'lucide-react';
import StudyHistory from '../components/StudyHistory';

/* ─────────────────────────────────────────────
   HELPER: Extrai timestamp seguro de uma row
   ───────────────────────────────────────────── */
const getRowTimestamp = (r) => {
  const raw = r?.lastUpdated || r?.createdAt || r?.date;
  if (!raw) return 0;
  const parsed = normalizeDate(raw);
  const t = parsed ? parsed.getTime() : new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/* ─────────────────────────────────────────────
   HELPER: Formata data/hora para exibição
   ───────────────────────────────────────────── */
const formatDateTime = (r) => {
  const raw = r?.lastUpdated || r?.createdAt || r?.date;
  if (!raw) return '—';
  const d = normalizeDate(raw);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const getSimuladoSource = (rows) => {
  if (!rows || rows.length === 0) return null;
  const hasAI = rows.some(r => r.source === 'ai-generated' || (r.batchId && r.source !== 'manual'));
  const hasManual = rows.some(r => r.source === 'manual' || (!r.batchId && r.source !== 'ai-generated'));
  if (hasAI && hasManual) return 'mixed';
  if (hasAI) return 'ai';
  return 'manual';
};

/* ─────────────────────────────────────────────
   COMPONENTE: Badge de origem
   ───────────────────────────────────────────── */
const SourceBadge = ({ source }) => {
  if (!source) return null;
  const config = {
    ai:     { label: 'Simulado IA',     icon: Sparkles, cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    manual: { label: 'Simulado Manual', icon: PenLine,  cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    mixed:  { label: 'IA + Manual',     icon: BarChart3, cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  };
  const c = config[source] || config.manual;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${c.cls}`}>
      <Icon size={12} /> {c.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   COMPONENTE: Card de resumo diário (melhorado)
   ───────────────────────────────────────────── */
const DailyCard = ({ label, icon: Icon, data, accent, accentText, comparison }) => (
  <div className={`glass p-5 rounded-2xl border-l-4 ${accent} relative overflow-hidden group`}>
    {/* Glow decorativo */}
    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${accent.replace('border-', 'bg-')}`} />

    <div className="flex items-center gap-2 mb-3 relative z-10">
      <Icon size={16} className={accentText} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>

    {data.totalQ > 0 ? (
      <div className="relative z-10">
        {/* Score principal */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-black text-white tabular-nums">{data.pct}%</span>
          <span className="text-sm text-slate-400 font-medium">acerto</span>
          {/* Tendência */}
          {comparison !== null && (
            <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${
              comparison > 0 ? 'text-emerald-400' : comparison < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {comparison > 0 ? <TrendingUp size={14} /> : comparison < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {comparison > 0 ? '+' : ''}{comparison}pp
            </span>
          )}
        </div>

        {/* Métricas secundárias */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.totalC}<span className="text-slate-500 text-xs">/{data.totalQ}</span></div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Acertos</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.subjects}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Matérias</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <div className="text-lg font-black text-white tabular-nums">{data.count}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Registros</div>
          </div>
        </div>

        {/* Breakdown por matéria (top 3) */}
        {data.bySubject && data.bySubject.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Por Matéria</div>
            {data.bySubject.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 truncate flex-1 min-w-0">{s.name}</span>
                <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 w-8 text-right tabular-nums">{s.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="relative z-10 py-6 text-center">
        <Clock size={28} className="mx-auto mb-2 text-slate-600" />
        <p className="text-sm text-slate-500">Nenhum simulado registrado.</p>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────
   COMPONENTE: Cards de resumo Hoje / Ontem
   ───────────────────────────────────────────── */
function DailySummaryCards({ simuladoRows }) {
  const summary = useMemo(() => {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getDateKey(normalizeDate(yesterdayDate));

    const calcDay = (dayKey) => {
      const rows = simuladoRows.filter((r) => {
        const rk = getDateKey(normalizeDate(r.date || r.createdAt));
        return rk === dayKey && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0);
      });
      const totalQ = rows.reduce((s, r) => s + (parseInt(r.total, 10) || 0), 0);
      const totalC = rows.reduce((s, r) => s + (parseInt(r.correct, 10) || 0), 0);
      // FIX C-03: clamp contra dado corrompido (correct > total) e divisão por zero.
      const safeC = Math.min(totalC, totalQ);
      const pct = totalQ > 0 ? Math.max(0, Math.min(100, Math.round((safeC / totalQ) * 100))) : 0;
      const subjects = new Set(rows.map((r) => r.subject).filter(Boolean)).size;

      // Breakdown por matéria
      const subjectMap = {};
      rows.forEach(r => {
        const name = r.subject || 'Geral';
        if (!subjectMap[name]) subjectMap[name] = { c: 0, t: 0 };
        subjectMap[name].c += parseInt(r.correct, 10) || 0;
        subjectMap[name].t += parseInt(r.total, 10) || 0;
      });
      const bySubject = Object.entries(subjectMap)
        .map(([name, d]) => {
          const safeC = Math.min(d.c, d.t);
          return { name, pct: d.t > 0 ? Math.round((safeC / d.t) * 100) : 0, c: safeC, t: d.t };
        })
        .sort((a, b) => b.t - a.t);

      return { totalQ, totalC, pct, subjects, count: rows.length, bySubject };
    };

    const today = calcDay(todayKey);
    const yesterday = calcDay(yesterdayKey);

    return { today, yesterday };
  }, [simuladoRows]);

  // Comparação: hoje vs ontem (em pontos percentuais)
  const comparison = (summary.today.totalQ > 0 && summary.yesterday.totalQ > 0)
    ? summary.today.pct - summary.yesterday.pct
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* HOJE — lado esquerdo */}
      <DailyCard
        label="Hoje"
        icon={CalendarDays}
        data={summary.today}
        accent="border-emerald-500"
        accentText="text-emerald-400"
        comparison={comparison}
      />
      {/* ONTEM — lado direito */}
      <DailyCard
        label="Ontem"
        icon={HistoryIcon}
        data={summary.yesterday}
        accent="border-blue-500"
        accentText="text-blue-400"
        comparison={null}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL: Simulados
   ───────────────────────────────────────────── */
export default function Simulados() {
  const { categories, simuladoRows, studySessions } = useAppStore(useShallow(state => {
    const contest = state.appState?.contests?.[state.appState?.activeId] || {};
    return {
      categories: contest.categories,
      simuladoRows: contest.simuladoRows,
      studySessions: contest.studySessions
    };
  }));
  const setData = useAppStore(state => state.setData);
  const showToast = useToast();
  const deleteSession = useAppStore((state) => state.deleteSession);
  const deleteSimulado = useAppStore((state) => state.deleteSimulado);

  // P05 PERF FIX: Granular dependencies directly referencing destructured state
  const categoriesArray = useMemo(
    () => Array.isArray(categories) ? categories : Object.values(categories || {}),
    [categories]
  );
  const simuladoRowsArray = useMemo(
    () => Array.isArray(simuladoRows) ? simuladoRows : Object.values(simuladoRows || {}),
    [simuladoRows]
  );
  const studySessionsArray = useMemo(
    () => Array.isArray(studySessions) ? studySessions : Object.values(studySessions || {}),
    [studySessions]
  );

  /* ── Rows do formulário manual (apenas matérias/assuntos cadastrados) ── */
  const displayRows = useMemo(() => {
    if (!categoriesArray.length || !categories) return [];
    const todayKey = getDateKey(new Date());
    const rawTodayRows = simuladoRowsArray.filter(
      r => getDateKey(r.date || r.createdAt) === todayKey
    );
    const rows = [];
    const savedManualRows = {};
    rawTodayRows.forEach(r => {
      if (!r.isAuto && r.source !== 'ai-generated') {
        // Fallback to string if IDs are missing for legacy records
        const key = (r.categoryId && r.topicId) ? `${r.categoryId}-${r.topicId}` : `${normalize(r.subject)}-${normalize(r.topic)}`;
        savedManualRows[key] = r;
      }
    });
    categoriesArray.forEach(cat => {
      const rawTasks = cat.tasks || [];
      const tasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
      if (tasks.length === 0) {
        const keyStr = `${normalize(cat.name)}-${normalize('nenhum')}`;
        const keyId = `${cat.id}-nenhum`;
        rows.push(savedManualRows[keyId] || savedManualRows[keyStr] || {
          id: `manual-fallback-${cat.id}`, categoryId: cat.id, topicId: 'nenhum', subject: cat.name, topic: 'nenhum',
          correct: 0, total: 0, isAuto: false, source: 'manual'
        });
      } else {
        tasks.forEach(task => {
          const title = String(task.title || task.text || '').trim();
          if (!title) return;
          const keyStr = `${normalize(cat.name)}-${normalize(title)}`;
          const keyId = `${cat.id}-${task.id}`;
          rows.push(savedManualRows[keyId] || savedManualRows[keyStr] || {
            id: `manual-${cat.id}-${task.id}`, categoryId: cat.id, topicId: task.id, subject: cat.name, topic: title,
            correct: 0, total: 0, isAuto: false, source: 'manual'
          });
        });
      }
    });
    return rows;
  }, [categoriesArray, simuladoRowsArray, categories]);

  /* ── FIX: Último simulado — lógica corrigida e robusta ── */
  const lastSimuladoData = useMemo(() => {
    if (!simuladoRowsArray.length) return { rows: [], source: null, timestamp: null };

    // 1. Filtra apenas rows com dados reais
    const answeredRows = simuladoRowsArray.filter(
      (r) => r && typeof r === 'object' && (parseInt(r.total, 10) > 0 || parseInt(r.correct, 10) > 0)
    );
    if (answeredRows.length === 0) return { rows: [], source: null, timestamp: null };

    // 2. Ordena por timestamp (mais recente primeiro)
    const sorted = [...answeredRows].sort((a, b) => getRowTimestamp(b) - getRowTimestamp(a));
    const lastRef = sorted[0];
    if (!lastRef) return { rows: [], source: null, timestamp: null };

    let resultRows = [];

    // 3. Estratégia A: batchId (Simulado IA)
    if (lastRef.batchId && lastRef.source !== 'manual') {
      resultRows = simuladoRowsArray.filter((r) => r && r.batchId === lastRef.batchId);
      // ✅ FIX BUG-49: fallback se batchId não encontrar nada
      if (resultRows.length === 0) {
        console.warn(`[SimuladoFilter] batchId ${lastRef.batchId} não encontrou rows. Fallback para data.`);
        // Cai para estratégia B
      }
    }
    
    if (!lastRef.batchId || (lastRef.batchId && resultRows.length === 0) || lastRef.source === 'manual') {
      // 4. Estratégia B: mesma data + mesma origem (manual)
      const refDateKey = getDateKey(normalizeDate(
        lastRef.date || lastRef.lastUpdated || lastRef.createdAt || new Date()
      ));
      
      // ✅ FIX BUG-36: cache de dateKey por row (evita N chamadas de normalizeDate)
      const dateKeyCache = new WeakMap();
      const getRowDateKey = (r) => {
        if (!r || typeof r !== 'object') return null;
        if (dateKeyCache.has(r)) return dateKeyCache.get(r);
        const key = getDateKey(normalizeDate(r.date || r.createdAt));
        dateKeyCache.set(r, key);
        return key;
      };
      
      resultRows = simuladoRowsArray.filter((r) => {
        if (!r || typeof r !== 'object') return false;
        // Para manual, queremos agrupar todos do dia
        const isManual = r.source === 'manual' || r.isAuto === false;
        if (!isManual) return false;
        return getRowDateKey(r) === refDateKey;
      });
      
      // ✅ FIX BUG-49: fallback final se nada encontrado
      if (resultRows.length === 0) {
        console.warn(`[SimuladoFilter] Data ${refDateKey} não encontrou rows manual.`);
      }
    }

    return {
      rows: resultRows.length > 0 ? resultRows : [lastRef],
      source: getSimuladoSource(resultRows),
      timestamp: formatDateTime(lastRef),
    };
  }, [simuladoRowsArray]);

  const [mode, setMode] = useState('ai-generator');
  const [subMode, setSubMode] = useState('ia');

  /* ── Handler de análise (salvamento) ── */
  const handleSimuladoAnalysis = useCallback((payload) => {
    try {
      const analysisResult = payload?.analysis || payload || {};
      const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : [];
      const todayKey = getDateKey(normalizeDate(new Date()));
      const nowIso = new Date().toISOString();
      const batchId = generateId('batch');

      const validRowsForToast = rawRows.filter(
        (r) => r && r.subject && r.topic && Number(r.total) > 0
      );
      const totalQForToast = validRowsForToast.reduce((s, r) => s + (Number(r.total) || 0), 0);

      setData((current) => {
        if (!current || typeof current !== 'object') return current;
        if (!current.categories && !current.simuladoRows) return current;
        const prev = current;
        const newCategories = (Array.isArray(prev.categories) ? prev.categories : Object.values(prev.categories || {}))
          .filter(Boolean)
          .map(c => ({
            ...c,
            simuladoStats: c.simuladoStats
              ? {
                  ...c.simuladoStats,
                  history: Array.isArray(c.simuladoStats.history)
                    ? [...c.simuladoStats.history]
                    : Object.values(c.simuladoStats.history || {})
                }
              : undefined
          }));
        const prevSimuladoRowsArray = Array.isArray(prev.simuladoRows)
          ? prev.simuladoRows : Object.values(prev.simuladoRows || {});

        const submittedIds = new Set(rawRows.map(r => r.id).filter(Boolean));
        const submittedKeys = new Set(rawRows.map(r => {
          if (r.categoryId && r.topicId) return `${r.categoryId}-${r.topicId}`;
          if (r.subject && r.topic) return `${normalize(r.subject)}-${normalize(r.topic)}`;
          return null;
        }).filter(Boolean));

        const rowsToKeep = prevSimuladoRowsArray.filter((r) => {
          const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
          const isManual = r && !r.isAuto && r.source !== 'ai-generated';
          
          if (isToday && isManual) {
            if (r?.id && submittedIds.has(r.id)) return false;
            
            const key1 = (r?.categoryId && r?.topicId) ? `${r.categoryId}-${r.topicId}` : null;
            const key2 = (r?.subject && r?.topic) ? `${normalize(r.subject)}-${normalize(r.topic)}` : null;
            
            if (key1 && submittedKeys.has(key1)) return false;
            if (key2 && submittedKeys.has(key2)) return false;
          }
          
          return true;
        });

        const manualSubmittedRows = rawRows
          .filter((r) => r && r.subject && r.topic && Number.isFinite(Number(r.total)) && Number(r.total) > 0)
          .map((r) => {
            const total = Math.max(0, Number(r.total) || 0);
            const correct = Math.max(0, Math.min(Number(r.correct) || 0, total));
            return {
              ...r, id: r.id || generateId('row'), batchId: r.batchId || batchId,
              date: r.date || todayKey, createdAt: nowIso, lastUpdated: nowIso,
              validated: true, isAuto: false, source: 'manual',
              subject: String(r.subject || '').trim(), topic: String(r.topic || '').trim(),
              correct, total
            };
          });

        const getMs = (r) => {
          const raw = r?.lastUpdated || r?.createdAt || r?.date;
          if (!raw) return 0;
          const parsed = normalizeDate(raw);
          const t = parsed ? parsed.getTime() : new Date(raw).getTime();
          return Number.isFinite(t) ? t : 0;
        };

        const validatedRows = [...rowsToKeep, ...manualSubmittedRows]
          .sort((a, b) => getMs(a) - getMs(b)).slice(-300);

        // Processar stats por categoria
        const processStats = (targetName) => {
          const discNameNorm = normalize(String(targetName || ''));
          if (!discNameNorm) return;
          let catIdx = newCategories.findIndex(c => c && c.name && normalize(c.name) === discNameNorm);
          if (catIdx === -1) {
            catIdx = newCategories.findIndex(c =>
              c && c.name && aliases[normalize(c.name)]?.some((a) => normalize(a) === discNameNorm)
            );
          }
          if (catIdx === -1) return;
          const cat = newCategories[catIdx];
          if (!cat.simuladoStats) {
            cat.simuladoStats = { history: [], average: 0, lastAttempt: 0, trend: 'stable', level: 'BAIXO' };
          }
          const rawHistory = Array.isArray(cat.simuladoStats.history)
            ? cat.simuladoStats.history : Object.values(cat.simuladoStats.history || {});
          const history = rawHistory.filter(Boolean);
          const historyWithoutToday = history.filter((h) => h?.date !== todayKey);

          const todayRows = validatedRows.filter((r) => {
            const rowSubjectNorm = normalize(String(r?.subject || ''));
            const isToday = getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey;
            const isSubject = rowSubjectNorm === discNameNorm ||
              aliases[rowSubjectNorm]?.some((a) => normalize(a) === discNameNorm);
            return isToday && isSubject;
          });

          const finalC = todayRows.reduce((sum, r) => sum + (Number(r.correct) || 0), 0);
          const finalQ = todayRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
          const finalTimeSpent = todayRows.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0);
          const finalTimedQuestoes = todayRows.reduce(
            (sum, r) => sum + (Number(r.timeSpent) > 0 ? Number(r.total) || 0 : 0), 0
          );

          const topicsMap = {};
          todayRows.forEach((r) => {
            const tName = String(r.topic || '').trim();
            if (!topicsMap[tName]) topicsMap[tName] = { correct: 0, total: 0, difficulty: [], timeSpent: 0, timedQuestoes: 0 };
            topicsMap[tName].correct += Number(r.correct) || 0;
            topicsMap[tName].total += Number(r.total) || 0;
            const diff = Number(r.difficulty);
            topicsMap[tName].difficulty.push(Number.isFinite(diff) ? diff : 1.0);
            const rowTime = Number(r.timeSpent) || 0;
            if (rowTime > 0) { topicsMap[tName].timeSpent += rowTime; topicsMap[tName].timedQuestoes += Number(r.total) || 0; }
          });

          const finalTopics = Object.entries(topicsMap).map(([name, td]) => ({
            name, correct: td.correct, total: td.total,
            percentage: td.total > 0 ? (td.correct / td.total) * 100 : 0,
            difficulty: td.difficulty.length > 0 ? td.difficulty.reduce((a, b) => a + b, 0) / td.difficulty.length : 1.0,
            timeSpent: td.timeSpent, timedQuestoes: td.timedQuestoes
          }));

          const maxScore = Number(cat.maxScore) || Number(prev?.maxScore) || 100;
          const minScore = Number.isFinite(Number(cat.minScore))
            ? Number(cat.minScore)
            : (Number.isFinite(Number(prev?.minScore)) ? Number(prev.minScore) : 0);
          const scoreRange = Math.max(1e-9, maxScore - minScore);
          if (finalQ > 0) {
            const totalDifficultyWeight = finalTopics.reduce((acc, t) => acc + (Number(t.difficulty) || 1.0) * (Number(t.total) || 0), 0);
            const avgDifficulty = finalTopics.length > 0 && totalDifficultyWeight > 0 ? totalDifficultyWeight / finalQ : 1.0;
            const computedScore = minScore + (finalC / finalQ) * scoreRange;
            historyWithoutToday.push({
              date: todayKey, correct: finalC, total: finalQ,
              difficulty: Number(avgDifficulty.toFixed(2)),
              score: Math.min(maxScore, Math.max(minScore, computedScore)),
              timeSpent: finalTimeSpent, timedQuestoes: finalTimedQuestoes, topics: finalTopics,
            });
          }

          const historyWithCurrent = historyWithoutToday.slice(-50);
          const statsResult = computeCategoryStats(
              historyWithCurrent, 
              Number(cat.weight) > 0 ? Number(cat.weight) : 10, 
              60, 
              maxScore,
              minScore
          );
          const lastScore = finalQ > 0 ? (minScore + (finalC / finalQ) * scoreRange) : (cat.simuladoStats?.lastAttempt ?? 0);
          cat.simuladoStats = {
            ...cat.simuladoStats, history: historyWithCurrent,
            average: Number((statsResult?.mean || 0).toFixed(2)),
            trend: statsResult?.trend || 'stable',
            lastAttempt: Number(Number(lastScore).toFixed(2)),
            level: statsResult?.level || 'BAIXO'
          };
        };

        const subjectsToProcess = new Set();
        const dataToProcess = analysisResult?.disciplines || analysisResult;
        if (Array.isArray(dataToProcess)) {
          dataToProcess.forEach((disc) => { if (disc && disc.name) subjectsToProcess.add(disc.name); });
        } else if (dataToProcess && typeof dataToProcess === 'object') {
          Object.keys(dataToProcess).forEach((rawSubject) => { if (rawSubject) subjectsToProcess.add(rawSubject); });
        }
        manualSubmittedRows.forEach((r) => { if (r && r.subject) subjectsToProcess.add(r.subject); });
        subjectsToProcess.forEach((subName) => processStats(subName));

        // Evento global de simulado
        const todayValidatedRows = validatedRows.filter(
          (r) => getDateKey(normalizeDate(r?.date || r?.createdAt)) === todayKey
        );
        const totalQ = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.total, 10) || 0), 0);
        const totalC = todayValidatedRows.reduce((acc, r) => acc + (parseInt(r?.correct, 10) || 0), 0);
        const contestMax = Number(prev.maxScore) > 0 ? Number(prev.maxScore) : 100;
        const contestMin = Number.isFinite(Number(prev.minScore)) ? Number(prev.minScore) : 0;
        const contestRange = Math.max(1e-9, contestMax - contestMin);
        const globalPoints = totalQ > 0 ? Number((contestMin + (totalC / totalQ) * contestRange).toFixed(2)) : contestMin;
        const globalPct = totalQ > 0 ? Number(((totalC / totalQ) * 100).toFixed(2)) : 0;

        const existingSimuladosRaw = Array.isArray(prev.simulados) ? prev.simulados : Object.values(prev.simulados || {});
        let updatedSimulados = existingSimuladosRaw.filter(Boolean);
        if (totalQ > 0) {
          const newSimuladoEvent = {
            id: generateId('sim'), batchId, date: todayKey,
            score: globalPoints,
            scorePoints: globalPoints,
            scorePct: globalPct,
            total: totalQ, correct: totalC, type: 'auto-analyzer', subject: 'Simulado Geral',
            createdAt: nowIso, lastUpdated: nowIso
          };
          updatedSimulados = [...updatedSimulados.filter(s => !(s?.date === todayKey && s?.type === 'auto-analyzer')), newSimuladoEvent]
            .sort((a, b) => getMs(a) - getMs(b)).slice(-100);
        }

        return { ...prev, categories: newCategories, simuladoRows: validatedRows, simulados: updatedSimulados, lastUpdated: nowIso };
      });

      if (totalQForToast > 0) {
        showToast('Simulado processado com sucesso!', 'success');
        try {
          useAppStore.getState().awardExperience?.(500);
        } catch (xpErr) {
          console.warn('Falha não-bloqueante ao conceder XP do simulado:', xpErr);
        }
      } else {
        showToast('Nenhuma questão válida encontrada.', 'warning');
      }
    } catch (err) {
      console.error('FATAL ERROR IN handleSimuladoAnalysis:', err);
      showToast('Erro fatal ao salvar simulado. Verifique os logs.', 'error');
    }
  }, [setData, showToast]);

  /* ── Configuração das tabs ── */
  const tabs = [
    { id: 'ai-generator', label: 'Gerar Simulado', icon: Brain },
    { id: 'analyzer',     label: 'Último Simulado', icon: ListChecks },
    { id: 'history',      label: 'Histórico', icon: HistoryIcon },
  ];

  // Guarda de segurança
  if (!categoriesArray.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center bg-slate-900/50 rounded-2xl border border-white/5 mx-4 mt-8">
        <Brain className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-black text-white">Nenhuma matéria encontrada</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Você ainda não cadastrou matérias no seu concurso ativo. Para gerar ou analisar simulados, adicione matérias no seu plano de estudos.
        </p>
      </div>
    );
  }


  return (
    <PageErrorBoundary pageName="Simulados">
      {/* ── Header + Tabs ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
            <Brain size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Simulados</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gere, analise e acompanhe seus simulados IA e manuais</p>
          </div>
        </div>

        {/* Tabs premium */}
        <div className="flex flex-wrap items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 w-fit gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? '' : 'opacity-70'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo por modo ── */}
      {mode === 'analyzer' ? (
        <div className="animate-fade-in">
          {/* Header do último simulado */}
          {lastSimuladoData.rows.length > 0 && (
            <div className="glass p-5 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
                  <Target size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">Último Simulado Realizado</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Clock size={11} /> {lastSimuladoData.timestamp}
                  </p>
                </div>
              </div>
              <SourceBadge source={lastSimuladoData.source} />
            </div>
          )}

          <SimuladoAnalysis
            rows={lastSimuladoData.rows}
            categories={categoriesArray}
            viewMode="report"
          />
        </div>
      ) : mode === 'ai-generator' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Sub-tabs IA / Manual */}
          <div className="w-full flex justify-center mb-6">
            <div className="flex gap-3 bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-700/50 shadow-inner">
              <button
                onClick={() => setSubMode('ia')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  subMode === 'ia'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Brain size={16} className={subMode === 'ia' ? '' : 'opacity-70'} />
                Simulado IA
              </button>
              <button
                onClick={() => setSubMode('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-300 ${
                  subMode === 'manual'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ListChecks size={16} className={subMode === 'manual' ? '' : 'opacity-70'} />
                Simulado Manual
              </button>
            </div>
          </div>

          {subMode === 'ia' ? (
            <AIGeneratedSimulado />
          ) : (
            <SimuladoAnalysis
              rows={displayRows}
              onAnalysisComplete={handleSimuladoAnalysis}
              categories={categoriesArray}
              viewMode="form"
            />
          )}
        </div>
      ) : (
        /* ── MODO HISTÓRICO ── */
        <div className="space-y-6 animate-fade-in">
          <DailySummaryCards simuladoRows={simuladoRowsArray} />
          <StudyHistory
            studySessions={studySessionsArray}
            categories={categoriesArray}
            simuladoRows={simuladoRowsArray}
            onDeleteSession={deleteSession}
            onDeleteSimulado={deleteSimulado}
            mode="performance"
          />
        </div>
      )}
    </PageErrorBoundary>
  );
}


```

---

### Arquivo: `src/pages/Stats.jsx`
*Linhas: 191 | Tamanho: 10.5 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useEffect, useState } from 'react';
import VerifiedStats from '../components/VerifiedStats';
import WeeklyAnalysis from '../components/WeeklyAnalysis';
import { EvolucaoFocoChart } from '../components/charts/Analytics/EvolucaoFocoChart';
import { HorasDisciplinaChart } from '../components/charts/Analytics/HorasDisciplinaChart';
import { mapFocusEvolutionData, mapSubjectHoursData } from '../utils/chartDataMappers';
import { getDateKey } from '../utils/dateHelper';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// FIX E-04: tick de 60s para reagir à virada de dia (meia-noite) sem recarregar.
// Bug #1 FIX: Força re-render apenas na virada do dia, e não a cada minuto, com suporte a visibilitychange.
const useDayTick = () => {
    const [today, setToday] = useState(() => getDateKey(new Date()));
    useEffect(() => {
        const check = () => {
            const current = getDateKey(new Date());
            setToday(prev => prev !== current ? current : prev);
        };
        const id = setInterval(() => {
            if (!document.hidden) check();
        }, 60 * 1000);
        document.addEventListener('visibilitychange', check);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', check);
        };
    }, []);
    return today;
};

export default function Stats() {
    const dayTick = useDayTick();

    const { rawCategories, rawStudyLogs, rawFlashcards, rawSimuladoRows, user } = useAppStore(useShallow(state => {
        const contests = state?.appState?.contests || {};
        const activeId = state?.appState?.activeId;
        const contest = contests[activeId] || {};
        return {
            rawCategories: contest.categories,
            rawStudyLogs: contest.studyLogs,
            rawFlashcards: contest.flashcardDecks,
            rawSimuladoRows: contest.simuladoRows,
            user: contest.user || null
        };
    }));

    const studyLogs = useMemo(() => {
        return Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {});
    }, [rawStudyLogs]);

    // FIX E-01: normalização profunda — garante `tasks` como array em todas as categorias.
    const categories = useMemo(() => {
        const list = Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {});
        return list.filter(Boolean).map(c => ({
            ...c,
            tasks: Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {})
        }));
    }, [rawCategories]);

    const flashcardDecks = useMemo(() => {
        return Array.isArray(rawFlashcards) ? rawFlashcards : Object.values(rawFlashcards || {});
    }, [rawFlashcards]);

    // FIX E-03 & BUG 11: considera apenas linhas validadas e com dado real (incluindo nota 0 e negativa em bancas Cebraspe).
    const hasSimuladoHistory = useMemo(() => {
        const rowsArray = Array.isArray(rawSimuladoRows)
            ? rawSimuladoRows
            : Object.values(rawSimuladoRows || {});
        const hasValidRows = rowsArray.some(r =>
            r && r.validated !== false && (
                (Number(r.total) > 0 && Number(r.correct) >= 0) ||
                (Number.isFinite(Number(r.score)) && Number(r.total) >= 0)
            )
        );
        if (hasValidRows) return true;
        return categories.some(category => {
            const h = category?.simuladoStats?.history;
            const hArray = Array.isArray(h) ? h : Object.values(h || {});
            return hArray.some(entry =>
                entry && (Number(entry.total) > 0 || (entry.score != null && Number.isFinite(Number(entry.score))))
            );
        });
    }, [rawSimuladoRows, categories]);

    const hasFlashcards = useMemo(() => {
        return flashcardDecks.some(d => {
            const cards = Array.isArray(d?.cards)
                ? d.cards
                : Object.values(d?.cards || {});
            return cards.some(c => c && (c.front || c.back));
        });
    }, [flashcardDecks]);

    // FIX Bug 6: considera apenas logs de estudo reais (não flashcards) com tempo positivo
    const hasStudyLogs = useMemo(() => {
        return studyLogs.some(log =>
            log && log.type !== 'flashcard' && (
                (Number.isFinite(Number(log.minutes)) && Number(log.minutes) > 0) ||
                (Number.isFinite(Number(log.duration)) && Number(log.duration) > 0)
            )
        );
    }, [studyLogs]);
    const hasData = hasStudyLogs || hasSimuladoHistory || hasFlashcards;

    // dayTick força re-cálculo ao atravessar meia-noite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const focusData = useMemo(() => mapFocusEvolutionData(studyLogs), [studyLogs, dayTick]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const subjectData = useMemo(() => mapSubjectHoursData(studyLogs, categories), [studyLogs, categories, dayTick]);

    return (
        <PageErrorBoundary pageName="Estatísticas">
            <div className="space-y-8 animate-fade-in pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl">📊</div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Estatísticas</h1>
                        </div>
                        <p className="text-slate-400 mt-1.5 text-sm">Sua performance quantificada.</p>
                    </div>
                </div>

                {!hasData ? (
                    <div className="flex items-center justify-center min-h-[45vh] p-4">
                        <div className="glass p-8 sm:p-12 text-center rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-2xl max-w-md w-full">
                            <div className="text-5xl mb-4 opacity-80">📊</div>
                            <p className="font-black uppercase tracking-wider text-sm text-slate-200 mb-2">Aguardando dados</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Registre horas de estudo, simulados ou flashcards para gerar relatórios e análises detalhadas.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {!(hasSimuladoHistory || hasFlashcards) ? (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/30 text-center mb-6">
                                <p className="text-xs font-semibold text-slate-400">
                                    Nenhum simulado ou flashcard registrado. Registre simulados ou revise flashcards para desbloquear a Previsão IA, Análise de Consistência e Simulação de Monte Carlo.
                                </p>
                            </div>
                        ) : (
                            <VerifiedStats categories={categories} user={user} flashcardDecks={flashcardDecks} dayTick={dayTick} />
                        )}

                        {!hasStudyLogs ? (
                            <div className="glass p-6 rounded-2xl border border-white/5 bg-slate-900/30 text-center my-6">
                                <p className="text-xs font-semibold text-slate-400">
                                    Nenhuma sessão de estudo registrada. Registre horas de estudo para visualizar a Evolução do Foco e Análise Semanal.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Evolução do Foco</h2>
                                                <p className="text-[11px] text-slate-500 uppercase">Histórico de Horas Líquidas de Estudo</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full"><EvolucaoFocoChart data={focusData} /></div>
                                    </div>
                                    <div className="glass p-6 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 h-full flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">Concentração por Matéria</h2>
                                                <p className="text-[11px] text-slate-500 uppercase">Ranking de disciplinas por tempo investido</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full"><HorasDisciplinaChart data={subjectData} /></div>
                                    </div>
                                </div>
                                <WeeklyAnalysis studyLogs={studyLogs} categories={categories} dayTick={dayTick} />
                            </>
                        )}
                    </>
                )}
            </div>
        </PageErrorBoundary>
    );
}

```

---

### Arquivo: `src/pages/Tasks.jsx`
*Linhas: 99 | Tamanho: 3.9 KB*

```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState } from 'react';
import PersonalRanking from '../components/PersonalRanking';
import VolumeRanking from '../components/VolumeRanking';
import PerformanceTable from '../components/PerformanceTable';
import SubtopicsTable from '../components/SubtopicsTable';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { RotateCcw } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ConfirmModal from '../components/ConfirmModal';

export default function Tasks() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const rawCategories = useAppStore(useShallow(state => {
    const activeContest = state.appState?.contests?.[state.appState?.activeId];
    return activeContest?.categories || [];
  }));

  const categories = React.useMemo(() => {
    const list = (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).filter(Boolean);
    return list.map(c => ({
      ...c,
      tasks: Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {})
    }));
  }, [rawCategories]);
  
  const resetSimuladoStats = useAppStore(state => state.resetSimuladoStats);
  const showToast = useToast();
  
  // ✅ FIX: Calcular maxScore global das categorias
  const maxScore = React.useMemo(() => {
    const scores = categories.map(c => c.maxScore).filter(s => typeof s === 'number' && s > 0);
    return scores.length > 0 ? scores.reduce((a, b) => Math.max(a, b), -Infinity) : 100;
  }, [categories]);
  
  const handleResetConfirm = () => {
    resetSimuladoStats();
    showToast('Resetado com sucesso!', 'success');
  };

  if (categories.length === 0) {
    return (
      <PageErrorBoundary pageName="Tarefas">
        <div className="min-h-[50vh] flex items-center justify-center text-center px-4">
          <div>
            <p className="text-slate-300 font-bold uppercase tracking-wider text-xs">Sem tarefas cadastradas</p>
            <p className="text-slate-500 text-[11px] mt-1">Crie matérias e tarefas para liberar rankings e quadros de performance.</p>
          </div>
        </div>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="Tarefas">
      <div className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <PersonalRanking categories={categories} />
          </div>
          <div className="lg:col-span-1 h-full">
            <VolumeRanking categories={categories} />
          </div>
        </div>
        
        <div className="pb-8 border-t border-white/5 pt-10 mt-10">
          <h2 className="text-2xl font-bold mb-10 flex items-center gap-3">
            📊 Quadro de Performance
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Resetar dados do quadro"
            >
              <RotateCcw size={16} />
            </button>
          </h2>
          
          {/* ✅ FIX: Passar maxScore para os componentes */}
          <PerformanceTable categories={categories} maxScore={maxScore} />
          <SubtopicsTable categories={categories} maxScore={maxScore} />
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetConfirm}
        title="Resetar Performance"
        message="Tem certeza que deseja resetar os dados de estatística do quadro de performance?"
        confirmText="Resetar Dados"
        type="warning"
        icon={RotateCcw}
      />
    </PageErrorBoundary>
  );
}


```

---

