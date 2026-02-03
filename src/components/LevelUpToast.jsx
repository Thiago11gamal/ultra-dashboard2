import React, { useEffect, useState } from 'react';
import { Trophy, Star, Sparkles, X } from 'lucide-react';

export default function LevelUpToast({ level, title, onClose }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const showTimer = setTimeout(() => setVisible(true), 10);
        // Auto-close after 5 seconds if not interactive
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 500); // Wait for exit animation
        }, 6000);
        return () => {
            clearTimeout(timer);
            clearTimeout(showTimer);
        };
    }, [onClose]);

    if (!level) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
            {/* Backdrop Effect */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500" />

            {/* Confetti / particles could go here */}

            {/* The Card */}
            <div className={`relative pointer-events-auto bg-slate-900 border-2 border-yellow-500/50 p-8 rounded-2xl shadow-[0_0_50px_-10px_rgba(234,179,8,0.5)] transform transition-all duration-700 ${visible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-10'} flex flex-col items-center gap-4 max-w-sm text-center overflow-hidden`}>

                {/* Close Button */}
                <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                {/* Shine Effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-y-12 animate-pulse pointer-events-none" />

                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-5xl shadow-xl relative animate-bounce">
                    <span className="relative z-10">👑</span>
                    <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse" />
                </div>

                {/* Text */}
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 uppercase tracking-wide drop-shadow-sm">
                        Nova Colocação!
                    </h2>
                    <p className="text-slate-400 font-medium">Você alcançou a Colocação {level}</p>
                </div>

                {/* Title Badge */}
                <div className="px-6 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                    <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                        <Sparkles size={14} />
                        {title}
                        <Sparkles size={14} />
                    </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">Continue estudando para chegar ao topo!</p>
            </div>
        </div>
    );
}
