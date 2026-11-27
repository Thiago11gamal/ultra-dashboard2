import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Play, TrendingUp, Compass, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { normalize } from '../utils/normalization';
import { normalizePriority } from '../utils/colorHelper';

const QUICK_ROUTES = [
  { id: 'r-dash', label: 'Meu Painel (Início)', section: 'Menu', path: '/' },
  { id: 'r-pomo', label: 'Cronômetro Pomodoro', section: 'Menu', path: '/pomodoro' },
  { id: 'r-tasks', label: 'Tarefas & Performance (Edital)', section: 'Menu', path: '/tasks' },
  { id: 'r-sessions', label: 'Sessões de Estudo', section: 'Menu', path: '/sessions' },
  { id: 'r-coach', label: 'Coach IA & Kanban Semanal', section: 'Central IA', path: '/coach' },
  { id: 'r-sims', label: 'Simulados IA & Caderno de Erros', section: 'Central IA', path: '/simulados' },
  { id: 'r-stats', label: 'Estatísticas & Monte Carlo', section: 'Análise', path: '/stats' },
  { id: 'r-evo', label: 'Evolução (Todos os Motores)', section: 'Análise', path: '/evolution' },
  { id: 'r-heat', label: 'Central de Atividade & ACWR', section: 'Análise', path: '/heatmap' },
  { id: 'r-hist', label: 'Histórico de Desempenho', section: 'Análise', path: '/history' },
  { id: 'r-ret', label: 'Painel de Retenção FSRS', section: 'Análise', path: '/retention' },
  { id: 'r-flash', label: 'Flashcards FSRS', section: 'Ferramentas', path: '/flashcards' },
  { id: 'r-agenda', label: 'Agenda de Estudos (Grade Ótima)', section: 'Ferramentas', path: '/agenda' },
  { id: 'r-notes', label: 'Notas, Matriz de Pareto & Resumos', section: 'Ferramentas', path: '/notes' },
];

const EVOLUTION_ENGINES = [
  { id: 'e-compare', label: 'Raio-X + Monte Carlo', path: '/evolution?engine=compare' },
  { id: 'e-tornado', label: 'Tornado, Risco & Simulador "E Se?"', path: '/evolution?engine=tornado_whatif' },
  { id: 'e-fan', label: 'Cone Futuro (Fan Chart P10–P90)', path: '/evolution?engine=projection_fan' },
  { id: 'e-kalman', label: 'Filtro de Kalman (Habilidade Latente)', path: '/evolution?engine=kalman_latent' },
  { id: 'e-subtopics', label: 'Raio-X de Assuntos (Subtópicos)', path: '/evolution?engine=subtopics' },
  { id: 'e-speed', label: 'Matriz Velocidade × Precisão', path: '/evolution?engine=speed_accuracy' },
  { id: 'e-pacing', label: 'Ritmo & Orçamento de Tempo de Prova', path: '/evolution?engine=exam_pacing' },
  { id: 'e-irt', label: 'Psicometria TRI/IRT & Estratégia de Chute', path: '/evolution?engine=irt_psychometric' },
  { id: 'e-meta', label: 'Metacognição & Fadiga Intraprova', path: '/evolution?engine=metacognition_fatigue' },
  { id: 'e-corr', label: 'Correlação Semanal & Mapa de Regimes', path: '/evolution?engine=correlation_regimes' },
];

export default function CommandPaletteModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <CommandPaletteDialog onClose={onClose} />;
}

function CommandPaletteDialog({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const activeContest = useAppStore((s) => s.appState?.contests?.[s.appState?.activeId] || null);
  const startPomodoroSession = useAppStore((s) => s.startPomodoroSession);

  const items = useMemo(() => {
    const q = normalize(query || '');
    const list = [];

    QUICK_ROUTES.forEach((r) => {
      if (!q || normalize(`${r.label} ${r.section}`).includes(q)) {
        list.push({ ...r, kind: 'route' });
      }
    });

    EVOLUTION_ENGINES.forEach((eng) => {
      if (!q || normalize(`${eng.label} evolucao grafico`).includes(q)) {
        list.push({ ...eng, section: 'Gráfico Evolução', kind: 'engine' });
      }
    });

    const rawCats = activeContest?.categories;
    const cats = (Array.isArray(rawCats) ? rawCats : Object.values(rawCats || {})).filter(Boolean);
    cats.forEach((cat) => {
      const tasks = (Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {})).filter(Boolean);
      tasks.forEach((tsk) => {
        const title = tsk.title || tsk.text || '';
        if (!title) return;
        if (!q && list.length > 32) return;
        if (!q || normalize(`${cat.name} ${title}`).includes(q)) {
          list.push({
            id: `t-${cat.id}-${tsk.id || title}`,
            label: `${cat.name}: ${title}`,
            section: tsk.completed ? 'Tópico Concluído' : 'Iniciar no Pomodoro',
            kind: 'task',
            cat,
            tsk,
          });
        }
      });
    });

    return list.slice(0, 30);
  }, [query, activeContest?.categories]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  const executeItem = (item) => {
    if (!item) return;
    onClose?.();
    if (item.kind === 'task' && typeof startPomodoroSession === 'function') {
      const nextSubject = {
        categoryId: item.cat.id || item.cat.name,
        taskId: item.tsk.id || item.tsk.title || item.tsk.text,
        category: item.cat.name,
        task: item.tsk.title || item.tsk.text || 'Estudo',
        priority: normalizePriority(item.tsk.priority),
        source: 'command_palette',
      };
      const currentPomodoro = useAppStore.getState().appState?.pomodoro;
      const activeSub = currentPomodoro?.activeSubject;
      const isAlreadyActive = Boolean(
        activeSub &&
        String(activeSub.categoryId ?? activeSub.category ?? '') === String(nextSubject.categoryId ?? '') &&
        String(activeSub.taskId ?? activeSub.task ?? '') === String(nextSubject.taskId ?? '')
      );
      if (!isAlreadyActive) {
        startPomodoroSession(nextSubject);
      }
      navigate('/pomodoro');
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[selectedIdx]) {
      e.preventDefault();
      executeItem(items[selectedIdx]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center bg-black/75 backdrop-blur-sm p-4 pt-16 sm:pt-24"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida global"
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-slate-950/60">
          <Search size={17} className="text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            placeholder="Ir para menu, gráfico (Tornado, Kalman, Pareto) ou iniciar tópico..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Fechar busca">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhum resultado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            items.map((item, idx) => {
              const active = idx === selectedIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={() => executeItem(item)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    active ? 'bg-indigo-500/20 border border-indigo-400/35 text-white' : 'text-slate-300 border border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.kind === 'task' ? (
                      <Play size={13} className="text-emerald-400 shrink-0 fill-current" />
                    ) : item.kind === 'engine' ? (
                      <TrendingUp size={13} className="text-pink-400 shrink-0" />
                    ) : (
                      <Compass size={13} className="text-indigo-400 shrink-0" />
                    )}
                    <span className="font-semibold truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-black/30 px-2 py-0.5 rounded">
                      {item.section}
                    </span>
                    <ArrowRight size={12} className={active ? 'text-indigo-300' : 'text-slate-600'} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500">
          <span>↑↓ navegar · Enter abrir · Esc fechar</span>
          <span className="font-mono">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
