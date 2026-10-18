This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/pages/Pomodoro.jsx, src/components/PomodoroTimer.jsx, src/components/pomodoro/**, src/hooks/usePomodoroSync.js, src/store/slices/createPomodoroSlice.js, src/utils/pomodoroHelpers.js, src/utils/audioAlert.js, src/utils/__tests__/pomodoro.regression.test.js
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  components/
    pomodoro/
      FocusPanel.jsx
      PomodoroClock.jsx
      PomodoroControls.jsx
      PomodoroHeader.jsx
      PomodoroProgress.jsx
    PomodoroTimer.jsx
  hooks/
    usePomodoroSync.js
  pages/
    Pomodoro.jsx
  store/
    slices/
      createPomodoroSlice.js
  utils/
    __tests__/
      pomodoro.regression.test.js
    audioAlert.js
    pomodoroHelpers.js
```

# Files

## File: src/components/pomodoro/PomodoroHeader.jsx
```javascript
import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Zap, AlertCircle, Target } from 'lucide-react';

export function PomodoroHeader({ mode, activeSubject }) {
    if (mode === 'break' || mode === 'long_break') {
        return (
            <Motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                aria-live="polite"
                className={`flex items-center justify-center gap-2.5 w-full rounded-2xl py-2.5 px-4 border shadow-md ${mode === 'long_break' ? 'bg-violet-900/50 border-violet-500/60 text-violet-100' : 'bg-emerald-900/50 border-emerald-500/60 text-emerald-100'}`}
            >
                <Zap size={18} className={mode === 'long_break' ? 'text-violet-300' : 'text-emerald-300'} />
                <span className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase">
                    {mode === 'long_break' ? 'Pausa Longa Ativa' : 'Recuperação Neural'}
                </span>
            </Motion.div>
        );
    }

    if (!activeSubject) {
        return (
            <div className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-xl py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                <Target size={15} className="text-indigo-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-indigo-300 truncate">Selecione uma missão no painel para focar</span>
            </div>
        );
    }

    // Garante que activeSubject é um objeto válido antes de prosseguir
    if (typeof activeSubject !== 'object') {
        return (
            <div className="w-full bg-red-950/30 border border-dashed border-red-500/40 rounded-2xl py-2 px-4 flex items-center justify-center gap-2 shadow-sm">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-red-300 truncate">Erro ao carregar missão. Selecione novamente.</span>
            </div>
        );
    }

    return null;
}

export default PomodoroHeader;
```

## File: src/utils/audioAlert.js
```javascript
/**
 * ============================================================================
 * WEB AUDIO API POMODORO ALARM SYNTHESIZER
 * ============================================================================
 * Generates harmonious chime alerts using the native Web Audio API.
 * Eliminates missing 404 audio file issues and handles browser autoplay policies.
 */

let audioCtx = null;

function getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch((err) => {
            console.warn('[AudioAlert] Falha ao retomar AudioContext:', err);
        });
    }

    return audioCtx;
}

export function playPomodoroAlarm(options = {}) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = options.notes || [587.33, 880, 1174.66]; // D5, A5, D6 harmonic chime
        const duration = options.duration || 0.35;
        const interval = options.interval || 0.12;

        notes.forEach((freq, index) => {
            const startTime = now + (index * interval);
            const stopTime = startTime + duration;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = options.waveType || 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Envelope: Attack, sustain, smooth exponential decay
            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(stopTime);
        });
    } catch (err) {
        console.warn('[AudioAlert] Web Audio playback failed:', err);
    }
}
```

## File: src/utils/pomodoroHelpers.js
```javascript
export const asArray = (value) =>
  Array.isArray(value) ? value : Object.values(value || {});

export const safeArray = (value) =>
  asArray(value).filter(Boolean);

export function normalizeCategories(rawCategories) {
  return safeArray(rawCategories).map(category => ({
    ...category,
    tasks: safeArray(category.tasks)
  }));
}

export function toPositiveMinutes(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    const fb = Number(fallback);
    if (!Number.isFinite(fb) || fb <= 0) return 25;
    return Math.min(240, Math.max(1, Math.round(fb)));
  }
  return Math.min(240, Math.max(1, Math.round(n)));
}

export function formatTime(seconds) {
  const safe = Number(seconds);
  if (!Number.isFinite(safe) || safe < 0) return '00:00';
  const secsInt = Math.ceil(safe);
  const mins = Math.floor(secsInt / 60);
  const secs = secsInt % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
```

## File: src/components/pomodoro/PomodoroClock.jsx
```javascript
import React from 'react';
import { formatTime } from '../../utils/pomodoroHelpers';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';

export function PomodoroClock({
    speed,
    setSpeed,
    isProtocolInactive,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    svgCircleRef,
    clockRef,
    isFullscreen,
    toggleFullscreen,
    isMuted,
    toggleMute
}) {
    return (
        <div className="w-full flex flex-col items-center">
            {/* Barra superior de controles do relógio */}
            <div className="w-full flex items-center justify-between gap-2 mb-1 sm:mb-1.5 relative z-30">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-colors ${mode === 'work' ? 'text-blue-300 font-extrabold drop-shadow' : 'text-white/40'}`}>
                        FOCO
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className={`text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-colors ${mode !== 'work' ? (mode === 'long_break' ? 'text-violet-300 font-extrabold drop-shadow' : 'text-emerald-300 font-extrabold drop-shadow') : 'text-white/40'}`}>
                        PAUSA
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Seletor de Velocidade */}
                    <div className="flex gap-1 bg-black/60 p-0.5 rounded-lg border border-[#3f2e26]/80 shadow-inner backdrop-blur-md">
                        {[1, 10, 100].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSpeed(s)}
                                aria-label={`Velocidade ${s}x`}
                                className={`px-2 sm:px-2.5 h-6 sm:h-7 rounded-md text-[11px] font-black transition-all ${speed === s ? 'bg-[#b08e6b] text-[#2d1a12] shadow-sm font-black' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            >
                                {s}X
                            </button>
                        ))}
                    </div>

                    {/* Botão Tela Cheia */}
                    {typeof toggleFullscreen === 'function' && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
                            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                        >
                            {isFullscreen ? <Minimize2 size={13} className="text-indigo-300" /> : <Maximize2 size={13} />}
                        </button>
                    )}

                    {/* Botão Mudo */}
                    {typeof toggleMute === 'function' && (
                        <button
                            type="button"
                            onClick={toggleMute}
                            className="p-1 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center bg-black/40 border border-white/10 hover:border-white/20 rounded-lg text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md"
                            title={isMuted ? "Ativar som" : "Silenciar alarme"}
                        >
                            {isMuted ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-emerald-400" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Mostrador SVG Circular com Dígitos de Destaque */}
            <div className="relative my-0 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 256 256" className="w-[min(50vw,12rem)] h-[min(50vw,12rem)] sm:w-44 sm:h-44 lg:w-[190px] lg:h-[190px] transform -rotate-90 relative z-10">
                    <circle cx="128" cy="128" r="110" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={mode === 'work' ? '#3b82f6' : (mode === 'long_break' ? '#a855f7' : '#22c55e')} />
                            <stop offset="100%" stopColor={mode === 'work' ? '#2563eb' : (mode === 'long_break' ? '#9333ea' : '#10b981')} />
                        </linearGradient>
                    </defs>
                    <circle
                        ref={svgCircleRef}
                        cx="128" cy="128" r="110" fill="none"
                        stroke="url(#timerGradient)"
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 110}
                        strokeDashoffset={2 * Math.PI * 110}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span 
                        ref={clockRef} 
                        className="text-3xl sm:text-4xl lg:text-[3.25rem] font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-none tabular-nums"
                        role="timer"
                        aria-live="polite"
                        aria-label={`Tempo restante: ${formatTime(timeLeft)}`}
                    >
                        {formatTime(timeLeft)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/90 drop-shadow mt-1 text-center px-2">
                        {isRunning
                            ? (mode === 'work' ? 'PROTOCOL Foco' : (mode === 'long_break' ? 'Pausa Longa' : 'Recuperação'))
                            : (isProtocolInactive
                                ? 'AGUARDANDO PROTOCOLO'
                                : (totalTime && timeLeft >= totalTime ? 'PRONTO PARA FOCO' : 'SESSÃO PAUSADA'))}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default PomodoroClock;
```

## File: src/utils/__tests__/pomodoro.regression.test.js
```javascript
import { describe, expect, it } from 'vitest';
import { createPomodoroSlice } from '../../store/slices/createPomodoroSlice';
import { formatTime } from '../pomodoroHelpers';
import { calculateStudyStreak, countPomodorosToday } from '../analytics';

describe('Pomodoro Slice - Skip and Phase Progression Regressions', () => {
  const createMockStore = () => {
    let state = {
      appState: {
        activeId: 'contest-1',
        contests: {
          'contest-1': {
            settings: { pomodoroWork: 25, pomodoroBreak: 5, longBreakAfter: 4 }
          }
        },
        pomodoro: {
          mode: 'work',
          sessions: 1,
          targetCycles: 2,
          completedCycles: 0,
          accumulatedMinutes: 0,
          isRunning: false,
          activeSubject: { taskId: 'task-1', task: 'Matemática', categoryId: 'cat-1' }
        }
      }
    };

    const set = (updater) => {
      if (typeof updater === 'function') {
        updater(state);
      } else {
        Object.assign(state, updater);
      }
    };

    const get = () => state;

    const slice = createPomodoroSlice(set, get);
    return { slice, getState: () => state };
  };

  it('permite pular (skip) a fase de foco sem conceder minutos mas avançando para pausa', () => {
    const { slice, getState } = createMockStore();

    // Pular manualmente com 0 minutos estudados
    slice.completePomodoroPhase(true, 0);

    const pomodoro = getState().appState.pomodoro;
    expect(pomodoro.mode).toBe('break');
    expect(pomodoro.completedCycles).toBe(1);
    expect(pomodoro.accumulatedMinutes).toBe(0);
  });

  it('permite pular com minutos parciais acumulados', () => {
    const { slice, getState } = createMockStore();

    slice.completePomodoroPhase(true, 10);

    const pomodoro = getState().appState.pomodoro;
    expect(pomodoro.mode).toBe('break');
    expect(pomodoro.completedCycles).toBe(1);
    expect(pomodoro.accumulatedMinutes).toBe(10);
  });

  it('conclui a série inteira quando atinge targetCycles', () => {
    const { slice, getState } = createMockStore();
    getState().appState.pomodoro.targetCycles = 1;

    // Completar naturalmente o único ciclo da meta
    slice.completePomodoroPhase(false);

    const pomodoro = getState().appState.pomodoro;
    expect(pomodoro.mode).toBe('work');
    expect(pomodoro.completedCycles).toBe(0);
    expect(pomodoro.sessions).toBe(1);
  });

  it('gerencia setPomodoroRunning corretamente', () => {
    const { slice, getState } = createMockStore();

    slice.setPomodoroRunning(true);
    expect(getState().appState.pomodoro.isRunning).toBe(true);

    slice.setPomodoroRunning(false);
    expect(getState().appState.pomodoro.isRunning).toBe(false);
  });
});

describe('Pomodoro Helpers - formatTime', () => {
  it('arredonda segundos restantes para cima (Math.ceil) para evitar pulo de 1s', () => {
    expect(formatTime(59.9)).toBe('01:00');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(0.5)).toBe('00:01');
    expect(formatTime(0)).toBe('00:00');
  });
});

describe('Pomodoro Analytics - Streak Persistence', () => {
  it('mantém streak ativo se o usuário estudou ontem mesmo sem ter estudado hoje', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString();

    const logs = [{ date: yesterdayIso, minutes: 25 }];
    const streak = calculateStudyStreak(logs);

    expect(streak.current).toBeGreaterThanOrEqual(1);
    expect(streak.isActive).toBe(true);
  });
});

describe('Pomodoro Slice - Unhydrated State Safety & Contest Switching', () => {
  it('setPomodoroActiveSubject não quebra quando pomodoro está undefined no store', () => {
    let state = {
      appState: {
        activeId: 'contest-1',
        pomodoro: undefined
      }
    };
    const set = (updater) => {
      if (typeof updater === 'function') updater(state);
      else Object.assign(state, updater);
    };
    const get = () => state;
    const slice = createPomodoroSlice(set, get);

    expect(() => slice.setPomodoroActiveSubject(null)).not.toThrow();
  });

  it('countPomodorosToday não duplica a contagem de ciclos já salvos em studyLogs', () => {
    const now = new Date().toISOString();
    // 2 ciclos de 25 min concluídos e já registrados nos logs
    const studyLogs = [
      { date: now, minutes: 25 },
      { date: now, minutes: 25 }
    ];

    // Com extraCompletedCycles = 0 (correção do bug)
    const count = countPomodorosToday(studyLogs, 25, 0);
    expect(count).toBe(2);

    // Se extraCompletedCycles fosse erroneamente passado como 2, o resultado seria 4 (bug corrigido)
    const countWithBug = countPomodorosToday(studyLogs, 25, 2);
    expect(countWithBug).toBe(4);
  });
});

describe('Pomodoro Regressions - Multi-tab, Speed Recalculation & Structured endsAt', () => {
  it('reseta isRunning e limpa endsAt ao trocar para nova sessão ativa', () => {
    let removedKey = null;
    globalThis.localStorage = {
      removeItem: (k) => { removedKey = k; },
      getItem: () => null,
      setItem: () => {}
    };

    let state = {
      appState: {
        activeId: 'contest-1',
        pomodoro: {
          isRunning: true,
          activeSubject: { taskId: 'task-old', sessionInstanceId: 'inst-1' }
        }
      }
    };
    const set = (updater) => {
      if (typeof updater === 'function') updater(state);
      else Object.assign(state, updater);
    };
    const get = () => state;
    const slice = createPomodoroSlice(set, get);

    slice.setPomodoroActiveSubject({ taskId: 'task-new', sessionInstanceId: 'inst-2' });

    expect(state.appState.pomodoro.isRunning).toBe(false);
    expect(state.appState.pomodoro.activeSubject.taskId).toBe('task-new');
    expect(removedKey).toBe('pomodoro-endsAt');
  });

  it('recalcula endsAt corretamente na mudança de velocidade sem inflar o cronômetro', () => {
    const currentLeft = 1200; // 20 minutos restantes
    const parsedSpeed = 2; // alterado para velocidade 2x
    const now = 1000000;
    
    // Cálculo corrigido: agora + (segundos restantes * 1000) / velocidade
    const calculatedEndsAt = now + (currentLeft * 1000) / parsedSpeed;
    
    // O tempo real de relógio restante deve ser 600 segundos (10 minutos reais a 2x)
    expect(calculatedEndsAt - now).toBe(600 * 1000);
  });

  it('valida payload estruturado de endsAt isolando por taskId e sessionInstanceId', () => {
    const parseStoredEndsAt = (raw, expectedTaskId, expectedSessionId) => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          if (expectedTaskId && parsed.taskId && parsed.taskId !== expectedTaskId) return null;
          if (expectedSessionId && parsed.sessionInstanceId && parsed.sessionInstanceId !== expectedSessionId) return null;
          return Number(parsed.endsAt);
        }
        return Number(parsed);
      } catch {
        return Number(raw);
      }
    };

    const validPayload = JSON.stringify({ endsAt: 1700000000000, taskId: 'task-1', sessionInstanceId: 'sess-1' });
    const wrongTaskPayload = JSON.stringify({ endsAt: 1700000000000, taskId: 'task-2', sessionInstanceId: 'sess-1' });
    const legacyPayload = '1700000000000';

    expect(parseStoredEndsAt(validPayload, 'task-1', 'sess-1')).toBe(1700000000000);
    expect(parseStoredEndsAt(wrongTaskPayload, 'task-1', 'sess-1')).toBeNull();
    expect(parseStoredEndsAt(legacyPayload, 'task-1', 'sess-1')).toBe(1700000000000);
  });
});
```

## File: src/components/pomodoro/PomodoroControls.jsx
```javascript
import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export function PomodoroControls({
    isProtocolInactive,
    isRunning,
    onReset,
    onTogglePlay,
    onSkip
}) {
    return (
        <div className="flex items-center justify-center gap-3.5 sm:gap-5 z-10 mt-1 sm:mt-1.5 w-full max-w-sm px-4">
            {/* Botão Voltar/Reiniciar */}
            <div className="flex flex-col items-center gap-0.5">
                <button 
                    type="button" 
                    onClick={onReset} 
                    disabled={isProtocolInactive} 
                    aria-label="Reiniciar cronômetro"
                    title="Reiniciar"
                    className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/10 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:from-stone-700 hover:to-stone-800 active:scale-95 transition-all"
                >
                    <RotateCcw size={15} />
                </button>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">VOLTAR</span>
            </div>

            {/* Botão Play / Pause */}
            <div className="flex flex-col items-center justify-center">
                <button
                    type="button"
                    onClick={onTogglePlay}
                    aria-label={isRunning ? 'Pausar' : 'Iniciar'}
                    aria-pressed={isRunning}
                    title={isRunning ? 'Pausar' : (isProtocolInactive ? 'Iniciar Estudo Livre' : 'Iniciar')}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-200 active:scale-95 shadow-2xl ${isRunning ? 'bg-stone-100 text-black border-white hover:bg-stone-200' : 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:bg-emerald-400'}`}
                >
                    {isRunning ? <Pause size={24} className="sm:w-6 sm:h-6" /> : <Play size={24} className="sm:w-6 sm:h-6 ml-0.5" />}
                </button>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest mt-0.5">
                    {isRunning ? 'PAUSAR' : 'INICIAR'}
                </span>
            </div>

            {/* Botão Pular */}
            <div className="flex flex-col items-center gap-0.5">
                <button 
                    type="button" 
                    onClick={onSkip} 
                    disabled={isProtocolInactive} 
                    aria-label="Pular fase"
                    title="Pular"
                    className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 border border-white/10 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:from-stone-700 hover:to-stone-800"
                >
                    <SkipForward size={15} />
                </button>
                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">PULAR</span>
            </div>
        </div>
    );
}

export default PomodoroControls;
```

## File: src/components/pomodoro/PomodoroProgress.jsx
```javascript
import React from 'react';
import { Minus, Plus, Layers } from 'lucide-react';

export function PomodoroProgress({
    targetCycles,
    completedCycles,
    setTargetCycles,
    syncChannel,
    STABLE_TAB_ID,
    activeSubject,
    workFillsRef,
    breakBallsRef,
    mode = 'work',
    timeLeft = 0,
    totalTime = 25 * 60
}) {
    const safeTargetCycles = Math.min(20, Math.max(1, Math.round(Number(targetCycles) || 1)));
    const safeCompletedCycles = Math.min(safeTargetCycles, Math.max(0, Math.round(Number(completedCycles) || 0)));

    return (
        <div className="w-full rounded-2xl border-2 border-[#94785a] bg-[#b08e6b] px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-1.5">
                {/* Header: Title & Cycle Stepper */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-[#2d1a12]/80" />
                        <h3 className="text-xs sm:text-[13px] font-black text-[#2d1a12]/90 uppercase tracking-[0.2em]">
                            Progresso dos Ciclos
                        </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#2d1a12]">
                        <button
                            type="button"
                            onClick={() => {
                                const minAllowed = Math.max(1, safeCompletedCycles);
                                const newTarget = Math.max(minAllowed, safeTargetCycles - 1);
                                if (typeof setTargetCycles === 'function') {
                                    setTargetCycles(newTarget);
                                }
                                try {
                                    if (syncChannel && typeof syncChannel.postMessage === 'function') {
                                        syncChannel.postMessage({
                                            type: 'TARGET_CYCLES_CHANGE',
                                            targetCycles: newTarget,
                                            tabId: STABLE_TAB_ID,
                                            taskId: activeSubject?.taskId || null,
                                            sessionInstanceId: activeSubject?.sessionInstanceId || null
                                        });
                                    }
                                } catch (err) {
                                    console.warn('[PomodoroProgress] Falha ao sincronizar:', err);
                                }
                            }}
                            disabled={safeTargetCycles <= Math.max(1, safeCompletedCycles)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Reduzir meta de ciclos"
                        >
                            <Minus size={13} className="stroke-[3]" />
                        </button>

                        <div className="flex items-baseline gap-1 px-2 py-0.5 rounded-lg bg-[#2d1a12]/10 border border-[#2d1a12]/15 text-xs sm:text-sm font-black tabular-nums shadow-inner">
                            <span className="text-[#2d1a12] font-black">{safeCompletedCycles}</span>
                            <span className="text-[#2d1a12]/40 text-[10px] font-bold">/</span>
                            <span className="text-[#2d1a12]/80 text-[10px] font-bold">{safeTargetCycles}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const newTarget = Math.min(20, safeTargetCycles + 1);
                                if (typeof setTargetCycles === 'function') {
                                    setTargetCycles(newTarget);
                                }
                                try {
                                    if (syncChannel && typeof syncChannel.postMessage === 'function') {
                                        syncChannel.postMessage({
                                            type: 'TARGET_CYCLES_CHANGE',
                                            targetCycles: newTarget,
                                            tabId: STABLE_TAB_ID,
                                            taskId: activeSubject?.taskId || null,
                                            sessionInstanceId: activeSubject?.sessionInstanceId || null
                                        });
                                    }
                                } catch (err) {
                                    console.warn('[PomodoroProgress] Falha ao sincronizar:', err);
                                }
                            }}
                            disabled={safeTargetCycles >= 20}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2d1a12]/10 hover:bg-[#2d1a12]/20 active:scale-95 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-[#2d1a12]/20 shadow-inner"
                            title="Aumentar meta de ciclos"
                        >
                            <Plus size={13} className="stroke-[3]" />
                        </button>
                    </div>
                </div>

                {/* Progress Indicators Track - Barras e Bolinhas Maiores */}
                <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
                    {Array.from({ length: safeTargetCycles }).map((_, i) => {
                        let workWidth = '0%';
                        let breakHeight = '0%';

                        const progressPct = (Number.isFinite(totalTime) && totalTime > 0)
                            ? Math.max(0, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100))
                            : 0;

                        if (mode === 'work') {
                            if (i < safeCompletedCycles) {
                                workWidth = '100%';
                                breakHeight = '100%';
                            } else if (i === safeCompletedCycles) {
                                workWidth = `${progressPct}%`;
                                breakHeight = '0%';
                            } else {
                                workWidth = '0%';
                                breakHeight = '0%';
                            }
                        } else {
                            if (i < safeCompletedCycles - 1) {
                                workWidth = '100%';
                                breakHeight = '100%';
                            } else if (i === safeCompletedCycles - 1) {
                                workWidth = '100%';
                                breakHeight = `${progressPct}%`;
                            } else {
                                workWidth = '0%';
                                breakHeight = '0%';
                            }
                        }

                        return (
                            <React.Fragment key={i}>
                                {/* Barra de Progresso do Foco (Maior e com mais destaque) */}
                                <div className="flex-1 h-3.5 sm:h-4 bg-[#2d1a12]/20 rounded-full overflow-hidden border-2 border-[#2d1a12]/25 shadow-inner">
                                    <div
                                        ref={el => {
                                            if (workFillsRef?.current && Array.isArray(workFillsRef.current)) {
                                                workFillsRef.current[i] = el || undefined;
                                            }
                                        }}
                                        style={{ width: workWidth }}
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-sm"
                                    />
                                </div>

                                {/* Bolinha Verde de Pausa (Maior e com Glow) */}
                                {i < safeTargetCycles - 1 && (
                                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#2d1a12]/20 border-2 border-[#2d1a12]/35 overflow-hidden shrink-0 shadow-md">
                                        <div
                                            ref={el => {
                                                if (breakBallsRef?.current && Array.isArray(breakBallsRef.current)) {
                                                    breakBallsRef.current[i] = el || undefined;
                                                }
                                            }}
                                            style={{ height: breakHeight }}
                                            className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default PomodoroProgress;
```

## File: src/components/pomodoro/FocusPanel.jsx
```javascript
/**
 * ============================================================================
 * FOCUS PANEL - Painel de Foco e Telemetria da Sessão
 * ============================================================================
 * Exibe informações detalhadas sobre a sessão ativa e telemetria:
 * - Status e progresso da sessão em tempo real
 * - Progresso dos ciclos Pomodoro
 * - Estatísticas da matéria em simulados (média, tendência)
 * - Tempo de estudo hoje (nesta matéria e total)
 * - Sequência (streak) e consistência diária
 * - Gamificação: Nível e XP
 * - Próxima tarefa prioritária
 * - Métricas expandidas de foco e meta
 * ============================================================================
 */
import React, { useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    Target, Clock, Trophy, TrendingUp, TrendingDown,
    Minus, Zap, Brain, BookOpen, CheckCircle2,
    Flame, Award, ChevronDown, ChevronUp, Activity, Coffee
} from 'lucide-react';
import { calculateStudyStreak } from '../../utils/analytics';
import { getDateKey } from '../../utils/dateHelper';

// ============================================================================
// SUBCOMPONENTE: Status da Sessão Atual
// ============================================================================
function SessionStatus({ isRunning, timeLeft, totalTime, mode }) {
    const safeTotal = Number.isFinite(totalTime) && totalTime > 0 ? totalTime : 25 * 60;
    const safeLeft = Number.isFinite(timeLeft) && timeLeft >= 0 ? timeLeft : safeTotal;
    const progress = Math.max(0, Math.min(100, ((safeTotal - safeLeft) / safeTotal) * 100));

    const statusConfig = {
        work: {
            dotClass: 'bg-emerald-400',
            barClass: 'bg-emerald-500',
            label: 'Em Foco',
            icon: Brain
        },
        break: {
            dotClass: 'bg-amber-400',
            barClass: 'bg-amber-500',
            label: 'Pausa Curta',
            icon: Coffee
        },
        long_break: {
            dotClass: 'bg-violet-400',
            barClass: 'bg-violet-500',
            label: 'Pausa Longa',
            icon: Coffee
        }
    };

    const config = statusConfig[mode] || statusConfig.work;
    const IconComponent = config.icon;

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-white/5 shadow-md">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? `${config.dotClass} animate-pulse` : 'bg-slate-500'}`} />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <IconComponent size={13} className="text-slate-400" />
                        {config.label}
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                    {Math.round(progress)}%
                </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <Motion.div
                    className={`h-full rounded-full ${config.barClass}`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-400">
                <span>Início da etapa</span>
                <span>{Math.round(100 - progress)}% restante</span>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Estatísticas da Matéria
// ============================================================================
function SubjectStats({ category, maxScore = 100 }) {
    const stats = useMemo(() => {
        if (!category?.simuladoStats?.history) return null;

        const rawHistory = category.simuladoStats.history;
        const history = Array.isArray(rawHistory)
            ? rawHistory
            : Object.values(rawHistory || {});

        if (!history.length) return null;

        const scores = history
            .map(h => Number(h?.score ?? h?.accuracy))
            .filter(s => Number.isFinite(s));

        if (!scores.length) return null;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const last = scores[scores.length - 1];
        const trend = scores.length >= 2 ? last - scores[scores.length - 2] : 0;
        const minScore = Number(category?.minScore) || 0;
        const scoreRange = Math.max(1e-9, maxScore - minScore);
        const accuracy = Math.min(100, Math.max(0, ((avg - minScore) / scoreRange) * 100));

        return { avg, last, trend, accuracy, count: scores.length };
    }, [category, maxScore]);

    if (!stats) return null;

    const trendIcon = stats.trend > 0.5
        ? <TrendingUp size={14} className="text-emerald-400" />
        : stats.trend < -0.5
            ? <TrendingDown size={14} className="text-rose-400" />
            : <Minus size={14} className="text-slate-400" />;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <BookOpen size={14} className="text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Stats da Matéria
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                    <div className="text-lg font-black text-white">{Math.round(stats.accuracy)}%</div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Média</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-black text-white">{stats.count}</div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Simulados</div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <div className="flex items-center gap-1">
                        {trendIcon}
                        <span className="text-lg font-black text-white">
                            {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}
                        </span>
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Tendência</div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Streak e Consistência
// ============================================================================
function StreakDisplay({ studyLogs }) {
    const streak = useMemo(() => {
        const res = calculateStudyStreak(studyLogs || []);
        return {
            current: res.current || 0,
            best: res.best || res.longest || 0,
            isActive: Boolean(res.isActive)
        };
    }, [studyLogs]);

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flame size={16} className={streak.isActive ? 'text-orange-400' : 'text-slate-500'} />
                    <span className="text-xs font-bold text-slate-300">Sequência</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-2xl font-black ${streak.isActive ? 'text-orange-400' : 'text-slate-400'}`}>
                        {streak.current}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">dias</span>
                </div>
            </div>
            {streak.isActive && streak.current >= 2 && (
                <div className="mt-2 text-[10px] text-orange-300/80 flex items-center gap-1 font-medium">
                    <Flame size={10} />
                    {streak.current} dias consecutivos de foco! Recorde: {streak.best}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Progresso do Ciclo Pomodoro
// ============================================================================
function PomodoroCycleProgress({ targetCycles, completedCycles, mode }) {
    const safeTarget = Math.max(1, Number(targetCycles) || 1);
    const safeCompleted = Math.max(0, Math.min(safeTarget, Number(completedCycles) || 0));

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Ciclo Pomodoro
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-300">
                    {safeCompleted}/{safeTarget}
                </span>
            </div>
            <div className="flex gap-1.5 w-full overflow-hidden">
                {Array.from({ length: safeTarget }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 min-w-0 ${
                            i < safeCompleted
                                ? 'bg-blue-500 shadow-sm'
                                : i === safeCompleted && mode === 'work'
                                    ? 'bg-blue-500/40 animate-pulse'
                                    : 'bg-slate-700/50'
                        }`}
                    />
                ))}
            </div>
            {mode === 'break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <Coffee size={10} />
                    Pausa ativa — respire e descanse!
                </div>
            )}
            {mode === 'long_break' && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-violet-400 font-medium">
                    <Coffee size={10} />
                    Pausa longa — recuperação profunda
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Tempo de Estudo Hoje
// ============================================================================
function TodayStudyTime({ studyLogs, categoryId }) {
    const todayData = useMemo(() => {
        const todayKey = getDateKey(new Date());

        const safeLogs = Array.isArray(studyLogs) ? studyLogs : Object.values(studyLogs || {});
        const todayLogs = safeLogs.filter(log => {
            if (!log || !log.date) return false;
            return getDateKey(log.date) === todayKey;
        });

        const totalMinutes = todayLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
        const categoryMinutes = categoryId
            ? todayLogs
                .filter(log => log.categoryId === categoryId)
                .reduce((acc, log) => acc + (Number(log.minutes) || 0), 0)
            : 0;
        const sessionCount = todayLogs.length;

        return { totalMinutes, categoryMinutes, sessionCount };
    }, [studyLogs, categoryId]);

    const formatTime = (minutes) => {
        const total = Math.max(0, Math.round(Number(minutes) || 0));
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Hoje
                </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <div className="text-lg font-black text-white">
                        {formatTime(todayData.categoryMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Nesta matéria</div>
                </div>
                <div>
                    <div className="text-lg font-black text-white">
                        {formatTime(todayData.totalMinutes)}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase font-medium">Total geral</div>
                </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 font-medium">
                {todayData.sessionCount} {todayData.sessionCount === 1 ? 'sessão registrada hoje' : 'sessões registradas hoje'}
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: XP e Nível
// ============================================================================
function SessionXP({ user }) {
    const xpProgress = useMemo(() => {
        if (!user) return null;
        const xp = Math.max(0, Number(user.xp) || 0);
        const level = Math.floor(Math.sqrt(xp / 100)) + 1;
        const currentLevelXP = Math.pow(level - 1, 2) * 100;
        const nextLevelXP = Math.pow(level, 2) * 100;
        const diff = nextLevelXP - currentLevelXP;
        const progress = diff > 0
            ? ((xp - currentLevelXP) / diff) * 100
            : 0;
        return { level, progress: Math.min(100, Math.max(0, progress)), xp };
    }, [user]);

    if (!xpProgress) return null;

    return (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Award size={14} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Nível {xpProgress.level}
                    </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">{xpProgress.xp} XP</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <Motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                    animate={{ width: `${xpProgress.progress}%` }}
                />
            </div>
            <div className="mt-1 text-right text-[9px] text-slate-500 font-medium">
                {Math.round(xpProgress.progress)}% para o próximo nível
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTE: Próxima Tarefa
// ============================================================================
function NextTaskPreview({ categories, currentTaskId }) {
    let nextTask = null;
    if (categories) {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories);
        // Prioridade 1: Tarefas de alta prioridade não concluídas
        for (const cat of safeCats) {
            if (!cat) continue;
            const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            for (const task of tasks) {
                if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'high') {
                    nextTask = { ...task, catName: cat.name };
                    break;
                }
            }
            if (nextTask) break;
        }

        // Prioridade 2: Tarefas de média prioridade não concluídas caso não haja alta
        if (!nextTask) {
            for (const cat of safeCats) {
                if (!cat) continue;
                const tasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                for (const task of tasks) {
                    if (task && !task.completed && (task.id || task.text) !== currentTaskId && task.priority === 'medium') {
                        nextTask = { ...task, catName: cat.name };
                        break;
                    }
                }
                if (nextTask) break;
            }
        }
    }

    if (!nextTask) return null;

    const isHighPriority = nextTask.priority === 'high';

    return (
        <div className="bg-slate-800/30 rounded-xl p-3 border border-dashed border-white/10">
            <div className="flex items-center gap-2 mb-1">
                <Target size={12} className={isHighPriority ? 'text-rose-400' : 'text-slate-500'} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isHighPriority ? 'Próxima Tarefa Crítica' : 'Próxima Tarefa'}
                </span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
                {nextTask.title || nextTask.text || 'Próxima atividade'}
            </div>
            {nextTask.catName && (
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{nextTask.catName}</div>
            )}
        </div>
    );
}

// ============================================================================
// FOCUS PANEL PRINCIPAL (Visualização de Telemetria e Foco da Sessão)
// ============================================================================
export function SessionFocusPanel({
    activeSubject,
    categories,
    studyLogs,
    user,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    targetCycles,
    completedCycles,
    settings
}) {
    const [showMoreStats, setShowMoreStats] = useState(false);

    const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
    const currentCategory = activeSubject ? safeCats.find(c => c && (c.id === activeSubject.categoryId || (activeSubject.category && c.name === activeSubject.category))) : null;

    return (
        <div className="w-full flex flex-col gap-3.5" role="complementary" aria-label="Painel de telemetria da sessão">
            {/* Header do Foco Ativo */}
            {activeSubject ? (
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <Zap size={16} className="text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-black text-white truncate" title={activeSubject.task || 'Sessão de Estudo'}>
                                {activeSubject.task || 'Sessão de Estudo'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{activeSubject.category || 'Geral'}</p>
                        </div>
                    </div>
                    {activeSubject.priority && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            activeSubject.priority === 'high'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : activeSubject.priority === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                            {activeSubject.priority === 'high' ? 'Alta' : activeSubject.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                    )}
                </div>
            ) : (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center">
                    <p className="text-xs font-bold text-indigo-300">Telemetria em Espera</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Selecione uma matéria ou tarefa para iniciar o rastreamento em tempo real.</p>
                </div>
            )}

            {/* Status da Sessão */}
            <SessionStatus
                activeSubject={activeSubject}
                isRunning={isRunning}
                timeLeft={timeLeft}
                totalTime={totalTime}
                mode={mode}
            />

            {/* Progresso do Ciclo */}
            <PomodoroCycleProgress
                targetCycles={targetCycles}
                completedCycles={completedCycles}
                mode={mode}
            />

            {/* Stats da Matéria */}
            {currentCategory && (
                <SubjectStats category={currentCategory} />
            )}

            {/* Tempo de Estudo Hoje */}
            <TodayStudyTime
                studyLogs={studyLogs || []}
                categoryId={activeSubject?.categoryId || currentCategory?.id}
            />

            {/* Streak */}
            <StreakDisplay studyLogs={studyLogs || []} />

            {/* XP */}
            <SessionXP user={user} />

            {/* Próxima Tarefa */}
            <NextTaskPreview
                categories={categories}
                currentTaskId={activeSubject?.taskId}
            />

            {/* Botão para mais stats */}
            <button
                type="button"
                onClick={() => setShowMoreStats(!showMoreStats)}
                className="flex items-center justify-center gap-2 p-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
            >
                {showMoreStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showMoreStats ? 'Menos detalhes' : 'Mais detalhes'}
            </button>

            {/* Stats Expandidas */}
            <AnimatePresence>
                {showMoreStats && (
                    <Motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 space-y-2">
                            <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Progresso Geral
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white">
                                            {completedCycles * (Math.max(1, Number(settings?.pomodoroWork) || 25))}min
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase font-medium">Foco total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-black text-white">
                                            {Math.round((completedCycles / Math.max(1, targetCycles || 1)) * 100)}%
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase font-medium">Meta</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionFocusPanel;
```

## File: src/hooks/usePomodoroSync.js
```javascript
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const formatTime = (seconds) => {
    const secsInt = Math.ceil(Math.max(0, seconds));
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;

    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const SESSION_SCOPED_TYPES = [
    'START_SESSION',
    'PAUSE_SESSION',
    'TIMER_RESET',
    'PHASE_SKIP',
    'PHASE_COMPLETE',
    'PHASE_REWIND',
    'TARGET_CYCLES_CHANGE'
];

const MAX_TARGET_CYCLES = 20;

export function usePomodoroSync({
    syncChannel,
    STABLE_TAB_ID,
    setIsRunning,
    stateRefs,
    setTimeLeft,
    showToast,
    setSpeed,
    speedRef,
    activeSubjectRef,
    clockRef,
    setIsMuted,
    isMutedRef,
    endsAtRef
}) {
    const syncPomodoroState = useAppStore(state => state.syncPomodoroState);

    useEffect(() => {
        if (!syncChannel || typeof syncChannel.addEventListener !== 'function') return;

        let isMounted = true;

        const handleMessage = (event) => {
            if (!isMounted) return;
            const data = event.data;
            // ✅ FIX: Validar estrutura da mensagem antes de processar
            if (!data || typeof data !== 'object' || !data.type) return;
            const KNOWN_TYPES = [
                'START_SESSION', 'PAUSE_SESSION', 'TIMER_RESET',
                'PHASE_SKIP', 'PHASE_COMPLETE', 'PHASE_REWIND',
                'TARGET_CYCLES_CHANGE', 'SPEED_CHANGE', 'TOGGLE_MUTE'
            ];
            if (!KNOWN_TYPES.includes(data.type)) return;

            const {
                type,
                tabId,
                taskId,
                sessionInstanceId,
                timeLeft: incomingTime,
                speed: incomingSpeed,
                targetCycles: incomingTarget
            } = data;

            if (tabId === STABLE_TAB_ID) return;


            if (SESSION_SCOPED_TYPES.includes(type)) {
                const currentTaskId = activeSubjectRef.current?.taskId ?? null;
                const currentSessionId = activeSubjectRef.current?.sessionInstanceId ?? null;

                // Se a mensagem tem taskId E nós temos taskId, devem bater
                if (taskId != null && currentTaskId != null && taskId !== currentTaskId) {
                    return;
                }
                // Se a mensagem tem sessionInstanceId E nós temos, devem bater
                if (sessionInstanceId != null && currentSessionId != null && sessionInstanceId !== currentSessionId) {
                    return;
                }
                // Se a mensagem tem sessionInstanceId mas nós NÃO temos sessão ativa, ignorar
                // EXCETO para START_SESSION, que notifica a aba que o protocolo foi ativado
                if (type !== 'START_SESSION' && sessionInstanceId != null && currentSessionId == null) {
                    return;
                }
            }

            switch (type) {
                case 'START_SESSION': {
                    if (data.speed && [1, 10, 100].includes(Number(data.speed))) {
                        const s = Number(data.speed);
                        setSpeed(s);
                        if (speedRef) speedRef.current = s;
                    }

                    setIsRunning(true);
                    stateRefs.current.isRunning = true;
                    syncPomodoroState({ isRunning: true });

                    if (Number.isFinite(incomingTime) && incomingTime >= 0 && incomingTime <= 24 * 3600) {
                        stateRefs.current.timeLeft = incomingTime;
                        setTimeLeft(incomingTime);
                    }

                    const incomingEndsAt = Number(data.endsAt);
                    if (endsAtRef) {
                        if (Number.isFinite(incomingEndsAt) && incomingEndsAt > Date.now()) {
                            endsAtRef.current = incomingEndsAt;
                        } else if (Number.isFinite(incomingTime) && incomingTime > 0 && incomingTime <= 24 * 3600) {
                            const currentSpeed = speedRef?.current || 1;
                            endsAtRef.current = Date.now() + (incomingTime * 1000) / currentSpeed;
                        }
                        try {
                            if (endsAtRef.current) {
                                localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                                    endsAt: endsAtRef.current,
                                    taskId: activeSubjectRef.current?.taskId || null,
                                    sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
                                }));
                            }
                        } catch { /* ignore */ }
                    }

                    showToast('Protocolo ativo em outra aba 🖥️', 'info');
                    break;
                }

                case 'PAUSE_SESSION': {
                    if (endsAtRef) endsAtRef.current = null;
                    try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                    syncPomodoroState({ isRunning: false });

                    if (Number.isFinite(incomingTime) && incomingTime >= 0 && incomingTime <= 24 * 3600) {
                        setTimeLeft(incomingTime);
                        stateRefs.current.timeLeft = incomingTime;
                    }
                    break;
                }

                case 'SPEED_CHANGE': {
                    const parsedSpeed = Number(incomingSpeed);

                    if ([1, 10, 100].includes(parsedSpeed)) {
                        setSpeed(parsedSpeed);
                        speedRef.current = parsedSpeed;

                        if (stateRefs.current?.isRunning && endsAtRef?.current) {
                            const currentLeft = Number(stateRefs.current?.timeLeft) || 0;
                            endsAtRef.current = Date.now() + (currentLeft * 1000) / parsedSpeed;
                            try {
                                localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                                    endsAt: endsAtRef.current,
                                    taskId: activeSubjectRef.current?.taskId || null,
                                    sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
                                }));
                            } catch { /* ignore */ }
                        }
                    }
                    break;
                }

                case 'TARGET_CYCLES_CHANGE': {
                    if (Number.isFinite(incomingTarget)) {
                        const currentCompleted =
                            useAppStore.getState().appState?.pomodoro?.completedCycles || 0;

                        const safeTarget = Math.min(
                            MAX_TARGET_CYCLES,
                            Math.max(
                                Math.max(1, currentCompleted),
                                Math.round(Number(incomingTarget))
                            )
                        );

                        syncPomodoroState({ targetCycles: safeTarget });
                    }
                    break;
                }

                case 'TIMER_RESET':
                case 'PHASE_SKIP':
                case 'PHASE_COMPLETE':
                case 'PHASE_REWIND': {
                    if (endsAtRef) endsAtRef.current = null;
                    try { localStorage.removeItem('pomodoro-endsAt'); } catch { /* ignore */ }
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;

                    try {
                        const raw = localStorage.getItem('pomodoroState');
                        if (!raw) break;
                        const saved = JSON.parse(raw);
                        if (!saved || typeof saved !== 'object') break;

                        const targetMode =
                            data.toMode !== undefined && typeof data.toMode === 'string'
                                ? data.toMode
                                : (typeof saved.mode === 'string' ? saved.mode : undefined);

                        const targetTime =
                            data.timeLeft !== undefined && Number.isFinite(data.timeLeft)
                                ? data.timeLeft
                                : (Number.isFinite(saved.timeLeft) ? saved.timeLeft : undefined);

                        const savedTaskMatches =
                            saved &&
                            activeSubjectRef.current?.taskId &&
                            saved.activeTaskId === activeSubjectRef.current.taskId;

                        if (targetMode !== undefined || savedTaskMatches) {
                            const newSessions = data.sessions !== undefined ? data.sessions : saved.sessions;
                            const newCompleted = data.completedCycles !== undefined ? data.completedCycles : saved.completedCycles;
                            const newAccum = data.accumulatedMinutes !== undefined ? data.accumulatedMinutes : saved.accumulatedMinutes;
                            const newTarget = data.targetCycles !== undefined ? data.targetCycles : saved.targetCycles;

                            syncPomodoroState({
                                mode: targetMode,
                                sessions: newSessions,
                                completedCycles: newCompleted,
                                accumulatedMinutes: newAccum,
                                targetCycles: newTarget,
                                isRunning: false
                            });

                            if (Number.isFinite(targetTime) && targetTime >= 0) {
                                setTimeLeft(targetTime);
                                stateRefs.current.timeLeft = targetTime;
                            }

                            if (targetMode !== undefined) {
                                stateRefs.current.mode = targetMode;
                            }
                            if (newSessions !== undefined) {
                                stateRefs.current.sessions = newSessions;
                            }
                            if (newCompleted !== undefined) {
                                stateRefs.current.completedCycles = newCompleted;
                            }
                            if (newAccum !== undefined) {
                                stateRefs.current.accumulatedMinutes = newAccum;
                            }
                            if (newTarget !== undefined) {
                                stateRefs.current.targetCycles = newTarget;
                            }

                            if (clockRef.current && Number.isFinite(targetTime)) {
                                clockRef.current.textContent = formatTime(targetTime);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to sync state from localStorage:', error);
                    }

                    break;
                }

                case 'TOGGLE_MUTE': {
                    if (!isMounted) break;
                    const muted = Boolean(data.isMuted);

                    setIsMuted(muted);
                    isMutedRef.current = muted;
                    break;
                }

                default:
                    break;
            }
        };

        syncChannel.addEventListener('message', handleMessage);

        return () => {
            isMounted = false;
            try {
                syncChannel?.removeEventListener?.('message', handleMessage);
            } catch { /* ignore */ }
        };
    }, [
        syncChannel,
        showToast,
        syncPomodoroState,
        STABLE_TAB_ID,
        setIsRunning,
        stateRefs,
        setTimeLeft,
        setSpeed,
        speedRef,
        activeSubjectRef,
        clockRef,
        setIsMuted,
        isMutedRef,
        endsAtRef
    ]);
}
```

## File: src/store/slices/createPomodoroSlice.js
```javascript
import { cleanTaskTitle } from '../../utils/taskTitleHelper.js';
import { markStorageDirty } from '../../utils/storageSafe.js';

const extractCategoryFromTask = (task) => {
    if (!task) return 'Geral';

    if (task.catName) return task.catName;
    if (task.category) return task.category;

    const t = task.text || task.title || '';
    const idx = t.indexOf(':');

    if (idx > -1) {
        const cat = t.substring(0, idx).trim();
        return cat || 'Geral';
    }

    return 'Geral';
};

const formatTaskName = (task) => {
    const rawName = task?.text || task?.title || '';
    const cat = extractCategoryFromTask(task);

    // BUG-07 FIX: Fallback para task sem nome — evita Pomodoro com timer sem contexto
    return cleanTaskTitle(rawName, cat) || cat || 'Sessão de Estudo';
};

export const createPomodoroSlice = (set, get) => ({
    resetPomodoroProgress: () => {
        set((state) => {
            const p = state.appState?.pomodoro;

            if (!p) return;

            p.accumulatedMinutes = 0;
            p.completedCycles = 0;
            p.mode = 'work';
            p.isRunning = false;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroRunning: (isRunning) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.isRunning = Boolean(isRunning);
            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroActiveSubject: (subject) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;

            if (!subject) {
                p.sessions = 1;
                p.completedCycles = 0;
                p.mode = 'work';
                p.accumulatedMinutes = 0;
                p.activeSubject = null;
                p.neuralMode = false;
                p.neuralQueue = [];
                p.isRunning = false;

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                markStorageDirty();
                return;
            }

            const current = p.activeSubject;

            const isNewSession =
                !current ||
                !subject.sessionInstanceId ||
                current.sessionInstanceId !== subject.sessionInstanceId;

            if (isNewSession) {
                p.sessions = 1;
                p.completedCycles = 0;
                p.mode = 'work';
                p.accumulatedMinutes = 0;
                p.isRunning = false;
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.removeItem('pomodoro-endsAt');
                    }
                } catch { /* ignore */ }
            }

            if (subject.source !== 'neural_core') {
                p.neuralMode = false;
                p.neuralQueue = [];
            }

            p.activeSubject = subject;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    startPomodoroSession: (subject) => {
        get().setPomodoroActiveSubject({
            ...subject,
            sessionInstanceId: Date.now().toString()
        });
    },

    setPomodoroSessions: (count) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.sessions = count;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroTargetCycles: (target) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            const normalizedTarget = Math.max(1, Number(target) || 1);

            p.targetCycles = normalizedTarget;
            p.completedCycles = Math.min(normalizedTarget, Math.max(0, p.completedCycles || 0));

            if (p.mode === 'work' && p.completedCycles >= normalizedTarget) {
                p.completedCycles = Math.max(0, normalizedTarget - 1);
            }

            p.sessions = Math.min(normalizedTarget, Math.max(1, p.sessions || 1));

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroCompletedCycles: (completed) => {
        set((state) => {
            const p = state.appState.pomodoro;
            const targetCycles = Math.max(1, Number(p.targetCycles) || 1);

            let newCompleted = Math.min(
                targetCycles,
                Math.max(0, Number(completed) || 0)
            );

            if (p.mode === 'work' && newCompleted >= targetCycles) {
                newCompleted = Math.max(0, targetCycles - 1);
            }

            p.completedCycles = newCompleted;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },    setPomodoroMode: (mode) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.mode = mode;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    updatePomodoroSettings: (settings) => {
        set((state) => {
            const activeData = state.appState.contests[state.appState.activeId];

            if (!activeData) return;

            const isIdentical =
                JSON.stringify(activeData.settings || {}) ===
                JSON.stringify({ ...(activeData.settings || {}), ...settings });

            if (isIdentical) return;

            activeData.settings = {
                ...(activeData.settings || {}),
                ...settings
            };

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    setPomodoroAccumulatedMinutes: (minutes) => {
        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.accumulatedMinutes = Math.max(0, Number(minutes) || 0);

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    completePomodoroPhase: (isManual = false, manualMinutes = 0) => {
        let savedMinutes = 0;

        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            const activeId = state.appState.activeId;
            const settings = state.appState?.contests?.[activeId]?.settings || {
                pomodoroWork: 25,
                pomodoroBreak: 5
            };

            const workDuration = Number(settings.pomodoroWork) || 25;
            const targetCycles = p.targetCycles || 1;

            if (p.mode === 'work') {
                if (!isManual) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + workDuration;
                    savedMinutes = p.accumulatedMinutes;
                } else if (manualMinutes > 0) {
                    p.accumulatedMinutes = (p.accumulatedMinutes || 0) + manualMinutes;
                    savedMinutes = p.accumulatedMinutes;
                }

                const currentCycles = Math.min(
                    targetCycles,
                    (p.completedCycles || 0) + 1
                );

                p.completedCycles = currentCycles;

                if (currentCycles >= targetCycles) {
                    p.sessions = 1;
                    p.mode = 'work';
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak = currentCycles % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                if (p.sessions >= targetCycles || p.completedCycles === 0) {
                    p.sessions = 1;
                    p.completedCycles = 0;
                    p.accumulatedMinutes = 0;
                } else {
                    p.sessions = Math.max(1, (p.sessions || 1) + 1);
                }

                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });

        return savedMinutes;
    },

    rewindPomodoroPhase: () => {
        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            const activeId = state.appState.activeId;
            const settings = state.appState.contests[activeId]?.settings || {};
            const workDuration = Number(settings.pomodoroWork) || 25;

            if (p.mode === 'break' || p.mode === 'long_break') {
                p.mode = 'work';
                p.completedCycles = Math.max(0, (p.completedCycles || 0) - 1);
                p.accumulatedMinutes = Math.max(
                    0,
                    (p.accumulatedMinutes || 0) - workDuration
                );
            } else if (p.sessions > 1) {
                const longBreakAfter = settings.longBreakAfter || 4;
                const completedCycles = p.completedCycles || 0;

                p.sessions = Math.max(1, p.sessions - 1);
                p.mode =
                    completedCycles > 0 && completedCycles % longBreakAfter === 0
                        ? 'long_break'
                        : 'break';
            } else if (p.completedCycles > 0) {
                p.completedCycles = Math.max(0, p.completedCycles - 1);
                p.accumulatedMinutes = Math.max(
                    0,
                    (p.accumulatedMinutes || 0) - workDuration
                );

                if ((p.targetCycles || 1) === 1) {
                    p.sessions = 1;
                    p.mode = 'work';
                } else {
                    p.sessions = p.targetCycles || 1;

                    const longBreakAfter = settings.longBreakAfter || 4;
                    const isLongBreak =
                        (p.completedCycles + 1) % longBreakAfter === 0;

                    p.mode = isLongBreak ? 'long_break' : 'break';
                }
            } else {
                p.mode = 'work';
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    syncPomodoroState: (payload) => {
        set((state) => {
            const p = state.appState.pomodoro;

            if (!p) return;

            if (payload.mode !== undefined) {
                p.mode = payload.mode;
            }

            if (payload.targetCycles !== undefined) {
                p.targetCycles = Math.max(1, Number(payload.targetCycles) || 1);
            }

            if (payload.sessions !== undefined) {
                p.sessions = Math.min(
                    Math.max(1, Number(payload.sessions) || 1),
                    Math.max(1, Number(p.targetCycles) || 1)
                );
            }

            if (payload.completedCycles !== undefined) {
                p.completedCycles = Math.min(
                    p.targetCycles || 1,
                    Math.max(0, Number(payload.completedCycles) || 0)
                );

                if (
                    p.mode === 'work' &&
                    p.completedCycles >= (p.targetCycles || 1)
                ) {
                    p.completedCycles = Math.max(0, (p.targetCycles || 1) - 1);
                }
            }

            if (payload.accumulatedMinutes !== undefined) {
                p.accumulatedMinutes = Math.max(
                    0,
                    Number(payload.accumulatedMinutes) || 0
                );
            }

            if (payload.neuralMode !== undefined) {
                p.neuralMode = payload.neuralMode;
            }

            if (payload.isRunning !== undefined) {
                p.isRunning = Boolean(payload.isRunning);
            }

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    startNeuralSession: (tasks, startIndex = 0) => {
        if (!tasks || tasks.length === 0) return;

        const task = tasks[startIndex];

        const subject = {
            taskId: task.id || task.text,
            task: formatTaskName(task),
            category: extractCategoryFromTask(task),
            categoryId: task.categoryId || task.catId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.activeSubject = subject;
            p.neuralQueue = tasks;
            p.neuralMode = true;
            p.targetCycles = 1;
            p.sessions = 1;
            p.completedCycles = 0;
            p.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });
    },

    advanceNeuralQueue: () => {
        const pState = get().appState?.pomodoro;
        if (!pState) return false;
        const { neuralQueue, activeSubject } = pState;

        if (!neuralQueue || neuralQueue.length === 0) return false;
        if (!activeSubject) return false;

        const currentIndex = neuralQueue.findIndex(
            t => (t.id || t.text) === activeSubject?.taskId
        );

        if (currentIndex === -1 || currentIndex >= neuralQueue.length - 1) {
            set((state) => {
                const p = state.appState?.pomodoro;
                if (!p) return;
                p.neuralMode = false;
                p.neuralQueue = [];

                state.appState.version = (state.appState.version || 0) + 1;
                state.appState.lastUpdated = new Date().toISOString();
                markStorageDirty();
            });

            return false;
        }

        const nextTask = neuralQueue[currentIndex + 1];

        const nextSubject = {
            taskId: nextTask.id || nextTask.text,
            task: formatTaskName(nextTask),
            category: extractCategoryFromTask(nextTask),
            categoryId: nextTask.categoryId || nextTask.catId || 'default',
            priority: 'high',
            sessionInstanceId: Date.now().toString(),
            source: 'neural_core'
        };

        set((state) => {
            const p = state.appState?.pomodoro;
            if (!p) return;
            p.activeSubject = nextSubject;
            p.mode = 'work';
            p.targetCycles = 1;
            p.sessions = 1;
            p.completedCycles = 0;
            p.accumulatedMinutes = 0;

            state.appState.version = (state.appState.version || 0) + 1;
            state.appState.lastUpdated = new Date().toISOString();
            markStorageDirty();
        });

        return true;
    }
});
```

## File: src/pages/Pomodoro.jsx
```javascript
import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import PomodoroTimer from '../components/PomodoroTimer';
import SessionFocusPanel from '../components/pomodoro/FocusPanel';
import { getLocalMidnight, getDateKey, parseNoonLocal, normalizeDate } from '../utils/dateHelper';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useActiveContest, usePomodoroState } from '../store/useSelectors';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
    CheckCircle2, ChevronRight, BrainCircuit, Zap, AlertTriangle,
    Flame, Sparkles, Lock, Unlock, RotateCcw, Loader2, Target,
    AlertCircle, TrendingUp, Clock, Calendar, BarChart3, Medal,
    Trophy, Activity, BookOpen
} from 'lucide-react';
import { getCoachInsight, getBestTask } from '../utils/coachLogic';
import { countPomodorosToday } from '../utils/analytics';
import { parseTaskDisplay } from '../utils/taskTitleHelper';

// Referências estáticas para evitar loops infinitos em seletores Zustand
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

// =====================================================
// TELEMETRIA EM GRID (CONQUISTAS E TELEMETRIA)
// =====================================================
function DataTriviaPanel({ studyLogs, simulados, categories }) {
    const stats = useMemo(() => {
        const startOfToday = getLocalMidnight().getTime();
        const todayDate = new Date();
        const dayOfWeek = (todayDate.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
        const startOfWeek = startOfToday - (86400000 * dayOfWeek);
        const startOfMonth = startOfToday - (86400000 * 30);

        let weekMins = 0;
        let monthMins = 0;
        let recentSimulados = 0;
        let totalTasks = 0;
        let completedTasks = 0;
        let weekTasks = 0;
        const daysStudied = new Set();

        (studyLogs || []).forEach(log => {
            if (!log) return;
            const logDate = log.date || log.createdAt || log.timestamp;
            if (!logDate) return;
            const parsed = parseNoonLocal(logDate) || normalizeDate(logDate);
            const t = parsed ? parsed.getTime() : new Date(logDate).getTime();
            if (Number.isNaN(t)) return;
            const mins = Number(log.minutes) || 0;
            if (t >= startOfWeek) weekMins += mins;
            if (t >= startOfMonth) monthMins += mins;
            daysStudied.add(getDateKey(logDate) || (parsed ? getDateKey(parsed) : new Date(t).toISOString().split('T')[0]));
        });

        (simulados || []).forEach(s => {
            if (!s) return;
            const sDate = s.date || s.createdAt;
            const sTime = sDate ? normalizeDate(sDate)?.getTime() : NaN;
            if (!Number.isNaN(sTime) && sTime >= startOfMonth) recentSimulados++;
        });

        (categories || []).forEach(c => {
            if (!c || !c.tasks) return;
            const safeTasks = Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks);
            safeTasks.forEach(t => {
                if (!t) return;
                totalTasks++;
                if (t.completed) {
                    completedTasks++;
                    const completedTime = (t.completedAt || t.lastStudiedAt) ? new Date(t.completedAt || t.lastStudiedAt).getTime() : NaN;
                    if (!Number.isNaN(completedTime) && completedTime >= startOfWeek) weekTasks++;
                }
            });
        });

        const sortedDays = Array.from(daysStudied).sort();
        let maxStreak = 0;
        let currentStreak = 0;
        let lastDate = null;
        sortedDays.forEach(dayStr => {
            const parsed = parseNoonLocal(dayStr);
            if (!parsed) return;
            const current = parsed.getTime();
            currentStreak = lastDate && Math.round((current - lastDate) / 86400000) === 1 ? currentStreak + 1 : 1;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastDate = current;
        });

        return {
            weekMins,
            monthMins,
            recentSimulados,
            weekTasks,
            maxStreak,
            efficacy: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            hasData: weekMins > 0 || monthMins > 0 || recentSimulados > 0 || totalTasks > 0
        };
    }, [studyLogs, simulados, categories]);

    const fmt = (mins) => {
        const total = Math.max(0, Math.round(Number(mins) || 0));
        const h = Math.floor(total / 60);
        const m = total % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    if (!stats || !stats.hasData) return null;

    const tiles = [
        { icon: <Calendar size={16} className="text-indigo-400" />, label: 'Semana', value: fmt(stats.weekMins), show: stats.weekMins > 0 },
        { icon: <BarChart3 size={16} className="text-cyan-400" />, label: 'Mês', value: fmt(stats.monthMins), show: stats.monthMins > 0 },
        { icon: <Target size={16} className="text-rose-400" />, label: 'Simulados (30 dias)', value: String(stats.recentSimulados), show: stats.recentSimulados > 0 },
        { icon: <Trophy size={16} className="text-yellow-500" />, label: 'Eficácia', value: `${stats.efficacy}%`, show: stats.efficacy > 0 },
        { icon: <Flame size={16} className="text-orange-500" />, label: 'Sequência Máxima', value: `${stats.maxStreak} dias`, show: stats.maxStreak >= 2 },
        { icon: <CheckCircle2 size={16} className="text-emerald-400" />, label: 'Missões na Semana', value: String(stats.weekTasks), show: stats.weekTasks > 0 }
    ].filter(t => t.show).slice(0, 6);

    if (tiles.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden shadow-md">
            <div className="flex justify-between items-center mb-3 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <Medal size={12} />
                    Conquistas e Telemetria
                </p>
                <span className="text-[9px] font-black text-indigo-500/60 uppercase">Central de Dados</span>
            </div>
            <div className="grid grid-cols-2 gap-2 relative z-10">
                {tiles.map((tile, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 rounded-xl">
                        <div className="shrink-0">{tile.icon}</div>
                        <div className="min-w-0">
                            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold truncate">{tile.label}</p>
                            <p className="text-sm font-black text-cyan-300 truncate">{tile.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =====================================================
// PAINEL DO MENTOR IA
// =====================================================
const DEFAULT_INSIGHT = Object.freeze({
    title: 'Pronto para Foco',
    text: 'Sua mente está pronta. Selecione um objetivo tático abaixo para iniciar.',
    color: 'indigo',
    iconType: 'Brain'
});

function AICoachPanel({ activeSubject, _stats, categories = [], studyLogs = [], simulados = [] }) {
    const insight = useMemo(() => {
        if (!activeSubject) return DEFAULT_INSIGHT;

        const catId = activeSubject.categoryId || activeSubject.catId;
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        const targetCategory = safeCats.find(c => c && (c.id === catId || c.name === activeSubject.category));

        if (!targetCategory) {
            return {
                title: activeSubject.category || 'Foco Tático',
                text: `Mantenha a concentração em **${activeSubject.task || 'sua meta'}**. Ciclos consistentes constroem retenção profunda.`,
                color: 'indigo',
                iconType: 'Brain'
            };
        }

        try {
            const rawInsight = getCoachInsight(targetCategory, simulados, studyLogs);
            if (rawInsight && !rawInsight.error && rawInsight.text && rawInsight.text !== 'Dados insuficientes para análise.') {
                let color = 'indigo';
                let iconType = 'Brain';
                if (rawInsight.trend > 0.5) {
                    color = 'emerald';
                    iconType = 'Zap';
                } else if (rawInsight.trend < -0.5 || rawInsight.volatility > 15) {
                    color = 'red';
                    iconType = 'Alert';
                }

                return {
                    title: `IA Mentor · ${targetCategory.name || 'Diagnóstico'}`,
                    text: `Desempenho em ${targetCategory.name}: **${rawInsight.text}**. Foco redobrado nesta etapa.`,
                    color,
                    iconType
                };
            }
        } catch {
            // Silently fallback to default subject advice
        }

        return {
            title: `IA Mentor · ${targetCategory.name || 'Foco'}`,
            text: `Alvo ativo: **${activeSubject.task || targetCategory.name}**. Mantenha o ritmo para maximizar retenção.`,
            color: 'indigo',
            iconType: 'Brain'
        };
    }, [activeSubject, categories, studyLogs, simulados]);
    const icons = {
        'Brain': <BrainCircuit size={24} strokeWidth={1.5} />,
        'Zap': <Zap size={24} strokeWidth={1.5} />,
        'Alert': <AlertTriangle size={24} strokeWidth={1.5} />
    };
    const colorMap = {
        red: {
            border: 'border-red-500/30', bg: 'bg-red-500/5', glow: 'shadow-red-500/10',
            text: 'text-red-400', accent: 'bg-red-400', gradient: 'from-red-500/20 via-red-500/5 to-transparent'
        },
        emerald: {
            border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', glow: 'shadow-emerald-500/10',
            text: 'text-emerald-400', accent: 'bg-emerald-400', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        },
        indigo: {
            border: 'border-indigo-500/20', bg: 'bg-slate-800/40', glow: 'shadow-indigo-500/5',
            text: 'text-indigo-300', accent: 'bg-indigo-400', gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent'
        }
    };
    const theme = colorMap[insight?.color] || colorMap.indigo;
    const formatText = (text) => {
        if (!text) return '';
        return text.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className={`font-black text-white ${theme.text} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>{part}</strong> : part
        );
    };
    return (
        <Motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative rounded-2xl border ${theme.border} ${theme.bg} ${theme.glow} backdrop-blur-md p-4 mb-4 overflow-hidden group shadow-lg`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-40 pointer-events-none`} />
            <Motion.div
                animate={{ left: ['-100%', '200%'] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-[50px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50 pointer-events-none z-20 skew-x-[-20deg]"
            />
            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                <div className="relative shrink-0">
                    <Motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full blur-xl ${theme.accent}`}
                    />
                    <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border ${theme.border} bg-slate-900/70 flex items-center justify-center ${theme.text} shadow-inner`}>
                        {icons[insight?.iconType] || <BrainCircuit size={24} />}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
                            <Sparkles size={10} className={`${theme.text} shrink-0`} />
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Mentor Ativo</span>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-white mb-0.5 tracking-tight flex items-center gap-2">
                        <span className="truncate">{insight?.title || 'Pronto para Foco'}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.accent} animate-pulse shrink-0`} />
                    </h3>
                    <div className="text-xs text-slate-300/90 leading-relaxed font-medium">
                        {formatText(insight?.text)}
                    </div>
                </div>
            </div>
        </Motion.div>
    );
}

// =====================================================
// OPÇÃO 1: CENTRAL DE MISSÕES, MENTOR E PRÓXIMAS AÇÕES
// =====================================================
function ActionsAndMentorView({
    categories,
    activeSubject,
    onStartTask,
    stats,
    neuralMode,
    neuralQueue,
    studyLogs,
    simulados
}) {
    const recommendedTask = useMemo(() => {
        const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
        if (!safeCats || safeCats.length === 0) return null;
        return getBestTask(safeCats);
    }, [categories]);

    const highPriorityTasks = useMemo(() => {
        const tasks = [];
        const recommendedId = (!activeSubject && recommendedTask) ? (recommendedTask.id || recommendedTask.text) : null;
        const currentTaskId = activeSubject?.taskId;
        if (neuralMode && neuralQueue && neuralQueue.length > 0) {
            const safeQueue = Array.isArray(neuralQueue) ? neuralQueue : Object.values(neuralQueue || {});
            const normalizedQueue = safeQueue.filter(Boolean);
            const currentIndex = normalizedQueue.findIndex(t => (t.id || t.text) === currentTaskId);
            const pendingQueue = currentIndex >= 0 ? normalizedQueue.slice(currentIndex) : normalizedQueue;
            return pendingQueue.map(t => ({
                ...t,
                id: t.id || t.text,
                catName: t.catName || t.category || 'Neural',
                catColor: t.catColor || '#6366f1',
                catIcon: t.catIcon || '⚡'
            }));
        }
        (categories || []).filter(Boolean).forEach(cat => {
            const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
            safeTasks.filter(t => t && !t.completed && t.priority === 'high' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
            });
        });
        if (tasks.length === 0) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed && t.priority === 'medium' && (t.id || t.text) !== recommendedId && (t.id || t.text) !== currentTaskId).forEach(t => {
                    tasks.push({ ...t, id: t.id || t.text, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                });
            });
        }
        return tasks;
    }, [categories, recommendedTask, activeSubject, neuralMode, neuralQueue]);

    const pendingCount = highPriorityTasks.filter(t => (t.id || t.text) !== activeSubject?.taskId).length;

    const visibleTasks = useMemo(() => {
        const base = [...highPriorityTasks];
        const seen = new Set(base.map(t => t?.id || t?.text).filter(Boolean));
        if (base.length < 6) {
            (categories || []).filter(Boolean).forEach(cat => {
                const safeTasks = Array.isArray(cat.tasks) ? cat.tasks : Object.values(cat.tasks || {});
                safeTasks.filter(t => t && !t.completed).forEach(t => {
                    const normalizedId = t.id || t.text;
                    if (!normalizedId || seen.has(normalizedId) || base.length >= 6 || normalizedId === activeSubject?.taskId) return;
                    base.push({ ...t, id: normalizedId, catName: cat.name, catColor: cat.color, catId: cat.id, catIcon: cat.icon });
                    seen.add(normalizedId);
                });
            });
        }
        return base.slice(0, 6);
    }, [highPriorityTasks, categories, activeSubject]);

    const activeTaskStats = useMemo(() => {
        if (!activeSubject) return null;
        const currentCategory = (categories || []).find(c => c && (c.id === activeSubject.categoryId || (activeSubject.category && c.name === activeSubject.category)));
        const rawTasks = currentCategory?.tasks || [];
        const safeCategoryTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
        const categoryTasks = safeCategoryTasks.filter(Boolean);
        const total = categoryTasks.length;
        const completed = categoryTasks.filter(t => t.completed).length;
        const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const totalMinutes = currentCategory?.totalMinutes || 0;
        const remaining = Math.max(total - completed, 0);
        const currentTask = categoryTasks.find(t => (t.id || t.text) === activeSubject.taskId);
        const isCurrentCompleted = currentTask?.completed || false;
        const gainIfComplete = (total > 0 && !isCurrentCompleted) ? Number((100 / total).toFixed(1)) : 0;
        const quality = completionPct >= 80 ? 'Maestria' : completionPct >= 40 ? 'Evolução' : 'Fase Inicial';
        const hitRate = completionPct;
        const missRate = Math.max(0, 100 - completionPct);
        const highPriorityCount = categoryTasks.filter(t => t.priority === 'high' && !t.completed).length;
        const whySelected = isCurrentCompleted
            ? 'necessidade de retenção de memória (Revisão Espaçada)'
            : activeSubject.priority === 'high'
                ? 'ser um alvo crítico de alto impacto'
                : 'apresentar alta sinergia com o seu ritmo atual';
        const improveText = remaining > 0
            ? `Domine mais ${Math.min(remaining, 3)} assunto(s) para expandir seu domínio na matéria.`
            : 'Domínio quase absoluto da matéria. Excelente oportunidade para transição ou revisão profunda.';
        const statusVariants = [];
        if (completionPct < 40) {
            statusVariants.push(`Fase de ignição: Cada assunto concluído gera um impacto de +${gainIfComplete}% na base da matéria.`);
            if (highPriorityCount > 0) statusVariants.push(`Estratégia Alpha: Focar nos ${highPriorityCount} assuntos críticos desta matéria trará o maior ROI de esforço.`);
        } else if (completionPct < 80) {
            statusVariants.push(`Ponto de inflexão: Você já dominou ${hitRate}% da matéria. Acelere para cruzar a barreira da excelência.`);
            statusVariants.push(`Análise em tempo real: Restam ${remaining} assuntos nesta matéria. Mantenha o fluxo para aniquilar a lacuna de ${missRate}%.`);
        } else {
            statusVariants.push(`Alta performance: Com ${hitRate}% de domínio da matéria, você está na fase de refinamento e maestria.`);
            statusVariants.push(`Retenção máxima: Seu nível atual nesta matéria reduz drasticamente a curva de esquecimento.`);
        }
        if (highPriorityCount > 0 && statusVariants.length < 3) {
            statusVariants.push(`Radar tático: Detectamos ${highPriorityCount} assunto(s) de prioridade máxima ainda em aberto nesta matéria.`);
        }
        statusVariants.push(`Mapeamento: Seu fluxo nesta matéria já converteu ${hitRate}% de ruído em conhecimento estruturado.`);
        const variantSeed = String(activeSubject.taskId || activeSubject.task || '').length + completed + total;
        const statusLine = statusVariants[variantSeed % statusVariants.length];
        return {
            total, completed, completionPct, gainIfComplete, quality, whySelected, improveText, hitRate, missRate, statusLine,
            categoryName: currentCategory?.name || 'Desconhecida',
            totalMinutes,
            topic: activeSubject.task
        };
    }, [activeSubject, categories]);

    const cleanTaskText = (rawText, catName) => {
        const result = parseTaskDisplay(rawText, catName);
        return {
            displayTopic: result.displayTopic || 'Revisão Geral',
            secondaryText: result.secondaryText || ''
        };
    };

    const safeCatName = (name) => {
        const n = String(name || '').trim();
        if (!n) return 'Categoria';
        if (/^[A-Za-z0-9_-]{8,}$/.test(n)) return 'Categoria';
        return n;
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <AICoachPanel
                activeSubject={activeSubject}
                stats={stats}
                categories={categories}
                studyLogs={studyLogs}
                simulados={simulados}
            />
            <DataTriviaPanel studyLogs={studyLogs} simulados={simulados} categories={categories} />

            {activeTaskStats && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 relative overflow-hidden group/stats shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover/stats:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2 truncate pr-2">
                            <Target size={12} className="shrink-0" />
                            <span className="truncate">Matéria: {activeTaskStats.categoryName}</span>
                        </p>
                        <span className="text-[10px] font-black text-cyan-500/50 bg-cyan-500/10 px-2 py-0.5 rounded-md shrink-0">
                            {activeTaskStats.completionPct}% Completo
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-cyan-950 rounded-full mb-3 overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-out relative"
                            style={{ width: `${activeTaskStats.completionPct}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed relative z-10">
                        <span className="block mb-1">
                            <strong className="text-cyan-300">Assunto atual:</strong> {cleanTaskText(activeTaskStats.topic, activeTaskStats.categoryName).displayTopic || 'Missão em Aberto'}
                        </span>
                        <span>
                            O <strong>assunto</strong> foi escolhido por {activeTaskStats.whySelected}. Progresso da <strong>matéria</strong>: <strong>{activeTaskStats.completionPct}%</strong> ({activeTaskStats.completed}/{activeTaskStats.total}).
                            {activeTaskStats.gainIfComplete > 0 ? (
                                <> Impacto na matéria ao concluir: <strong className="text-emerald-400">+{activeTaskStats.gainIfComplete}%</strong>.</>
                            ) : (
                                <> Sessão de revisão focada: <strong className="text-emerald-400">Manutenção de retenção</strong>.</>
                            )}
                        </span>
                    </p>
                    <div className="mt-3 relative z-10">
                        <p className="text-xs text-slate-400">
                            Nível da matéria: <strong className="text-white capitalize">{activeTaskStats.quality}</strong>. {activeTaskStats.improveText}
                        </p>
                        <p className="text-xs text-cyan-300/80 mt-1">{activeTaskStats.statusLine}</p>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1.5 text-xs" title="Domínio da matéria"><CheckCircle2 size={12} className="text-emerald-500" /> <strong className="text-slate-200">{activeTaskStats.hitRate}%</strong> Domínio</span>
                            <span className="flex items-center gap-1.5 text-xs" title="Lacuna na matéria"><AlertCircle size={12} className="text-amber-500" /> <strong className="text-slate-200">{activeTaskStats.missRate}%</strong> Lacuna</span>
                            {activeTaskStats.totalMinutes > 0 && (
                                <span className="flex items-center gap-1.5 text-xs" title="Tempo dedicado à matéria"><Clock size={12} className="text-cyan-500" /> <strong className="text-slate-200">{Math.round(activeTaskStats.totalMinutes)}m</strong> na Matéria</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {recommendedTask && !activeSubject && (
                <Motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-6 rounded-2xl bg-[#11131f] border border-indigo-500/20 shadow-lg relative group/card overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover/card:scale-110 group-hover/card:opacity-20 transition-all">
                        <Zap size={64} className="text-indigo-400" />
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                        <span className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold uppercase tracking-widest">
                            ⚡ Recomendado pela IA
                        </span>
                        {recommendedTask.priority === 'high' && (
                            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-widest shrink-0">
                                Prioridade Alta
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2 leading-tight relative z-10">
                        {(() => {
                            const recInfo = cleanTaskText(recommendedTask.text || recommendedTask.title, recommendedTask.catName || recommendedTask.category);
                            return recInfo.displayTopic || 'Missão de Alto Impacto';
                        })()}
                    </h3>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed relative z-10">
                        Baseado na sua performance e histórico, esta meta oferece a melhor janela de retenção agora.
                    </p>
                    <button
                        type="button"
                        onClick={() => onStartTask(recommendedTask, null, 'neural_core')}
                        className="w-full relative overflow-hidden py-3 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] active:scale-[0.985] group/btn z-10"
                    >
                        <span className="absolute inset-0 w-full h-full -ml-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite] skew-x-[-20deg]" />
                        INICIAR AGORA
                        <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] bg-white/5 border border-white/10 shrink-0 text-slate-400">
                                {recommendedTask.catIcon || '📚'}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
                                {safeCatName(recommendedTask.catName || recommendedTask.category)}
                            </span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-400/60 tracking-widest uppercase shrink-0">Eficácia Máxima</span>
                    </div>
                </Motion.div>
            )}

            <div className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 backdrop-blur-md relative overflow-hidden shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-500/50" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Próximas Ações</p>
                    </div>
                    {pendingCount > 0 && (
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/5 px-2.5 py-0.5 rounded-md">
                            {pendingCount} pendentes
                        </span>
                    )}
                </div>
                {visibleTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center bg-white/[0.015] rounded-2xl border border-white/5">
                        <CheckCircle2 size={28} className="text-emerald-500/40 mb-3" />
                        <p className="text-xs font-bold text-slate-300 tracking-tight">Nenhuma ação pendente</p>
                        <p className="text-[9px] text-slate-500 mt-1">Todas as missões neurais completas ou em foco.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                        {visibleTasks.filter(Boolean).map((task, idx) => {
                            const taskId = task.id || task.text || `fallback-task-${idx}`;
                            const categoryName = safeCatName(task.catName || task.category);
                            const isActive = activeSubject?.taskId === taskId;
                            const { displayTopic, secondaryText } = cleanTaskText(task.text || task.title, categoryName);
                            return (
                                <Motion.button
                                    key={`task-${taskId}-${idx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    onClick={() => onStartTask(task, null, 'neural_core')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group text-left relative overflow-hidden ${isActive
                                        ? 'bg-amber-500/5 border-amber-500/20 shadow-sm'
                                        : 'bg-white/[0.015] border-transparent hover:bg-white/[0.03] hover:border-white/5'
                                        }`}
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-indigo-500/30'}`} />
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base transition-transform group-hover:scale-105"
                                        style={{ backgroundColor: `${task.catColor || '#ffffff'}15`, border: `1px solid ${task.catColor || '#ffffff'}30` }}
                                    >
                                        {task.catIcon || '📚'}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-amber-400' : 'text-slate-300 group-hover:text-white transition-colors'}`}>
                                            {displayTopic || 'Missão em Aberto'}
                                        </p>
                                        {secondaryText && (
                                            <p className="text-[9px] text-slate-500 truncate mt-0.5 font-medium">{secondaryText}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[8px] text-slate-500/80 font-medium uppercase tracking-widest">{categoryName}</p>
                                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-amber-500/80' : 'text-slate-600'}`}>• {isActive ? 'Em foco agora' : `Ação #${idx + 1}`}</p>
                                        </div>
                                    </div>
                                    {isActive ? (
                                        <div className="flex flex-col items-center gap-0.5 opacity-80">
                                            <Flame size={14} className="text-amber-500" />
                                        </div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                            <ChevronRight size={12} className="text-slate-400" />
                                        </div>
                                    )}
                                </Motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// =====================================================
// PAINEL LATERAL UNIFICADO COM AS DUAS OPÇÕES DE VISUALIZAÇÃO
// =====================================================
function PomodoroSidePanel({
    activeTab,
    setActiveTab,
    categories,
    activeSubject,
    onStartTask,
    stats,
    neuralMode,
    neuralQueue,
    studyLogs,
    simulados,
    user,
    mode,
    isRunning,
    timeLeft,
    totalTime,
    targetCycles,
    completedCycles,
    isLayoutLocked,
    onToggleLock,
    settings
}) {
    const [uiPosition, setUiPosition] = useState(() => {
        try {
            const saved = localStorage.getItem('focusPanelPosition');
            if (saved !== null && saved !== 'undefined') {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    if (typeof window !== 'undefined') {
                        const limitX = Math.max(100, window.innerWidth - 100);
                        const limitY = Math.max(100, window.innerHeight - 100);
                        if (Math.abs(parsed.x) > limitX || Math.abs(parsed.y) > limitY) {
                            return { x: 0, y: 0 };
                        }
                    }
                    return parsed;
                }
            }
            return { x: 0, y: 0 };
        } catch { return { x: 0, y: 0 }; }
    });
    const uiPosRef = useRef(uiPosition);
    useEffect(() => { uiPosRef.current = uiPosition; }, [uiPosition]);
    useEffect(() => {
        return () => {
            // Cleanup: garantir que o ref não aponta para um valor stale
            uiPosRef.current = { x: 0, y: 0 };
        };
    }, []);

    useEffect(() => {
        const checkPos = () => {
            const currentPos = uiPosRef.current;
            if (currentPos.x !== 0 || currentPos.y !== 0) {
                const limitX = window.innerWidth - 100;
                const limitY = window.innerHeight - 100;
                if (Math.abs(currentPos.x) > limitX || Math.abs(currentPos.y) > limitY) {
                    setUiPosition({ x: 0, y: 0 });
                    localStorage.removeItem('focusPanelPosition');
                }
            }
        };
        window.addEventListener('resize', checkPos);
        return () => window.removeEventListener('resize', checkPos);
    }, []);

    const handleDragEnd = (_, info) => {
        const newPos = { x: uiPosition.x + info.offset.x, y: uiPosition.y + info.offset.y };
        setUiPosition(newPos);
        try {
            localStorage.setItem('focusPanelPosition', JSON.stringify(newPos));
        } catch (err) {
            console.warn("[PomodoroSidePanel] Falha ao salvar posição:", err);
        }
    };

    const resetPosition = () => {
        setUiPosition({ x: 0, y: 0 });
        localStorage.removeItem('focusPanelPosition');
    };

    // Contagem de pendências para o badge do tab de ações
    const pendingCount = useMemo(() => {
        let count = 0;
        (categories || []).forEach(cat => {
            const safeTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
            safeTasks.forEach(t => {
                if (t && !t.completed && t.priority === 'high' && (t.id || t.text) !== activeSubject?.taskId) {
                    count++;
                }
            });
        });
        return count;
    }, [categories, activeSubject]);

    return (
        <Motion.div
            drag={!isLayoutLocked}
            dragMomentum={false}
            dragElastic={0.1}
            animate={uiPosition}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.01, zIndex: 100 }}
            className={`flex flex-col w-full relative group p-3.5 sm:p-4 bg-[#08090f]/75 border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl xl:max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar ${!isLayoutLocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {/* CABEÇALHO DO PAINEL LATERAL (INTEGRADO, FLUIDO E SEMPRE ACESSÍVEL) */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                        Painel Tático
                    </span>
                    {!isLayoutLocked ? (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                            Móvel
                        </span>
                    ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                            Fixo
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {!isLayoutLocked && (uiPosition.x !== 0 || uiPosition.y !== 0) && (
                        <button
                            type="button"
                            onClick={resetPosition}
                            className="px-2 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-white/10 hover:text-white hover:bg-slate-800 transition-all text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow"
                            title="Restaurar posição original"
                        >
                            <RotateCcw size={10} />
                            <span>Resetar</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggleLock}
                        className={`p-1.5 rounded-xl transition-all border flex items-center justify-center shadow backdrop-blur-md ${isLayoutLocked
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                        title={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel na posição"}
                        aria-label={isLayoutLocked ? "Desbloquear arrasto do painel" : "Bloquear painel na posição"}
                    >
                        {isLayoutLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                </div>
            </div>

            {/* TAB SELECTOR: DUAS OPÇÕES DE VISUALIZAÇÃO */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-white/10 rounded-2xl mb-3.5 shadow-inner">
                <button
                    type="button"
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'actions'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <Zap size={14} className={activeTab === 'actions' ? 'text-amber-300' : 'text-indigo-400'} />
                    <span>Missões & Mentor</span>
                    {pendingCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${activeTab === 'actions'
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                            }`}>
                            {pendingCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('telemetry')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'telemetry'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <Activity size={14} className={activeTab === 'telemetry' ? 'text-white' : 'text-cyan-400'} />
                    <span>Telemetria da Sessão</span>
                    {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                </button>
            </div>

            {/* CONTEÚDO DA VISUALIZAÇÃO SELECIONADA */}
            <AnimatePresence mode="wait">
                {activeTab === 'actions' ? (
                    <Motion.div
                        key="view-actions"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="w-full"
                    >
                        <ActionsAndMentorView
                            categories={categories}
                            activeSubject={activeSubject}
                            onStartTask={onStartTask}
                            stats={stats}
                            neuralMode={neuralMode}
                            neuralQueue={neuralQueue}
                            studyLogs={studyLogs}
                            simulados={simulados}
                        />
                    </Motion.div>
                ) : (
                    <Motion.div
                        key="view-telemetry"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="w-full"
                    >
                        <SessionFocusPanel
                            activeSubject={activeSubject}
                            categories={categories}
                            studyLogs={studyLogs}
                            user={user}
                            mode={mode}
                            isRunning={isRunning}
                            timeLeft={timeLeft}
                            totalTime={totalTime}
                            targetCycles={targetCycles}
                            completedCycles={completedCycles}
                            settings={settings}
                        />
                    </Motion.div>
                )}
            </AnimatePresence>
        </Motion.div>
    );
}

// =====================================================
// =====================================================
// BARRA SUPERIOR DO CRONÔMETRO (COMPACTA, ELEGANTE E PERFEITAMENTE ENQUADRADA)
// =====================================================
function PomodoroTopBar({ activeSubject, isRunning }) {
    const cleanText = (text) => parseTaskDisplay(text, activeSubject?.category);

    return (
        <div className="w-full rounded-2xl border-2 border-[#94785a] bg-[#b08e6b] px-4 sm:px-5 py-2.5 sm:py-3 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5 pointer-events-none" />
            <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#2d1a12]/10 border border-[#2d1a12]/20 flex items-center justify-center shrink-0 shadow-inner">
                        {activeSubject ? <Target size={20} className="text-[#2d1a12]" /> : <Zap size={20} className="text-[#2d1a12]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#2d1a12]/85 truncate">
                                {activeSubject?.category || 'SISTEMA'}
                            </span>
                            <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${
                                activeSubject && isRunning
                                    ? 'bg-emerald-700 animate-pulse'
                                    : activeSubject
                                        ? 'bg-amber-700/80'
                                        : 'bg-[#2d1a12]/30'
                            }`} title={activeSubject && isRunning ? 'Em execução' : activeSubject ? 'Pausado' : 'Aguardando protocolo'} />
                        </div>
                        <h1 className="text-sm sm:text-base lg:text-lg font-black text-[#2d1a12] tracking-tight leading-tight truncate" title={activeSubject ? (cleanText(activeSubject.task)?.displayTopic || 'Missão Ativa') : 'Aguardando protocolo...'}>
                            {activeSubject ? (cleanText(activeSubject.task)?.displayTopic || 'Missão Ativa') : 'Aguardando protocolo...'}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// COMPONENTE PRINCIPAL POMODORO
// =====================================================
export default function Pomodoro() {
    const activeId = useAppStore(state => state.appState?.activeId);
    const contest = useActiveContest() || EMPTY_OBJECT;
    const rawCategories = contest.categories || EMPTY_ARRAY;
    const categories = React.useMemo(() => (Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories || {})).map(c => ({
        ...c,
        tasks: Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})
    })), [rawCategories]);
    const settings = contest.settings || EMPTY_OBJECT;
    const rawStudyLogs = contest.studyLogs || EMPTY_ARRAY;
    const studyLogs = React.useMemo(() => Array.isArray(rawStudyLogs) ? rawStudyLogs : Object.values(rawStudyLogs || {}), [rawStudyLogs]);
    const rawSimulados = contest.simulados || EMPTY_ARRAY;
    const simulados = React.useMemo(() => Array.isArray(rawSimulados) ? rawSimulados : Object.values(rawSimulados || {}), [rawSimulados]);
    const user = contest.user || null;

    const isHydrated = !!activeId && contest !== EMPTY_OBJECT;

    const setData = useAppStore(state => state.setData);
    const handleUpdateStudyTime = useAppStore(state => state.handleUpdateStudyTime);
    const location = useLocation();
    const navigate = useNavigate();
    const showToast = useToast();
    const completionTimeoutRef = React.useRef(null);
    const pomodoroState = usePomodoroState();
    const activeSubject = pomodoroState.activeSubject;
    const setPomodoroActiveSubject = useAppStore(state => state.setPomodoroActiveSubject);
    const neuralMode = pomodoroState.neuralMode;
    const neuralQueue = pomodoroState.neuralQueue || EMPTY_ARRAY;
    const entrySourceRef = useRef(location.state?.from || 'pomodoro');
    const topRef = useRef(null);
    const [liveTimerState, setLiveTimerState] = useState(null);

    // Estado do Tab do Painel Lateral (Missões & Mentor vs Telemetria)
    const [activeSideTab, setActiveSideTab] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroSideTab');
            return saved === 'telemetry' ? 'telemetry' : 'actions';
        } catch {
            return 'actions';
        }
    });

    const handleTabChange = (newTab) => {
        setActiveSideTab(newTab);
        try {
            localStorage.setItem('pomodoroSideTab', newTab);
        } catch (e) {
            console.warn('[Pomodoro] Falha ao persistir tab lateral:', e);
        }
    };

    useEffect(() => {
        if (location.state?.from) {
            entrySourceRef.current = location.state.from;
        }
    }, [location.state?.from]);

    useEffect(() => {
        // Garantir que a tela do cronômetro seja perfeitamente enquadrada a partir do topo
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (topRef.current) {
            const mainContainer = topRef.current.closest('main');
            if (mainContainer) {
                mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId]);

    const resolveReturnPath = (source, forceDashboard = false) => {
        if (forceDashboard) return '/';
        const normalized = String(source || '').replace(/^\/+/, '');
        if (!normalized || normalized === 'pomodoro' || normalized === 'neural_core' || normalized === 'side_panel') {
            return '/pomodoro';
        }
        if (normalized === 'dashboard' || normalized === 'dashboard_selector') {
            return '/';
        }
        return `/${normalized}`;
    };

    const resolveSessionSource = (subjectSource) => {
        const entry = String(entrySourceRef.current || '').replace(/^\/+/, '');
        const subject = String(subjectSource || '').replace(/^\/+/, '');
        if (entry === 'dashboard') return 'dashboard';
        return subject || entry || 'pomodoro';
    };

    const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroLayoutLocked');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.error('Failed to parse pomodoroLayoutLocked:', error);
            return true;
        }
    });

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'pomodoroLayoutLocked') {
                try {
                    setIsLayoutLocked(JSON.parse(e.newValue) ?? true);
                } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const toggleLayoutLock = () => {
        const newState = !isLayoutLocked;
        setIsLayoutLocked(newState);
        try {
            localStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
            localStorage.setItem('focusPanelLocked', JSON.stringify(newState));
        } catch (err) {
            console.warn('[Pomodoro] Falha ao salvar pomodoroLayoutLocked:', err);
            try {
                sessionStorage.setItem('pomodoroLayoutLocked', JSON.stringify(newState));
            } catch { /* ignore */ }
        }
    };

    const userStats = useMemo(() => {
        if (!contest || contest === EMPTY_OBJECT) {
            return {
                pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, 0),
                consecutiveMinutes: 0,
                settings: null
            };
        }

        const now = new Date();
        const startOfToday = getLocalMidnight().getTime();
        let consecutiveStudyMinutes = 0;

        const recentLogs = [...(studyLogs || [])]
            .filter(log => {
                if (!log) return false;
                const rawDate = log.date || log.createdAt || log.timestamp;
                if (!rawDate) return false;
                const parsed = parseNoonLocal(rawDate) || normalizeDate(rawDate);
                const t = parsed ? parsed.getTime() : new Date(rawDate).getTime();
                return Number.isFinite(t) && t >= startOfToday;
            })
            .sort((a, b) => {
                const dateA = a.date || a.createdAt || a.timestamp;
                const dateB = b.date || b.createdAt || b.timestamp;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

        let lastTimeBoundary = now.getTime();

        for (const log of recentLogs) {
            const rawDate = log.date || log.createdAt || log.timestamp;
            const parsedDate = parseNoonLocal(rawDate) || normalizeDate(rawDate);
            const logDate = parsedDate ? parsedDate.getTime() : new Date(rawDate).getTime();
            const minutes = Number(log.minutes) || 0;
            if (!logDate || Number.isNaN(logDate) || minutes <= 0) continue;

            const sessionEndTime = log.endDate ? new Date(log.endDate).getTime() : logDate;
            const sessionStartTime = log.endDate ? logDate : (logDate - (minutes * 60 * 1000));
            const boundary = Number.isFinite(sessionEndTime) ? sessionEndTime : logDate;
            const gapInMinutes = Math.max(0, (lastTimeBoundary - boundary) / (1000 * 60));
            if (gapInMinutes > 90) {
                break;
            }

            consecutiveStudyMinutes += minutes;
            lastTimeBoundary = Number.isFinite(sessionStartTime) ? sessionStartTime : (boundary - (minutes * 60 * 1000));
        }

        return {
            pomodorosCompleted: countPomodorosToday(studyLogs, settings?.pomodoroWork, 0),
            consecutiveMinutes: consecutiveStudyMinutes,
            settings: settings,
            user: user
        };
    }, [contest, studyLogs, settings, user]);

    useEffect(() => {
        if (!activeSubject && location.state?.categoryId && location.state?.taskId) {
            const cat = (categories || []).find(c => c && (c.id === location.state.categoryId || c.name === location.state.categoryId));
            const rawTasks = cat?.tasks || [];
            const safeTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);
            const tsk = safeTasks.find(t => t && (t.id === location.state.taskId || t.text === location.state.taskId));
            if (cat && tsk) {
                navigate(location.pathname, { replace: true, state: null });
                useAppStore.getState().startPomodoroSession({
                    categoryId: cat.id,
                    taskId: tsk.id || tsk.text,
                    category: cat.name,
                    task: tsk.title || tsk.text || 'Estudo',
                    priority: tsk.priority,
                    source: location.state?.from || 'dashboard'
                });
            }
        }
    }, [location.state, location.pathname, categories, activeSubject, navigate]);

    useEffect(() => {
        let timeoutId;
        if (!isHydrated) {
            timeoutId = setTimeout(() => {
                showToast('Contexto pendente. Retornando ao Dashboard...', 'warning');
                navigate('/');
            }, 6000);
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [isHydrated, navigate, showToast]);

    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => { activeSubjectRef.current = activeSubject; }, [activeSubject]);

    useEffect(() => {
        return () => { if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current); };
    }, []);

    const handleExit = useCallback((options = {}) => {
        const subjectSnapshot = options._subjectSnapshot || activeSubjectRef.current;
        const currentSource = options.source || resolveSessionSource(subjectSnapshot?.source);

        if (subjectSnapshot) {
            setData(prev => {
                const rawCats = prev.categories;
                const catsArray = Array.isArray(rawCats) ? rawCats : Object.values(rawCats || {});
                return {
                    ...prev,
                    categories: catsArray.map(c => c.id === subjectSnapshot.categoryId ? {
                        ...c,
                        tasks: (Array.isArray(c.tasks) ? c.tasks : Object.values(c.tasks || {})).map(t => t.id === subjectSnapshot.taskId ? { ...t, status: 'idle' } : t)
                    } : c)
                };
            });
        }

        setPomodoroActiveSubject(null);
        try {
            localStorage.removeItem('pomodoroState');
            localStorage.removeItem('pomodoro-endsAt');
        } catch {
            // ignore
        }
        const returnPath = resolveReturnPath(currentSource, Boolean(options.forceDashboard));
        navigate(returnPath, { replace: Boolean(options.forceDashboard) });
    }, [setData, setPomodoroActiveSubject, navigate]);

    const handleStartTask = (task, forcedSessionId = null, source = 'pomodoro') => {
        const sessionId = forcedSessionId || Date.now().toString();
        const pomodoroState = useAppStore.getState().appState?.pomodoro || {};
        const effectiveSource = (pomodoroState.neuralMode && source !== 'dashboard') ? 'neural_core' : source;
        const taskId = task?.id || task?.text;
        if (!taskId) return;

        let catId = task.catId || task.categoryId;
        let catName = task.catName || task.category;
        if (!catId) {
            const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
            const foundCat = safeCats.find(c => {
                const tasks = Array.isArray(c?.tasks) ? c.tasks : Object.values(c?.tasks || {});
                return tasks.some(t => (t?.id || t?.text) === taskId);
            });
            if (foundCat) {
                catId = foundCat.id;
                if (!catName) catName = foundCat.name;
            }
        }

        if (effectiveSource === 'neural_core' && !pomodoroState.neuralMode) {
            const highPriority = [];
            categories.forEach(cat => {
                (cat.tasks || []).filter(t => !t.completed && t.priority === 'high').forEach(t => {
                    highPriority.push({ ...t, id: t.id || t.text, categoryId: cat.id, catName: cat.name });
                });
            });
            const queue = [...highPriority];
            let startIndex = queue.findIndex(t => (t.id || t.text) === taskId);
            if (startIndex === -1) {
                queue.unshift({ ...task, id: taskId, categoryId: catId, catName: catName });
                startIndex = 0;
            }
            useAppStore.getState().startNeuralSession(queue, startIndex);
        } else {
            useAppStore.getState().setPomodoroActiveSubject({
                categoryId: catId,
                taskId,
                category: catName,
                task: task.text || task.title || 'Estudo',
                priority: task.priority,
                source: effectiveSource,
                sessionInstanceId: sessionId
            });
        }
    };

    const handleTimerStateChange = useCallback((newState) => {
        setLiveTimerState(prev => {
            if (!prev) return newState;
            if (!newState) return null;
            if (
                prev.isRunning === newState.isRunning &&
                prev.timeLeft === newState.timeLeft &&
                prev.totalTime === newState.totalTime &&
                prev.mode === newState.mode &&
                prev.sessions === newState.sessions &&
                prev.targetCycles === newState.targetCycles &&
                prev.completedCycles === newState.completedCycles
            ) {
                return prev;
            }
            return newState;
        });
    }, []);

    const handleFullCycleComplete = useCallback((totalMinutes = 0, wasNatural = true) => {
        const currentSubject = activeSubject || useAppStore.getState().appState?.pomodoro?.activeSubject;
        const { neuralMode } = useAppStore.getState().appState?.pomodoro || {};
        const store = useAppStore.getState();

        if (currentSubject) {
            if (wasNatural) {
                showToast(`Série finalizada! ${totalMinutes} minutos salvos no histórico. 🚀💎`, 'success');
            } else {
                showToast(`Série concluída! ${totalMinutes} minutos salvos no histórico. ⚡`, 'info');
            }
            store.setPomodoroAccumulatedMinutes(0);

            const activeData = store.appState.contests[store.appState.activeId];

            if (neuralMode || currentSubject.source === 'neural_core') {
                const rawCats = activeData?.categories || [];
                const safeCats = Array.isArray(rawCats) ? rawCats : Object.values(rawCats);
                const cat = safeCats.find(c => c && c.id === currentSubject.categoryId);
                const catTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
                const task = catTasks.find(t => t && (t.id || t.text) === currentSubject.taskId);
                if (!task || !task.completed) {
                    store.toggleNeuralTask(currentSubject.taskId);
                    showToast(`Status: "${currentSubject.task}" concluído! ✅`, 'success');
                } else {
                    showToast(`Sessão finalizada: "${currentSubject.task}"! ✅`, 'info');
                }
            } else {
                const rawCats = activeData?.categories || [];
                const safeCats = Array.isArray(rawCats) ? rawCats : Object.values(rawCats);
                const cat = safeCats.find(c => c && c.id === currentSubject.categoryId);
                const catTasks = Array.isArray(cat?.tasks) ? cat.tasks : Object.values(cat?.tasks || {});
                const task = catTasks.find(t => t && (t.id || t.text) === currentSubject.taskId);
                if (task && !task.completed) {
                    store.toggleTask(currentSubject.categoryId, currentSubject.taskId);
                    showToast(`Status: "${task.title || task.text}" concluído! ✅`, 'success');
                }
            }

            if (neuralMode || currentSubject.source === 'neural_core') {
                const hasNext = store.advanceNeuralQueue();
                if (hasNext) {
                    showToast(`Sequenciando próxima meta do painel... ⚡`, 'info');
                    return;
                } else {
                    showToast('Todas as ações concluídas! Progresso salvo. 🏆', 'success');
                    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
                    completionTimeoutRef.current = setTimeout(() => {
                        useAppStore.getState().setPomodoroActiveSubject(null);
                    }, 1000);
                    return;
                }
            }

            const sourceAfterFinish = resolveSessionSource(currentSubject?.source);
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = setTimeout(() => {
                const returnPath = resolveReturnPath(sourceAfterFinish, false);
                if (returnPath === '/pomodoro') {
                    showToast('Sessão finalizada! Selecione sua próxima meta.', 'info');
                    try {
                        localStorage.removeItem('pomodoroState');
                        localStorage.removeItem('pomodoro-endsAt');
                    } catch {
                        // ignore storage errors
                    }
                    setPomodoroActiveSubject(null);
                    return;
                }
                showToast('Sessão finalizada! Retornando ao menu de origem...', 'info');
                handleExit({ source: sourceAfterFinish, _subjectSnapshot: currentSubject });
            }, 1000);
            return;
        } else {
            store.setPomodoroAccumulatedMinutes(0);
            handleExit();
        }
    }, [activeSubject, handleExit, showToast, setPomodoroActiveSubject]);

    const handleSessionComplete = useCallback(() => {
        setData(prev => ({
            ...prev,
            lastPomodoroDate: new Date().toISOString()
        }));
    }, [setData]);

    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center p-12 min-h-screen bg-[#0a0f1e]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Sistema Neural...</p>
                    <p className="text-slate-600 font-medium text-[9px] text-center mt-2 max-w-[250px]">
                        Autenticando parâmetros de foco.<br />Se não escolheu uma tarefa, voltaremos ao Dashboard em breve.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PageErrorBoundary pageName="Pomodoro">
            <div ref={topRef} className="min-h-0 flex items-start justify-center pt-0.5 sm:pt-1 pb-2 sm:pb-3 px-2 sm:px-4">
                <div className="flex flex-col xl:flex-row gap-3.5 sm:gap-4 lg:gap-5 items-start justify-center w-full max-w-[1180px] xl:max-w-[1280px] 2xl:max-w-[1360px] mx-auto">
                    {/* COLUNA 1: CONSOLE DO CRONÔMETRO POMODORO (PERFEITAMENTE ENQUADRADO) */}
                    <div className="w-full xl:w-[480px] 2xl:w-[510px] flex-shrink-0 flex flex-col items-center gap-1 min-w-0">
                        <PomodoroTopBar
                            activeSubject={activeSubject}
                            isRunning={liveTimerState !== null ? liveTimerState.isRunning : (pomodoroState.isRunning || false)}
                        />
                        <PomodoroTimer
                            settings={settings}
                            activeSubject={activeSubject}
                            categories={categories || []}
                            onUpdateStudyTime={handleUpdateStudyTime}
                            onExit={handleExit}
                            onSessionComplete={handleSessionComplete}
                            onFullCycleComplete={handleFullCycleComplete}
                            onTimerStateChange={handleTimerStateChange}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                            defaultTargetCycles={1}
                            key={activeSubject?.sessionInstanceId || 'idle'}
                        />
                    </div>

                    {/* COLUNA 2: PAINEL LATERAL COM AS DUAS OPÇÕES DE VISUALIZAÇÃO */}
                    <div className="w-full xl:w-[400px] 2xl:w-[440px] flex-shrink-0 min-w-0">
                        <PomodoroSidePanel
                            activeTab={activeSideTab}
                            setActiveTab={handleTabChange}
                            categories={categories || []}
                            activeSubject={activeSubject}
                            onStartTask={handleStartTask}
                            stats={userStats}
                            neuralMode={neuralMode}
                            neuralQueue={neuralQueue}
                            studyLogs={studyLogs}
                            simulados={simulados}
                            user={user}
                            mode={liveTimerState?.mode || pomodoroState.mode || 'work'}
                            isRunning={liveTimerState !== null ? liveTimerState.isRunning : (pomodoroState.isRunning || false)}
                            timeLeft={liveTimerState !== null ? liveTimerState.timeLeft : (pomodoroState.timeLeft || (settings?.pomodoroWork || 25) * 60)}
                            totalTime={liveTimerState?.totalTime || (
                                (liveTimerState?.mode || pomodoroState.mode) === 'break'
                                    ? (settings?.pomodoroBreak || 5) * 60
                                    : (liveTimerState?.mode || pomodoroState.mode) === 'long_break'
                                        ? (settings?.pomodoroLongBreak || 15) * 60
                                        : (settings?.pomodoroWork || 25) * 60
                            )}
                            targetCycles={liveTimerState?.targetCycles || pomodoroState.targetCycles || 1}
                            completedCycles={liveTimerState?.completedCycles ?? pomodoroState.completedCycles ?? 0}
                            isLayoutLocked={isLayoutLocked}
                            onToggleLock={toggleLayoutLock}
                            settings={settings}
                        />
                    </div>
                </div>
            </div>
        </PageErrorBoundary>
    );
}
```

## File: src/components/PomodoroTimer.jsx
```javascript
/**
 * ============================================================================
 * POMODORO TIMER - VERSÃO CORRIGIDA E MELHORADA
 * ============================================================================
 * Correções aplicadas:
 * - Restore de sessão pausada após reload
 * - Flush correto de minutos ao abortar em qualquer fase
 * - Skip não concede minutos completos sem estudo
 * - Sincronização multi-aba com taskId/sessionInstanceId
 * - Uso de resetPomodoroProgress em vez de mutação insegura
 * - Integração com FocusPanel ao lado do relógio
 * - Mais informações e status no painel ativo
 * ============================================================================
 */
import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    AlertCircle,
    VolumeX,
    Volume2,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { usePomodoroSync } from '../hooks/usePomodoroSync';
import { playPomodoroAlarm } from '../utils/audioAlert';
import { PomodoroProgress } from './pomodoro/PomodoroProgress';
import { PomodoroControls } from './pomodoro/PomodoroControls';
import { PomodoroHeader } from './pomodoro/PomodoroHeader';
import { PomodoroClock } from './pomodoro/PomodoroClock';
import ConfirmModal from './ConfirmModal';

const STABLE_TAB_ID = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const SPEED_OPTIONS = [1, 10, 100];

const formatTime = (seconds) => {
    const safe = Number(seconds);
    if (!Number.isFinite(safe) || safe < 0) return '00:00';
    const secsInt = Math.ceil(safe);
    const mins = Math.floor(secsInt / 60);
    const secs = secsInt % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const CIRCUMFERENCE = 2 * Math.PI * 110;

function toPositiveMinutes(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        return fallback;
    }
    return Math.min(240, Math.max(1, Math.round(n)));
}

class PomodoroErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Critical Pomodoro Failure:', error, errorInfo);
    }
    handleReset = () => {
        try {
            localStorage.removeItem('pomodoroState');
            localStorage.removeItem('pomodoro-endsAt');
            localStorage.removeItem('pomodoro_muted');
            sessionStorage.removeItem('pomodoroState');
        } catch { /* ignore */ }
        try {
            const setPomodoroActiveSubject = useAppStore.getState().setPomodoroActiveSubject;
            if (typeof setPomodoroActiveSubject === 'function') setPomodoroActiveSubject(null);
            const resetProgress = useAppStore.getState().resetPomodoroProgress;
            if (typeof resetProgress === 'function') resetProgress();
        } catch { /* ignore */ }
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full p-8 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="text-red-500" size={48} />
                    <h2 className="text-xl font-black text-red-500 uppercase tracking-widest">
                        Protocolo de Emergência Ativado
                    </h2>
                    <p className="text-sm text-red-200/60 max-w-md">
                        O motor do cronômetro encontrou uma instabilidade crítica.
                        Seus dados foram preservados.
                    </p>
                    {this.state.error && (
                        <p className="text-[11px] font-mono text-red-400/80 bg-red-950/40 p-2 rounded max-w-md break-words">
                            {this.state.error?.message || String(this.state.error)}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={this.handleReset}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg transition-all uppercase text-xs tracking-widest cursor-pointer"
                    >
                        Reiniciar Motor Neural
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function PomodoroTimer({
    settings = {},
    activeSubject,
    categories = [],
    onFullCycleComplete,
    onUpdateStudyTime,
    onExit,
    onSessionComplete,
    onTimerStateChange
}) {
    const safeSettings = useMemo(() => Object.freeze({
        ...settings,
        pomodoroWork: toPositiveMinutes(settings?.pomodoroWork, 25),
        pomodoroBreak: toPositiveMinutes(settings?.pomodoroBreak, 5),
        pomodoroLongBreak: toPositiveMinutes(settings?.pomodoroLongBreak, 15),
        soundEnabled: settings?.soundEnabled ?? true
    }), [settings]);

    const mode = useAppStore(state => state.appState?.pomodoro?.mode || 'work');
    const sessions = useAppStore(state => state.appState?.pomodoro?.sessions || 1);
    const targetCycles = useAppStore(state => {
        const raw = state.appState?.pomodoro?.targetCycles;
        return Number.isFinite(raw) && raw > 0 ? raw : 1;
    });
    const completedCycles = useAppStore(state => {
        const raw = state.appState?.pomodoro?.completedCycles;
        const target = state.appState?.pomodoro?.targetCycles || 1;
        return Number.isFinite(raw) ? Math.min(Math.max(0, raw), target) : 0;
    });
    const accumulatedMinutes = useAppStore(state => state.appState?.pomodoro?.accumulatedMinutes || 0);
    const setTargetCycles = useAppStore(state => state.setPomodoroTargetCycles);
    const completePomodoroPhase = useAppStore(state => state.completePomodoroPhase);
    const rewindPomodoroPhase = useAppStore(state => state.rewindPomodoroPhase);
    const setPomodoroRunning = useAppStore(state => state.setPomodoroRunning);

    const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [savedState, setSavedState] = useState(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = JSON.parse(localStorage.getItem('pomodoroState'));
            if (!saved || typeof saved !== 'object') return null;
            const matchesTask =
                activeSubject?.taskId &&
                saved?.activeTaskId === activeSubject.taskId;
            const matchesMode =
                saved?.mode === mode;
            const matchesSession =
                !activeSubject?.sessionInstanceId ||
                saved?.sessionInstanceId === activeSubject.sessionInstanceId;
            if (saved && matchesTask && matchesMode && matchesSession) {
                return {
                    ...saved,
                    isRunning: false
                };
            }
        } catch (error) {
            console.error('Failed to parse pomodoroState:', error);
        }
        return null;
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeSubject?.taskId) {
                try {
                    const saved = JSON.parse(localStorage.getItem('pomodoroState'));
                    const matchesTask = saved?.activeTaskId === activeSubject.taskId;
                    const matchesMode = saved?.mode === mode;
                    const matchesSession = !activeSubject.sessionInstanceId || 
                        saved?.sessionInstanceId === activeSubject.sessionInstanceId;
                    if (saved && matchesTask && matchesMode && matchesSession &&
                        Number.isFinite(saved.timeLeft) && saved.timeLeft > 0) {
                        setSavedState(prev => {
                            if (prev && prev.timeLeft === saved.timeLeft && prev.mode === saved.mode && prev.activeTaskId === saved.activeTaskId) {
                                return prev;
                            }
                            return { ...saved, isRunning: false };
                        });
                    } else {
                        setSavedState(prev => prev === null ? null : null);
                    }
                } catch {
                    setSavedState(prev => prev === null ? null : null);
                }
            } else {
                setSavedState(prev => prev === null ? null : null);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId, mode]);

    const getSavedState = (key, defaultValue) => {
        if (savedState && savedState[key] !== undefined) {
            return savedState[key];
        }
        return defaultValue;
    };

    const initialTime = mode === 'work'
        ? safeSettings.pomodoroWork * 60
        : mode === 'long_break'
            ? safeSettings.pomodoroLongBreak * 60
            : safeSettings.pomodoroBreak * 60;

    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = getSavedState('timeLeft', initialTime);
        const t = Number(saved);
        return Number.isFinite(t) && t > 0
            ? t
            : Number.isFinite(initialTime)
                ? initialTime
                : 25 * 60;
    });

    const [isRunning, setIsRunning] = useState(() => {
        return Boolean(getSavedState('isRunning', false));
    });

    const [speed, setSpeed] = useState(() => {
        const parsed = Number(getSavedState('speed', 1));
        return SPEED_OPTIONS.includes(parsed) ? parsed : 1;
    });

    const [isMuted, setIsMuted] = useState(() => {
        try {
            return localStorage.getItem('pomodoro_muted') === 'true';
        } catch {
            return false;
        }
    });

    const isMutedRef = useRef(isMuted);
    const endsAtRef = useRef(null);
    const speedRef = useRef(speed);
    const stateRefs = useRef({
        mode,
        timeLeft,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes,
        lastTaskId: activeSubject?.taskId
    });

    useEffect(() => {
        if (typeof onTimerStateChange === 'function') {
            const currentTotal = mode === 'work'
                ? (safeSettings.pomodoroWork || 25) * 60
                : mode === 'long_break'
                    ? (safeSettings.pomodoroLongBreak || 15) * 60
                    : (safeSettings.pomodoroBreak || 5) * 60;
            onTimerStateChange({
                isRunning,
                timeLeft,
                totalTime: currentTotal,
                mode,
                sessions,
                targetCycles,
                completedCycles
            });
        }
    }, [
        isRunning,
        timeLeft,
        mode,
        sessions,
        targetCycles,
        completedCycles,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak,
        onTimerStateChange
    ]);

    const timeRef = useRef(timeLeft);
    const handlePhaseEndRef = useRef(null);

    // ✅ RESTORE DE SESSÃO APÓS RELOAD (COM ESCOPO DE TAREFA E SESSÃO)
    useEffect(() => {
        try {
            const rawEndsAt = localStorage.getItem('pomodoro-endsAt');
            if (!rawEndsAt) return;
            let endsAt = null;
            let endsAtTaskId = null;
            let endsAtSessionId = null;

            try {
                const parsed = JSON.parse(rawEndsAt);
                if (parsed && typeof parsed === 'object') {
                    endsAt = Number(parsed.endsAt);
                    endsAtTaskId = parsed.taskId || null;
                    endsAtSessionId = parsed.sessionInstanceId || null;
                } else {
                    endsAt = Number(rawEndsAt);
                }
            } catch {
                endsAt = Number(rawEndsAt);
            }

            if (!Number.isFinite(endsAt) || endsAt <= 0) {
                try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
                return;
            }

            const currentTaskId = activeSubject?.taskId || null;
            const currentSessionId = activeSubject?.sessionInstanceId || null;
            if (endsAtTaskId && currentTaskId && endsAtTaskId !== currentTaskId) {
                try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
                return;
            }
            if (endsAtSessionId && currentSessionId && endsAtSessionId !== currentSessionId) {
                try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
                return;
            }

            const currentSpeed = speedRef.current || 1;
            const now = Date.now();
            if (endsAt > now) {
                endsAtRef.current = endsAt;
                const remaining = Math.max(0, Math.round(((endsAt - now) * currentSpeed) / 1000));
                setTimeLeft(remaining);
                if (stateRefs.current) {
                    stateRefs.current.timeLeft = remaining;
                    stateRefs.current.isRunning = true;
                }
                setIsRunning(true);
                if (typeof setPomodoroRunning === 'function') {
                    setPomodoroRunning(true);
                }
            } else {
                endsAtRef.current = null;
                try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
                setTimeLeft(0);
                if (stateRefs.current) {
                    stateRefs.current.timeLeft = 0;
                }
                handlePhaseEndRef.current?.();
            }
        } catch (err) {
            console.warn('[PomodoroTimer] Falha ao restaurar endsAt:', err);
        }
    }, [activeSubject?.taskId, activeSubject?.sessionInstanceId, setPomodoroRunning]);

    const [syncChannel] = useState(() => {
        try {
            if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
                return new window.BroadcastChannel('pomodoro_sync');
            }
        } catch (e) {
            console.warn('[PomodoroTimer] BroadcastChannel indisponível:', e);
        }
        return null;
    });

    useEffect(() => {
        return () => {
            try {
                syncChannel?.close?.();
            } catch { /* ignore */ }
        };
    }, [syncChannel]);

    const activeSubjectRef = useRef(activeSubject);
    useEffect(() => {
        activeSubjectRef.current = activeSubject;
    }, [activeSubject]);

    const postSync = useCallback((payload) => {
        try {
            if (!syncChannel || typeof syncChannel.postMessage !== 'function') return;
            if (!payload || typeof payload !== 'object' || !payload.type) return;
            syncChannel.postMessage({
                ...payload,
                tabId: STABLE_TAB_ID,
                taskId: activeSubjectRef.current?.taskId || null,
                sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
            });
        } catch (error) {
            console.warn('[PomodoroSync] Failed to post message:', error);
        }
    }, [syncChannel]);

    useEffect(() => {
        if (speedRef.current !== speed) {
            speedRef.current = speed;
            if (isRunning && endsAtRef.current) {
                const currentLeft = Number(stateRefs.current?.timeLeft ?? timeLeft) || 0;
                endsAtRef.current = Date.now() + (currentLeft * 1000) / (speed || 1);
                try {
                    localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                        endsAt: endsAtRef.current,
                        taskId: activeSubjectRef.current?.taskId || null,
                        sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
                    }));
                } catch {}
            }
            postSync({
                type: 'SPEED_CHANGE',
                speed
            });
        }
    }, [speed, isRunning, postSync, timeLeft]);

    const transitionTimeoutRef = useRef(null);
    const completionTimeoutRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const isTransitioningRef = useRef(false);
    const transitionRetriesRef = useRef(0);

    const clockRef = useRef(null);
    const svgCircleRef = useRef(null);
    const workFillsRef = useRef([]);
    const breakBallsRef = useRef([]);

    const showToast = useToast();
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
                transitionTimeoutRef.current = null;
            }
            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = null;
            }
            isTransitioningRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (workFillsRef.current) {
            workFillsRef.current = workFillsRef.current.slice(0, targetCycles || 1);
        }
        if (breakBallsRef.current) {
            breakBallsRef.current = breakBallsRef.current.slice(
                0,
                (targetCycles || 1) - 1
            );
        }
    }, [targetCycles]);

    const toggleMute = () => {
        const newVal = !isMutedRef.current;
        isMutedRef.current = newVal;
        setIsMuted(newVal);
        try {
            localStorage.setItem('pomodoro_muted', String(newVal));
        } catch (error) {
            console.error('Failed to set pomodoro_muted:', error);
        }
        postSync({ type: 'TOGGLE_MUTE', isMuted: newVal });
    };

    const toggleFullscreen = () => {
        setIsFullscreen(prev => !prev);
    };

    const safeOnUpdateStudyTime = useCallback((...args) => {
        if (typeof onUpdateStudyTime === 'function' && isMountedRef.current) {
            try {
                onUpdateStudyTime(...args);
            } catch (error) {
                console.error('[Shield] Callback Error (onUpdateStudyTime):', error);
            }
        }
    }, [onUpdateStudyTime]);

    const safeOnFullCycleComplete = useCallback((...args) => {
        if (typeof onFullCycleComplete === 'function' && isMountedRef.current) {
            try {
                onFullCycleComplete(...args);
            } catch (error) {
                console.error('[Shield] Callback Error (onFullCycleComplete):', error);
            }
        }
    }, [onFullCycleComplete]);

    const safeOnExit = useCallback((...args) => {
        if (typeof onExit === 'function' && isMountedRef.current) {
            try {
                onExit(...args);
            } catch (error) {
                console.error('[Shield] Callback Error (onExit):', error);
            }
        }
    }, [onExit]);

    const prevTaskStateRef = useRef({
        subject: activeSubject,
        accum: 0,
        time: initialTime,
        mode
    });
    const transitionLockRef = useRef(0);
    const hasFlushedRef = useRef(false);

    const flushPendingStudyTime = useCallback((subjectOverride = null) => {
        if (hasFlushedRef.current) return;
        const subjectSnapshot = subjectOverride || activeSubjectRef.current;
        if (!subjectSnapshot) return;

        const current = stateRefs.current;
        let minutes = 0;

        if (current.mode === 'work') {
            const liveState = useAppStore.getState();
            const activeId = liveState?.appState?.activeId;
            const liveSettings = liveState?.appState?.contests?.[activeId]?.settings || liveState?.settings || {};
            const livePomodoroWork = Math.max(1, Number(liveSettings.pomodoroWork || safeSettings.pomodoroWork || 25));
            const totalWorkSeconds = livePomodoroWork * 60;
            const rawPrev = Number(timeRef.current ?? current.timeLeft);
            const safePrevTime = Number.isFinite(rawPrev) && rawPrev >= 0
                ? rawPrev
                : totalWorkSeconds;
            minutes = Math.max(0, totalWorkSeconds - safePrevTime) / 60;
        }

        minutes = Number.isFinite(minutes) ? Number(minutes.toFixed(2)) : 0;

        if (minutes >= 0.25 && Number.isFinite(minutes)) {
            hasFlushedRef.current = true;
            safeOnUpdateStudyTime(
                subjectSnapshot.categoryId,
                minutes,
                subjectSnapshot.taskId
            );
            if (typeof onSessionComplete === 'function') {
                onSessionComplete();
            }
        }

        const totalWorkSeconds = (Number(safeSettings.pomodoroWork) || 25) * 60;
        timeRef.current = totalWorkSeconds;
        stateRefs.current.timeLeft = totalWorkSeconds;
        prevTaskStateRef.current = {
            subject: null,
            accum: 0,
            time: totalWorkSeconds,
            mode: 'work'
        };

        try {
            const resetProgress = useAppStore.getState().resetPomodoroProgress;
            if (typeof resetProgress === 'function') {
                resetProgress();
            } else {
                useAppStore.setState((state) => ({
                    appState: {
                        ...state.appState,
                        pomodoro: {
                            ...state.appState?.pomodoro,
                            accumulatedMinutes: 0
                        }
                    }
                }));
            }
        } catch (error) {
            console.error('[PomodoroTimer] Failed to reset accumulatedMinutes:', error);
        }
    }, [safeSettings, safeOnUpdateStudyTime, onSessionComplete]);

    useEffect(() => {
        const prev = prevTaskStateRef.current;
        if (prev.subject && activeSubject?.taskId !== prev.subject.taskId) {
            let lostMinutes = 0;
            if (prev.mode === 'work') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                const safePrevTime = Number.isFinite(Number(prev.time))
                    ? Number(prev.time)
                    : totalWorkSeconds;
                lostMinutes += Number(
                    (Math.max(0, totalWorkSeconds - safePrevTime) / 60).toFixed(2)
                );
            }
            if (lostMinutes >= 0.25 && !Number.isNaN(lostMinutes)) {
                safeOnUpdateStudyTime(
                    prev.subject.categoryId,
                    lostMinutes,
                    prev.subject.taskId
                );
                if (typeof onSessionComplete === 'function') {
                    onSessionComplete();
                }
            }
        }
        prevTaskStateRef.current = {
            subject: activeSubject,
            accum: accumulatedMinutes,
            time: stateRefs.current.timeLeft,
            mode
        };
    }, [
        activeSubject,
        accumulatedMinutes,
        mode,
        safeSettings.pomodoroWork,
        safeOnUpdateStudyTime,
        onSessionComplete
    ]);

    useEffect(() => {
        stateRefs.current = {
            ...stateRefs.current,
            mode,
            isRunning,
            sessions,
            targetCycles,
            completedCycles,
            accumulatedMinutes
        };
    }, [
        mode,
        isRunning,
        sessions,
        targetCycles,
        completedCycles,
        accumulatedMinutes
    ]);

    const didInitialSyncRef = useRef(false);

    useEffect(() => {
        if (!didInitialSyncRef.current) {
            didInitialSyncRef.current = true;
            stateRefs.current.lastTaskId = activeSubject?.taskId;
            if (
                savedState &&
                savedState.mode === mode &&
                Number.isFinite(savedState.timeLeft) &&
                savedState.timeLeft > 0
            ) {
                const restoredTime = Math.max(0, Number(savedState.timeLeft));
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setTimeLeft(restoredTime);
                stateRefs.current.timeLeft = restoredTime;
                if (clockRef.current) {
                    clockRef.current.textContent = formatTime(restoredTime);
                }
                if (svgCircleRef.current) {
                    const currentTotalTime = mode === 'work'
                        ? safeSettings.pomodoroWork * 60
                        : mode === 'long_break'
                            ? safeSettings.pomodoroLongBreak * 60
                            : safeSettings.pomodoroBreak * 60;
                    const fraction = Math.max(
                        0,
                        Math.min(1, restoredTime / currentTotalTime)
                    );
                    svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;
                }
                return;
            }
        }

        if (!isTransitioning) {
            const newTotalTime = mode === 'work'
                ? safeSettings.pomodoroWork * 60
                : mode === 'long_break'
                    ? safeSettings.pomodoroLongBreak * 60
                    : safeSettings.pomodoroBreak * 60;
            const taskChanged = activeSubject?.taskId !== stateRefs.current.lastTaskId;

            if (taskChanged && stateRefs.current.lastTaskId !== undefined) {
                if (stateRefs.current.isRunning) {
                    setIsRunning(false);
                    stateRefs.current.isRunning = false;
                }
                try {
                    const resetProgress = useAppStore.getState().resetPomodoroProgress;
                    if (typeof resetProgress === 'function') {
                        resetProgress();
                    } else {
                        useAppStore.setState((state) => ({
                            appState: {
                                ...state.appState,
                                pomodoro: {
                                    ...state.appState?.pomodoro,
                                    accumulatedMinutes: 0,
                                    completedCycles: 0
                                }
                            }
                        }));
                    }
                } catch (error) {
                    console.error('[PomodoroTimer] Failed to reset progress:', error);
                }

                setTimeLeft(newTotalTime);
                stateRefs.current.timeLeft = newTotalTime;
                stateRefs.current.lastTaskId = activeSubject?.taskId;

                if (clockRef.current) {
                    const mins = Math.floor(newTotalTime / 60);
                    const secs = newTotalTime % 60;
                    clockRef.current.textContent =
                        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                }

                if (svgCircleRef.current) {
                    svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
                }
            } else if (!stateRefs.current.isRunning && !isRunning) {
                stateRefs.current.lastTaskId = activeSubject?.taskId;
                const prevTotal = stateRefs.current.lastTotalTime;
                if (prevTotal !== undefined && prevTotal !== newTotalTime && stateRefs.current.timeLeft === prevTotal) {
                    setTimeLeft(newTotalTime);
                    stateRefs.current.timeLeft = newTotalTime;
                    if (clockRef.current) {
                        const mins = Math.floor(newTotalTime / 60);
                        const secs = newTotalTime % 60;
                        clockRef.current.textContent =
                            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    }
                }
                stateRefs.current.lastTotalTime = newTotalTime;
            }
        }
    }, [
        activeSubject?.taskId,
        mode,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak,
        isTransitioning,
        isRunning
    ]);

    React.useLayoutEffect(() => {
        if (!isMountedRef.current) return;

        const currentMode = mode;
        const currentSessions = sessions;
        const currentTotalTime = currentMode === 'work'
            ? (safeSettings.pomodoroWork || 25) * 60
            : currentMode === 'long_break'
                ? (safeSettings.pomodoroLongBreak || 15) * 60
                : (safeSettings.pomodoroBreak || 5) * 60;
        const fraction = Math.max(0, Math.min(1, timeLeft / (currentTotalTime || 1)));
        const currentPercent = `${Math.max(0, Math.min(100, (1 - fraction) * 100))}%`;

        if (Array.isArray(workFillsRef.current)) {
            workFillsRef.current.forEach((el, i) => {
                if (!el || !el.style) return;
                if (
                    i < currentSessions - 1 ||
                    (i === currentSessions - 1 && currentMode !== 'work')
                ) {
                    el.style.width = '100%';
                } else if (i === currentSessions - 1 && currentMode === 'work') {
                    el.style.width = currentPercent;
                } else {
                    el.style.width = '0%';
                }
            });
        }

        if (Array.isArray(breakBallsRef.current)) {
            breakBallsRef.current.forEach((el, i) => {
                if (!el || !el.style) return;
                if (i < currentSessions - 1) {
                    el.style.height = '100%';
                } else if (i === currentSessions - 1 && currentMode !== 'work') {
                    el.style.height = currentPercent;
                } else {
                    el.style.height = '0%';
                }
            });
        }

        if (svgCircleRef.current?.style) {
            svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE * fraction;
        }
    }, [
        mode,
        sessions,
        targetCycles,
        timeLeft,
        safeSettings.pomodoroWork,
        safeSettings.pomodoroBreak,
        safeSettings.pomodoroLongBreak
    ]);

    usePomodoroSync({
        syncChannel,
        STABLE_TAB_ID,
        setIsRunning,
        stateRefs,
        setTimeLeft,
        showToast,
        setSpeed,
        speedRef,
        activeSubjectRef,
        clockRef,
        setIsMuted,
        isMutedRef,
        endsAtRef
    });

    const savePomodoroState = useCallback((overrides = {}) => {
        if (!activeSubject?.taskId) return;
        try {
            const current = stateRefs.current;
            const stateToSave = {
                activeTaskId: activeSubject.taskId,
                sessionInstanceId: activeSubject.sessionInstanceId || null,
                mode: current.mode,
                timeLeft: current.timeLeft,
                isRunning: current.isRunning,
                sessions: current.sessions,
                targetCycles: current.targetCycles,
                completedCycles: current.completedCycles,
                accumulatedMinutes: current.accumulatedMinutes,
                speed: speedRef.current,
                savedAt: Date.now(),
                ...overrides
            };
            localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Failed to save pomodoroState:', error);
        }
    }, [activeSubject]);

    useEffect(() => {
        return () => {
            if (hasFlushedRef.current) return;
            const currentSub = activeSubjectRef.current;
            if (currentSub && stateRefs.current.mode === 'work') {
                const totalWorkSeconds = (safeSettings.pomodoroWork || 25) * 60;
                const currentTime = Number(timeRef.current ?? stateRefs.current.timeLeft);
                const elapsedSec = Math.max(0, totalWorkSeconds - currentTime);
                const elapsedMins = Number((elapsedSec / 60).toFixed(2));
                if (elapsedMins >= 0.25) {
                    hasFlushedRef.current = true;
                    safeOnUpdateStudyTime(currentSub.categoryId, elapsedMins, currentSub.taskId);
                    if (typeof onSessionComplete === 'function') {
                        onSessionComplete();
                    }
                }
            }
            savePomodoroState({ isRunning: false, timeLeft: stateRefs.current.timeLeft });
            setPomodoroRunning(false);
            endsAtRef.current = null;
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        };
    }, [savePomodoroState, safeSettings, safeOnUpdateStudyTime, onSessionComplete, setPomodoroRunning]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            savePomodoroState({ isRunning: false, timeLeft: stateRefs.current.timeLeft });
            setPomodoroRunning(false);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [savePomodoroState, setPomodoroRunning]);

    const transitionSession = useCallback((completedMode, source = 'natural') => {
        if (isTransitioningRef.current) return;

        if (source === 'natural') {
            const now = Date.now();
            if (transitionLockRef.current && now - transitionLockRef.current < 2000) {
                return;
            }
            transitionLockRef.current = now;
            const lockKey = `pomodoro_transition_lock_${activeSubjectRef.current?.taskId || 'global'}`;
            const lastTransition = Number(localStorage.getItem(lockKey) || 0);
            if (now - lastTransition < 2000) {
                return;
            }
            localStorage.setItem(lockKey, now.toString());
        }

        isTransitioningRef.current = true;
        hasFlushedRef.current = false;
        setIsTransitioning(true);
        setIsRunning(false);
        stateRefs.current.isRunning = false;
        setPomodoroRunning(false);
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}

        const isManual = source !== 'natural';

        if (
            source === 'natural' &&
            safeSettings.soundEnabled &&
            !isMutedRef.current
        ) {
            playPomodoroAlarm();
        }

        const currentSessions = stateRefs.current.sessions;
        const currentTarget = stateRefs.current.targetCycles;
        const isLastWorkSession =
            currentSessions >= currentTarget &&
            stateRefs.current.mode === 'work';
        const isEndingCycle =
            isLastWorkSession &&
            (source === 'natural' || source === 'skip');

        let sessionMinutes = 0;
        if (completedMode === 'work') {
            if (!isManual) {
                sessionMinutes = Number(safeSettings.pomodoroWork.toFixed(2));
            } else if (source === 'skip') {
                const totalWorkSeconds = safeSettings.pomodoroWork * 60;
                sessionMinutes = Number(
                    (
                        Math.max(
                            0,
                            totalWorkSeconds - stateRefs.current.timeLeft
                        ) / 60
                    ).toFixed(2)
                );
            }
        }

        const targetSubject = activeSubjectRef.current;
        let savedMinutes = 0;

        if (targetSubject && completedMode === 'work' && sessionMinutes > 0) {
            if (!Number.isFinite(sessionMinutes) || sessionMinutes <= 0) {
                sessionMinutes = 0;
            }
            safeOnUpdateStudyTime(
                targetSubject.categoryId,
                sessionMinutes,
                targetSubject.taskId
            );
            savedMinutes = sessionMinutes;
        }

        const actualSeriesMinutes = Number(
            ((stateRefs.current.accumulatedMinutes || 0) + sessionMinutes).toFixed(1)
        );

        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
            if (!isMountedRef.current) {
                return;
            }
            if (!clockRef.current) {
                setIsTransitioning(false);
                isTransitioningRef.current = false;
                transitionTimeoutRef.current = null;
                return;
            }

            completePomodoroPhase(isManual, 0);

            if (typeof onSessionComplete === 'function') {
                onSessionComplete();
            }

            const storePomodoro = useAppStore.getState().appState?.pomodoro;
            const newState = storePomodoro || {
                mode: 'work',
                sessions: 1,
                targetCycles: 1,
                completedCycles: 0,
                accumulatedMinutes: 0
            };
            const currentNewMode = newState.mode || 'work';
            const resetTime =
                currentNewMode === 'work'
                    ? (safeSettings.pomodoroWork || 25) * 60
                    : currentNewMode === 'long_break'
                        ? (safeSettings.pomodoroLongBreak || 15) * 60
                        : (safeSettings.pomodoroBreak || 5) * 60;

            setTimeLeft(resetTime);
            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = currentNewMode;
            stateRefs.current.sessions = newState.sessions || 1;
            stateRefs.current.completedCycles = newState.completedCycles || 0;
            stateRefs.current.accumulatedMinutes = newState.accumulatedMinutes || 0;

            if (clockRef.current) {
                const mins = Math.floor(resetTime / 60);
                const secs = resetTime % 60;
                clockRef.current.textContent =
                    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({
                isRunning: false,
                timeLeft: resetTime,
                mode: newState.mode,
                sessions: newState.sessions,
                targetCycles: newState.targetCycles,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes
            });

            postSync({
                type: isManual ? 'PHASE_SKIP' : 'PHASE_COMPLETE',
                toMode: newState.mode,
                sessions: newState.sessions,
                targetCycles: newState.targetCycles,
                completedCycles: newState.completedCycles,
                accumulatedMinutes: newState.accumulatedMinutes,
                timeLeft: resetTime
            });

            setIsTransitioning(false);
            isTransitioningRef.current = false;
            transitionTimeoutRef.current = null;

            if (isEndingCycle) {
                const liveSettings = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.settings || safeSettings;
                const workMins = Number(liveSettings?.pomodoroWork) || 25;
                const seriesTotalMinutes = source === 'natural'
                    ? (currentTarget * workMins)
                    : Math.round(actualSeriesMinutes);
                safeOnFullCycleComplete(
                    seriesTotalMinutes,
                    source === 'natural'
                );
            }
        }, 50);
    }, [
        safeSettings,
        completePomodoroPhase,
        savePomodoroState,
        safeOnUpdateStudyTime,
        safeOnFullCycleComplete,
        onSessionComplete,
        postSync,
        setPomodoroRunning
    ]);

    const handlePhaseEnd = useCallback(() => {
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        if (!isTransitioningRef.current) {
            transitionRetriesRef.current = 0;
            transitionSession(stateRefs.current.mode, 'natural');
        } else {
            transitionRetriesRef.current++;
            if (transitionRetriesRef.current > 15) {
                console.warn('[Pomodoro] Transição travada — forçando reset.');
                isTransitioningRef.current = false;
                transitionRetriesRef.current = 0;
                transitionSession(stateRefs.current.mode, 'natural');
            }
        }
    }, [transitionSession]);
    handlePhaseEndRef.current = handlePhaseEnd;

    // ✅ TIMER SEM DRIFT (Sobrevive a abas em background e reload)
    useEffect(() => {
        if (!isRunning || !endsAtRef.current) return;
        const id = setInterval(() => {
            const currentSpeed = speedRef.current || 1;
            const next = Math.max(0, Math.round(((endsAtRef.current - Date.now()) * currentSpeed) / 1000));
            stateRefs.current.timeLeft = next;
            timeRef.current = next;
            setTimeLeft(next);
            if (next <= 0) {
                clearInterval(id);
                handlePhaseEnd();
            }
        }, 250); // Tick curto para precisão
        return () => clearInterval(id);
    }, [isRunning, handlePhaseEnd]);

    const reset = () => {
        if (!isMountedRef.current) return;
        if (isTransitioningRef.current) return;

        const currentMode = stateRefs.current.mode;
        const currentSessions = stateRefs.current.sessions;
        const currentTimeLeft = stateRefs.current.timeLeft;
        const currentTotalTime =
            currentMode === 'work'
                ? safeSettings.pomodoroWork * 60
                : currentMode === 'long_break'
                    ? safeSettings.pomodoroLongBreak * 60
                    : safeSettings.pomodoroBreak * 60;

        if (currentTimeLeft >= currentTotalTime - 0.5) {
            showToast('Voltando fase...', 'info');
            rewindPomodoroPhase();
            const storePomodoro = useAppStore.getState().appState?.pomodoro;
            const newState = storePomodoro || {
                mode: 'work',
                sessions: 1,
                targetCycles: 1,
                completedCycles: 0,
                accumulatedMinutes: 0
            };
            const currentNewMode = newState.mode || 'work';
            const resetTime =
                currentNewMode === 'work'
                    ? (safeSettings.pomodoroWork || 25) * 60
                    : currentNewMode === 'long_break'
                        ? (safeSettings.pomodoroLongBreak || 15) * 60
                        : (safeSettings.pomodoroBreak || 5) * 60;

            stateRefs.current.timeLeft = resetTime;
            stateRefs.current.mode = currentNewMode;
            stateRefs.current.sessions = newState.sessions || 1;
            stateRefs.current.completedCycles = newState.completedCycles || 0;
            stateRefs.current.accumulatedMinutes = newState.accumulatedMinutes || 0;
            stateRefs.current.isRunning = false;
            setIsRunning(false);
            setPomodoroRunning(false);
            endsAtRef.current = null;
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
            setTimeLeft(resetTime);

            if (Array.isArray(workFillsRef.current)) {
                workFillsRef.current.forEach((el, i) => {
                    if (el && el.style) {
                        el.style.width =
                            i < (newState.sessions || 1) - 1 ||
                            (i === (newState.sessions || 1) - 1 &&
                                (currentNewMode === 'break' || currentNewMode === 'long_break'))
                                ? '100%'
                                : '0%';
                    }
                });
            }

            if (Array.isArray(breakBallsRef.current)) {
                breakBallsRef.current.forEach((el, i) => {
                    if (el && el.style) {
                        el.style.height = i < (newState.sessions || 1) - 1 ? '100%' : '0%';
                    }
                });
            }

            if (clockRef.current) {
                clockRef.current.textContent = formatTime(resetTime);
            }
            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({
                isRunning: false,
                timeLeft: resetTime,
                mode: currentNewMode,
                sessions: newState.sessions || 1,
                completedCycles: newState.completedCycles || 0,
                accumulatedMinutes: newState.accumulatedMinutes || 0
            });

            postSync({
                type: 'PHASE_REWIND',
                toMode: currentNewMode,
                sessions: newState.sessions || 1,
                completedCycles: newState.completedCycles || 0,
                accumulatedMinutes: newState.accumulatedMinutes || 0,
                timeLeft: resetTime
            });
        } else {
            showToast('Cronômetro reiniciado', 'info');

            if (currentMode === 'work') {
                if (workFillsRef.current?.[currentSessions - 1]?.style) {
                    workFillsRef.current[currentSessions - 1].style.width = '0%';
                }
            } else {
                if (breakBallsRef.current?.[currentSessions - 1]?.style) {
                    breakBallsRef.current[currentSessions - 1].style.height = '0%';
                }
            }

            stateRefs.current.timeLeft = currentTotalTime;
            stateRefs.current.isRunning = false;
            setIsRunning(false);
            setPomodoroRunning(false);
            endsAtRef.current = null;
            try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
            setTimeLeft(currentTotalTime);

            if (clockRef.current) {
                clockRef.current.textContent = formatTime(currentTotalTime);
            }
            if (svgCircleRef.current?.style) {
                svgCircleRef.current.style.strokeDashoffset = CIRCUMFERENCE;
            }

            savePomodoroState({ isRunning: false, timeLeft: currentTotalTime });
            postSync({
                type: 'TIMER_RESET',
                timeLeft: currentTotalTime
            });
        }
    };

    const skip = () => {
        if (isTransitioningRef.current) return;

        const s = stateRefs.current.sessions;
        const currentMode = stateRefs.current.mode;

        if (currentMode === 'work') {
            if (workFillsRef.current?.[s - 1]?.style) {
                workFillsRef.current[s - 1].style.width = '100%';
            }
        } else {
            const breakEl = breakBallsRef.current?.[s - 1];
            if (breakEl?.style) {
                breakEl.style.height = '100%';
            }
        }

        transitionSession(currentMode, 'skip');
    };

    // ✅ FUNÇÕES DE CONTROLE ATUALIZADAS
    const startTimer = useCallback(() => {
        hasFlushedRef.current = false;
        const currentLeft = stateRefs.current.timeLeft > 0 ? stateRefs.current.timeLeft : timeLeft;
        const currentSpeed = speedRef.current || 1;
        endsAtRef.current = Date.now() + (currentLeft * 1000) / currentSpeed;
        try {
            localStorage.setItem('pomodoro-endsAt', JSON.stringify({
                endsAt: endsAtRef.current,
                taskId: activeSubjectRef.current?.taskId || null,
                sessionInstanceId: activeSubjectRef.current?.sessionInstanceId || null
            }));
        } catch {}
        stateRefs.current.isRunning = true;
        setIsRunning(true);
        setPomodoroRunning(true);
        savePomodoroState({ isRunning: true, timeLeft: currentLeft });
        postSync({
            type: 'START_SESSION',
            timeLeft: currentLeft,
            endsAt: endsAtRef.current,
            speed: currentSpeed
        });
    }, [timeLeft, postSync, savePomodoroState, setPomodoroRunning]);

    const pauseTimer = useCallback(() => {
        const currentSpeed = speedRef.current || 1;
        const remaining = endsAtRef.current
            ? Math.max(0, Math.round(((endsAtRef.current - Date.now()) * currentSpeed) / 1000))
            : stateRefs.current.timeLeft;
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        setTimeLeft(remaining);
        stateRefs.current.timeLeft = remaining;
        timeRef.current = remaining;
        stateRefs.current.isRunning = false;
        setIsRunning(false);
        setPomodoroRunning(false);
        savePomodoroState({ isRunning: false, timeLeft: remaining });
        postSync({
            type: 'PAUSE_SESSION',
            timeLeft: remaining
        });
    }, [postSync, savePomodoroState, setPomodoroRunning]);

    const togglePlay = useCallback(() => {
        let currentSubject = activeSubject;
        if (!currentSubject) {
            const safeCats = Array.isArray(categories) ? categories : Object.values(categories || {});
            const firstCat = safeCats[0];
            const defaultSubject = {
                categoryId: firstCat?.id || 'geral',
                category: firstCat?.name || 'Geral',
                taskId: 'estudo_livre',
                task: 'Estudo Livre',
                priority: 'medium',
                source: 'pomodoro',
                sessionInstanceId: Date.now().toString()
            };
            useAppStore.getState().setPomodoroActiveSubject(defaultSubject);
            currentSubject = defaultSubject;
            showToast('Iniciando sessão de Foco Livre ⏱️', 'info');
        }

        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }, [activeSubject, categories, isRunning, pauseTimer, startTimer, showToast]);

    const handleManualExit = useCallback((options = {}) => {
        endsAtRef.current = null;
        try { localStorage.removeItem('pomodoro-endsAt'); } catch {}
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
        }
        setIsTransitioning(false);
        isTransitioningRef.current = false;

        const subjectSnapshot = options._subjectSnapshot || activeSubjectRef.current;
        if (subjectSnapshot) {
            flushPendingStudyTime(subjectSnapshot);
        }
        safeOnExit({ forceDashboard: false, source: activeSubjectRef.current?.source || 'pomodoro' });
    }, [flushPendingStudyTime, safeOnExit]);

    const totalTime =
        mode === 'work'
            ? safeSettings.pomodoroWork * 60
            : mode === 'long_break'
                ? safeSettings.pomodoroLongBreak * 60
                : safeSettings.pomodoroBreak * 60;

    const isProtocolInactive = !activeSubject;

    return (
        <div className={`w-full relative flex flex-col items-center gap-1 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#0a0f1e] p-4 overflow-y-auto' : ''}`}>
            {/* Header com status de recuperação/pausa ou alerta (apenas se ativo) */}
            {(mode === 'break' || mode === 'long_break' || isProtocolInactive) && (
                <div className="w-full">
                    <PomodoroHeader
                        mode={mode}
                        activeSubject={activeSubject}
                        onManualExit={handleManualExit}
                    />
                </div>
            )}

            {/* Container Principal do Relógio de Madeira (Perfeitamente Enquadrado) */}
            <div
                style={{
                    backgroundColor: '#b08e6b',
                    backgroundImage: 'url(/wood-texture.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)'
                }}
                className="w-full border-[3px] sm:border-4 border-[#3f2e26] p-3 sm:p-4 rounded-2xl sm:rounded-3xl relative overflow-hidden flex flex-col items-center bg-[#2a1f1a] shadow-2xl"
            >

                {/* Mostrador SVG, Toolbar e Indicadores */}
                <PomodoroClock
                    speed={speed}
                    setSpeed={setSpeed}
                    isProtocolInactive={isProtocolInactive}
                    mode={mode}
                    isRunning={isRunning}
                    timeLeft={timeLeft}
                    totalTime={totalTime}
                    safeSettings={safeSettings}
                    svgCircleRef={svgCircleRef}
                    clockRef={clockRef}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                    isMuted={isMuted}
                    toggleMute={toggleMute}
                />

                {/* Controles Principais (Voltar / Play-Pause / Pular) */}
                <PomodoroControls
                    isProtocolInactive={isProtocolInactive}
                    isRunning={isRunning}
                    onReset={reset}
                    onTogglePlay={togglePlay}
                    onSkip={skip}
                />

                {/* Botão de Abortar Sessão */}
                {!isProtocolInactive && (
                    <div className="w-full max-w-xs mt-1 pt-1.5 mb-0.5 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowAbandonConfirm(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-1 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 rounded-lg transition-all text-[9px] font-bold text-red-300 group shadow-md"
                        >
                            <RotateCcw
                                size={11}
                                className="text-red-400 group-hover:rotate-[-90deg] transition-transform"
                            />
                            ABORTAR SESSÃO
                        </button>
                    </div>
                )}
            </div>

            {/* Barra de Progresso dos Ciclos */}
            <PomodoroProgress
                targetCycles={targetCycles}
                completedCycles={completedCycles}
                sessions={sessions}
                setTargetCycles={setTargetCycles}
                syncChannel={syncChannel}
                STABLE_TAB_ID={STABLE_TAB_ID}
                activeSubject={activeSubject}
                workFillsRef={workFillsRef}
                breakBallsRef={breakBallsRef}
                mode={mode}
                timeLeft={timeLeft}
                totalTime={totalTime}
            />

            <ConfirmModal
                isOpen={showAbandonConfirm}
                onClose={() => setShowAbandonConfirm(false)}
                onConfirm={() => {
                    setShowAbandonConfirm(false);
                    handleManualExit();
                }}
                title="Abortar Sessão"
                message="Deseja realmente abandonar a sessão? O progresso salvo de estudo será mantido e o ciclo atual encerrado."
                confirmText="Abortar Sessão"
                type="danger"
            />
        </div>
    );
}

export default function ProtectedPomodoro(props) {
    return (
        <PomodoroErrorBoundary>
            <PomodoroTimer {...props} />
        </PomodoroErrorBoundary>
    );
}
```
