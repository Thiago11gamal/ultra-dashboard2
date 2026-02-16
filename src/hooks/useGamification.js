import { useState, useCallback } from 'react';
import { calculateLevel, getLevelTitle } from '../utils/gamification';
import { checkRandomBonus } from '../utils/gamificationLogic';

export const useGamification = (showToast) => {
    const [levelUpData, setLevelUpData] = useState(null);

    const applyGamification = useCallback((state, amount, skipBonus = false) => {
        let finalAmount = amount;
        let bonusTriggered = false;

        // Check for random bonus (double XP)
        if (!skipBonus && amount > 0 && checkRandomBonus()) {
            finalAmount = amount * 2;
            bonusTriggered = true;
        }

        const currentXP = state.user.xp || 0;
        const newXP = Math.max(0, currentXP + finalAmount);
        const oldLevel = calculateLevel(currentXP);
        const newLevel = calculateLevel(newXP);

        // Check for Level Up (Lower level number is better, e.g. 10 -> 1)
        if (newLevel < oldLevel) {
            const { title } = getLevelTitle(newLevel);
            setLevelUpData({ level: newLevel, title });
        } else if (newLevel > oldLevel) {
            showToast(`⚠️ Nível Reduzido`, 'info');
        }

        if (bonusTriggered) {
            setTimeout(() => showToast(`🎲 SORTE! XP Dobrado: +${finalAmount}!`, 'success'), 500);
        }

        return {
            ...state,
            user: { ...state.user, xp: newXP, level: newLevel }
        };
    }, [showToast]);

    const closeLevelUpToast = useCallback(() => {
        setLevelUpData(null);
    }, []);

    return {
        applyGamification,
        levelUpData,
        closeLevelUpToast
    };
};
