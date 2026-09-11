import React from 'react';

export function ChartGuide({ guide }) {
  if (!guide) return null;

  const items = [
    {
      title: 'Como ler',
      icon: '📖',
      text: guide.como,
      color: 'text-slate-300'
    },
    {
      title: 'Sinais positivos',
      icon: '✅',
      text: guide.positivo,
      color: 'text-emerald-300'
    },
    {
      title: 'Alertas',
      icon: '⚠️',
      text: guide.alerta,
      color: 'text-amber-300'
    },
    {
      title: 'O que fazer',
      icon: '🧭',
      text: guide.acao,
      color: 'text-indigo-300'
    }
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-4 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl bg-black/25 border border-white/5 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span aria-hidden="true">{item.icon}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {item.title}
              </p>
            </div>
            <p className={`text-xs leading-relaxed ${item.color}`}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
