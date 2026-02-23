import { useState, useCallback, useEffect } from 'react';
import { getLevelFromXP } from '../utils/gamification';

export const useGamification = () => {
    const [levelUpData, setLevelUpData] = useState(null);

    useEffect(() => {
        const handleLevelUp = (e) => {
            setLevelUpData(e.detail);
        };
        window.addEventListener('level-up', handleLevelUp);
        return () => window.removeEventListener('level-up', handleLevelUp);
    }, []);

    const applyGamification = useCallback((currentData, xpAmount) => {
        const oldXp = currentData.user.xp || 0;
        const newXp = Math.max(0, oldXp + xpAmount);

        // ✅ NIVELAMENTO PROGRESSIVO
        const newLevel = getLevelFromXP(newXp);
        const oldLevel = getLevelFromXP(oldXp);

        if (newLevel > oldLevel) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('level-up', {
                    detail: {
                        level: newLevel,
                        title: `Nível ${newLevel} Desbloqueado!`,
                        xpGained: newXp - oldXp
                    }
                }));
            }
        }

        return {
            ...currentData,
            user: {
                ...currentData.user,
                xp: newXp,
                level: newLevel
            }
        };
    }, []);

    const closeLevelUpToast = useCallback(() => {
        setLevelUpData(null);
    }, []);

    return {
        applyGamification,
        levelUpData,
        closeLevelUpToast
    };
};
