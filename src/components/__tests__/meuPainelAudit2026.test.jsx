import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import { parseVerticalizedSyllabus } from '../../utils/syllabusParser.js';
import SyllabusImporterModal from '../ai/SyllabusImporterModal.jsx';
import StatsCards from '../StatsCards.jsx';
import { AdaptivePulseStrip } from '../dashboard/AdaptivePulseStrip.jsx';
import NextGoalCard from '../NextGoalCard.jsx';
import PriorityProgress from '../PriorityProgress.jsx';
import { SyllabusBurndownChart } from '../charts/Analytics/SyllabusBurndownChart.jsx';
import Checklist from '../Checklist.jsx';
import CategoryEditor from '../CategoryEditor.jsx';
import { createCategorySlice } from '../../store/slices/createCategorySlice.js';
import { createTaskSlice } from '../../store/slices/createTaskSlice.js';
import { createTrashSlice } from '../../store/slices/createTrashSlice.js';
import { createGamificationSlice } from '../../store/slices/createGamificationSlice.js';
import { _urgencyCache, cacheSet } from '../../utils/coachCaches.js';
import { useAppStore } from '../../store/useAppStore.js';
import { getDateKey } from '../../utils/dateHelper.js';
import { addDaysNoon } from '../../utils/parseNoonLocal.js';

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

describe('Meu Painel — Auditoria Completa de Bugs & Melhorias (2026)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('1. Syllabus Parser & SyllabusImporterModal', () => {
    it('detects weighted subjects containing dotted numbers and does not swallow "Disposições Gerais" or "Redação Oficial"', () => {
      const text = `CONHECIMENTOS BÁSICOS
Redação Oficial (peso 10)
1. Manual de Redação da Presidência
2. Disposições Gerais sobre correspondência

CONHECIMENTOS ESPECÍFICOS
Lei 8.112 (peso 15)
1. Provimento e vacância
2. Normas Gerais de regime disciplinar`;

      const parsed = parseVerticalizedSyllabus(text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Redação Oficial');
      expect(parsed[0].examGroup).toBe('basicos');
      expect(parsed[0].weight).toBe(10);
      expect(parsed[0].tasks.map((t) => t.text)).toContain('Disposições Gerais sobre correspondência');

      expect(parsed[1].name).toBe('Lei 8.112');
      expect(parsed[1].examGroup).toBe('especificos');
      expect(parsed[1].weight).toBe(15);
      expect(parsed[1].tasks.map((t) => t.text)).toContain('Normas Gerais de regime disciplinar');
    });

    it('SyllabusImporterModal exposes dialog a11y, sanitizes HTML, and keys overrides by subject name (not array index)', () => {
      const onClose = vi.fn();
      const onImport = vi.fn();
      render(
        <SyllabusImporterModal isOpen={true} onClose={onClose} onImportCategories={onImport} />
      );

      expect(screen.getByRole('dialog')).toBeTruthy();

      const textarea = screen.getByLabelText(/Texto do Edital/i);
      fireEvent.change(textarea, {
        target: {
          value: `Português (peso 10)
1. Crase

Direito Penal (peso 20)
1. <script>alert(1)</script>Teoria do Crime`,
        },
      });

      // Override weight for Direito Penal to 35
      const penalWeightInput = screen.getByLabelText(/Peso de Direito Penal/i);
      fireEvent.change(penalWeightInput, { target: { value: '35' } });
      fireEvent.blur(penalWeightInput);

      // Now prepend a new subject before Português — Direito Penal moves from index 1 to index 2
      fireEvent.change(textarea, {
        target: {
          value: `Informática (peso 5)
1. Redes

Português (peso 10)
1. Crase

Direito Penal (peso 20)
1. <script>alert(1)</script>Teoria do Crime`,
        },
      });

      fireEvent.click(screen.getByRole('button', { name: /Importar 3 Matéria/i }));
      expect(onImport).toHaveBeenCalledTimes(1);
      const imported = onImport.mock.calls[0][0];
      const penal = imported.find((c) => c.name === 'Direito Penal');
      const port = imported.find((c) => c.name === 'Português');

      // Override stayed attached to Direito Penal (35) and did NOT shift to Português (10)
      expect(penal.weight).toBe(35);
      expect(port.weight).toBe(10);
      expect(penal.tasks[0].text).toBe('Teoria do Crime');
      expect(penal.simuladoStats.level).toBe('-');
    });
  });

  describe('2. StatsCards: Accents, Past/Today Exam Date, String XP', () => {
    it('renders "Atenção" with proper accents, "Hoje!" on exam day, and formatted string XP', () => {
      const todayKey = getDateKey(new Date());
      const data = {
        categories: [
          { id: 'c1', name: 'Português', totalMinutes: 60, tasks: [] },
          { id: 'c2', name: 'Direito', totalMinutes: 40, tasks: [] },
        ],
        studyLogs: [{ id: 'l1', date: todayKey, minutes: 60 }],
        simulados: [],
        simuladoRows: [],
        flashcardDecks: [],
        studySessions: [],
        user: { xp: '1250', level: 4, goalDate: todayKey },
        settings: {},
      };

      const { container } = render(<StatsCards data={data} onUpdateGoalDate={vi.fn()} />);
      expect(container.textContent).toContain('Atenção');
      expect(container.textContent).not.toContain('Atencao');
      expect(container.textContent).toContain('Hoje!');
      expect(container.textContent).toContain('1.250');
    });

    it('renders "dias atrás" clearly when goalDate is in the past', () => {
      const pastDate = addDaysNoon(new Date(), -5);
      const pastKey = getDateKey(pastDate);
      const data = {
        categories: [],
        studyLogs: [],
        simulados: [],
        simuladoRows: [],
        flashcardDecks: [],
        studySessions: [],
        user: { xp: 0, level: 1, goalDate: pastKey },
        settings: {},
      };

      const { container } = render(<StatsCards data={data} onUpdateGoalDate={vi.fn()} />);
      expect(container.textContent).toContain('5');
      expect(container.textContent).toContain('dias atrás');
    });
  });

  describe('3. AdaptivePulseStrip: ACWR Inactive/Detraining Zones & Coach Navigation', () => {
    it('shows neutral inactive ACWR chip for old logs (>7d) and navigates to /coach when clicking maturity pill', () => {
      const oldDate = addDaysNoon(new Date(), -20);
      const oldKey = getDateKey(oldDate);

      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <AdaptivePulseStrip
            categories={[]}
            studyLogs={[{ id: 'old-1', date: oldKey, minutes: 90 }]}
            flashcardDecks={[]}
          />
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      );

      expect(container.textContent).toContain('ACWR 0.00× · retomar 25m');

      const maturityBtn = screen.getByRole('button', { name: /Abrir Coach IA/i });
      fireEvent.click(maturityBtn);
      expect(screen.getByTestId('loc').textContent).toBe('/coach');
    });
  });

  describe('4. NextGoalCard: Colon Prefix Preservation & All-Completed State', () => {
    it('preserves meaningful colon prefixes like "Art. 5º:" while keeping redundant subject prefixes stripped', async () => {
      const cats = [
        {
          id: 'cat-const',
          name: 'Direito Constitucional',
          tasks: [
            { id: 't-art5', title: 'Art. 5º: Direitos e Garantias', priority: 'high', completed: false },
          ],
          simuladoStats: { history: [] },
        },
      ];

      await act(async () => {
        render(
          <NextGoalCard
            categories={cats}
            simulados={[]}
            studyLogs={[]}
            contestId="nextgoal-colon-test"
            onStartStudying={vi.fn()}
          />
        );
        await new Promise((r) => setTimeout(r, 90));
      });

      await waitFor(() => {
        expect(screen.getByText(/Art\. 5º: Direitos e Garantias/i)).toBeTruthy();
      });
    });

    it('shows completed count summary when all tasks are completed', async () => {
      const cats = [
        {
          id: 'cat-done',
          name: 'Português',
          tasks: [
            { id: 't1', title: 'Crase', completed: true },
            { id: 't2', title: 'Sintaxe', completed: true },
          ],
        },
      ];

      await act(async () => {
        render(
          <NextGoalCard
            categories={cats}
            simulados={[]}
            studyLogs={[]}
            onStartStudying={vi.fn()}
          />
        );
        await new Promise((r) => setTimeout(r, 90));
      });

      await waitFor(() => {
        expect(screen.getByText(/Tudo em dia!/i)).toBeTruthy();
        expect(screen.getByText(/Todos os 2 assuntos cadastrados foram concluídos/i)).toBeTruthy();
      });
    });
  });

  describe('5. PriorityProgress: Weighted Progress, < 1% Rounding & Interactive Filter', () => {
    it('shows weighted progress when weights differ, displays "< 1%" for tiny progress, and toggles priority filter', () => {
      const manyTasks = Array.from({ length: 250 }, (_, i) => ({
        id: `t-${i}`,
        title: `Tópico ${i}`,
        priority: i === 0 ? 'high' : 'medium',
        completed: i === 0,
      }));
      const categories = [
        { id: 'c1', name: 'Constitucional', weight: 30, tasks: manyTasks.slice(0, 1) },
        { id: 'c2', name: 'Atualidades', weight: 5, tasks: manyTasks.slice(1) },
      ];
      const onSelectPriority = vi.fn();

      const { container } = render(
        <PriorityProgress
          categories={categories}
          activePriority="all"
          onSelectPriority={onSelectPriority}
        />
      );

      expect(container.textContent).toContain('< 1%');
      expect(container.textContent).toContain('Ponderado:');

      const highCard = screen.getByRole('button', { name: /Prioridade alta/i });
      fireEvent.click(highCard);
      expect(onSelectPriority).toHaveBeenCalledWith('high');
    });
  });

  describe('6. SyllabusBurndownChart: Completed & Long-Horizon States + Legend', () => {
    it('shows "Meta atingida", "Concluído ✓", and chart legend when 100% completed', () => {
      const cats = [
        {
          id: 'c1',
          name: 'Português',
          tasks: [
            { id: 't1', text: 'Crase', completed: true, completedAt: '2026-04-10T12:00:00Z' },
          ],
        },
      ];
      const { container } = render(
        <SyllabusBurndownChart categories={cats} user={{ goalDate: '2026-12-20' }} />
      );
      expect(container.textContent).toContain('Meta atingida');
      expect(container.textContent).toContain('Concluído ✓');
      expect(container.textContent).toContain('Concluídos (real)');
      expect(container.textContent).toContain('Ritmo ideal');
    });
  });

  describe('7. Checklist: Double-click Disambiguation, Priority Filter, Sanitization & Valid History', () => {
    it('double-clicking a task title opens edit mode without calling onToggleTask, and sanitizes saved edits', () => {
      vi.useFakeTimers();
      const onToggleTask = vi.fn();
      const onUpdateTask = vi.fn();

      render(
        <MemoryRouter>
          <Checklist
            categories={[
              {
                id: 'cat-1',
                name: 'Constitucional',
                weight: 25,
                examGroup: 'especificos',
                tasks: [
                  { id: 't1', title: 'Controle Difuso', priority: 'high', completed: false },
                ],
                simuladoStats: {
                  history: [
                    { id: 'h-bad', date: '2026-05-01', score: 0, valid: false },
                    { id: 'h-ok', date: '15/05/2026', score: 85, valid: true },
                  ],
                },
              },
            ]}
            showSimuladoStats={true}
            filter="all"
            setFilter={vi.fn()}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={vi.fn()}
            onAddCategory={vi.fn()}
            onDeleteCategory={vi.fn()}
            onAddTask={vi.fn()}
            onTogglePriority={vi.fn()}
            onPlayContext={vi.fn()}
            onImportCategory={vi.fn()}
          />
        </MemoryRouter>
      );

      // Weight & exam group badges visible
      expect(screen.getByText('Peso 25')).toBeTruthy();
      expect(screen.getByText('Específicos')).toBeTruthy();
      // Only 1 valid simulado history entry counted (invalid one filtered out)
      expect(screen.getByText('1 registro')).toBeTruthy();

      const titleBtn = screen.getByText('Controle Difuso').closest('button');
      fireEvent.click(titleBtn, { detail: 1 });
      fireEvent.click(titleBtn, { detail: 2 });
      fireEvent.doubleClick(titleBtn);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Must NOT have toggled completion during double-click
      expect(onToggleTask).not.toHaveBeenCalled();

      // Edit input is open and sanitizes malicious HTML
      const input = screen.getByPlaceholderText('Nome do assunto...');
      fireEvent.change(input, { target: { value: '<img src=x onerror=alert(1)>Controle Concentrado' } });
      fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));

      expect(onUpdateTask).toHaveBeenCalledWith('cat-1', 't1', expect.objectContaining({
        title: 'Controle Concentrado',
      }));
    });

    it('hides categories with 0 matching tasks when priorityFilter is active and shows Trash message on task delete', () => {
      render(
        <MemoryRouter>
          <Checklist
            categories={[
              {
                id: 'cat-1',
                name: 'Direito Penal',
                tasks: [{ id: 't1', title: 'Tipicidade', priority: 'high', completed: false }],
              },
              {
                id: 'cat-2',
                name: 'Atualidades',
                tasks: [{ id: 't2', title: 'Clima', priority: 'low', completed: false }],
              },
            ]}
            filter="all"
            setFilter={vi.fn()}
            priorityFilter="high"
            onClearPriorityFilter={vi.fn()}
            onToggleTask={vi.fn()}
            onUpdateTask={vi.fn()}
            onDeleteTask={vi.fn()}
            onAddCategory={vi.fn()}
            onDeleteCategory={vi.fn()}
            onAddTask={vi.fn()}
            onTogglePriority={vi.fn()}
            onPlayContext={vi.fn()}
            onImportCategory={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Direito Penal')).toBeTruthy();
      expect(screen.queryByText('Atualidades')).toBeNull();

      // Click delete task button -> modal mentions Trash (lixeira), NOT irreversible deletion
      fireEvent.click(screen.getByLabelText('Excluir tarefa: Tipicidade'));
      expect(screen.getByText(/movido para a lixeira/i)).toBeTruthy();
      expect(screen.queryByText(/não pode ser desfeita/i)).toBeNull();
    });
  });

  describe('8. CategoryEditor: Prevents Background Wipe, Preserves minCutoff: null & Edits Weight/Icon', () => {
    it('does not reset typed changes on parent re-render and saves weight, icon, and null minCutoff', () => {
      const updateSpy = vi.fn();
      const prevState = useAppStore.getState();
      useAppStore.setState({
        ...prevState,
        updateCategoryFields: updateSpy,
        appState: {
          ...(prevState.appState || {}),
          activeId: 'c-ed',
          contests: {
            'c-ed': {
              id: 'c-ed',
              categories: [{ id: 'cat-1', name: 'Português', weight: 10, maxScore: 100, minScore: 0, minCutoff: null }],
            },
          },
        },
      });

      const onClose = vi.fn();
      const { rerender } = render(
        <CategoryEditor
          category={{ id: 'cat-1', name: 'Português', weight: 10, maxScore: 100, minScore: 0, minCutoff: null, icon: '📚' }}
          isOpen={true}
          onClose={onClose}
        />
      );

      const nameInput = screen.getByLabelText('Nome');
      fireEvent.change(nameInput, { target: { value: 'Língua Portuguesa' } });
      const weightInput = screen.getByLabelText('Peso Edital');
      fireEvent.change(weightInput, { target: { value: '25' } });
      fireEvent.click(screen.getByRole('button', { name: 'Ícone ⚖️' }));

      // Simulate parent re-render passing a cloned category object with the same id
      rerender(
        <CategoryEditor
          category={{ id: 'cat-1', name: 'Português', weight: 10, maxScore: 100, minScore: 0, minCutoff: null, icon: '📚' }}
          isOpen={true}
          onClose={onClose}
        />
      );

      // User's edits MUST remain intact!
      expect(screen.getByLabelText('Nome').value).toBe('Língua Portuguesa');

      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(updateSpy).toHaveBeenCalledWith('cat-1', expect.objectContaining({
        name: 'Língua Portuguesa',
        weight: 25,
        icon: '⚖️',
        minCutoff: null,
      }));
    });
  });

  describe('9. Store Slices: Agenda Cascade, Coach Sync, Trash XP Recovery & Cache Invalidation', () => {
    let mockState;
    let setFn;
    let awardSpy;

    beforeEach(() => {
      awardSpy = vi.fn();
      mockState = {
        appState: {
          activeId: 'c1',
          version: 1,
          trash: [],
          pomodoro: {},
          contests: {
            c1: {
              id: 'c1',
              contestName: 'PF',
              user: { name: 'PF', xp: 500, level: 3 },
              mcWeights: { 'cat-1': 10 },
              categories: [
                {
                  id: 'cat-1',
                  name: 'Direito Penal',
                  weight: 10,
                  tasks: [
                    { id: 't-1', title: 'Tipicidade', text: 'Tipicidade', priority: 'high', completed: true, awardedXP: 200 },
                  ],
                },
              ],
              agenda: [
                { id: 'ag-1', categoryId: 'cat-1', subject: 'Direito Penal', date: '2026-06-01', title: 'Estudar Penal' },
              ],
              coachPlan: [
                { id: 'cp-1', sourceTaskId: 't-1', subject: 'Direito Penal', topicName: 'Avanço de Edital — Tipicidade', priority: 'high' },
              ],
              coachPlanner: {
                mon: [{ id: 'pl-1', sourceTaskId: 't-1', subject: 'Direito Penal', priority: 'high' }],
              },
            },
          },
        },
      };
      setFn = (fn) => fn(mockState);
    });

    it('cascades category rename to agenda, syncs weight to mcWeights, and clears Coach cache', () => {
      cacheSet(_urgencyCache, 10, 'k1', { score: 88 });
      const catSlice = createCategorySlice(setFn);

      catSlice.updateCategoryFields('cat-1', { name: 'Penal Especial', weight: 22 });
      const contest = mockState.appState.contests.c1;
      expect(contest.agenda[0].subject).toBe('Penal Especial');
      expect(contest.mcWeights['cat-1']).toBe(22);
      expect(_urgencyCache.size).toBe(0);
    });

    it('syncs task rename & priority to Coach mirrors, deletes mirror on deleteTask, and restores XP on restoreFromTrash', () => {
      const getFn = () => ({
        appState: mockState.appState,
        awardExperience: awardSpy,
      });
      const taskSlice = createTaskSlice(setFn, getFn);
      const trashSlice = createTrashSlice(setFn, getFn);

      taskSlice.updateTask('cat-1', 't-1', { title: 'Fato Típico' });
      expect(mockState.appState.contests.c1.coachPlan[0].topicName).toBe('Avanço de Edital — Fato Típico');

      taskSlice.togglePriority('cat-1', 't-1'); // high -> low
      expect(mockState.appState.contests.c1.coachPlan[0].priority).toBe('low');
      expect(mockState.appState.contests.c1.coachPlanner.mon[0].priority).toBe('low');

      awardSpy.mockClear();
      taskSlice.deleteTask('cat-1', 't-1');
      expect(mockState.appState.contests.c1.coachPlan).toHaveLength(0);
      expect(mockState.appState.contests.c1.coachPlanner.mon).toHaveLength(0);
      expect(awardSpy).toHaveBeenCalledWith(-100, { skipVersionBump: true });

      awardSpy.mockClear();
      const trashId = mockState.appState.trash[0].id;
      trashSlice.restoreFromTrash(trashId);
      expect(mockState.appState.contests.c1.categories[0].tasks).toHaveLength(1);
      expect(awardSpy).toHaveBeenCalledWith(100, { skipVersionBump: true });
    });

    it('updateUserName ignores blank/HTML-only names and sanitizes input', () => {
      const gamSlice = createGamificationSlice(setFn);
      gamSlice.updateUserName('   ');
      expect(mockState.appState.contests.c1.contestName).toBe('PF');

      gamSlice.updateUserName('<script>x</script>PRF 2026');
      expect(mockState.appState.contests.c1.contestName).toBe('PRF 2026');
      expect(mockState.appState.contests.c1.user.name).toBe('PRF 2026');
    });
  });
});
