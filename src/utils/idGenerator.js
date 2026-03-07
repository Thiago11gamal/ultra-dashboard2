/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
let _counter = 0;
export const generateId = (prefix = 'id') => {
    const timestamp = Date.now();
    const seq = (_counter++ % 9999).toString().padStart(4, '0');
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${seq}-${random}`;
};
