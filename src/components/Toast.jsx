import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig = {
    success: {
        icon: CheckCircle2,
        bgGradient: 'from-emerald-700 via-emerald-600 to-teal-600',
        glow: 'shadow-emerald-500/35',
        border: 'border-white/25',
    },
    error: {
        icon: AlertCircle,
        bgGradient: 'from-rose-700 via-red-600 to-pink-600',
        glow: 'shadow-rose-500/35',
        border: 'border-white/25',
    },
    warning: {
        icon: AlertTriangle,
        bgGradient: 'from-amber-700 via-orange-600 to-amber-600',
        glow: 'shadow-amber-500/35',
        border: 'border-white/25',
    },
    info: {
        icon: Info,
        bgGradient: 'from-blue-700 via-sky-600 to-cyan-600',
        glow: 'shadow-sky-500/35',
        border: 'border-white/25',
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
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r ${config.bgGradient} text-white shadow-xl ${config.glow} border ${config.border} min-w-[240px] max-w-sm sm:max-w-md`}
            >
                <div className="w-6 h-6 rounded-lg bg-black/20 border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon size={15} className="text-white drop-shadow-sm" />
                </div>
                <span
                    className="font-bold text-[13px] sm:text-sm text-white leading-snug flex-1 select-none tracking-normal"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.75), 0 0 1px rgba(0, 0, 0, 0.9)' }}
                >
                    {toast.message}
                </span>
                <button
                    onClick={onClose}
                    type="button"
                    aria-label="Fechar notificação"
                    className="text-white/90 hover:text-white hover:bg-black/20 rounded-lg p-1 transition-colors shrink-0 cursor-pointer"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
