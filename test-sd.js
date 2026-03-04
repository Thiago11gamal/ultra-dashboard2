function mean(arr) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
    if (!arr || arr.length < 2) return 0;

    const n = arr.length;
    const m = mean(arr);

    const sampleVar = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (n - 1);

    const POPULATION_SD = 12;
    const KAPPA = 3;

    const adjustedVar =
        ((n - 1) * sampleVar + KAPPA * (Math.pow(POPULATION_SD, 2))) /
        ((n - 1) + KAPPA);

    return Math.sqrt(adjustedVar);
}

console.log("SD for []:", standardDeviation([]));
console.log("SD for [80]:", standardDeviation([80]));
console.log("SD for [80, 80]:", standardDeviation([80, 80]));
console.log("SD for [60, 80]:", standardDeviation([60, 80]));
