import { z } from 'zod';
import { INITIAL_DATA } from '../data/initialData';

/**
 * Esquemas de validação para o estado da aplicação Ultra Dashboard.
 * Diferente de validações estritas de API, aqui usamos .catch() ou .default()
 * para garantir que o app nunca quebre mesmo se o LocalStorage estiver corrompido.
 */

const UserSchema = z.object({
  name: z.string().default("Estudante"),
  avatar: z.string().default("👤"),
  startDate: z.string().nullable().default(() => new Date().toISOString().split('T')[0]),
  goalDate: z.string().nullable().default(null),
  xp: z.number().catch(0),
  level: z.number().catch(1),
  achievements: z.array(z.string()).catch([]),
  studiedEarly: z.boolean().catch(false),
  studiedLate: z.boolean().catch(false)
}).catch({
  name: "Estudante",
  avatar: "👤",
  startDate: new Date().toISOString().split('T')[0],
  goalDate: null,
  xp: 0,
  level: 1,
  achievements: [],
  studiedEarly: false,
  studiedLate: false
});

const TaskSchema = z.object({
  id: z.string().catch(() => `task_${Math.random().toString(36).substr(2, 9)}`),
  text: z.string().catch("Nova Tarefa"),
  title: z.string().optional(),
  completed: z.boolean().catch(false),
  completedAt: z.string().nullable().optional(),
  lastStudiedAt: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).catch('medium')
}).catch(null); // Permite filtrar tarefas inválidas

const CategorySchema = z.object({
  id: z.string().catch(() => `cat_${Math.random().toString(36).substr(2, 9)}`),
  name: z.string().catch("Sem Nome"),
  color: z.string().default('#3b82f6'),
  icon: z.string().default('📚'),
  tasks: z.array(z.any())
    .transform(arr => arr.map(t => {
      try { return TaskSchema.parse(t); } catch { return null; }
    }).filter(Boolean))
    .catch([]),
  weight: z.number().catch(10),
  totalMinutes: z.number().catch(0),
  lastStudiedAt: z.string().nullable().optional(),
  simuladoStats: z.object({
    history: z.array(z.any()).catch([]),
    average: z.number().catch(0),
    lastAttempt: z.number().catch(0),
    trend: z.string().catch('stable'),
    level: z.string().catch('BAIXO')
  }).catch({
    history: [],
    average: 0,
    lastAttempt: 0,
    trend: 'stable',
    level: 'BAIXO'
  })
}).catch(null); // Permite filtrar categorias inválidas

const ContestDataSchema = z.object({
  user: UserSchema,
  categories: z.array(z.any())
    .transform(arr => (Array.isArray(arr) ? arr : []).map(c => {
      try { return CategorySchema.parse(c); } catch { return null; }
    }).filter(Boolean))
    .catch([]),
  simuladoRows: z.array(z.any()).catch([]),
  simulados: z.array(z.any()).catch([]),
  studyLogs: z.array(z.any()).catch([]),
  studySessions: z.array(z.any()).catch([]),
  notes: z.string().catch(""),
  settings: z.object({
    darkMode: z.boolean().catch(true),
    soundEnabled: z.boolean().catch(true),
    pomodoroWork: z.number().catch(25),
    pomodoroBreak: z.number().catch(5),
  }).catch({
    darkMode: true,
    soundEnabled: true,
    pomodoroWork: 25,
    pomodoroBreak: 5
  }),
  mcWeights: z.record(z.number()).optional()
});

export const AppStateSchema = z.object({
  contests: z.record(z.any()).transform((val) => {
    const validated = {};
    if (!val || typeof val !== 'object') return { 'default': INITIAL_DATA };
    
    Object.entries(val).forEach(([id, data]) => {
      try {
        validated[id] = ContestDataSchema.parse(data);
      } catch (e) {
        console.error(`[Schema Validation] Falha no concurso ${id}:`, e);
      }
    });

    if (Object.keys(validated).length === 0) {
      return { 'default': INITIAL_DATA };
    }
    return validated;
  }).catch({ 'default': INITIAL_DATA }),
  activeId: z.string().default('default'),
  history: z.array(z.any()).catch([]),
  lastHistoryTime: z.number().catch(0),
  version: z.number().catch(0),
  mcEqualWeights: z.boolean().catch(true),
  lastUpdated: z.string().catch(() => new Date().toISOString())
}).transform((data) => {
  const contestIds = Object.keys(data.contests);
  
  // Lógica de Foco: tenta encontrar 'Direito' se o atual estiver vazio
  const currentIsEmpty = !data.contests[data.activeId]?.categories || data.contests[data.activeId].categories.length === 0;
  
  if (currentIsEmpty) {
    const derechoContest = contestIds.find(id => {
      const c = data.contests[id];
      if (!c.categories) return false;
      return JSON.stringify(c.categories).toLowerCase().includes('direito');
    });
    
    if (derechoContest) {
      console.warn(`[Focus] Auto-selecionando concurso '${derechoContest}' pois contém 'Direito'.`);
      data.activeId = derechoContest;
    }
  }

  if (!data.contests[data.activeId]) {
    data.activeId = contestIds[0] || 'default';
  }
  return data;
});

/**
 * Valida o estado completo e retorna uma versão "limpa".
 */
export const validateAppState = (data) => {
  if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };

  /**
   * Tenta extrair o núcleo dos dados (contests ou categories) de estruturas aninhadas.
   * Lida com { state: { appState: ... } } (Zustand) ou { appState: ... }
   */
  const extractCore = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.contests || (obj.categories && Array.isArray(obj.categories))) return obj;
    if (obj.appState) return extractCore(obj.appState);
    if (obj.state) return extractCore(obj.state);
    return null;
  };

  let coreData = extractCore(data);
  let dataToValidate = coreData || data;

  // 1. MIGRATION: detecta se o dado (Firebase/Local) está no formato antigo (único concurso)
  const isLegacy = dataToValidate && dataToValidate.categories && Array.isArray(dataToValidate.categories) && !dataToValidate.contests;
  
  if (isLegacy) {
    console.warn("[Migration] Dados legados detectados no input. Migrando...");
    dataToValidate = {
      contests: { 'default': dataToValidate },
      activeId: 'default',
      lastUpdated: dataToValidate.lastUpdated || new Date().toISOString(),
      version: dataToValidate.version || 0
    };
  }

  // 2. RESCUE: Vasculhar TODAS as chaves possíveis se o app estiver vazio/inicial
  const contests = dataToValidate?.contests || {};
  const hasNoContent = Object.values(contests).every(c => !c.categories || c.categories.length === 0);
  const isInitial = Object.keys(contests).length <= 1 && 
                    (!contests.default || contests.default.lastUpdated === "1970-01-01T00:00:00.000Z" || contests.default.user?.name === "Estudante" || hasNoContent);

  if (isInitial && typeof window !== 'undefined') {
    try {
      // 1. SCANNER UNIVERSAL: Busca em ABSOLUTAMENTE TODAS as chaves do LocalStorage
      const allKeys = Object.keys(localStorage);
      console.log(`[Rescue] Iniciando Scanner UNIVERSAL em ${allKeys.length} chaves.`);

      let bestRescueCandidate = null;
      let highestScore = -1;

      for (const key of allKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw || raw.length < 50) continue; // Ignora chaves muito pequenas
          
          const rawLower = raw.toLowerCase();
          const hasDireito = rawLower.includes('direito');
          
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue; 
          }

          const stateData = extractCore(parsed);
          
            if (stateData) {
            let score = 0;
            const categoryCount = Array.isArray(stateData.categories) ? stateData.categories.length : 0;
            const contestsWithData = stateData.contests ? Object.values(stateData.contests).filter(c => c.categories && c.categories.length > 0) : [];
            const contestCategoryCount = contestsWithData.reduce((sum, c) => sum + (c.categories?.length || 0), 0);
            
            const hasData = categoryCount > 0 || contestCategoryCount > 0;
            
            if (!hasData) continue; // IGNORE states with no actual categories

            const isDireitoUser = stateData.user?.name?.toLowerCase().includes('direito');
            const hasDireitoInCategories = categoryCount > 0 && JSON.stringify(stateData.categories).toLowerCase().includes('direito');
            const hasDireitoInContests = contestCategoryCount > 0 && JSON.stringify(stateData.contests).toLowerCase().includes('direito');

            score += 10; // Base score for having data
            score += (categoryCount + contestCategoryCount) * 2; // More data = better
            if (hasDireito) score += 50;
            if (isDireitoUser || hasDireitoInCategories || hasDireitoInContests) score += 100;
            if (key.includes('ultra-dashboard')) score += 5;

            if (score > highestScore) {
              highestScore = score;
              bestRescueCandidate = stateData;
              console.log(`[Rescue] Melhor candidato: '${key}' (Score: ${score}, Categorias: ${categoryCount + contestCategoryCount})`);
            }
          } else if (Array.isArray(parsed) && parsed.some(item => item.name && item.name.toLowerCase().includes('direito'))) {
             // Caso especial: o dado está puramente como um array de categorias
             console.warn(`[Rescue] Encontrado array de categorias solto em '${key}'. Migrando...`);
             bestRescueCandidate = { categories: parsed, user: { name: 'Resgatado' } };
             highestScore = 200;
             break;
          }
        } catch (e) {
          // Ignora erros individuais de chave
        }
      }

      if (bestRescueCandidate) {
        console.warn(`[Rescue] APLICANDO MELHOR CANDIDATO (Score: ${highestScore})`);
        
        // Garantimos que o dado resgatado tenha a estrutura correta E o timestamp mais recente
        // Isso evita que ele seja sobrescrito por uma nuvem vazia com timestamp mais atual.
        const now = new Date().toISOString();
        
        if (bestRescueCandidate.categories && !bestRescueCandidate.contests) {
          dataToValidate = { 
            contests: { 'default': { ...bestRescueCandidate, lastUpdated: now } }, 
            activeId: 'default', 
            lastUpdated: now 
          };
        } else {
          dataToValidate = { 
            ...bestRescueCandidate, 
            lastUpdated: now 
          };
          // Se o candidato tiver concursos, garante que o ativo tenha o timestamp atualizado tbm
          if (dataToValidate.contests?.[dataToValidate.activeId]) {
            dataToValidate.contests[dataToValidate.activeId].lastUpdated = now;
          }
        }
        
        // Armazena para diagnóstico se o usuário precisar nos enviar
        if (typeof window !== 'undefined') {
          window.__ULTRA_RESCUE_SUCCESS = { key: 'found', score: highestScore, time: now };
        }
      }
    } catch (globalE) {
      console.error("[Rescue] Erro crítico no scanner universal:", globalE);
    }
  }

  try {
    return AppStateSchema.parse(dataToValidate);
  } catch (e) {
    console.error("[Schema Validation] Erro Crítico:", e);
    // Fallback absoluto: tenta retornar o objeto garantindo estrutura mínima
    return {
      contests: dataToValidate?.contests || { 'default': INITIAL_DATA },
      activeId: dataToValidate?.activeId || 'default',
      lastUpdated: dataToValidate?.lastUpdated || new Date().toISOString(),
      version: dataToValidate?.version || 0
    };
  }
};
