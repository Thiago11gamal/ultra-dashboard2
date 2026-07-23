import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { AlertTriangle, X, Check, Info, Play } from 'lucide-react';

const TYPE_CONFIG = {
    danger: {
        glow: 'bg-red-500/20',
        badgeBg: 'from-red-500 to-rose-600 shadow-red-500/20',
        confirmBtn: 'from-red-600 via-red-500 to-rose-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
        bar: 'from-red-600 via-rose-500 to-orange-500',
        DefaultIcon: AlertTriangle
    },
    primary: {
        glow: 'bg-purple-500/20',
        badgeBg: 'from-indigo-500 to-purple-600 shadow-indigo-500/20',
        confirmBtn: 'from-indigo-600 via-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        bar: 'from-indigo-600 via-purple-500 to-pink-500',
        DefaultIcon: Play
    },
    warning: {
        glow: 'bg-amber-500/20',
        badgeBg: 'from-amber-500 to-orange-600 shadow-amber-500/20',
        confirmBtn: 'from-amber-600 via-amber-500 to-orange-600 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
        bar: 'from-amber-600 via-orange-500 to-yellow-500',
        DefaultIcon: AlertTriangle
    },
    info: {
        glow: 'bg-blue-500/20',
        badgeBg: 'from-blue-500 to-cyan-600 shadow-blue-500/20',
        confirmBtn: 'from-blue-600 via-cyan-600 to-teal-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        bar: 'from-blue-600 via-cyan-500 to-teal-500',
        DefaultIcon: Info
    }
};

export default function ConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Confirmação", 
    message, 
    confirmText = "Confirmar", 
    cancelText = "Cancelar", 
    type = "danger",
    icon: IconProp
}) {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.danger;
    const IconComponent = IconProp || config.DefaultIcon;

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleConfirm = async () => {
        try {
            if (onConfirm) {
                await onConfirm();
            }
            onClose?.();
        } catch (err) {
            console.error('Erro ao executar confirmação:', err);
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
                >
                    {/* Backdrop with extreme blur */}
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <Motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                        className="bg-slate-900/90 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col z-10"
                    >
                        {/* Interactive Background Glows */}
                        <div className={`absolute -top-24 -right-24 w-56 h-56 ${config.glow} rounded-full blur-[80px] pointer-events-none animate-pulse`} />
                        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-500/15 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all z-20 group"
                        >
                            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        <div className="p-8 sm:p-10 relative z-10">
                            {/* Header Section */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.badgeBg} flex items-center justify-center shrink-0 shadow-lg`}>
                                    <IconComponent size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight leading-tight mb-0.5">{title}</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-70">Confirmação requerida</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-slate-300 font-medium text-sm sm:text-base leading-relaxed">
                                    {message}
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95 cursor-pointer"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirm}
                                        className={`flex-[1.5] px-5 py-3.5 rounded-2xl text-sm font-black text-white bg-gradient-to-r ${config.confirmBtn} transition-all active:scale-95 flex items-center justify-center gap-2 group/btn cursor-pointer`}
                                    >
                                        <span>{confirmText.toUpperCase()}</span>
                                        <Check size={16} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Bottom Decoration */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${config.bar} opacity-60`} />
                    </Motion.div>
                </Motion.div>
            )}
        </AnimatePresence>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}
