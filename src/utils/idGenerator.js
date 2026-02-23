/**
 * Generates a robust unique ID with a prefix
 * format: prefix-timestamp-random
 */
export const generateId = (prefix = 'id') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
};
