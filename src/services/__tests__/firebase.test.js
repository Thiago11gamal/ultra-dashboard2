import { describe, it, expect } from 'vitest';
import { db, auth, isLocalMode, getAppAnalytics, firebaseConfig } from '../firebase.js';

describe('Firebase Service Connection & liquita-67764 Configuration', () => {
  it('deve estar configurado para o projeto liquita-67764', () => {
    if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      // Ignorar no CI onde o .env não existe
      return;
    }
    expect(firebaseConfig).toBeDefined();
    expect(firebaseConfig.projectId).toBe('liquita-67764');
    expect(firebaseConfig.authDomain).toBe('liquita-67764.firebaseapp.com');
  });

  it('deve exportar as instâncias db, auth, getAppAnalytics e isLocalMode', () => {
    expect(isLocalMode).toBeDefined();
    expect(typeof isLocalMode).toBe('boolean');
    expect(db).toBeDefined();
    expect(auth).toBeDefined();
    expect(typeof getAppAnalytics).toBe('function');
  });
});
