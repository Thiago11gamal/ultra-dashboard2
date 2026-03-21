// Global application configuration and constants

export const SYNC_LOG_CAP = 5000;
export const MAX_BACKUP_SIZE = 5 * 1024 * 1024; // 5MB limit for JSON backups
export const DEBUG_MODE = typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : import.meta.env?.DEV;

export default {
    SYNC_LOG_CAP,
    MAX_BACKUP_SIZE,
    DEBUG_MODE
};
