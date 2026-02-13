export function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr) {
    if (arr.length < 2) return 0;

    const m = mean(arr);
    const variance =
        arr.reduce((sum, val) =>
            sum + Math.pow(val - m, 2), 0
        ) / (arr.length - 1);

    return Math.sqrt(variance);
}
