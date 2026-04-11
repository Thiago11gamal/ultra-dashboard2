/**
 * useMonteCarloWorker — Hook para offload Monte Carlo para Web Worker
 * 
 * Mantém o fallback síncrono se Web Workers não estiverem disponíveis.
 * Usa Vite's `?worker` import com module worker support.
 */
import { useRef, useCallback, useEffect } from 'react';
import { runMonteCarloAnalysis } from '../engine';

let mcWorker = null;
let requestId = 0;
const pendingRequests = new Map();

function getWorker() {
    if (mcWorker) return mcWorker;
    try {
        mcWorker = new Worker(
            new URL('../engine/mc.worker.js', import.meta.url),
            { type: 'module' }
        );
        mcWorker.onmessage = (e) => {
            const { id, type, result, error } = e.data;
            const pending = pendingRequests.get(id);
            if (!pending) return;
            pendingRequests.delete(id);
            if (type === 'error') {
                pending.reject(new Error(error));
            } else {
                pending.resolve(result);
            }
        };
        mcWorker.onerror = (err) => {
            console.warn('[MC Worker] Error, falling back to main thread:', err.message);
            // Reject all pending requests so they can fallback
            for (const [id, pending] of pendingRequests) {
                pending.reject(new Error('Worker error'));
                pendingRequests.delete(id);
            }
            mcWorker?.terminate();
            mcWorker = null;
        };
        return mcWorker;
    } catch (e) {
        console.warn('[MC Worker] Not available, using main thread:', e.message);
        return null;
    }
}

export function useMonteCarloWorker() {
    const abortRef = useRef(null);
    const timeoutRef = useRef(null);
    // FIX 6: Track the latest request ID to prevent race conditions.
    // If the user triggers multiple simulations rapidly, only the result
    // from the most recent request will be resolved — stale results are discarded.
    const requestIdRef = useRef(0);

    useEffect(() => {
        return () => {
            // Cleanup on unmount — don't terminate the shared worker
            if (abortRef.current) {
                abortRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const runAnalysis = useCallback(async (...args) => {
        const worker = getWorker();
        
        // Fallback to main thread if worker not available
        if (!worker) {
            return runMonteCarloAnalysis(...args);
        }

        const id = ++requestId;
        requestIdRef.current = id; // Track which request is the latest
        
        // Build payload based on argument signature
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
            // FIXED: Scope timeoutId to the specific promise to ensure proper cleanup
            const timeoutId = setTimeout(() => {
                if (pendingRequests.has(id)) {
                    pendingRequests.delete(id);
                    console.warn(`[MC Worker] Request ${id} timed out, falling back to main thread`);
                    try {
                        resolve(runMonteCarloAnalysis(...args));
                    } catch (e) {
                        reject(e);
                    }
                }
            }, 5000);

            pendingRequests.set(id, { 
                resolve: (data) => {
                    clearTimeout(timeoutId); // FIXED: Immediate cleanup
                    // ONLY resolve if this is still the most recent request
                    if (id === requestIdRef.current) {
                        resolve(data);
                    } else {
                        // BUG FIX: Prevent Zombie Promises. Free memory and event loop.
                        reject(new Error('AbortError: Superseded by a newer request'));
                    }
                }, 
                reject: (err) => {
                    clearTimeout(timeoutId); // FIXED: Immediate cleanup
                    reject(err);
                }
            });
            
            abortRef.current = id;
            worker.postMessage({ type: 'runMonteCarloAnalysis', payload, id });
        });
    }, []);

    return { runAnalysis };
}
