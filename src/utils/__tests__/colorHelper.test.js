import { describe, it, expect } from 'vitest';
import {
    normalizeHexColor,
    hexToRgba,
    getCategoryColorStyles,
    normalizePriority,
    getPriorityConfig,
    normalizeSimuladoLevel,
    PRESET_CATEGORY_COLORS,
    DEFAULT_CATEGORY_COLOR
} from '../colorHelper';

describe('colorHelper - Sistema Centralizado de Cores', () => {
    describe('normalizeHexColor', () => {
        it('preserva hex de 6 dígitos em lowercase', () => {
            expect(normalizeHexColor('#3B82F6')).toBe('#3b82f6');
            expect(normalizeHexColor('#10B981')).toBe('#10b981');
        });

        it('expande hex curto de 3 dígitos para 6 dígitos', () => {
            expect(normalizeHexColor('#fff')).toBe('#ffffff');
            expect(normalizeHexColor('#F00')).toBe('#ff0000');
            expect(normalizeHexColor('#38b')).toBe('#3388bb');
        });

        it('remove canal alfa de hex de 8 dígitos', () => {
            expect(normalizeHexColor('#3b82f6ff')).toBe('#3b82f6');
            expect(normalizeHexColor('#10b98120')).toBe('#10b981');
        });

        it('retorna fallback para entradas nulas, vazias ou inválidas', () => {
            expect(normalizeHexColor(null)).toBe(DEFAULT_CATEGORY_COLOR);
            expect(normalizeHexColor(undefined)).toBe(DEFAULT_CATEGORY_COLOR);
            expect(normalizeHexColor('')).toBe(DEFAULT_CATEGORY_COLOR);
            expect(normalizeHexColor('rgb(255, 0, 0)')).toBe(DEFAULT_CATEGORY_COLOR);
            expect(normalizeHexColor('invalid', '#a855f7')).toBe('#a855f7');
        });
    });

    describe('hexToRgba', () => {
        it('converte hex de 6 dígitos para rgba com alpha numérico', () => {
            expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
            expect(hexToRgba('#000000', 0)).toBe('rgba(0, 0, 0, 0)');
            expect(hexToRgba('#3b82f6', 0.15)).toBe('rgba(59, 130, 246, 0.15)');
        });

        it('converte hex de 3 dígitos sem quebrar em strings de 5 caracteres', () => {
            expect(hexToRgba('#fff', 0.2)).toBe('rgba(255, 255, 255, 0.2)');
        });

        it('trata alpha em string hex (ex: "15" -> 21/255)', () => {
            const res = hexToRgba('#3b82f6', '15');
            expect(res.startsWith('rgba(59, 130, 246,')).toBe(true);
        });

        it('não quebra com cores nulas ou undefined', () => {
            expect(hexToRgba(null, 0.15, '#818cf8')).toBe('rgba(129, 140, 248, 0.15)');
            expect(hexToRgba(undefined, 0.3, '#10b981')).toBe('rgba(16, 185, 129, 0.3)');
        });
    });

    describe('getCategoryColorStyles', () => {
        it('retorna mapa de estilos com background, bordas e glow seguros', () => {
            const styles = getCategoryColorStyles('#8b5cf6');
            expect(styles.hex).toBe('#8b5cf6');
            expect(styles.bg15).toBe('rgba(139, 92, 246, 0.15)');
            expect(styles.border30).toBe('rgba(139, 92, 246, 0.3)');
            expect(styles.glow).toContain('rgba(139, 92, 246, 0.25)');
        });
    });

    describe('normalizePriority & getPriorityConfig', () => {
        it('normaliza chaves em inglês e português', () => {
            expect(normalizePriority('high')).toBe('high');
            expect(normalizePriority('alta')).toBe('high');
            expect(normalizePriority('Alta')).toBe('high');
            expect(normalizePriority('ALTO')).toBe('high');

            expect(normalizePriority('medium')).toBe('medium');
            expect(normalizePriority('média')).toBe('medium');
            expect(normalizePriority('media')).toBe('medium');
            expect(normalizePriority('Normal')).toBe('medium');

            expect(normalizePriority('low')).toBe('low');
            expect(normalizePriority('baixa')).toBe('low');
            expect(normalizePriority('Baixa')).toBe('low');
            expect(normalizePriority('BAIXO')).toBe('low');

            expect(normalizePriority(null)).toBe('medium');
            expect(normalizePriority('')).toBe('medium');
        });

        it('retorna a configuração correta com ciclo circular low -> medium -> high -> low', () => {
            const lowCfg = getPriorityConfig('low');
            expect(lowCfg.label).toBe('Baixa');
            expect(lowCfg.next).toBe('Média');

            const medCfg = getPriorityConfig('medium');
            expect(medCfg.label).toBe('Média');
            expect(medCfg.next).toBe('Alta');

            const highCfg = getPriorityConfig('high');
            expect(highCfg.label).toBe('Alta');
            expect(highCfg.next).toBe('Baixa');
        });

        it('não quebra ao receber chaves em português como "alta" ou "baixa"', () => {
            const highFromPt = getPriorityConfig('alta');
            expect(highFromPt.label).toBe('Alta');
            expect(highFromPt.bar).toBe('bg-rose-500');

            const lowFromPt = getPriorityConfig('baixa');
            expect(lowFromPt.label).toBe('Baixa');
            expect(lowFromPt.bar).toBe('bg-emerald-500');
        });
    });

    describe('normalizeSimuladoLevel', () => {
        it('normaliza variações com e sem acento e caixa alta/baixa', () => {
            const alto = normalizeSimuladoLevel('ALTO');
            expect(alto.key).toBe('ALTO');
            expect(alto.label).toBe('Alto');
            expect(alto.badgeClasses).toContain('text-emerald-400');

            const altoLower = normalizeSimuladoLevel('alto');
            expect(altoLower.key).toBe('ALTO');

            const medioSemAcento = normalizeSimuladoLevel('MEDIO');
            expect(medioSemAcento.key).toBe('MÉDIO');
            expect(medioSemAcento.label).toBe('Médio');
            expect(medioSemAcento.badgeClasses).toContain('text-amber-400');

            const baixo = normalizeSimuladoLevel('baixo');
            expect(baixo.key).toBe('BAIXO');
            expect(baixo.label).toBe('Baixo');
            expect(baixo.badgeClasses).toContain('text-rose-400');
        });

        it('deduz o nível a partir da média quando o level é ausente ou "-"', () => {
            // 75% -> ALTO
            const deducedHigh = normalizeSimuladoLevel('-', 75, 100);
            expect(deducedHigh.key).toBe('ALTO');
            expect(deducedHigh.label).toBe('Alto');

            // 55% -> MÉDIO
            const deducedMed = normalizeSimuladoLevel(null, 55, 100);
            expect(deducedMed.key).toBe('MÉDIO');
            expect(deducedMed.label).toBe('Médio');

            // 30% -> BAIXO
            const deducedLow = normalizeSimuladoLevel('', 30, 100);
            expect(deducedLow.key).toBe('BAIXO');
            expect(deducedLow.label).toBe('Baixo');
        });

        it('retorna fallback neutro quando média e level são ausentes', () => {
            const fallback = normalizeSimuladoLevel('-', 0, 100);
            expect(fallback.key).toBe('-');
            expect(fallback.label).toBe('-');
            expect(fallback.badgeClasses).toContain('text-slate-400');
        });
    });

    describe('PRESET_CATEGORY_COLORS', () => {
        it('contém pelo menos 10 cores hex válidas e únicas', () => {
            expect(PRESET_CATEGORY_COLORS.length).toBeGreaterThanOrEqual(10);
            const set = new Set(PRESET_CATEGORY_COLORS);
            expect(set.size).toBe(PRESET_CATEGORY_COLORS.length);
            PRESET_CATEGORY_COLORS.forEach(c => {
                expect(/^#[0-9a-f]{6}$/.test(c)).toBe(true);
            });
        });
    });
});

