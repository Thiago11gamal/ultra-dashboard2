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
  id: z.string(),
  text: z.string(),
  title: z.string().optional(),
  completed: z.boolean().catch(false),
  completedAt: z.string().nullable().optional(),
  lastStudiedAt: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).catch('medium')
});

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().default('#3b82f6'),
  icon: z.string().default('📚'),
  tasks: z.array(TaskSchema).catch([]),
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
});

const ContestDataSchema = z.object({
  user: UserSchema,
  categories: z.array(CategorySchema).catch([]),
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
  contests: z.record(ContestDataSchema).transform(val => {
    if (Object.keys(val).length === 0) {
      return { 'default': INITIAL_DATA };
    }
    return val;
  }).catch({ 'default': INITIAL_DATA }),
  activeId: z.string().default('default'),
  history: z.array(z.any()).catch([]),
  lastHistoryTime: z.number().catch(0),
  version: z.number().catch(0),
  mcEqualWeights: z.boolean().catch(true),
  lastUpdated: z.string().catch(() => new Date().toISOString())
});

/**
 * Valida o estado completo e retorna uma versão "limpa".
 * Se algo estiver gravemente errado, o Zod aplicará os defaults/catch.
 */
export const validateAppState = (data) => {
  try {
    return AppStateSchema.parse(data);
  } catch (e) {
    console.error("[Schema Validation] Erro Crítico:", e);
    // Retorna o dado original se falhar miseravelmente (safeguard)
    return data;
  }
};
