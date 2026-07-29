import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * ChartFrame
 * Mede o próprio container e só monta o gráfico quando há área real (> 0).
 * Enquanto mede, exibe um placeholder ambient com shimmer — nunca um chart cego.
 * Reage a resize / aba que vira visível via ResizeObserver.
 */
const isTestEnv =
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') ||
  (typeof window !== 'undefined' && window.navigator && /jsdom/i.test(window.navigator.userAgent || ''));

export default function ChartFrame({
  children,
  minHeight = 320,
  label = 'Calibrando visualização',
  className = '',
}) {
  const boxRef = useRef(null);
  const [ready, setReady] = useState(() => Boolean(isTestEnv));
  const [size, setSize] = useState(() => (isTestEnv ? { w: 800, h: Number(minHeight) || 320 } : { w: 0, h: 0 }));

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || isTestEnv) return;

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const r = entry.contentRect || el.getBoundingClientRect();
          const w = Math.floor(r.width);
          const h = Math.floor(r.height);
          setSize({ w, h });
          setReady(w > 0 && h > 0);
        }
      });
      ro.observe(el);
    } else {
      const r = el.getBoundingClientRect();
      const w = Math.floor(r.width) || 800;
      const h = Math.floor(r.height) || Number(minHeight) || 320;
      setSize({ w, h });
      setReady(true);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [minHeight]);

  return (
    <div
      ref={boxRef}
      style={{ minHeight }}
      className={`relative w-full h-full overflow-hidden rounded-2xl ${className}`}
    >
      {/* Placeholder vivo — só some quando o chart tem onde nascer */}
      <div
        aria-hidden={ready}
        className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${ready ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      >
        {/* camada ambient: varredura sutil, sem gradiente de "AI hero" */}
        <div className="absolute inset-0 bg-[#0b0e18]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'linear-gradient(110deg, transparent 30%, rgba(148,163,184,0.06) 50%, transparent 70%)',
            backgroundSize: '220% 100%',
            animation: 'chartframe-sweep 1.6s ease-in-out infinite',
          }}
        />
        <div className="relative flex flex-col items-center gap-2 px-6 text-center">
          <span className="h-2 w-2 rounded-full bg-teal-300/80 shadow-[0_0_10px_rgba(94,234,212,0.7)] animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
            {label}
          </span>
          <span className="text-[10px] font-medium tracking-wide text-slate-600 tabular-nums">
            {size.w}×{size.h}
          </span>
        </div>
      </div>

      {/* O gráfico só monta com área válida — adeus, width(-1) */}
      <div
        className={`relative h-full w-full transition-all duration-500 ${ready ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
      >
        {ready ? children : null}
      </div>

      <style>{`
        @keyframes chartframe-sweep {
          0%   { background-position: 140% 0; }
          100% { background-position: -40% 0; }
        }
      `}</style>
    </div>
  );
}

export { ChartFrame };
