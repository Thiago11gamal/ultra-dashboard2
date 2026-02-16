
import { getSuggestedFocus } from './src/utils/coachLogic.js';

console.log('🔍 Testing Coach Logic for Safety...');

// Scenario: Malformed history entry (missing topic name)
const categories = [{
    id: 'cat1',
    name: 'Matemática',
    simuladoStats: {
        history: [
            {
                date: new Date().toISOString(),
                topics: [
                    { name: 'Algebra', total: 10, correct: 5 },
                    { total: 5, correct: 0 } // Missing name! 🧨
                ]
            }
        ]
    }
}];

try {
    const suggestion = getSuggestedFocus(categories, []);
    console.log('✅ Coach survived malformed data.');
} catch (error) {
    console.log('🔥 Coach CRASHED:', error.message);
    if (error.message.includes('trim')) {
        console.log('⚠️  Confirmed: trim() called on undefined topic name.');
    }
}
