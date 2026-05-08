import { describe, expect, it } from 'vitest';
import { getContestDisplayName, isMenuItemActive } from '../sidebarUtils';

describe('Sidebar menu logic', () => {
  it('prefers contestName/name and never falls back to user name', () => {
    expect(getContestDisplayName('Concurso A')).toBe('Concurso A');
    expect(getContestDisplayName({ contestName: 'Concurso B', user: { name: 'João' } })).toBe('Concurso B');
    expect(getContestDisplayName({ name: 'Concurso C', user: { name: 'Maria' } })).toBe('Concurso C');
    expect(getContestDisplayName({ user: { name: 'Pessoa' } })).toBe('Sem nome');
  });

  it('marks menu active for direct, nested and dashboard alias paths', () => {
    expect(isMenuItemActive('/', '/')).toBe(true);
    expect(isMenuItemActive('/dashboard', '/')).toBe(true);
    expect(isMenuItemActive('/stats', '/stats')).toBe(true);
    expect(isMenuItemActive('/stats/daily', '/stats')).toBe(true);
    expect(isMenuItemActive('/statistics', '/stats')).toBe(false);
  });
});
