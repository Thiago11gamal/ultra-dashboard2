import { describe, test, expect } from 'vitest';
import { calculateUrgency } from '../coachLogic.js';

describe('Fix 1: Scale Invariance Audit (Weight Sensitivity)', () => {
    test('Subjects with same performance but different weights MUST have different urgency', () => {
        const categoryHigh = { id: 'high-w', name: 'Direito Penal', weight: 10 };
        const categoryLow = { id: 'low-w', name: 'Cultura Geral', weight: 1 };
        
        // Both have the same mediocre performance (60% average, 80% target)
        const simulados = [
            { subject: 'Direito Penal', score: 60, total: 10, date: '2026-01-01' },
            { subject: 'Cultura Geral', score: 60, total: 10, date: '2026-01-01' }
        ];

        const options = {
            maxScore: 100,
            targetScore: 80,
            allCategories: [categoryHigh, categoryLow]
        };

        const urgencyHigh = calculateUrgency(categoryHigh, simulados, [], options);
        const urgencyLow = calculateUrgency(categoryLow, simulados, [], options);

        // THE FIX: High weight subject MUST have significantly higher urgency
        // Previous buggy logic made them identical or very similar due to scale cancellation.
        console.log(`Urgency High Weight (10): ${urgencyHigh.normalizedScore}`);
        console.log(`Urgency Low Weight (1): ${urgencyLow.normalizedScore}`);
        
        expect(urgencyHigh.normalizedScore).toBeGreaterThan(urgencyLow.normalizedScore);
        
        // Check if the ratio is significant (at least 1.5x difference in the raw-to-normalized impact)
        // With weightMultiplier 1.4 for High and 0.6 for Low, the raw scores should differ by ~2.3x
        expect(urgencyHigh.normalizedScore / urgencyLow.normalizedScore).toBeGreaterThan(1.5);
    });

    test('Weight amplification should not be canceled by the normalization threshold', () => {
        const catHigh = { id: 'h', name: 'X', weight: 10 };
        const catMid = { id: 'm', name: 'Y', weight: 5 };
        
        const sims = [{ subject: 'X', score: 40, date: '2026-01-01' }, { subject: 'Y', score: 40, date: '2026-01-01' }];
        
        const uHigh = calculateUrgency(catHigh, sims, [], { maxScore: 100 });
        const uMid = calculateUrgency(catMid, sims, [], { maxScore: 100 });

        expect(uHigh.normalizedScore).toBeGreaterThan(uMid.normalizedScore);
    });
});
