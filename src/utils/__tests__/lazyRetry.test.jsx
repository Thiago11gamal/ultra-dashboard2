import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  lazyWithRetry,
  isChunkLoadError,
  hasRecentlyForceRefreshed,
  clearChunkReloadState,
  preloadRoute,
  REFRESH_KEY,
  REFRESH_AT_KEY,
  REFRESH_COOLDOWN_MS,
} from '../lazyRetry';

describe('lazyRetry & Resilient Chunk Loading', () => {
  const originalLocation = window.location;
  const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
  let reloadMock;

  beforeEach(() => {
    clearChunkReloadState();
    reloadMock = vi.fn();
    delete window.location;
    window.location = { ...originalLocation, reload: reloadMock };
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    if (originalOnLine) {
      Object.defineProperty(window.navigator, 'onLine', originalOnLine);
    }
    vi.restoreAllMocks();
  });

  it('recovers from transient chunk errors in-memory without reloading the page', async () => {
    let attempts = 0;
    const MockComp = () => <div data-testid="loaded-comp">Sucesso</div>;
    const importer = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new TypeError('Failed to fetch dynamically imported module: /assets/Page.js');
      }
      return { default: MockComp };
    });

    const LazyComp = lazyWithRetry(importer, { retries: 2, retryDelayMs: 5 });

    render(
      <Suspense fallback={<div>Carregando...</div>}>
        <LazyComp />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loaded-comp')).toBeDefined();
    });
    expect(importer).toHaveBeenCalledTimes(3);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does not retry or force page reload on module contract errors (missing default export)', async () => {
    const importer = vi.fn(async () => ({ namedOnly: () => null }));
    const LazyComp = lazyWithRetry(importer, { retries: 2, retryDelayMs: 5 });

    await expect(LazyComp.preload()).resolves.toBeNull();
    expect(importer).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does not force page reload when browser is offline (navigator.onLine === false)', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    const importer = vi.fn(async () => {
      throw new TypeError('Failed to fetch dynamically imported module');
    });

    const LazyComp = lazyWithRetry(importer, { retries: 2, retryDelayMs: 5 });

    class LocalBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { err: null };
      }
      static getDerivedStateFromError(err) {
        return { err };
      }
      render() {
        if (this.state.err) return <div data-testid="offline-err">{this.state.err.message}</div>;
        return this.props.children;
      }
    }

    render(
      <LocalBoundary>
        <Suspense fallback={<div>Carregando...</div>}>
          <LazyComp />
        </Suspense>
      </LocalBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('offline-err')).toBeDefined();
    });
    expect(importer).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('clears expired force-refresh cooldown automatically so future deploys can reload', () => {
    const pastTimestamp = Date.now() - (REFRESH_COOLDOWN_MS + 5_000);
    window.sessionStorage.setItem(REFRESH_KEY, 'true');
    window.sessionStorage.setItem(REFRESH_AT_KEY, String(pastTimestamp));

    expect(hasRecentlyForceRefreshed()).toBe(false);
    expect(window.sessionStorage.getItem(REFRESH_KEY)).toBe('false');
  });

  it('supports .preload() and preloadRoute() with request deduplication', async () => {
    const MockComp = () => <div>Route Preloaded</div>;
    const importer = vi.fn(async () => ({ default: MockComp }));

    lazyWithRetry(importer, { route: '/test-preload-route' });

    const [res1, res2] = await Promise.all([
      preloadRoute('/test-preload-route?tab=1'),
      preloadRoute('/test-preload-route#section'),
    ]);

    expect(res1?.default).toBe(MockComp);
    expect(res2?.default).toBe(MockComp);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('identifies chunk load errors accurately via isChunkLoadError', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/style.css'))).toBe(true);
    expect(isChunkLoadError(new ReferenceError('foo is not defined'))).toBe(false);
    expect(isChunkLoadError(new Error('Module has no default export'))).toBe(false);
  });
});
