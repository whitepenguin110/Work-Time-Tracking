import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCurrentMonthString } from '../bengali';

describe('bengali utils', () => {
  describe('getCurrentMonthString', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format a single-digit month (e.g. March) correctly as YYYY-MM', () => {
      // March 15, 2024
      const date = new Date(2024, 2, 15);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getCurrentMonthString()).toBe('2024-03');
    });

    it('should format a double-digit month (e.g. November) correctly as YYYY-MM', () => {
      // November 15, 2024
      const date = new Date(2024, 10, 15);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getCurrentMonthString()).toBe('2024-11');
    });

    it('should format January correctly as YYYY-MM', () => {
      // January 1, 2024
      const date = new Date(2024, 0, 1);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getCurrentMonthString()).toBe('2024-01');
    });

    it('should format December correctly as YYYY-MM', () => {
      // December 31, 2024
      const date = new Date(2024, 11, 31);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      expect(getCurrentMonthString()).toBe('2024-12');
    });
  });
});
