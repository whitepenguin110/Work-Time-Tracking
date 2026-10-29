import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setCachedRealNames } from '../teamService';

describe('setCachedRealNames', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset all mocks
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should save the map to localStorage', () => {
    const testMap = { user1: 'User One', user2: 'User Two' };
    setCachedRealNames(testMap);

    const savedData = localStorage.getItem('kajer_hishab_member_real_names_v1');
    expect(savedData).toBe(JSON.stringify(testMap));
  });

  it('should handle and warn on localStorage errors', () => {
    const testMap = { user1: 'User One' };
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock setItem to throw an error
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    setCachedRealNames(testMap);

    expect(setItemSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to cache real names in localStorage:', expect.any(Error));
  });
});
