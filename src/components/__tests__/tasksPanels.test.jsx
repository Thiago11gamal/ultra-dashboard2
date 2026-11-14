import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Mock hooks and store
vi.mock('../../hooks/useToast', () => ({
  useToast: () => vi.fn()
}));

vi.mock('../ConfirmModal', () => ({
  default: () => null
}));

const mockContest = {
  id: 'contest-test',
  maxScore: 100,
  minScore: 0,
  categories: [
    {
      id: 'cat-1',
      name: 'Direito Constitucional',
      color: '#3b82f6',
      icon: '⚖️',
      weight: 10,
      tasks: [
        { id: 't-1', title: 'Artigo 5º', completed: true },
        { id: 't-2', title: 'Nacionalidade', completed: false }
      ],
      simuladoStats: {
        history: [
          {
            date: '2026-11-14',
            correct: 8,
            total: 10,
            score: 80,
            topics: [{ name: 'Artigo 5º', correct: 8, total: 10 }]
          }
        ]
      }
    }
  ],
  simuladoRows: [],
  simulados: []
};

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector) => {
    if (typeof selector === 'function') {
      return selector({
        appState: {
          activeId: 'contest-test',
          contests: {
            'contest-test': mockContest
          }
        },
        resetSimuladoStats: vi.fn()
      });
    }
    return vi.fn();
  }
}));

import Tasks from '../../pages/Tasks';

describe('Tasks Page - Two Panels Division', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders executive summary strip and panel tabs', () => {
    const html = renderToStaticMarkup(<Tasks />);
    expect(html).toContain('Tarefas &amp; Performance');
    expect(html).toContain('Rankings &amp; Destaques');
    expect(html).toContain('Quadro de Performance');
    expect(html).toContain('Progresso do Edital');
    expect(html).toContain('Volume Total');
    expect(html).toContain('Aproveitamento');
    expect(html).toContain('Saldo Global');
  });

  it('renders Panel 1 (Rankings & Destaques) by default', () => {
    const html = renderToStaticMarkup(<Tasks />);
    expect(html).toContain('Painel 1 · Rankings &amp; Destaques');
    expect(html).toContain('MVP Dominante');
    expect(html).toContain('Quadro de Performance');
  });

  it('renders Panel 2 when localStorage is set to performance', () => {
    localStorage.setItem('tasks_active_panel', 'performance');
    const html = renderToStaticMarkup(<Tasks />);
    expect(html).toContain('Painel 2 · Quadro de Performance');
    expect(html).toContain('Rendimento por Assuntos Específicos');
  });
});
