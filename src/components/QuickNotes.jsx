import React, { useState, useEffect, useRef } from 'react';
import { Save, Eraser, StickyNote } from 'lucide-react';


export default function QuickNotes({ notes = '', onSave }) {
    const [text, setText] = useState(notes);
    const [isFocused, setIsFocused] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const prevNotesRef = useRef(notes);

    useEffect(() => {
        // Only sync from prop when the PROP itself changed (not local edits)
        if (notes !== prevNotesRef.current) {
            prevNotesRef.current = notes;
            setText(notes);
            setIsDirty(false);
        }
    }, [notes]);

    const handleChange = (e) => {
        setText(e.target.value);
        setIsDirty(true);
    };

    const handleSave = () => {
        if (onSave) onSave(text);
        setIsDirty(false);
    };

    return (
        <div className="h-full flex flex-col glass overflow-hidden relative group border border-white/5 bg-slate-900/30">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <StickyNote size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-300 tracking-wide uppercase">Notas Rápidas</span>
                </div>
                <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => { setText(''); setIsDirty(true); }}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Limpar"
                    >
                        <Eraser size={16} />
                    </button>
                    <button
                        onClick={handleSave}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Salvar (Ctrl+S)"
                    >
                        <Save size={16} />
                    </button>
                </div>
            </div>

            {/* Text Area */}
            <div className="flex-1 relative">
                <textarea
                    value={text}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        handleSave();
                    }}
                    placeholder="Digite suas ideias, lembretes ou insights aqui..."
                    className="w-full h-full bg-transparent resize-none p-4 text-slate-300 text-sm leading-relaxed focus:outline-none custom-scrollbar placeholder:text-slate-600"
                    spellCheck="false"
                />

                {/* Visual Glow */}
                <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            {/* Status Footer */}
            <div className="px-4 py-2 bg-black/40 text-[10px] text-slate-500 flex justify-between">
                <span>{text.length} caracteres</span>
                <span className={isFocused ? "text-yellow-500" : isDirty ? "text-orange-400" : "text-emerald-500"}>
                    {isFocused ? "Digitando..." : isDirty ? "Não salvo" : "Salvo"}
                </span>
            </div>
        </div>
    );
}
