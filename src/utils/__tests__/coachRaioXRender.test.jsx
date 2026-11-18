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

    it('9. Preserves sample formation progress bar when history only has uncalibrated (n < 8) entries with null Brier and 0 penalty', () => {
        const mockUncalibratedData = {
            categories: [
                {
                    id: 'cat-const',
                    name: 'Direito Constitucional',
                    simuladoStats: {
                        history: [
                            { date: '2026-10-01', score: 70 },
                            { date: '2026-10-02', score: 75 },
                            { date: '2026-10-03', score: 80 },
                            { date: '2026-10-04', score: 85 }
                        ]
                    }
                }
            ],
            simulados: [
                // Same dates as simuladoStats.history -> must deduplicate to 4/8, not 8/8
                { id: 's1', categoryId: 'cat-const', date: '2026-10-01', score: 70 },
                { id: 's2', categoryId: 'cat-const', date: '2026-10-02', score: 75 }
            ],
            simuladoRows: [
                { id: 'r1', categoryId: 'cat-const', date: '2026-10-01', correct: 7, total: 10 },
                { id: 'r2', categoryId: 'cat-const', date: '2026-10-01', correct: 7, total: 10 }
            ],
            calibrationHistoryByCategory: {
                'cat-const': [
                    { timestamp: 1700000000000, avgBrier: null, ece: null, calibrationPenalty: 0, probability: 0.65 }
                ]
            }
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockUncalibratedData} />);
        expect(html).toContain('Amostra técnica em formação');
        expect(html).toContain('4/8');
        expect(html).toContain('Faltam 4 simulados');
    });

    it('10. Does not collide categories that lack explicit .id via task-null-sentinel in calibrationSummary', () => {
        const mockNoIdCategoriesData = {
            categories: [
                {
                    name: 'Direito Penal',
                    simuladoStats: {
                        history: Array.from({ length: 9 }, (_, i) => ({
                            date: `2026-10-0${i + 1}`,
                            score: 75
                        }))
                    }
                },
                {
                    name: 'Direito Civil',
                    simuladoStats: {
                        history: Array.from({ length: 12 }, (_, i) => ({
                            date: `2026-10-${String(i + 1).padStart(2, '0')}`,
                            score: 82
                        }))
                    }
                }
            ],
            calibrationHistoryByCategory: {
                'Direito Penal': [
                    { timestamp: 1700000000000, categoryName: 'Direito Penal', avgBrier: 0.16, ece: 0.04, calibrationPenalty: 0 }
                ],
                'Direito Civil': [
                    { timestamp: 1700000000000, categoryName: 'Direito Civil', avgBrier: 0.21, ece: 0.06, calibrationPenalty: 0 }
                ]
            }
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockNoIdCategoriesData} />);
        expect(html).toContain('Direito Penal');
        expect(html).toContain('Direito Civil');
        expect(html).toContain('n=9');
        expect(html).toContain('n=12');
    });

    it('11. Displays both calibrated categories and uncalibrated categories in mixed state without hiding uncalibrated disciplines', () => {
        const mockMixedData = {
            categories: [
                { id: 'cat-const', name: 'Direito Constitucional' },
                { id: 'cat-port', name: 'Língua Portuguesa' }
            ],
            calibrationOps: {
                'cat-const': { degraded: false }
            },
            calibrationHistoryByCategory: {
                'cat-const': [
                    { timestamp: 1700000000000, avgBrier: 0.14, ece: 0.04, calibrationPenalty: 0 }
                ]
            },
            simulados: [
                { id: 's1', categoryId: 'cat-const', score: 90 },
                { id: 's2', categoryId: 'cat-port', score: 60 },
                { id: 's3', categoryId: 'cat-port', score: 65 }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockMixedData} />);

        // Must display Monitor de Calibração with Direito Constitucional
        expect(html).toContain('Monitor de Calibração');
        expect(html).toContain('Direito Constitucional');

        // Crucial: Must ALSO display Língua Portuguesa with its formation progress (2/8, Faltam 6 simulados)
        expect(html).toContain('Amostra em formação (n &lt; 8)');
        expect(html).toContain('Língua Portuguesa');
        expect(html).toContain('2/8');
        expect(html).toContain('Faltam 6 simulados');
    });

    it('12. Deduplicates rows across category aliases in mergedByCanonical to prevent count doubling', () => {
        const mockAliasData = {
            categories: [
                { id: 'cat-penal', name: 'Direito Penal' }
            ],
            calibrationHistoryByCategory: {
                // Same timestamp row saved under both ID and categoryName
                'cat-penal': [
                    { timestamp: 1700000000000, avgBrier: 0.16, ece: 0.04 }
                ],
                'Direito Penal': [
                    { timestamp: 1700000000000, avgBrier: 0.16, ece: 0.04 }
                ]
            }
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockAliasData} />);
        expect(html).toContain('Direito Penal');
        // Count must be 1, not 2
        expect(html).toContain('1 auditoria(s) registrada(s)');
    });

    it('11. Preserves distinct same-day same-score entries in catStatsHistory without collapsing count', () => {
        const mockSameDayData = {
            categories: [
                {
                    id: 'cat-const',
                    name: 'Direito Constitucional',
                    simuladoStats: {
                        history: [
                            { date: '2026-10-01', score: 75 },
                            { date: '2026-10-01', score: 75 }
                        ]
                    }
                }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockSameDayData} />);
        expect(html).toContain('2/8');
        expect(html).toContain('Faltam 6 simulados');
    });

    it('12. Shows Aguardando calibração when n >= 8 but stochastic calibration metrics are not yet calibrated', () => {
        const mockPendingOnlyData = {
            categories: [
                {
                    id: 'cat-adm',
                    name: 'Direito Administrativo',
                    simuladoStats: {
                        history: Array.from({ length: 8 }, (_, i) => ({
                            date: `2026-10-${String(i + 1).padStart(2, '0')}`,
                            score: 75
                        }))
                    }
                }
            ],
            calibrationHistoryByCategory: {
                'cat-adm': [
                    { timestamp: 1700000000000, avgBrier: null, ece: null, calibrationPenalty: 0, probability: 0.65 }
                ]
            }
        };

        const emptySummaryHtml = renderToStaticMarkup(<RaioXDashboard data={mockPendingOnlyData} />);
        expect(emptySummaryHtml).toContain('Aguardando calibração');
        expect(emptySummaryHtml).not.toContain('>Calibrado<');

        const mockMixedPendingData = {
            categories: [
                mockPendingOnlyData.categories[0],
                {
                    id: 'cat-pen',
                    name: 'Direito Penal',
                    simuladoStats: {
                        history: Array.from({ length: 8 }, (_, i) => ({
                            date: `2026-10-${String(i + 1).padStart(2, '0')}`,
                            score: 80
                        }))
                    }
                }
            ],
            calibrationHistoryByCategory: {
                'cat-adm': [
                    { timestamp: 1700000000000, avgBrier: null, ece: null, calibrationPenalty: 0, probability: 0.65 }
                ],
                'cat-pen': [
                    { timestamp: 1700000000000, categoryName: 'Direito Penal', avgBrier: 0.14, ece: 0.04, calibrationPenalty: 0, probability: 0.78 }
                ]
            }
        };

        const mixedHtml = renderToStaticMarkup(<RaioXDashboard data={mockMixedPendingData} />);
        expect(mixedHtml).toContain('Aguardando calibração');
        expect(mixedHtml).toContain('Calibração estocástica pendente');
        expect(mixedHtml).not.toContain('>Calibrado<');
    });

    it('13. Does not double-count legacy manual simulados (unbatched simuladoStats.history + batched simuladoRows)', () => {
        const mockLegacyManualData = {
            categories: [
                {
                    id: 'cat-zan',
                    name: 'zanniti',
                    simuladoStats: {
                        history: [
                            { date: '2026-11-10', correct: 7, total: 10, score: 70 },
                            { date: '2026-11-12', correct: 8, total: 10, score: 80 },
                            { date: '2026-11-14', correct: 9, total: 10, score: 90 }
                        ]
                    }
                },
                {
                    id: 'cat-jec',
                    name: 'jeca',
                    simuladoStats: {
                        history: [
                            { date: '2026-11-10', correct: 6, total: 10, score: 60 },
                            { date: '2026-11-12', correct: 7, total: 10, score: 70 },
                            { date: '2026-11-14', correct: 8, total: 10, score: 80 }
                        ]
                    }
                }
            ],
            simulados: [
                { id: 'sim-1', batchId: 'batch-1', date: '2026-11-10', subject: 'Simulado Geral', type: 'auto-analyzer', score: 65 },
                { id: 'sim-2', batchId: 'batch-2', date: '2026-11-12', subject: 'Simulado Geral', type: 'auto-analyzer', score: 75 },
                { id: 'sim-3', batchId: 'batch-3', date: '2026-11-14', subject: 'Simulado Geral', type: 'auto-analyzer', score: 85 }
            ],
            simuladoRows: [
                { id: 'r1', batchId: 'batch-1', categoryId: 'cat-zan', subject: 'zanniti', topic: 'T1', date: '2026-11-10', correct: 4, total: 5, score: 80, isPercentage: true },
                { id: 'r2', batchId: 'batch-1', categoryId: 'cat-zan', subject: 'zanniti', topic: 'T2', date: '2026-11-10', correct: 3, total: 5, score: 60, isPercentage: true },
                { id: 'r3', batchId: 'batch-2', categoryId: 'cat-zan', subject: 'zanniti', topic: 'T1', date: '2026-11-12', correct: 8, total: 10, score: 80, isPercentage: true },
                { id: 'r4', batchId: 'batch-3', categoryId: 'cat-zan', subject: 'zanniti', topic: 'T1', date: '2026-11-14', correct: 9, total: 10, score: 90, isPercentage: true },
                { id: 'r5', batchId: 'batch-1', categoryId: 'cat-jec', subject: 'jeca', topic: 'T1', date: '2026-11-10', correct: 6, total: 10, score: 60, isPercentage: true },
                { id: 'r6', batchId: 'batch-2', categoryId: 'cat-jec', subject: 'jeca', topic: 'T1', date: '2026-11-12', correct: 7, total: 10, score: 70, isPercentage: true },
                { id: 'r7', batchId: 'batch-3', categoryId: 'cat-jec', subject: 'jeca', topic: 'T1', date: '2026-11-14', correct: 8, total: 10, score: 80, isPercentage: true }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockLegacyManualData} />);
        expect(html).toContain('3/8');
        expect(html).toContain('Faltam 5 simulados');
        expect(html).not.toContain('6/8');
    });

    it('14. Deduplicates same-day AI + manual simulado when legacy simuladoStats.history lost batchIds, and groups unbatched same-day rows', () => {
        const mockData = {
            categories: [
                {
                    id: 'cat-mix',
                    name: 'Direito Penal',
                    simuladoStats: {
                        history: [
                            { date: '2026-11-18', correct: 14, total: 20, score: 70 }
                        ]
                    }
                },
                {
                    id: 'cat-rows-only',
                    name: 'Direito Civil',
                    simuladoStats: { history: [] }
                }
            ],
            simulados: [
                { id: 'ai-sim-1', batchId: 'b-ai', categoryId: 'cat-mix', date: '2026-11-18', score: 90 }
            ],
            simuladoRows: [
                { id: 'ai-row-1', batchId: 'b-ai', categoryId: 'cat-mix', date: '2026-11-18', correct: 9, total: 10 },
                { id: 'man-row-1', batchId: 'b-man', categoryId: 'cat-mix', date: '2026-11-18', correct: 5, total: 10 },
                // cat-rows-only has 3 unbatched topic rows on the same date -> must count as 1 simulado, not 3
                { id: 'rc-1', categoryId: 'cat-rows-only', date: '2026-11-18', correct: 4, total: 5 },
                { id: 'rc-2', categoryId: 'cat-rows-only', date: '2026-11-18', correct: 3, total: 5 },
                { id: 'rc-3', categoryId: 'cat-rows-only', date: '2026-11-18', correct: 5, total: 5 },
                // Invalid/empty/unvalidated rows must not inflate sample formation
                { id: 'rc-empty', categoryId: 'cat-rows-only', date: '2026-11-19', correct: 0, total: 0 },
                { id: 'rc-unval', categoryId: 'cat-rows-only', date: '2026-11-20', score: 80, validated: false },
                { id: 'rc-phantom', categoryId: 'cat-rows-only', date: '2026-11-21', score: 0, timeSpent: 0, total: 0 }
            ]
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockData} />);
        expect(html).toContain('1/8');
        expect(html).toContain('Faltam 7 simulados');
        expect(html).not.toContain('3/8');
        expect(html).not.toContain('4/8');
    });

    it('15. Matches uppercase category IDs against lowercase calibrationHistoryByCategory keys', () => {
        const mockUpperIdData = {
            categories: [
                {
                    id: 'Cat_Upper_1',
                    name: 'Contabilidade',
                    simuladoStats: {
                        history: Array.from({ length: 8 }, (_, i) => ({
                            date: `2026-10-${String(i + 1).padStart(2, '0')}`,
                            score: 80
                        }))
                    }
                }
            ],
            calibrationHistoryByCategory: {
                cat_upper_1: [
                    { timestamp: 1700000000000, categoryName: 'Contabilidade', avgBrier: 0.15, ece: 0.04, calibrationPenalty: 0 }
                ]
            }
        };

        const html = renderToStaticMarkup(<RaioXDashboard data={mockUpperIdData} />);
        expect(html).toContain('Monitor de Calibração');
        expect(html).toContain('Contabilidade');
        expect(html).toContain('n=8');
        expect(html).not.toContain('Calibração estocástica pendente');
    });
});

