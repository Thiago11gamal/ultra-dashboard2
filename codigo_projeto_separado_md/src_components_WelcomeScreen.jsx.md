# src\components\WelcomeScreen.jsx

```jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

export default function WelcomeScreen({ onDismiss }) {
    const [isExiting, setIsExiting] = useState(false);
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const previousFocusRef = useRef(null); // FIX 5.4a: Guardar elemento com foco anterior

    // FIX 5.4a: Gerenciar foco ao abrir/fechar
    useEffect(() => {
        previousFocusRef.current = document.activeElement;
        
        // Mover foco para o botão principal
        const timer = setTimeout(() => {
            if (buttonRef.current) {
                buttonRef.current.focus();
            }
        }, 100);

        return () => {
            clearTimeout(timer);
            // Devolver foco ao elemento anterior ao fechar
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus();
            }
        };
    }, []);

    // FIX 5.4b: Fechar com tecla Enter
    const handleNext = useCallback(() => {
        if (isExiting) return; // FIX 5.4d: Prevenir dupla chamada
        setIsExiting(true);
        setTimeout(() => {
            try {
                sessionStorage.setItem('hasSeenWelcomeScreen', 'true');
            } catch (err) {
                console.warn('[Welcome] Falha ao salvar hasSeenWelcomeScreen:', err);
            }
            onDismiss();
        }, 800); 
    }, [isExiting, onDismiss]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !isExiting) {
                e.preventDefault();
                handleNext();
            }
            
            // FIX 5.4c: Prender foco dentro do modal (focus trap)
            if (e.key === 'Tab') {
                const focusableElements = containerRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                if (focusableElements && focusableElements.length > 0) {
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isExiting, handleNext]);



    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div 
                    ref={containerRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
                    role="dialog" // FIX 5.4a: Role de dialog
                    aria-modal="true" // FIX 5.4a: Modal
                    aria-labelledby="welcome-title" // FIX 5.4a: Título anunciado
                    aria-describedby="welcome-description" // FIX 5.4a: Descrição anunciada
                >
                    {/* Background Ambient Glow Subaquático */}
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.25, 0.1] 
                        }}
                        transition={{ 
                            duration: 8, 
                            repeat: Infinity,
                            ease: "easeInOut" 
                        }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" 
                        aria-hidden="true"
                    />
                    
                    <div className="flex flex-col items-center z-10 gap-8">
                        {/* Manta Ray Animation */}
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            className="relative"
                        >
                            <motion.img 
                                src={logo} 
                                alt="Manta Logo" 
                                animate={{ 
                                    y: [0, -15, 0],
                                    rotateZ: [0, 2, -2, 0]
                                }}
                                transition={{ 
                                    duration: 6, 
                                    repeat: Infinity,
                                    ease: "easeInOut" 
                                }}
                                className="w-64 md:w-80 rounded-3xl filter drop-shadow-[0_20px_50px_rgba(99,102,241,0.5)]"
                            />
                        </motion.div>

                        {/* Text Content */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="flex flex-col items-center gap-3 text-center"
                        >
                            {/* FIX 5.4a: IDs para aria-labelledby e aria-describedby */}
                            <h1 
                                id="welcome-title"
                                className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight drop-shadow-sm"
                            >
                                Bem-vindo
                            </h1>
                            <p 
                                id="welcome-description"
                                className="text-indigo-200/60 text-sm md:text-base max-w-md px-4 mt-2 font-medium"
                            >
                                O seu ecossistema inteligente de aprovação está pronto.
                            </p>
                        </motion.div>

                        {/* Interactive Button */}
                        <motion.button 
                            ref={buttonRef} // FIX 5.4a: Ref para gestão de foco
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            onClick={handleNext}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-12 py-4 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full font-black tracking-widest uppercase transition-colors shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] border border-indigo-400/30 mt-4 cursor-pointer"
                            aria-label="Entrar no Ultra Dashboard" // FIX 5.4a
                        >
                            Entrar
                        </motion.button>
                        
                        {/* FIX 5.4e: Dica para teclado */}
                        <p className="text-[10px] text-indigo-300/40 mt-2">
                            Pressione <kbd className="px-1 py-0.5 bg-indigo-500/10 rounded text-indigo-300/60">Enter</kbd> para entrar
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


```
