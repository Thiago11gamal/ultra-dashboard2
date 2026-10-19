import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RaioXDashboard } from '../../pages/Coach.jsx';

// Mock recharts for clean static markup rendering in tests
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }) => <div className="recharts-mock-container">{children}</div>,
    };
});

describe('RaioXDashboard (Raio-X Técnico no Coach)', () => {
    it('1. Renders complete empty states safely without crashing', () => {
        const html = renderToStaticMarkup(<RaioXDashboard data={{}} />);

        // Monitor de Calibração empty state
        expect(html).toContain('Amostra técnica em formação');
        expect(html).toContain('8 simulados por disciplina');

        // Log de Auditoria empty state
        expect(html).toContain('Log de Auditoria');
        expect(html).toContain('Nenhum evento registrado');

        // Confiabilidade (ECE) empty state
        expect(html).toContain('Confiabilidade (ECE)');
        expect(html).toContain('Sem buckets de confiabilidade ainda');

        // Drift Temporal empty state
        expect(html).toContain('Drift Temporal (Brier/ECE)');
        expect(html).toContain('Dados temporais insuficientes');
    });

    it('2. Renders all 4 sections completely when calibration data is present', () => {
        const mockData = {
            categories: [
                { id: 'cat-const', name: 'Direito Constitucional' },
                { id: 'cat-port', name: 'Língua Portuguesa' }
            ],
            calibrationOps: {
                'cat-const': { degraded: true, categoryName: 'Direito Constitucional' },
                'cat-port': { degraded: false, categoryName: 'Língua Portuguesa' }
            },
            calibrationHistoryByCategory: {
                'cat-const': [
                    { timestamp: 1700000000000, avgBrier: 0.29, calibrationPenalty: 0.15 },
                    { timestamp: 1700086400000, avgBrier: 0.31, calibrationPenalty: 0.22 }
                ],
                'cat-port': [
                    { timestamp: 1700000000000, avgBrier: 0.12, calibrationPenalty: 0.02 },
                    { timestamp: 1700086400000, avgBrier: 0.14, calibrationPenalty: 0.01 }
                ]
            },
            calibrationAuditLog: [
                {
                    timestamp: 1700086400000,
                    categoryId: 'cat-const',
                    categoryName: 'Direito Constitucional',
                    avgBrier: 0.31,
                    ece: 0.14,
                    calibrationPenalty: 0.22,
                    probability: 0.65,
                    degraded: true,
                    reliability: [
                        { count: 12, meanPred: 0.70, observedRate: 0.60, gap: 0.10 }
                    ]
                },
                {
                    timestamp: 1700000000000,
                    categoryId: 'cat-const',
                    categoryName: 'Direito Constitucional',
                    avgBrier: 0.29,
                    ece: 0.12,
                    calibrationPenalty: 0.15,
                    probability: 0.68,
                    degraded: true,
                    reliability: [
                        { count: 10, meanPred: 0.65, observedRate: 0.58, gap: 0.07 }
                    ]
                },
                {
                    timestamp: 1700086400000,
                    categoryId: 'cat-port',
                    categoryName: 'Língua Portuguesa',
                    avgBrier: 0.14,
                    ece: 0.05,
                    calibrationPenalty: 0.01,
                    probability: 0.82,
                    degraded: false,
                    reliability: [
                        { count: 15, meanPred: 0.80, observedRate: 0.81, gap: 0.01 }
                    ]
                }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockData} />);

        // Section 1: Monitor de Calibração
        expect(html).toContain('Monitor de Calibração');
        expect(html).toContain('Direito Constitucional');
        expect(html).toContain('Língua Portuguesa');
        expect(html).toContain('Degradado');
        expect(html).toContain('Estável');
        expect(html).toContain('Pena:');

        // Section 2: Log de Auditoria
        expect(html).toContain('Log de Auditoria');
        expect(html).toContain('Brier (erro)');
        expect(html).toContain('ECE (calib.)');
        expect(html).toContain('Prob Final');
        expect(html).toContain('65%');
        expect(html).toContain('82%');

        // Section 3: Confiabilidade (ECE)
        expect(html).toContain('Confiabilidade (ECE)');
        expect(html).toContain('ECE médio:');

        // Section 4: Drift Temporal (Brier/ECE)
        expect(html).toContain('Drift Temporal (Brier/ECE)');
        expect(html).toContain('Brier (escala 0–0.50)');
        expect(html).toContain('ECE (escala 0–0.30)');
    });

    it('3. Handles missing or null properties in rows resiliently', () => {
        const mockCorruptData = {
            categories: [{ id: null, name: '' }],
            calibrationOps: null,
            calibrationHistoryByCategory: {
                'unknown': [
                    { timestamp: null, avgBrier: null, calibrationPenalty: null }
                ]
            },
            calibrationAuditLog: [
                { timestamp: NaN, avgBrier: undefined, ece: null, probability: null, degraded: false }
            ]
        };

        expect(() => {
            const html = renderToStaticMarkup(<RaioXDashboard data={mockCorruptData} />);
            expect(typeof html).toBe('string');
        }).not.toThrow();
    });
});
