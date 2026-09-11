import { describe, it, expect } from 'vitest';
import { db, auth, isLocalMode, getAppAnalytics, firebaseConfig } from '../firebase.js';

describe('Firebase Service Configuration', () => {
  it('deve extrair configurações do ambiente (import.meta.env)', () => {
    if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      // Ignorar no CI onde o .env não existe
      return;
    }
    expect(firebaseConfig).toBeDefined();
    expect(firebaseConfig.projectId).toBe(import.meta.env.VITE_FIREBASE_PROJECT_ID);
    expect(firebaseConfig.authDomain).toBe(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
  });

  it('deve exportar as instâncias db, auth, getAppAnalytics e isLocalMode', () => {
    expect(isLocalMode).toBeDefined();
    expect(typeof isLocalMode).toBe('boolean');
    expect(db).toBeDefined();
    expect(auth).toBeDefined();
    expect(typeof getAppAnalytics).toBe('function');
  });
});
