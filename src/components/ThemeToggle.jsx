import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function ThemeToggle() {
    const darkMode = useAppStore(state => state.appState.contests[state.appState.activeId]?.settings?.darkMode !== false);
    const toggleDarkMode = useAppStore(state => state.toggleDarkMode);

    return (
        <button
            onClick={toggleDarkMode}
            className="fixed bottom-6 right-6 z-[110] w-12 h-12 rounded-full glass border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all text-white group"
            title={darkMode ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            {darkMode ? (
                <Sun size={20} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            ) : (
                <Moon size={20} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
            )}
        </button>
    );
}
