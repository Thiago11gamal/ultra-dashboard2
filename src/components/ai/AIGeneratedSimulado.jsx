import React, { useState, useEffect, useCallback, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { generateAIQuestions } from '../../services/aiQuestionService';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../hooks/useToast';
import { getDateKey, normalizeDate } from '../../utils/dateHelper';
import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';
import { computeCategoryStats } from '../../engine';
import { 
  BookOpen, ListChecks, Target, Clock, Award, CheckCircle2, XCircle, 
  ArrowLeft, ArrowRight, RefreshCw, Brain, Play, Sparkles, Zap,
  Trophy, TrendingUp, BarChart3, ChevronDown
} from 'lucide-react';

const DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
  { value: 'expert', label: 'Expert' },
];

const AI_SIM_STORAGE_KEY = 'ai_simulado_draft';

export default function AIGeneratedSimulado() {
  const setData = useAppStore(state => state.setData);
  const categories = useAppStore(state => {
    const active = state.appState?.contests?.[state.appState?.activeId];
    return active?.categories || [];
  });
  const showToast = useToast();

  const [step, setStep] = useState('setup');
  const [form, setForm] = useState({
    categoryId: '',
    taskId: '',
    materia: '',
    assunto: '',
    dificuldade: 'medio',
    quantidade: 10,
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes default
  const [timerActive, setTimerActive] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Refs for latest state (to avoid stale closures in timer / keyboard / auto-finish)
  const latestAnswersRef = useRef(answers);
  const latestQuestionsRef = useRef(questions);
  const latestFormRef = useRef(form);
  const isFinishingRef = useRef(false);
  const latestCurrentIndexRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { latestAnswersRef.current = answers; }, [answers]);
  useEffect(() => { latestQuestionsRef.current = questions; }, [questions]);
  useEffect(() => { latestFormRef.current = form; }, [form]);
  useEffect(() => { latestCurrentIndexRef.current = currentIndex; }, [currentIndex]);

  // Persist draft to localStorage
  useEffect(() => {
    if (step === 'playing' && questions.length > 0) {
      const draft = {
        form,
        questions,
        answers,
        currentIndex,
        timeLeft,
        savedAt: Date.now()
      };
      localStorage.setItem(AI_SIM_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [step, questions, answers, currentIndex, timeLeft, form]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(AI_SIM_STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        // Only restore if less than 24h old
        if (Date.now() - (draft.savedAt || 0) < 24 * 60 * 60 * 1000 && draft.questions?.length > 0) {
          // Use microtask/timeout to avoid sync setState in effect lint error
          setTimeout(() => {
            const f = draft.form || {};
            // Validar se os IDs do rascunho ainda existem (usuário pode ter deletado matéria/assunto)
            let restoredForm = {
              categoryId: f.categoryId || '',
              taskId: f.taskId || '',
              materia: f.materia || '',
              assunto: f.assunto || '',
              dificuldade: f.dificuldade || 'medio',
              quantidade: f.quantidade || 10,
            };

            const stillValidCat = restoredForm.categoryId && categories.some(c => c.id === restoredForm.categoryId);
            const stillValidTask = restoredForm.taskId && stillValidCat && 
                                   categories.find(c => c.id === restoredForm.categoryId)?.tasks?.some(t => t.id === restoredForm.taskId);

            if (restoredForm.categoryId && !stillValidCat) {
              restoredForm = { ...restoredForm, categoryId: '', taskId: '', materia: '', assunto: '' };
            } else if (restoredForm.taskId && !stillValidTask) {
              restoredForm = { ...restoredForm, taskId: '', assunto: '' };
            }

            setForm(restoredForm);
            setQuestions(draft.questions);
            setAnswers(draft.answers || {});
            setCurrentIndex(draft.currentIndex || 0);
            setTimeLeft(draft.timeLeft || 45 * 60);
            setStep('playing');
            setTimerActive(true);
            setShowReview(false);
            showToast('Simulado AI retomado do rascunho', 'info');
            // Keep draft until explicit finish/cancel so user can resume multiple times if needed
          }, 0);
        }
      } catch (err) {
        void err;
        localStorage.removeItem(AI_SIM_STORAGE_KEY);
      }
    }
  }, [showToast]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Seleção dependente de Matéria / Assunto (IDs exatos vindos das categories/tasks cadastradas)
  const handleCategorySelect = (catId) => {
    const cat = categories.find(c => c.id === catId);
    setForm(prev => ({
      ...prev,
      categoryId: catId || '',
      materia: cat ? cat.name : '',
      taskId: '',
      assunto: '',
    }));
  };

  const handleTaskSelect = (tskId) => {
    const cat = categories.find(c => c.id === form.categoryId);
    const tsk = cat?.tasks?.find(t => t.id === tskId);
    setForm(prev => ({
      ...prev,
      taskId: tskId || '',
      assunto: tsk ? (tsk.title || tsk.text || '') : '',
    }));
  };

  // Derivados para selects dependentes
  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const availableTasks = selectedCategory?.tasks || [];

  const handleGenerate = async () => {
    if (!form.categoryId || !form.taskId) {
      showToast('Selecione Matéria e Assunto cadastrados', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const generated = await generateAIQuestions({
        materia: form.materia.trim(),
        assunto: form.assunto.trim(),
        dificuldade: form.dificuldade,
        quantidade: form.quantidade,
      });

      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error('A IA não gerou questões válidas.');
      }

      // Normaliza + vincula aos IDs exatos da matéria/assunto selecionados
      const cat = categories.find(c => c.id === form.categoryId);
      const tsk = cat?.tasks?.find(t => t.id === form.taskId);

      const normalizedQuestions = generated.map((q, idx) => ({
        ...q,
        id: q.id || `ai-${Date.now()}-${idx}`,
        categoryId: form.categoryId,
        taskId: form.taskId,
        materia: cat?.name || form.materia,
        assunto: tsk ? (tsk.title || tsk.text || form.assunto) : form.assunto,
      }));

      isFinishingRef.current = false;
      setQuestions(normalizedQuestions);
      setAnswers({});
      setCurrentIndex(0);
      setTimeLeft(45 * 60);
      setStep('playing');
      setTimerActive(true);
      showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro na geração IA:', error);
      showToast(error.message || 'Erro ao gerar questões com IA. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const selectAnswer = useCallback((letra) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: letra,
    }));
  }, [currentQuestion]);

  const goTo = useCallback((index) => {
    const qLen = latestQuestionsRef.current.length || questions.length;
    if (index >= 0 && index < qLen) {
      setCurrentIndex(index);
    }
  }, [questions.length]);

  const saveAIResultsToSystem = async (formData, correct, total, _answeredQs) => {
    const todayKey = getDateKey(normalizeDate(new Date()));
    const materia = (formData.materia || '').trim();
    const assunto = (formData.assunto || '').trim();
    const categoryId = formData.categoryId || null;
    const taskId = formData.taskId || null;

    const computedScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    const diffMap = { facil: 0.7, medio: 1.0, dificil: 1.3, expert: 1.6 };
    const numericDifficulty = diffMap[formData.dificuldade] || 1.0;

    const newRow = {
      id: generateId('ai-row'),
      subject: materia,
      topic: assunto,
      categoryId,
      taskId,
      correct,
      total,
      score: computedScore,   // for compatibility with getSafeScore and filters
      date: todayKey,
      createdAt: new Date().toISOString(),
      isAuto: true,
      validated: true,        // treat AI played results as valid (like manual analyzer)
      source: 'ai-generated',
      difficulty: numericDifficulty,
    };

    setData(prev => {
      if (!prev) return prev;

      // 1. Atualiza simuladoRows – remove APENAS a row isAuto do mesmo (categoryId+taskId) ou (subject+topic) do dia
      // Isso corrige o bug de apagar simulados AI de outros assuntos no mesmo dia.
      const existingRows = prev.simuladoRows || [];
      const rowsToKeep = existingRows.filter(r => {
        if (!r.isAuto) return true;
        if (getDateKey(normalizeDate(r.date || r.createdAt)) !== todayKey) return true;

        // Match by ID (preferred) or by name
        const sameById = categoryId && r.categoryId && r.taskId && 
                         r.categoryId === categoryId && r.taskId === taskId;
        const sameByName = !categoryId && 
                           normalize(r.subject) === normalize(materia) && 
                           normalize(r.topic) === normalize(assunto);
        return !(sameById || sameByName);
      });
      const updatedRows = [...rowsToKeep, newRow];

      // 2. Atualiza simulados (histórico)
      const newSimEvent = {
        id: generateId('ai-sim'),
        date: todayKey,
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        total,
        correct,
        type: 'ai-simulado',
        subject: materia,
        categoryId,
        taskId,
        validated: true,
      };

      const existingSims = Array.isArray(prev.simulados) ? prev.simulados : [];
      // Apenas remove eventos AI do mesmo dia (não apaga eventos do analyzer)
      const simsWithoutToday = existingSims.filter(s => !(s.date === todayKey && (s.type === 'ai-simulado' || s.source === 'ai')));
      const updatedSims = [...simsWithoutToday, newSimEvent].slice(-100);

      // 3. Atualiza stats da categoria — preferindo match por ID exato (mais confiável)
      const newCategories = (prev.categories || []).map(cat => {
        const idMatch = categoryId && cat.id === categoryId;
        const nameMatch = !categoryId && normalize(cat.name) === normalize(materia);
        if (idMatch || nameMatch) {
          const catMaxScore = Number(cat.maxScore) || Number(prev.maxScore) || 100;
          let history = Array.isArray(cat.simuladoStats?.history) ? [...cat.simuladoStats.history] : [];

          // Melhorias lógicas: 
          // - Não apagar todo o dia se já existir entrada (permite múltiplos tópicos AI no mesmo dia)
          // - Encontrar ou criar entrada de hoje e fazer merge do tópico
          const todayIdx = history.findIndex(h => h.date === todayKey);

          const newTopicEntry = { name: assunto, correct, total, taskId };

          if (todayIdx !== -1) {
            // Merge no entry de hoje existente
            const existing = { ...history[todayIdx] };
            const existingTopics = Array.isArray(existing.topics) ? existing.topics.filter(t => {
              if (taskId && t.taskId) return t.taskId !== taskId;
              // fallback for legacy without taskId
              return normalize(t.name) !== normalize(assunto);
            }) : [];
            existingTopics.push(newTopicEntry);

            // Recalcular totais do dia
            const dayTotal = existingTopics.reduce((s, t) => s + (t.total || 0), 0);
            const dayCorrect = existingTopics.reduce((s, t) => s + (t.correct || 0), 0);

            history[todayIdx] = {
              ...existing,
              correct: dayCorrect,
              total: dayTotal,
              score: dayTotal > 0 ? Math.min(catMaxScore, (dayCorrect / dayTotal) * catMaxScore) : 0,
              topics: existingTopics,
              // Mantém difficulty do último ou podemos média
            };
          } else {
            history.push({
              date: todayKey,
              correct,
              total,
              score: total > 0 ? Math.min(catMaxScore, (correct / total) * catMaxScore) : 0,
              difficulty: formData.dificuldade === 'facil' ? 0.7 : formData.dificuldade === 'medio' ? 1.0 : formData.dificuldade === 'dificil' ? 1.3 : 1.6,
              topics: [newTopicEntry],
            });
          }

          // Ordenar por data (últimos primeiro ou como esperado)
          history = history.sort((a, b) => (a.date > b.date ? 1 : -1)).slice(-50);

          const statsResult = computeCategoryStats(history, cat.weight || 1, 60, catMaxScore);

          return {
            ...cat,
            simuladoStats: {
              ...(cat.simuladoStats || {}),
              history: history,
              average: statsResult ? Number((statsResult.mean || 0).toFixed(2)) : 0,
              trend: statsResult?.trend || 'stable',
              lastAttempt: total > 0 ? (correct / total) * catMaxScore : 0,
              level: statsResult?.level || 'BAIXO',
            },
          };
        }
        return cat;
      });

      return {
        ...prev,
        simuladoRows: updatedRows,
        simulados: updatedSims,
        categories: newCategories,
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const handleFinish = useCallback(async () => {
    // Use refs for the case when called from timer (avoids stale state)
    const qList = latestQuestionsRef.current.length > 0 ? latestQuestionsRef.current : questions;
    const ansMap = Object.keys(latestAnswersRef.current).length > 0 ? latestAnswersRef.current : answers;
    const f = latestFormRef.current;

    if (qList.length === 0) return;

    // Evita chamadas duplas (timer + clique) usando ref
    if (isFinishingRef.current || step === 'finished') return;
    isFinishingRef.current = true;

    let correctCount = 0;
    const answeredQuestions = [];

    qList.forEach(q => {
      const selected = ansMap[q.id];
      const isCorrect = selected === q.alternativa_correta;
      if (isCorrect) correctCount++;

      answeredQuestions.push({
        ...q,
        selected,
        isCorrect,
      });
    });

    const total = qList.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // === SALVA NO SISTEMA (mesma infraestrutura dos simulados) ===
    await saveAIResultsToSystem(f, correctCount, total, answeredQuestions);

    setResults({
      correct: correctCount,
      total,
      scorePercent,
      questions: answeredQuestions,
    });
    setStep('finished');
    setTimerActive(false);
    localStorage.removeItem(AI_SIM_STORAGE_KEY);
    showToast(`Simulado finalizado! ${correctCount}/${total} acertos`, 'success');

    // reset flag (though component will unmount the playing logic)
    setTimeout(() => { isFinishingRef.current = false; }, 0);
  }, [step]);  // step for the early guard; refs are stable

  // Timer effect (declared after handleFinish to avoid TDZ in deps)
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && step === 'playing') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, step, handleFinish]);

  const resetAll = () => {
    isFinishingRef.current = false;
    setStep('setup');
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(45 * 60);
    setTimerActive(false);
    setShowReview(false);
    localStorage.removeItem(AI_SIM_STORAGE_KEY);
    // mantém o form para nova geração rápida
  };

  const retrySameQuestions = () => {
    isFinishingRef.current = false;
    setAnswers({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(45 * 60);
    setTimerActive(true);
    setShowReview(false);
    setStep('playing');
    showToast('Questões reiniciadas. Boa sorte!', 'info');
  };

  // Keyboard shortcuts (placed after handler defs)
  useEffect(() => {
    if (step !== 'playing' || !currentQuestion) return;
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      const curIdx = latestCurrentIndexRef.current;
      const qLen = latestQuestionsRef.current.length || questions.length;
      if (['A','B','C','D'].includes(key)) { e.preventDefault(); selectAnswer(key); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(curIdx - 1); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (curIdx < qLen - 1) goTo(curIdx + 1); else handleFinish();
      } else if (e.key.toLowerCase() === 'escape') {
        e.preventDefault(); setTimerActive(false); setStep('setup');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentQuestion, handleFinish, questions.length]);

  // ==================== RENDER ====================

  if (step === 'setup') {
    const hasApiKey = !!(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
    const isReadyToGenerate = form.categoryId && form.taskId && hasApiKey;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full"
      >
        {/* ═══ HERO HEADER ═══ */}
        <div className="relative mb-8 overflow-hidden rounded-[28px] border border-white/[0.06]" style={{ background: 'linear-gradient(135deg, rgba(49,46,129,0.4) 0%, rgba(15,23,42,0.9) 50%, rgba(88,28,135,0.3) 100%)' }}>
          {/* Animated glow orbs */}
          <div className="absolute -left-20 -top-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-[80px] animate-pulse" />
          <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-purple-500/15 rounded-full blur-[60px]" style={{ animationDelay: '1s' }} />
          <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-indigo-400/20 via-transparent to-purple-400/20" />
          
          <div className="relative px-8 py-10 sm:px-10">
            <div className="flex items-start gap-5">
              {/* Animated icon */}
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="shrink-0 p-4 rounded-2xl border border-indigo-400/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(147,51,234,0.25))' }}
              >
                <Brain size={36} className="text-indigo-300" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <h2 className="text-[28px] sm:text-3xl font-black tracking-[-1px] text-white">Simulado IA</h2>
                  <span className="inline-flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-full font-black tracking-[2px] uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <Sparkles size={10} /> OFICIAL
                  </span>
                </div>
                <p className="text-slate-400 text-[14px] leading-relaxed max-w-md">
                  Questões geradas por IA e vinculadas ao seu painel. Resultados alimentam suas projeções e estatísticas.
                </p>
              </div>
            </div>
            
            {/* Stats bar */}
            <div className="flex items-center gap-5 mt-6 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Zap size={12} className="text-indigo-400" />
                <span>Gemini 3 Flash</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <BarChart3 size={12} className="text-purple-400" />
                <span>Atualiza Dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingUp size={12} className="text-emerald-400" />
                <span>Monte Carlo</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CONFIGURATION CARD ═══ */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[28px] border border-white/[0.06] overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.3) 0%, rgba(15,23,42,0.6) 100%)', backdropFilter: 'blur(20px)' }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="p-10 sm:p-14 flex flex-col items-center justify-center text-center min-h-[450px] relative z-10"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="w-24 h-24 rounded-full border-[3px] border-indigo-500/30 border-t-indigo-400 border-r-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
                  >
                    <Brain size={40} className="text-white animate-pulse" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360, scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute inset-2 rounded-full border border-dashed border-purple-400/40"
                  />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-3">
                  Sintetizando Simulado Inédito
                </h3>
                <p className="text-slate-400 text-[14px] max-w-sm leading-relaxed mb-6">
                  A Inteligência Artificial está formulando <strong className="text-indigo-300">{form.quantidade} questões</strong> exclusivas de nível <strong className="text-indigo-300">{DIFFICULTIES.find(d => d.value === form.dificuldade)?.label || 'Médio'}</strong> sobre <strong className="text-white">{form.assunto || 'o assunto selecionado'}</strong>.
                </p>
                
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2.5 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <Sparkles size={14} className="animate-pulse" />
                  Aguarde, isso pode levar alguns segundos...
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-7 sm:p-9"
              >
                {/* Section: Content - Melhorado visualmente */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <BookOpen size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-black text-sm tracking-[1.5px] text-white">CONTEÚDO OFICIAL</div>
                    <div className="text-[10px] text-slate-400 -mt-0.5">Escolha da sua lista cadastrada no Dashboard</div>
                  </div>
                </div>
                {form.categoryId && form.taskId && (
                  <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest">
                    VINCULADO ✓
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {/* Matéria + Assunto - Visual melhorado e conectado */}
                <div className="p-4 rounded-2xl bg-white/[0.015] border border-white/[0.06]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matéria */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-xs font-extrabold tracking-[1.5px] text-indigo-300/90 mb-2.5 pl-1">
                        <BookOpen size={13} /> MATÉRIA
                      </label>
                      <div className="relative">
                        <select
                          value={form.categoryId}
                          onChange={(e) => handleCategorySelect(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-400/70 focus:bg-slate-900 hover:border-white/25 transition-all rounded-2xl px-4 py-[15px] text-[15px] font-medium text-white outline-none appearance-none cursor-pointer pr-10"
                        >
                          <option value="">Selecione a matéria...</option>
                          {[...categories].sort((a,b) => (a.name||'').localeCompare(b.name||'')).map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300/70 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      {categories.length === 0 && (
                        <div className="mt-2 text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <XCircle size={12} /> Nenhuma matéria cadastrada.
                        </div>
                      )}
                    </div>

                    {/* Assunto */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-xs font-extrabold tracking-[1.5px] text-indigo-300/90 mb-2.5 pl-1">
                        <ListChecks size={13} /> ASSUNTO
                      </label>
                      <div className="relative">
                        <select
                          value={form.taskId}
                          onChange={(e) => handleTaskSelect(e.target.value)}
                          disabled={!form.categoryId || availableTasks.length === 0}
                          className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-400/70 focus:bg-slate-900 hover:border-white/25 transition-all rounded-2xl px-4 py-[15px] text-[15px] font-medium text-white outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pr-10"
                        >
                          <option value="">Selecione o assunto...</option>
                          {[...availableTasks].sort((a,b) => (a.title||a.text||'').localeCompare(b.title||b.text||'')).map((tsk) => {
                            const label = tsk.title || tsk.text || 'Sem título';
                            return <option key={tsk.id} value={tsk.id}>{label}</option>;
                          })}
                        </select>
                        <ChevronDown size={17} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-300/70 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      {form.categoryId && availableTasks.length === 0 && (
                        <div className="mt-2 text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <XCircle size={12} /> Nenhum assunto nesta matéria.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo da seleção - Feedback visual forte */}
                  {(form.categoryId || form.taskId) && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
                      <div className="text-slate-500 text-xs uppercase tracking-widest">Selecionado:</div>
                      <div className="font-semibold text-white flex-1 truncate">
                        {form.materia || '—'} 
                        {form.assunto && <span className="mx-1.5 text-indigo-400/60">›</span>}
                        {form.assunto || ''}
                      </div>
                      {form.categoryId && form.taskId && (
                        <div className="text-[10px] px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">PRONTO</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-7" />

            {/* Section: Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-3 tracking-[1px] uppercase">
                  <Target size={12} /> Dificuldade
                </label>
                <div className="flex gap-1.5">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleInputChange('dificuldade', d.value)}
                      className={`flex-1 py-2.5 text-[12px] font-bold rounded-xl border transition-all duration-200 ${form.dificuldade === d.value
                        ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/15 hover:bg-white/[0.02]'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-3 tracking-[1px] uppercase">
                  <ListChecks size={12} /> Questões
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 8, 10, 15, 20].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleInputChange('quantidade', q)}
                      className={`px-4 py-2.5 text-[13px] font-bold rounded-xl border transition-all duration-200 ${Number(form.quantidade) === q 
                        ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                        : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/15'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ready summary */}
            <AnimatePresence>
              {form.categoryId && form.taskId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-7 p-4 rounded-2xl border border-emerald-500/15 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(99,102,241,0.05))' }}>
                    <div className="p-1.5 rounded-lg bg-emerald-500/15">
                      <Play size={14} className="text-emerald-400" />
                    </div>
                    <div className="text-[13px]">
                      <span className="font-semibold text-white">Pronto:</span>{' '}
                      <span className="text-slate-400">{form.quantidade} questões • {DIFFICULTIES.find(d => d.value === form.dificuldade)?.label} • {form.assunto}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerate}
              disabled={isLoading || !isReadyToGenerate}
              whileHover={isReadyToGenerate && !isLoading ? { scale: 1.01 } : {}}
              whileTap={isReadyToGenerate && !isLoading ? { scale: 0.985 } : {}}
              className="group relative mt-8 w-full py-5 rounded-2xl font-black text-[15px] tracking-[2px] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ 
                background: isReadyToGenerate && !isLoading 
                  ? 'linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #4f46e5 100%)' 
                  : 'rgba(51,65,85,0.9)',
                color: isReadyToGenerate && !isLoading ? '#ffffff' : '#94a3b8',
                boxShadow: isReadyToGenerate && !isLoading ? '0 12px 40px -12px rgba(99,102,241,0.8), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'
              }}
            >
              {/* Sweep effect */}
              {isReadyToGenerate && !isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              <div className="relative flex items-center gap-3 z-10">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>SINTETIZANDO QUESTÕES...</span>
                  </>
                ) : (
                  <>
                    <Brain size={22} className={isReadyToGenerate ? 'animate-pulse' : ''} />
                    <span>INICIAR GERAÇÃO IA</span>
                  </>
                )}
              </div>
            </motion.button>

            {/* Footer info */}
            <div className="text-center mt-4 space-y-1">
              <p className="text-[10px] text-slate-600">Vinculado aos IDs oficiais • Resultados alimentam seu dashboard e projeções</p>
              {!hasApiKey && (
                <p className="text-xs text-rose-400 font-medium">Configure sua chave de API (VITE_GEMINI_API_KEY) e reinicie o servidor</p>
              )}
            </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }

  if (step === 'playing' && currentQuestion) {
    const answeredCount = Object.keys(answers).length;
    const timeColor = timeLeft < 180 ? 'text-red-400 border-red-500/30' : timeLeft < 300 ? 'text-amber-400 border-amber-500/30' : 'text-slate-300 border-white/10';
    const difficultyLabel = DIFFICULTIES.find(d => d.value === form.dificuldade)?.label || form.dificuldade;

    return (
      <div className="w-full">
        {/* ═══ TOP BAR ═══ */}
        <div className="mb-6 rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(15,23,42,0.7))', backdropFilter: 'blur(20px)' }}>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[10px] font-black tracking-[1.5px]">IA</div>
                <div className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-bold text-slate-500">{difficultyLabel.toUpperCase()}</div>
              </div>
              <div className="text-[15px] font-bold text-white truncate">
                {form.materia} <span className="text-slate-600 mx-1">›</span> <span className="text-slate-400 font-medium">{form.assunto}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-mono text-slate-500">{currentIndex + 1} / {questions.length}</div>
                <div className="text-[10px] font-bold text-emerald-400/80">{answeredCount} respondidas</div>
              </div>

              {/* Timer */}
              <div className={`flex items-center gap-2 font-mono font-black text-lg px-4 py-2 rounded-xl border transition-colors ${timeColor}`} style={{ background: timeLeft < 180 ? 'rgba(239,68,68,0.08)' : timeLeft < 300 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)' }}>
                <Clock size={16} className="opacity-60" />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="px-5 pb-3">
            <div className="flex gap-1 mb-1.5">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${isCurrent ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]' : isAnswered ? 'bg-emerald-400/70' : 'bg-white/10 hover:bg-white/25'}`}
                    title={`Questão ${i + 1}`}
                  />
                );
              })}
            </div>
            <div className="text-center text-[9px] text-slate-600 font-medium tracking-[2px]">A B C D • ← → • ENTER • ESC</div>
          </div>
        </div>

        {/* ═══ QUESTION CARD ═══ */}
        <div className="relative min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-[24px] border border-white/[0.06] p-7 sm:p-8 mb-6"
              style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.25) 0%, rgba(15,23,42,0.5) 100%)', backdropFilter: 'blur(16px)' }}
            >
              {/* Question header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-black tracking-[2px] text-indigo-400">QUESTÃO {currentIndex + 1}</span>
                  {currentQuestion.categoryId && <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-600 font-bold tracking-wide">VINCULADA</span>}
                </div>
                <span className="text-[11px] font-mono text-slate-600">{currentIndex + 1}/{questions.length}</span>
              </div>
              
              {/* Enunciado */}
              <div className="text-[17px] leading-[1.7] font-medium text-white/90 tracking-[-0.2px] mb-8">
                {currentQuestion.enunciado}
              </div>

              {/* Alternatives */}
              <div className="space-y-2.5">
                {(currentQuestion.alternativas || []).map((alt, idx) => {
                  const isSelected = answers[currentQuestion.id] === alt.letra;
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => selectAnswer(alt.letra)}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      className={`group w-full text-left px-5 py-4 rounded-2xl border flex gap-4 items-center transition-all duration-200
                        ${isSelected 
                          ? 'border-indigo-400/60 shadow-[0_0_25px_rgba(99,102,241,0.2)]' 
                          : 'border-white/10 hover:border-white/30 hover:bg-white/[0.03]'}`}
                      style={{
                        background: isSelected 
                          ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(147,51,234,0.1))' 
                          : 'rgba(15,23,42,0.5)'
                      }}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black border transition-all duration-200
                        ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800/60 border-slate-600 text-slate-300 group-hover:border-slate-400 group-hover:text-white'}`}>
                        {alt.letra}
                      </div>
                      <div className={`text-[15px] leading-snug flex-1 transition-colors ${isSelected ? 'text-white font-bold' : 'text-slate-200 group-hover:text-white'}`}>
                        {alt.texto}
                      </div>
                      {isSelected && (
                        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} className="shrink-0">
                          <CheckCircle2 size={20} className="text-indigo-400" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══ NAVIGATION ═══ */}
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="px-5 py-3 rounded-xl border border-white/[0.08] text-[13px] font-semibold flex items-center gap-2 hover:bg-white/[0.04] disabled:opacity-30 transition"
          >
            <ArrowLeft size={15} /> Anterior
          </button>

          <div className="text-[12px] text-slate-600 font-mono tabular-nums">{answeredCount}/{questions.length}</div>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="px-6 py-3 rounded-xl text-[13px] font-black flex items-center gap-2 transition shadow-[0_4px_15px_-4px_rgba(99,102,241,0.4)]"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
            >
              Próxima <ArrowRight size={15} />
            </button>
          ) : (
            <motion.button
              onClick={handleFinish}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-black flex items-center gap-2 transition shadow-[0_4px_15px_-4px_rgba(16,185,129,0.4)]"
            >
              FINALIZAR <Award size={16} />
            </motion.button>
          )}
        </div>

        <div className="text-center mt-4">
          <button 
            onClick={() => { setTimerActive(false); localStorage.removeItem(AI_SIM_STORAGE_KEY); setStep('setup'); }} 
            className="text-[11px] text-slate-600 hover:text-slate-400 transition"
          >
            Cancelar e voltar
          </button>
        </div>
      </div>
    );
  }

  if (step === 'finished' && results) {
    const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;
    const colorMap = accuracy >= 80 
      ? { text: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.2)' }
      : accuracy >= 60 
        ? { text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.2)' }
        : { text: '#fb7185', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)', glow: 'rgba(244,63,94,0.2)' };

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* ═══ HERO SCORE ═══ */}
        <div className="relative text-center mb-10 py-10">
          {/* Background glow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[100px] pointer-events-none" style={{ background: colorMap.glow }} />
          
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black tracking-[2px] mb-8"
            style={{ background: colorMap.bg, color: colorMap.text, border: `1px solid ${colorMap.border}` }}
          >
            <Trophy size={14} /> SIMULADO CONCLUÍDO
          </motion.div>

          <div className="flex justify-center items-baseline gap-3 mb-3">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
              className="text-[96px] sm:text-[120px] leading-none font-black tracking-[-8px] text-white tabular-nums"
              style={{ textShadow: `0 0 60px ${colorMap.glow}` }}
            >
              {results.correct}
            </motion.div>
            <div className="text-4xl text-slate-700 font-light">/</div>
            <div className="text-5xl font-black text-slate-600 tracking-tight">{results.total}</div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-black tracking-tighter"
            style={{ color: colorMap.text }}
          >
            {accuracy}%
          </motion.div>
          <div className="text-[12px] font-semibold text-slate-500 mt-2 tracking-[2px] uppercase">Aproveitamento Geral</div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="flex justify-center mb-7">
          <div className="inline-flex p-1 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <button 
              onClick={() => setShowReview(false)}
              className={`px-6 py-2.5 text-[13px] font-bold rounded-[10px] transition flex items-center gap-2 ${!showReview ? 'bg-white text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}
            >
              <Award size={15} /> Resumo
            </button>
            <button 
              onClick={() => setShowReview(true)}
              className={`px-6 py-2.5 text-[13px] font-bold rounded-[10px] transition flex items-center gap-2 ${showReview ? 'bg-white text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'}`}
            >
              <ListChecks size={15} /> Revisar
            </button>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <AnimatePresence mode="wait">
          {!showReview ? (
            <motion.div 
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[24px] border border-white/[0.06] p-8 mb-8"
              style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.25), rgba(15,23,42,0.5))' }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl">
                  <div className="text-[44px] leading-none font-black text-emerald-400">{results.correct}</div>
                  <div className="uppercase tracking-[2px] text-[10px] font-bold text-emerald-400/60 mt-2">ACERTOS</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl">
                  <div className="text-[44px] leading-none font-black text-rose-400">{results.total - results.correct}</div>
                  <div className="uppercase tracking-[2px] text-[10px] font-bold text-rose-400/60 mt-2">ERROS</div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-6 rounded-2xl">
                  <div className="text-[44px] leading-none font-black" style={{ color: colorMap.text }}>{accuracy}%</div>
                  <div className="uppercase tracking-[2px] text-[10px] font-bold text-slate-500 mt-2">APROVEITAMENTO</div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[24px] border border-white/[0.06] p-5 sm:p-6 mb-8 max-h-[65vh] overflow-auto space-y-2.5"
              style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.2), rgba(15,23,42,0.4))' }}
            >
              {results.questions.map((q, idx) => {
                const isCorrect = q.isCorrect;
                return (
                  <div key={idx} className="p-5 rounded-2xl border" style={{ 
                    borderColor: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    background: isCorrect ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)'
                  }}>
                    <div className="flex gap-3 mb-3">
                      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${isCorrect ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}>
                        {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      </div>
                      <div className="font-medium text-white/90 text-[14px] leading-snug flex-1">{idx + 1}. {q.enunciado}</div>
                    </div>

                    <div className="pl-9 space-y-1.5 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-2">
                        <span className="font-mono px-2 py-0.5 bg-white/[0.04] rounded-md text-slate-400">Sua: <b className="text-white">{q.selected || '—'}</b></span>
                        {!isCorrect && <span className="font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-md">Correta: <b>{q.alternativa_correta}</b></span>}
                      </div>

                      {Array.isArray(q.alternativas) && q.alternativas.length > 0 && (
                        <div className="grid grid-cols-1 gap-0.5 text-[12px] pt-1">
                          {q.alternativas.map((alt, aIdx) => {
                            const isUserChoice = q.selected === alt.letra;
                            const isTheCorrect = alt.letra === q.alternativa_correta;
                            return (
                              <div key={aIdx} className={`px-2.5 py-1 rounded-lg flex gap-2 items-start ${isTheCorrect ? 'text-emerald-400 bg-emerald-500/[0.06]' : isUserChoice ? 'text-rose-400 line-through' : 'text-slate-500'}`}>
                                <span className="font-bold tabular-nums w-4 shrink-0">{alt.letra}.</span>
                                <span className="flex-1">{alt.texto}</span>
                                {isTheCorrect && <span className="text-[9px] text-emerald-500/70 font-black shrink-0 mt-0.5">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {q.justificativa && (
                        <div className="text-slate-400 leading-relaxed pt-2 text-[12.5px] border-l-2 border-white/[0.06] pl-3 mt-2">
                          {q.justificativa}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ ACTIONS ═══ */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4">
          <button 
            onClick={retrySameQuestions} 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500/[0.08] hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-[13px] font-bold flex items-center justify-center gap-2 transition active:scale-[0.985]"
          >
            <RefreshCw size={15} /> Refazer
          </button>
          
          <button 
            onClick={resetAll} 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-white/80 text-[13px] font-bold flex items-center justify-center gap-2 transition"
          >
            <Sparkles size={15} /> Gerar Novo
          </button>

          <button 
            onClick={() => {
              resetAll();
              showToast('Voltando ao menu de simulados', 'info');
            }} 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 transition shadow-[0_4px_15px_-4px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
          >
            <BarChart3 size={15} /> Voltar ao Menu
          </button>
        </div>

        <div className="text-center mt-6 text-[10px] text-slate-600 tracking-wide">
          Resultados salvos • Atualizam estatísticas oficiais e projeções Monte Carlo
        </div>
      </motion.div>
    );
  }

  return null;
}
