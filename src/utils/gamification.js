import { XP_CONFIG } from '../config/gamification';

export const calculateLevel = (xpInput) => {
  const safeXp = Math.max(0, Math.trunc(Number(xpInput) || 0));
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  return Number.isFinite(level) && level >= 1 ? level : 1;
};

export const getLevelFromXP = calculateLevel;

export const getXpThresholdForLevel = (level) => {
  const safeLevel = Math.max(1, Number(level) || 1);
  return Math.pow(safeLevel - 1, 2) * 100;
};

export const getXpRemainingToNextLevel = (currentXP) => {
  const xp = Math.max(0, Number(currentXP) || 0);
  const level = calculateLevel(xp);
  const nextLevelThreshold = getXpThresholdForLevel(level + 1);
  return Math.max(0, nextLevelThreshold - xp);
};

export const getXPProgress = (xpInput) => {
  const xp = Math.max(0, Number(xpInput) || 0);
  const level = calculateLevel(xp);
  
  const currentLevelXP = getXpThresholdForLevel(level);
  const nextLevelXP = getXpThresholdForLevel(level + 1);
  
  const range = nextLevelXP - currentLevelXP;
  const safeXP = Math.max(currentLevelXP, xp);
  const safeRange = Math.max(1, range);
  
  const rawPercentage = ((safeXP - currentLevelXP) / safeRange) * 100;
  const percentage = Math.round(Math.max(0, Math.min(100, rawPercentage)));
  
  return {
    level,
    current: Math.max(0, xp - currentLevelXP),
    needed: safeRange,
    // BUG-FIX: só mostrar 0.5 se houver progresso REAL no nível atual
    percentage: (percentage === 0 && xp > currentLevelXP) ? 0.5 : percentage,
    total: xp,
  };
};

export const calculateProgress = (xp) => getXPProgress(xp).percentage;

export const getTaskXP = (task, completed) => {
  if (!task || typeof task !== 'object') return 0;
  
  const baseXP = XP_CONFIG.task[task.priority] || XP_CONFIG.task.medium;
  if (completed) return baseXP;
  
  const rawAwarded = task.awardedXP !== undefined ? Number(task.awardedXP) : baseXP;
  const deduction = Number.isFinite(rawAwarded) ? rawAwarded : baseXP;
  
  const maxDeduction = baseXP * 2;
  const safeDeduction = Math.min(Math.abs(deduction), maxDeduction);
  
  return -safeDeduction;
};

export const getLevelTitle = (level) => {
  const safeLevel = Number(level) || 1;
  if (safeLevel >= 50) return { title: 'Lenda', icon: '👑', color: 'text-amber-500', barColor: 'from-amber-500' };
  if (safeLevel >= 30) return { title: 'Mestre', icon: '🔮', color: 'text-purple-400', barColor: 'from-purple-400' };
  if (safeLevel >= 20) return { title: 'Elite', icon: '💎', color: 'text-blue-400', barColor: 'from-blue-400' };
  if (safeLevel >= 10) return { title: 'Veterano', icon: '⚔️', color: 'text-red-500', barColor: 'from-red-500' };
  if (safeLevel >= 5) return { title: 'Competidor', icon: '🔥', color: 'text-orange-400', barColor: 'from-orange-400' };
  return { title: 'Estudante', icon: '🌱', color: 'text-green-400', barColor: 'from-green-400' };
};

export function calculateMissionReward(baseReward = 50, completionRate = 1.0, quality = 1.0) {
  const safeBase = Number(baseReward) || 50;
  const safeCompletion = Number(completionRate) || 0;
  const safeQuality = Number(quality) || 0;
  
  const rawReward = safeBase * safeCompletion * safeQuality;
  const finalReward = Number.isFinite(rawReward) ? Math.max(0, rawReward) : 0;
  return Math.round(finalReward);
}
