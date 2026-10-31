import { describe, it, expect } from 'vitest';
import { parseTaskDisplay, cleanTaskTitle } from '../taskTitleHelper';

describe('taskTitleHelper - parseTaskDisplay', () => {
    const mockCategory = {
        id: 'cat-obrigacoes',
        name: 'Direito das Obrigações',
        tasks: [
            { id: 't1', text: 'Modalidades das Obrigações', completed: false },
            { id: 't2', text: 'Inadimplemento Relativo e Absoluto', completed: false }
        ]
    };

    const mockCategoriesList = [
        mockCategory,
        {
            id: 'cat-penal',
            name: 'Direito Penal',
            tasks: [
                { id: 'p1', text: 'Teoria do Crime', completed: true },
                { id: 'p2', text: 'Tipicidade e Ilicitude', completed: false }
            ]
        }
    ];

    it('substitui títulos genéricos de questão por assunto real da disciplina e extrai alerta ao lado', () => {
        const raw = 'Direito das Obrigações: [Bateria Ativa — 15 Questões Mistas]';
        const parsed = parseTaskDisplay(raw, 'Direito das Obrigações', mockCategory);

        expect(parsed.displayTopic).toBe('Modalidades das Obrigações');
        expect(parsed.alertBadge).toEqual(expect.objectContaining({
            label: 'Síntese',
            icon: '🧠',
            text: 'Consolidação Teórica'
        }));
    });

    it('extrai alerta e preserva assunto concreto quando já especificado', () => {
        const raw = 'Direito das Obrigações: [Avanço de Edital — Pagamento Indevido]';
        const parsed = parseTaskDisplay(raw, 'Direito das Obrigações', mockCategory);

        expect(parsed.displayTopic).toBe('Pagamento Indevido');
        expect(parsed.alertBadge).toEqual(expect.objectContaining({
            label: 'Edital',
            icon: '📖',
            text: 'Avanço de Edital'
        }));
    });

    it('extrai alerta de recência e protocolo prioritário', () => {
        const raw = 'Direito das Obrigações: [PROTOCOLO PRIORITÁRIO] [Revisão por Recência — Cláusula Penal]';
        const parsed = parseTaskDisplay(raw, 'Direito das Obrigações', mockCategory);

        expect(parsed.displayTopic).toBe('Cláusula Penal');
        expect(parsed.isPriority).toBe(true);
        expect(parsed.alertBadge).toEqual(expect.objectContaining({
            label: 'Recência',
            icon: '🧊'
        }));
    });

    it('localiza categoria automaticamente quando uma lista de categorias é passada', () => {
        const raw = 'Direito Penal: [Consolidação Teórica]';
        const parsed = parseTaskDisplay(raw, 'Direito Penal', mockCategoriesList);

        // p1 está concluído, deve pegar p2 (primeira não concluída)
        expect(parsed.displayTopic).toBe('Tipicidade e Ilicitude');
        expect(parsed.alertBadge).toEqual(expect.objectContaining({
            label: 'Síntese'
        }));
    });

    it('quando fornecido apenas o nome da disciplina, busca o assunto concreto no edital', () => {
        const raw = 'Direito das Obrigações';
        const parsed = parseTaskDisplay(raw, 'Direito das Obrigações', mockCategory);

        expect(parsed.displayTopic).toBe('Modalidades das Obrigações');
    });

    it('se não houver tarefas cadastradas, usa Teoria Geral e Fundamentos em vez de genéricos de questões', () => {
        const emptyCategory = { id: 'cat-empty', name: 'Direito Ambiental', tasks: [] };
        const raw = 'Direito Ambiental: [Bateria Ativa — 15 Questões Mistas]';
        const parsed = parseTaskDisplay(raw, 'Direito Ambiental', emptyCategory);

        expect(parsed.displayTopic).toBe('Teoria Geral e Fundamentos');
        expect(parsed.alertBadge).toEqual(expect.objectContaining({
            label: 'Síntese'
        }));
    });

    it('identifica corretamente Estudo Livre / Foco Aberto com badge próprio', () => {
        const raw = 'Estudo Livre / Foco Aberto';
        const parsed = parseTaskDisplay(raw, 'Geral');

        expect(parsed.displayTopic).toBe('Estudo Livre / Foco Aberto');
        expect(parsed.alertBadge).toEqual(expect.objectContaining({
            label: 'Livre',
            icon: '⏱️'
        }));
    });

    it('decodifica entidades HTML e limpa prefixos de alerta em cleanTaskTitle', () => {
        const raw = 'Direito Civil: [Avanço de Edital &mdash; Teoria Geral do Negócio Jurídico]';
        const cleaned = cleanTaskTitle(raw, 'Direito Civil');

        expect(cleaned).toBe('Teoria Geral do Negócio Jurídico');
    });
});

