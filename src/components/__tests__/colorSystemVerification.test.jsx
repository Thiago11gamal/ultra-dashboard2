import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    normalizeHexColor,
    hexToRgba,
    getCategoryColorStyles,
    normalizePriority,
    getPriorityConfig,
    normalizeSimuladoLevel,
    PRESET_CATEGORY_COLORS,
    DEFAULT_CATEGORY_COLOR
} from '../../utils/colorHelper';
import PriorityProgress from '../PriorityProgress';
import { useAppStore } from '../../store/useAppStore';

describe('Suíte de Verificação Abrangente do Sistema de Cores e Prioridades', () => {
    describe('1. Ciclo e Normalização de Prioridades', () => {
        it('cicla corretamente low -> medium -> high -> low', () => {
            const low = getPriorityConfig('low');
            expect(low.key).toBe('low');
            expect(low.label).toBe('Baixa');
            expect(low.next).toBe('Média');

            const med = getPriorityConfig('medium');
            expect(med.key).toBe('medium');
            expect(med.label).toBe('Média');
            expect(med.next).toBe('Alta');

            const high = getPriorityConfig('high');
            expect(high.key).toBe('high');
            expect(high.label).toBe('Alta');
            expect(high.next).toBe('Baixa');
        });

        it('reconhece termos em português ("alta", "média", "media", "baixa") sem quebrar', () => {
            expect(normalizePriority('alta')).toBe('high');
            expect(normalizePriority('Alta')).toBe('high');
            expect(normalizePriority('urgente')).toBe('high');

            expect(normalizePriority('média')).toBe('medium');
            expect(normalizePriority('media')).toBe('medium');
            expect(normalizePriority('Média')).toBe('medium');

            expect(normalizePriority('baixa')).toBe('low');
            expect(normalizePriority('Baixa')).toBe('low');

            // Configuração resolve perfeitamente
            expect(getPriorityConfig('alta').label).toBe('Alta');
            expect(getPriorityConfig('media').label).toBe('Média');
            expect(getPriorityConfig('baixa').label).toBe('Baixa');
        });

        it('togglePriority no store aceita tarefas com prioridade em português e avança para a próxima corretamente', () => {
            const state = useAppStore.getState();
            // Cria contest de teste isolado
            useAppStore.setState({
                appState: {
                    activeId: 'contest_color_test',
                    contests: {
                        contest_color_test: {
                            id: 'contest_color_test',
                            maxScore: 100,
                            categories: [
                                {
                                    id: 'cat_test_1',
                                    name: 'Direito Constitucional',
                                    tasks: [
                                        { id: 't1', title: 'Artigo 5º', priority: 'alta' }
                                    ]
                                }
                            ]
                        }
                    }
                }
            });

            // togglePriority com 'alta' deve avançar para 'low'
            useAppStore.getState().togglePriority('cat_test_1', 't1');
            const tasksAfter1 = useAppStore.getState().appState.contests.contest_color_test.categories[0].tasks;
            expect(tasksAfter1[0].priority).toBe('low');

            // de 'low' para 'medium'
            useAppStore.getState().togglePriority('cat_test_1', 't1');
            const tasksAfter2 = useAppStore.getState().appState.contests.contest_color_test.categories[0].tasks;
            expect(tasksAfter2[0].priority).toBe('medium');

            // de 'medium' para 'high'
            useAppStore.getState().togglePriority('cat_test_1', 't1');
            const tasksAfter3 = useAppStore.getState().appState.contests.contest_color_test.categories[0].tasks;
            expect(tasksAfter3[0].priority).toBe('high');
        });
    });

    describe('2. Atribuição Automática de Cores Distintas para Novas Categorias', () => {
        it('ao adicionar múltiplas disciplinas, cada uma recebe uma cor diferente da paleta', () => {
            useAppStore.setState({
                appState: {
                    activeId: 'contest_auto_color',
                    contests: {
                        contest_auto_color: {
                            id: 'contest_auto_color',
                            maxScore: 100,
                            categories: []
                        }
                    }
                }
            });

            const addCategory = useAppStore.getState().addCategory;
            addCategory('Matéria 1');
            addCategory('Matéria 2');
            addCategory('Matéria 3');

            const cats = useAppStore.getState().appState.contests.contest_auto_color.categories;
            expect(cats.length).toBe(3);
            expect(cats[0].color).toBe(PRESET_CATEGORY_COLORS[0]);
            expect(cats[1].color).toBe(PRESET_CATEGORY_COLORS[1]);
            expect(cats[2].color).toBe(PRESET_CATEGORY_COLORS[2]);
            expect(cats[0].color).not.toBe(cats[1].color);
        });
    });

    describe('3. Normalização de Níveis de Simulado (Nível Alto, Médio, Baixo)', () => {
        it('normaliza variações textuais de nível com ou sem acento', () => {
            const high = normalizeSimuladoLevel('ALTO');
            expect(high.label).toBe('Alto');
            expect(high.badgeClasses).toContain('text-emerald-400');

            const med1 = normalizeSimuladoLevel('MÉDIO');
            expect(med1.label).toBe('Médio');
            expect(med1.badgeClasses).toContain('text-amber-400');

            const med2 = normalizeSimuladoLevel('MEDIO');
            expect(med2.label).toBe('Médio');
            expect(med2.badgeClasses).toContain('text-amber-400');

            const low = normalizeSimuladoLevel('baixo');
            expect(low.label).toBe('Baixo');
            expect(low.badgeClasses).toContain('text-rose-400');
        });

        it('deduz automaticamente nível caso venha ausente ou "-" baseado na média', () => {
            const dedAlto = normalizeSimuladoLevel('-', 70.3, 100);
            expect(dedAlto.label).toBe('Alto');
            expect(dedAlto.badgeClasses).toContain('text-emerald-400');

            const dedMedio = normalizeSimuladoLevel('', 50, 100);
            expect(dedMedio.label).toBe('Médio');

            const dedBaixo = normalizeSimuladoLevel(null, 30, 100);
            expect(dedBaixo.label).toBe('Baixo');
        });
    });

    describe('4. Harmonia Visual em PriorityProgress', () => {
        it('renderiza barras e rótulos de prioridade sem erro com as cores harmonizadas', () => {
            const mockCategories = [
                {
                    id: 'c1',
                    name: 'Geral',
                    tasks: [
                        { id: 't1', title: 'Assunto 1', priority: 'high', completed: true },
                        { id: 't2', title: 'Assunto 2', priority: 'medium', completed: false },
                        { id: 't3', title: 'Assunto 3', priority: 'low', completed: false }
                    ]
                }
            ];

            render(<PriorityProgress categories={mockCategories} />);

            expect(screen.getByText(/Prioridade alta/i)).toBeTruthy();
            expect(screen.getByText(/Prioridade média/i)).toBeTruthy();
            expect(screen.getByText(/Prioridade baixa/i)).toBeTruthy();
            expect(screen.getByText('1/1')).toBeTruthy(); // High concluída
        });
    });
});

