import { aggregateHeatmap } from '../utils/heatmapAggregation.js';

self.onmessage = (e) => {
    try {
        const { id, payload } = e.data;
        const { filtered, granularity, maxScore } = payload;
        
        const result = aggregateHeatmap(filtered, granularity, maxScore);
        
        self.postMessage({ id, type: 'success', result });
    } catch (err) {
        self.postMessage({ id: e.data?.id, type: 'error', error: err.message });
    }
};

