import React from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Compass } from 'lucide-react';

export function ChartGuide({ guide }) {
  if (!guide) return null;

  const items = [
    {
      title: 'Como ler',
      Icon: BookOpen,
      text: guide.como,
      color: 'text-slate-200',
      accent: 'border-l-slate-400/60',
      iconColor: 'text-slate-300'
    },
    {
      title: 'Sinais positivos',
      Icon: CheckCircle2,
      text: guide.positivo,
      color: 'text-emerald-200/95',
      accent: 'border-l-emerald-400/80',
      iconColor: 'text-emerald-400'
    },
    {
      title: 'Alertas',
      Icon: AlertTriangle,
      text: guide.alerta,
      color: 'text-amber-200/95',
      accent: 'border-l-amber-400/80',
      iconColor: 'text-amber-400'
    },
    {
      title: 'O que fazer',
      Icon: Compass,
      text: guide.acao,
      color: 'text-indigo-200/95',
      accent: 'border-l-indigo-400/80',
      iconColor: 'text-indigo-400'
    }
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 backdrop-blur-xl p-3.5 shadow-inner">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {items.map(({ title, Icon, text, color, accent, iconColor }) => (
          <div
            key={title}
            className={`rounded-xl bg-slate-900/70 border border-white/[0.06] border-l-2 ${accent} p-3`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={13} className={iconColor} aria-hidden="true" />
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                {title}
              </p>
            </div>
            <p className={`text-xs leading-relaxed ${color}`}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
