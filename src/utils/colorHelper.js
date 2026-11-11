/**
 * colorHelper.js
 * Sistema centralizado e robusto de cores para temas de disciplinas,
 * prioridades de tarefas e níveis de desempenho em simulados.
 */

// Paleta curada de cores vibrantes e de alto contraste, otimizada para o tema escuro
export const PRESET_CATEGORY_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#0ea5e9', // Sky
    '#3b82f6', // Blue
];

export const DEFAULT_CATEGORY_COLOR = '#6366f1';

/**
 * Normaliza qualquer formato de cor para um código hex de 6 dígitos (#rrggbb).
 * Suporta formatos de 3 dígitos (#rgb), 8 dígitos (#rrggbbaa) e faz fallback seguro.
 *
 * @param {string} color
 * @param {string} [fallback]
 * @returns {string} Hex com 7 caracteres (#rrggbb)
 */
export function normalizeHexColor(color, fallback = DEFAULT_CATEGORY_COLOR) {
    if (!color || typeof color !== 'string') return fallback;
    const trimmed = color.trim();

    // 6 dígitos hex (#rrggbb)
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
        return trimmed.toLowerCase();
    }

    // 3 dígitos hex (#rgb) -> expande para #rrggbb
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
        const r = trimmed[1];
        const g = trimmed[2];
        const b = trimmed[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    // 8 dígitos hex (#rrggbbaa) -> descarta o canal alfa para manter o hex base limpo
    if (/^#[0-9a-fA-F]{8}$/.test(trimmed)) {
        return trimmed.slice(0, 7).toLowerCase();
    }

    return fallback;
}

/**
 * Converte de forma segura uma cor hex para a função rgba(r, g, b, alpha).
 * Evita a fragilidade da concatenação `${color}15`, que produz CSS inválido
 * em caso de hex curtos (#fff15), undefined ("undefined15") ou cores rgb.
 *
 * @param {string} color
 * @param {number|string} alpha - Número decimal entre 0 e 1 (ex: 0.15) ou hex de 2 dígitos (ex: '15')
 * @param {string} [fallback]
 * @returns {string} String rgba(r, g, b, a)
 */
export function hexToRgba(color, alpha = 1, fallback = DEFAULT_CATEGORY_COLOR) {
    const hex = normalizeHexColor(color, fallback);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    let numAlpha = 1;
    if (typeof alpha === 'number') {
        numAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
    } else if (typeof alpha === 'string') {
        if (alpha.includes('.')) {
            numAlpha = Math.max(0, Math.min(1, parseFloat(alpha) || 1));
        } else {
            // Hex alpha de dois dígitos (ex: "15" -> 21 / 255 ≈ 0.082 ou interpretado como decimal se > 15)
            const parsedHex = parseInt(alpha, 16);
            if (Number.isFinite(parsedHex)) {
                numAlpha = Number((parsedHex / 255).toFixed(3));
            }
        }
    }

    return `rgba(${r}, ${g}, ${b}, ${numAlpha})`;
}

/**
 * Retorna estilos CSS dinâmicos de alta qualidade (background com opacidade, bordas e sombras)
 * baseados na cor da disciplina.
 *
 * @param {string} color
 * @param {string} [fallback]
 */
export function getCategoryColorStyles(color, fallback = DEFAULT_CATEGORY_COLOR) {
    const safeHex = normalizeHexColor(color, fallback);
    return {
        hex: safeHex,
        text: safeHex,
        bg10: hexToRgba(safeHex, 0.10, fallback),
        bg15: hexToRgba(safeHex, 0.15, fallback),
        bg20: hexToRgba(safeHex, 0.20, fallback),
        border20: hexToRgba(safeHex, 0.20, fallback),
        border30: hexToRgba(safeHex, 0.30, fallback),
        border40: hexToRgba(safeHex, 0.40, fallback),
        border60: hexToRgba(safeHex, 0.60, fallback),
        glow: `0 0 16px ${hexToRgba(safeHex, 0.25, fallback)}`
    };
}

/**
 * Configuração consolidada de cores e rótulos de prioridade para assuntos/tarefas.
 * Usada pelo Checklist, Painel de Foco (Pomodoro) e Barra de Progresso Global.
 */
export const PRIORITY_CONFIG = {
    high: {
        key: 'high',
        label: 'Alta',
        next: 'Baixa',
        nextKey: 'low',
        bar: 'bg-rose-500',
        bg: 'bg-rose-500/15 hover:bg-rose-500/25',
        border: 'border-rose-500/40 hover:border-rose-500/60',
        text: 'text-rose-300',
        dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
        glow: 'rgba(244, 63, 94, 0.4)'
    },
    medium: {
        key: 'medium',
        label: 'Média',
        next: 'Alta',
        nextKey: 'high',
        bar: 'bg-amber-500',
        bg: 'bg-amber-500/15 hover:bg-amber-500/25',
        border: 'border-amber-500/40 hover:border-amber-500/60',
        text: 'text-amber-300',
        dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
        glow: 'rgba(245, 158, 11, 0.4)'
    },
    low: {
        key: 'low',
        label: 'Baixa',
        next: 'Média',
        nextKey: 'medium',
        bar: 'bg-emerald-500',
        bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
        border: 'border-emerald-500/40 hover:border-emerald-500/60',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
        glow: 'rgba(16, 185, 129, 0.4)'
    }
};

/**
 * Normaliza qualquer string de prioridade (em inglês ou português) para a chave padrão:
 * 'high' | 'medium' | 'low'.
 */
export function normalizePriority(raw) {
    const s = String(raw || '').toLowerCase().trim();
    if (s === 'high' || s === 'alta' || s === 'alto' || s === 'urgente') return 'high';
    if (s === 'low' || s === 'baixa' || s === 'baixo') return 'low';
    return 'medium';
}

/**
 * Retorna a configuração de prioridade para qualquer chave (suportando apelidos).
 */
export function getPriorityConfig(rawPriority) {
    const norm = normalizePriority(rawPriority);
    return PRIORITY_CONFIG[norm] || PRIORITY_CONFIG.medium;
}

/**
 * Normaliza e categoriza o nível de desempenho em simulados.
 * Trata variações de caixa alta/baixa, acentos ('MEDIO' vs 'MÉDIO') e apelidos ('BOM', 'EXCELENTE').
 * Também calcula automaticamente o nível a partir da média se o campo estiver ausente.
 *
 * @param {string} level
 * @param {number} [average]
 * @param {number} [maxScore]
 */
export function normalizeSimuladoLevel(level, average = 0, maxScore = 100, minScore = 0) {
    const safeMin = Number.isFinite(Number(minScore)) ? Number(minScore) : 0;
    const safeMax = Math.max(safeMin + 1, Number(maxScore) || 100);
    const scoreRange = safeMax - safeMin;

    // 1. Tenta identificar a partir da string fornecida
    if (typeof level === 'string' && level.trim() && level !== '-') {
        const clean = level.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (clean === 'ALTO' || clean === 'HIGH' || clean === 'BOM' || clean === 'EXCELENTE') {
            return {
                key: 'ALTO',
                label: 'Alto',
                badgeClasses: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
                color: '#34d399'
            };
        }
        if (clean === 'MEDIO' || clean === 'MEDIUM') {
            return {
                key: 'MÉDIO',
                label: 'Médio',
                badgeClasses: 'text-amber-400 bg-amber-500/15 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
                color: '#fbbf24'
            };
        }
        if (clean === 'BAIXO' || clean === 'LOW' || clean === 'RUIM') {
            return {
                key: 'BAIXO',
                label: 'Baixo',
                badgeClasses: 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
                color: '#fb7185'
            };
        }
    }

    // 2. Se a string era indefinida/ausente, deduz a partir da média
    const avgNum = Number(average);
    if (Number.isFinite(avgNum) && avgNum > safeMin) {
        const ratio = (avgNum - safeMin) / scoreRange;
        if (ratio >= 0.7) {
            return {
                key: 'ALTO',
                label: 'Alto',
                badgeClasses: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
                color: '#34d399'
            };
        }
        if (ratio >= 0.4) {
            return {
                key: 'MÉDIO',
                label: 'Médio',
                badgeClasses: 'text-amber-400 bg-amber-500/15 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
                color: '#fbbf24'
            };
        }
        return {
            key: 'BAIXO',
            label: 'Baixo',
            badgeClasses: 'text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
            color: '#fb7185'
        };
    }

    // 3. Fallback neutro
    return {
        key: '-',
        label: '-',
        badgeClasses: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        color: '#94a3b8'
    };
}

