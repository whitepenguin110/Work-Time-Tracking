import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTodayDateString } from '../bengali';

describe('getTodayDateString', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the correct date string formatted as YYYY-MM-DD', () => {
    const mockDate = new Date('2023-10-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    const result = getTodayDateString();

    // In UTC, new Date('2023-10-15T12:00:00Z') will have different local dates depending on timezone.
    // getTodayDateString uses local time methods like getFullYear, getMonth, getDate.
    // Let's create a date dynamically to avoid timezone issues.
    const expectedYear = mockDate.getFullYear();
    const expectedMonth = String(mockDate.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(mockDate.getDate()).padStart(2, '0');
    const expectedResult = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    expect(result).toBe(expectedResult);
  });

  it('should pad single digit months and days with leading zeros', () => {
    const mockDate = new Date('2024-03-05T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    const result = getTodayDateString();

    const expectedYear = mockDate.getFullYear();
    const expectedMonth = String(mockDate.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(mockDate.getDate()).padStart(2, '0');
    const expectedResult = `${expectedYear}-${expectedMonth}-${expectedDay}`;

    expect(result).toBe(expectedResult);
  });
});
