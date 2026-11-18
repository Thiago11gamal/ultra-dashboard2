import { lazy } from 'react';

export const REFRESH_KEY = 'page-has-been-force-refreshed';
export const REFRESH_AT_KEY = 'page-has-been-force-refreshed-at';
export const REFRESH_COOLDOWN_MS = 15_000;

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 400;

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
  /Loading chunk [\w-]+ failed/i,
  /Loading CSS chunk [\w-]+ failed/i,
  /ChunkLoadError/i,
  /Failed to fetch/i,
  /NetworkError when attempting to fetch resource/i,
  /Load failed/i,
  /Expected a JavaScript-or-Wasm module script/i,
  /MIME type/i,
  /Unexpected token '<'/i,
];

const routePreloaders = new Map();

/**
 * Verifica se o navegador reporta explicitamente estar sem conexão.
 */
export function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Identifica se o erro é uma falha de carregamento de chunk/rede (ex: deploy novo ou oscilação de rede),
 * diferenciando-o de erros de programação/contrato do módulo.
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  if (error.isModuleContractError) return false;
  if (
    error instanceof ReferenceError ||
    error instanceof RangeError ||
    error instanceof URIError
  ) {
    return false;
  }

  const name = String(error.name || '');
  const message = String(error.message || error || '');

  if (name === 'ChunkLoadError') return true;
  if (
    message.includes('Module import returned undefined') ||
    message.includes('Module has no default export')
  ) {
    return false;
  }

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Verifica se a página já sofreu um force-refresh recentemente (dentro da janela de cooldown).
 * Caso o cooldown já tenha expirado, limpa automaticamente a flag para permitir recuperações futuras.
 */
export function hasRecentlyForceRefreshed(now = Date.now()) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;

    const rawFlag = window.sessionStorage.getItem(REFRESH_KEY);
    const isFlagSet = rawFlag === 'true' || JSON.parse(rawFlag || 'false') === true;
    if (!isFlagSet) return false;

    const rawAt = window.sessionStorage.getItem(REFRESH_AT_KEY);
    if (rawAt !== null && rawAt !== '') {
      const refreshedAt = Number(rawAt);
      if (Number.isFinite(refreshedAt) && refreshedAt > 0) {
        if (now - refreshedAt > REFRESH_COOLDOWN_MS) {
          window.sessionStorage.setItem(REFRESH_KEY, 'false');
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Limpa o estado de force-refresh no sessionStorage.
 */
export function clearChunkReloadState() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(REFRESH_KEY, 'false');
      window.sessionStorage.removeItem(REFRESH_AT_KEY);
      window.sessionStorage.removeItem('chunk_reload_count');
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Tenta acionar um único hard reload seguro quando ocorre falha de chunk após esgotar retries.
 * Retorna `true` se o reload foi disparado, ou `false` se estiver offline ou dentro do cooldown.
 */
export function tryForceChunkReload(error) {
  if (typeof window === 'undefined' || !window.location) return false;
  if (isBrowserOffline()) return false;
  if (hasRecentlyForceRefreshed()) return false;

  console.warn('Chunk load failed. Forcing page refresh...', error);
  try {
    window.sessionStorage?.setItem(REFRESH_KEY, 'true');
    window.sessionStorage?.setItem(REFRESH_AT_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }

  window.location.reload();
  return true;
}

/**
 * Registra uma função de preload associada a uma ou mais rotas.
 */
export function registerRoutePreloader(routes, preloadFn) {
  if (!routes || typeof preloadFn !== 'function') return;
  const list = Array.isArray(routes) ? routes : [routes];
  list.forEach((route) => {
    if (typeof route === 'string' && route.trim()) {
      routePreloaders.set(route.trim(), preloadFn);
    }
  });
}

/**
 * Pré-carrega de forma silenciosa o chunk associado a uma rota (ideal para onMouseEnter/onFocus na Sidebar).
 */
export function preloadRoute(route) {
  if (typeof route !== 'string' || isBrowserOffline()) return Promise.resolve(null);
  const cleanRoute = route.split('?')[0].split('#')[0].trim() || '/';
  const preloader = routePreloaders.get(cleanRoute);
  if (typeof preloader === 'function') {
    return preloader();
  }
  return Promise.resolve(null);
}

/**
 * Escuta o evento nativo `vite:preloadError` do Vite para recuperar falhas de sub-chunks e CSS
 * após novos deployments.
 */
export function registerVitePreloadErrorHandler() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (window.__ultraVitePreloadHandlerRegistered) return;
  window.__ultraVitePreloadHandlerRegistered = true;

  window.addEventListener('vite:preloadError', (event) => {
    const error = event?.payload || event;
    if (tryForceChunkReload(error)) {
      event?.preventDefault?.();
    }
  });
}

registerVitePreloadErrorHandler();

function waitMs(ms) {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateLoadedModule(component) {
  if (!component) {
    const err = new Error('Module import returned undefined');
    err.isModuleContractError = true;
    throw err;
  }
  if (!component.default) {
    const err = new Error('Module has no default export');
    err.isModuleContractError = true;
    throw err;
  }
  return component;
}

/**
 * Wrapper resiliente para `React.lazy` com:
 * 1. Retries em memória com backoff exponencial antes do reload forçado
 * 2. Deduplicação de chamadas concorrentes e suporte a `.preload()`
 * 3. Filtro de erros de contrato/código vs. erros de chunk/rede
 * 4. Proteção contra reload inútil em modo offline (PWA)
 * 5. Controle de cooldown no sessionStorage para evitar loop de reloads
 *
 * @param {() => Promise<any>} componentImport
 * @param {object|string|string[]} [options]
 */
export const lazyWithRetry = (componentImport, options = {}) => {
  const normalizedOptions =
    typeof options === 'string' || Array.isArray(options)
      ? { route: options }
      : options || {};

  const retries = Number.isInteger(normalizedOptions.retries)
    ? Math.max(0, normalizedOptions.retries)
    : DEFAULT_RETRIES;
  const retryDelayMs = Number.isFinite(normalizedOptions.retryDelayMs)
    ? Math.max(0, normalizedOptions.retryDelayMs)
    : DEFAULT_RETRY_DELAY_MS;

  let inFlightPromise = null;

  const importWithInMemoryRetries = async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const rawModule = await componentImport();
        return validateLoadedModule(rawModule);
      } catch (error) {
        lastError = error;
        const canRetryInMemory =
          attempt < retries &&
          !error?.isModuleContractError &&
          !(error instanceof ReferenceError) &&
          !(error instanceof RangeError) &&
          !isBrowserOffline();

        if (!canRetryInMemory) {
          throw error;
        }

        await waitMs(retryDelayMs * Math.pow(2, attempt));
      }
    }
    throw lastError;
  };

  const getOrLoadModule = () => {
    if (!inFlightPromise) {
      inFlightPromise = importWithInMemoryRetries().catch((err) => {
        inFlightPromise = null;
        throw err;
      });
    }
    return inFlightPromise;
  };

  const LazyComponent = lazy(async () => {
    // Lê o estado antes da tentativa (e já limpa flags expiradas de reloads antigos)
    const alreadyRefreshedRecently = hasRecentlyForceRefreshed();

    try {
      const component = await getOrLoadModule();

      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const refreshedAt = Number(window.sessionStorage.getItem(REFRESH_AT_KEY) || 0);
          if (!Number.isFinite(refreshedAt) || Date.now() - refreshedAt > REFRESH_COOLDOWN_MS) {
            window.sessionStorage.setItem(REFRESH_KEY, 'false');
          }
        }
      } catch {
        // ignore storage errors
      }

      return component;
    } catch (error) {
      const shouldAttemptForceReload =
        !alreadyRefreshedRecently &&
        !error?.isModuleContractError &&
        !(error instanceof ReferenceError) &&
        !(error instanceof RangeError);

      if (shouldAttemptForceReload && tryForceChunkReload(error)) {
        return new Promise(() => { });
      }

      throw error;
    }
  });

  LazyComponent.preload = () => {
    if (isBrowserOffline()) return Promise.resolve(null);
    return getOrLoadModule().catch(() => null);
  };

  if (normalizedOptions.route) {
    registerRoutePreloader(normalizedOptions.route, LazyComponent.preload);
  }

  return LazyComponent;
};
