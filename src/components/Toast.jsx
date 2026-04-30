import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-cyan-500',
};

export default function Toast({ toast, onClose }) {
    // Auto-dismiss after 4 seconds
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;

    const Icon = icons[toast.type] || icons.info;
    const colorClass = colors[toast.type] || colors.info;

    return (
        <div className="pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-right-10">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r ${colorClass} text-white shadow-2xl min-w-[300px]`}>
                <Icon size={24} className="shrink-0" />
                <span className="font-medium text-sm flex-1">{toast.message}</span>
                <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors shrink-0">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
