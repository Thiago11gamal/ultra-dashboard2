import { describe, expect, it, vi } from 'vitest';
import { getContestDisplayName, isMenuItemActive, handleMenuKeyDown } from '../sidebarUtils';

describe('Sidebar Extended Logic & Keyboard Navigation', () => {
  describe('isMenuItemActive query & hash resilience', () => {
    it('matches path regardless of query params and hashes', () => {
      expect(isMenuItemActive('/stats?period=weekly', '/stats')).toBe(true);
      expect(isMenuItemActive('/stats#overview', '/stats')).toBe(true);
      expect(isMenuItemActive('/stats/daily?tab=1', '/stats')).toBe(true);
      expect(isMenuItemActive('/pomodoro?mode=focus', '/pomodoro')).toBe(true);
      expect(isMenuItemActive('/dashboard?ref=login', '/')).toBe(true);
    });

    it('distinguishes different top-level sections', () => {
      expect(isMenuItemActive('/pomodoro', '/stats')).toBe(false);
      expect(isMenuItemActive('/evolution', '/stats')).toBe(false);
      expect(isMenuItemActive('/tasks', '/notes')).toBe(false);
    });
  });

  describe('handleMenuKeyDown keyboard interactions', () => {
    const items = ['item0', 'item1', 'item2', 'item3'];

    it('cycles forward on ArrowDown', () => {
      const onSelect = vi.fn();
      const event = { key: 'ArrowDown', preventDefault: vi.fn() };
      handleMenuKeyDown(event, items, 1, onSelect);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(2);

      // Wrapping from last to first
      handleMenuKeyDown(event, items, 3, onSelect);
      expect(onSelect).toHaveBeenCalledWith(0);
    });

    it('cycles backward on ArrowUp', () => {
      const onSelect = vi.fn();
      const event = { key: 'ArrowUp', preventDefault: vi.fn() };
      handleMenuKeyDown(event, items, 2, onSelect);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(1);

      // Wrapping from first to last
      handleMenuKeyDown(event, items, 0, onSelect);
      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it('jumps to Home (first) and End (last)', () => {
      const onSelect = vi.fn();
      const homeEvent = { key: 'Home', preventDefault: vi.fn() };
      handleMenuKeyDown(homeEvent, items, 2, onSelect);
      expect(onSelect).toHaveBeenCalledWith(0);

      const endEvent = { key: 'End', preventDefault: vi.fn() };
      handleMenuKeyDown(endEvent, items, 1, onSelect);
      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it('activates item on Enter or Space', () => {
      const onSelect = vi.fn();
      const onActivate = vi.fn();

      const enterEvent = { key: 'Enter', preventDefault: vi.fn() };
      handleMenuKeyDown(enterEvent, items, 2, onSelect, onActivate);
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(onActivate).toHaveBeenCalledWith(2);

      const spaceEvent = { key: ' ', preventDefault: vi.fn() };
      handleMenuKeyDown(spaceEvent, items, 1, onSelect, onActivate);
      expect(spaceEvent.preventDefault).toHaveBeenCalled();
      expect(onActivate).toHaveBeenCalledWith(1);
    });

    it('handles Escape to dismiss/close', () => {
      const onEscape = vi.fn();
      const escapeEvent = { key: 'Escape', preventDefault: vi.fn() };
      handleMenuKeyDown(escapeEvent, items, 0, null, null, onEscape);
      expect(escapeEvent.preventDefault).toHaveBeenCalled();
      expect(onEscape).toHaveBeenCalled();
    });

    it('safely no-ops for empty or invalid items', () => {
      const onSelect = vi.fn();
      const event = { key: 'ArrowDown', preventDefault: vi.fn() };
      handleMenuKeyDown(event, null, 0, onSelect);
      expect(onSelect).not.toHaveBeenCalled();

      handleMenuKeyDown(event, [], 0, onSelect);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('getContestDisplayName fallback behavior', () => {
    it('handles whitespace-only and falsy inputs cleanly', () => {
      expect(getContestDisplayName('   ')).toBe('Sem nome');
      expect(getContestDisplayName(null)).toBe('Sem nome');
      expect(getContestDisplayName(undefined)).toBe('Sem nome');
      expect(getContestDisplayName({ contestName: '  Receita Federal  ' })).toBe('Receita Federal');
    });
  });
});
