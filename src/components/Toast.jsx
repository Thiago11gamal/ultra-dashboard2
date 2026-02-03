import React from 'react';
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

    const Icon = icons[toast.type] || icons.info;
    const colorClass = colors[toast.type] || colors.info;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, x: 50 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 50, x: 50 }}
                className="fixed bottom-8 right-8 z-50"
            >
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r ${colorClass} text-white shadow-2xl`}>
                    <Icon size={24} />
                    <span className="font-medium">{toast.message}</span>
                    <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
