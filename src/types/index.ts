export interface Task {
  id: string;
  text: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  completedAt?: string | null;
  lastStudiedAt?: string;
  awardedXP?: number;
}

export interface SimuladoHistory {
  date: string;
  score: number;
  correct: number;
  total: number;
}

export interface SimuladoStats {
  history: SimuladoHistory[];
  average: number;
  lastAttempt: number;
  trend: 'up' | 'down' | 'stable';
  level: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  tasks: Task[];
  weight: number;
  totalMinutes?: number;
  lastStudiedAt?: string;
  simuladoStats?: SimuladoStats;
}

export interface StudyLog {
  id: string;
  date: string;
  categoryId: string;
  taskId?: string;
  minutes: number;
}

export interface StudySession {
  id: string;
  startTime: string;
  duration: number;
  categoryId: string;
  taskId?: string;
  logReferenceId: string;
}

export interface User {
  name?: string;
  level: number;
  xp: number;
  achievements: string[];
  studiedEarly?: boolean;
  studiedLate?: boolean;
}

export interface Contest {
  user: User;
  categories: Category[];
  studyLogs: StudyLog[];
  studySessions: StudySession[];
  mcWeights?: Record<string, number>;
  simuladoRows?: any[];
  simulados?: any[];
  settings?: Record<string, any>;
  coachPlanner?: Record<string, any[]>;
}

export interface AppState {
  contests: Record<string, Contest>;
  activeId: string;
  trash: any[];
  version: number;
  dashboardFilter: string;
  hasSeenTour: boolean;
  pomodoro: {
    activeSubject: any;
    sessions: number;
    targetCycles: number;
    completedCycles: number;
  };
  lastUpdated: string;
}
