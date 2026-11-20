/**
 * useMonteCarloWorker — Hook para offload Monte Carlo para Web Worker
 * 
 * Mantém o fallback síncrono se Web Workers não estiverem disponíveis.
 * Usa Vite's `?worker` import com module worker support.
 * Modificado para usar um Singleton Worker, evitando memory leaks ao renderizar
 * múltiplos gráficos/componentes que usam este hook.
 */
import { useCallback, useEffect } from 'react';
import { runMonteCarloAnalysis, simulateNormalDistribution } from '../engine/monteCarlo.js';

// --- SHARED WORKER SINGLETON ---
let sharedWorker = null;
let sharedRequestId = 0;
const sharedPendingRequests = new Map();
const REQUEST_MAX_AGE_MS = 60_000;
let workerCrashCount = 0;
const MAX_WORKER_CRASHES = 3;

// Cleanup periódico para requests órfãos
let cleanupInterval = null;
let workerRetryTimer = null;

export function stopCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
    if (workerRetryTimer) {
        clearTimeout(workerRetryTimer);
        workerRetryTimer = null;
    }
    // M-05 FIX: Também limpar pending requests órfãos
    for (const [id, pending] of sharedPendingRequests) {
        clearTimeout(pending.timeoutId);
        try {
            pending.reject?.(new Error('Worker Monte Carlo encerrado durante limpeza.'));
        } catch {
            // ignore
        }
        sharedPendingRequests.delete(id);
    }
}

function startCleanup() {
    if (cleanupInterval) return;
    // Previne vazamento de timers durante testes automatizados no Vitest / Jest
    if (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST)) {
        return;
    }
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [id, pending] of sharedPendingRequests) {
            if (pending.createdAt && now - pending.createdAt > REQUEST_MAX_AGE_MS) {
                clearTimeout(pending.timeoutId);
                try {
                    if (typeof pending.reject === 'function') {
                        pending.reject(new Error("A requisição expirou no worker."));
                    }
                } catch (err) {
                    console.warn('[MC Worker] Falha ao rejeitar request expirado:', err);
                }
                sharedPendingRequests.delete(id);
            }
        }
    }, 30_000);
    if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
        cleanupInterval.unref();
    }
}

function initSharedWorker() {
    startCleanup(); // Garantir coletor ativo mesmo após stopCleanup() em remount / StrictMode
    if (sharedWorker || workerCrashCount >= MAX_WORKER_CRASHES) return;
    try {
        sharedWorker = new Worker(
            new URL('../engine/mc.worker.js', import.meta.url),
            { type: 'module' }
        );

        sharedWorker.onmessage = (e) => {
            const { id, type, result, error } = e.data || {};
            const pending = sharedPendingRequests.get(id);
            if (!pending) return;
            sharedPendingRequests.delete(id);
            if (type === 'error') {
                pending.reject(new Error(error));
            } else {
                workerCrashCount = 0;
                pending.resolve(result);
            }
        };

        const handleWorkerFailure = (errMsg) => {
            workerCrashCount++;
            for (const [id, pending] of sharedPendingRequests.entries()) {
                try {
                    clearTimeout(pending.timeoutId);
                    pending.reject?.(new Error(errMsg));
                } catch (e) {
                    console.error('Failed to reject pending request:', e);
                }
                sharedPendingRequests.delete(id);
            }
            try {
                if (sharedWorker) sharedWorker.terminate();
            } catch (e) {
                console.warn('Worker terminate failed:', e);
            }
            sharedWorker = null;
            if (workerRetryTimer) {
                clearTimeout(workerRetryTimer);
                workerRetryTimer = null;
            }
            if (workerCrashCount < MAX_WORKER_CRASHES) {
                workerRetryTimer = setTimeout(() => {
                    workerRetryTimer = null;
                    initSharedWorker();
                }, 100);
            } else {
                console.error('[MonteCarloWorker] Limite de crashes excedido. Usando fallback síncrono.');
            }
        };

        sharedWorker.onerror = (err) => {
            console.error('[MonteCarloWorker] erro fatal:', err);
            handleWorkerFailure(err?.message || 'Worker Monte Carlo falhou');
        };

        sharedWorker.onmessageerror = (err) => {
            console.error('[MonteCarloWorker] erro de serialização:', err);
            handleWorkerFailure('Falha na serialização de mensagem do Worker Monte Carlo');
        };
    } catch (e) {
        console.warn('[MC Worker Singleton] Not available, using main thread:', e.message);
    }
}

// Cleanup pending requests periodically if needed (optional)
// But timeouts inside the Promise will handle stale requests.

export function useMonteCarloWorker() {
    // Initialize the singleton worker on first use
    useEffect(() => {
        initSharedWorker();
        // We do NOT terminate the worker on unmount because it is shared.
        // The worker lives for the lifetime of the application.
    }, []);

    // O cleanup periódico de requests órfãos agora é feito no nível do módulo (singleton)
    
    const runAnalysis = useCallback(async (...args) => {
        if (!sharedWorker) {
            initSharedWorker();
        }

        // Fallback or initialization issue
        if (!sharedWorker) {
            // FIX APLICADO: Garantindo que o motor síncrono receba um objeto único
            if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
                if (args[0].mode === 'normal' || (args[0].mean !== undefined && !Array.isArray(args[0].values))) {
                    return simulateNormalDistribution(args[0]);
                }
                return runMonteCarloAnalysis(args[0]);
            } else {
                const options = (typeof args[3] === 'object' && args[3] !== null) ? args[3] : {};
                if (Array.isArray(args[0])) {
                    return runMonteCarloAnalysis({
                        ...options,
                        values: args[0],
                        targetScore: options.targetScore ?? args[2] ?? args[1] ?? 0,
                        projectionDays: options.projectionDays ?? (typeof args[3] === 'number' ? args[3] : 90),
                    });
                }
                return simulateNormalDistribution({
                    mean: args[0] || 0,
                    sd: args[1] || 0,
                    targetScore: args[2] || 0,
                    simulations: options.simulations || 5000,
                    seed: options.seed,
                    currentMean: options.currentMean,
                    minScore: options.minScore,
                    maxScore: options.maxScore,
                    bayesianCI: options.bayesianCI,
                    historyLength: options.historyLength,
                    subjects: options.subjects,
                    historicalCutoffs: options.historicalCutoffs,
                    flashcardImmunity: options.flashcardImmunity,
                    simuladoRows: options.simuladoRows,
                    categoryName: options.categoryName,
                    categoryNames: options.categoryNames,
                });
            }
        }

        const id = ++sharedRequestId;
        
        let payload;
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
            payload = { isObjectCall: true, input: args[0] };
        } else {
            payload = {
                isObjectCall: false,
                inputOrMean: args[0],
                pooledSD: args[1],
                targetScore: args[2],
                options: args[3] || {}
            };
        }

        return new Promise((resolve, reject) => {
            // Timeout adaptativo baseado no número de simulações
            const rawSimCount = Number(payload?.input?.simulations ?? payload?.options?.simulations);
            const simCount = Number.isFinite(rawSimCount) && rawSimCount > 0 ? rawSimCount : 5000;
            const timeoutMs = Math.min(30000, Math.max(10000, simCount * 3)); // 3ms/sim, cap 30s

            // Capture current worker to prevent race conditions during recycling
            const currentWorker = sharedWorker;

            const timeoutId = setTimeout(() => {
                if (sharedPendingRequests.has(id)) {
                    sharedPendingRequests.delete(id);
                    console.warn(`[MC Worker Singleton] Request ${id} timed out.`);
                    // CORRIGIDO: apenas rejeita ESTE request. Não mata o worker nem outros.
                    // O worker será reciclado naturalmente quando ocioso.
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, { 
                worker: currentWorker, // Track request owner worker instance
                timeoutId, // Guardar referência para limpeza
                createdAt: Date.now(),
                resolve: (data) => {
                    clearTimeout(timeoutId);
                    resolve(data);
                }, 
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
            
            try {
                currentWorker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
            } catch {
                clearTimeout(timeoutId);
                sharedPendingRequests.delete(id);
                reject(new Error(`Falha ao enviar dados para o Worker (DataCloneError). Estrutura inválida.`));
            }
        });
    }, []);

    const runSubjectBatch = useCallback(async (items = [], sharedSimuladoRows = []) => {
        if (!Array.isArray(items) || items.length === 0) return [];
        if (!sharedWorker) {
            initSharedWorker();
        }
        if (!sharedWorker) {
            return items.map((entry) => ({
                simKey: entry.simKey,
                result: simulateNormalDistribution({
                    ...entry.input,
                    simuladoRows: sharedSimuladoRows
                })
            }));
        }

        const id = ++sharedRequestId;
        const payload = { items, simuladoRows: sharedSimuladoRows };

        return new Promise((resolve, reject) => {
            const totalSims = items.reduce((acc, entry) => {
                const n = Number(entry?.input?.simulations);
                return acc + (Number.isFinite(n) && n > 0 ? n : 2000);
            }, 0);
            const timeoutMs = Math.min(30000, Math.max(10000, totalSims * 2));
            const currentWorker = sharedWorker;

            const timeoutId = setTimeout(() => {
                if (sharedPendingRequests.has(id)) {
                    sharedPendingRequests.delete(id);
                    reject(new Error("A análise por matéria demorou muito tempo e foi interrompida."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, {
                worker: currentWorker,
                timeoutId,
                createdAt: Date.now(),
                resolve: (data) => {
                    clearTimeout(timeoutId);
                    resolve(Array.isArray(data) ? data : []);
                },
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });

            try {
                currentWorker.postMessage({ type: 'runSubjectBatch', payload, id });
            } catch {
                clearTimeout(timeoutId);
                sharedPendingRequests.delete(id);
                reject(new Error('Falha ao enviar lote por matéria para o Worker (DataCloneError).'));
            }
        });
    }, []);

    return { runAnalysis, runSubjectBatch };
}

