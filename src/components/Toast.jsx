import React, { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastConfig = {
    success: {
        icon: CheckCircle2,
        bgGradient: 'from-emerald-500 to-teal-400',
        glow: 'shadow-emerald-500/20',
    },
    error: {
        icon: AlertCircle,
        bgGradient: 'from-rose-500 to-pink-500',
        glow: 'shadow-rose-500/20',
    },
    warning: {
        icon: AlertTriangle,
        bgGradient: 'from-amber-500 to-orange-400',
        glow: 'shadow-amber-500/20',
    },
    info: {
        icon: Info,
        bgGradient: 'from-blue-500 to-cyan-400',
        glow: 'shadow-blue-500/20',
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
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r ${config.bgGradient} text-white shadow-lg ${config.glow} min-w-[240px] max-w-sm sm:max-w-md`}
            >
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-white" />
                    </div>
                    <span className="font-medium text-xs sm:text-[13px] leading-snug flex-1 select-none">
                        {toast.message}
                    </span>
                    <button
                        onClick={onClose}
                        type="button"
                        aria-label="Fechar notificação"
                        className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-colors shrink-0 cursor-pointer"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
            );
}
