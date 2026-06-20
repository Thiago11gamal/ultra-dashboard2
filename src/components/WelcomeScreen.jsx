import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

export default function WelcomeScreen({ onDismiss }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleNext = () => {
        setIsExiting(true);
        // Espera a animação de saída terminar para desmontar e liberar o App
        setTimeout(() => {
            onDismiss();
        }, 800); 
    };

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
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
                    />

                    <div className="flex flex-col items-center z-10 gap-8">
                        {/* Premium Manta Ray Animation com nado 3D */}
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            style={{ perspective: 1000 }}
                        >
                            {/* Wrapper para movimento de translação (flutuar e deslizar) */}
                            <motion.div
                                animate={{ 
                                    y: [0, -30, 10, 0],
                                    x: [-15, 20, -10, -15],
                                }}
                                transition={{ 
                                    duration: 8, 
                                    repeat: Infinity,
                                    ease: "easeInOut" 
                                }}
                            >
                                {/* Wrapper da imagem para movimento 3D e "bater de asas" (ondulação) */}
                                <motion.img 
                                    src={logo} 
                                    alt="Manta Logo" 
                                    animate={{ 
                                        rotateZ: [-3, 4, -2, -3],
                                        rotateX: [15, -5, 20, 15], 
                                        rotateY: [-20, 15, -10, -20], 
                                        scaleX: [1, 0.88, 1.05, 1], 
                                        scaleY: [1, 1.08, 0.95, 1],
                                    }}
                                    transition={{ 
                                        duration: 6, 
                                        repeat: Infinity,
                                        ease: "easeInOut" 
                                    }}
                                    className="w-64 md:w-80 filter drop-shadow-[0_20px_50px_rgba(99,102,241,0.6)]"
                                    style={{ transformStyle: 'preserve-3d' }}
                                />
                            </motion.div>
                        </motion.div>

                        {/* Text Content */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="flex flex-col items-center gap-3 text-center"
                        >
                            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight drop-shadow-sm">
                                Bem-vindo
                            </h1>
                            <p className="text-indigo-200/60 text-sm md:text-base max-w-md px-4 mt-2 font-medium">
                                O seu ecossistema inteligente de aprovação está pronto.
                            </p>
                        </motion.div>

                        {/* Interactive Button */}
                        <motion.button 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            onClick={handleNext}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-12 py-4 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full font-black tracking-widest uppercase transition-colors shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] border border-indigo-400/30 mt-4 cursor-pointer"
                        >
                            Entrar
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
