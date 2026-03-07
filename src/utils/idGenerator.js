/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
let _counter = 0;
export const generateId = (prefix = 'id') => {
    return `${prefix}-${crypto.randomUUID()}`;
};
