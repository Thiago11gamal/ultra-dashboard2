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
const AI_GEN_STORAGE_KEY = 'ai_simulado_generating';

// BUG-2 FIX: Moved to module scope to avoid re-creation on every render
const LOADING_MESSAGES = [
  "Iniciando Motor Analítico...",
  "Identificando Banca Examinadora...",
  "Cruzando Jurisprudências Recentes...",
  "Formulando Enunciados Inéditos...",
  "Calibrando Nível de Dificuldade...",
  "Ajustando Pegadinhas e Casos Práticos...",
  "Finalizando Pacote de Questões..."
];

// Module-level promise to keep generation alive across component unmounts
let activeGenerationPromise = null;

// BUG-11 FIX: More unique ID generator to avoid collisions
let _aiIdCounter = 0;
function nextAiId(prefix = 'ai') {
  return `${prefix}-${Date.now()}-${++_aiIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

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
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // BUG-2 FIX: LOADING_MESSAGES moved to module scope (line ~27)

  // Track mount state to avoid clearing localStorage after unmount
  const mountedRef = useRef(true);
  // BUG-8 FIX: Track if initial mount effect already ran to avoid re-running on categories change
  const didMountRestoreRef = useRef(false);
  // BUG-9 FIX: Ref for step to avoid stale closure in handleFinish
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

  // Load draft or completed generation on mount
  useEffect(() => {
    // BUG-8 FIX: Only run restore logic once per mount cycle
    if (didMountRestoreRef.current) return;
    didMountRestoreRef.current = true;

    // 1. Check if there's a completed background generation
    const genData = localStorage.getItem(AI_GEN_STORAGE_KEY);
    if (genData) {
      try {
        const gen = JSON.parse(genData);
        if (gen.status === 'done' && gen.questions?.length > 0) {
          // Generation completed in background — restore it
          setTimeout(() => {
            const f = gen.form || {};
            setForm({
              categoryId: f.categoryId || '',
              taskId: f.taskId || '',
              materia: f.materia || '',
              assunto: f.assunto || '',
              dificuldade: f.dificuldade || 'medio',
              quantidade: f.quantidade || 10,
            });

            // Normalize with current categories
            const cat = categories.find(c => c.id === f.categoryId);
            const tsk = cat?.tasks?.find(t => t.id === f.taskId);
            const normalizedQuestions = gen.questions.map((q) => ({
              ...q,
              id: q.id || nextAiId('ai-bg'),
              categoryId: f.categoryId,
              taskId: f.taskId,
              materia: cat?.name || f.materia,
              assunto: tsk ? (tsk.title || tsk.text || f.assunto) : f.assunto,
            }));

            isFinishingRef.current = false;
            setQuestions(normalizedQuestions);
            setAnswers({});
            setCurrentIndex(0);
            setTimeLeft(45 * 60);
            setStep('playing');
            setTimerActive(true);
            setShowReview(false);
            setIsLoading(false);
            localStorage.removeItem(AI_GEN_STORAGE_KEY);
            showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
          }, 0);
          return;
        } else if (gen.status === 'error') {
          // Generation failed in background
          setTimeout(() => {
            showToast(gen.errorMessage || 'Erro ao gerar questões em segundo plano.', 'error');
            localStorage.removeItem(AI_GEN_STORAGE_KEY);
            setIsLoading(false);
          }, 0);
          return;
        } else if (gen.status === 'generating') {
          // Generation still in progress — attach to the module-level promise
          setTimeout(() => {
            const f = gen.form || {};
            setForm({
              categoryId: f.categoryId || '',
              taskId: f.taskId || '',
              materia: f.materia || '',
              assunto: f.assunto || '',
              dificuldade: f.dificuldade || 'medio',
              quantidade: f.quantidade || 10,
            });
            setIsLoading(true);
            setStep('setup');

            if (activeGenerationPromise) {
              // Attach to the running promise
              activeGenerationPromise.then((normalizedQuestions) => {
                if (normalizedQuestions && normalizedQuestions.length > 0) {
                  isFinishingRef.current = false;
                  setQuestions(normalizedQuestions);
                  setAnswers({});
                  setCurrentIndex(0);
                  setTimeLeft(45 * 60);
                  setStep('playing');
                  setTimerActive(true);
                  setIsLoading(false);
                  localStorage.removeItem(AI_GEN_STORAGE_KEY);
                  showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
                }
              }).catch((error) => {
                setIsLoading(false);
                localStorage.removeItem(AI_GEN_STORAGE_KEY);
                showToast(error.message || 'Erro ao gerar questões.', 'error');
              });
            } else {
              // Promise was lost (page reload) but status says generating — check age
              const age = Date.now() - (gen.startedAt || 0);
              if (age > 5 * 60 * 1000) {
                // More than 5 min old, consider it failed
                localStorage.removeItem(AI_GEN_STORAGE_KEY);
                setIsLoading(false);
              }
              // Otherwise stay in loading state, it might complete
            }
          }, 0);
          return;
        }
      } catch (err) {
        void err;
        localStorage.removeItem(AI_GEN_STORAGE_KEY);
      }
    }

    // 2. Check for a playing draft
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
  }, [showToast, categories]);

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

  const generatePersonalizedSimulado = async () => {
    // 1. Encontra fraquezas
    const allTasks = [];
    categories.forEach(cat => {
      const stats = cat.simuladoStats;
      const level = stats?.level || 'BAIXO';
      const avg = stats?.average || 0;
      
      cat.tasks?.forEach(tsk => {
        const title = String(tsk.title || tsk.text || '').trim();
        if (title) {
          allTasks.push({ catId: cat.id, taskId: tsk.id, materia: cat.name, assunto: title, level, avg });
        }
      });
    });

    const levelScore = { 'BAIXO': 1, 'MÉDIO': 2, 'ALTO': 3 };
    allTasks.sort((a, b) => {
      const lsA = levelScore[a.level] || 1;
      const lsB = levelScore[b.level] || 1;
      if (lsA !== lsB) return lsA - lsB;
      return a.avg - b.avg;
    });

    // Pega as 5 piores (ou menos) matérias/assuntos
    const worstTasks = allTasks.slice(0, 5);
    
    if (worstTasks.length === 0) {
      showToast('Cadastre matérias e assuntos no Dashboard primeiro.', 'warning');
      return;
    }

    const assuntoString = worstTasks.map(t => `- Matéria: ${t.materia} | Assunto: ${t.assunto} (Nível: ${t.level})`).join('\n');
    
    // Inteligência Adaptativa de Dificuldade
    // Níveis: BAIXO=1, MÉDIO=2, ALTO=3
    const avgDifficulty = worstTasks.reduce((acc, t) => acc + (levelScore[t.level] || 1), 0) / worstTasks.length;
    let adaptiveDifficulty = 'medio';
    if (avgDifficulty >= 2.5) {
      adaptiveDifficulty = 'expert'; // Se suas piores matérias já estão no nível ALTO
    } else if (avgDifficulty >= 1.5) {
      adaptiveDifficulty = 'dificil'; // Se suas piores matérias estão no nível MÉDIO
    } else {
      adaptiveDifficulty = 'medio'; // Se a maioria for nível BAIXO
    }
    
    setForm(prev => ({
      ...prev,
      categoryId: 'mixed',
      taskId: 'mixed',
      materia: 'Simulado Personalizado',
      assunto: assuntoString,
      dificuldade: adaptiveDifficulty,
      quantidade: 10
    }));

    setIsLoading(true);

    const genForm = { categoryId: 'mixed', taskId: 'mixed', materia: 'Simulado Personalizado', assunto: assuntoString, dificuldade: adaptiveDifficulty, quantidade: 10 };
    const genState = { status: 'generating', form: genForm, startedAt: Date.now() };
    localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify(genState));

    const activeContestName = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.name || 'Concurso Geral';

    activeGenerationPromise = (async () => {
      try {
        const generated = await generateAIQuestions({
          materia: 'Simulado Personalizado',
          assunto: assuntoString,
          dificuldade: adaptiveDifficulty,
          quantidade: 10,
          contestName: activeContestName,
        });

        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('A IA não gerou questões válidas.');
        }

        const normalizedQuestions = generated.map((q) => ({
          ...q,
          id: q.id || nextAiId('ai-pers'),
          categoryId: 'mixed',
          taskId: 'mixed',
        }));

        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'done',
          form: genForm,
          questions: normalizedQuestions,
          completedAt: Date.now(),
        }));
        return normalizedQuestions;
      } catch (err) {
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'error',
          errorMessage: err.message,
        }));
        return null;
      }
    })();

    // BUG-1 FIX: Use await directly instead of setTimeout with stale isLoading closure
    try {
      const normalizedQuestions = await activeGenerationPromise;
      activeGenerationPromise = null;

      if (!mountedRef.current) return;

      if (normalizedQuestions && normalizedQuestions.length > 0) {
        isFinishingRef.current = false;
        setQuestions(normalizedQuestions);
        setAnswers({});
        setCurrentIndex(0);
        setTimeLeft(45 * 60);
        setStep('playing');
        setTimerActive(true);
        setShowReview(false);
        setIsLoading(false);
        localStorage.removeItem(AI_GEN_STORAGE_KEY);
        showToast(`Personalizado: ${normalizedQuestions.length} questões focadas nas fraquezas!`, 'success');
      }
    } catch (error) {
      activeGenerationPromise = null;
      if (!mountedRef.current) return;
      setIsLoading(false);
      localStorage.removeItem(AI_GEN_STORAGE_KEY);
      showToast(error.message || 'Erro ao gerar questões personalizadas.', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!form.categoryId || !form.taskId) {
      showToast('Selecione Matéria e Assunto cadastrados', 'error');
      return;
    }

    setIsLoading(true);

    // Save generating state to localStorage so it persists across navigation
    const genState = {
      status: 'generating',
      form: { ...form },
      startedAt: Date.now(),
    };
    localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify(genState));

    // Create a module-level promise that survives component unmount
    const currentForm = { ...form };
    const currentCategories = [...categories];

    const activeContestName = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.name || 'Concurso Geral';

    activeGenerationPromise = (async () => {
      try {
        const generated = await generateAIQuestions({
          materia: currentForm.materia.trim(),
          assunto: currentForm.assunto.trim(),
          dificuldade: currentForm.dificuldade,
          quantidade: currentForm.quantidade,
          contestName: activeContestName,
        });

        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('A IA não gerou questões válidas.');
        }

        // Normaliza + vincula aos IDs exatos da matéria/assunto selecionados
        const cat = currentCategories.find(c => c.id === currentForm.categoryId);
        const tsk = cat?.tasks?.find(t => t.id === currentForm.taskId);

        const normalizedQuestions = generated.map((q) => ({
          ...q,
          id: q.id || nextAiId('ai-gen'),
          categoryId: currentForm.categoryId,
          taskId: currentForm.taskId,
          materia: cat?.name || currentForm.materia,
          assunto: tsk ? (tsk.title || tsk.text || currentForm.assunto) : currentForm.assunto,
        }));

        // Save completed results to localStorage
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'done',
          form: currentForm,
          questions: normalizedQuestions,
          completedAt: Date.now(),
        }));

        return normalizedQuestions;
      } catch (error) {
        // Save error to localStorage
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'error',
          form: currentForm,
          errorMessage: error.message || 'Erro ao gerar questões com IA.',
          failedAt: Date.now(),
        }));
        throw error;
      }
    })();

    try {
      const normalizedQuestions = await activeGenerationPromise;
      activeGenerationPromise = null;

      // Only apply results if component is still mounted
      if (!mountedRef.current) {
        // Component unmounted — results are already saved in localStorage
        // They will be picked up on next mount
        return;
      }

      isFinishingRef.current = false;
      setQuestions(normalizedQuestions);
      setAnswers({});
      setCurrentIndex(0);
      setTimeLeft(45 * 60);
      setStep('playing');
      setTimerActive(true);
      localStorage.removeItem(AI_GEN_STORAGE_KEY);
      showToast(`${normalizedQuestions.length} questões geradas com sucesso!`, 'success');
    } catch (error) {
      activeGenerationPromise = null;
      if (!mountedRef.current) return; // Don't clear localStorage if unmounted
      console.error('Erro na geração IA:', error);
      showToast(error.message || 'Erro ao gerar questões com IA. Tente novamente.', 'error');
      localStorage.removeItem(AI_GEN_STORAGE_KEY);
    } finally {
      if (mountedRef.current) setIsLoading(false);
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

  const saveAIResultsToSystem = useCallback(async (formData, correct, total, _answeredQs, timeSpentSecs = 0, preventGlobalEvent = false) => {
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
      isAuto: false,
      validated: true,        // treat AI played results as valid (like manual analyzer)
      source: 'ai-generated',
      difficulty: numericDifficulty,
      timeSpent: timeSpentSecs,
    };

    setData(prev => {
      if (!prev) return prev;

      // 1. Atualiza simuladoRows – ACUMULA os acertos se for o mesmo (categoryId+taskId) ou (subject+topic) do dia
      const existingRows = prev.simuladoRows || [];
      let rowFound = false;
      const updatedRows = existingRows.map(r => {
        if (!r.isAuto && r.source !== 'ai-generated') return r;
        if (getDateKey(normalizeDate(r.date || r.createdAt)) !== todayKey) return r;

        // Match by ID (preferred) or by name
        const sameById = categoryId && r.categoryId && r.taskId && 
                         r.categoryId === categoryId && r.taskId === taskId;
        const sameByName = !categoryId && 
                           normalize(r.subject) === normalize(materia) && 
                           normalize(r.topic) === normalize(assunto);
                           
        if (sameById || sameByName) {
          rowFound = true;
          const newCorrect = (Number(r.correct) || 0) + correct;
          const newTotal = (Number(r.total) || 0) + total;
          const newTimeSpent = (Number(r.timeSpent) || 0) + timeSpentSecs;
          return {
            ...r,
            correct: newCorrect,
            total: newTotal,
            score: newTotal > 0 ? (newCorrect / newTotal) * 100 : 0,
            timeSpent: newTimeSpent,
            lastUpdated: new Date().toISOString()
          };
        }
        return r;
      });

      if (!rowFound) {
        updatedRows.push(newRow);
      }

      // 2. Atualiza simulados (histórico)
      const existingSims = Array.isArray(prev.simulados) ? prev.simulados : [];
      let updatedSims = existingSims;
      
      if (!preventGlobalEvent) {
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
          updatedSims = [...existingSims, newSimEvent].slice(-100);
      }

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

          const newTopicEntry = { name: assunto, correct, total, taskId, timeSpent: timeSpentSecs };

          if (todayIdx !== -1) {
            // Merge no entry de hoje existente (Acumula acertos/total se o tópico já existir)
            const existing = { ...history[todayIdx] };
            let topicFound = false;
            
            const existingTopics = (Array.isArray(existing.topics) ? existing.topics : []).map(t => {
              const isMatch = (taskId && t.taskId === taskId) || (!taskId && normalize(t.name) === normalize(assunto));
              if (isMatch) {
                topicFound = true;
                return {
                  ...t,
                  correct: (Number(t.correct) || 0) + correct,
                  total: (Number(t.total) || 0) + total,
                  timeSpent: (Number(t.timeSpent) || 0) + timeSpentSecs
                };
              }
              return t;
            });
            
            if (!topicFound) {
              existingTopics.push(newTopicEntry);
            }

            // Recalcular totais do dia
            const dayTotal = existingTopics.reduce((s, t) => s + (t.total || 0), 0);
            const dayCorrect = existingTopics.reduce((s, t) => s + (t.correct || 0), 0);

            const prevWeight = (existing.difficulty || 1.0) * (existing.total || 0);
            const newWeight = numericDifficulty * total;
            const newDiff = dayTotal > 0 ? (prevWeight + newWeight) / dayTotal : 1.0;

            history[todayIdx] = { 
              ...existing, 
              correct: dayCorrect, 
              total: dayTotal, 
              score: dayTotal > 0 ? Math.min(catMaxScore, (dayCorrect / dayTotal) * catMaxScore) : 0,
              difficulty: newDiff,
              topics: existingTopics 
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
  }, [setData]);

  const handleFinish = useCallback(async () => {
    // Use refs for the case when called from timer (avoids stale state)
    const qList = latestQuestionsRef.current.length > 0 ? latestQuestionsRef.current : questions;
    const ansMap = Object.keys(latestAnswersRef.current).length > 0 ? latestAnswersRef.current : answers;
    const f = latestFormRef.current;

    if (qList.length === 0) return;

    // BUG-9 FIX: Use ref instead of potentially stale closure value
    // Evita chamadas duplas (timer + clique) usando ref
    if (isFinishingRef.current || stepRef.current === 'finished') return;
    isFinishingRef.current = true;

    let correctCount = 0;
    const answeredQuestions = [];

    qList.forEach(q => {
      const selected = ansMap[q.id];
      // BUG-5 FIX: Distinguish unanswered from incorrect
      const wasAnswered = selected !== undefined && selected !== null;
      const isCorrect = wasAnswered && selected === q.alternativa_correta;
      if (isCorrect) correctCount++;

      answeredQuestions.push({
        ...q,
        selected: selected || null,
        isCorrect,
        wasAnswered,
      });
    });

    const total = qList.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const timeSpentSeconds = (45 * 60) - timeLeft;

    // === SALVA NO SISTEMA (mesma infraestrutura dos simulados) ===
    if (f.categoryId === 'mixed') {
      // Agrupa questões por matéria e assunto
      const groups = {};
      answeredQuestions.forEach(q => {
        const key = `${q.materia}|${q.assunto}`;
        if (!groups[key]) groups[key] = { materia: q.materia, assunto: q.assunto, correct: 0, total: 0, qs: [] };
        groups[key].qs.push(q);
        groups[key].total++;
        if (q.isCorrect) groups[key].correct++;
      });
      
      const cats = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.categories || [];
      const totalQuestionsInMixed = Object.values(groups).reduce((acc, g) => acc + g.total, 0);
      
      for (const g of Object.values(groups)) {
        const cat = cats.find(c => normalize(c.name) === normalize(g.materia));
        const tsk = cat?.tasks?.find(t => normalize(t.title || t.text || '') === normalize(g.assunto));
        
        const subForm = {
          ...f,
          materia: g.materia,
          assunto: g.assunto,
          categoryId: cat ? cat.id : null,
          taskId: tsk ? tsk.id : null,
        };
        const topicTime = totalQuestionsInMixed > 0 ? Math.round(timeSpentSeconds * (g.total / totalQuestionsInMixed)) : 0;
        await saveAIResultsToSystem(subForm, g.correct, g.total, g.qs, topicTime, true);
      }
      
      const todayKey = getDateKey(normalizeDate(new Date()));
      const globalMixedEvent = {
        id: generateId('ai-sim'),
        date: todayKey,
        score: totalQuestionsInMixed > 0 ? Math.round((correctCount / totalQuestionsInMixed) * 100) : 0,
        total: totalQuestionsInMixed,
        correct: correctCount,
        type: 'ai-simulado',
        subject: 'Simulado Misto (IA)',
        categoryId: 'mixed',
        taskId: null,
        validated: true,
      };
      
      setData(prev => {
         if (!prev) return prev;
         const existingSims = Array.isArray(prev.simulados) ? prev.simulados : [];
         return {
            ...prev,
            simulados: [...existingSims, globalMixedEvent].slice(-100),
            lastUpdated: new Date().toISOString()
         };
      });
    } else {
      await saveAIResultsToSystem(f, correctCount, total, answeredQuestions, timeSpentSeconds);
    }

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
  }, [answers, questions, saveAIResultsToSystem, showToast, timeLeft]);  // BUG-9 FIX: removed step from deps (using stepRef now)

  // Timer effect (declared after handleFinish to avoid TDZ in deps)
  // BUG-6 FIX: Moved handleFinish call outside of setTimeLeft callback
  const timerFinishTriggerRef = useRef(false);
  useEffect(() => {
    if (timerFinishTriggerRef.current) {
      timerFinishTriggerRef.current = false;
      handleFinish();
    }
  }, [timeLeft, handleFinish]);

  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && step === 'playing') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // BUG-6 FIX: Set flag to trigger handleFinish on next render, outside setter
            timerFinishTriggerRef.current = true;
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
        // BUG-4 FIX: Properly cleanup on ESC — clear localStorage and reset state
        e.preventDefault();
        resetAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // BUG-13 FIX: Use stable refs for goTo/selectAnswer (already using latestCurrentIndexRef/latestQuestionsRef inside)
  }, [step, currentQuestion, handleFinish, questions.length, goTo, selectAnswer]);

  // Loading messages effect
  // BUG-2 FIX: LOADING_MESSAGES is now module-scoped, .length is stable primitive
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
      }, 3500);
    } else {
      setTimeout(() => setLoadingMsgIdx(0), 0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

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
            
            {/* Stats bar & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-5 border-t border-white/[0.06]">
              <div className="flex items-center gap-5">
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
              
              {/* Botão Simulado Personalizado */}
              <button
                onClick={generatePersonalizedSimulado}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                <Brain size={16} />
                SIMULADO PERSONALIZADO
              </button>
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
                <div className="text-slate-400 text-[14px] max-w-md w-full leading-relaxed mb-6">
                  A Inteligência Artificial está formulando <strong className="text-indigo-300">{form.quantidade} questões</strong> exclusivas de nível <strong className="text-indigo-300">{DIFFICULTIES.find(d => d.value === form.dificuldade)?.label || 'Médio'}</strong> sobre:
                  
                  {form.categoryId === 'mixed' ? (
                    <ul className="mt-4 text-left space-y-2 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 shadow-inner overflow-hidden">
                      {(form.assunto || '').split('\n').filter(Boolean).map((line, i) => (
                        <li key={i} className="text-[12px] flex items-start gap-2 text-slate-300">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                           <span className="leading-tight">{line.replace(/^- /, '')}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 font-bold text-white">{form.assunto || 'o assunto selecionado'}</div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-4 py-2.5 rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-500">
                  <Sparkles size={14} className="animate-pulse shrink-0" />
                  {LOADING_MESSAGES[loadingMsgIdx]}
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
                      <div className="font-bold text-white text-sm mt-1 truncate">
                        {form.categoryId === 'mixed' ? (
                           <span>Simulado Personalizado <span className="mx-1.5 text-indigo-400/60">›</span> Foco em Múltiplas Fraquezas</span>
                        ) : (
                          <>
                            {form.materia || '—'} 
                            {form.assunto && <span className="mx-1.5 text-indigo-400/60">›</span>}
                            {form.assunto || ''}
                          </>
                        )}
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
                  {[1, 2, 5, 8, 10, 15, 20].map(q => (
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
                    <div className="text-[13px] truncate">
                      <span className="font-semibold text-white">Pronto:</span>{' '}
                      <span className="text-slate-400">{form.quantidade} questões • {DIFFICULTIES.find(d => d.value === form.dificuldade)?.label} • {form.categoryId === 'mixed' ? 'Foco em Fraquezas' : form.assunto}</span>
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
                    <span>{LOADING_MESSAGES[loadingMsgIdx].toUpperCase()}</span>
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
            onClick={resetAll}
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
        className="w-full min-h-[calc(100vh-160px)] flex flex-col gap-5"
      >
        {/* ═══ HERO: Score + Stats in one premium card ═══ */}
        <div className="relative rounded-[20px] overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(30,27,75,0.5) 0%, rgba(15,23,42,0.8) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Glow */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-48 rounded-full blur-[100px] pointer-events-none opacity-60" style={{ background: colorMap.glow }} />
          
          <div className="relative px-6 sm:px-10 pt-8 pb-6">
            {/* Badge */}
            <div className="flex justify-center mb-4">
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black tracking-[2.5px]"
                style={{ background: colorMap.bg, color: colorMap.text, border: `1px solid ${colorMap.border}` }}
              >
                <Trophy size={13} /> SIMULADO CONCLUÍDO
              </motion.div>
            </div>

            {/* Score */}
            <div className="flex justify-center items-baseline gap-2 mb-1">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="text-[64px] sm:text-[80px] leading-none font-black tracking-[-4px] text-white tabular-nums"
                style={{ textShadow: `0 0 50px ${colorMap.glow}` }}
              >
                {results.correct}
              </motion.div>
              <div className="text-2xl text-slate-600 font-light">/</div>
              <div className="text-3xl font-black text-slate-600 tracking-tight">{results.total}</div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <span className="text-3xl font-black tracking-tight" style={{ color: colorMap.text }}>{accuracy}%</span>
              <span className="text-[11px] font-semibold text-slate-500 ml-2 tracking-[1.5px] uppercase">aproveitamento</span>
            </motion.div>
          </div>

          {/* Stats strip */}
          {/* BUG-5 FIX: 4 columns to show unanswered separately */}
          <div className="grid grid-cols-4 border-t border-white/[0.06]">
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-emerald-400">{results.correct}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-emerald-400/50 mt-1.5">ACERTOS</div>
            </div>
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              {/* BUG-5 FIX: Show separate counts for errors and unanswered */}
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-rose-400">{results.questions.filter(q => q.wasAnswered && !q.isCorrect).length}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-rose-400/50 mt-1.5">ERROS</div>
            </div>
            <div className="py-4 px-3 text-center border-r border-white/[0.06]">
              <div className="text-[28px] sm:text-[32px] leading-none font-black text-slate-400">{results.questions.filter(q => !q.wasAnswered).length}</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-slate-500 mt-1.5">EM BRANCO</div>
            </div>
            <div className="py-4 px-3 text-center">
              <div className="text-[28px] sm:text-[32px] leading-none font-black" style={{ color: colorMap.text }}>{accuracy}%</div>
              <div className="uppercase tracking-[2px] text-[9px] font-bold text-slate-500 mt-1.5">TAXA</div>
            </div>
          </div>
        </div>

        {/* ═══ TABS + CONTENT ═══ */}
        <div className="rounded-[20px] border border-white/[0.06] overflow-hidden flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, rgba(30,27,75,0.15), rgba(15,23,42,0.35))' }}>
          {/* Tab header */}
          <div className="flex shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <button 
              onClick={() => setShowReview(false)}
              className={`flex-1 py-3 text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative ${!showReview ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Award size={14} /> Resumo
              {!showReview && <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-400" />}
            </button>
            <div className="w-px bg-white/[0.06]" />
            <button 
              onClick={() => setShowReview(true)}
              className={`flex-1 py-3 text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative ${showReview ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ListChecks size={14} /> Revisar Questões
              {showReview && <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-400" />}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              {!showReview ? (
                <motion.div 
                  key="summary"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-6 sm:p-10 flex flex-col justify-center items-center h-full min-h-[250px]"
                >
                  <div className="text-[12px] text-slate-500 mb-6 tracking-wider uppercase">Detalhes da Sessão</div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Matéria</div>
                      <div className="text-white font-medium text-[15px]">{form.materia || '—'}</div>
                    </div>
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assunto</div>
                      <div className="text-white font-medium text-[15px] truncate px-2" title={form.assunto}>{form.assunto || '—'}</div>
                    </div>
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nível</div>
                      <div className="text-white font-medium text-[15px] capitalize">{form.dificuldade}</div>
                    </div>
                    <div className="text-center p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tempo Gasto</div>
                      <div className="text-white font-medium text-[15px]">
                        {Math.floor((45 * 60 - Math.max(0, timeLeft)) / 60)}m {((45 * 60 - Math.max(0, timeLeft)) % 60).toString().padStart(2, '0')}s
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="review"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-4 sm:p-6 space-y-3"
                >
                  {results.questions.map((q, idx) => {
                    const isCorrect = q.isCorrect;
                    return (
                      <div key={idx} className="p-5 rounded-2xl border" style={{ 
                        borderColor: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                        background: isCorrect ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)'
                      }}>
                        <div className="flex gap-3 mb-3">
                          <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${isCorrect ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}>
                            {isCorrect ? <CheckCircle2 size={14} className="text-white" /> : <XCircle size={14} className="text-white" />}
                          </div>
                          <div className="font-medium text-white/90 text-[14px] leading-relaxed flex-1">{idx + 1}. {q.enunciado}</div>
                        </div>

                        <div className="pl-10 space-y-2 text-sm">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs mb-2">
                            <span className="font-mono px-2.5 py-0.5 bg-white/[0.04] rounded-md text-slate-400">Sua: <b className="text-white">{q.wasAnswered ? q.selected : <span className="text-slate-500 italic">em branco</span>}</b></span>
                            {!isCorrect && <span className="font-mono px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-md">Correta: <b>{q.alternativa_correta}</b></span>}
                          </div>

                          {Array.isArray(q.alternativas) && q.alternativas.length > 0 && (
                            <div className="grid grid-cols-1 gap-0.5 text-[12.5px] pt-1">
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
                            <div className="text-slate-400 leading-relaxed pt-2 text-[12.5px] border-l-2 border-white/[0.08] pl-3 mt-2">
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
          </div>
        </div>

        {/* ═══ ACTIONS ═══ */}
        <div className="shrink-0 grid grid-cols-3 gap-3">
          {/* Refazer — green accent */}
          <button 
            onClick={retrySameQuestions} 
            className="group relative py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.97]"
            style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 4px 20px -4px rgba(16,185,129,0.2)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <RefreshCw size={17} className="text-emerald-400" /> 
            <span className="text-emerald-300">Refazer</span>
          </button>
          
          {/* Gerar Novo — white/neutral */}
          <button 
            onClick={resetAll} 
            className="group relative py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.97]"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 20px -4px rgba(255,255,255,0.05)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Sparkles size={17} className="text-white/70" /> 
            <span className="text-white/80">Gerar Novo</span>
          </button>

          {/* Voltar ao Menu — primary indigo */}
          <button 
            onClick={() => {
              resetAll();
              showToast('Voltando ao menu de simulados', 'info');
            }} 
            className="group relative py-4 rounded-2xl text-[14px] font-black flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden active:scale-[0.97]"
            style={{ 
              background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 50%, #6366f1 100%)',
              border: '1px solid rgba(139,92,246,0.4)',
              boxShadow: '0 6px 30px -6px rgba(99,102,241,0.5)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <BarChart3 size={17} className="text-white" /> 
            <span className="text-white">Menu</span>
          </button>
        </div>

        <div className="text-center text-[10px] text-slate-600 tracking-wide">
          Resultados salvos • Atualizam estatísticas oficiais e projeções Monte Carlo
        </div>
      </motion.div>
    );
  }

  return null;
}
