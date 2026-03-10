/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
    return `${prefix}-${crypto.randomUUID()}`;
};
