import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Sparkles, X, Layout } from 'lucide-react';

export default function PromptModal({ isOpen, onClose, onConfirm, title, placeholder, initialValue = "" }) {
    const [inputValue, setInputValue] = useState(initialValue);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    const inputRef = useRef(null);

    // React recommended way to derive state from props without causing cascading effect renders
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setInputValue(initialValue);
        }
    }

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onConfirm(inputValue.trim());
            onClose();
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop with extreme blur */}
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[12px]"
                        onClick={onClose}
                    />

                    {/* Modal Container */}
                    <Motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col"
                    >
                        {/* Interactive Background Glows */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />
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
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    {title.toLowerCase().includes('disciplina') ? (
                                        <Layout size={24} className="text-white" />
                                    ) : (
                                        <Sparkles size={24} className="text-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{title}</h2>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest opacity-60">Personalização</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                                            Identificação
                                        </label>
                                        <span className="text-[10px] font-mono text-purple-400/60">{inputValue.length}/200</span>
                                    </div>
                                    
                                    <div className="relative group">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value.slice(0, 200))}
                                            placeholder={placeholder}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-lg"
                                            autoComplete="off"
                                        />
                                        {/* Animated underline focus effect */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-purple-500 to-blue-500 group-focus-within:w-1/2 transition-all duration-500" />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim()}
                                        className="flex-[2] px-6 py-4 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                                    >
                                        <span>CONFIRMAR</span>
                                        <Sparkles size={16} className="group-hover/btn:rotate-12 transition-transform" />
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                        {/* Bottom Decoration */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 opacity-50" />
                    </Motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
}
