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
}) {
  const provider = getLLMProvider();
  if (!provider) return null;

  const config = getLLMConfig();

  const safeTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.max(1, timeoutMs)
    : Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? Math.max(1, config.timeoutMs)
      : 7000;

  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

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
    } catch {
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

  try {
    return await Promise.race([execution, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function clearLLMProvider() {
  try {
    if (globalThis.__COACH_LLM__) {
      globalThis.__COACH_LLM__.provider = null;
    }
  } catch {
    // ignore
  }
}

export default {
  getLLMProvider,
  generateStructuredLLM,
  clearLLMProvider,
};

