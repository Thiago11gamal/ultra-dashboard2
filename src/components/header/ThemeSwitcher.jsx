import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

/**
 * ThemeSwitcher component for toggling between light, dark, and auto modes.
 */
function ThemeSwitcher({ currentMode, onThemeChange }) {
    const modes = [
        { id: 'light', icon: Sun, label: 'Claro' },
        { id: 'dark', icon: Moon, label: 'Escuro' },
        { id: 'auto', icon: Monitor, label: 'Auto' }
    ];

    // Normalize currentMode (true -> 'dark', false -> 'light', 'auto' -> 'auto')
    const normalizedMode = currentMode === 'auto' ? 'auto' : (currentMode === false ? 'light' : 'dark');

    return (
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
            {modes.map(m => {
                const Icon = m.icon;
                const isActive = normalizedMode === m.id;
                return (
                    <button
                        key={m.id}
                        onClick={(e) => { e.stopPropagation(); onThemeChange(m.id); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${
                            isActive 
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                        }`}
                        title={m.label}
                    >
                        <Icon size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter hidden sm:inline">{m.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default ThemeSwitcher;
