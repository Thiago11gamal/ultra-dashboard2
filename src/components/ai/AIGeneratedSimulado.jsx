import React, { useState, useEffect, useCallback, useRef } from 'react';

import { generateAIQuestions } from '../../services/aiQuestionService';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../hooks/useToast';
import { getDateKey, normalizeDate } from '../../utils/dateHelper';
import { generateId } from '../../utils/idGenerator';
import { normalize } from '../../utils/normalization';

import SimuladoSetup from './SimuladoSetup';
import SimuladoPlayer from './SimuladoPlayer';
import SimuladoResults from './SimuladoResults';
import { applyAIResultsToDraft } from '../../utils/aiSaveHelper';

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
    const rawCategories = active?.categories || [];
    return Array.isArray(rawCategories) ? rawCategories : Object.values(rawCategories);
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

  // NOVO: Estado para o relógio invisível individual
  const [timePerQuestion, setTimePerQuestion] = useState({});

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
  const latestCurrentIndexRef = useRef(currentIndex);
  
  // NOVO: Ref para garantir leitura fresca no timer
  const latestTimePerQuestionRef = useRef(timePerQuestion);
  const latestTimeLeftRef = useRef(timeLeft);

  // BUG FIX: Ref para o relógio absoluto do sistema, impedindo que o setInterval throttle perca o tempo
  const simStartMsRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { latestAnswersRef.current = answers; }, [answers]);
  useEffect(() => { latestQuestionsRef.current = questions; }, [questions]);
  useEffect(() => { latestFormRef.current = form; }, [form]);
  useEffect(() => { latestCurrentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { latestTimePerQuestionRef.current = timePerQuestion; }, [timePerQuestion]);
  useEffect(() => { latestTimeLeftRef.current = timeLeft; }, [timeLeft]);

  // Persist draft to localStorage
  useEffect(() => {
    if (step === 'playing' && questions.length > 0) {
      const draft = {
        form,
        questions,
        answers,
        currentIndex,
        timeLeft,
        timePerQuestion, // Guardar os relógios individuais
        savedAt: Date.now()
      };
      localStorage.setItem(AI_SIM_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [step, questions, answers, currentIndex, timeLeft, form, timePerQuestion]);

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
            setTimePerQuestion({});
            setCurrentIndex(0);
            setTimeLeft(normalizedQuestions.length * 3 * 60);
            setStep('playing');
            setTimerActive(true);
            simStartMsRef.current = Date.now();
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
                  setTimePerQuestion({});
                  setCurrentIndex(0);
                  setTimeLeft(normalizedQuestions.length * 3 * 60);
                  setStep('playing');
                  setTimerActive(true);
                  simStartMsRef.current = Date.now();
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
        console.error("[SecOps] Falha catastrófica de Parse no Storage local. Limpeza forçada.", err);
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
            setTimePerQuestion(draft.timePerQuestion || {});
            setCurrentIndex(draft.currentIndex || 0);
            setTimeLeft(draft.timeLeft || draft.questions.length * 3 * 60);
            setStep('playing');
            setTimerActive(true);
            simStartMsRef.current = Date.now();
            setShowReview(false);
            showToast('Simulado AI retomado do rascunho', 'info');
            // Keep draft until explicit finish/cancel so user can resume multiple times if needed
          }, 0);
        }
      } catch (err) {
        console.error("[SecOps] Falha catastrófica de Parse no Storage local. Limpeza forçada.", err);
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
        setTimePerQuestion({});
        setCurrentIndex(0);
        setTimeLeft(normalizedQuestions.length * 3 * 60);
        setStep('playing');
        setTimerActive(true);
        simStartMsRef.current = Date.now();
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
      setTimePerQuestion({});
      setCurrentIndex(0);
      setTimeLeft(normalizedQuestions.length * 3 * 60);
      setStep('playing');
      setTimerActive(true);
      simStartMsRef.current = Date.now();
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




    setData(draft => {
      if (!draft) return;

      // DELEGATED TO HELPER: Processamento massivo de Store (140 linhas puras extraídas para otimizar V8 JIT)
      applyAIResultsToDraft(draft, formData, correct, total, timeSpentSecs, preventGlobalEvent);

    });
  }, [setData]);

  const handleFinish = useCallback(async () => {
    // Use refs for the case when called from timer (avoids stale state)
    const qList = latestQuestionsRef.current.length > 0 ? latestQuestionsRef.current : questions;
    const ansMap = Object.keys(latestAnswersRef.current).length > 0 ? latestAnswersRef.current : answers;
    const f = latestFormRef.current;

    if (qList.length === 0) return;

    // Timer absoluto do sistema (evita problemas de tab inativa ou click rápido)
    const absoluteElapsedSecs = simStartMsRef.current ? Math.round((Date.now() - simStartMsRef.current) / 1000) : 0;
    const totalAllowedTime = qList.length * 3 * 60;
    const fallbackTimeSpent = Math.max(absoluteElapsedSecs, totalAllowedTime - latestTimeLeftRef.current);

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

    // BUG FIX: Calcula e consolida o tempo real absoluto antes de salvar
    const exactTotalTime = answeredQuestions.reduce((acc, q) => acc + (latestTimePerQuestionRef.current[q.id] || 0), 0);
    const finalTimeSpent = exactTotalTime > 0 ? exactTotalTime : fallbackTimeSpent;

    // === SALVA NO SISTEMA (mesma infraestrutura dos simulados) ===
    if (f.categoryId === 'mixed') {
      // Agrupa questões por matéria e assunto
      const groups = {};
      
      answeredQuestions.forEach(q => {
        const key = `${q.materia}|${q.assunto}`;
        if (!groups[key]) groups[key] = { materia: q.materia, assunto: q.assunto, correct: 0, total: 0, qs: [], timeSpent: 0 };
        groups[key].qs.push(q);
        groups[key].total++;
        if (q.isCorrect) groups[key].correct++;
        
        // SOMA INDIVIDUAL DOS RELÓGIOS DE CADA MATÉRIA
        const spent = latestTimePerQuestionRef.current[q.id] || 0;
        groups[key].timeSpent += spent;
      });
      
      const cats = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.categories || [];
      const totalQuestionsInMixed = Object.values(groups).reduce((acc, g) => acc + g.total, 0);
      const isExactClockValid = exactTotalTime > 0;
      
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
        
        // Correção do Bug de Inflação de Tempo
        const topicTime = isExactClockValid 
          ? g.timeSpent 
          : Math.round(fallbackTimeSpent * (g.total / totalQuestionsInMixed));
          
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
        isPercentage: true,
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
      await saveAIResultsToSystem(f, correctCount, total, answeredQuestions, finalTimeSpent);
    }

    setResults({
      correct: correctCount,
      total,
      scorePercent,
      questions: answeredQuestions,
      timeSpentSecs: finalTimeSpent,
    });
    setStep('finished');
    setTimerActive(false);
    localStorage.removeItem(AI_SIM_STORAGE_KEY);
    showToast(`Simulado finalizado! ${correctCount}/${total} acertos`, 'success');

    // reset flag (though component will unmount the playing logic)
    // Removed setTimeout to prevent race condition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveAIResultsToSystem, showToast, setData]); // Removed highly volatile deps, relying on refs instead

  // Timer effect (declared after handleFinish to avoid TDZ in deps)
  // BUG-6 FIX: Moved handleFinish call outside of setTimeLeft callback
  const timerFinishTriggerRef = useRef(false);
  useEffect(() => {
    if (timerFinishTriggerRef.current) {
      timerFinishTriggerRef.current = false;
      handleFinish();
    }
  }); // Run on every render to check the ref (safer than stale deps)

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

        // ⏱️ O RELÓGIO INVISÍVEL
        // A cada segundo contabiliza o tempo na questão atual, para gerar a barra fina exata de comparação de agilidade
        const currentQ = latestQuestionsRef.current[latestCurrentIndexRef.current];
        if (currentQ) {
            setTimePerQuestion(prev => ({
                ...prev,
                [currentQ.id]: (prev[currentQ.id] || 0) + 1
            }));
        }

      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, step]); // Removed timeLeft to prevent recreating interval every second

  const resetAll = useCallback(() => {
    isFinishingRef.current = false;
    setStep('setup');
    setQuestions([]);
    setAnswers({});
    setTimePerQuestion({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(form.quantidade * 3 * 60);
    setTimerActive(false);
    setShowReview(false);
    localStorage.removeItem(AI_SIM_STORAGE_KEY);
    // mantém o form para nova geração rápida
  }, [form.quantidade]);

  const retrySameQuestions = () => {
    isFinishingRef.current = false;
    setAnswers({});
    setTimePerQuestion({});
    setCurrentIndex(0);
    setResults(null);
    setTimeLeft(questions.length * 3 * 60);
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
  }, [step, currentQuestion, handleFinish, questions.length, goTo, selectAnswer, resetAll]);

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
    return (
      <SimuladoSetup 
        form={form}
        handleInputChange={handleInputChange}
        categories={categories}
        handleCategorySelect={handleCategorySelect}
        handleTaskSelect={handleTaskSelect}
        availableTasks={availableTasks}
        generatePersonalizedSimulado={generatePersonalizedSimulado}
        handleGenerate={handleGenerate}
        isLoading={isLoading}
        loadingMsgIdx={loadingMsgIdx}
        DIFFICULTIES={DIFFICULTIES}
        LOADING_MESSAGES={LOADING_MESSAGES}
      />
    );
  }

  if (step === 'playing' && currentQuestion) {
    return (
      <SimuladoPlayer 
        form={form}
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        timeLeft={timeLeft}
        DIFFICULTIES={DIFFICULTIES}
        goTo={goTo}
        selectAnswer={selectAnswer}
        handleFinish={handleFinish}
        resetAll={resetAll}
      />
    );
  }

  if (step === 'finished' && results) {
    return (
      <SimuladoResults 
        results={results}
        form={form}
        showReview={showReview}
        setShowReview={setShowReview}
        resetAll={resetAll}
        retrySameQuestions={retrySameQuestions}
        showToast={showToast}
      />
    );
  }

return null;
}
