import { DEBUG_MODE } from '../config';

/**
 * Conditional Logger
 * Only logs to console when DEBUG_MODE is true (usually development environment)
 */
export const logger = {
    log: (...args) => {
        if (DEBUG_MODE) console.log(...args);
    },
    error: (...args) => {
        // Errors are always logged even in production for troubleshooting
        console.error(...args);
    },
    warn: (...args) => {
        if (DEBUG_MODE) console.warn(...args);
    },
    info: (...args) => {
        if (DEBUG_MODE) console.info(...args);
    },
    debug: (...args) => {
        if (DEBUG_MODE) console.debug(...args);
    },
    // Special method for styled logs (e.g. Firebase/Stripe)
    styled: (message, style, ...args) => {
        if (DEBUG_MODE) console.log(`%c${message}`, style, ...args);
    }
};

export default logger;
