import React, { useState } from 'react';
import { Clock, CheckSquare, LogOut } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import Checklist from './Checklist';

export default function MobilePocketMode({
    user,
    data,
    activeSubject, // Prop received from App
    actions,
    onExitPocketMode
}) {
    const [activeTab, setActiveTab] = useState('pomodoro'); // 'pomodoro' or 'tasks'

    // Calculate Level Progress for Mini-Header
    const levelProgress = (user.xp % 1000) / 10; // 0-100%

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 pb-20">
            {/* 1. Ultra-Compact Header */}
            <header className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md z-50 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                        {user.avatar}
                    </div>
                    <div>
                        <h1 className="font-bold text-sm leading-tight">{user.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="text-purple-400 font-bold">Lvl {user.level}</span>
                            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                    style={{ width: `${levelProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onExitPocketMode}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                    <LogOut size={18} />
                </button>
            </header>

            {/* 2. Main Content Area */}
            <main className="pt-20 px-4">
                {activeTab === 'pomodoro' ? (
                    <div className="animate-fade-in">
                        <PomodoroTimer
                            settings={data.settings}
                            onUpdateSettings={actions.updatePomodoroSettings}
                            activeSubject={activeSubject}
                            onFullCycleComplete={actions.finishStudying}
                            categories={data.categories}
                            onStartStudying={actions.startStudying}
                            onUpdateStudyTime={actions.handleUpdateStudyTime}
                        />
                    </div>
                ) : (
                    <div className="animate-fade-in pb-24">
                        <Checklist
                            categories={data.categories}
                            activeSubject={activeSubject}
                            onToggleTask={actions.toggleTask}
                            onDeleteTask={actions.deleteTask}
                            onAddTask={actions.addTask}
                            onAddCategory={actions.addCategory}
                            onDeleteCategory={actions.deleteCategory}
                            onPlayContext={actions.startStudying}
                            onTogglePriority={actions.togglePriority}
                        />
                    </div>
                )}
            </main>

            {/* 3. Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-md border-t border-white/10 px-6 py-4 flex justify-around items-center z-50 pb-6 safe-area-pb">
                <button
                    onClick={() => setActiveTab('pomodoro')}
                    className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'pomodoro' ? 'text-purple-400' : 'text-slate-500'
                        }`}
                >
                    <Clock size={24} />
                    <span className="text-xs font-medium">Focar</span>
                </button>

                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tasks' ? 'text-blue-400' : 'text-slate-500'
                        }`}
                >
                    <CheckSquare size={24} />
                    <span className="text-xs font-medium">Tarefas</span>
                </button>
            </nav>
        </div>
    );
}
