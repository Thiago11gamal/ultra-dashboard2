/**
 * adaptiveEngine.js — Adaptive Analytics Engine
 * 
 * ADAPT-02: Detecção de transição de regime (simplificado).
 * Analisa o histórico de estados (progression, stagnation, regression, etc.)
 * para detectar TRANSIÇÕES iminentes — ex: "evolução desacelerando → platô provável".
 * 
 * Related modules:
 * - src/utils/adaptiveMath.js — Core adaptive math utilities
 * - src/utils/calibration.js — Calibration governance
 * - src/utils/coachLogic.js — Coach decision engine
 * - src/utils/ProgressStateEngine.js — State classification
 */

import { analyzeProgressState } from './ProgressStateEngine.js';

/**
 * Detecta transições de regime no desempenho do aluno.
 * 
 * Usa um modelo simplificado de probabilidades de transição baseado na
 * frequência histórica de mudanças de estado + indicadores de velocidade.
 * 
 * @param {number[]} scores - Série de scores do aluno (mais antigo → mais recente)
 * @param {Object} options - { maxScore, windowSize, minHistory }
 * @returns {Object} { currentState, transitionRisk, flags, velocity }
 */
export function detectRegimeTransition(scores = [], options = {}) {
    const {
        maxScore = 100,
        windowSize = 10,
        minHistory = 6
    } = options;

    const noData = {
        currentState: 'insufficient_data',
        transitionRisk: null,
        flags: [],
        velocity: null,
        regimeStability: null
    };

    if (!Array.isArray(scores) || scores.length < minHistory) return noData;
    
    // BUG-ADAPT-01 FIX: Janela Dinâmica
    // Se scores.length < windowSize * 1.5, a janela de 10 itens impede a geração 
    // de 2 estados (necessários para a derivada). Ajustamos para scores.length/2.
    const actualWindowSize = Math.min(windowSize, Math.floor(scores.length / 2));

    // 1. Calcular estados em janelas deslizantes
    const states = [];
    const stepSize = Math.max(1, Math.floor(actualWindowSize / 2)); // 50% overlap
    for (let end = actualWindowSize; end <= scores.length; end += stepSize) {
        const window = scores.slice(end - actualWindowSize, end);
        const result = analyzeProgressState(window, { maxScore, window_size: actualWindowSize });
        states.push({
            state: result.state,
            mean: result.mean_score,
            slope: result.trend_slope,
            variance: result.variance,
            endIdx: end
        });
    }

    if (states.length < 2) return noData;

    const current = states[states.length - 1];
    const previous = states[states.length - 2];

    // 2. Detectar transições de regime
    const flags = [];
    let transitionRisk = 'none';

    // Calcular velocidade de mudança (derivada do slope)
    const slopeChange = current.slope - previous.slope;
    const meanChange = current.mean - previous.mean;

    // 2a. Desaceleração em evolução (possível platô)
    if (current.state === 'progression') {
        // Se o slope caiu >50% comparado com o anterior, o ritmo está desacelerando
        if (previous.slope > 0 && current.slope > 0 && current.slope < previous.slope * 0.5) {
            transitionRisk = 'deceleration';
            flags.push({
                type: 'warning',
                msg: `Desaceleração detectada: ritmo caiu de ${(previous.slope * 30).toFixed(1)} para ${(current.slope * 30).toFixed(1)} pp/mês. Possível platô em formação.`,
                severity: 'medium'
            });
        }
        // Se a variância está subindo enquanto o slope diminui
        // [CORREÇÃO] Injetar um limite mínimo (Epsilon) de variância para impedir (Bug 3.1 Fix)
        // que um salto de 0 para 0.01 dispare uma falsa "Instabilidade crescente".
        const varianciaMinima = Math.pow(maxScore * 0.02, 2); // Piso de 2%
        const varianciaAnteriorSegura = Math.max(previous.variance, varianciaMinima);
        
        if (current.variance > varianciaAnteriorSegura * 1.5 && slopeChange < 0) {
            flags.push({
                type: 'info',
                msg: 'Instabilidade crescente durante evolução. Consolide a base antes de avançar.',
                severity: 'low'
            });
        }
    }

    // 2b. Regressão acelerando (queda livre)
    if (current.state === 'regression' && previous.state === 'regression') {
        if (current.slope < previous.slope) {
            transitionRisk = 'acceleration_negative';
            flags.push({
                type: 'danger',
                msg: `Queda acelerada: declínio de ${(current.slope * 30).toFixed(1)} pp/mês (era ${(previous.slope * 30).toFixed(1)}). Intervenção urgente necessária.`,
                severity: 'high'
            });
        }
    }

    // 2c. Estagnação após evolução (platô confirmado)
    if ((current.state === 'stagnation_positive' || current.state === 'stagnation_neutral') 
        && previous.state === 'progression') {
        transitionRisk = 'plateau_entry';
        flags.push({
            type: 'warning',
            msg: 'Transição para platô detectada. O progresso desacelerou. Mude a estratégia de estudo.',
            severity: 'medium'
        });
    }

    // 2d. Recuperação após queda (inflexão positiva)
    if (current.state === 'progression' && 
        (previous.state === 'regression' || previous.state === 'stagnation_negative')) {
        transitionRisk = 'recovery';
        flags.push({
            type: 'success',
            msg: 'Inflexão positiva detectada! A recuperação está em andamento. Mantenha o novo ritmo.',
            severity: 'none'
        });
    }

    // 2e. Instabilidade crônica (oscilação contínua)
    if (current.state === 'unstable' && previous.state === 'unstable') {
        transitionRisk = 'chronic_instability';
        flags.push({
            type: 'warning',
            msg: 'Instabilidade crônica: performance oscila sem padrão. Foque em preencher lacunas de base.',
            severity: 'medium'
        });
    }

    // 3. Regime stability: quantos estados consecutivos iguais
    let consecutiveSame = 1;
    for (let i = states.length - 2; i >= 0; i--) {
        if (states[i].state === current.state) consecutiveSame++;
        else break;
    }
    const regimeStability = Math.min(1, consecutiveSame / 5); // Normalizar para [0,1], satura em 5

    return {
        currentState: current.state,
        transitionRisk,
        flags,
        velocity: {
            slopeChange: Number(slopeChange.toFixed(4)),
            meanChange: Number(meanChange.toFixed(2)),
            currentSlope: Number(current.slope.toFixed(4)),
            previousSlope: Number(previous.slope.toFixed(4))
        },
        regimeStability: Number(regimeStability.toFixed(3)),
        stateHistory: states.map(s => s.state)
    };
}

export default { detectRegimeTransition };
