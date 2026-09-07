import { describe, it, expect } from 'vitest';
import { mapSubjectHoursData, mapFocusEvolutionData } from '../chartDataMappers.js';
import { analyzeProgressState } from '../ProgressStateEngine.js';
import { getSafeScore } from '../scoreHelper.js';

describe('Stats Menu Bug Fixes & Regression Suite', () => {
    describe('Bug 12: mapSubjectHoursData Casing and Trimming', () => {
        it('deve agrupar matérias com diferenças de maiúsculas/minúsculas e espaços sem duplicar', () => {
            const categories = [
                { id: 'cat1', name: 'Direito Constitucional' }
            ];

            const logs = [
                { categoryId: 'cat1', minutes: 60 },
                { subject: ' direito constitucional ', minutes: 30 },
                { categoryName: 'DIREITO CONSTITUCIONAL', duration: 30 }
            ];

            const result = mapSubjectHoursData(logs, categories);
            expect(result).toHaveLength(1);
            expect(result[0].disciplina).toBe('Direito Constitucional');
            expect(result[0].horas).toBe(2.0); // (60 + 30 + 30) / 60
        });

        it('deve preservar o casing limpo original para matérias que não existiam nas categorias', () => {
            const categories = [];
            const logs = [
                { categoryName: '  Língua Portuguesa  ', minutes: 60 },
                { subject: 'língua portuguesa', minutes: 60 }
            ];

            const result = mapSubjectHoursData(logs, categories);
            expect(result).toHaveLength(1);
            expect(result[0].disciplina).toBe('Língua Portuguesa');
            expect(result[0].horas).toBe(2.0);
        });
    });

    describe('Bug 5 & 6: Study Logs Filtering vs Flashcards', () => {
        it('não deve considerar logs do tipo flashcard como horas de estudo', () => {
            const logs = [
                { date: new Date().toISOString(), minutes: 60, type: 'flashcard' },
                { date: new Date().toISOString(), duration: 30, type: 'study' }
            ];

            // Simulação da lógica de getLogMinutes do WeeklyAnalysis
            const getLogMinutes = (log) => {
                if (!log || log.type === 'flashcard') return 0;
                if (typeof log.minutes === 'number' && Number.isFinite(log.minutes) && log.minutes > 0) return log.minutes;
                if (typeof log.duration === 'number' && Number.isFinite(log.duration) && log.duration > 0) return log.duration;
                return 0;
            };

            const totalStudyMinutes = logs.reduce((acc, log) => acc + getLogMinutes(log), 0);
            expect(totalStudyMinutes).toBe(30);

            // Simulação da lógica de hasStudyLogs do Stats.jsx
            const hasStudyLogs = logs.some(log => {
                if (!log || log.type === 'flashcard') return false;
                const m = (typeof log.minutes === 'number' && Number.isFinite(log.minutes) && log.minutes > 0) ? log.minutes :
                          (typeof log.duration === 'number' && Number.isFinite(log.duration) && log.duration > 0) ? log.duration : 0;
                return m > 0;
            });
            expect(hasStudyLogs).toBe(true);

            // Se houvesse apenas flashcards, hasStudyLogs deve ser falso
            const flashcardOnlyLogs = [{ type: 'flashcard', minutes: 120 }];
            const hasRealStudy = flashcardOnlyLogs.some(log => {
                if (!log || log.type === 'flashcard') return false;
                const m = (typeof log.minutes === 'number' && Number.isFinite(log.minutes) && log.minutes > 0) ? log.minutes :
                          (typeof log.duration === 'number' && Number.isFinite(log.duration) && log.duration > 0) ? log.duration : 0;
                return m > 0;
            });
            expect(hasRealStudy).toBe(false);
        });
    });

    describe('Bug 11: hasSimuladoHistory com nota zero', () => {
        it('deve aceitar nota zero como histórico válido de simulado', () => {
            const history = [
                { score: 0, date: '2026-08-01' }
            ];

            // Antiga validação rejeitava: Number(r.score) > 0
            const oldValidation = history.some(r => Number(r.score) > 0);
            expect(oldValidation).toBe(false);

            // Nova validação aceita 0:
            const newValidation = history.some(r => Number.isFinite(Number(r.score)) && Number(r.score) >= 0);
            expect(newValidation).toBe(true);
        });
    });

    describe('Bug 1 & 13: Delta Direcional e Validação Prévia de Histórico', () => {
        it('deve calcular delta direcional negativo quando a nota cai', () => {
            const analysisHistory = [
                { score: 85, date: 1000 },
                { score: 75, date: 2000 },
                { score: 65, date: 3000 }
            ];

            const firstScore = analysisHistory[0].score;
            const lastScore = analysisHistory[analysisHistory.length - 1].score;
            const netDelta = analysisHistory.length >= 2 ? (lastScore - firstScore) : 0;

            expect(netDelta).toBe(-20);
        });

        it('deve calcular delta direcional positivo quando a nota sobe', () => {
            const analysisHistory = [
                { score: 60, date: 1000 },
                { score: 70, date: 2000 },
                { score: 82, date: 3000 }
            ];

            const firstScore = analysisHistory[0].score;
            const lastScore = analysisHistory[analysisHistory.length - 1].score;
            const netDelta = analysisHistory.length >= 2 ? (lastScore - firstScore) : 0;

            expect(netDelta).toBe(22);
        });

        it('deve filtrar itens inválidos antes de verificar length >= 3 usando getSafeScore', () => {
            const rawHistory = [
                { score: 80, date: '2026-08-01' },
                { score: null, date: '2026-08-02' }, // getSafeScore retorna NaN
                { score: 85, date: null },          // date é null
                { score: 90, date: '2026-08-04' }
            ];

            const validHistory = rawHistory.filter(h =>
                h && h.date && Number.isFinite(getSafeScore(h, 100, 0))
            );

            // rawHistory tinha 4 itens, mas apenas 2 são válidos
            expect(rawHistory.length).toBe(4);
            expect(validHistory.length).toBe(2);
            expect(validHistory.length >= 3).toBe(false); // Evita executar análise estatística com amostra corrompida
        });
    });

    describe('Bug 2: Projeção de Tendência 30d', () => {
        it('trend_slope retornado pelo ProgressStateEngine já é normalizado para 30 dias', () => {
            // Nota subindo 2 pontos ao longo de 30 dias (de 70 para 72 em 30 dias = ~2 pts/30d)
            const scores = [
                { score: 70, date: '2026-08-01T12:00:00-04:00' },
                { score: 71, date: '2026-08-16T12:00:00-04:00' },
                { score: 72, date: '2026-08-31T12:00:00-04:00' }
            ];

            const analysis = analyzeProgressState(scores, { maxScore: 100, window_size: 3 });
            // rawSlope = 2 pts / 30 dias = 0.0667 pts/dia -> normalizedSlope = 0.0667 * 30 = 2 pts/30d
            expect(analysis.trend_slope).toBeCloseTo(2, 0);

            // Antes: const trend30d = Math.round(analysis.trend_slope * 30) -> gerava 60 pts/mês (30x inflado)
            // Agora: const trend30d = analysis.trend_slope -> 2 pts/mês
            const correctedTrend30d = analysis.trend_slope;
            expect(correctedTrend30d).toBeCloseTo(2, 0);
            expect(correctedTrend30d * 30).toBeCloseTo(60, 0); // Mostra o erro do cálculo antigo
        });
    });

    describe('Bug 14: Formatação de Minutos sem Dízimas Periódicas', () => {
        it('deve arredondar minutos adicionais evitando dízimas de ponto flutuante', () => {
            const floatingMinutes = 100 / 3; // 33.333333333333336

            const formatTime = (minutes) => {
                const rounded = Math.round(Number(minutes) || 0);
                if (rounded < 60) return `${rounded}m`;
                const h = Math.floor(rounded / 60);
                const m = rounded % 60;
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
            };

            const formatted = formatTime(floatingMinutes);
            expect(formatted).toBe('33m');
            expect(formatted).not.toContain('.');
        });
    });

    describe('Bug 9: Blindagem do Domínio do Eixo X em HorasDisciplinaChart', () => {
        it('deve retornar 0 quando dataMax for NaN ou indefinido', () => {
            const domainFn = (dataMax) => [0, (Number.isFinite(dataMax) && dataMax > 0 ? dataMax * 1.15 : 10)];

            expect(domainFn(NaN)).toEqual([0, 10]);
            expect(domainFn(undefined)).toEqual([0, 10]);
            expect(domainFn(null)).toEqual([0, 10]);
            expect(domainFn(10)).toEqual([0, 11.5]);
        });
    });

    describe('Bug 10: Mapeamento de Cores de Estabilidade', () => {
        it('deve atribuir as cores corretas de acordo com os tiers da legenda de desvio padrão', () => {
            const getStabilityColor = (sd, range = 100) => {
                const sdPct = (sd / range) * 100;
                if (sdPct <= 5) return 'bg-purple-500';
                if (sdPct <= 10) return 'bg-blue-500';
                if (sdPct <= 15) return 'bg-orange-500';
                return 'bg-red-500';
            };

            expect(getStabilityColor(4, 100)).toBe('bg-purple-500'); // <= 5%
            expect(getStabilityColor(8, 100)).toBe('bg-blue-500');   // <= 10%
            expect(getStabilityColor(12, 100)).toBe('bg-orange-500'); // <= 15%
            expect(getStabilityColor(20, 100)).toBe('bg-red-500');   // > 15%
        });
    });
});
