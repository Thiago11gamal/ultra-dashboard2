import { describe, it, expect } from 'vitest';
import { 
    calculateLevel, 
    getLevelFromXP, 
    getXpRemainingToNextLevel, 
    getXpThresholdForLevel, 
    getXPProgress, 
    calculateProgress, 
    getTaskXP, 
    getLevelTitle 
} from '../gamification.js';

describe('Gamification Mathematics - Progressive & Exploitation-Safe Leveling', () => {

    describe('calculateLevel (Non-linear Progressive Formula)', () => {
        it('deve retornar Nível 1 para 0 XP ou valores inválidos/negativos', () => {
            expect(calculateLevel(0)).toBe(1);
            expect(calculateLevel(-50)).toBe(1);
            expect(calculateLevel(null)).toBe(1);
            expect(calculateLevel(undefined)).toBe(1);
            expect(calculateLevel('invalid')).toBe(1);
        });

        it('deve calcular corretamente os limiares exatos de nível', () => {
            // Nível 1: 0 XP a 99 XP
            expect(calculateLevel(0)).toBe(1);
            expect(calculateLevel(99)).toBe(1);

            // Nível 2: 100 XP a 399 XP
            expect(calculateLevel(100)).toBe(2);
            expect(calculateLevel(399)).toBe(2);

            // Nível 3: 400 XP a 899 XP
            expect(calculateLevel(400)).toBe(3);
            expect(calculateLevel(899)).toBe(3);

            // Nível 4: 900 XP a 1599 XP
            expect(calculateLevel(900)).toBe(4);
            expect(calculateLevel(1599)).toBe(4);

            // Nível 5: 1600 XP+
            expect(calculateLevel(1600)).toBe(5);
        });

        it('getLevelFromXP deve ser um alias de calculateLevel', () => {
            expect(getLevelFromXP).toBe(calculateLevel);
        });
    });

    describe('getXpThresholdForLevel (Minimum XP per Level)', () => {
        it('deve retornar o XP mínimo necessário para atingir cada nível', () => {
            expect(getXpThresholdForLevel(1)).toBe(0);
            expect(getXpThresholdForLevel(2)).toBe(100);
            expect(getXpThresholdForLevel(3)).toBe(400);
            expect(getXpThresholdForLevel(4)).toBe(900);
            expect(getXpThresholdForLevel(5)).toBe(1600);
        });

        it('deve lidar graciosamente com níveis inválidos ou menores que 1', () => {
            expect(getXpThresholdForLevel(0)).toBe(0);
            expect(getXpThresholdForLevel(-5)).toBe(0);
        });
    });

    describe('getXpRemainingToNextLevel (XP to Next Level)', () => {
        it('deve retornar XP restante até o limiar do próximo nível', () => {
            // XP = 0 -> Nível 1 -> Próximo nível = 2 (100 XP) -> Resta 100
            expect(getXpRemainingToNextLevel(0)).toBe(100);

            // XP = 50 -> Nível 1 -> Próximo nível = 2 (100 XP) -> Resta 50
            expect(getXpRemainingToNextLevel(50)).toBe(50);

            // XP = 100 -> Nível 2 -> Próximo nível = 3 (400 XP) -> Resta 300
            expect(getXpRemainingToNextLevel(100)).toBe(300);

            // XP = 399 -> Nível 2 -> Próximo nível = 3 (400 XP) -> Resta 1
            expect(getXpRemainingToNextLevel(399)).toBe(1);

            // XP = 400 -> Nível 3 -> Próximo nível = 4 (900 XP) -> Resta 500
            expect(getXpRemainingToNextLevel(400)).toBe(500);
        });

        it('deve retornar valor positivo mesmo com entradas inválidas ou negativas', () => {
            expect(getXpRemainingToNextLevel(-10)).toBe(100);
            expect(getXpRemainingToNextLevel(null)).toBe(100);
        });
    });

    describe('getXPProgress & calculateProgress (Visual Feedback & Edge Cases)', () => {
        it('deve retornar estrutura correta de progresso', () => {
            const prog = getXPProgress(50);
            expect(prog).toEqual({
                level: 1,
                current: 50,
                needed: 100,
                percentage: 50,
                total: 50
            });
        });

        it('deve aplicar correção visual de 0.5% quando progresso é zero após subir de nível', () => {
            // XP = 100 é o limiar exato do Nível 2. Progresso raw = 0%.
            // Deve aplicar correção visual de 0.5% para melhor UX na barra.
            const prog = getXPProgress(100);
            expect(prog.percentage).toBe(0.5);

            // Se XP = 0, porcentagem deve continuar 0 (pois o usuário nunca ganhou nada)
            const progZero = getXPProgress(0);
            expect(progZero.percentage).toBe(0);
        });

        it('deve calcular porcentagem corretamente para valores intermediários', () => {
            // Nível 2: 100 XP a 400 XP (range = 300).
            // XP = 250 -> 150/300 = 50%
            expect(calculateProgress(250)).toBe(50);

            // XP = 175 -> 75/300 = 25%
            expect(calculateProgress(175)).toBe(25);
        });
    });

    describe('getTaskXP (Deduction & Exploit Prevention)', () => {
        it('deve conceder XP com base na prioridade ao completar tarefa', () => {
            const taskHigh = { priority: 'high' };
            const taskMedium = { priority: 'medium' };
            const taskLow = { priority: 'low' };

            expect(getTaskXP(taskHigh, true)).toBe(200);
            expect(getTaskXP(taskMedium, true)).toBe(150);
            expect(getTaskXP(taskLow, true)).toBe(100);
        });

        it('deve deduzir XP proporcional à prioridade se awardedXP não estiver definido ao desmarcar', () => {
            const taskMedium = { priority: 'medium' };
            expect(getTaskXP(taskMedium, false)).toBe(-150);
        });

        it('deve prevenir exploit de alteração de prioridade deduzindo exatamente task.awardedXP ao desmarcar', () => {
            // Se o usuário completou uma tarefa de alta prioridade (ganhou 200 XP),
            // depois a mudou para baixa e desmarcou, o sistema deve deduzir os 200 XP
            // originais usando a propriedade task.awardedXP.
            const exploitedTask = { priority: 'low', awardedXP: 200 };
            expect(getTaskXP(exploitedTask, false)).toBe(-200);
        });
    });

    describe('getLevelTitle (Title Progression Hierarchy)', () => {
        it('deve retornar título e cores corretos baseados na progressão de nível', () => {
            // Estudante: Nível 1 - 4
            expect(getLevelTitle(1).title).toBe('Estudante');
            expect(getLevelTitle(4).title).toBe('Estudante');

            // Competidor: Nível 5 - 9
            expect(getLevelTitle(5).title).toBe('Competidor');
            expect(getLevelTitle(9).title).toBe('Competidor');

            // Veterano: Nível 10 - 19
            expect(getLevelTitle(10).title).toBe('Veterano');
            expect(getLevelTitle(19).title).toBe('Veterano');

            // Elite: Nível 20 - 29
            expect(getLevelTitle(20).title).toBe('Elite');
            expect(getLevelTitle(29).title).toBe('Elite');

            // Mestre: Nível 30 - 49
            expect(getLevelTitle(30).title).toBe('Mestre');
            expect(getLevelTitle(49).title).toBe('Mestre');

            // Lenda: Nível 50+
            expect(getLevelTitle(50).title).toBe('Lenda');
            expect(getLevelTitle(100).title).toBe('Lenda');
        });
    });

});
