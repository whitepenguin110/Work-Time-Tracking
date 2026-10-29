import { describe, it, expect } from 'vitest';
import { formatBengaliMonthYear } from '../bengali';

describe('formatBengaliMonthYear', () => {
  it('formats correctly for a valid month string', () => {
    expect(formatBengaliMonthYear('2024-01')).toBe('জানুয়ারি ২০২৪');
    expect(formatBengaliMonthYear('2024-12')).toBe('ডিসেম্বর ২০২৪');
  });

  it('returns original string if it is empty', () => {
    expect(formatBengaliMonthYear('')).toBe('');
  });

  it('returns original string if it is null or undefined (though typing requires string)', () => {
    // @ts-ignore
    expect(formatBengaliMonthYear(null)).toBe(null);
    // @ts-ignore
    expect(formatBengaliMonthYear(undefined)).toBe(undefined);
  });

  it('returns original string if it does not contain a hyphen', () => {
    expect(formatBengaliMonthYear('202401')).toBe('202401');
    expect(formatBengaliMonthYear('invalid')).toBe('invalid');
  });

  it('handles invalid month gracefully (returns raw month and translated year)', () => {
    // For "2024-13", monthIdx is 12. BENGALI_MONTHS[12] is undefined, so it falls back to "13".
    expect(formatBengaliMonthYear('2024-13')).toBe('13 ২০২৪');
  });

  it('handles invalid month value (not a number)', () => {
    // For "2024-ab", parseInt("ab", 10) is NaN. monthIdx is NaN - 1 = NaN.
    // BENGALI_MONTHS[NaN] is undefined, falls back to "ab".
    expect(formatBengaliMonthYear('2024-ab')).toBe('ab ২০২৪');
  });

  it('handles edge case of partial format', () => {
    // For "2024-", year is "2024", month is "". parseInt("", 10) is NaN.
    // Fall back to ""
    expect(formatBengaliMonthYear('2024-')).toBe(' ২০২৪');
    // For "-12", year is "", month is "12". parseInt("12", 10) - 1 = 11.
    // Bengali month 11 is "ডিসেম্বর". Year "" translates to "০".
    expect(formatBengaliMonthYear('-12')).toBe('ডিসেম্বর ০');
  });
});
