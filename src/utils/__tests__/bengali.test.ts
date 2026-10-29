import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPastMonthsOptions } from '../bengali';

describe('getPastMonthsOptions', () => {
  beforeEach(() => {
    // Mock the system date to ensuring tests are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate exactly 12 options by default', () => {
    const options = getPastMonthsOptions();
    expect(options).toHaveLength(12);
  });

  it('should generate specified number of options', () => {
    const options = getPastMonthsOptions(5);
    expect(options).toHaveLength(5);
  });

  it('should return correct format and labels in Bengali', () => {
    const options = getPastMonthsOptions(3);
    expect(options).toEqual([
      { value: '2026-10', label: 'অক্টোবর ২০২৬' },
      { value: '2026-09', label: 'সেপ্টেম্বর ২০২৬' },
      { value: '2026-08', label: 'আগস্ট ২০২৬' },
    ]);
  });

  it('should correctly handle year transition', () => {
    // Override date mock to January 2026
    vi.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    const options = getPastMonthsOptions(3);

    expect(options).toEqual([
      { value: '2026-01', label: 'জানুয়ারি ২০২৬' },
      { value: '2025-12', label: 'ডিসেম্বর ২০২৫' },
      { value: '2025-11', label: 'নভেম্বর ২০২৫' },
    ]);
  });
});
