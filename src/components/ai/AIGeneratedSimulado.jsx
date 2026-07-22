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
import { quarantineRaw, safeGetJSON } from '../../utils/storageSafe';

const DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Médio' },
  { value: 'dificil', label: 'Difícil' },
  { value: 'expert', label: 'Expert' },
];

const AI_SIM_STORAGE_KEY = 'ai_simulado_draft';
const AI_GEN_STORAGE_KEY = 'ai_simulado_generating';

const LOADING_MESSAGES = [
  "Iniciando Motor Analítico...",
  "Identificando Banca Examinadora...",
  "Cruzando Jurisprudências Recentes...",
  "Formulando Enunciados Inéditos...",
  "Calibrando Nível de Dificuldade...",
  "Ajustando Pegadinhas e Casos Práticos...",
  "Finalizando Pacote de Questões..."
];

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
    categoryId: '', taskId: '', materia: '', assunto: '',
    dificuldade: 'medio', quantidade: 10,
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [timePerQuestion, setTimePerQuestion] = useState({});

  const mountedRef = useRef(true);
  const didMountRestoreRef = useRef(false);
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // FIX: activeGenerationPromise movido para useRef (não mais variável de módulo)
  const activeGenerationRef = useRef(null);

  const latestAnswersRef = useRef(answers);
  const latestQuestionsRef = useRef(questions);
  const latestFormRef = useRef(form);
  const isFinishingRef = useRef(false);
  const latestCurrentIndexRef = useRef(currentIndex);
  const latestTimePerQuestionRef = useRef(timePerQuestion);
  const latestTimeLeftRef = useRef(timeLeft);
  const simStartMsRef = useRef(null);

  useEffect(() => { latestAnswersRef.current = answers; }, [answers]);
  useEffect(() => { latestQuestionsRef.current = questions; }, [questions]);
  useEffect(() => { latestFormRef.current = form; }, [form]);
  useEffect(() => { latestCurrentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { latestTimePerQuestionRef.current = timePerQuestion; }, [timePerQuestion]);
  useEffect(() => { latestTimeLeftRef.current = timeLeft; }, [timeLeft]);

  // FIX: Draft persist com debounce de 5s (não a cada segundo)
  const draftTimeoutRef = useRef(null);
  useEffect(() => {
    if (step === 'playing' && questions.length > 0) {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
      draftTimeoutRef.current = setTimeout(() => {
        const draft = {
          form, questions, answers, currentIndex, timeLeft,
          timePerQuestion, savedAt: Date.now()
        };
        try {
          localStorage.setItem(AI_SIM_STORAGE_KEY, JSON.stringify(draft));
        } catch (e) {
          console.warn('[Draft] Storage full or unavailable:', e);
        }
      }, 5000);
    }
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [step, questions, answers, currentIndex, timeLeft, form, timePerQuestion]);

  // FIX: Effect de restore com deps vazias (ref já garante execução única)
  useEffect(() => {
    if (didMountRestoreRef.current) return;
    didMountRestoreRef.current = true;

    let timeoutId1;
    let timeoutId2;
    let cancelled = false;

    const gen = safeGetJSON(AI_GEN_STORAGE_KEY, null);
    if (gen) {
      if (gen.status === 'done' && gen.questions?.length > 0) {
        timeoutId1 = setTimeout(() => {
          if (cancelled) return;
          const f = gen.form || {};
          setForm({
            categoryId: f.categoryId || '', taskId: f.taskId || '',
            materia: f.materia || '', assunto: f.assunto || '',
            dificuldade: f.dificuldade || 'medio', quantidade: f.quantidade || 10,
          });
          const cat = categories.find(c => c.id === f.categoryId);
          const tsk = cat?.tasks?.find(t => t.id === f.taskId);
          const normalizedQuestions = gen.questions.map((q) => ({
            ...q,
            id: q.id || nextAiId('ai-bg'),
            categoryId: f.categoryId, taskId: f.taskId,
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
        return () => { cancelled = true; clearTimeout(timeoutId1); clearTimeout(timeoutId2); };
      } else if (gen.status === 'error') {
        timeoutId1 = setTimeout(() => {
          if (cancelled) return;
          showToast(gen.errorMessage || 'Erro ao gerar questões em segundo plano.', 'error');
          localStorage.removeItem(AI_GEN_STORAGE_KEY);
          setIsLoading(false);
        }, 0);
        return () => { cancelled = true; clearTimeout(timeoutId1); clearTimeout(timeoutId2); };
      } else if (gen.status === 'generating') {
        timeoutId1 = setTimeout(() => {
          if (cancelled) return;
          const f = gen.form || {};
          setForm({
            categoryId: f.categoryId || '', taskId: f.taskId || '',
            materia: f.materia || '', assunto: f.assunto || '',
            dificuldade: f.dificuldade || 'medio', quantidade: f.quantidade || 10,
          });
          setIsLoading(true);
          setStep('setup');
          if (activeGenerationRef.current) {
            activeGenerationRef.current.then((normalizedQuestions) => {
              if (cancelled || !mountedRef.current) return;
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
              if (cancelled || !mountedRef.current) return;
              setIsLoading(false);
              localStorage.removeItem(AI_GEN_STORAGE_KEY);
              showToast(error.message || 'Erro ao gerar questões.', 'error');
            });
          } else {
            const age = Date.now() - (gen.startedAt || 0);
            if (age > 5 * 60 * 1000) {
              localStorage.removeItem(AI_GEN_STORAGE_KEY);
              setIsLoading(false);
            }
          }
        }, 0);
        return () => { cancelled = true; clearTimeout(timeoutId1); clearTimeout(timeoutId2); };
      }
    }

    const draft = safeGetJSON(AI_SIM_STORAGE_KEY, null);
    if (draft) {
      function isSimuladoDraftValid(d) {
        if (!d || typeof d !== 'object') return false;
        if (!Array.isArray(d.questions) || d.questions.length === 0) return false;
        const savedAt = Number(d.savedAt || 0);
        const age = Date.now() - savedAt;
        return age < 24 * 60 * 60 * 1000;
      }
      if (isSimuladoDraftValid(draft)) {
        timeoutId2 = setTimeout(() => {
          if (cancelled) return;
          const f = draft.form || {};
          let restoredForm = {
            categoryId: f.categoryId || '', taskId: f.taskId || '',
            materia: f.materia || '', assunto: f.assunto || '',
            dificuldade: f.dificuldade || 'medio', quantidade: f.quantidade || 10,
          };
          const stillValidCat = restoredForm.categoryId && categories.some(c => c.id === restoredForm.categoryId);
          const catRef = categories.find(c => c.id === restoredForm.categoryId);
          const catTasksRef = catRef?.tasks || [];
          const safeTasksArray = Array.isArray(catTasksRef) ? catTasksRef : Object.values(catTasksRef);
          const stillValidTask = restoredForm.taskId && stillValidCat && safeTasksArray.some(t => t.id === restoredForm.taskId);
          if (restoredForm.categoryId && !stillValidCat) {
            restoredForm = { ...restoredForm, categoryId: '', taskId: '', materia: '', assunto: '' };
          } else if (restoredForm.taskId && !stillValidTask) {
            restoredForm = { ...restoredForm, taskId: '', assunto: '' };
          }
          const questions = Array.isArray(draft.questions) ? draft.questions : [];
          const answers = Array.isArray(draft.answers) ? draft.answers : (draft.answers || {});
          const maxIndex = Math.max(0, questions.length - 1);
          const currentIndex = Number.isInteger(draft.currentIndex)
            ? Math.min(Math.max(draft.currentIndex, 0), maxIndex) : 0;
          const timeLeft = Number.isFinite(draft.timeLeft)
            ? Math.max(0, draft.timeLeft) : draft.questions.length * 3 * 60;
          setForm(restoredForm);
          setQuestions(questions);
          setAnswers(answers);
          setTimePerQuestion(draft.timePerQuestion || {});
          setCurrentIndex(currentIndex);
          setTimeLeft(timeLeft);
          setStep('playing');
          setTimerActive(true);
          simStartMsRef.current = Date.now();
        }, 0);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // FIX: deps vazias — ref garante execução única

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (catId) => {
    const cat = categories.find(c => c.id === catId);
    setForm(prev => ({
      ...prev, categoryId: catId || '', materia: cat ? cat.name : '',
      taskId: '', assunto: '',
    }));
  };

  const handleTaskSelect = (tskId) => {
    const cat = categories.find(c => c.id === form.categoryId);
    const rawCatTasks = cat?.tasks || [];
    const safeCatTasks = Array.isArray(rawCatTasks) ? rawCatTasks : Object.values(rawCatTasks);
    const tsk = safeCatTasks.find(t => t.id === tskId);
    setForm(prev => ({
      ...prev, taskId: tskId || '',
      assunto: tsk ? (tsk.title || tsk.text || '') : '',
    }));
  };

  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const rawTasks = selectedCategory?.tasks || [];
  const availableTasks = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks);

  const generatePersonalizedSimulado = async () => {
    const allTasks = [];
    categories.forEach(cat => {
      const stats = cat.simuladoStats;
      const level = stats?.level || 'BAIXO';
      const avg = stats?.average || 0;
      const catTasksRaw = cat.tasks || [];
      const safeCatTasks = Array.isArray(catTasksRaw) ? catTasksRaw : Object.values(catTasksRaw);
      safeCatTasks.forEach(tsk => {
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
    const worstTasks = allTasks.slice(0, 5);
    if (worstTasks.length === 0) {
      showToast('Cadastre matérias e assuntos no Dashboard primeiro.', 'warning');
      return;
    }
    const assuntoString = worstTasks.map(t => `- Matéria: ${t.materia} | Assunto: ${t.assunto} (Nível: ${t.level})`).join('\n');
    const avgDifficulty = worstTasks.reduce((acc, t) => acc + (levelScore[t.level] || 1), 0) / worstTasks.length;
    let adaptiveDifficulty = 'medio';
    if (avgDifficulty >= 2.5) adaptiveDifficulty = 'expert';
    else if (avgDifficulty >= 1.5) adaptiveDifficulty = 'dificil';

    setForm(prev => ({
      ...prev, categoryId: 'mixed', taskId: 'mixed',
      materia: 'Simulado Personalizado', assunto: assuntoString,
      dificuldade: adaptiveDifficulty, quantidade: 10
    }));
    setIsLoading(true);

    const genForm = { categoryId: 'mixed', taskId: 'mixed', materia: 'Simulado Personalizado', assunto: assuntoString, dificuldade: adaptiveDifficulty, quantidade: 10 };
    const genState = { status: 'generating', form: genForm, startedAt: Date.now() };
    localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify(genState));
    const activeContestName = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.name || 'Concurso Geral';

    // FIX: Usar ref em vez de variável de módulo
    const localPromise = (async () => {
      try {
        const generated = await generateAIQuestions({
          materia: 'Simulado Personalizado', assunto: assuntoString,
          dificuldade: adaptiveDifficulty, quantidade: 10, contestName: activeContestName,
        });
        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('A IA não gerou questões válidas.');
        }
        const normalizedQuestions = generated.map((q) => ({
          ...q, id: q.id || nextAiId('ai-pers'), categoryId: 'mixed', taskId: 'mixed',
        }));
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'done', form: genForm, questions: normalizedQuestions, completedAt: Date.now(),
        }));
        return normalizedQuestions;
      } catch (err) {
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'error', errorMessage: err.message,
        }));
        return null;
      }
    })();
    activeGenerationRef.current = localPromise;

    try {
      const normalizedQuestions = await localPromise;
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
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
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
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
    const genState = { status: 'generating', form: { ...form }, startedAt: Date.now() };
    localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify(genState));
    const currentForm = { ...form };
    const currentCategories = [...categories];
    const activeContestName = useAppStore.getState().appState?.contests?.[useAppStore.getState().appState?.activeId]?.name || 'Concurso Geral';

    // FIX: Usar ref em vez de variável de módulo
    const localPromise = (async () => {
      try {
        const generated = await generateAIQuestions({
          materia: currentForm.materia.trim(), assunto: currentForm.assunto.trim(),
          dificuldade: currentForm.dificuldade, quantidade: currentForm.quantidade,
          contestName: activeContestName,
        });
        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error('A IA não gerou questões válidas.');
        }
        const cat = currentCategories.find(c => c.id === currentForm.categoryId);
        const rawGenTasks = cat?.tasks || [];
        const safeGenTasks = Array.isArray(rawGenTasks) ? rawGenTasks : Object.values(rawGenTasks);
        const tsk = safeGenTasks.find(t => t.id === currentForm.taskId);
        const normalizedQuestions = generated.map((q) => ({
          ...q, id: q.id || nextAiId('ai-gen'),
          categoryId: currentForm.categoryId, taskId: currentForm.taskId,
          materia: cat?.name || currentForm.materia,
          assunto: tsk ? (tsk.title || tsk.text || currentForm.assunto) : currentForm.assunto,
        }));
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'done', form: currentForm, questions: normalizedQuestions, completedAt: Date.now(),
        }));
        return normalizedQuestions;
      } catch (error) {
        localStorage.setItem(AI_GEN_STORAGE_KEY, JSON.stringify({
          status: 'error', form: currentForm, errorMessage: error.message || 'Erro ao gerar questões com IA.', failedAt: Date.now(),
        }));
        throw error;
      }
    })();
    activeGenerationRef.current = localPromise;

    try {
      const normalizedQuestions = await localPromise;
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
      if (!mountedRef.current) return;
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
      if (activeGenerationRef.current === localPromise) {
        activeGenerationRef.current = null;
      }
      if (!mountedRef.current) return;
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
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: letra }));
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
      applyAIResultsToDraft(draft, formData, correct, total, timeSpentSecs, preventGlobalEvent);
    });
  }, [setData]);

  const handleFinish = useCallback(async () => {
    const qList = latestQuestionsRef.current.length > 0 ? latestQuestionsRef.current : questions;
    const ansMap = Object.keys(latestAnswersRef.current).length > 0 ? latestAnswersRef.current : answers;
    const f = latestFormRef.current;
    if (qList.length === 0) return;

    const absoluteElapsedSecs = simStartMsRef.current ? Math.round((Date.now() - simStartMsRef.current) / 1000) : 0;
    const totalAllowedTime = qList.length * 3 * 60;
    const fallbackTimeSpent = Math.max(absoluteElapsedSecs, totalAllowedTime - latestTimeLeftRef.current);

    if (isFinishingRef.current || stepRef.current === 'finished') return;
    isFinishingRef.current = true;

    let correctCount = 0;
    const answeredQuestions = [];
    qList.forEach(q => {
      const selected = ansMap[q.id];
      const wasAnswered = selected !== undefined && selected !== null;
      const isCorrect = wasAnswered && selected === q.alternativa_correta;
      if (isCorrect) correctCount++;
      answeredQuestions.push({ ...q, selected: selected || null, isCorrect, wasAnswered });
    });

    const total = qList.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const exactTotalTime = answeredQuestions.reduce((acc, q) => acc + (latestTimePerQuestionRef.current[q.id] || 0), 0);
    const finalTimeSpent = exactTotalTime > 0 ? exactTotalTime : fallbackTimeSpent;

    if (f.categoryId === 'mixed') {
      const groups = {};
      answeredQuestions.forEach(q => {
        const key = `${q.materia}|${q.assunto}`;
        if (!groups[key]) groups[key] = { materia: q.materia, assunto: q.assunto, correct: 0, total: 0, qs: [], timeSpent: 0 };
        groups[key].qs.push(q);
        groups[key].total++;
        if (q.isCorrect) groups[key].correct++;
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
          ...f, materia: g.materia, assunto: g.assunto,
          categoryId: cat ? cat.id : null, taskId: tsk ? tsk.id : null,
        };
        const topicTime = isExactClockValid
          ? g.timeSpent
          : Math.round(fallbackTimeSpent * (g.total / totalQuestionsInMixed));
        await saveAIResultsToSystem(subForm, g.correct, g.total, g.qs, topicTime, true);
      }

      // FIX: todayKey agora é definido corretamente
      const nowIso = new Date().toISOString();
      const todayKey = getDateKey(new Date());
      const globalMixedEvent = {
        id: generateId('ai-sim'),
        date: todayKey,
        createdAt: nowIso,
        lastUpdated: nowIso,
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
      correct: correctCount, total, scorePercent,
      questions: answeredQuestions, timeSpentSecs: finalTimeSpent,
    });
    setStep('finished');
    setTimerActive(false);
    localStorage.removeItem(AI_SIM_STORAGE_KEY);
    showToast(`Simulado finalizado! ${correctCount}/${total} acertos`, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveAIResultsToSystem, showToast, setData]);

  // FIX: Timer effect com guarda contra dupla execução
  const timerFinishTriggerRef = useRef(false);
  const finishCalledRef = useRef(false);

  useEffect(() => {
    if (timerFinishTriggerRef.current && !finishCalledRef.current) {
      timerFinishTriggerRef.current = false;
      finishCalledRef.current = true;
      handleFinish();
    }
  });

  useEffect(() => {
    if (step !== 'playing') {
      finishCalledRef.current = false;
    }
  }, [step]);

  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0 && step === 'playing') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            timerFinishTriggerRef.current = true;
            return 0;
          }
          return prev - 1;
        });
        if (!timerFinishTriggerRef.current) {
          const currentQ = latestQuestionsRef.current[latestCurrentIndexRef.current];
          if (currentQ) {
            setTimePerQuestion(prev => ({
              ...prev,
              [currentQ.id]: (prev[currentQ.id] || 0) + 1
            }));
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, step]);

  const resetAll = useCallback(() => {
    isFinishingRef.current = false;
    finishCalledRef.current = false;
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
  }, [form.quantidade]);

  const retrySameQuestions = () => {
    isFinishingRef.current = false;
    finishCalledRef.current = false;
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

  useEffect(() => {
    if (step !== 'playing' || !currentQuestion) return;
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      const curIdx = latestCurrentIndexRef.current;
      const qLen = latestQuestionsRef.current.length || questions.length;
      if (['A', 'B', 'C', 'D'].includes(key)) { e.preventDefault(); selectAnswer(key); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(curIdx - 1); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (curIdx < qLen - 1) goTo(curIdx + 1); else handleFinish();
      } else if (e.key.toLowerCase() === 'escape') {
        e.preventDefault();
        resetAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentQuestion, handleFinish, questions.length, goTo, selectAnswer, resetAll]);

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

  if (step === 'setup') {
    return (
      <SimuladoSetup
        form={form} handleInputChange={handleInputChange} categories={categories}
        handleCategorySelect={handleCategorySelect} handleTaskSelect={handleTaskSelect}
        availableTasks={availableTasks} generatePersonalizedSimulado={generatePersonalizedSimulado}
        handleGenerate={handleGenerate} isLoading={isLoading} loadingMsgIdx={loadingMsgIdx}
        DIFFICULTIES={DIFFICULTIES} LOADING_MESSAGES={LOADING_MESSAGES}
      />
    );
  }
  if (step === 'playing' && currentQuestion) {
    return (
      <SimuladoPlayer
        form={form} questions={questions} currentIndex={currentIndex} answers={answers}
        timeLeft={timeLeft} DIFFICULTIES={DIFFICULTIES} goTo={goTo} selectAnswer={selectAnswer}
        handleFinish={handleFinish} resetAll={resetAll}
      />
    );
  }
  if (step === 'finished' && results) {
    return (
      <SimuladoResults
        results={results} form={form} showReview={showReview} setShowReview={setShowReview}
        resetAll={resetAll} retrySameQuestions={retrySameQuestions} showToast={showToast}
      />
    );
  }
  return null;
}
