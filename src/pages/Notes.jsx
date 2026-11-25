import { PageErrorBoundary } from '../components/ErrorBoundary';
import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, FileText, Plus, Search, Trash2, Edit2, BookOpen, Check, X } from 'lucide-react';
import TopicPerformance from '../components/TopicPerformance';
import ParetoAnalysis from '../components/ParetoAnalysis';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { reconcileContestCategoriesHistory } from '../utils/simuladoReconciler';
import { isSubjectMatch, normalize } from '../utils/normalization';
import { generateId } from '../utils/idGenerator';

export default function Notes() {
    const navigate = useNavigate();
    const showToast = useToast();
    const activeId = useAppStore(state => state.appState?.activeId || 'default');
    const activeContest = useAppStore(state => state.appState?.contests?.[state.appState?.activeId] || null);
    const setData = useAppStore(state => state.setData);
    const startPomodoroSession = useAppStore(state => state.startPomodoroSession);
    const [activeTab, setActiveTab] = useState('pareto');
    const [noteSearch, setNoteSearch] = useState('');
    const [noteSubjectFilter, setNoteSubjectFilter] = useState('all');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteForm, setNoteForm] = useState({ title: '', subject: '', content: '' });
    const [showNoteForm, setShowNoteForm] = useState(false);
    
    // FIX: Evitamos recriar o array `|| []` em cada renderização para não quebrar a memoização do useMemo
    const categoriesRaw = activeContest?.categories;
    const simuladoRowsRaw = activeContest?.simuladoRows;
    const contestMaxScore = activeContest?.maxScore ?? activeContest?.settings?.maxScore;
    const contestMinScore = activeContest?.minScore ?? activeContest?.settings?.minScore;
    const contestPenaltyPerWrong = activeContest?.penaltyPerWrong ?? activeContest?.settings?.penaltyPerWrong;

    // DATA-INTEGRITY-FIX: Reconstruct categories history by merging 'simuladoRows' (topics) 
    // with existing 'history' (aggregates) via shared pure reconciler.
    const enhancedCategories = useMemo(
        () => reconcileContestCategoriesHistory(
            categoriesRaw,
            simuladoRowsRaw,
            contestMaxScore,
            contestMinScore,
            { penaltyPerWrong: contestPenaltyPerWrong }
        ),
        [categoriesRaw, simuladoRowsRaw, contestMaxScore, contestMinScore, contestPenaltyPerWrong]
    );

    const maxScore = useMemo(() => {
        const parsedContestMax = Number(contestMaxScore);
        if (contestMaxScore !== null && contestMaxScore !== undefined && String(contestMaxScore).trim() !== '' && Number.isFinite(parsedContestMax) && parsedContestMax > 0) {
            return parsedContestMax;
        }
        const scores = enhancedCategories
            .map(c => Number(c?.maxScore))
            .filter(s => Number.isFinite(s) && s > 0);
        return scores.length > 0 ? Math.max(...scores) : 100;
    }, [enhancedCategories, contestMaxScore]);

    const minScore = useMemo(() => {
        const hasContestMin =
            contestMinScore !== null &&
            contestMinScore !== undefined &&
            typeof contestMinScore !== 'boolean' &&
            String(contestMinScore).trim() !== '' &&
            Number.isFinite(Number(contestMinScore));
        if (hasContestMin) return Number(contestMinScore);
        const catMins = enhancedCategories
            .map(c => c?.minScore)
            .filter(v => v !== null && v !== undefined && typeof v !== 'boolean' && String(v).trim() !== '' && Number.isFinite(Number(v)))
            .map(Number);
        return catMins.length > 0 ? Math.min(...catMins) : 0;
    }, [enhancedCategories, contestMinScore]);

    const handleStartTopicStudy = useCallback((categoryName, topicName) => {
        const matchedCat = enhancedCategories.find(c => c && isSubjectMatch(categoryName, c.name)) || enhancedCategories[0];
        const rawTasks = matchedCat?.tasks || [];
        const tasks = (Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks || {})).filter(Boolean);
        const normTopic = normalize(topicName || '');
        const matchedTask = tasks.find(t => normalize(t.title || t.text || '') === normTopic) ||
            tasks.find(t => normalize(t.title || t.text || '').includes(normTopic));

        if (typeof startPomodoroSession === 'function') {
            startPomodoroSession({
                categoryId: matchedCat?.id || categoryName || 'geral',
                taskId: matchedTask?.id || topicName || 'estudo-pareto',
                category: matchedCat?.name || categoryName || 'Geral',
                task: matchedTask ? (matchedTask.title || matchedTask.text) : (topicName || 'Revisão Focada'),
                priority: 'high',
                source: 'notes'
            });
            showToast(`Foco iniciado: ${categoryName} — ${topicName}`, 'success');
            navigate('/pomodoro');
        }
    }, [enhancedCategories, startPomodoroSession, showToast, navigate]);

    const handleStartFocusedSimulado = useCallback((categoryName, topicName) => {
        const matchedCat = enhancedCategories.find(c => c && isSubjectMatch(categoryName, c.name));
        navigate('/simulados', {
            state: {
                focusDrill: {
                    categoryId: matchedCat?.id || null,
                    subject: matchedCat?.name || categoryName || 'Geral',
                    topic: topicName || 'Geral'
                }
            }
        });
    }, [enhancedCategories, navigate]);

    const handleCreateTopicFlashcard = useCallback((categoryName, topicName) => {
        const matchedCat = enhancedCategories.find(c => c && isSubjectMatch(categoryName, c.name));
        navigate('/flashcards', {
            state: {
                focusSubject: matchedCat?.name || categoryName || 'Geral',
                focusCategoryId: matchedCat?.id || null,
                prefillCard: {
                    deckName: `Pontos Cegos — ${matchedCat?.name || categoryName || 'Geral'}`,
                    front: `[PONTO CRÍTICO] ${topicName}: quais são as regras e exceções mais cobradas?`,
                    back: ''
                }
            }
        });
    }, [enhancedCategories, navigate]);

    const studyNotes = useMemo(() => {
        const raw = activeContest?.studyNotes;
        return (Array.isArray(raw) ? raw : Object.values(raw || {})).filter(Boolean);
    }, [activeContest?.studyNotes]);

    const filteredNotes = useMemo(() => {
        const q = normalize(noteSearch || '');
        return studyNotes
            .filter(n => {
                if (noteSubjectFilter !== 'all' && n.subject !== noteSubjectFilter) return false;
                if (!q) return true;
                return normalize(`${n.title || ''} ${n.content || ''} ${n.subject || ''}`).includes(q);
            })
            .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }, [studyNotes, noteSearch, noteSubjectFilter]);

    const handleSaveNote = () => {
        if (!noteForm.title.trim() && !noteForm.content.trim()) {
            showToast('Preencha o título ou conteúdo do resumo.', 'warning');
            return;
        }
        const nowIso = new Date().toISOString();
        const chosenSubj = noteForm.subject || enhancedCategories[0]?.name || 'Geral';
        const matchedCat = enhancedCategories.find(c => c && c.name === chosenSubj);
        setData(contest => {
            if (!contest) return contest;
            const prevNotes = Array.isArray(contest.studyNotes) ? [...contest.studyNotes] : [];
            let nextNotes;
            if (editingNoteId) {
                nextNotes = prevNotes.map(n => n && n.id === editingNoteId ? {
                    ...n,
                    title: noteForm.title.trim() || 'Resumo sem título',
                    subject: chosenSubj,
                    ...(matchedCat?.id ? { categoryId: matchedCat.id } : {}),
                    content: noteForm.content.trim(),
                    updatedAt: nowIso
                } : n);
            } else {
                nextNotes = [
                    {
                        id: generateId('note'),
                        title: noteForm.title.trim() || 'Resumo sem título',
                        subject: chosenSubj,
                        ...(matchedCat?.id ? { categoryId: matchedCat.id } : {}),
                        content: noteForm.content.trim(),
                        createdAt: nowIso,
                        updatedAt: nowIso
                    },
                    ...prevNotes
                ];
            }
            return { ...contest, studyNotes: nextNotes, lastUpdated: nowIso };
        });
        setNoteForm({ title: '', subject: chosenSubj, content: '' });
        setEditingNoteId(null);
        setShowNoteForm(false);
        showToast(editingNoteId ? 'Resumo atualizado!' : 'Resumo salvo no caderno!', 'success');
    };

    const handleDeleteNote = (note) => {
        if (!note?.id) return;
        const nowIso = new Date().toISOString();
        useAppStore.getState().archiveToTrash?.({
            type: 'study_note',
            contestId: activeId,
            data: note
        });
        setData(contest => {
            if (!contest) return contest;
            const prevNotes = Array.isArray(contest.studyNotes) ? contest.studyNotes : [];
            const prevDeleted = Array.isArray(contest.deletedStudyNoteIds) ? contest.deletedStudyNoteIds : [];
            return {
                ...contest,
                studyNotes: prevNotes.filter(n => n && n.id !== note.id),
                deletedStudyNoteIds: [...prevDeleted.filter(e => e?.id !== note.id), { id: note.id, deletedAt: nowIso }].slice(-100),
                lastUpdated: nowIso
            };
        });
        showToast('Resumo movido para a Lixeira', 'info');
    };

    return (<PageErrorBoundary pageName="Notas">
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header & Switcher Pareto vs Caderno de Resumos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Notas, Pareto &amp; Resumos</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Cruze seus pontos cegos 80/20 com seus resumos estratégicos por disciplina
                    </p>
                </div>
                <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pareto')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'pareto'
                            ? 'bg-rose-500/20 border border-rose-400/40 text-rose-200 shadow-sm'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                    >
                        <Target size={14} />
                        <span>Pareto 80/20 &amp; Assuntos</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('notebook')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'notebook'
                            ? 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 shadow-sm'
                            : 'text-slate-400 hover:text-white border border-transparent'
                        }`}
                    >
                        <FileText size={14} />
                        <span>Caderno de Resumos ({studyNotes.length})</span>
                    </button>
                </div>
            </div>

            {activeTab === 'pareto' ? (
                <div className="h-full min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <TopicPerformance
                        categories={enhancedCategories}
                        maxScore={maxScore}
                        minScore={minScore}
                        onStartStudy={handleStartTopicStudy}
                        onStartSimulado={handleStartFocusedSimulado}
                        onCreateFlashcard={handleCreateTopicFlashcard}
                    />
                    <ParetoAnalysis
                        categories={enhancedCategories}
                        maxScore={maxScore}
                        minScore={minScore}
                        onStartStudy={handleStartTopicStudy}
                        onStartSimulado={handleStartFocusedSimulado}
                        onCreateFlashcard={handleCreateTopicFlashcard}
                    />
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                            <div className="relative flex-1 max-w-sm">
                                <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    value={noteSearch}
                                    onChange={(e) => setNoteSearch(e.target.value)}
                                    placeholder="Buscar nos seus resumos..."
                                    className="w-full rounded-xl bg-slate-900/80 border border-white/10 pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                                />
                            </div>
                            <select
                                value={noteSubjectFilter}
                                onChange={(e) => setNoteSubjectFilter(e.target.value)}
                                className="rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
                            >
                                <option value="all">Todas as matérias</option>
                                {enhancedCategories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                                <option value="Geral">Geral</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingNoteId(null);
                                setNoteForm({ title: '', subject: enhancedCategories[0]?.name || 'Geral', content: '' });
                                setShowNoteForm(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-colors cursor-pointer"
                        >
                            <Plus size={14} /> Novo Resumo
                        </button>
                    </div>

                    {showNoteForm && (
                        <div className="glass p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-white">
                                    {editingNoteId ? 'Editar Resumo' : 'Novo Resumo Estratégico'}
                                </h3>
                                <button type="button" onClick={() => setShowNoteForm(false)} className="text-slate-400 hover:text-white">
                                    <X size={15} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input
                                    value={noteForm.title}
                                    onChange={(e) => setNoteForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Título / Tópico (ex.: Súmulas Vinculantes STF)"
                                    className="sm:col-span-2 rounded-xl bg-slate-950/70 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                                />
                                <select
                                    value={noteForm.subject || enhancedCategories[0]?.name || 'Geral'}
                                    onChange={(e) => setNoteForm(p => ({ ...p, subject: e.target.value }))}
                                    className="rounded-xl bg-slate-950/70 border border-white/10 px-3.5 py-2.5 text-xs font-bold text-white"
                                >
                                    {enhancedCategories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                    <option value="Geral">Geral</option>
                                </select>
                            </div>
                            <textarea
                                rows={5}
                                value={noteForm.content}
                                onChange={(e) => setNoteForm(p => ({ ...p, content: e.target.value }))}
                                placeholder="Anote mnemônicos, prazos, artigos de lei seca ou esquemas de revisão..."
                                className="w-full rounded-xl bg-slate-950/70 border border-white/10 p-3.5 text-xs text-slate-200 leading-relaxed resize-y focus:border-indigo-400 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowNoteForm(false)} className="px-3.5 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-300 hover:text-white">
                                    Cancelar
                                </button>
                                <button type="button" onClick={handleSaveNote} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white">
                                    <Check size={13} /> Salvar Resumo
                                </button>
                            </div>
                        </div>
                    )}

                    {filteredNotes.length === 0 ? (
                        <div className="glass p-10 rounded-3xl border border-white/10 text-center space-y-2">
                            <FileText size={34} className="mx-auto text-indigo-400/50" />
                            <p className="text-sm font-bold text-slate-200">Nenhum resumo encontrado</p>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                Crie anotações rápidas de lei seca, jurisprudência e bisus por matéria e converta qualquer resumo em Flashcard FSRS com 1 clique.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredNotes.map(note => (
                                <div key={note.id} className="glass p-5 rounded-2xl border border-white/10 flex flex-col justify-between gap-3 hover:border-indigo-400/30 transition-colors">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                                                    {note.subject || 'Geral'}
                                                </span>
                                                <h4 className="text-sm font-black text-white mt-1.5">{note.title}</h4>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingNoteId(note.id);
                                                        setNoteForm({ title: note.title || '', subject: note.subject || 'Geral', content: note.content || '' });
                                                        setShowNoteForm(true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                                                    title="Editar resumo"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteNote(note)}
                                                    className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10"
                                                    title="Mover para a Lixeira"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
                                            {note.content}
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('pt-BR') : ''}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/flashcards', {
                                                state: {
                                                    focusSubject: note.subject || 'Geral',
                                                    focusCategoryId: note.categoryId || null,
                                                    prefillCard: {
                                                        deckName: `Resumos — ${note.subject || 'Geral'}`,
                                                        front: note.title || 'Pergunta do resumo',
                                                        back: (note.content || '').slice(0, 360)
                                                    }
                                                }
                                            })}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-[10px] font-bold transition-colors cursor-pointer"
                                        >
                                            <BookOpen size={11} /> Virar Flashcard
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    </PageErrorBoundary>);
}

