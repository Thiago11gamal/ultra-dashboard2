/**
 * llmClient.js
 *
 * Lote 6 — Cliente/adaptador para mini-LLM.
 *
 * O sistema não embute um modelo. Ele usa um provider opcional:
 *
 * globalThis.__COACH_LLM__ = {
 *   provider: {
 *     id: 'local-small-model',
 *     generateStructured: async ({ system, user }) => ({ ... })
 *   },
 *   timeoutMs: 8000
 * };
 *
 * O provider pode ser:
 * - Transformers.js;
 * - WebLLM;
 * - ONNX Runtime Web;
 * - API privada;
 * - mock de testes.
 */

function getLLMConfig() {
  try {
    return globalThis.__COACH_LLM__ || {};
  } catch {
    return {};
  }
}

export function getLLMProvider() {
  const config = getLLMConfig();
  return config.provider || null;
}

function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // fallback to balanced brace scan below
    }
  }

  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        if (inString) escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Gera saída estruturada usando o provider configurado.
 *
 * @param {Object} params
 * @param {string} params.system
 * @param {string} params.user
 * @param {number} [params.timeoutMs]
 * @param {number} [params.temperature]
 * @param {number} [params.maxTokens]
 * @returns {Promise<Object|null>}
 */
export async function generateStructuredLLM({
  system,
  user,
  timeoutMs,
  temperature = 0.2,
  maxTokens = 800,
  signal,
  onFailure,
} = {}) {
  const provider = getLLMProvider();
  if (!provider) {
    onFailure?.('llm_provider_not_configured');
    return null;
  }

  if (signal?.aborted) {
    onFailure?.('llm_aborted');
    return null;
  }

  const config = getLLMConfig();

  const safeTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.max(1, timeoutMs)
    : Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? Math.max(1, config.timeoutMs)
      : 7000;

  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

  let externalAbortReject = null;
  const externalAbortPromise = signal
    ? new Promise((_, reject) => {
        externalAbortReject = () => {
          try {
            abortController?.abort();
          } catch {
            // ignore
          }
          reject(new Error('LLM_ABORTED'));
        };
        signal.addEventListener('abort', externalAbortReject, { once: true });
      })
    : null;

  const requestPayload = {
    system,
    user,
    temperature,
    maxTokens,
    signal: abortController?.signal,
    response_format: {
      type: 'json_object',
    },
  };

  let executionError = null;
  const execution = (async () => {
    try {
      if (typeof provider.generateStructured === 'function') {
        const structured = await provider.generateStructured(requestPayload);
        return structured && typeof structured === 'object'
          ? structured
          : extractJsonFromText(String(structured));
      }

      if (typeof provider.generate === 'function') {
        const text = await provider.generate(requestPayload);
        return extractJsonFromText(String(text));
      }

      return null;
    } catch (err) {
      executionError = err;
      return null;
    }
  })();

  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        abortController?.abort();
      } catch {
        // ignore abort error
      }
      reject(new Error('LLM_TIMEOUT'));
    }, safeTimeout);
  });

  const racers = externalAbortPromise
    ? [execution, timeout, externalAbortPromise]
    : [execution, timeout];

  try {
    const result = await Promise.race(racers);
    if (result === null && executionError) {
      onFailure?.(executionError?.name === 'AbortError' ? 'llm_aborted' : 'llm_error');
    }
    return result;
  } catch (err) {
    if (err?.message === 'LLM_TIMEOUT') {
      onFailure?.('llm_timeout');
    } else if (err?.message === 'LLM_ABORTED' || err?.name === 'AbortError') {
      onFailure?.('llm_aborted');
    } else {
      onFailure?.('llm_error');
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    if (signal && externalAbortReject) {
      signal.removeEventListener('abort', externalAbortReject);
    }
  }
}

export function registerLLMProvider(provider, options = {}) {
  if (!provider || (typeof provider.generateStructured !== 'function' && typeof provider.generate !== 'function')) {
    return false;
  }
  try {
    const safeOptions = options && typeof options === 'object' ? options : {};
    globalThis.__COACH_LLM__ = {
      ...safeOptions,
      provider,
    };
    if (typeof globalThis.__COACH_LLM_CACHE__?.clear === 'function') {
      globalThis.__COACH_LLM_CACHE__.clear();
    }
    return true;
  } catch {
    return false;
  }
}

export function clearLLMProvider() {
  try {
    globalThis.__COACH_LLM__ = null;
    if (typeof globalThis.__COACH_LLM_CACHE__?.clear === 'function') {
      globalThis.__COACH_LLM_CACHE__.clear();
    }
  } catch {
    // ignore
  }
}

export default {
  getLLMProvider,
  registerLLMProvider,
  generateStructuredLLM,
  clearLLMProvider,
};

