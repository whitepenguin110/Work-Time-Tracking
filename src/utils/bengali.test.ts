import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPeriodDateRange } from './bengali';

describe('getPeriodDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return correct range for "all"', () => {
    const result = getPeriodDateRange('all');
    expect(result).toEqual({
      startDate: '1970-01-01',
      endDate: '2026-10-29',
      label: 'সব সময়ের কাজের রিপোর্ট',
    });
  });

  it('should return correct range for "custom" with provided start and end dates', () => {
    const result = getPeriodDateRange('custom', '2026-09-01', '2026-10-15');
    expect(result).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-10-15',
      label: 'কাস্টম তারিখ সীমা: ১ সেপ্টেম্বর, ২০২৬ থেকে ১৫ অক্টোবর, ২০২৬',
    });
  });

  it('should fallback to endDate for "custom" if customStart or customEnd is missing', () => {
    const result = getPeriodDateRange('custom');
    expect(result).toEqual({
      startDate: '2026-10-29',
      endDate: '2026-10-29',
      label: 'কাস্টম তারিখ সীমা: ২৯ অক্টোবর, ২০২৬ থেকে ২৯ অক্টোবর, ২০২৬',
    });
  });

  it('should fallback to endDate for "custom" if customStart is provided but customEnd is missing', () => {
    const result = getPeriodDateRange('custom', '2026-01-01');
    expect(result).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-10-29',
      label: 'কাস্টম তারিখ সীমা: ১ জানুয়ারি, ২০২৬ থেকে ২৯ অক্টোবর, ২০২৬',
    });
  });

  it('should fallback to endDate for "custom" if customEnd is provided but customStart is missing', () => {
    const result = getPeriodDateRange('custom', undefined, '2026-01-01');
    expect(result).toEqual({
      startDate: '2026-10-29',
      endDate: '2026-01-01',
      label: 'কাস্টম তারিখ সীমা: ২৯ অক্টোবর, ২০২৬ থেকে ১ জানুয়ারি, ২০২৬',
    });
  });

  it('should return correct range for "1_month"', () => {
    const result = getPeriodDateRange('1_month');
    expect(result).toEqual({
      startDate: '2026-09-29',
      endDate: '2026-10-29',
      label: '১ মাসের রিপোর্ট (বিগত ১ মাস)',
    });
  });

  it('should return correct range for "2_months"', () => {
    const result = getPeriodDateRange('2_months');
    expect(result).toEqual({
      startDate: '2026-08-29',
      endDate: '2026-10-29',
      label: '২ মাসের রিপোর্ট (বিগত ২ মাস)',
    });
  });

  it('should return correct range for "3_months"', () => {
    const result = getPeriodDateRange('3_months');
    expect(result).toEqual({
      startDate: '2026-07-29',
      endDate: '2026-10-29',
      label: '৩ মাসের রিপোর্ট (বিগত ৩ মাস / কোয়ার্টার)',
    });
  });

  it('should return correct range for "5_months"', () => {
    const result = getPeriodDateRange('5_months');
    expect(result).toEqual({
      startDate: '2026-05-29',
      endDate: '2026-10-29',
      label: '৫ মাসের রিপোর্ট (একসাথে বিগত ৫ মাস)',
    });
  });

  it('should return correct range for "1_year"', () => {
    const result = getPeriodDateRange('1_year');
    expect(result).toEqual({
      startDate: '2025-10-29',
      endDate: '2026-10-29',
      label: 'গোটা বছরের রিপোর্ট (বিগত ১২ মাস / ১ বছর)',
    });
  });

  it('should return correct range for default case (unknown period)', () => {
    const result = getPeriodDateRange('unknown' as any);
    expect(result).toEqual({
      startDate: '2026-09-29',
      endDate: '2026-10-29',
      label: 'বিগত ১ মাসের রিপোর্ট',
    });
  });
});
