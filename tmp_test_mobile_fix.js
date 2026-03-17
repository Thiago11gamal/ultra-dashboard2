// Standalone version of the FIXED function for verification
function calculateTrend(history) {
    if (!history || history.length < 3) return 0;

    // BUG FIX: Ensure the array contains valid objects with a date property.
    // If the last item is undefined, accessing .date will crash.
    const lastValidItem = history[history.length - 1];
    if (!lastValidItem || !lastValidItem.date) return 0;

    const lastTime = new Date(lastValidItem.date).getTime();
    if (isNaN(lastTime)) return 0;
    const lastTimeDays = lastTime / (1000 * 60 * 60 * 24);

    const data = history.slice(-10).map(h => {
        if (!h || !h.date) return { x: 0, y: 0 };
        const time = new Date(h.date).getTime();
        return {
            x: isNaN(time) ? 0 : (time / (1000 * 60 * 60 * 24)) - lastTimeDays, // relative days from last exam
            y: (h.score || 0) // Mock getSafeScore
        };
    });
    const n = data.length;
    if (n < 3) return 0;
    
    return "Slope calculated (not important for crash test)";
}

console.log("Starting CRASH prevention test for calculateTrend...");

const cases = [
    { name: "Empty []", input: [] },
    { name: "Undefined", input: undefined },
    { name: "1 element", input: [{ date: '2024-01-01', score: 70 }] },
    { name: "3 elements, last undefined", input: [{ date: '2024-01-01', score: 70 }, { date: '2023-01-01', score: 60 }, undefined] },
    { name: "3 elements, last no date", input: [{ date: '2024-01-01', score: 70 }, { date: '2023-01-01', score: 60 }, { score: 50 }] },
    { name: "Valid history", input: [{ date: '2024-01-01', score: 70 }, { date: '2024-01-02', score: 75 }, { date: '2024-01-03', score: 80 }] }
];

cases.forEach(c => {
    try {
        const res = calculateTrend(c.input);
        console.log(`\u2705 ${c.name}: Success, result = ${res}`);
    } catch (e) {
        console.error(`\u274c ${c.name}: FAILED!`, e.message);
    }
});

console.log("Crash prevention tests completed.");
