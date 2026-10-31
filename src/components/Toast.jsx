import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig = {
    success: {
        icon: CheckCircle2,
        bgGradient: 'from-emerald-600 via-teal-500 to-emerald-400',
        glow: 'shadow-emerald-500/35',
        border: 'border-white/25',
    },
    error: {
        icon: AlertCircle,
        bgGradient: 'from-rose-600 via-red-500 to-pink-500',
        glow: 'shadow-rose-500/35',
        border: 'border-white/25',
    },
    warning: {
        icon: AlertTriangle,
        bgGradient: 'from-amber-500 via-orange-500 to-amber-400',
        glow: 'shadow-amber-500/35',
        border: 'border-white/25',
    },
    info: {
        icon: Info,
        bgGradient: 'from-blue-600 via-sky-500 to-cyan-400',
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
                <div className="w-6 h-6 rounded-lg bg-white/25 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon size={15} className="text-white" />
                </div>
                <span className="font-semibold text-xs sm:text-[13px] leading-snug flex-1 select-none drop-shadow-sm">
                    {toast.message}
                </span>
                <button
                    onClick={onClose}
                    type="button"
                    aria-label="Fechar notificação"
                    className="text-white/80 hover:text-white hover:bg-white/25 rounded-lg p-1 transition-colors shrink-0 cursor-pointer"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
