import { toDateMs } from './dateHelper';

/**
 * Downsamples data using Largest Triangle Three Buckets (LTTB)
 * @param {Array} data - Array of objects
 * @param {Number} threshold - Number of points to return
 * @param {String} xKey - Key for the X axis (should be sortable, e.g. timestamp)
 * @param {String} yKey - Key for the Y axis to calculate triangle areas
 */
export function downsampleLTTB(data, threshold, xKey, yKey) {
    if (!data || data.length <= threshold || threshold <= 2) {
        return data;
    }

    const getX = (item) => {
        const val = item[xKey];
        if (typeof val === "string" && val.includes("-")) {
            return toDateMs(val);
        }
        return Number(val) || 0;
    };

    const getY = (item) => Number(item[yKey]) || 0;

    const dataLength = data.length;
    const bucketSize = (dataLength - 2) / (threshold - 2);
    
    let a = 0;
    const sampledData = [data[0]];

    for (let i = 0; i < threshold - 2; i++) {
        let avgX = 0;
        let avgY = 0;
        let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
        let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
        
        avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;
        const avgRangeLength = avgRangeEnd - avgRangeStart;

        for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
            avgX += getX(data[avgRangeStart]);
            avgY += getY(data[avgRangeStart]);
        }
        
        avgX /= avgRangeLength;
        avgY /= avgRangeLength;

        let rangeOffs = Math.floor(i * bucketSize) + 1;
        let rangeTo = Math.floor((i + 1) * bucketSize) + 1;
        
        const pointAx = getX(data[a]);
        const pointAy = getY(data[a]);

        let maxArea = -1;
        let maxAreaIndex = -1;

        for (; rangeOffs < rangeTo; rangeOffs++) {
            const bx = getX(data[rangeOffs]);
            const by = getY(data[rangeOffs]);
            
            const area = Math.abs((pointAx - avgX) * (by - pointAy) - (pointAx - bx) * (avgY - pointAy)) * 0.5;
            if (area > maxArea) {
                maxArea = area;
                maxAreaIndex = rangeOffs;
            }
        }

        sampledData.push(data[maxAreaIndex]);
        a = maxAreaIndex;
    }

    sampledData.push(data[dataLength - 1]);
    return sampledData;
}
