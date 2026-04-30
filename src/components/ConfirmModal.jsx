import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger" }) {
    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop with extreme blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[12px]"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col"
                    >
                        {/* Interactive Background Glows */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 ${type === 'danger' ? 'bg-red-500/20' : 'bg-purple-500/20'} rounded-full blur-[80px] pointer-events-none animate-pulse`} />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all z-20 group"
                        >
                            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        <div className="p-8 sm:p-10 relative z-10">
                            {/* Header Section */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${type === 'danger' ? 'from-red-500 to-rose-600' : 'from-purple-500 to-blue-600'} flex items-center justify-center shadow-lg ${type === 'danger' ? 'shadow-red-500/20' : 'shadow-purple-500/20'}`}>
                                    <AlertTriangle size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{title}</h2>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest opacity-60">Confirmação</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <p className="text-slate-300 font-medium leading-relaxed">
                                    {message}
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onConfirm();
                                            onClose();
                                        }}
                                        className={`flex-[2] px-6 py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r ${type === 'danger' ? 'from-red-600 via-red-500 to-rose-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'from-purple-600 via-purple-500 to-blue-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'} transition-all active:scale-95 flex items-center justify-center gap-2 group/btn`}
                                    >
                                        <span>{confirmText.toUpperCase()}</span>
                                        <Check size={16} className="group-hover/btn:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Bottom Decoration */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${type === 'danger' ? 'from-red-600 via-rose-500 to-orange-500' : 'from-purple-600 via-blue-500 to-emerald-500'} opacity-50`} />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}
