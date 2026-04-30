/**
 * useMonteCarloWorker — Hook para offload Monte Carlo para Web Worker
 * 
 * Mantém o fallback síncrono se Web Workers não estiverem disponíveis.
 * Usa Vite's `?worker` import com module worker support.
 */
import { useRef, useCallback, useEffect } from 'react';
import { runMonteCarloAnalysis } from '../engine';

export function useMonteCarloWorker() {
    const workerRef = useRef(null);
    const requestIdRef = useRef(0);
    const pendingRequestsRef = useRef(new Map());

    useEffect(() => {
        // 🎯 MEMORY LEAK PROTECTION: O Worker é instanciado apenas quando o componente que o usa está na tela.
        let worker = null;
        try {
            worker = new Worker(
                new URL('../engine/mc.worker.js', import.meta.url),
                { type: 'module' }
            );

            worker.onmessage = (e) => {
                const { id, type, result, error } = e.data;
                const pending = pendingRequestsRef.current.get(id);
                if (!pending) return;
                pendingRequestsRef.current.delete(id);
                if (type === 'error') {
                    pending.reject(new Error(error));
                } else {
                    pending.resolve(result);
                }
            };

            worker.onerror = (err) => {
                console.warn('[MC Worker] Error, falling back to main thread:', err.message);
                for (const [id, pending] of pendingRequestsRef.current) {
                    if (pending.worker === worker) {
                        pending.reject(new Error('Worker error'));
                        pendingRequestsRef.current.delete(id);
                    }
                }
                worker.terminate();
                if (workerRef.current === worker) workerRef.current = null;
            };

            workerRef.current = worker;
        } catch (e) {
            console.warn('[MC Worker] Not available, using main thread:', e.message);
        }

        return () => {
            // 🎯 RIGOR FIX: Usar a referência capturada na closure (worker) em vez do ref volátil
            if (worker) {
                worker.terminate();
                if (workerRef.current === worker) workerRef.current = null;
            }
            
            // Limpa apenas os pendentes DESTE worker específico
            for (const [id, pending] of pendingRequestsRef.current) {
                if (pending.worker === worker) {
                    if (pending.timeoutId) clearTimeout(pending.timeoutId);
                    pending.reject(new Error('Worker foi encerrado (component unmounted).'));
                    pendingRequestsRef.current.delete(id);
                }
            }
        };
    }, []);

    const runAnalysis = useCallback(async (...args) => {
        const worker = workerRef.current;
        
        if (!worker) {
            return runMonteCarloAnalysis(...args);
        }

        const id = ++requestIdRef.current;
        
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
            const timeoutId = setTimeout(() => {
                if (pendingRequestsRef.current.has(id)) {
                    pendingRequestsRef.current.delete(id);
                    console.warn(`[MC Worker] Request ${id} timed out. Recycling worker thread.`);
                    
                    // BUG 2 FIX: Kill the zombie worker that is still looping in background.
                    // If we just reject, the worker continues to burn CPU.
                    if (workerRef.current) {
                        workerRef.current.terminate();
                        workerRef.current = null;
                        
                        // Instantiate a fresh worker for subsequent requests.
                        try {
                            const newWorker = new Worker(
                                new URL('../engine/mc.worker.js', import.meta.url),
                                { type: 'module' }
                            );

                            // Re-bind handlers with a clean closure capturing ONLY the new instance
                            newWorker.onmessage = (e) => {
                                const { id, type, result, error } = e.data;
                                const pending = pendingRequestsRef.current.get(id);
                                if (!pending) return;
                                pendingRequestsRef.current.delete(id);
                                if (type === 'error') {
                                    pending.reject(new Error(error));
                                } else {
                                    pending.resolve(result);
                                }
                            };

                            newWorker.onerror = (err) => {
                                console.warn('[MC Worker Recycled] Error, falling back to main thread:', err.message);
                                for (const [id, pending] of pendingRequestsRef.current) {
                                    if (pending.worker === newWorker) {
                                        pending.reject(new Error('Worker error'));
                                        pendingRequestsRef.current.delete(id);
                                    }
                                }
                                newWorker.terminate();
                                if (workerRef.current === newWorker) workerRef.current = null;
                            };

                            workerRef.current = newWorker;
                        } catch (e) {
                            console.error('[MC Worker] Failed to recycle worker:', e);
                        }
                    }
                    
                    reject(new Error("A análise demorou muito tempo e foi interrompida para proteger a performance do sistema."));
                }
            }, 10000);

            pendingRequestsRef.current.set(id, { 
                worker, // Track request owner worker instance
                timeoutId, // BUG 3 FIX: Guardar referência para limpeza
                resolve: (data) => {
                    clearTimeout(timeoutId);
                    // BUG 5 FIX: Resolver sempre o dado recebido para suportar concorrência nativa.
                    // O debounce/abort deve ser gerenciado no nível do componente, não no worker.
                    resolve(data);
                }, 
                reject: (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            });
            
            worker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
        });
    }, []);

    return { runAnalysis };
}
