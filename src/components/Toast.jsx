import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig = {
    success: {
        icon: CheckCircle2,
        iconColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/25',
        borderColor: 'border-emerald-500/30',
        glow: 'shadow-emerald-950/20',
    },
    error: {
        icon: AlertCircle,
        iconColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/10 border-rose-500/25',
        borderColor: 'border-rose-500/30',
        glow: 'shadow-rose-950/20',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 border-amber-500/25',
        borderColor: 'border-amber-500/30',
        glow: 'shadow-amber-950/20',
    },
    info: {
        icon: Info,
        iconColor: 'text-sky-400',
        badgeBg: 'bg-sky-500/10 border-sky-500/25',
        borderColor: 'border-sky-500/30',
        glow: 'shadow-sky-950/20',
    },
};

export default function Toast({ toast, onClose }) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Auto-dismiss after 4 seconds
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => onCloseRef.current?.(), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    if (!toast) return null;

    const config = toastConfig[toast.type] || toastConfig.info;
    const Icon = config.icon;

    return (
        <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className="pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4"
        >
            <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border ${config.borderColor} shadow-xl ${config.glow} text-slate-100 min-w-[240px] max-w-sm sm:max-w-md`}
            >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${config.badgeBg}`}>
                    <Icon size={16} className={config.iconColor} />
                </div>
                <span className="font-medium text-xs sm:text-[13px] text-slate-200 leading-snug flex-1 select-none">
                    {toast.message}
                </span>
                <button
                    onClick={onClose}
                    type="button"
                    aria-label="Fechar notificação"
                    className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg p-1 transition-colors shrink-0 cursor-pointer"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
