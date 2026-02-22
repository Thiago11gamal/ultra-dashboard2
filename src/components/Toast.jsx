import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
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
    if (!toast) return null;

    // Auto-dismiss after 4 seconds
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const Icon = icons[toast.type] || icons.info;
    const colorClass = colors[toast.type] || colors.info;

    return (
        <AnimatePresence>
            <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="pointer-events-auto"
            >
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r ${colorClass} text-white shadow-2xl min-w-[300px]`}>
                    <Icon size={24} className="shrink-0" />
                    <span className="font-medium text-sm flex-1">{toast.message}</span>
                    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors shrink-0">
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
