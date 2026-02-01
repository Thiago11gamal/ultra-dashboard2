export const calculateUrgency = (category, simulados = []) => {
    // 1. Calculate Average Score for this category
    const relevantSimulados = simulados.filter(s => s.subject === category.name);

    let averageScore = 0;
    if (relevantSimulados.length > 0) {
        const totalScore = relevantSimulados.reduce((acc, curr) => acc + (curr.correct / curr.total) * 100, 0);
        averageScore = totalScore / relevantSimulados.length;
    } else {
        // If no data, assume neutral/slightly urgent urgency (50%)
        averageScore = 50;
    }

    // 2. Calculate Days Since Last Study (Based on actual simulado data)
    let daysSinceLastStudy = 7; // Default: 7 days if no data

    if (relevantSimulados.length > 0) {
        // Find the most recent simulado date
        const mostRecentDate = relevantSimulados.reduce((latest, s) => {
            const sDate = new Date(s.date);
            return sDate > latest ? sDate : latest;
        }, new Date(0));

        const today = new Date();
        daysSinceLastStudy = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));
    }

    // 3. Calculate Standard Deviation (Consistency/Instability)
    // High SD = Oscillating performance = More urgent (unreliable knowledge)
    let standardDeviation = 0;

    if (relevantSimulados.length >= 2) {
        const scores = relevantSimulados.map(s => (s.correct / s.total) * 100);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Sample SD with Bessel's correction (n-1)
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1);
        standardDeviation = Math.sqrt(variance);
    }

    // 4. Formula: Urgency (0-100+)
    // Low Score = High Urgency
    // High Days = High Urgency
    // High SD = High Urgency (Instability penalty)

    // Score Contribution (0-50 points) -> Lower score means more points
    const scoreComponent = (100 - averageScore) * 0.5;

    // Recency Contribution (0-30 points) -> Exponential decay (Ebbinghaus Forgetting Curve)
    // Adjusted from 40 to 30 to make room for instability
    const recencyComponent = 30 * (1 - Math.exp(-daysSinceLastStudy / 5));

    // Instability Contribution (0-20 points) -> Higher SD means more points
    // Capped at 20 points (triggered at SD >= 15)
    const instabilityComponent = Math.min(20, standardDeviation * 1.33);

    const matchScore = scoreComponent + recencyComponent + instabilityComponent;

    return {
        score: matchScore,
        details: {
            averageScore,
            daysSinceLastStudy,
            standardDeviation: standardDeviation.toFixed(1),
            hasData: relevantSimulados.length > 0
        }
    };
};

export const getSuggestedFocus = (categories, simulados) => {
    if (!categories || categories.length === 0) return null;

    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados)
    })).sort((a, b) => b.urgency.score - a.urgency.score);

    return ranked[0]; // Return the most urgent category
};

export const generateDailyGoals = (categories, simulados) => {
    // Get top 3 urgent categories
    const ranked = categories.map(cat => ({
        ...cat,
        urgency: calculateUrgency(cat, simulados)
    })).sort((a, b) => b.urgency.score - a.urgency.score);

    const top3 = ranked.slice(0, 3);

    // Convert to task objects
    return top3.map(cat => ({
        id: Date.now() + Math.random(),
        text: `Foco em ${cat.name}: Revisar erros e fazer 10 questões`,
        completed: false,
        categoryId: cat.id
    }));
};
