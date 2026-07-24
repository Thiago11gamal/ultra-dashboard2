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

function initSharedWorker() {
    if (sharedWorker) return;
    try {
        sharedWorker = new Worker(
            new URL('../engine/mc.worker.js', import.meta.url),
            { type: 'module' }
        );

        sharedWorker.onmessage = (e) => {
            const { id, type, result, error } = e.data;
            const pending = sharedPendingRequests.get(id);
            if (!pending) return;
            sharedPendingRequests.delete(id);
            if (type === 'error') {
                pending.reject(new Error(error));
            } else {
                pending.resolve(result);
            }
        };

        sharedWorker.onerror = (err) => {
            console.warn('[MC Worker Singleton] Error, falling back to main thread:', err.message);
            for (const [id, pending] of sharedPendingRequests) {
                if (pending.worker === sharedWorker) {
                    pending.reject(new Error('Worker error'));
                    sharedPendingRequests.delete(id);
                }
            }
            if (sharedWorker) {
                sharedWorker.terminate();
                sharedWorker = null;
            }
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

    const runAnalysis = useCallback(async (...args) => {
        // Fallback or initialization issue
        if (!sharedWorker) {
            // FIX APLICADO: Garantindo que o motor síncrono receba um objeto único
            if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
                return runMonteCarloAnalysis(args[0]);
            } else {
                const options = args[3] || {};
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
            const simCount = payload?.input?.simulations ?? payload?.options?.simulations ?? 5000;
            const timeoutMs = Math.min(30000, Math.max(10000, simCount * 3)); // 3ms/sim, cap 30s

            // Capture current worker to prevent race conditions during recycling
            const currentWorker = sharedWorker;

            const timeoutId = setTimeout(() => {
                if (sharedPendingRequests.has(id)) {
                    sharedPendingRequests.delete(id);
                    console.warn(`[MC Worker Singleton] Request ${id} timed out. Recycling worker thread.`);
                    
                    // Kill the zombie worker AND clean up ALL its pending requests.
                    const dyingWorker = currentWorker;
                    
                    // Clean ALL pending requests from the dying worker
                    for (const [pendingId, pending] of sharedPendingRequests) {
                        if (pending.worker === dyingWorker) {
                            clearTimeout(pending.timeoutId);
                            pending.reject(new Error('Worker recycled due to timeout'));
                            sharedPendingRequests.delete(pendingId);
                        }
                    }
                    
                    if (dyingWorker) {
                         dyingWorker.terminate();
                    }
                    
                    if (sharedWorker === dyingWorker) {
                        sharedWorker = null;
                        
                        // Instantiate a fresh worker for subsequent requests.
                        initSharedWorker();
                    }
                    
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, timeoutMs);

            sharedPendingRequests.set(id, { 
                worker: currentWorker, // Track request owner worker instance
                timeoutId, // Guardar referência para limpeza
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
            } catch (err) {
                clearTimeout(timeoutId);
                sharedPendingRequests.delete(id);
                reject(new Error(`Falha ao enviar dados para o Worker (DataCloneError). Estrutura inválida.`));
            }
        });
    }, []);

    return { runAnalysis };
}
