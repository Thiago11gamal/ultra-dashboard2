import { aggregateHeatmap } from '../utils/heatmapAggregation.js';

self.onmessage = (e) => {
    try {
        const { id, payload } = e.data || {};
        const { filtered, granularity, maxScore = 100, minScore = 0 } = payload || {};
        
        const result = aggregateHeatmap(filtered, granularity, maxScore, minScore);
        
        self.postMessage({ id, type: 'success', result });
    } catch (err) {
        self.postMessage({ id: e.data?.id, type: 'error', error: err.message });
    }
};

