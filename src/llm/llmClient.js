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

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonCandidate = text.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
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

  const safeTimeout = Number.isFinite(timeoutMs)
    ? timeoutMs
    : Number.isFinite(config.timeoutMs)
      ? config.timeoutMs
      : 7000;

  const requestPayload = {
    system,
    user,
    temperature,
    maxTokens,
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

  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('LLM_TIMEOUT')), safeTimeout);
  });

  try {
    return await Promise.race([execution, timeout]);
  } catch {
    return null;
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

