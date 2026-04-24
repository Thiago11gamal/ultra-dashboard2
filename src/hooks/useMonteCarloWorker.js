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
    const abortRef = useRef(null);
    const timeoutRef = useRef(null);
    const requestIdRef = useRef(0);
    const pendingRequestsRef = useRef(new Map());

    useEffect(() => {
        // 🎯 MEMORY LEAK PROTECTION: O Worker é instanciado apenas quando o componente que o usa está na tela.
        try {
            const worker = new Worker(
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
                    if (pending.workerRef === workerRef) {
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
            // 🎯 ESSA LINHA SALVA A MEMÓRIA DO USUÁRIO: Mata a thread ao desmontar (ex: sair da página de Evolução)
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            // Limpa pendentes e timeouts deste worker específico
            for (const [id, pending] of pendingRequestsRef.current) {
                if (pending.timeoutId) clearTimeout(pending.timeoutId);
                pending.reject(new Error('Worker foi encerrado (component unmounted).'));
                pendingRequestsRef.current.delete(id);
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
                    console.warn(`[MC Worker] Request ${id} timed out, falling back to main thread`);
                    try {
                        resolve(runMonteCarloAnalysis(...args));
                    } catch (e) {
                        reject(e);
                    }
                }
            }, 5000);

            pendingRequestsRef.current.set(id, { 
                workerRef, // Track which worker owner this request
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
            
            abortRef.current = id;
            worker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
        });
    }, []);

    return { runAnalysis };
}
