import { toDateMs } from './dateHelper.js';

export function downsampleLTTB(data, threshold, xKey, yKey) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return data || [];
  }
  const safeThreshold = Math.max(3, Math.floor(Number(threshold) || data.length));
  if (data.length <= safeThreshold) {
    return data;
  }
  const getX = (item, fallbackIdx = 0) => {
    if (!item || typeof item !== "object") return fallbackIdx;
    const val = item[xKey];
    if (typeof val === "string" && val.includes("-")) {
      const ms = toDateMs(val);
      return Number.isFinite(ms) ? ms : fallbackIdx;
    }
    const num = Number(val);
    return Number.isFinite(num) ? num : fallbackIdx;
  };
  const getY = (item) => {
    if (!item || typeof item !== "object") return 0;
    const raw = item[yKey];
    if (raw === null || raw === undefined || raw === "") return 0;
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  };
  const dataLength = data.length;
  // Forward/backward fill Y values so null points in sparse series do not turn into 0
  // and distort LTTB triangle area calculations.
  const filledY = new Array(dataLength).fill(0);
  let lastValidY = null;
  for (let idx = 0; idx < dataLength; idx++) {
    const raw = data[idx]?.[yKey];
    const num = (raw !== null && raw !== undefined && raw !== "") ? Number(raw) : NaN;
    if (Number.isFinite(num)) {
      lastValidY = num;
      filledY[idx] = num;
    } else if (lastValidY !== null) {
      filledY[idx] = lastValidY;
    }
  }
  let nextValidY = null;
  for (let idx = dataLength - 1; idx >= 0; idx--) {
    const raw = data[idx]?.[yKey];
    const num = (raw !== null && raw !== undefined && raw !== "") ? Number(raw) : NaN;
    if (Number.isFinite(num)) {
      nextValidY = num;
    } else if (filledY[idx] === 0 && nextValidY !== null) {
      filledY[idx] = nextValidY;
    }
  }
  const getYAt = (idx) => filledY[idx] ?? 0;

  const bucketSize = (dataLength - 2) / (safeThreshold - 2);
  let a = 0;
  const sampledData = [data[0]];
  for (let i = 0; i < safeThreshold - 2; i++) {
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += getX(data[avgRangeStart], avgRangeStart);
      avgY += getYAt(avgRangeStart);
    }
    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    } else if (avgRangeStart < dataLength) {
      avgX = getX(data[avgRangeStart], avgRangeStart);
      avgY = getYAt(avgRangeStart);
    }
    let rangeOffs = Math.floor(i * bucketSize) + 1;
    let rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    const pointAx = getX(data[a], a);
    const pointAy = getYAt(a);
    let maxArea = -1;
    let maxAreaIndex = -1;
    for (; rangeOffs < rangeTo; rangeOffs++) {
      const bx = getX(data[rangeOffs], rangeOffs);
      const by = getYAt(rangeOffs);
      let area = Math.abs((pointAx - avgX) * (by - pointAy) - (pointAx - bx) * (avgY - pointAy)) * 0.5;
      if (data[rangeOffs]?.[yKey] !== null && data[rangeOffs]?.[yKey] !== undefined) {
        area *= 1.15;
      }
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = rangeOffs;
      }
    }
    // ── FIX: bucket vazio não pode injetar undefined na série ──
    if (maxAreaIndex === -1) {
      maxAreaIndex = Math.min(rangeTo - 1, dataLength - 1);
    }

    sampledData.push(data[maxAreaIndex]);
    a = maxAreaIndex;
  }
  sampledData.push(data[dataLength - 1]);
  return sampledData;
}
