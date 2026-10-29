import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkIsOverdue } from './bengali';

describe('checkIsOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false when status is completed', () => {
    vi.setSystemTime(new Date('2023-10-15T00:00:00Z'));
    const result = checkIsOverdue('2023-10-10', 'completed');
    expect(result).toEqual({ isOverdue: false, daysOverdue: 0 });
  });

  it('should return false when dueDate is missing', () => {
    vi.setSystemTime(new Date('2023-10-15T00:00:00Z'));
    const result = checkIsOverdue('', 'pending');
    expect(result).toEqual({ isOverdue: false, daysOverdue: 0 });
  });

  it('should return false when dueDate is in the future', () => {
    vi.setSystemTime(new Date('2023-10-15T12:00:00Z'));
    const result = checkIsOverdue('2023-10-20', 'pending');
    expect(result).toEqual({ isOverdue: false, daysOverdue: 0 });
  });

  it('should return false when dueDate is today', () => {
    vi.setSystemTime(new Date('2023-10-15T12:00:00Z'));
    const result = checkIsOverdue('2023-10-15', 'pending');
    expect(result).toEqual({ isOverdue: false, daysOverdue: 0 });
  });

  it('should return true and calculate daysOverdue when dueDate is in the past', () => {
    vi.setSystemTime(new Date('2023-10-15T12:00:00Z'));
    const result = checkIsOverdue('2023-10-10', 'pending');
    // Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24))
    // 2023-10-15 (which is 2023-10-15T00:00:00 in local timezone maybe? getTodayDateString uses local time)
    // Actually, getTodayDateString uses local timezone.
    // Let's test and see if local timezone affects Math.ceil(...) in the function.
    // The function uses:
    // const today = getTodayDateString(); -> '2023-10-15'
    // const dueTime = new Date('2023-10-10').getTime();
    // const todayTime = new Date('2023-10-15').getTime();
    // diffDays = Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24));
    // Since both dueTime and todayTime are initialized from 'YYYY-MM-DD', they parse consistently (usually UTC midnight).
    // The difference should be exactly 5 days.

    expect(result).toEqual({ isOverdue: true, daysOverdue: 5 });
  });

  it('should handle leap years correctly', () => {
    vi.setSystemTime(new Date('2024-03-02T12:00:00Z'));
    const result = checkIsOverdue('2024-02-28', 'pending');
    // 2024 is a leap year, so Feb 28, Feb 29, Mar 1, Mar 2.
    // new Date('2024-03-02').getTime() - new Date('2024-02-28').getTime()
    // Difference is 3 days.
    expect(result).toEqual({ isOverdue: true, daysOverdue: 3 });
  });
});
