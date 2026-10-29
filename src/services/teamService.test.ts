import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedRealNames } from './teamService';

describe('teamService', () => {
  describe('getCachedRealNames', () => {
    beforeEach(() => {
      // Setup mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        clear: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      vi.stubGlobal('localStorage', localStorageMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('returns an empty object when localStorage has no data', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const result = getCachedRealNames();

      expect(result).toEqual({});
      expect(localStorage.getItem).toHaveBeenCalledWith('kajer_hishab_member_real_names_v1');
    });

    it('returns parsed data when localStorage has valid JSON', () => {
      const mockData = { user1: 'Real Name 1', user2: 'Real Name 2' };
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockData));

      const result = getCachedRealNames();

      expect(result).toEqual(mockData);
    });

    it('returns an empty object when localStorage throws an error', () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = getCachedRealNames();

      expect(result).toEqual({});
    });

    it('returns an empty object when JSON parsing fails', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('invalid json');

      const result = getCachedRealNames();

      expect(result).toEqual({});
    });
  });
});
