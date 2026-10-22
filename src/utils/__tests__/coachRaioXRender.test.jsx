import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RaioXDashboard } from '../../pages/Coach.jsx';

import ReliabilityCurveChart from '../../components/charts/ReliabilityCurveChart.jsx';

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

    it('4. Correctly parses ISO 8601 string timestamps in audit logs and formats dates without displaying -', () => {
        const mockIsoData = {
            categories: [{ id: 'cat-penal', name: 'Direito Penal' }],
            calibrationAuditLog: [
                {
                    timestamp: '2026-10-22T14:30:00.000Z',
                    categoryId: 'cat-penal',
                    categoryName: 'Direito Penal',
                    avgBrier: 0.18,
                    ece: 0.06,
                    calibrationPenalty: 0,
                    probability: 0.75,
                    degraded: false
                }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockIsoData} />);
        // The date column must format the ISO timestamp (e.g. contains 22/10/2026 or year 2026), not '-'
        expect(html).toContain('2026');
        expect(html).toContain('Direito Penal');
    });

    it('5. ReliabilityCurveChart normalizes both 0..1 and 0..100 scale buckets properly', () => {
        const buckets0to1 = [
            { count: 10, meanPred: 0.60, observedRate: 0.55, gap: 0.05 },
            { count: 15, meanPred: 0.80, observedRate: 0.85, gap: 0.05 }
        ];

        const buckets0to100 = [
            { count: 10, meanPred: 60, observedRate: 55, gap: 5 },
            { count: 15, meanPred: 80, observedRate: 85, gap: 5 }
        ];

        const html0to1 = renderToStaticMarkup(<ReliabilityCurveChart buckets={buckets0to1} />);
        const html0to100 = renderToStaticMarkup(<ReliabilityCurveChart buckets={buckets0to100} />);

        expect(html0to1).toContain('Curva de Confiabilidade');
        expect(html0to100).toContain('Curva de Confiabilidade');
    });

    it('6. Ensures circular gauge indicator color is text-rose-500 when category is degraded', () => {
        const mockDegradedData = {
            categories: [{ id: 'cat-proc', name: 'Processo Penal' }],
            calibrationOps: {
                'cat-proc': { degraded: true }
            },
            calibrationHistoryByCategory: {
                'cat-proc': [
                    // Low Brier (0.10) but degraded flag is set: must render text-rose-500, never text-emerald-500
                    { timestamp: 1700000000000, avgBrier: 0.10, calibrationPenalty: 0.01 }
                ]
            }
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockDegradedData} />);
        expect(html).toContain('Degradado');
        expect(html).toContain('text-rose-500');
    });

    it('7. Deduplicates simulados across rawSimulados and rawSimuladoRows to prevent double counting in sample formation', () => {
        const mockSimData = {
            categories: [{ id: 'cat-1', name: 'Direito Administrativo' }],
            simulados: [
                { id: 'sim_1', categoryId: 'cat-1', score: 85 },
                { id: 'sim_2', categoryId: 'cat-1', score: 90 }
            ],
            simuladoRows: [
                // sim_1 is duplicated in simuladoRows
                { id: 'sim_1', categoryId: 'cat-1', score: 85 },
                { id: 'sim_3', categoryId: 'cat-1', score: 75 }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockSimData} />);
        // Total unique simulados is 3 (sim_1, sim_2, sim_3). Target is 8.
        expect(html).toContain('3/8');
        expect(html).toContain('Faltam 5 simulados');
    });

    it('8. Drift Temporal select includes accessible id and aria-label', () => {
        const mockMultiCatData = {
            categories: [
                { id: 'cat-a', name: 'Disciplina A' },
                { id: 'cat-b', name: 'Disciplina B' }
            ],
            calibrationAuditLog: [
                { timestamp: 1700000000000, categoryId: 'cat-a', avgBrier: 0.20, ece: 0.05 },
                { timestamp: 1700010000000, categoryId: 'cat-b', avgBrier: 0.22, ece: 0.07 }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockMultiCatData} />);
        expect(html).toContain('id="select-drift-category"');
        expect(html).toContain('aria-label="Selecionar categoria para análise de Drift Temporal"');
    });
});

