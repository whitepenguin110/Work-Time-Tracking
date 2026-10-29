import { describe, it, expect } from 'vitest';
import { formatBengaliDate } from './bengali';

describe('formatBengaliDate', () => {
  it('should format a valid date string correctly', () => {
    expect(formatBengaliDate('2026-10-19')).toBe('১৯ অক্টোবর, ২০২৬');
    expect(formatBengaliDate('2023-01-01')).toBe('১ জানুয়ারি, ২০২৩');
  });

  it('should handle single digit month and day correctly if provided', () => {
    // Note: The logic doesn't explicitly mandate 2 digits, just string split.
    // However, JS Date strings usually have 2 digits.
    expect(formatBengaliDate('2023-1-5')).toBe('৫ জানুয়ারি, ২০২৩');
  });

  it('should return "—" for empty, null, or undefined inputs', () => {
    expect(formatBengaliDate('')).toBe('—');
    expect(formatBengaliDate(null as unknown as string)).toBe('—');
    expect(formatBengaliDate(undefined)).toBe('—');
  });

  it('should return the original string if the format is invalid (not 3 parts)', () => {
    expect(formatBengaliDate('2026-10')).toBe('2026-10');
    expect(formatBengaliDate('20261019')).toBe('20261019');
    expect(formatBengaliDate('2026-10-19-12')).toBe('2026-10-19-12');
  });

  it('should handle invalid month indices gracefully', () => {
    // When monthIdx is invalid (e.g. out of bounds), BENGALI_MONTHS[monthIdx] will be undefined
    // and it falls back to parts[1].
    expect(formatBengaliDate('2026-13-19')).toBe('১৯ 13, ২০২৬'); // 13 is invalid, month name falls back to '13'
    expect(formatBengaliDate('2026-foo-19')).toBe('১৯ foo, ২০২৬'); // parseInt('foo') - 1 = NaN, BENGALI_MONTHS[NaN] is undefined, falls back to 'foo'
  });

  it('should handle invalid year and day gracefully', () => {
    // toBengaliNumber converts the string, if it fails or returns 0 for NaN, we should check behavior
    // For day: parseInt('foo') = NaN. toBengaliNumber(NaN) -> "NaN".
    expect(formatBengaliDate('foo-10-bar')).toBe('NaN অক্টোবর, foo');
  });
});
