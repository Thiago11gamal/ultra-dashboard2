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
        // Se o dado for o formato antigo (um concurso direto), migramos
        if (data && data.categories && !data.contests) {
           validated[id] = ContestDataSchema.parse(data);
        } else {
           validated[id] = ContestDataSchema.parse(data);
        }
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
  if (!data.contests[data.activeId]) {
    const firstId = Object.keys(data.contests)[0];
    if (firstId) {
      data.activeId = firstId;
    } else {
      data.contests['default'] = INITIAL_DATA;
      data.activeId = 'default';
    }
  }
  return data;
});

/**
 * Valida o estado completo e retorna uma versão "limpa".
 */
export const validateAppState = (data) => {
  if (!data) return { contests: { 'default': INITIAL_DATA }, activeId: 'default', lastUpdated: new Date().toISOString() };

  let dataToValidate = data;

  // 1. MIGRATION: detecta se o dado recebido (do Firebase ou Local) está no formato antigo
  const isLegacy = data && data.categories && Array.isArray(data.categories) && !data.contests;
  
  if (isLegacy) {
    console.warn("[Migration] Dados legados detectados no input. Migrando...");
    dataToValidate = {
      contests: { 'default': data },
      activeId: 'default',
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      version: data.version || 0
    };
  }

  // 2. RESCUE: Vasculhar TODAS as chaves possíveis se o app estiver vazio
  const contests = dataToValidate?.contests || {};
  const hasNoContent = Object.values(contests).every(c => !c.categories || c.categories.length === 0);
  const isInitial = Object.keys(contests).length <= 1 && 
                    (!contests.default || contests.default.lastUpdated === "1970-01-01T00:00:00.000Z" || contests.default.user?.name === "Estudante" || hasNoContent);

  if (isInitial && typeof window !== 'undefined') {
    const backupKeys = [
      'ultra-dashboard-data',
      'ultra-dashboard-v8',
      'ultra-dashboard-storage-v8',
      'ultra-dashboard-data-backup-safety'
    ];

    for (const key of backupKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Se for o formato do Zustand (com .state)
          const stateData = parsed.state?.appState || parsed;
          
          const hasData = (stateData.categories && stateData.categories.length > 0) || 
                          (stateData.contests && Object.keys(stateData.contests).length > 0);
          
          if (hasData) {
            console.warn(`[Migration] RESGATE DE EMERGÊNCIA: Dados encontrados em '${key}'. Aplicando...`);
            if (stateData.categories && !stateData.contests) {
              dataToValidate = { contests: { 'default': stateData }, activeId: 'default', lastUpdated: new Date().toISOString() };
            } else {
              dataToValidate = stateData;
            }
            break; // Para na primeira chave que tiver dados reais
          }
        }
      } catch (e) {
        console.warn(`[Migration] Falha ao ler chave ${key}:`, e);
      }
    }
  }

  try {
    return AppStateSchema.parse(dataToValidate);
  } catch (e) {
    console.error("[Schema Validation] Erro Crítico:", e);
    return dataToValidate;
  }
};
